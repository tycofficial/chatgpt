/** Isolated PDF/DOCX and verified OOXML saved-text extraction. */
import { readOfficeZipParts } from './local-ooxml-container.mjs?v=3b6d1479ff957dc6';
import { extractXlsxParts } from './local-xlsx-extraction.mjs?v=3b6d1479ff957dc6';
import { extractPptxParts } from './local-pptx-extraction.mjs?v=3b6d1479ff957dc6';
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
async function extractDocx(bytes, limits) {
  const parts = await readOfficeZipParts(bytes, limits);
  if (!parts.has('[Content_Types].xml') || !parts.has('word/document.xml')) throw fail('The ZIP file does not contain a complete DOCX document');
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
  if (format === 'xlsx' || format === 'pptx') {
    const parts = await readOfficeZipParts(data, configured);
    return format === 'xlsx' ? extractXlsxParts(parts, { limits: configured }) : extractPptxParts(parts, { limits: configured });
  }
  throw fail('Only PDF, DOCX, XLSX and PPTX text extraction is connected', 'unhandled_mime_type', 415);
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
