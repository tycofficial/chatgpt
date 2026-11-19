/** Namespace-aware Office XML over already verified OPC package parts. */
import { DOMParser, XML_DOM_VERSION } from './office-vendor/xml-dom.mjs?v=63a859e6c683b1b3';

export const OFFICE_XML_PARSER = Object.freeze({ name: '@xmldom/xmldom', version: '0.8.15' });
export const OFFICE_NAMESPACES = Object.freeze({
  presentation: Object.freeze(['http://schemas.openxmlformats.org/presentationml/2006/main', 'http://purl.oclc.org/ooxml/presentationml/main']),
  drawing: Object.freeze(['http://schemas.openxmlformats.org/drawingml/2006/main', 'http://purl.oclc.org/ooxml/drawingml/main']),
  officeRelationship: Object.freeze(['http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'http://purl.oclc.org/ooxml/officeDocument/relationships']),
  packageRelationship: 'http://schemas.openxmlformats.org/package/2006/relationships',
  contentTypes: 'http://schemas.openxmlformats.org/package/2006/content-types',
  markupCompatibility: 'http://schemas.openxmlformats.org/markup-compatibility/2006',
});
const DEFAULT_XML_LIMITS = Object.freeze({ maxXmlPartBytes: 4 * 1024 * 1024, maxXmlNodes: 200000, maxXmlDepth: 128 });
export const officeError = (message, code = 'file_corrupted', status = 422) => Object.assign(new Error(message), { code, status });
const isBytes = value => Object.prototype.toString.call(value) === '[object Uint8Array]';

export function officeXmlLimits(value = {}) {
  const limits = { ...DEFAULT_XML_LIMITS, ...value };
  for (const [key, max] of Object.entries({ maxXmlPartBytes: 16 * 1024 * 1024, maxXmlNodes: 500000, maxXmlDepth: 256 })) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > max) throw officeError('Invalid Office XML resource limit', 'document_parser_configuration', 500);
  }
  return limits;
}

function decodeXml(bytes) {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe || bytes[0] === 0x3c && bytes[1] === 0) encoding = 'utf-16le';
  else if (bytes[0] === 0xfe && bytes[1] === 0xff || bytes[0] === 0 && bytes[1] === 0x3c) encoding = 'utf-16be';
  let source;
  try { source = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch { throw officeError('An Office XML part has invalid text encoding'); }
  const declared = /^\s*<\?xml\s[^?]*\bencoding\s*=\s*['"]([^'"]+)['"]/i.exec(source)?.[1]?.toLowerCase();
  if (declared && !['utf-8', 'utf8', 'utf-16', 'utf-16le', 'utf-16be'].includes(declared)) throw officeError('This Office XML encoding is not supported', 'unhandled_mime_type', 415);
  if (declared && (encoding === 'utf-8' && declared.startsWith('utf-16') || encoding.startsWith('utf-16') && ['utf-8', 'utf8'].includes(declared))) throw officeError('An Office XML encoding declaration does not match its bytes');
  return source;
}

function rejectDeclarations(source) {
  // Skip genuine comments/CDATA/PIs so text mentioning a DTD is not mistaken
  // for a declaration. All XML syntax itself is parsed by the pinned library.
  for (let position = 0; (position = source.indexOf('<', position)) >= 0;) {
    if (source.startsWith('<!--', position)) { const end = source.indexOf('-->', position + 4); if (end < 0) return; position = end + 3; }
    else if (source.startsWith('<![CDATA[', position)) { const end = source.indexOf(']]>', position + 9); if (end < 0) return; position = end + 3; }
    else if (source.startsWith('<?', position)) { const end = source.indexOf('?>', position + 2); if (end < 0) return; position = end + 2; }
    else {
      if (/^<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source.slice(position, position + 24))) throw officeError('Office XML DTD and custom entity declarations are not supported', 'unhandled_mime_type', 415);
      position++;
    }
  }
}

export function parseOfficeXml(bytes, { partName = '', limits: requested } = {}) {
  const limits = officeXmlLimits(requested);
  if (!isBytes(bytes) || !bytes.length) throw officeError('A required Office XML part is missing or empty');
  if (bytes.length > limits.maxXmlPartBytes) throw officeError('An Office XML part exceeds its byte limit', 'document_container_limit', 413);
  if (XML_DOM_VERSION !== OFFICE_XML_PARSER.version) throw officeError('The Office XML parser version does not match its lock', 'document_parser_version_mismatch', 503);
  const source = decodeXml(bytes);
  rejectDeclarations(source);
  let malformed = false, document;
  try {
    document = new DOMParser({ errorHandler: { warning() { malformed = true; }, error() { malformed = true; }, fatalError() { malformed = true; } } }).parseFromString(source, 'application/xml');
  } catch { throw officeError('An Office XML part could not be decoded'); }
  if (malformed || !document?.documentElement || document.doctype) throw officeError('An Office XML part is malformed or contains a forbidden declaration');
  let count = 0, roots = 0;
  const stack = [{ node: document, depth: 0 }];
  while (stack.length) {
    const { node, depth } = stack.pop();
    count += 1 + (node.attributes?.length ?? 0);
    if (count > limits.maxXmlNodes || depth > limits.maxXmlDepth) throw officeError('An Office XML part exceeds its node or nesting limit', 'document_container_limit', 413);
    if (node.nodeType === 1 && node.parentNode === document) roots++;
    if (node.nodeType === 10 || node.nodeType === 6 || node.nodeType === 5) throw officeError('Office XML external/custom entities are not supported', 'unhandled_mime_type', 415);
    if (node.nodeType === 3 && node.parentNode === document && node.data.trim()) throw officeError('An Office XML part has text outside its root');
    for (let child = node.lastChild; child; child = child.previousSibling) stack.push({ node: child, depth: depth + 1 });
  }
  if (roots !== 1) throw officeError('An Office XML part must contain one root element');
  return document;
}

const namespaceMatches = (node, namespaceURI) => namespaceURI == null || (Array.isArray(namespaceURI) ? namespaceURI.includes(node.namespaceURI) : node.namespaceURI === namespaceURI);
export function directChildren(element, namespaceURI, localName) {
  const result = [];
  for (let node = element?.firstChild; node; node = node.nextSibling) if (node.nodeType === 1 && namespaceMatches(node, namespaceURI) && (localName == null || node.localName === localName)) result.push(node);
  return result;
}
export function firstChild(element, namespaceURI, localName) { return directChildren(element, namespaceURI, localName)[0] ?? null; }
export function officeAttribute(element, namespaceURI, localName) {
  const spaces = Array.isArray(namespaceURI) ? namespaceURI : [namespaceURI];
  for (const space of spaces) if (element?.hasAttributeNS(space, localName)) return element.getAttributeNS(space, localName);
  return null;
}
export function readOfficePart(parts, partName, options = {}) {
  if (!parts || typeof parts.get !== 'function' || typeof parts.has !== 'function' || typeof partName !== 'string' || !parts.has(partName)) throw officeError('A required Office package part is missing');
  return parseOfficeXml(parts.get(partName), { ...options, partName });
}

export function resolveOfficeTarget(sourcePart, target, { targetMode = 'Internal' } = {}) {
  if (targetMode !== 'Internal' || typeof sourcePart !== 'string' || typeof target !== 'string' || !target || target.includes('\\') || /[\u0000-\u001f\u007f?#]/.test(target) || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) throw officeError('A required Office relationship is not an internal package part');
  const segments = target.startsWith('/') ? [] : sourcePart.split('/').slice(0, -1);
  for (const encoded of target.replace(/^\//, '').split('/')) {
    let segment;
    try { segment = decodeURIComponent(encoded); } catch { throw officeError('An Office relationship has invalid URI escaping'); }
    if (/[\\/\u0000-\u001f\u007f]/.test(segment)) throw officeError('An Office relationship has an invalid path segment');
    if (!segment || segment === '.') continue;
    if (segment === '..') { if (!segments.length) throw officeError('An Office relationship escapes its package'); segments.pop(); }
    else segments.push(segment);
  }
  if (!segments.length) throw officeError('An Office relationship has no target part');
  return segments.join('/');
}

export function readOfficeRelationships(parts, sourcePart = '', { limits, required = false } = {}) {
  const position = sourcePart.lastIndexOf('/'), prefix = position < 0 ? '' : sourcePart.slice(0, position + 1), name = sourcePart.slice(position + 1);
  const relationshipsPart = sourcePart ? prefix + '_rels/' + name + '.rels' : '_rels/.rels';
  if (!parts?.has?.(relationshipsPart)) { if (required) throw officeError('A required Office relationships part is missing'); return new Map(); }
  const root = readOfficePart(parts, relationshipsPart, { limits }).documentElement;
  if (root.namespaceURI !== OFFICE_NAMESPACES.packageRelationship || root.localName !== 'Relationships') throw officeError('An Office relationships part has the wrong namespace/root');
  const result = new Map();
  for (const element of directChildren(root, OFFICE_NAMESPACES.packageRelationship, 'Relationship')) {
    const id = element.getAttribute('Id'), type = element.getAttribute('Type'), target = element.getAttribute('Target'), targetMode = element.getAttribute('TargetMode') || 'Internal';
    if (!id || !type || !target || result.has(id) || !['Internal', 'External'].includes(targetMode)) throw officeError('An Office relationship is incomplete or duplicated');
    result.set(id, Object.freeze({ id, type, target, targetMode, external: targetMode === 'External' }));
  }
  return result;
}

export function findOfficeDocumentPart(parts, { limits } = {}) {
  const relationships = readOfficeRelationships(parts, '', { limits, required: true });
  const matches = [...relationships.values()].filter(value => OFFICE_NAMESPACES.officeRelationship.some(prefix => value.type === prefix + '/officeDocument'));
  if (matches.length !== 1 || matches[0].external) throw officeError('The Office package must contain one internal main document');
  const part = resolveOfficeTarget('', matches[0].target);
  if (!parts.has(part)) throw officeError('The Office main document relationship points to a missing part');
  return part;
}

export function readOfficeContentTypes(parts, { limits } = {}) {
  const root = readOfficePart(parts, '[Content_Types].xml', { limits }).documentElement, overrides = new Map(), defaults = new Map();
  if (root.namespaceURI !== OFFICE_NAMESPACES.contentTypes || root.localName !== 'Types') throw officeError('The Office package content-types part is invalid');
  for (const element of directChildren(root, OFFICE_NAMESPACES.contentTypes)) {
    const type = element.getAttribute('ContentType');
    if (!type) throw officeError('An Office content type is missing');
    if (element.localName === 'Override') { const part = resolveOfficeTarget('', element.getAttribute('PartName')); if (overrides.has(part)) throw officeError('An Office content type is duplicated'); overrides.set(part, type); }
    else if (element.localName === 'Default') { const extension = element.getAttribute('Extension'); if (!extension || defaults.has(extension)) throw officeError('An Office default content type is invalid'); defaults.set(extension, type); }
  }
  return { overrides, defaults };
}
