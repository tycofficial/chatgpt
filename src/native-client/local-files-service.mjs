/**
 * Real origin-local file storage behind the original PYGO/LulU contracts.
 * Original UI and event pipeline remain unchanged; no Azure/cookie/private API.
 * POST /files -> upload URL -> actual bytes -> process NDJSON/uploaded.
 */
import { workspacePath } from './browser-tool-executor.mjs';
import { createLocalDocumentExtractor } from './local-document-extraction.mjs';
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
function documentFormatOf(name, mime = '') {
  const extension = name.split('.').at(-1).toLowerCase(), type = mime.split(';')[0].trim().toLowerCase();
  if (extension === 'pdf' || type === 'application/pdf' || type === 'application/x-pdf') return 'pdf';
  if (extension === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  return null;
}
function kindOf(name, mime = '') {
  const extension = name.split('.').at(-1).toLowerCase(), type = mime.split(';')[0].trim().toLowerCase();
  if (['doc', 'docm', 'ppt', 'pptx', 'pptm', 'xls', 'xlsx', 'xlsm', 'odt', 'ods', 'odp'].includes(extension)) throw issue('Excel, PowerPoint and legacy Office text extraction are not connected', 415, 'unhandled_mime_type');
  if (documentFormatOf(name, mime)) return 'document';
  if (/(?:officedocument|msword|ms-excel|ms-powerpoint)/.test(type)) throw issue('Only PDF and DOCX document text extraction is connected; Excel, PowerPoint and legacy Office are unsupported', 415, 'unhandled_mime_type');
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
    if (raw == null) return { version: 1, files: {} };
    let result;
    try { result = JSON.parse(raw); } catch { throw issue('Local file metadata is damaged; existing bytes were preserved', 500, 'file_corrupted'); }
    if (!object(result) || result.version !== 1 || !object(result.files) || Object.entries(result.files).some(([key, row]) => !FILE_ID.test(key) || row?.fileId !== key || row.owner !== id || !TICKET.test(row.ticket) || !Number.isSafeInteger(row.size) || row.size < 1 || typeof row.namespace !== 'string' || !row.namespace || row.namespace === '.' || row.namespace === '..' || /[/\\\u0000-\u001f]/.test(row.namespace) || !['payload.txt','image.png','image.jpg','image.webp','image.bin','document.pdf','document.docx'].includes(row.storageName) || !['pending','stored','ready','error','cancelled'].includes(row.status))) throw issue('Local file metadata has an invalid format; existing bytes were preserved', 500, 'file_corrupted');
    for (const row of Object.values(result.files)) {
      if (row.kind === 'document' && !['pdf','docx'].includes(row.documentFormat)) throw issue('The document format metadata is damaged', 500, 'file_corrupted');
      const text = row.extraction;
      if (text && (text.textStorageName !== 'extracted.txt' || !Number.isSafeInteger(text.textSize) || text.textSize < 1 || !/^[0-9a-f]{64}$/.test(text.textSHA256 ?? '') || text.sourceSHA256 !== row.sha256 || typeof text.partial !== 'boolean' || typeof text.truncated !== 'boolean')) throw issue('The document text sidecar metadata is damaged', 500, 'file_corrupted');
      if (row.kind === 'document' && row.status === 'ready' && !text) throw issue('Ready document text metadata is missing', 500, 'file_corrupted');
    }
    return result;
  }
  function save(id, value) {
    assertOwner(id);
    try { metadataStorage.setItem(stateKey(id), JSON.stringify(value)); } catch { throw issue('Local file metadata could not be saved', 507, 'local_storage_write_failed'); }
  }
  function update(id, fileId, transform) {
    const current = state(id), row = current.files[fileId];
    if (!row) throw issue('This local file was not found', 404, 'file_not_found');
    current.files[fileId] = transform(copy(row));
    save(id, current);
    return copy(current.files[fileId]);
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
  async function serialize(fileId, action) {
    const previous = locks.get(fileId) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(action);
    locks.set(fileId, current);
    try { return await current; } finally { if (locks.get(fileId) === current) locks.delete(fileId); }
  }
  async function create(body, request, path) {
    if (!object(body)) throw issue('A file-creation JSON object is required');
    const id = owner(), name = nameOf(body.file_name), size = body.file_size;
    if (!Number.isSafeInteger(size) || size < 1) throw issue('The selected file is empty', 400, 'file_zero_bytes');
    if (size > maxFileBytes) throw issue('The file exceeds this local provider upload limit', 413, 'file_too_large');
    const mime = typeof body.mime_type === 'string' ? body.mime_type : typeof body.client_resolved_mime_type === 'string' ? body.client_resolved_mime_type : '';
    const kind = kindOf(name, mime), documentFormat = kind === 'document' ? documentFormatOf(name, mime) : null;
    const current = state(id), reserved = Object.values(current.files).filter(row => row.status !== 'cancelled' && (row.status !== 'pending' || row.expiresAt > now())).reduce((sum, row) => sum + row.size + (row.extraction?.textSize ?? 0), 0);
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
    const next = state(id);
    const freshReserved = Object.values(next.files).filter(entry => entry.status !== 'cancelled' && (entry.status !== 'pending' || entry.expiresAt > now())).reduce((total, entry) => total + entry.size + (entry.extraction?.textSize ?? 0), 0);
    if (freshReserved + size > maxTotalBytes) throw issue('The configured local account file-storage quota is full', 507, 'over_user_quota');
    if (next.files[fileId]) throw issue('Duplicate local upload ID', 409);
    next.files[fileId] = row; save(id, next);
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
    return serialize(row.fileId, async () => {
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
        update(id, row.fileId, prior => {
          if (prior.status === 'cancelled') throw issue('Upload cancelled', 409, 'upload_cancelled');
          return { ...prior, status: 'stored', sha256: digest, storedAt: now() };
        });
        note('bytes-persisted', { fileId: row.fileId, bytes: bytes.length });
      } catch (cause) {
        if (signal?.aborted || controller.signal.aborted) {
          try { await storage.remove(storageKey(current)); } catch { note('cancel-cleanup-error', { fileId: row.fileId }); }
          if (getAccountId() === id) try { update(id, row.fileId, prior => ({ ...prior, status: 'cancelled' })); } catch {}
          throw new DOMException('Upload cancelled', 'AbortError');
        }
        throw cause;
      } finally {
        active.delete(row.fileId); signal?.removeEventListener('abort', abort);
      }
    });
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
    const summary = { format: result.format, parser: result.parser, scope: result.format === 'pdf' ? 'PDF text layer only' : 'DOCX body text only', ocr: false, partial: result.partial, truncated: result.truncated, reasons: result.reasons, totalPages: result.totalPages, processedPages: result.processedPages, pagesWithoutText: result.pagesWithoutText, warnings: result.warnings };
    return '[Local document text extraction]\n' + JSON.stringify(summary) + '\n' +
      (result.partial || result.truncated ? 'This extraction is partial. Unprocessed pages, omitted content or text beyond the extraction limit were not examined.\n' : '') +
      'Images and scanned text were not transcribed. The original document bytes are retained separately.\n\n' + result.text;
  }
  async function processFile(fileId, signal) {
    const id = owner();
    return serialize(fileId, async () => {
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
          const occupied = Object.values(state(id).files).filter(file => file.status !== 'cancelled' && (file.status !== 'pending' || file.expiresAt > now())).reduce((total, file) => total + file.size + (file.fileId === fileId ? 0 : file.extraction?.textSize ?? 0), 0);
          if (occupied + textBytes.length > maxTotalBytes) throw issue('The configured local document text-storage quota is full', 507, 'over_user_quota');
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
            kind: 'document', mimeType: row.documentFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extraction: { format: parsed.format, parser: parsed.parser, textStorageName: 'extracted.txt', textSize: textBytes.length, textSHA256, sourceSHA256: row.sha256, extractedCharacters: parsed.text.length, textCharacters: content.length, partial: parsed.partial, truncated: parsed.truncated, reasons: parsed.reasons, ocr: false, totalPages: parsed.totalPages, processedPages: parsed.processedPages, pagesWithoutText: parsed.pagesWithoutText, warnings: parsed.warnings },
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
        const ready = update(id, fileId, prior => {
          if (details.extraction) {
            const fresh = state(id);
            const occupied = Object.values(fresh.files).filter(file => file.status !== 'cancelled' && (file.status !== 'pending' || file.expiresAt > now())).reduce((total, file) => total + file.size + (file.fileId === fileId ? 0 : file.extraction?.textSize ?? 0), 0);
            if (occupied + details.extraction.textSize > maxTotalBytes) throw issue('Concurrent file admissions filled the configured local document quota', 507, 'over_user_quota');
          }
          return { ...prior, ...details, status: 'ready', processedAt: now(), processingError: undefined };
        });
        committed = true;
        note('processing-completed', { fileId, fileKind: ready.kind, bytes: ready.size });
        return ready;
      } catch (cause) {
        if (wroteSidecar && !committed) try { await storage.remove(row.namespace + '/extracted.txt'); } catch { note('sidecar-cleanup-error', { fileId }); }
        if (getAccountId() === id) try { update(id, fileId, prior => ({ ...prior, processingError: { code: cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code ?? 'document_parser_error', at: now() } })); } catch {}
        note('processing-error', { fileId, code: cause?.name === 'AbortError' ? 'upload_cancelled' : cause?.code ?? 'document_parser_error' });
        throw cause;
      } finally { active.delete(fileId); signal?.removeEventListener('abort', abort); }
    });
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
    update(id, fileId, prior => ({ ...prior, status: 'cancelled' }));
    active.get(fileId)?.abort(new DOMException('Upload cancelled', 'AbortError'));
    for (const key of [storageKey(row), ...(row.kind === 'document' ? [row.namespace + '/extracted.txt'] : [])]) {
      try { await storage.remove(key); } catch (cause) { if (!notFound(cause)) throw issue('The upload was cancelled but its bytes or extracted text could not be removed', 503, 'local_storage_unavailable'); }
    }
    return { cancelled: true, fileId };
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
    const info = imageInfo(bytes);
    return { input: { type: 'image', url: 'data:' + info.mimeType + ';base64,' + base64(bytes) }, ...info, size: bytes.length, sha256: record?.sha256 ?? await hash(bytes) };
  }
  async function resolveChatAttachments(messages, { threadId, signal } = {}) {
    if (!Array.isArray(messages)) throw issue('Original Chat messages are required');
    const inputs = [], ids = new Set(), attachments = [];
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
          inputs.push((await resolveUserInputImage({ type: 'image', fileId: pointer }, { threadId, signal })).input);
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
    return { input: inputs, files, textFiles, attachments, adapter_source: LOCAL_FILES_SOURCE };
  }
  return Object.freeze({ handle, upload, isLocalUploadURL, ownsUploadURL, readFile, cancelUpload, materializeForThread, resolveUserInputImage, resolveChatAttachments, source: Object.freeze({ provider: LOCAL_FILES_SOURCE, capturedAccountFiles: false, pdfParsing: true, docxParsing: true, legacyOfficeParsing: false, documentScope: 'PDF text layer / DOCX body; no OCR', maxFileBytes, maxTotalBytes }) });
}
