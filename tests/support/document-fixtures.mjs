/** Neutral actual PDF/OPC bytes, generated independently of the parser. */
import JSZip from '../../node_modules/jszip/dist/jszip.min.js';
export function makeTextPdf(pages = ['NEUTRAL_PDF_BODY_42C1']) {
  const objects = [], pageIds = pages.map((_, index) => 4 + index * 2);
  objects.push('<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (const [index, value] of pages.entries()) {
    const text = value.replace(/[\\()]/g, '\\$&'), stream = 'BT /F1 12 Tf 72 720 Td (' + text + ') Tj ET';
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (pageIds[index] + 1) + ' 0 R >>', '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + '\nendstream');
  }
  let output = '%PDF-1.7\n', offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(output)); output += index + 1 + ' 0 obj\n' + object + '\nendobj\n'; }
  const start = Buffer.byteLength(output);
  output += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + start + '\n%%EOF\n';
  return new Uint8Array(Buffer.from(output));
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export async function makeDocx(text = 'NEUTRAL_DOCX_BODY_71E9 中文真实正文', table = 'TABLE_CELL_0B8D') {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + escape(text) + '</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>' + escape(table) + '</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:sectPr/></w:body></w:document>');
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
export function corruptDocxCRC(bytes) {
  const copy = bytes.slice(), view = new DataView(copy.buffer);
  for (let offset = 0; offset + 46 < copy.length; offset++) if (view.getUint32(offset, true) === 0x02014b50 && view.getUint32(offset + 24, true) > 0) { copy[offset + 16] ^= 1; return copy; }
  throw Error('No nonempty ZIP entry');
}
