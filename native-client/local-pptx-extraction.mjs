/** Real PresentationML text over ZIP-size/CRC-verified OPC XML parts.
 * Presentation relationships define slide order. Object order is XML order;
 * this parser does not reconstruct visual layout or interpret graphics/OCR.
 * Source: Microsoft Open XML PresentationML documentation / ECMA-376.
 */
import { OFFICE_XML_PARSER, OFFICE_NAMESPACES as NS, officeError, officeXmlLimits,
  directChildren, firstChild, officeAttribute, readOfficePart,
  readOfficeRelationships, resolveOfficeTarget, findOfficeDocumentPart,
  readOfficeContentTypes } from './local-office-xml.mjs?v=2389b4a65e4ee133';

export const PPTX_PARSER = Object.freeze({ name: 'site-ooxml-presentationml', version: '1.0.0', xml: OFFICE_XML_PARSER });
const PPTX_MAIN = 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml';
const relationIs = (relation, name) => !!relation && NS.officeRelationship.some(prefix => relation.type === prefix + '/' + name);
const matches = (element, namespaces, localName) => namespaces.includes(element?.namespaceURI) && element.localName === localName;
const checkAbort = signal => { if (signal?.aborted) throw new DOMException('Presentation extraction cancelled', 'AbortError'); };

function paragraphText(paragraph) {
  let text = '';
  for (const child of directChildren(paragraph, NS.drawing)) {
    if (child.localName === 'br') text += '\n';
    else if (child.localName === 'r' || child.localName === 'fld') for (const value of directChildren(child, NS.drawing, 't')) text += value.textContent ?? '';
  }
  return text;
}
function textBody(body) { return directChildren(body, NS.drawing, 'p').map(paragraphText).join('\n'); }

function slideText(root, { signal, maxCharacters, unsupported }) {
  const blocks = [];
  let length = 0, truncated = false;
  const push = text => {
    if (!text || !text.trim()) return;
    const separator = blocks.length ? '\n' : '', remaining = maxCharacters - length;
    const combined = separator + text;
    blocks.push(combined.slice(0, Math.max(0, remaining)));
    length += Math.min(remaining, combined.length);
    if (combined.length > remaining) truncated = true;
  };
  const visit = element => {
    checkAbort(signal);
    if (truncated) return;
    if (matches(element, NS.presentation, 'sp')) { const body = firstChild(element, NS.presentation, 'txBody'); if (body) push(textBody(body)); }
    else if (matches(element, NS.presentation, 'grpSp') || matches(element, NS.presentation, 'spTree')) for (const child of directChildren(element)) visit(child);
    else if (matches(element, NS.presentation, 'graphicFrame')) {
      const graphic = firstChild(element, NS.drawing, 'graphic'), data = firstChild(graphic, NS.drawing, 'graphicData'), table = firstChild(data, NS.drawing, 'tbl');
      if (table) {
        for (const row of directChildren(table, NS.drawing, 'tr')) {
          const cells = directChildren(row, NS.drawing, 'tc').map(cell => textBody(firstChild(cell, NS.drawing, 'txBody')));
          push(cells.join('\t'));
          if (truncated) break;
        }
      } else {
        const uri = data?.getAttribute('uri') ?? '';
        unsupported.add(/chart/.test(uri) ? 'charts' : /diagram/.test(uri) ? 'smart-art' : 'graphic-frame');
      }
    } else if (matches(element, NS.presentation, 'pic')) unsupported.add('images');
    else if (element.namespaceURI === NS.markupCompatibility && element.localName === 'AlternateContent') {
      const fallback = firstChild(element, NS.markupCompatibility, 'Fallback');
      unsupported.add('markup-compatibility-alternate-content');
      if (fallback) for (const child of directChildren(fallback)) visit(child);
    } else if (matches(element, NS.presentation, 'contentPart')) unsupported.add('content-parts');
    else if (matches(element, NS.presentation, 'oleObj')) unsupported.add('embedded-objects');
  };
  const common = firstChild(root, NS.presentation, 'cSld'), tree = firstChild(common, NS.presentation, 'spTree');
  if (!tree) throw officeError('A presentation slide has no valid shape tree');
  visit(tree);
  return { text: blocks.join(''), truncated };
}

export function extractPptxParts(parts, { limits: requested = {}, signal } = {}) {
  checkAbort(signal);
  const limits = officeXmlLimits(requested), maxPages = limits.maxPages ?? 150, maxCharacters = limits.maxCharacters ?? 1000000;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000 || !Number.isSafeInteger(maxCharacters) || maxCharacters < 1 || maxCharacters > 4000000) throw officeError('Invalid presentation extraction limit', 'document_parser_configuration', 500);
  const presentationPart = findOfficeDocumentPart(parts, { limits }), types = readOfficeContentTypes(parts, { limits });
  if (types.overrides.get(presentationPart) !== PPTX_MAIN) throw officeError('Only a standard PPTX presentation package is supported', 'unhandled_mime_type', 415);
  const presentation = readOfficePart(parts, presentationPart, { limits }).documentElement;
  if (!matches(presentation, NS.presentation, 'presentation')) throw officeError('The presentation main part has the wrong namespace/root');
  const list = firstChild(presentation, NS.presentation, 'sldIdLst'), slideIds = directChildren(list, NS.presentation, 'sldId');
  const relationships = readOfficeRelationships(parts, presentationPart, { limits, required: true });
  const pagesWithoutText = [], hiddenPages = [], unsupported = new Set(), reasons = new Set(), blocks = [];
  let processedPages = 0, characters = 0, truncated = false;
  if (slideIds.length > maxPages) { truncated = true; reasons.add('page_limit'); }
  for (let index = 0; index < Math.min(slideIds.length, maxPages); index++) {
    checkAbort(signal);
    const relationshipId = officeAttribute(slideIds[index], NS.officeRelationship, 'id'), relationship = relationships.get(relationshipId);
    if (!relationIs(relationship, 'slide') || relationship.external) throw officeError('An ordered slide relationship is missing or external');
    const slidePart = resolveOfficeTarget(presentationPart, relationship.target), root = readOfficePart(parts, slidePart, { limits }).documentElement;
    if (!matches(root, NS.presentation, 'sld')) throw officeError('A slide part has the wrong namespace/root');
    const slideRelations = readOfficeRelationships(parts, slidePart, { limits });
    for (const relation of slideRelations.values()) {
      if (relationIs(relation, 'notesSlide')) unsupported.add('speaker-notes');
      else if (relationIs(relation, 'chart')) unsupported.add('charts');
      else if (relationIs(relation, 'diagramData')) unsupported.add('smart-art');
      else if (relationIs(relation, 'oleObject') || relationIs(relation, 'package')) unsupported.add('embedded-objects');
      else if (relationIs(relation, 'audio') || relationIs(relation, 'video')) unsupported.add('media');
    }
    if (['0', 'false'].includes(root.getAttribute('show'))) hiddenPages.push(index + 1);
    const separator = blocks.length ? '\n\n' : '', remaining = maxCharacters - characters - separator.length;
    if (remaining <= 0) { truncated = true; reasons.add('character_limit'); break; }
    const extracted = slideText(root, { signal, maxCharacters: remaining, unsupported });
    processedPages++;
    if (!extracted.text.trim()) pagesWithoutText.push(index + 1);
    else { blocks.push(separator + extracted.text); characters += separator.length + extracted.text.length; }
    if (extracted.truncated) { truncated = true; reasons.add('character_limit'); break; }
    if (characters >= maxCharacters && index + 1 < Math.min(slideIds.length, maxPages)) { truncated = true; reasons.add('character_limit'); break; }
  }
  const text = blocks.join('');
  if (!text.trim()) throw officeError('This presentation has no extractable slide text. Image OCR is not connected', 'document_text_unavailable', 422);
  if (pagesWithoutText.length) reasons.add('pages_without_text');
  if (unsupported.size) reasons.add('unsupported_parts');
  const warnings = [];
  if (unsupported.size) warnings.push('Only slide text and table cells were extracted; graphics, notes and other listed parts were not interpreted.');
  if (hiddenPages.length) warnings.push('Hidden slide text is included in presentation order and identified in hiddenPages.');
  return { format: 'pptx', text, parser: PPTX_PARSER, totalPages: slideIds.length, processedPages,
    pagesWithoutText, hiddenPages, truncated, partial: truncated || reasons.size > 0,
    reasons: [...reasons], ocr: false, warnings, unsupportedParts: [...unsupported].sort(),
    readingOrder: 'presentation-relationships-then-xml-object-order', visualLayoutInterpreted: false };
}
