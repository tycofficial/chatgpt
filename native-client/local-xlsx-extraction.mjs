/** Saved SpreadsheetML cells/formulas/caches. No calculation or chart renderer. */
import { OFFICE_XML_PARSER, OFFICE_NAMESPACES as NS, officeError, officeXmlLimits,
  directChildren, firstChild, officeAttribute, readOfficePart,
  readOfficeRelationships, resolveOfficeTarget, findOfficeDocumentPart,
  readOfficeContentTypes } from './local-office-xml.mjs?v=c1dca215dd59102e';

export const XLSX_PARSER = Object.freeze({ name: 'site-ooxml-spreadsheetml', version: '1.0.0', xml: OFFICE_XML_PARSER });
const SHEET_NS = Object.freeze(['http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'http://purl.oclc.org/ooxml/spreadsheetml/main']);
const XLSX_MAIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml';
const relationIs = (relation, name) => !!relation && NS.officeRelationship.some(prefix => relation.type === prefix + '/' + name);
const matches = (element, localName) => SHEET_NS.includes(element?.namespaceURI) && element.localName === localName;
const own = (element, name) => element?.hasAttribute(name) ? element.getAttribute(name) : null;
const checkAbort = signal => { if (signal?.aborted) throw new DOMException('Spreadsheet extraction cancelled', 'AbortError'); };
const error = message => officeError(message, 'file_corrupted', 422);
const unescapeString = text => String(text).replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
function integer(text, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(text ?? '')) throw error('Invalid spreadsheet ' + label);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw error('Spreadsheet ' + label + ' is out of range');
  return value;
}
function flag(text, fallback = false) {
  if (text == null) return fallback;
  if (text === '1' || text === 'true') return true;
  if (text === '0' || text === 'false') return false;
  throw error('Invalid spreadsheet Boolean flag');
}
function address(value) {
  const match = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/.exec(value ?? '');
  if (!match) throw error('A spreadsheet cell has an invalid A1 address');
  let column = 0; for (const letter of match[1]) column = column * 26 + letter.charCodeAt(0) - 64;
  const row = Number(match[2]);
  if (column > 16384 || row > 1048576) throw error('A spreadsheet cell address is outside the XLSX grid');
  return { row, column };
}
function range(value) {
  const fields = String(value).split(':');
  if (fields.length > 2) throw error('A spreadsheet range is invalid');
  const first = address(fields[0]), last = address(fields[1] ?? fields[0]);
  if (last.row < first.row || last.column < first.column) throw error('A spreadsheet range is reversed');
  return value;
}
function richText(element) {
  let text = '';
  for (const child of directChildren(element, SHEET_NS)) {
    if (child.localName === 't') text += child.textContent ?? '';
    else if (child.localName === 'r') for (const run of directChildren(child, SHEET_NS, 't')) text += run.textContent ?? '';
  }
  return unescapeString(text);
}
function uniqueRelation(relationships, name) {
  const rows = [...relationships.values()].filter(row => relationIs(row, name));
  if (rows.length > 1) throw error('The workbook has duplicate ' + name + ' relationships');
  if (rows[0]?.external) throw error('A required workbook data part is external');
  return rows[0] ?? null;
}
const BUILTIN_FORMATS = Object.freeze({ 0: 'General', 1: '0', 2: '0.00', 9: '0%', 10: '0.00%', 14: 'mm-dd-yy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'h:mm', 21: 'h:mm:ss', 22: 'm/d/yy h:mm', 45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mmss.0', 49: '@' });
function workbookStyles(parts, workbookPart, relationships, limits) {
  const relation = uniqueRelation(relationships, 'styles');
  if (!relation) return [{ id: 0, code: 'General', source: 'built-in' }];
  const root = readOfficePart(parts, resolveOfficeTarget(workbookPart, relation.target), { limits }).documentElement;
  if (!matches(root, 'styleSheet')) throw error('The workbook styles have the wrong root or namespace');
  const custom = new Map();
  for (const node of directChildren(firstChild(root, SHEET_NS, 'numFmts'), SHEET_NS, 'numFmt')) {
    const id = integer(own(node, 'numFmtId'), 'number-format ID'), code = own(node, 'formatCode');
    if (code == null || custom.has(id)) throw error('The workbook has an invalid/duplicate number format');
    custom.set(id, unescapeString(code));
  }
  const styles = directChildren(firstChild(root, SHEET_NS, 'cellXfs'), SHEET_NS, 'xf').map(node => {
    const id = integer(own(node, 'numFmtId') ?? '0', 'number-format ID');
    return { id, code: custom.get(id) ?? BUILTIN_FORMATS[id] ?? null, source: custom.has(id) ? 'custom' : 'built-in' };
  });
  if (!styles.length) throw error('The workbook styles have no cell formats');
  return styles;
}
function sharedStrings(parts, workbookPart, relationships, limits) {
  const relation = uniqueRelation(relationships, 'sharedStrings');
  if (!relation) return [];
  const root = readOfficePart(parts, resolveOfficeTarget(workbookPart, relation.target), { limits }).documentElement;
  if (!matches(root, 'sst')) throw error('The shared-string part has the wrong root or namespace');
  return directChildren(root, SHEET_NS, 'si').map(richText);
}
function cachedValue(cell, strings) {
  const type = own(cell, 't') ?? 'n', valueElement = firstChild(cell, SHEET_NS, 'v');
  if (!['n','s','str','inlineStr','b','e','d'].includes(type) || ['v','f','is'].some(name => directChildren(cell, SHEET_NS, name).length > 1)) throw error('A spreadsheet cell has an invalid type or duplicate value/formula');
  const raw = valueElement?.textContent ?? null;
  if (type === 'inlineStr') {
    if (valueElement || firstChild(cell, SHEET_NS, 'f')) throw error('An inline string contains an invalid value/formula');
    const inline = firstChild(cell, SHEET_NS, 'is');
    return { type: 'string', value: inline ? richText(inline) : '', rawValue: null, present: inline != null };
  }
  if (raw == null || raw === '' && type !== 'str') return { type: type === 'str' || type === 's' ? 'string' : type, value: null, rawValue: raw, present: false };
  if (type === 's') {
    const index = integer(raw, 'shared-string index');
    if (index >= strings.length) throw error('A cell references a missing shared string');
    return { type: 'string', value: strings[index], rawValue: raw, present: true, sharedStringIndex: index };
  }
  if (type === 'str') return { type: 'string', value: unescapeString(raw), rawValue: raw, present: true };
  if (type === 'b') return { type: 'boolean', value: flag(raw), rawValue: raw, present: true };
  if (type === 'e') return { type: 'error', value: raw, rawValue: raw, present: true };
  if (type === 'd') return { type: 'date-iso-source', value: raw, rawValue: raw, present: true };
  if (type !== 'n' || !/^[+-]?(?:(?:[0-9]+(?:\.[0-9]*)?)|(?:\.[0-9]+))(?:[eE][+-]?[0-9]+)?$/.test(raw) || !Number.isFinite(Number(raw))) throw error('A spreadsheet numeric value or cell type is invalid');
  return { type: 'number', value: Number(raw), rawValue: raw, present: true };
}
function formulaRecord(formula, cellAddress, anchors) {
  if (!formula) return null;
  const type = own(formula, 't') ?? 'normal', text = formula.textContent ?? '', reference = own(formula, 'ref');
  if (!['normal', 'shared', 'array', 'dataTable'].includes(type)) throw error('A spreadsheet formula has an invalid type');
  if (reference) range(reference);
  const result = { type, text: text || null, ...(reference ? { reference } : {}), evaluated: false };
  if (type === 'shared') {
    const sharedIndex = integer(own(formula, 'si'), 'shared-formula index');
    result.sharedIndex = sharedIndex; result.expanded = false;
    const anchor = anchors.get(sharedIndex);
    if (anchor) result.anchor = anchor;
  }
  return result;
}
function cellsInWorksheet(root) {
  const result = [], addresses = new Set();
  for (const row of directChildren(firstChild(root, SHEET_NS, 'sheetData'), SHEET_NS, 'row')) {
    const rowIndex = own(row, 'r') == null ? null : integer(own(row, 'r'), 'row index', { min: 1, max: 1048576 });
    for (const cell of directChildren(row, SHEET_NS, 'c')) {
      const reference = own(cell, 'r'), position = address(reference);
      if (rowIndex != null && rowIndex !== position.row || addresses.has(reference)) throw error('A spreadsheet cell has a conflicting row or duplicate address');
      addresses.add(reference); result.push({ cell, reference, position });
    }
  }
  return result;
}

export function extractXlsxParts(parts, { limits: requested = {}, signal } = {}) {
  checkAbort(signal);
  const limits = officeXmlLimits(requested), maxCharacters = limits.maxCharacters ?? 1000000, maxCells = limits.maxCells ?? 100000, maxSheets = limits.maxSheets ?? 64;
  for (const [value, max] of [[maxCharacters, 4000000], [maxCells, 100000], [maxSheets, 64]]) if (!Number.isSafeInteger(value) || value < 1 || value > max) throw officeError('Invalid spreadsheet extraction budget', 'document_parser_configuration', 500);
  const mainPart = findOfficeDocumentPart(parts, { limits }), types = readOfficeContentTypes(parts, { limits });
  if (types.overrides.get(mainPart) !== XLSX_MAIN) throw officeError('Only a standard XLSX workbook package is supported', 'unhandled_mime_type', 415);
  const workbook = readOfficePart(parts, mainPart, { limits }).documentElement;
  if (!matches(workbook, 'workbook')) throw error('The workbook main part has the wrong root or namespace');
  const relationships = readOfficeRelationships(parts, mainPart, { limits, required: true });
  const strings = sharedStrings(parts, mainPart, relationships, limits), styles = workbookStyles(parts, mainPart, relationships, limits);
  const sheets = directChildren(firstChild(workbook, SHEET_NS, 'sheets'), SHEET_NS, 'sheet');
  const dateSystem = flag(own(firstChild(workbook, SHEET_NS, 'workbookPr'), 'date1904')) ? '1904' : '1900';
  const reasons = new Set(), unsupported = new Set(), hiddenSheets = [], lines = [], seenSheetIds = new Set(), seenRelationships = new Set();
  let length = 0, processedSheets = 0, processedCells = 0, emittedCells = 0, formulaCells = 0, missingFormulaCaches = 0, truncated = false, stopped = false;
  const emit = record => {
    const line = (lines.length ? '\n' : '') + JSON.stringify(record);
    if (length + line.length > maxCharacters) { reasons.add('character_limit'); truncated = true; stopped = true; return false; }
    lines.push(line); length += line.length; return true;
  };
  if (!emit({ record: 'workbook', dateSystem, formulaEvaluation: false, externalDataRefreshed: false, numberFormatsRendered: false, scope: 'Saved worksheet cells and formula caches. Numeric dates retain their source serial and number format.' })) throw officeError('The spreadsheet text budget is too small for its scope metadata', 'document_container_limit', 413);
  for (const part of parts.keys()) {
    if (/(?:^|\/)charts\//i.test(part)) unsupported.add('charts');
    else if (/(?:^|\/)drawings\//i.test(part)) unsupported.add('drawings-and-images');
    else if (/(?:^|\/)pivot(?:Tables|Cache)\//i.test(part)) unsupported.add('pivot-data-not-refreshed');
    else if (/(?:^|\/)externalLinks\//i.test(part) || /(?:^|\/)connections\.xml$/i.test(part) || /(?:^|\/)queryTables\//i.test(part)) unsupported.add('external-data-not-refreshed');
    else if (/(?:^|\/)comments[^/]*\.xml$/i.test(part) || /(?:^|\/)threadedComments\//i.test(part)) unsupported.add('comments');
  }
  if (sheets.length > maxSheets) { reasons.add('sheet_limit'); truncated = true; }
  for (let index = 0; index < Math.min(sheets.length, maxSheets) && !stopped; index++) {
    checkAbort(signal);
    const sheet = sheets[index], name = unescapeString(own(sheet, 'name') ?? ''), id = integer(own(sheet, 'sheetId'), 'sheet ID', { min: 1 });
    const relationshipId = officeAttribute(sheet, NS.officeRelationship, 'id'), relationship = relationships.get(relationshipId);
    if (!name || seenSheetIds.has(id) || seenRelationships.has(relationshipId) || !relationship || relationship.external) throw error('An ordered worksheet has an invalid name/ID/relationship');
    seenSheetIds.add(id); seenRelationships.add(relationshipId);
    const state = own(sheet, 'state') ?? 'visible';
    if (!['visible', 'hidden', 'veryHidden'].includes(state)) throw error('A worksheet visibility state is invalid');
    if (state !== 'visible') hiddenSheets.push({ name, state });
    if (!relationIs(relationship, 'worksheet')) { unsupported.add(relationIs(relationship, 'chartsheet') ? 'chart-sheets' : 'non-worksheet-sheets'); continue; }
    const sheetPart = resolveOfficeTarget(mainPart, relationship.target), root = readOfficePart(parts, sheetPart, { limits }).documentElement;
    if (!matches(root, 'worksheet')) throw error('A worksheet part has the wrong root or namespace');
    const rows = cellsInWorksheet(root), anchors = new Map();
    for (const { cell, reference } of rows) {
      const formula = firstChild(cell, SHEET_NS, 'f');
      if (own(formula, 't') === 'shared' && formula.textContent) {
        const sharedIndex = integer(own(formula, 'si'), 'shared-formula index');
        if (anchors.has(sharedIndex)) throw error('A worksheet has duplicate shared-formula anchors');
        anchors.set(sharedIndex, { cell: reference, text: formula.textContent, reference: own(formula, 'ref') });
      }
    }
    processedSheets++;
    if (!emit({ record: 'sheet', index: index + 1, name, state, part: sheetPart, dimension: own(firstChild(root, SHEET_NS, 'dimension'), 'ref'), sheetProtection: firstChild(root, SHEET_NS, 'sheetProtection') != null })) break;
    for (const { cell, reference } of rows) {
      checkAbort(signal);
      if (processedCells >= maxCells) { truncated = true; reasons.add('cell_limit'); stopped = true; break; }
      processedCells++;
      const saved = cachedValue(cell, strings), formula = formulaRecord(firstChild(cell, SHEET_NS, 'f'), reference, anchors), style = integer(own(cell, 's') ?? '0', 'cell style index');
      if (style >= styles.length) throw error('A cell references a missing workbook style');
      if (formula) { formulaCells++; if (!saved.present) missingFormulaCaches++; if (/(?:^|')\[[^\]]+\]/.test(formula.text ?? '')) unsupported.add('external-formula-cache-only'); }
      const record = { record: 'cell', sheet: name, address: reference, type: saved.type, ...(formula ? { formula, cachedValue: saved.value, cachePresent: saved.present, rawCachedValue: saved.rawValue } : { value: saved.value, rawValue: saved.rawValue }), numberFormat: styles[style] };
      if (!emit(record)) break;
      if (saved.present || formula) emittedCells++;
    }
    if (stopped) break;
    for (const node of directChildren(firstChild(root, SHEET_NS, 'mergeCells'), SHEET_NS, 'mergeCell')) if (!emit({ record: 'merge', sheet: name, range: range(own(node, 'ref')) })) break;
    if (stopped) break;
    for (const node of directChildren(firstChild(root, SHEET_NS, 'sheetData'), SHEET_NS, 'row')) if (flag(own(node, 'hidden'))) {
      if (!emit({ record: 'hidden-row', sheet: name, row: integer(own(node, 'r'), 'hidden row', { min: 1, max: 1048576 }) })) break;
    }
    if (stopped) break;
    for (const node of directChildren(firstChild(root, SHEET_NS, 'cols'), SHEET_NS, 'col')) if (flag(own(node, 'hidden'))) {
      const from = integer(own(node, 'min'), 'column start', { min: 1, max: 16384 }), to = integer(own(node, 'max'), 'column end', { min: 1, max: 16384 });
      if (to < from) throw error('A hidden column range is reversed');
      if (!emit({ record: 'hidden-columns', sheet: name, from, to })) break;
    }
  }
  if (!emittedCells) {
    if (truncated) throw officeError('The spreadsheet budget was exhausted before any actual cell could be emitted', 'document_container_limit', 413);
    throw officeError('This workbook has no extractable worksheet cell values or formula text', 'document_text_unavailable', 422);
  }
  if (missingFormulaCaches) reasons.add('missing_formula_caches');
  if (unsupported.size) reasons.add('unsupported_parts');
  const warnings = ['Formulas were not recalculated. Saved formula caches may be stale.', 'Number formats were recorded, not rendered; numeric dates remain their source serial in the workbook date system.'];
  return { format: 'xlsx', text: lines.join(''), parser: XLSX_PARSER, totalSheets: sheets.length, processedSheets, processedCells, emittedCells, formulaCells, missingFormulaCaches, hiddenSheets, dateSystem, formulaEvaluation: false, externalDataRefreshed: false, numberFormatsRendered: false, truncated, partial: reasons.size > 0, reasons: [...reasons], ocr: false, warnings, unsupportedParts: [...unsupported].sort() };
}
