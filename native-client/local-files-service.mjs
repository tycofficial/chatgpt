import { compressImageInput } from './image-input-compression.mjs?v=b12212a94966c6ff';
/**
 * Real origin-local file storage behind the original PYGO/LulU contracts.
 * Original UI and event pipeline remain unchanged; no Azure/cookie/private API.
 * POST /files -> upload URL -> actual bytes -> process NDJSON/uploaded.
 */
import { workspacePath } from './browser-tool-executor.mjs?v=b12212a94966c6ff';
import { createLocalDocumentExtractor } from './local-document-extraction.mjs?v=b12212a94966c6ff';
export const LOCAL_FILES_SOURCE = 'browser-origin-file-storage';
export const LOCAL_FILE_PREFIX = 'file_local_';
/** Pure transport classification: no current-account or metadata dependency. */
export function isLocalUploadURL(value, referenceURL = globalThis.location?.href) {
  try {
    const base = new URL(referenceURL), incoming = new URL(value, base);
    if (!['http:','https:'].includes(base.protocol) || incoming.origin !== base.origin || incoming.username || incoming.password) return false;
    const direct = /^(.*)\/files\/local-upload\/([0-9a-f]{32})$/.exec(incoming.pathname);
    if (direct) return true;
    const suffix = '/estuary/upload_content_bytes';
    if (!incoming.pathname.endsWith(suffix)) return false;
    const target = new URL(incoming.searchParams.get('upload_url'));
    const match = /\/files\/local-upload\/([0-9a-f]{32})$/.exec(target.pathname);
    return target.origin === base.origin && !target.username && !target.password && !target.search && !target.hash && !!match && target.pathname === incoming.pathname.slice(0, -suffix.length) + '/files/local-upload/' + match[1];
  } catch { return false; }
}
const RECORD_PREFIX = 'site-local-files:v1:';
const FILE_ID = /^file_local_[0-9a-f]{32}$/;
const TICKET = /^[0-9a-f]{32}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_PUBLICATION_OPERATIONS = 2048;
// Match the actual shared BrowserWorkspaceStore transfer limit.
const MAX_DEFAULT = 20 * 1024 * 1024;
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const issue = (message, status = 400, code = 'local_file_error') => Object.assign(new Error(message), { status, code });
function response(value, status = 200, headers) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
function failure(cause) {
  const code = cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code ?? 'local_file_error';
  const status = cause?.name === 'AbortError' ? 499 : cause?.status ?? 500;
  const message = cause?.message || 'The local file operation failed';
  return response({ status: 'error', error_code: code, detail: { error_type: code, message }, error: { code, message }, adapter_source: LOCAL_FILES_SOURCE, quota_scope: 'browser-origin-storage' }, status);
}
const bytesOf = value => value instanceof Uint8Array ? value : value instanceof ArrayBuffer ? new Uint8Array(value) : null;
const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
const randomHex = uuid => uuid().replace(/-/g, '').toLowerCase();
const notFound = cause => cause?.name === 'NotFoundError' || /^(?:File|Workspace file) not found\.?$/i.test(cause?.message ?? '');
function nameOf(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(value) || value === '.' || value === '..') throw issue('Invalid upload filename', 400, 'file_rejected');
  return value;
}
const DOCUMENT_MIME = Object.freeze({ pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
function documentFormatOf(name, mime = '') {
  const extension = name.split('.').at(-1).toLowerCase(), type = mime.split(';')[0].trim().toLowerCase();
  if (Object.hasOwn(DOCUMENT_MIME, extension)) return extension;
  if (type === 'application/x-pdf') return 'pdf';
  return Object.entries(DOCUMENT_MIME).find(([, value]) => value === type)?.[0] ?? null;
}
function kindOf(name, mime = '') {
  const extension = name.split('.').at(-1).toLowerCase(), type = mime.split(';')[0].trim().toLowerCase();
  if (['doc', 'docm', 'ppt', 'pptm', 'xls', 'xlsm', 'xlsb', 'odt', 'ods', 'odp'].includes(extension)) throw issue('Legacy, macro-enabled and other unsupported Office formats must be converted to DOCX, XLSX or PPTX', 415, 'unhandled_mime_type');
  if (documentFormatOf(name, mime)) return 'document';
  if (/(?:officedocument|msword|ms-excel|ms-powerpoint)/.test(type)) throw issue('Only PDF, DOCX, XLSX and PPTX document extraction is connected; other Office formats are unsupported', 415, 'unhandled_mime_type');
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'heic', 'heif'].includes(extension)) return 'image';
  if (type.startsWith('text/') || ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'log', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'sql', 'sh', 'bat', 'ps1', 'ini', 'toml', 'rst', 'tex'].includes(extension)) return 'text';
  return 'unknown';
}
function decodeText(bytes) {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 || bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4) throw issue('This binary document format has no connected local parser', 415, 'unhandled_mime_type');
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  let text;
  try { text = new TextDecoder(encoding, { fatal: true }).decode(bytes); } catch { throw issue('The file is not valid supported text', 415, 'unhandled_mime_type'); }
  if (text.includes('\0')) throw issue('Binary data is not a supported text document', 415, 'unhandled_mime_type');
  return { text, encoding };
}
let crcTable;
function crc32(bytes) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
    return value >>> 0;
  });
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8;
  return (value ^ 0xffffffff) >>> 0;
}
function imageInfo(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, mimeType;
  if (bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((part, index) => bytes[index] === part)) {
    let offset = 8, ended = false, data = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), end = offset + 12 + length;
      if (end > bytes.length) throw issue('Truncated PNG', 415, 'file_corrupted');
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== view.getUint32(offset + 8 + length)) throw issue('PNG checksum failed', 415, 'file_corrupted');
      if (offset === 8) {
        if (type !== 'IHDR' || length !== 13) throw issue('Invalid PNG header', 415, 'file_corrupted');
        width = view.getUint32(offset + 8); height = view.getUint32(offset + 12);
      }
      if (type === 'IDAT') data = true;
      if (type === 'IEND') { ended = true; if (end !== bytes.length) throw issue('PNG contains trailing bytes', 415, 'file_corrupted'); break; }
      offset = end;
    }
    if (!ended || !data) throw issue('Incomplete PNG', 415, 'file_corrupted');
    mimeType = 'image/png';
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) { offset += 2; continue; }
      const size = view.getUint16(offset + 2);
      if (size < 2 || offset + 2 + size > bytes.length) throw issue('Invalid JPEG segment', 415, 'file_corrupted');
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if (size < 8) throw issue('Invalid JPEG frame', 415, 'file_corrupted');
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      offset += 2 + size;
    }
    mimeType = 'image/jpeg';
  } else if (bytes.length >= 30 && String.fromCharCode(...bytes.subarray(0,4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8,12)) === 'WEBP') {
    if (view.getUint32(4, true) + 8 !== bytes.length) throw issue('Invalid WebP container', 415, 'file_corrupted');
    const tag = String.fromCharCode(...bytes.subarray(12,16));
    if (tag === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (tag === 'VP8L' && bytes[20] === 0x2f) {
      width = 1 + (bytes[21] | (bytes[22] & 0x3f) << 8);
      height = 1 + (bytes[22] >> 6 | bytes[23] << 2 | (bytes[24] & 0x0f) << 10);
    } else if (tag === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    }
    mimeType = 'image/webp';
  }
  if (!mimeType || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 16384 || height > 16384) throw issue('Only valid PNG, JPEG and WebP images are supported locally', 415, 'unhandled_mime_type');
  return { mimeType, width, height };
}
function base64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}

/**
 * storage is the real BrowserWorkspaceStore (OPFS or IndexedDB).
 * getWorkspacePrefix comes from the SAME localToolExecutor as Work/Codex.
 */
export function createLocalFilesService({
  storage, metadataStorage = globalThis.localStorage, getAccountId = () => null,
  getWorkspacePrefix, diagnostics = [], now = Date.now, uuid = () => crypto.randomUUID(),
  maxFileBytes = MAX_DEFAULT, maxTotalBytes = 256 * 1024 * 1024,
  readStorageEstimate, ticketLifetimeMs = 60 * 60 * 1000, documentExtractor,
  getOwnedSourceWorkspace, storageLocks = globalThis.navigator?.locks,
} = {}) {
  if (typeof storage?.write !== 'function' || typeof storage?.read !== 'function' || typeof storage?.remove !== 'function' || typeof getWorkspacePrefix !== 'function') throw new TypeError('Real workspace read/write/remove storage and its namespace callback are required');
  const active = new Map(), locks = new Map();
  let extractor = documentExtractor;
  const getDocumentExtractor = () => extractor ??= createLocalDocumentExtractor();
  function owner() {
    const id = getAccountId();
    if (typeof id !== 'string' || !id) throw issue('Sign in to this site before uploading files', 401, 'permission_error');
    return id;
  }
  const assertOwner = id => { if (owner() !== id) throw issue('The site account changed during file access', 409, 'permission_error'); };
  const stateKey = id => RECORD_PREFIX + encodeURIComponent(id);
  function state(id) {
    let raw;
    try { raw = metadataStorage.getItem(stateKey(id)); } catch { throw issue('Local file metadata storage is unavailable', 503, 'local_storage_unavailable'); }
    if (raw == null) return { version: 1, files: {}, generatedFiles: {}, publicationOps: {} };
    let result;
    try { result = JSON.parse(raw); } catch { throw issue('Local file metadata is damaged; existing bytes were preserved', 500, 'file_corrupted'); }
    if (!object(result) || result.version !== 1 || !object(result.files) || Object.entries(result.files).some(([key, row]) => !FILE_ID.test(key) || row?.fileId !== key || row.owner !== id || (!row.generated && !TICKET.test(row.ticket)) || !Number.isSafeInteger(row.size) || row.size < 1 || typeof row.namespace !== 'string' || !row.namespace || row.namespace === '.' || row.namespace === '..' || /[/\\\u0000-\u001f]/.test(row.namespace) || !['payload.txt','image.png','image.jpg','image.webp','image.bin','document.pdf','document.docx','document.xlsx','document.pptx'].includes(row.storageName) || !['pending','stored','ready','error','cancelled'].includes(row.status))) throw issue('Local file metadata has an invalid format; existing bytes were preserved', 500, 'file_corrupted');
    result.generatedFiles ??= {}; result.publicationOps ??= {};
    if (!object(result.generatedFiles) || !object(result.publicationOps) || Object.keys(result.publicationOps).length > MAX_PUBLICATION_OPERATIONS) throw issue('Local publication metadata is damaged; existing bytes were preserved', 500, 'file_corrupted');
    for (const row of Object.values(result.files)) {
      if (row.generated != null && (!object(row.generated) || !FILE_ID.test(row.generated.fileId ?? '') || row.generated.fileId === row.fileId || !Number.isSafeInteger(row.generated.revision) || row.generated.revision < 1 || !SHA256.test(row.generated.operationKey ?? '') || row.ticket != null || row.uploadURL != null || row.byteTarget != null || row.status === 'cancelled')) throw issue('Generated raw-version metadata is damaged', 500, 'file_corrupted');
      if (row.reservedTextBytes != null && (!row.generated || !Number.isSafeInteger(row.reservedTextBytes) || row.reservedTextBytes < 0 || row.reservedTextBytes > MAX_DEFAULT)) throw issue('Document text reservation metadata is damaged', 500, 'file_corrupted');
      if (row.kind === 'document' && !Object.hasOwn(DOCUMENT_MIME, row.documentFormat)) throw issue('The document format metadata is damaged', 500, 'file_corrupted');
      const text = row.extraction;
      if (text && (text.textStorageName !== 'extracted.txt' || !Number.isSafeInteger(text.textSize) || text.textSize < 1 || !/^[0-9a-f]{64}$/.test(text.textSHA256 ?? '') || text.sourceSHA256 !== row.sha256 || typeof text.partial !== 'boolean' || typeof text.truncated !== 'boolean')) throw issue('The document text sidecar metadata is damaged', 500, 'file_corrupted');
      if (row.kind === 'document' && row.status === 'ready' && !text) throw issue('Ready document text metadata is missing', 500, 'file_corrupted');
    }
    for (const [fileId, row] of Object.entries(result.generatedFiles)) {
      const raw = result.files[row?.rawFileId];
      if (!FILE_ID.test(fileId) || row?.fileId !== fileId || !FILE_ID.test(row.rawFileId ?? '') || !Number.isSafeInteger(row.revision) || row.revision < 1 || !Number.isSafeInteger(row.createdAt) || !Number.isSafeInteger(row.updatedAt) || row.updatedAt < row.createdAt || !raw?.generated || raw.generated.fileId !== fileId || raw.generated.revision !== row.revision || raw.status !== 'ready') throw issue('The generated publication pointer is damaged', 500, 'file_corrupted');
    }
    for (const [operationKey, op] of Object.entries(result.publicationOps)) {
      const raw = result.files[op?.rawFileId];
      if (!SHA256.test(operationKey) || !object(op) || op.owner !== id || typeof op.operationId !== 'string' || !op.operationId || op.operationId.length > 256 || !SHA256.test(op.intentHash ?? '') || !SHA256.test(op.sourceSHA256 ?? '') || !FILE_ID.test(op.fileId ?? '') || !FILE_ID.test(op.rawFileId ?? '') || !Number.isSafeInteger(op.revision) || op.revision < 1 || !['staging','cleanup_pending','failed','committed','deleted'].includes(op.phase) || !Number.isSafeInteger(op.size) || op.size < 1 || !Number.isSafeInteger(op.createdAt) || (['staging','cleanup_pending','committed'].includes(op.phase) && (!raw?.generated || raw.generated.operationKey !== operationKey || raw.generated.fileId !== op.fileId))) throw issue('The durable publication journal is damaged', 500, 'file_corrupted');
      if (op.phase === 'committed' && (!object(op.receipt) || op.receipt.committed !== true || op.receipt.fileId !== op.fileId || op.receipt.rawFileId !== op.rawFileId || op.receipt.revision !== op.revision || op.receipt.sha256 !== op.sourceSHA256)) throw issue('The saved publication receipt is damaged', 500, 'file_corrupted');
    }
    return result;
  }
  function saveUnlocked(id, value) {
    assertOwner(id);
    try { metadataStorage.setItem(stateKey(id), JSON.stringify(value)); } catch { throw issue('Local file metadata could not be saved', 507, 'local_storage_write_failed'); }
  }
  const sharedLocksAvailable = () => typeof storageLocks?.request === 'function';
  function withSharedLock(name, signal, action) {
    if (!sharedLocksAvailable()) throw issue('Shared browser storage locks are unavailable; generated files were not published', 503, 'publication_lock_unavailable');
    // A promise-returning callback releases the real lock on both outcomes,
    // including Node's standard LockManager host when an action throws.
    return storageLocks.request(name, { mode: 'exclusive', ...(signal ? { signal } : {}) }, async () => action());
  }
  async function mutateState(id, transform, { signal } = {}) {
    const action = () => {
      cancellation(signal); assertOwner(id);
      const current = state(id), result = transform(current);
      if (result && typeof result.then === 'function') throw new TypeError('File metadata commits must be synchronous');
      cancellation(signal); assertOwner(id); saveUnlocked(id, current);
      return copy(result);
    };
    // Existing uploads remain available on old hosts. Mutable publication is
    // unavailable there; when a shared lock adapter exists every writer uses it.
    return sharedLocksAvailable() ? withSharedLock('chatgpt-local-files:' + encodeURIComponent(id), signal, action) : action();
  }
  async function update(id, fileId, transform, options) {
    return mutateState(id, current => {
      const row = current.files[fileId];
      if (!row) throw issue('This local file was not found', 404, 'file_not_found');
      current.files[fileId] = transform(copy(row), current);
      return current.files[fileId];
    }, options);
  }
  function usedBytes(files, excludeTextFor = null) {
    return Object.values(files).filter(row => row.status !== 'cancelled' &&
      (row.generated || row.status !== 'pending' || row.expiresAt > now()))
      .reduce((total, row) => total + row.size + (row.fileId === excludeTextFor ? 0 : row.extraction?.textSize ?? row.reservedTextBytes ?? 0), 0);
  }
  function find(id, fileId) {
    const row = state(id).files[fileId];
    if (!row || row.status === 'cancelled') throw issue('This local file was not found for the current account', 404, 'file_not_found');
    return copy(row);
  }
  function prefix(threadId) {
    const value = getWorkspacePrefix(threadId);
    if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[/\\\u0000-\u001f]/.test(value)) throw issue('The real workspace namespace is unavailable', 503, 'local_storage_unavailable');
    return value;
  }
  const storageKey = row => row.namespace + '/' + row.storageName;
  function note(kind, fields = {}) { diagnostics.push({ type: 'local-files', kind, at: now(), ...fields }); }
  function cancellation(signal) { signal?.throwIfAborted(); }
  async function readBytes(id, row, signal) {
    cancellation(signal); assertOwner(id);
    if (!['stored','ready'].includes(row.status) || !/^[0-9a-f]{64}$/.test(row.sha256 ?? '')) throw issue('The file bytes are not ready', 409, 'file_content_not_found');
    let bytes;
    try { bytes = bytesOf(await storage.read(storageKey(row))); } catch (cause) { if (notFound(cause)) throw issue('The saved file bytes are missing', 404, 'file_content_not_found'); throw issue('The saved file bytes could not be read', 503, 'local_storage_unavailable'); }
    cancellation(signal); assertOwner(id);
    if (!bytes || bytes.length !== row.size || await hash(bytes) !== row.sha256) throw issue('The saved file bytes failed their SHA-256 check', 409, 'file_corrupted');
    cancellation(signal); assertOwner(id);
    return bytes;
  }
  async function serialize(id, fileId, action, { signal } = {}) {
    const key = id + '\0' + fileId, previous = locks.get(key) ?? Promise.resolve();
    const invoke = () => { cancellation(signal); assertOwner(id); return action(); };
    const current = previous.catch(() => {}).then(() => sharedLocksAvailable()
      ? withSharedLock('chatgpt-local-files:' + encodeURIComponent(id) + ':raw:' + fileId, signal, invoke)
      : invoke());
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  }
  async function create(body, request, path) {
    if (!object(body)) throw issue('A file-creation JSON object is required');
    const id = owner(), name = nameOf(body.file_name), size = body.file_size;
    if (!Number.isSafeInteger(size) || size < 1) throw issue('The selected file is empty', 400, 'file_zero_bytes');
    if (size > maxFileBytes) throw issue('The file exceeds this local provider upload limit', 413, 'file_too_large');
    const mime = typeof body.mime_type === 'string' ? body.mime_type : typeof body.client_resolved_mime_type === 'string' ? body.client_resolved_mime_type : '';
    const kind = kindOf(name, mime), documentFormat = kind === 'document' ? documentFormatOf(name, mime) : null;
    const current = state(id), reserved = usedBytes(current.files);
    if (reserved + size > maxTotalBytes) throw issue('The configured local account file-storage quota is full', 507, 'over_user_quota');
    if (typeof readStorageEstimate === 'function') {
      const estimate = await readStorageEstimate();
      assertOwner(id);
      if (Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage) && estimate.quota - estimate.usage < size) throw issue('The browser reports insufficient origin storage', 507, 'over_user_quota');
    }
    const token = randomHex(uuid), suffix = randomHex(uuid);
    if (!TICKET.test(token) || !TICKET.test(suffix)) throw issue('A secure local upload ID could not be allocated', 500);
    const fileId = LOCAL_FILE_PREFIX + suffix, namespace = prefix('upload-' + suffix);
    const incoming = new URL(request.url), urlPrefix = incoming.pathname.endsWith(path) ? incoming.pathname.slice(0, -path.length) : '';
    const byteTarget = new URL(urlPrefix + '/files/local-upload/' + token, incoming.origin).href;
    const uploadURL = new URL(urlPrefix + '/estuary/upload_content_bytes', incoming.origin);
    uploadURL.searchParams.set('upload_url', byteTarget);
    const imageExtension = /image\/png/i.test(mime) || /\.png$/i.test(name) ? 'png' : /image\/jpeg/i.test(mime) || /\.jpe?g$/i.test(name) ? 'jpg' : /image\/webp/i.test(mime) || /\.webp$/i.test(name) ? 'webp' : 'bin';
    const row = { fileId, owner: id, ticket: token, namespace, storageName: kind === 'document' ? 'document.' + documentFormat : kind === 'image' ? 'image.' + imageExtension : 'payload.txt', fileName: name, mimeType: mime || (kind === 'text' ? 'text/plain' : 'application/octet-stream'), kind, ...(documentFormat ? { documentFormat } : {}), size, status: 'pending', createdAt: now(), expiresAt: now() + ticketLifetimeMs, byteTarget, uploadURL: uploadURL.href, requestOrigin: incoming.origin, pathPrefix: urlPrefix };
    // Re-read after the optional real quota estimate; do not lose concurrent admissions.
    await mutateState(id, next => {
      if (usedBytes(next.files) + size > maxTotalBytes) throw issue('The configured local account file-storage quota is full', 507, 'over_user_quota');
      if (next.files[fileId] || next.generatedFiles?.[fileId]) throw issue('Duplicate local upload ID', 409);
      next.files[fileId] = row;
    }, { signal: request.signal });
    cancellation(request.signal); assertOwner(id);
    return { file_id: fileId, upload_url: uploadURL.href, upload_headers: {}, adapter_source: LOCAL_FILES_SOURCE, local_upload_limit_bytes: maxFileBytes };
  }
  function findTicket(id, token) {
    const row = Object.values(state(id).files).find(row => row.ticket === token);
    if (!row || row.status === 'cancelled') throw issue('This local upload ticket was not found', 404, 'file_not_found');
    if (row.status === 'pending' && row.expiresAt <= now()) throw issue('The local upload ticket expired', 410, 'file_expired');
    return copy(row);
  }
  function ticketFromURL(value) {
    try {
      const url = new URL(value), match = /\/files\/local-upload\/([0-9a-f]{32})$/.exec(url.pathname);
      return match?.[1] ?? null;
    } catch { return null; }
  }
  function ownsUploadURL(value) {
    try {
      const id = owner(), incoming = new URL(value, globalThis.location?.href);
      // Classify an issued URL even after expiry/cancellation so its retry stays
      // inside this provider and cannot fall through to the original cloud XHR.
      const allocated = token => Object.values(state(id).files).find(row => row.ticket === token);
      if (/\/files\/local-upload\/[0-9a-f]{32}$/.test(incoming.pathname)) {
        const row = allocated(incoming.pathname.split('/').at(-1));
        return row?.byteTarget === incoming.href;
      }
      if (incoming.pathname.endsWith('/estuary/upload_content_bytes')) {
        const target = incoming.searchParams.get('upload_url'), token = ticketFromURL(target);
        if (!token) return false;
        return allocated(token)?.uploadURL === incoming.href;
      }
    } catch {}
    return false;
  }
  async function storeUpload(row, bytes, signal) {
    const id = owner();
    return serialize(id, row.fileId, async () => {
      const current = find(id, row.fileId);
      if (current.ticket !== row.ticket || current.byteTarget !== row.byteTarget) throw issue('Upload ticket changed', 409, 'permission_error');
      cancellation(signal);
      if (bytes.length !== current.size) throw issue('Uploaded byte count differs from the allocated file', 422, 'file_corrupted');
      // A retry may confirm the same immutable bytes, never replace an attachment
      // already referenced by a conversation with different contents.
      if (['stored','ready'].includes(current.status)) {
        const saved = await readBytes(id, current, signal);
        if (await hash(bytes) !== await hash(saved)) throw issue('This file ID already refers to different persisted bytes', 409, 'file_rejected');
        return;
      }
      const controller = new AbortController(), abort = () => controller.abort(signal.reason);
      signal?.addEventListener('abort', abort, { once: true });
      active.set(row.fileId, controller);
      const stop = () => { cancellation(signal); controller.signal.throwIfAborted(); assertOwner(id); };
      try {
        stop();
        const digest = await hash(bytes); stop();
        try { await storage.write(storageKey(current), bytes); } catch { throw issue('The browser could not persist the actual uploaded bytes', 507, 'local_storage_write_failed'); }
        stop();
        let verified;
        try { verified = bytesOf(await storage.read(storageKey(current))); } catch { throw issue('The uploaded bytes could not be read back', 503, 'local_storage_unavailable'); }
        stop();
        if (!verified || verified.length !== bytes.length || await hash(verified) !== digest) throw issue('The stored upload failed SHA-256 verification', 409, 'file_corrupted');
        stop();
        await update(id, row.fileId, prior => {
          if (prior.status === 'cancelled') throw issue('Upload cancelled', 409, 'upload_cancelled');
          return { ...prior, status: 'stored', sha256: digest, storedAt: now() };
        }, { signal: controller.signal });
        stop();
        note('bytes-persisted', { fileId: row.fileId, bytes: bytes.length });
      } catch (cause) {
        if (signal?.aborted || controller.signal.aborted) {
          try { await storage.remove(storageKey(current)); } catch { note('cancel-cleanup-error', { fileId: row.fileId }); }
          if (getAccountId() === id) try { await update(id, row.fileId, prior => ({ ...prior, status: 'cancelled' })); } catch {}
          throw new DOMException('Upload cancelled', 'AbortError');
        }
        throw cause;
      } finally {
        active.delete(row.fileId); signal?.removeEventListener('abort', abort);
      }
    }, { signal });
  }
  async function acceptBytes(request, path) {
    const id = owner(), incoming = new URL(request.url);
    let token, file;
    if (path.startsWith('/files/local-upload/')) {
      token = path.split('/').at(-1);
      const row = findTicket(id, token);
      if (incoming.href !== row.byteTarget) throw issue('Invalid local upload target', 403, 'permission_error');
      file = new Uint8Array(await request.arrayBuffer());
      await storeUpload(row, file, request.signal);
      return row;
    }
    const target = incoming.searchParams.get('upload_url');
    token = ticketFromURL(target);
    if (!token) throw issue('A real local upload target is required', 403, 'permission_error');
    const row = findTicket(id, token);
    if (incoming.href !== row.uploadURL || target !== row.byteTarget) throw issue('The local upload URL does not match this file', 403, 'permission_error');
    const form = await request.formData(), uploaded = form.get('file'), submittedTarget = form.get('upload_url');
    if (submittedTarget != null && submittedTarget !== target) throw issue('Multipart target differs from the allocated upload', 403, 'permission_error');
    if (!uploaded || typeof uploaded.arrayBuffer !== 'function') throw issue('The original multipart file field is required');
    if (uploaded.size !== row.size || uploaded.size > maxFileBytes) throw issue('Uploaded file size differs from its ticket', 422, 'file_corrupted');
    file = new Uint8Array(await uploaded.arrayBuffer());
    assertOwner(id); cancellation(request.signal);
    await storeUpload(row, file, request.signal);
    return row;
  }
  async function readDocumentText(id, row, signal) {
    cancellation(signal); assertOwner(id);
    const info = row.extraction;
    if (!info || info.sourceSHA256 !== row.sha256 || info.textStorageName !== 'extracted.txt') throw issue('The extracted document text is not ready', 409, 'file_content_not_found');
    let bytes;
    try { bytes = bytesOf(await storage.read(row.namespace + '/' + info.textStorageName)); }
    catch (cause) { if (notFound(cause)) throw issue('The saved document text sidecar is missing', 404, 'file_content_not_found'); throw issue('The saved document text sidecar could not be read', 503, 'local_storage_unavailable'); }
    cancellation(signal); assertOwner(id);
    if (!bytes || bytes.length !== info.textSize || await hash(bytes) !== info.textSHA256) throw issue('The saved document text sidecar failed SHA-256 verification', 409, 'file_corrupted');
    cancellation(signal); assertOwner(id);
    return bytes;
  }
  function sidecarText(result) {
    const summary = extractionSummary(result);
    return '[Local document text extraction]\n' + JSON.stringify(summary) + '\n' +
      (result.partial || result.truncated ? 'This extraction is partial. Unprocessed pages, sheets/cells, omitted content or text beyond the extraction limit were not examined.\n' : '') +
      'Images and scanned text were not transcribed. The original document bytes are retained separately.\n\n' + result.text;
  }
  function extractionSummary(result) {
    return { format: result.format, parser: result.parser, scope: ({ pdf: 'PDF text layer only', docx: 'DOCX body text only', xlsx: 'Saved XLSX worksheet cells/formula caches only; no calculation, date timezone conversion, chart interpretation or external refresh', pptx: 'PPTX slide text only; no visual layout, chart interpretation, speaker notes or OCR' })[result.format], ocr: false, partial: result.partial, truncated: result.truncated, reasons: result.reasons, totalPages: result.totalPages, processedPages: result.processedPages, pagesWithoutText: result.pagesWithoutText, hiddenPages: result.hiddenPages, totalSheets: result.totalSheets, processedSheets: result.processedSheets, processedCells: result.processedCells, emittedCells: result.emittedCells, formulaCells: result.formulaCells, missingFormulaCaches: result.missingFormulaCaches, hiddenSheets: result.hiddenSheets, dateSystem: result.dateSystem, formulaEvaluation: result.formulaEvaluation, externalDataRefreshed: result.externalDataRefreshed, numberFormatsRendered: result.numberFormatsRendered, unsupportedParts: result.unsupportedParts, warnings: result.warnings };
  }
  async function processFile(fileId, signal) {
    const id = owner();
    return serialize(id, fileId, async () => {
      const row = find(id, fileId), bytes = await readBytes(id, row, signal);
      if (row.kind === 'document' && row.status === 'ready') { await readDocumentText(id, row, signal); return row; }
      const controller = new AbortController(), abort = () => controller.abort(signal?.reason);
      signal?.addEventListener('abort', abort, { once: true });
      active.set(fileId, controller);
      const stop = () => { cancellation(signal); controller.signal.throwIfAborted(); assertOwner(id); };
      let wroteSidecar = false, committed = false;
      try {
        stop();
        let details;
        if (row.kind === 'image') details = { kind: 'image', ...imageInfo(bytes) };
        else if (row.kind === 'document') {
          const parsed = await getDocumentExtractor().extract(bytes, { format: row.documentFormat, signal: controller.signal });
          stop();
          const content = sidecarText(parsed), textBytes = new TextEncoder().encode(content), textSHA256 = await hash(textBytes);
          stop();
          const occupied = usedBytes(state(id).files, fileId);
          if (occupied + textBytes.length > maxTotalBytes) throw issue('The configured local document text-storage quota is full', 507, 'over_user_quota');
          if (row.generated) await update(id, fileId, (prior, current) => {
            if (usedBytes(current.files, fileId) + textBytes.length > maxTotalBytes) throw issue('The configured local document text-storage quota is full', 507, 'over_user_quota');
            return { ...prior, reservedTextBytes: textBytes.length };
          }, { signal: controller.signal });
          try { wroteSidecar = true; await storage.write(row.namespace + '/extracted.txt', textBytes); }
          catch { throw issue('The real extracted document text could not be persisted', 507, 'local_storage_write_failed'); }
          stop();
          let verified;
          try { verified = bytesOf(await storage.read(row.namespace + '/extracted.txt')); }
          catch { throw issue('The extracted text could not be read back', 503, 'local_storage_unavailable'); }
          if (!verified || verified.length !== textBytes.length || await hash(verified) !== textSHA256) throw issue('The stored document text failed SHA-256 verification', 409, 'file_corrupted');
          stop();
          // Detect deleted/changed source bytes while the isolated CPU task ran.
          await readBytes(id, row, controller.signal);
          details = {
            kind: 'document', mimeType: DOCUMENT_MIME[row.documentFormat],
            extraction: { ...extractionSummary(parsed), textStorageName: 'extracted.txt', textSize: textBytes.length, textSHA256, sourceSHA256: row.sha256, extractedCharacters: parsed.text.length, textCharacters: content.length },
          };
        } else {
          const decoded = decodeText(bytes);
          details = { kind: 'text', encoding: decoded.encoding, textCharacters: decoded.text.length, mimeType: row.mimeType === 'application/octet-stream' ? 'text/plain' : row.mimeType };
        }
        stop();
        // Re-read persisted occupancy and commit without an intervening await.
        // Another document parse or raw-file admission may have completed while
        // this worker/sidecar write was pending. Never publish two ready records
        // whose combined real bytes exceed the configured account quota.
        const ready = await update(id, fileId, prior => {
          if (details.extraction) {
            const fresh = state(id);
            const occupied = usedBytes(fresh.files, fileId);
            if (occupied + details.extraction.textSize > maxTotalBytes) throw issue('Concurrent file admissions filled the configured local document quota', 507, 'over_user_quota');
          }
          return { ...prior, ...details, status: 'ready', processedAt: now(), processingError: undefined, reservedTextBytes: undefined };
        }, { signal: controller.signal });
        committed = true;
        stop();
        note('processing-completed', { fileId, fileKind: ready.kind, bytes: ready.size });
        return ready;
      } catch (cause) {
        if (wroteSidecar && !committed && (!row.generated || getAccountId() === id)) try { await storage.remove(row.namespace + '/extracted.txt'); } catch { note('sidecar-cleanup-error', { fileId }); }
        if (getAccountId() === id) try { await update(id, fileId, prior => ({ ...prior, processingError: { code: cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code ?? 'document_parser_error', at: now() } })); } catch {}
        note('processing-error', { fileId, code: cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code ?? 'document_parser_error' });
        throw cause;
      } finally { active.delete(fileId); signal?.removeEventListener('abort', abort); }
    }, { signal });
  }
  function downloadURL(row) {
    const prefix = row.pathPrefix.replace(/\/(?:backend-api|__codex-api)$/, '');
    return new URL(prefix + '/__local_artifacts/' + encodeURIComponent(row.namespace) + '/' + encodeURIComponent(row.storageName), row.requestOrigin).href;
  }
  async function readFile(fileId, { signal } = {}) {
    const id = owner(), row = find(id, fileId), bytes = await readBytes(id, row, signal);
    return { record: row, bytes };
  }
  async function cancelUpload(fileId) {
    const id = owner(), row = find(id, fileId);
    if (row.generated) throw issue('Committed generated versions are deleted through their Library publication', 409, 'generated_version_owned');
    await update(id, fileId, prior => ({ ...prior, status: 'cancelled' }));
    active.get(fileId)?.abort(new DOMException('Upload cancelled', 'AbortError'));
    await serialize(id, fileId, async () => {
      for (const key of [storageKey(row), ...(row.kind === 'document' ? [row.namespace + '/extracted.txt'] : [])]) {
        assertOwner(id);
        try { await storage.remove(key); } catch (cause) { if (!notFound(cause)) throw issue('The upload was cancelled but its bytes or extracted text could not be removed', 503, 'local_storage_unavailable'); }
        assertOwner(id);
      }
    });
    return { cancelled: true, fileId };
  }
  /** Account-owned metadata only. Library presentation/trash lives elsewhere. */
  async function listFiles({ signal } = {}) {
    const id = owner(); cancellation(signal);
    const current = state(id);
    const sanitize = row => {
      try { nameOf(row.fileName); } catch { throw issue('Local file display metadata is damaged', 500, 'file_corrupted'); }
      if (typeof row.mimeType !== 'string' || !row.mimeType || row.mimeType.length > 512 || /[\u0000-\u001f\u007f]/.test(row.mimeType) || !['text','image','document','unknown'].includes(row.kind) || !Number.isSafeInteger(row.createdAt) || row.createdAt < 0 || row.processedAt != null && (!Number.isSafeInteger(row.processedAt) || row.processedAt < 0) || row.sha256 != null && !SHA256.test(row.sha256) || ['stored','ready'].includes(row.status) && row.sha256 == null) throw issue('Local file catalog metadata is damaged', 500, 'file_corrupted');
      for (const key of ['width','height']) if (row[key] != null && (!Number.isInteger(row[key]) || row[key] < 1 || row[key] > 16384)) throw issue('Local image dimensions are damaged', 500, 'file_corrupted');
      return { fileId: row.fileId, fileName: row.fileName, mimeType: row.mimeType, size: row.size, kind: row.kind, status: row.status, sha256: row.sha256 ?? null, createdAt: row.createdAt, processedAt: row.processedAt ?? null, ...(row.width == null ? {} : { width: row.width }), ...(row.height == null ? {} : { height: row.height }) };
    };
    const rows = [];
    for (const raw of Object.values(current.files)) { const value = sanitize(raw); if (!raw.generated) rows.push(value); }
    for (const logical of Object.values(current.generatedFiles)) {
      const raw = current.files[logical.rawFileId];
      rows.push({ ...sanitize(raw), fileId: logical.fileId, rawFileId: raw.fileId, status: logical.deleting ? 'deleting' : raw.status, createdAt: logical.createdAt, processedAt: logical.updatedAt, publication: { origin: 'generated', revision: logical.revision, updatedAt: logical.updatedAt } });
    }
    cancellation(signal); assertOwner(id);
    return rows;
  }
  /** Only remove metadata after both actual owned upload paths are absent. */
  async function permanentDeleteFile(fileId, { signal } = {}) {
    const id = owner(); cancellation(signal);
    if (typeof fileId !== 'string' || !FILE_ID.test(fileId)) throw issue('This local file was not found', 404, 'file_not_found');
    if (state(id).generatedFiles[fileId]) return permanentDeleteGenerated(id, fileId, { signal });
    const selected = state(id).files[fileId];
    if (selected?.generated) throw issue('Delete the stable Library publication to remove its immutable versions', 409, 'generated_version_owned');
    // Wait for this provider's in-flight upload/parser. Unlike cancelUpload,
    // permanent deletion never marks the record cancelled before IO succeeds.
    return serialize(id, fileId, async () => {
      const stop = () => { cancellation(signal); assertOwner(id); };
      stop();
      const row = state(id).files[fileId];
      if (!row) throw issue('This local file was not found for the current account', 404, 'file_not_found');
      const keys = [storageKey(row), ...(row.kind === 'document' ? [row.namespace + '/extracted.txt'] : [])];
      const confirmMissing = async key => {
        stop();
        try { await storage.read(key); }
        catch (cause) {
          stop();
          if (notFound(cause)) return;
          throw issue('The browser could not verify permanent file deletion; retry is available', 503, 'local_storage_unavailable');
        }
        stop();
        throw issue('File bytes remain after the deletion attempt; retry is available', 503, 'local_storage_unavailable');
      };
      for (const key of keys) {
        stop();
        try { await storage.remove(key); }
        catch (cause) {
          stop();
          if (!notFound(cause)) throw issue('The browser could not remove the owned file bytes; retry is available', 503, 'local_storage_unavailable');
        }
        stop();
        await confirmMissing(key);
      }
      for (const key of keys) await confirmMissing(key);
      stop();
      await mutateState(id, current => {
        const latest = current.files[fileId];
        if (!latest || latest.ticket !== row.ticket || latest.namespace !== row.namespace || latest.storageName !== row.storageName) throw issue('Local file ownership changed during deletion', 409, 'permission_error');
        delete current.files[fileId];
      }, { signal });
      note('bytes-permanently-deleted', { fileId });
      return { deleted: true, fileId };
    }, { signal });
  }

  function publicationSpec(value) {
    if (!object(value) || Object.keys(value).some(key => !['requestId','threadId','path','fileName','mimeType','fileId','expectedRevision','expectedRawFileId','expectedSourceSHA256'].includes(key))) throw issue('A supported generated-publication request is required');
    if (typeof value.requestId !== 'string' || !value.requestId.trim() || value.requestId.length > 256 || /[\u0000-\u001f\u007f]/.test(value.requestId)) throw issue('A nonempty publication operation ID is required');
    if (typeof value.threadId !== 'string' || !value.threadId || value.threadId.length > 256 || /[\u0000-\u001f\u007f]/.test(value.threadId)) throw issue('An owned source thread is required');
    let path;
    try { path = workspacePath(value.path); } catch (cause) { throw issue(cause.message, 400, 'file_rejected'); }
    if (typeof value.path !== 'string' || path.length > 2048) throw issue('A bounded workspace source path is required');
    const fileName = nameOf(value.fileName ?? path.split('/').at(-1)), mimeType = value.mimeType ?? '';
    if (typeof mimeType !== 'string' || mimeType.length > 512 || /[\u0000-\u001f\u007f]/.test(mimeType)) throw issue('The generated MIME hint is invalid');
    const fileId = value.fileId ?? null, expectedRevision = value.expectedRevision ?? null, expectedRawFileId = value.expectedRawFileId ?? null, expectedSourceSHA256 = value.expectedSourceSHA256 ?? null;
    if (fileId !== null && (!FILE_ID.test(fileId) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || !FILE_ID.test(expectedRawFileId ?? ''))) throw issue('An update requires its logical file ID and exact expected revision/raw ID');
    if (fileId === null && (expectedRevision !== null || expectedRawFileId !== null)) throw issue('A new publication must not claim an existing revision');
    if (expectedSourceSHA256 !== null && !SHA256.test(expectedSourceSHA256)) throw issue('The expected source SHA-256 is invalid');
    return { requestId: value.requestId, threadId: value.threadId, path, fileName, mimeType, fileId, expectedRevision, expectedRawFileId, expectedSourceSHA256 };
  }
  async function ownedPublicationSource(id, spec, signal) {
    cancellation(signal); assertOwner(id);
    const context = await getOwnedSourceWorkspace({ threadId: spec.threadId, signal });
    cancellation(signal); assertOwner(id);
    if (!object(context) || context.accountId !== id || context.threadId !== spec.threadId || typeof context.prefix !== 'string' || context.prefix !== prefix(spec.threadId)) throw issue('The source workspace is not owned by this account/thread', 409, 'permission_error');
    return { ...context, path: spec.path, key: context.prefix + '/' + spec.path };
  }
  function publicationTarget(current, spec, previous) {
    const fileId = spec.fileId ?? previous?.fileId;
    if (spec.fileId !== null) {
      const target = current.generatedFiles[fileId];
      if (!target) throw issue('The generated publication was not found for this account', 404, 'file_not_found');
      if (target.deleting) throw issue('The generated publication is being permanently deleted', 409, 'publication_deleted');
      if (target.revision !== spec.expectedRevision || target.rawFileId !== spec.expectedRawFileId) throw issue('The generated publication has changed; reload its current revision before saving', 409, 'publication_conflict');
      return target;
    }
    if (fileId && (current.generatedFiles[fileId] || current.files[fileId])) throw issue('The publication ID is already used', 409, 'publication_conflict');
    return null;
  }
  function publicationStop(id, operationKey, signal) {
    cancellation(signal); assertOwner(id);
    const op = state(id).publicationOps[operationKey];
    if (!op || op.cancelRequested || op.phase === 'deleted') throw issue('The publication operation was cancelled or deleted', 409, 'publication_cancelled');
    return op;
  }
  async function publicationReceipt(id, operationKey) {
    assertOwner(id);
    const current = state(id), op = current.publicationOps[operationKey];
    if (!op || op.phase !== 'committed') throw issue('The publication has not committed', 409, 'publication_not_committed');
    const logical = current.generatedFiles[op.fileId];
    if (!logical || logical.deleting) throw issue('The publication has been deleted or is being deleted', 410, 'publication_deleted');
    const { record } = await readFile(op.rawFileId);
    assertOwner(id);
    if (record.sha256 !== op.sourceSHA256 || record.size !== op.size || record.generated?.fileId !== op.fileId || record.generated?.revision !== op.revision || record.status !== 'ready') throw issue('The committed publication bytes do not match its receipt', 409, 'file_corrupted');
    if (op.receipt.operationId !== op.operationId || op.receipt.fileName !== record.fileName || op.receipt.mimeType !== record.mimeType || op.receipt.size !== record.size || op.receipt.kind !== record.kind || op.receipt.publication?.origin !== 'generated' || op.receipt.publication?.revision !== op.revision) throw issue('The saved publication receipt metadata is damaged', 409, 'file_corrupted');
    if (record.kind === 'document') await readDocumentText(id, record);
    assertOwner(id);
    const fresh = state(id), after = fresh.publicationOps[operationKey], active = fresh.generatedFiles[op.fileId];
    if (after?.phase !== 'committed' || !active || active.deleting) throw issue('The publication was deleted while its receipt was recovered', 410, 'publication_deleted');
    return { ...copy(op.receipt), currentRevision: active.revision, superseded: active.rawFileId !== op.rawFileId };
  }
  async function cleanPublicationStage(id, operationKey, { failedCode } = {}) {
    assertOwner(id);
    const op = state(id).publicationOps[operationKey];
    if (!op || ['failed','deleted'].includes(op.phase)) return false;
    if (op.phase === 'committed') return false;
    const row = state(id).files[op.rawFileId];
    if (!row?.generated || row.generated.operationKey !== operationKey || row.generated.fileId !== op.fileId) throw issue('The publication cleanup journal no longer owns its raw version', 409, 'file_corrupted');
    const paths = [storageKey(row), ...(row.kind === 'document' ? [row.namespace + '/extracted.txt'] : [])];
    const confirm = async key => {
      assertOwner(id);
      try { await storage.read(key); }
      catch (cause) { assertOwner(id); if (notFound(cause)) return; throw issue('Publication cleanup absence could not be verified', 503, 'local_storage_unavailable'); }
      assertOwner(id); throw issue('Publication staging bytes remain; cleanup must be retried', 503, 'local_storage_unavailable');
    };
    try {
      for (const key of paths) {
        assertOwner(id);
        try { await storage.remove(key); }
        catch (cause) { assertOwner(id); if (!notFound(cause)) throw issue('Publication staging bytes could not be removed', 503, 'local_storage_unavailable'); }
        assertOwner(id); await confirm(key);
      }
      for (const key of paths) await confirm(key);
      await mutateState(id, current => {
        const latest = current.publicationOps[operationKey], raw = current.files[op.rawFileId];
        if (!latest || latest.phase === 'committed' || raw?.generated?.operationKey !== operationKey || raw.namespace !== row.namespace) throw issue('Publication ownership changed during cleanup', 409, 'permission_error');
        delete current.files[op.rawFileId];
        current.publicationOps[operationKey] = { ...latest, phase: 'failed', failureCode: failedCode ?? latest.failureCode ?? 'publication_interrupted', cleanupPending: false };
      });
      return false;
    } catch (cause) {
      if (getAccountId() === id) try {
        await mutateState(id, current => {
          const latest = current.publicationOps[operationKey];
          if (latest && latest.phase !== 'committed' && latest.phase !== 'deleted') current.publicationOps[operationKey] = { ...latest, phase: 'cleanup_pending', failureCode: failedCode ?? latest.failureCode ?? 'publication_interrupted', cleanupPending: true };
        });
      } catch { /* The existing staging journal/reservation remains authoritative. */ }
      throw cause;
    }
  }

  async function permanentDeleteGenerated(id, fileId, { signal } = {}) {
    if (!sharedLocksAvailable()) throw issue('Shared storage locks are required to delete a generated publication safely', 503, 'publication_lock_unavailable');
    return withSharedLock('chatgpt-local-files:' + encodeURIComponent(id) + ':delete:' + fileId, signal, async () => {
      const stop = () => { cancellation(signal); assertOwner(id); };
      stop();
      const operations = await mutateState(id, current => {
        const logical = current.generatedFiles[fileId];
        if (!logical) throw issue('The generated publication was not found', 404, 'file_not_found');
        current.generatedFiles[fileId] = { ...logical, deleting: true };
        const keys = [];
        for (const [key, op] of Object.entries(current.publicationOps)) if (op.fileId === fileId) {
          if (['staging','cleanup_pending'].includes(op.phase)) current.publicationOps[key] = { ...op, cancelRequested: true };
          keys.push({ key, rawFileId: op.rawFileId });
        }
        return keys;
      }, { signal });
      for (const op of operations) active.get(op.rawFileId)?.abort(new DOMException('Publication is being permanently deleted', 'AbortError'));
      // Drain genuine cross-context operation locks after releasing metadata.
      // An already admitted writer observes cancelRequested before any commit.
      for (const op of operations.sort((a,b) => a.key.localeCompare(b.key))) {
        stop();
        await withSharedLock('chatgpt-local-files:' + encodeURIComponent(id) + ':publication:' + op.key, signal, async () => {});
      }
      stop();
      const rows = Object.values(state(id).files).filter(row => row.generated?.fileId === fileId);
      const paths = rows.flatMap(row => [storageKey(row), ...(row.kind === 'document' ? [row.namespace + '/extracted.txt'] : [])]);
      const confirm = async key => {
        stop();
        try { await storage.read(key); }
        catch (cause) { stop(); if (notFound(cause)) return; throw issue('Generated revision deletion could not be verified; retry is available', 503, 'local_storage_unavailable'); }
        stop(); throw issue('Generated revision bytes remain; retry is available', 503, 'local_storage_unavailable');
      };
      for (const key of paths) {
        stop();
        try { await storage.remove(key); }
        catch (cause) { stop(); if (!notFound(cause)) throw issue('Generated revision bytes could not be removed; retry is available', 503, 'local_storage_unavailable'); }
        stop(); await confirm(key);
      }
      for (const key of paths) await confirm(key);
      await mutateState(id, current => {
        const logical = current.generatedFiles[fileId];
        if (!logical?.deleting) throw issue('The publication deletion marker changed', 409, 'permission_error');
        const remaining = Object.values(current.files).filter(row => row.generated?.fileId === fileId);
        if (remaining.length !== rows.length || remaining.some(row => !rows.some(before => before.fileId === row.fileId && before.namespace === row.namespace && before.storageName === row.storageName))) throw issue('The publication versions changed during deletion', 409, 'permission_error');
        for (const row of remaining) delete current.files[row.fileId];
        delete current.generatedFiles[fileId];
        for (const [key, op] of Object.entries(current.publicationOps)) if (op.fileId === fileId) current.publicationOps[key] = { ...op, phase: 'deleted', cancelRequested: true, cleanupPending: false };
      }, { signal });
      note('generated-publication-deleted', { fileId, versions: rows.length });
      return { deleted: true, fileId };
    });
  }

  /** Explicit save of one actual owned workspace file, not an artifact/log scan. */
  async function publishGeneratedFile(value, { signal } = {}) {
    if (!sharedLocksAvailable()) throw issue('Shared browser storage locks are unavailable; generated files were not published', 503, 'publication_lock_unavailable');
    if (typeof getOwnedSourceWorkspace !== 'function') throw issue('The owned source-workspace provider is unavailable', 503, 'publication_source_unavailable');
    const id = owner(), spec = publicationSpec(value);
    const operationKey = await hash(new TextEncoder().encode(spec.requestId));
    cancellation(signal); assertOwner(id);
    const intentHash = await hash(new TextEncoder().encode(JSON.stringify(spec)));
    cancellation(signal); assertOwner(id);
    return withSharedLock('chatgpt-local-files:' + encodeURIComponent(id) + ':publication:' + operationKey, signal, async () => {
      let admitted = false, committed = false, controller;
      try {
        assertOwner(id); cancellation(signal);
        let current = state(id), previous = current.publicationOps[operationKey];
        if (previous && previous.intentHash !== intentHash) throw issue('A publication operation ID cannot be reused with different arguments', 409, 'publication_request_changed');
        if (previous?.phase === 'deleted') throw issue('This publication operation belongs to a permanently deleted file', 410, 'publication_deleted');
        if (previous?.phase === 'committed') return publicationReceipt(id, operationKey);
        admitted = previous?.phase === 'staging';
        if (previous?.phase === 'cleanup_pending') { await cleanPublicationStage(id, operationKey); previous = state(id).publicationOps[operationKey]; }
        cancellation(signal); assertOwner(id);
        publicationTarget(state(id), spec, previous);
        const context = await ownedPublicationSource(id, spec, signal);
        let bytes, sourceSHA256;
        if (previous?.phase === 'staging') {
          admitted = true;
          const existing = state(id).files[previous.rawFileId];
          try { bytes = bytesOf(await storage.read(storageKey(existing))); }
          catch (cause) { if (!notFound(cause)) throw issue('The staged publication bytes could not be recovered', 503, 'local_storage_unavailable'); }
          publicationStop(id, operationKey, signal);
          if (bytes && (bytes.length !== previous.size || await hash(bytes) !== previous.sourceSHA256)) throw issue('The staged publication bytes failed SHA-256 recovery', 409, 'file_corrupted');
          publicationStop(id, operationKey, signal);
        }
        if (!bytes) {
          try { bytes = bytesOf(await storage.read(context.key)); }
          catch (cause) { throw issue(notFound(cause) ? 'The exact source workspace file was not found' : 'The source workspace file could not be read', notFound(cause) ? 404 : 503, notFound(cause) ? 'file_not_found' : 'local_storage_unavailable'); }
          cancellation(signal); assertOwner(id);
          if (!bytes || !bytes.length) throw issue('The generated source file is empty', 400, 'file_zero_bytes');
          if (bytes.length > maxFileBytes) throw issue('The generated file exceeds the local file-size limit', 413, 'file_too_large');
        }
        bytes = bytes.slice(); sourceSHA256 = await hash(bytes);
        cancellation(signal); assertOwner(id);
        if (spec.expectedSourceSHA256 && spec.expectedSourceSHA256 !== sourceSHA256 || previous && previous.sourceSHA256 !== sourceSHA256) throw issue('The source bytes differ from this operation snapshot', 409, 'publication_source_changed');
        if (!previous || previous.phase === 'failed') {
          const kind = kindOf(spec.fileName, spec.mimeType), documentFormat = kind === 'document' ? documentFormatOf(spec.fileName, spec.mimeType) : null;
          if (kind === 'unknown') throw issue('This generated file format has no connected local validator', 415, 'unhandled_mime_type');
          if (typeof readStorageEstimate === 'function') {
            const estimate = await readStorageEstimate(); cancellation(signal); assertOwner(id);
            if (Number.isFinite(estimate?.quota) && Number.isFinite(estimate?.usage) && estimate.quota - estimate.usage < bytes.length) throw issue('The browser reports insufficient storage for the new immutable revision', 507, 'over_user_quota');
          }
          const rawSuffix = randomHex(uuid), logicalSuffix = spec.fileId || previous ? null : randomHex(uuid);
          if (!TICKET.test(rawSuffix) || logicalSuffix !== null && !TICKET.test(logicalSuffix)) throw issue('A secure publication ID could not be allocated', 500, 'local_storage_unavailable');
          const rawFileId = LOCAL_FILE_PREFIX + rawSuffix, fileId = spec.fileId ?? previous?.fileId ?? LOCAL_FILE_PREFIX + logicalSuffix;
          const namespace = prefix('publication-' + rawSuffix);
          const imageExtension = /image\/png/i.test(spec.mimeType) || /\.png$/i.test(spec.fileName) ? 'png' : /image\/jpeg/i.test(spec.mimeType) || /\.jpe?g$/i.test(spec.fileName) ? 'jpg' : /image\/webp/i.test(spec.mimeType) || /\.webp$/i.test(spec.fileName) ? 'webp' : 'bin';
          previous = await mutateState(id, state => {
            const found = state.publicationOps[operationKey];
            if (found && (found.intentHash !== intentHash || found.phase !== 'failed')) throw issue('Publication operation state changed before admission', 409, 'publication_conflict');
            if (!found && Object.keys(state.publicationOps).length >= MAX_PUBLICATION_OPERATIONS) throw issue('The durable publication journal is full', 507, 'over_user_quota');
            const target = publicationTarget(state, spec, found ?? previous);
            if (usedBytes(state.files) + bytes.length > maxTotalBytes) throw issue('The account file quota cannot hold the old and new revisions together', 507, 'over_user_quota');
            if (fileId === rawFileId || state.files[rawFileId] || state.generatedFiles[rawFileId] || !target && (state.files[fileId] || state.generatedFiles[fileId])) throw issue('A publication ID is already used', 409, 'publication_conflict');
            const revision = target ? target.revision + 1 : 1, createdAt = now();
            const op = { owner: id, operationId: spec.requestId, intentHash, sourceSHA256, fileId, rawFileId, revision, size: bytes.length, phase: 'staging', createdAt, sourceThreadId: spec.threadId, sourcePath: spec.path, isCreate: spec.fileId === null, previousRawFileId: target?.rawFileId ?? null, expectedRevision: spec.expectedRevision, expectedRawFileId: spec.expectedRawFileId };
            state.files[rawFileId] = { fileId: rawFileId, owner: id, generated: { fileId, revision, operationKey }, namespace, storageName: kind === 'document' ? 'document.' + documentFormat : kind === 'image' ? 'image.' + imageExtension : 'payload.txt', fileName: spec.fileName, mimeType: spec.mimeType || (kind === 'text' ? 'text/plain' : 'application/octet-stream'), kind, ...(documentFormat ? { documentFormat } : {}), size: bytes.length, status: 'pending', createdAt };
            state.publicationOps[operationKey] = op;
            return op;
          }, { signal });
          admitted = true;
        }
        publicationStop(id, operationKey, signal);
        controller = new AbortController();
        const abort = () => controller.abort(signal?.reason);
        signal?.addEventListener('abort', abort, { once: true });
        try {
          const row = state(id).files[previous.rawFileId];
          active.set(row.fileId, controller);
          const stop = () => { controller.signal.throwIfAborted(); return publicationStop(id, operationKey, signal); };
          stop();
          if (row.status === 'pending') {
            try { await storage.write(storageKey(row), bytes); }
            catch { throw issue('The immutable generated bytes could not be persisted', 507, 'local_storage_write_failed'); }
            stop();
            let verified;
            try { verified = bytesOf(await storage.read(storageKey(row))); }
            catch { throw issue('The generated bytes could not be verified after writing', 503, 'local_storage_unavailable'); }
            stop();
            if (!verified || verified.length !== bytes.length || await hash(verified) !== sourceSHA256) throw issue('The generated byte readback failed SHA-256 verification', 409, 'file_corrupted');
            stop();
            await update(id, row.fileId, prior => ({ ...prior, status: 'stored', sha256: sourceSHA256, storedAt: now() }), { signal: controller.signal });
          } else {
            const saved = await readBytes(id, row, controller.signal);
            if (await hash(saved) !== sourceSHA256) throw issue('The recovered version differs from its operation snapshot', 409, 'file_corrupted');
          }
          stop();
          const prepared = await processFile(previous.rawFileId, controller.signal);
          stop();
          await ownedPublicationSource(id, spec, controller.signal);
          stop();
          const receipt = await mutateState(id, state => {
            const op = state.publicationOps[operationKey], raw = state.files[previous.rawFileId], target = publicationTarget(state, spec, op);
            if (!op || op.phase !== 'staging' || op.cancelRequested || raw?.status !== 'ready' || raw.sha256 !== sourceSHA256 || raw.generated?.operationKey !== operationKey) throw issue('The prepared publication changed before its atomic commit', 409, 'publication_conflict');
            if (usedBytes(state.files) > maxTotalBytes) throw issue('Concurrent storage reservations filled the account quota', 507, 'over_user_quota');
            const updatedAt = now(), createdAt = target?.createdAt ?? updatedAt;
            const result = { committed: true, operationId: spec.requestId, fileId: op.fileId, rawFileId: op.rawFileId, revision: op.revision, sha256: raw.sha256, fileName: raw.fileName, mimeType: raw.mimeType, size: raw.size, kind: raw.kind, created: op.isCreate, updated: !op.isCreate, createdAt, updatedAt, publication: { origin: 'generated', revision: op.revision, updatedAt } };
            state.generatedFiles[op.fileId] = { fileId: op.fileId, rawFileId: op.rawFileId, revision: op.revision, createdAt, updatedAt };
            state.publicationOps[operationKey] = { ...op, phase: 'committed', receipt: result };
            return result;
          }, { signal: controller.signal });
          committed = true; assertOwner(id);
          note('generated-publication-committed', { fileId: receipt.fileId, rawFileId: receipt.rawFileId, revision: receipt.revision, bytes: receipt.size });
          return { ...receipt, currentRevision: receipt.revision, superseded: false };
        } finally {
          signal?.removeEventListener('abort', abort);
          if (previous) active.delete(previous.rawFileId);
        }
      } catch (cause) {
        // A storage host may lose an acknowledgement after an atomic commit.
        // Re-read before cleanup: never delete bytes that actually committed.
        if (getAccountId() === id) {
          let saved;
          try { saved = state(id).publicationOps[operationKey]; } catch {}
          if (saved?.phase === 'committed' && saved.intentHash === intentHash) return publicationReceipt(id, operationKey);
          if (saved?.intentHash === intentHash && ['staging','cleanup_pending'].includes(saved.phase)) admitted = true;
          if (admitted && !committed) {
            try { await cleanPublicationStage(id, operationKey, { failedCode: cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code }); cause.cleanupPending = false; }
            catch { try { cause.cleanupPending = true; } catch {} }
          }
        }
        throw cause;
      }
    });
  }

  async function handle(request, canonicalPath) {
    const incoming = new URL(request.url), path = (canonicalPath ?? incoming.pathname).replace(/^\/(?:backend-api|__codex-api)(?=\/)/, '');
    const method = request.method.toUpperCase();
    const ownedFile = /\/(?:files\/download|files)\/(file_local_[0-9a-f]{32})(?:\/uploaded)?$/.exec(path);
    const relevant = path === '/files' || path === '/files/process_upload_stream' || path.startsWith('/files/local-upload/') || path.endsWith('/estuary/upload_content_bytes') || ownedFile;
    if (!relevant) return null;
    try {
      cancellation(request.signal);
      if (path === '/files' && method === 'POST') {
        let body; try { body = await request.json(); } catch { throw issue('A valid file-creation JSON body is required'); }
        return response(await create(body, request, path));
      }
      if (path.startsWith('/files/local-upload/') && method === 'PUT' || path.endsWith('/estuary/upload_content_bytes') && method === 'POST') {
        const row = await acceptBytes(request, path);
        return response({ status: 'success', file_id: row.fileId, adapter_source: LOCAL_FILES_SOURCE });
      }
      if (path === '/files/process_upload_stream' && method === 'POST') {
        const body = await request.json();
        if (!object(body) || !FILE_ID.test(body.file_id ?? '')) throw issue('A valid local file ID is required');
        const ready = await processFile(body.file_id, request.signal);
        const extra = { mime_type: ready.mimeType, library_persistence_result: 'temporary', library_persistence_reason: 'site_local_raw_storage', raw_file_fallback_available: true };
        const events = [
          { event: 'file.processing.file_ready', file_id: ready.fileId, progress: 100, extra },
          { event: 'file.processing.completed', file_id: ready.fileId, progress: 100, extra },
        ];
        const encoded = new TextEncoder().encode(events.map(event => JSON.stringify(event) + '\n').join(''));
        return new Response(encoded, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
      }
      if (ownedFile) {
        const fileId = ownedFile[1];
        if (path.endsWith('/uploaded') && method === 'POST') {
          const ready = await processFile(fileId, request.signal);
          return response({ status: 'success', file_id: fileId, mime_type: ready.mimeType, size_bytes: ready.size, sha256: ready.sha256, adapter_source: LOCAL_FILES_SOURCE });
        }
        if (path.startsWith('/files/download/') && method === 'GET') {
          const { record } = await readFile(fileId, { signal: request.signal });
          if (record.generated) throw issue('Generated revisions require the owner-validated Library resource resolver', 501, 'publication_resource_unavailable');
          return response({ status: 'success', download_url: downloadURL(record), adapter_source: LOCAL_FILES_SOURCE });
        }
      }
      return response({ detail: 'Method Not Allowed' }, 405, { Allow: path === '/files' ? 'POST' : 'GET, POST, PUT' });
    } catch (cause) { note('request-error', { path, code: cause?.code ?? cause?.name ?? 'error', status: cause?.status ?? 500 }); return failure(cause); }
  }
  /** Wrap original GDNt WebFetch.upload only when ownsUploadURL(url) is true. */
  async function upload(method, url, { body, headers, signal, onUploadProgress } = {}) {
    if (!ownsUploadURL(url)) throw issue('This upload target was not allocated to the current local account', 403, 'permission_error');
    const request = new Request(url, { method, body, headers, signal });
    const path = new URL(url).pathname;
    const canonical = path.endsWith('/estuary/upload_content_bytes') ? '/estuary/upload_content_bytes' : '/files/local-upload/' + path.split('/').at(-1);
    const result = await handle(request, canonical);
    if (!result?.ok) {
      const data = await result.json();
      throw issue(data.detail?.message ?? 'Local upload failed', result.status, data.error_code);
    }
    const id = owner(), target = new URL(url), token = target.pathname.endsWith('/estuary/upload_content_bytes') ? ticketFromURL(target.searchParams.get('upload_url')) : target.pathname.split('/').at(-1);
    const row = findTicket(id, token);
    onUploadProgress?.({ loaded: row.size, total: row.size });
  }
  async function materializeForThread(fileIds, { threadId, signal } = {}) {
    if (typeof threadId !== 'string' || !threadId) throw issue('A real thread workspace is required', 400);
    const id = owner(), targetPrefix = prefix(threadId), result = [], created = [];
    async function place(relative, bytes, digest) {
      const destination = targetPrefix + '/' + workspacePath(relative);
      let previous;
      try { previous = bytesOf(await storage.read(destination)); } catch (cause) { if (!notFound(cause)) throw issue('The thread attachment destination could not be read', 503, 'local_storage_unavailable'); }
      if (previous && await hash(previous) !== digest) throw issue('A different file already exists at the requested thread attachment path', 409, 'file_rejected');
      if (!previous) {
        created.push(destination);
        try { await storage.write(destination, bytes); } catch { throw issue('The attachment could not be persisted in this thread workspace', 507, 'local_storage_write_failed'); }
      }
      cancellation(signal); assertOwner(id);
      let verified;
      try { verified = bytesOf(await storage.read(destination)); } catch { throw issue('The materialized attachment could not be read back', 503, 'local_storage_unavailable'); }
      if (!verified || verified.length !== bytes.length || await hash(verified) !== digest) throw issue('The materialized attachment failed SHA-256 verification', 409, 'file_corrupted');
      return { path: '/mnt/data/' + relative, storageKey: destination };
    }
    try {
      for (const fileId of [...new Set(fileIds)]) {
        const { record, bytes } = await readFile(fileId, { signal });
        if (record.status !== 'ready') throw issue('The attachment has not completed processing', 409, 'file_content_not_found');
        const relative = workspacePath('attachments/' + fileId + '/' + (record.kind === 'document' ? 'raw/' : '') + record.fileName);
        const original = await place(relative, bytes, record.sha256);
        const file = { id: fileId, name: record.fileName, mimeType: record.mimeType, size: record.size, sha256: record.sha256, ...original, kind: record.kind };
        if (record.kind === 'document') {
          const textBytes = await readDocumentText(id, record, signal);
          const text = await place('attachments/' + fileId + '/text/extracted.txt', textBytes, record.extraction.textSHA256);
          Object.assign(file, { rawPath: original.path, textPath: text.path, textStorageKey: text.storageKey, extraction: copy(record.extraction), documentFormat: record.documentFormat });
        }
        result.push(file);
      }
      return result;
    } catch (cause) {
      for (const destination of created.reverse()) try { await storage.remove(destination); } catch { note('materialization-cleanup-error'); }
      throw cause;
    }
  }
  async function resolveUserInputImage(item, { threadId, signal } = {}) {
    const id = owner(); cancellation(signal);
    let bytes, record;
    if (item?.type === 'localImage') {
      const relative = workspacePath(item.path);
      if (typeof threadId !== 'string' || !threadId) throw issue('A local image requires its actual thread workspace');
      try { bytes = bytesOf(await storage.read(prefix(threadId) + '/' + relative)); } catch { throw issue('The local image file was not found in this thread', 404, 'file_not_found'); }
    } else if (item?.type === 'image') {
      const pointer = item.fileId ?? (typeof item.url === 'string' ? /^(?:file-service|sediment):\/\/(.+)$/.exec(item.url)?.[1] : null);
      if (pointer) ({ bytes, record } = await readFile(pointer, { signal }));
      else if (typeof item.url === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(item.url)) {
        if (item.url.length - item.url.indexOf(',') - 1 > 4 * Math.ceil(maxFileBytes / 3)) throw issue('The inline image exceeds this local provider upload limit', 413, 'file_too_large');
        try { bytes = Uint8Array.from(atob(item.url.slice(item.url.indexOf(',') + 1)), character => character.charCodeAt(0)); } catch { throw issue('Malformed inline image', 415, 'file_corrupted'); }
      } else throw issue('Remote image URL fetching is not connected to this local provider', 422, 'unsupported_image_source');
    } else throw issue('An original image or localImage input is required');
    cancellation(signal); assertOwner(id);
    if (!bytes || bytes.length > maxFileBytes) throw issue('Image bytes are missing or too large', 413, 'file_too_large');
    const originalInfo = imageInfo(bytes);
    const resized = await compressImageInput(bytes, originalInfo, { signal });
    cancellation(signal); assertOwner(id);
    const info = imageInfo(resized.bytes); bytes = resized.bytes;
    return { input: { type: 'image', url: 'data:' + info.mimeType + ';base64,' + base64(bytes) }, ...info, size: bytes.length, sha256: resized.compressed ? await hash(bytes) : record?.sha256 ?? await hash(bytes), compressed: resized.compressed, ...(record ? { fileId: record.fileId } : {}) };
  }
  async function resolveChatAttachments(messages, { threadId, signal } = {}) {
    if (!Array.isArray(messages)) throw issue('Original Chat messages are required');
    const inputs = [], ids = new Set(), attachments = [], preparedImages = new Map();
    for (const message of messages) {
      if (message?.author?.role !== 'user') continue;
      for (const attachment of message.metadata?.attachments ?? []) {
        if (!object(attachment) || typeof attachment.id !== 'string') throw issue('Invalid original attachment metadata');
        ids.add(attachment.id); attachments.push(copy(attachment));
      }
      for (const part of message.content?.parts ?? []) {
        if (typeof part === 'string') inputs.push({ type: 'text', text: part, text_elements: [] });
        else if (part?.content_type === 'image_asset_pointer') {
          const pointer = /^(?:file-service|sediment):\/\/(.+)$/.exec(part.asset_pointer ?? '')?.[1];
          if (!pointer) throw issue('Invalid original image asset pointer', 422, 'unsupported_image_source');
          ids.add(pointer);
          if (!preparedImages.has(pointer)) preparedImages.set(pointer, await resolveUserInputImage({ type: 'image', fileId: pointer }, { threadId, signal }));
          inputs.push(preparedImages.get(pointer).input);
        } else throw issue('This original media input format is not supported locally', 422, 'unsupported_media_input');
      }
    }
    const files = ids.size ? await materializeForThread([...ids], { threadId, signal }) : [], textFiles = [];
    for (const file of files) {
      if (file.kind === 'text') {
        const { bytes } = await readFile(file.id, { signal });
        const decoded = decodeText(bytes);
        textFiles.push({ id: file.id, name: file.name, path: file.path, text: decoded.text, encoding: decoded.encoding, truncated: false });
      } else if (file.kind === 'document') {
        const { record } = await readFile(file.id, { signal });
        const textBytes = await readDocumentText(owner(), record, signal), decoded = decodeText(textBytes);
        textFiles.push({ id: file.id, name: file.name, path: file.textPath, rawPath: file.rawPath, text: decoded.text, encoding: 'utf-8', truncated: record.extraction.truncated, partial: record.extraction.partial, extraction: copy(record.extraction) });
      }
    }
    const images = [...preparedImages.values()].map(({ fileId, mimeType, width, height, size, sha256 }) => ({ fileId, mimeType, width, height, size, sha256 }));
    return { input: inputs, files, textFiles, images, attachments, adapter_source: LOCAL_FILES_SOURCE };
  }

  // Internal presentation provenance only. These descriptions never issue a
  // resource or assert current physical bytes; existing download checks remain.
  const publicationDescriptions = new WeakMap();
  let descriptionOwner = null, descriptionEpoch = 0;
  function publicationDescriptionOwner() {
    let id;
    try { id = owner(); }
    catch (cause) { if (descriptionOwner !== null) descriptionEpoch++; descriptionOwner = null; throw cause; }
    if (id !== descriptionOwner) { descriptionOwner = id; descriptionEpoch++; }
    return { id, epoch: descriptionEpoch };
  }
  function publicationReceiptTuple(value) {
    const required = ['committed','operationId','fileId','rawFileId','revision','sha256','size','fileName','mimeType','publication'];
    const optional = ['kind','created','updated','createdAt','updatedAt','currentRevision','superseded'];
    const invalid = () => { throw issue('A strict normalized committed publication receipt is required', 400, 'publication_source_receipt_invalid'); };
    if (!object(value) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) invalid();
    const tuple = {};
    for (const key of required) { const descriptor = Object.getOwnPropertyDescriptor(value, key); if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid(); tuple[key] = descriptor.value; }
    const publication = tuple.publication, checked = {};
    if (!object(publication) || Object.keys(publication).some(key => !['origin','revision','updatedAt'].includes(key))) invalid();
    for (const key of ['origin','revision','updatedAt']) { const descriptor = Object.getOwnPropertyDescriptor(publication, key); if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid(); checked[key] = descriptor.value; }
    if (tuple.committed !== true || !/^tool_[0-9a-f]{64}$/.test(tuple.operationId ?? '') || !FILE_ID.test(tuple.fileId ?? '') || !FILE_ID.test(tuple.rawFileId ?? '') || tuple.fileId === tuple.rawFileId || !Number.isSafeInteger(tuple.revision) || tuple.revision < 1 || !SHA256.test(tuple.sha256 ?? '') || !Number.isSafeInteger(tuple.size) || tuple.size < 1 || typeof tuple.fileName !== 'string' || !tuple.fileName.trim() || typeof tuple.mimeType !== 'string' || !tuple.mimeType.trim() || checked.origin !== 'generated' || checked.revision !== tuple.revision || !Number.isSafeInteger(checked.updatedAt) || checked.updatedAt < 0) invalid();
    tuple.publication = checked; return tuple;
  }
  function capturePublicationDescription(tuple, expectedOwner) {
    const account = publicationDescriptionOwner(), id = account.id;
    if (expectedOwner && (expectedOwner.id !== id || expectedOwner.epoch !== account.epoch)) throw issue('The provenance account changed', 409, 'publication_source_changed');
    const current = state(id); assertOwner(id);
    const matches = Object.entries(current.publicationOps).filter(([, op]) => op.operationId === tuple.operationId);
    if (matches.length !== 1) throw issue('A unique owned publication operation was not found', matches.length ? 409 : 404, 'publication_source_unavailable');
    const [operationKey, op] = matches[0], raw = current.files[tuple.rawFileId], logical = current.generatedFiles[tuple.fileId];
    if (op.phase !== 'committed' || op.cancelRequested === true || !logical || logical.deleting) throw issue('The publication is not currently available', 410, 'publication_source_unavailable');
    if (!raw || raw.status !== 'ready' || raw.owner !== id || raw.fileId !== tuple.rawFileId || raw.generated?.operationKey !== operationKey || raw.generated?.fileId !== tuple.fileId || raw.generated?.revision !== tuple.revision || logical.fileId !== tuple.fileId || logical.revision < tuple.revision || op.owner !== id || op.fileId !== tuple.fileId || op.rawFileId !== tuple.rawFileId || op.revision !== tuple.revision || op.sourceSHA256 !== tuple.sha256 || raw.sha256 !== tuple.sha256 || op.size !== tuple.size || raw.size !== tuple.size || raw.fileName !== tuple.fileName || raw.mimeType !== tuple.mimeType) throw issue('The publication provenance tuple does not match its actual version', 409, 'publication_source_mismatch');
    for (const key of ['committed','operationId','fileId','rawFileId','revision','sha256','size','fileName','mimeType']) if (op.receipt?.[key] !== tuple[key]) throw issue('The stored receipt no longer matches the publication', 409, 'publication_source_mismatch');
    for (const key of ['origin','revision','updatedAt']) if (op.receipt?.publication?.[key] !== tuple.publication[key]) throw issue('The stored receipt publication revision changed', 409, 'publication_source_mismatch');
    let sourcePath;
    try { sourcePath = workspacePath(op.sourcePath); } catch { throw issue('The stored source path is unavailable', 409, 'publication_source_metadata_invalid'); }
    if (typeof op.sourceThreadId !== 'string' || !op.sourceThreadId || op.sourceThreadId.length > 256 || /[\u0000-\u001f\u007f]/u.test(op.sourceThreadId) || typeof op.sourcePath !== 'string' || !op.sourcePath || op.sourcePath.length > 2048 || sourcePath !== op.sourcePath || /[\\\u0000-\u001f\u007f]/u.test(sourcePath)) throw issue('The stored source provenance is invalid', 409, 'publication_source_metadata_invalid');
    const description = { owner: id, operationId: tuple.operationId, fileId: tuple.fileId, rawFileId: tuple.rawFileId, revision: tuple.revision, sourceThreadId: op.sourceThreadId, sourcePath, sourceSHA256: op.sourceSHA256, size: op.size, bytesVerified: false };
    const signature = JSON.stringify([description, operationKey, raw.fileName, raw.mimeType, tuple.publication]);
    const after = publicationDescriptionOwner();
    if (after.id !== id || after.epoch !== account.epoch) throw issue('The provenance account changed during metadata access', 409, 'publication_source_changed');
    assertOwner(id); return { account, signature, description };
  }
  function describePublicationSource(receipt) {
    const tuple = publicationReceiptTuple(receipt), captured = capturePublicationDescription(tuple);
    const description = Object.freeze(captured.description);
    publicationDescriptions.set(description, { tuple, account: captured.account, signature: captured.signature }); return description;
  }
  function isPublicationSourceCurrent(description) {
    const saved = object(description) ? publicationDescriptions.get(description) : null;
    if (!saved) return false;
    try { const current = capturePublicationDescription(saved.tuple, saved.account); if (current.signature === saved.signature) return true; }
    catch { /* Not a byte grant; failed metadata/owner checks revoke this description. */ }
    publicationDescriptions.delete(description); return false;
  }

  return Object.freeze({ describePublicationSource, isPublicationSourceCurrent, handle, upload, publishGeneratedFile, isLocalUploadURL, ownsUploadURL, readFile, cancelUpload, listFiles, permanentDeleteFile, materializeForThread, resolveUserInputImage, resolveChatAttachments, source: Object.freeze({ provider: LOCAL_FILES_SOURCE, capturedAccountFiles: false, pdfParsing: true, docxParsing: true, xlsxParsing: true, pptxParsing: true, legacyOfficeParsing: false, documentScope: 'PDF text layer / DOCX body / XLSX saved cells and caches / PPTX slide text; no OCR, spreadsheet calculation or external refresh', maxFileBytes, maxTotalBytes }) });
}
