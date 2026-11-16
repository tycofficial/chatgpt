/** PDF.js 5.7.284 / Mammoth 1.13.0 text extraction in a dedicated worker. */
const PDF_VERSION = '5.7.284';
const MAMMOTH_VERSION = '1.13.0';
const DEFAULT_LIMITS = Object.freeze({ maxPages: 150, maxCharacters: 1000000, maxZipEntries: 5000, maxUncompressedBytes: 64 * 1024 * 1024 });
const fail = (message, code = 'file_corrupted', status = 422) => Object.assign(new Error(message), { code, status });
/** Standard byte-to-hex compatibility for engines predating ES2025. */
export function ensureDocumentHexAPI() {
  if (typeof Uint8Array.prototype.toHex === 'function') return;
  Object.defineProperty(Uint8Array.prototype, 'toHex', { configurable: true, writable: true, value: function toHex() {
    const tag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get.call(this);
    if (tag !== 'Uint8Array') throw new TypeError('Uint8Array.toHex requires a Uint8Array receiver');
    // The native iterator also rejects detached buffers. Every encoded byte is
    // the original view's data; no PDF parsing result is substituted here.
    let hex = ''; for (const byte of this) hex += byte.toString(16).padStart(2, '0'); return hex;
  } });
}
export function documentAssetURL(relative, base = import.meta.url) {
  const url = new URL(relative, base), version = new URL(base).searchParams.get('v');
  if (version) url.searchParams.set('v', version);
  return url;
}
function limitsOf(value = {}) {
  const limits = { ...DEFAULT_LIMITS, ...value };
  for (const [key, max] of Object.entries({ maxPages: 1000, maxCharacters: 4000000, maxZipEntries: 10000, maxUncompressedBytes: 128 * 1024 * 1024 })) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > max) throw fail('Invalid local document parser limit', 'document_parser_configuration', 500);
  }
  return limits;
}
async function assetBytes(relative) {
  const response = await fetch(documentAssetURL(relative), { credentials: 'omit', cache: 'default' });
  if (!response.ok) throw fail('A required local document decoding resource is unavailable', 'document_parser_resource_unavailable', 503);
  return new Uint8Array(await response.arrayBuffer());
}
class LocalCMapReaderFactory {
  async fetch({ name }) {
    if (typeof name !== 'string' || !/^[a-z0-9_-]+$/i.test(name)) throw fail('Invalid PDF character-map name');
    return { cMapData: await assetBytes('./document-vendor/cmaps/' + name + '.bcmap'), compressionType: 1 };
  }
}
class LocalStandardFontDataFactory {
  async fetch({ filename }) {
    if (typeof filename !== 'string' || !/^[a-z0-9_.-]+$/i.test(filename) || filename.includes('..')) throw fail('Invalid PDF standard-font name');
    return assetBytes('./document-vendor/standard_fonts/' + filename);
  }
}
let pdfModule, mammothModule;
async function loadPdf() {
  ensureDocumentHexAPI();
  if (typeof globalThis.DOMMatrix !== 'function' || typeof Uint8Array.prototype.toHex !== 'function') throw fail('This browser lacks the required PDF text-decoder platform APIs', 'document_parser_unavailable', 503);
  const pdf = await (pdfModule ??= import(documentAssetURL('./document-vendor/pdf.mjs').href));
  if (pdf.version !== PDF_VERSION || typeof pdf.getDocument !== 'function') throw fail('The local PDF parser version does not match its pinned worker', 'document_parser_version_mismatch', 503);
  pdf.GlobalWorkerOptions.workerSrc = documentAssetURL('./document-vendor/pdf.worker.mjs').href;
  return pdf;
}
async function loadMammoth() {
  mammothModule ??= import(documentAssetURL('./document-vendor/mammoth.js').href);
  const loaded = await mammothModule, api = loaded.default ?? globalThis.mammoth;
  if (typeof api?.extractRawText !== 'function') throw fail('The local DOCX parser could not be loaded', 'document_parser_unavailable', 503);
  return api;
}
async function extractPdf(bytes, limits) {
  if (bytes.length < 8 || new TextDecoder('ascii').decode(bytes.subarray(0, 1024)).indexOf('%PDF-') < 0) throw fail('The uploaded bytes are not a PDF document');
  const pdfjs = await loadPdf();
  let task, document;
  try {
    task = pdfjs.getDocument({
      data: bytes.slice(), isEvalSupported: false, useWasm: false, enableXfa: false,
      useSystemFonts: false, disableFontFace: true, useWorkerFetch: false,
      CMapReaderFactory: LocalCMapReaderFactory, StandardFontDataFactory: LocalStandardFontDataFactory,
      cMapUrl: new URL('./document-vendor/cmaps/', import.meta.url).href, cMapPacked: true,
      standardFontDataUrl: new URL('./document-vendor/standard_fonts/', import.meta.url).href,
      isOffscreenCanvasSupported: false, isImageDecoderSupported: false,
      disableAutoFetch: true, disableStream: true, disableRange: true, stopAtErrors: true, verbosity: 0,
    });
    document = await task.promise;
    if (document.isPureXfa) throw fail('This PDF uses XFA content; local XFA text extraction is not connected', 'unhandled_mime_type', 415);
    const totalPages = document.numPages;
    if (!Number.isSafeInteger(totalPages) || totalPages < 1) throw fail('The PDF page tree is invalid');
    const chunks = [], pagesWithoutText = [];
    let processedPages = 0, characters = 0, characterLimit = false;
    for (let number = 1; number <= Math.min(totalPages, limits.maxPages); number++) {
      const page = await document.getPage(number);
      try {
        const content = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
        const pageText = content.items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+\n/g, '\n').trim();
        processedPages++;
        if (!pageText) pagesWithoutText.push(number);
        const prefix = chunks.length ? '\n\n' : '', available = limits.maxCharacters - characters - prefix.length;
        if (pageText.length > available) {
          if (available > 0) chunks.push(prefix + pageText.slice(0, available));
          characters = limits.maxCharacters; characterLimit = true; break;
        }
        if (pageText) { chunks.push(prefix + pageText); characters += prefix.length + pageText.length; }
      } finally { page.cleanup(); }
    }
    const text = chunks.join('');
    if (!text.trim()) throw fail('This PDF has no extractable text. OCR is not connected; no text was invented', 'document_text_unavailable', 422);
    const reasons = [];
    if (processedPages < totalPages) reasons.push(characterLimit ? 'character_limit' : 'page_limit');
    else if (characterLimit) reasons.push('character_limit');
    if (pagesWithoutText.length) reasons.push('pages_without_extractable_text');
    return { format: 'pdf', text, parser: { name: 'pdfjs-dist', version: PDF_VERSION }, totalPages, processedPages, pagesWithoutText, truncated: characterLimit || processedPages < totalPages, partial: reasons.length > 0, reasons, ocr: false, warnings: [] };
  } catch (error) {
    if (error?.name === 'PasswordException') throw fail('This PDF is password protected. Unlock it before uploading; no text was extracted', 'document_password_required', 422);
    if (error?.code) throw error;
    throw fail('The PDF could not be decoded as supported text: ' + String(error?.message || error).slice(0, 300), 'file_corrupted', 422);
  } finally {
    if (document) await document.destroy().catch(() => {});
    else if (task) await task.destroy().catch(() => {});
  }
}
let crcTable;
function crcUpdate(value, bytes) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let result = index;
    for (let bit = 0; bit < 8; bit++) result = result & 1 ? 0xedb88320 ^ result >>> 1 : result >>> 1;
    return result >>> 0;
  });
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8;
  return value >>> 0;
}
function zipEntries(bytes, limits) {
  if (bytes.length < 22) throw fail('The DOCX ZIP container is incomplete');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
  }
  if (end < 0) {
    if (view.getUint32(0, true) === 0x04034b50) throw fail('The DOCX ZIP container is truncated or has no valid directory', 'file_corrupted', 422);
    throw fail('The DOCX container is not a supported ZIP document. Encrypted/legacy Word containers must be unlocked or converted', 'unhandled_mime_type', 415);
  }
  const entries = view.getUint16(end + 10, true), countOnDisk = view.getUint16(end + 8, true), directorySize = view.getUint32(end + 12, true), directoryOffset = view.getUint32(end + 16, true);
  if (entries === 65535 || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw fail('ZIP64 DOCX documents are outside this local parser limit', 'document_container_limit', 413);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || entries !== countOnDisk || !entries || entries > limits.maxZipEntries || directoryOffset + directorySize > end) throw fail('The DOCX ZIP directory is invalid or exceeds the configured entry limit', 'document_container_limit', 413);
  let offset = directoryOffset, uncompressed = 0;
  const result = [], names = new Set();
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw fail('The DOCX ZIP directory is damaged');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true), compressedSize = view.getUint32(offset + 20, true), size = view.getUint32(offset + 24, true), nameSize = view.getUint16(offset + 28, true), extraSize = view.getUint16(offset + 30, true), commentSize = view.getUint16(offset + 32, true), localOffset = view.getUint32(offset + 42, true);
    if (flags & 1) throw fail('This DOCX is encrypted. Unlock it before uploading', 'document_password_required', 422);
    if (![0, 8].includes(method)) throw fail('This DOCX uses an unsupported ZIP compression method', 'unhandled_mime_type', 415);
    if (offset + 46 + nameSize + extraSize + commentSize > directoryOffset + directorySize || localOffset + 30 > directoryOffset || view.getUint32(localOffset, true) !== 0x04034b50) throw fail('The DOCX ZIP entry is damaged');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameSize));
    if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || name.split('/').some(part => part === '..') || names.has(name)) throw fail('The DOCX has an invalid or duplicate ZIP path');
    if (/vbaProject\.bin$/i.test(name)) throw fail('Macro-enabled Word documents are not a supported DOCX format', 'unhandled_mime_type', 415);
    names.add(name);
    const dataOffset = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    if (dataOffset + compressedSize > directoryOffset || view.getUint16(localOffset + 8, true) !== method) throw fail('The DOCX compressed entry is truncated');
    uncompressed += size;
    if (uncompressed > limits.maxUncompressedBytes) throw fail('The DOCX expands beyond the configured local document limit', 'document_container_limit', 413);
    result.push({ name, method, size, compressedSize, crc: view.getUint32(offset + 16, true), dataOffset });
    offset += 46 + nameSize + extraSize + commentSize;
  }
  if (offset !== directoryOffset + directorySize || !names.has('[Content_Types].xml') || !names.has('word/document.xml')) throw fail('The ZIP file does not contain a complete DOCX document');
  return result;
}
async function verifyZipEntries(bytes, entries, limits) {
  let total = 0;
  for (const entry of entries) {
    let crc = 0xffffffff, size = 0;
    const accept = chunk => {
      size += chunk.length; total += chunk.length;
      if (size > entry.size || total > limits.maxUncompressedBytes) throw fail('The DOCX actual expanded bytes exceed its directory or local limit', 'document_container_limit', 413);
      crc = crcUpdate(crc, chunk);
    };
    const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    if (entry.method === 0) accept(compressed);
    else {
      if (typeof DecompressionStream !== 'function') throw fail('This browser has no bounded DOCX decompression stream', 'document_parser_unavailable', 503);
      let reader;
      try {
        reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        for (;;) { const next = await reader.read(); if (next.done) break; accept(next.value); }
      } catch (error) {
        await reader?.cancel().catch(() => {});
        if (error?.code) throw error;
        throw fail('A DOCX compressed entry could not be decoded', 'file_corrupted', 422);
      } finally { reader?.releaseLock(); }
    }
    if (size !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw fail('A DOCX entry failed its expanded-size/CRC check', 'file_corrupted', 422);
  }
}
async function extractDocx(bytes, limits) {
  const entries = zipEntries(bytes, limits);
  await verifyZipEntries(bytes, entries, limits);
  const mammoth = await loadMammoth();
  let result;
  try { result = await mammoth.extractRawText({ arrayBuffer: bytes.slice().buffer }, { externalFileAccess: false }); }
  catch (error) { throw fail('The DOCX body could not be decoded: ' + String(error?.message || error).slice(0, 300), 'file_corrupted', 422); }
  if (typeof result?.value !== 'string' || !result.value.trim()) throw fail('This DOCX has no extractable text. Image OCR is not connected', 'document_text_unavailable', 422);
  const errors = (result.messages ?? []).filter(message => message.type === 'error');
  if (errors.length) throw fail('The DOCX parser reported an incomplete or invalid document', 'file_corrupted', 422);
  const truncated = result.value.length > limits.maxCharacters;
  const warnings = (result.messages ?? []).filter(message => message.type === 'warning').slice(0, 16).map(message => String(message.message).slice(0, 300));
  return { format: 'docx', text: result.value.slice(0, limits.maxCharacters), parser: { name: 'mammoth', version: MAMMOTH_VERSION }, totalCharactersBeforeLimit: result.value.length, truncated, partial: truncated || warnings.length > 0, reasons: [...truncated ? ['character_limit'] : [], ...warnings.length ? ['parser_warnings'] : []], ocr: false, warnings };
}
export async function extractDocumentBytes({ bytes, format, limits } = {}) {
  const data = bytes instanceof Uint8Array ? bytes : bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : null;
  if (!data?.length) throw fail('Real document bytes are required', 'file_zero_bytes', 400);
  const configured = limitsOf(limits);
  if (format === 'pdf') return extractPdf(data, configured);
  if (format === 'docx') return extractDocx(data, configured);
  throw fail('Only PDF and DOCX text extraction is connected', 'unhandled_mime_type', 415);
}
if (typeof globalThis.document === 'undefined' && typeof globalThis.addEventListener === 'function' && typeof globalThis.postMessage === 'function') {
  let busy = false;
  globalThis.addEventListener('message', async event => {
    const request = event.data;
    if (!request || typeof request.id !== 'string') return;
    if (busy) return globalThis.postMessage({ id: request.id, ok: false, error: { code: 'document_worker_busy', status: 409, message: 'This dedicated worker already has a document' } });
    busy = true;
    try { globalThis.postMessage({ id: request.id, ok: true, result: await extractDocumentBytes(request) }); }
    catch (error) { globalThis.postMessage({ id: request.id, ok: false, error: { code: error?.code ?? 'document_parser_error', status: error?.status ?? 422, message: String(error?.message || error).slice(0, 600) } }); }
  });
}
