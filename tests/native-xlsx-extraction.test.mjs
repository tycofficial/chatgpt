import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readOfficeZipParts } from '../src/native-client/local-ooxml-container.mjs';
import { extractXlsxParts } from '../src/native-client/local-xlsx-extraction.mjs';
import { xlsxFixtures, xlsxFixtureBytes } from './support/xlsx-fixtures.mjs';
const main = 'xlsx-multisheet-typed-formula-cache.xlsx';
const decode = value => new TextDecoder().decode(value), encode = value => new TextEncoder().encode(value);
const records = result => result.text.split('\n').map(JSON.parse);
const digest = value => createHash('sha256').update(value).digest('hex');

test('genuine independent XLSX bytes preserve values and stale/missing/zero formula caches without calculation', async () => {
  const bytes = xlsxFixtureBytes(main), before = digest(bytes), result = extractXlsxParts(await readOfficeZipParts(bytes));
  assert.equal(result.parser.name, 'site-ooxml-spreadsheetml'); assert.equal(result.parser.xml.version, '0.8.15');
  assert.equal(result.formulaEvaluation, false); assert.equal(result.externalDataRefreshed, false); assert.equal(result.numberFormatsRendered, false);
  const cells = records(result).filter(row => row.record === 'cell' && row.sheet === '数据 甲');
  const cell = address => cells.find(row => row.address === address);
  assert.equal(cell('A2').value, '0007'); assert.equal(cell('B2').value, 42.125); assert.equal(cell('C2').value, true);
  assert.equal(cell('F2').formula.text, '1+2'); assert.equal(cell('F2').cachedValue, 999); assert.equal(cell('F2').cachePresent, true);
  assert.equal(cell('G2').cachedValue, null); assert.equal(cell('G2').cachePresent, false);
  assert.equal(cell('C5').cachedValue, 0); assert.equal(cell('C5').cachePresent, true);
  assert.equal(cell('H2').type, 'error'); assert.equal(cell('H2').cachedValue, '#DIV/0!');
  assert.equal(cell('B11').formula.text, null); assert.equal(cell('B11').formula.anchor.cell, 'B10');
  assert.equal(cell('B11').formula.anchor.text, 'A10+1'); assert.equal(cell('B11').formula.expanded, false);
  assert.equal(cell('B11').cachedValue, 3); assert.equal(cell('A12').value, '9007199254740993');
  assert.equal(result.missingFormulaCaches, 1); assert.ok(result.reasons.includes('missing_formula_caches'));
  assert.equal(digest(bytes), before);
});

test('worksheet order, rich/inline text, hidden state and merged anchors retain actual source records', async () => {
  const result = extractXlsxParts(await readOfficeZipParts(xlsxFixtureBytes(main))), rows = records(result);
  assert.deepEqual(rows.filter(row => row.record === 'sheet').map(row => row.name), ['数据 甲', 'Second', 'Hidden_Reference', 'VeryHidden']);
  assert.deepEqual(result.hiddenSheets, [{ name: 'Hidden_Reference', state: 'hidden' }, { name: 'VeryHidden', state: 'veryHidden' }]);
  for (const marker of ['XLSX_RICH_MARKER', 'XLSX_INLINE_MARKER', 'XLSX_MERGED_ANCHOR']) assert.ok(result.text.includes(marker));
  assert.equal(rows.find(row => row.record === 'cell' && row.sheet === '数据 甲' && row.address === 'A4').value, 'line one\nline two\t_x0041_');
  assert.ok(rows.some(row => row.record === 'merge' && row.range === 'B2:D2'));
  assert.ok(rows.some(row => row.record === 'hidden-row' && row.row === 4));
  assert.ok(rows.some(row => row.record === 'hidden-columns' && row.from === 3 && row.to === 4));
  assert.ok(result.unsupportedParts.includes('charts')); assert.ok(result.unsupportedParts.includes('external-formula-cache-only'));
  assert.equal(result.partial, true);
});

test('the full XLSX dimension does not manufacture billions of blank cells', async () => {
  const result = extractXlsxParts(await readOfficeZipParts(xlsxFixtureBytes('xlsx-sparse-last-cell.xlsx'))), cells = records(result).filter(row => row.record === 'cell');
  assert.equal(result.processedCells, 2); assert.equal(result.emittedCells, 2); assert.deepEqual(cells.map(row => row.address), ['A1', 'XFD1048576']);
  assert.equal(result.partial, false); assert.equal(result.truncated, false);
});

test('date systems and number formats remain source metadata rather than host timezone conversions', async () => {
  const standard = extractXlsxParts(await readOfficeZipParts(xlsxFixtureBytes(main))), alternate = extractXlsxParts(await readOfficeZipParts(xlsxFixtureBytes('xlsx-date-1904.xlsx')));
  assert.equal(standard.dateSystem, '1900'); assert.equal(alternate.dateSystem, '1904');
  const date = records(alternate).find(row => row.record === 'cell');
  assert.equal(date.type, 'number'); assert.equal(typeof date.value, 'number'); assert.equal(date.numberFormat.code, 'yyyy-mm-dd');
  assert.equal(alternate.numberFormatsRendered, false); assert.equal(date.value, 44881);
});

test('readable worksheet protection is not mistaken for whole-file encryption', async () => {
  const result = extractXlsxParts(await readOfficeZipParts(xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'))), rows = records(result);
  assert.ok(rows.some(row => row.record === 'sheet' && row.sheetProtection));
  assert.ok(result.text.includes('OPENPYXL_INLINE_中文')); assert.equal(result.partial, false);
  assert.equal(rows.find(row => row.record === 'cell' && row.address === 'C2').value, false);
});

test('real corrupt packages, XML, relationships, shared strings and wrong/macro content fail without network access', async () => {
  for (const fixture of xlsxFixtures.filter(row => !row.positive)) {
    const bytes = xlsxFixtureBytes(fixture.file); assert.equal(digest(bytes), fixture.sha256);
    await assert.rejects(async () => extractXlsxParts(await readOfficeZipParts(bytes)), error => [413,415,422].includes(error.status), fixture.file);
  }
});

test('cell/sheet/character and actual ZIP/XML resource limits never claim complete extraction', async () => {
  const bytes = xlsxFixtureBytes(main), parts = await readOfficeZipParts(bytes);
  for (const [limits, reason] of [[{ maxCells: 2 }, 'cell_limit'], [{ maxSheets: 1 }, 'sheet_limit'], [{ maxCharacters: 1200 }, 'character_limit']]) {
    const result = extractXlsxParts(parts, { limits });
    assert.equal(result.partial, true); assert.equal(result.truncated, true); assert.ok(result.reasons.includes(reason));
    assert.ok(result.text.length <= (limits.maxCharacters ?? 1000000));
    for (const line of result.text.split('\n')) assert.doesNotThrow(() => JSON.parse(line));
  }
  for (const limits of [{ maxZipEntries: 2 }, { maxUncompressedBytes: 1000 }, { maxXmlPartBytes: 100 }]) await assert.rejects(() => readOfficeZipParts(bytes, limits), error => error.code === 'document_container_limit');
  assert.throws(() => extractXlsxParts(parts, { limits: { maxXmlNodes: 5 } }), error => error.code === 'document_container_limit');
});

test('SpreadsheetML namespace prefixes are immaterial and missing scalar data cannot become ready', async () => {
  const parts = new Map(await readOfficeZipParts(xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'))), baseline = extractXlsxParts(parts);
  for (const [name, bytes] of parts) {
    const xml = decode(bytes);
    if (!xml.includes('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"')) continue;
    parts.set(name, encode(xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 'xmlns:s="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/<(\/?)([A-Za-z_][A-Za-z0-9_.-]*)(?=[\s/>])/g, '<$1s:$2')));
  }
  assert.equal(extractXlsxParts(parts).text, baseline.text);
  const empty = new Map(await readOfficeZipParts(xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx'))), name = 'xl/worksheets/sheet1.xml';
  empty.set(name, encode(decode(empty.get(name)).replace(/<sheetData>.*?<\/sheetData>/s, '<sheetData/>')));
  assert.throws(() => extractXlsxParts(empty), error => error.code === 'document_text_unavailable');
  const invalid = new Map(await readOfficeZipParts(xlsxFixtureBytes('xlsx-openpyxl-inline.xlsx')));
  invalid.set(name, encode(decode(invalid.get(name)).replace('t="inlineStr"', 't="invalid-type"')));
  assert.throws(() => extractXlsxParts(invalid), error => error.code === 'file_corrupted');
});
