/** Read-only, owner/context-bound byte tickets for original bare sandbox file links.
 * These transient workspace snapshots are not Library publications or revisions.
 */
export const WORKSPACE_DOWNLOAD_SOURCE = 'browser-origin-local-workspace-download';
export const WORKSPACE_DOWNLOAD_MAX_BYTES = 20 * 1024 * 1024;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA = /^[0-9a-f]{64}$/;
const issue = (message, status = 400, code = 'WORKSPACE_DOWNLOAD_INVALID_REQUEST') => Object.assign(new Error(message), { status, code });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, name) => Object.prototype.hasOwnProperty.call(value, name);
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers } });
const hex = value => [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const digest = async bytes => hex(await crypto.subtle.digest('SHA-256', bytes));
function byteCopy(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value).slice();
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
  throw issue('The native download did not provide actual bytes.', 400, 'WORKSPACE_DOWNLOAD_INVALID_BYTES');
}
function identityKey(identity) {
  if (!object(identity) || !['accountId', 'userId'].every(key => typeof identity[key] === 'string' && identity[key].length > 0) || identity.accountUserId != null && (typeof identity.accountUserId !== 'string' || !identity.accountUserId)) return null;
  return JSON.stringify([identity.accountId, identity.userId, identity.accountUserId ?? null]);
}
function filename(value) {
  if (typeof value !== 'string' || !value || value !== value.trim() || value.length > 255 || /[/\\\u0000-\u001f\u007f]/.test(value) || ['.', '..'].includes(value)) throw issue('The download filename is invalid.');
  return value;
}
function sandboxPath(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/mnt/data/') || /[\\\u0000-\u001f\u007f]/.test(value)) throw issue('Use an explicit canonical /mnt/data file path.');
  const parts = value.slice('/mnt/data/'.length).split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) throw issue('The workspace file path is invalid.');
  return value;
}
function requestSpec(url, encodedId) {
  let conversationId;
  try { conversationId = decodeURIComponent(encodedId); } catch { throw issue('The conversation ID is invalid.'); }
  if (!ID.test(conversationId)) throw issue('The conversation ID is invalid.');
  const allowed = new Set(['message_id', 'sandbox_path', 'download_intent']);
  for (const key of url.searchParams.keys()) if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) throw issue('The workspace download query is invalid.');
  if (url.searchParams.getAll('message_id').length !== 1 || url.searchParams.getAll('sandbox_path').length !== 1) throw issue('An exact message and file path are required.');
  const messageId = url.searchParams.get('message_id');
  if (!ID.test(messageId ?? '')) throw issue('The message ID is invalid.');
  const intent = url.searchParams.get('download_intent');
  if (intent !== null && intent !== 'true' && intent !== 'false') throw issue('download_intent must be a boolean.');
  // URLSearchParams has performed its one query decode. Never decode the path again.
  return { conversationId, messageId, sandboxPath: sandboxPath(url.searchParams.get('sandbox_path')), downloadIntent: intent === 'true' };
}
function sameContext(a, b) { return ['conversationId', 'messageId', 'sandboxPath'].every(key => a[key] === b[key]); }
const sourceFields = ['conversationId', 'messageId', 'sandboxPath', 'ownerKey', 'fileName', 'mimeType', 'size', 'sha256', 'sourceToken'];
const sameSource = (a, b) => sourceFields.every(key => a[key] === b[key]);

export function createLocalWorkspaceDownloadService({
  getIdentity, resolveSource, isSourceCurrent,
  createObjectURL = blob => URL.createObjectURL(blob), revokeObjectURL = url => URL.revokeObjectURL(url),
  onDiagnostic = () => {}, deadlineMs = 10000,
} = {}) {
  if (![getIdentity, resolveSource, isSourceCurrent, createObjectURL, revokeObjectURL, onDiagnostic].every(fn => typeof fn === 'function') || !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 10000) throw new TypeError('Verified identity, owned source resolver/currentness, URL and diagnostic callbacks are required.');
  let disposed = false, lastOwner = null, generation = 0, sequence = 0, nativeBlobGrants = new WeakMap();
  const cache = new Map(), urls = new Map(), nativeURLs = new Map(), recognizedBytes = new Map(), pendingResolutions = new Map();
  const note = value => { try { onDiagnostic(value); } catch {} };
  function revoke(url) { try { revokeObjectURL(url); } catch {} }
  function clearURLs() {
    const all = new Set([...urls.keys(), ...nativeURLs.keys()]);
    cache.clear(); urls.clear(); nativeURLs.clear(); recognizedBytes.clear(); nativeBlobGrants = new WeakMap();
    for (const url of all) revoke(url);
  }
  function owner() {
    const key = identityKey(getIdentity());
    if (key !== lastOwner) { generation++; lastOwner = key; clearURLs(); abortPending(issue('The workspace download account changed.', 409, 'WORKSPACE_DOWNLOAD_ACCOUNT_CHANGED')); }
    if (disposed) throw issue('The workspace download service is closed.', 409, 'WORKSPACE_DOWNLOAD_DISPOSED');
    if (!key) throw issue('Sign in to this site before opening a workspace file.', 401, 'WORKSPACE_DOWNLOAD_AUTH_REQUIRED');
    return { key, generation };
  }
  function check(authority, signal) {
    signal?.throwIfAborted();
    const current = owner();
    if (current.key !== authority.key || current.generation !== authority.generation) throw issue('The workspace download account changed.', 409, 'WORKSPACE_DOWNLOAD_ACCOUNT_CHANGED');
  }
  function current(proof) {
    let value;
    try { value = isSourceCurrent(proof); } catch { return false; }
    // URL ownership and synchronous native URL creation cannot await a source check.
    if (value && typeof value.then === 'function') { value.catch?.(() => {}); return false; }
    return value === true;
  }
  function requireCurrent(proof) {
    if (!current(proof)) throw issue('The source conversation or file changed. Reopen its preview.', 409, 'WORKSPACE_DOWNLOAD_SOURCE_CHANGED');
  }
  function removeEntry(entry) {
    if (cache.get(entry.key) === entry) cache.delete(entry.key);
    if (urls.get(entry.url) === entry) urls.delete(entry.url);
    const values = [entry.url];
    for (const [url, grant] of nativeURLs) if (grant.entry === entry) { nativeURLs.delete(url); values.push(url); }
    for (const url of values) revoke(url);
  }
  function entryCurrent(entry) {
    if (!entry || cache.get(entry.key) !== entry || !sameSource(entry.proof, entry.source) || !current(entry.proof)) return false;
    const authority = owner();
    return entry.authority.key === authority.key && entry.authority.generation === authority.generation;
  }
  async function verifiedProof(proof, spec, authority, signal) {
    check(authority, signal);
    if (!object(proof) || !sameContext(proof, spec) || proof.ownerKey !== authority.key || !ArrayBuffer.isView(proof.bytes) || Object.prototype.toString.call(proof.bytes) !== '[object Uint8Array]' || !Number.isSafeInteger(proof.size) || proof.size < 0 || proof.size > WORKSPACE_DOWNLOAD_MAX_BYTES || proof.bytes.byteLength !== proof.size || !SHA.test(proof.sha256 ?? '') || typeof proof.sourceToken !== 'string' || !proof.sourceToken || proof.sourceToken.length > 512 || /[\u0000-\u001f\u007f]/.test(proof.sourceToken) || typeof proof.mimeType !== 'string' || !proof.mimeType || proof.mimeType.length > 255 || /[\u0000-\u001f\u007f]/.test(proof.mimeType)) throw issue('The resolver did not return an exact owned byte proof.', 409, 'WORKSPACE_DOWNLOAD_PROOF_INVALID');
    filename(proof.fileName); sandboxPath(proof.sandboxPath); requireCurrent(proof);
    const bytes = byteCopy(proof.bytes), source = Object.fromEntries(sourceFields.map(key => [key, proof[key]]));
    const actual = await digest(bytes); check(authority, signal); requireCurrent(proof);
    if (!sameSource(proof, source) || actual !== source.sha256) throw issue('The actual workspace bytes do not match their source proof.', 409, 'WORKSPACE_DOWNLOAD_BYTES_CHANGED');
    return { proof, source, bytes };
  }
  function abortPending(error) { for (const cancel of [...pendingResolutions.values()]) cancel(error); }
  function resolveBeforeDeadline(spec, signal) {
    const controller = new AbortController();
    return new Promise((accept, reject) => {
      let done = false, timer;
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancelled); pendingResolutions.delete(controller); };
      const complete = (callback, value) => { if (done) return; done = true; cleanup(); callback(value); };
      const cancel = error => { if (done) return; done = true; cleanup(); controller.abort(error); reject(error); };
      const cancelled = () => cancel(signal?.reason?.name === 'AbortError' ? signal.reason : new DOMException('Workspace file request cancelled.', 'AbortError'));
      pendingResolutions.set(controller, cancel);
      timer = setTimeout(() => cancel(issue('The local workspace file read timed out. Retry when storage is available.', 503, 'WORKSPACE_DOWNLOAD_TIMEOUT')), deadlineMs);
      signal?.addEventListener('abort', cancelled, { once: true });
      if (signal?.aborted) cancelled();
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return resolveSource({ conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath, signal: controller.signal });
      }).then(value => complete(accept, value), error => complete(reject, error));
    });
  }
  async function resolve(spec, authority, signal) {
    check(authority, signal);
    const proof = await resolveBeforeDeadline(spec, signal);
    return verifiedProof(proof, spec, authority, signal);
  }
  function cacheKey(source) { return JSON.stringify(sourceFields.map(key => source[key])); }
  function byteKey(ownerKey, sha256, size) { return JSON.stringify([ownerKey, sha256, size]); }
  async function resource(spec, signal) {
    const authority = owner();
    let verified;
    try { verified = await resolve(spec, authority, signal); }
    catch (error) { for (const entry of [...cache.values()]) if (entry.source.ownerKey === authority.key && sameContext(entry.source, spec)) removeEntry(entry); throw error; }
    check(authority, signal); requireCurrent(verified.proof);
    const key = cacheKey(verified.source), existing = cache.get(key);
    if (existing && entryCurrent(existing)) { existing.sequence = ++sequence; return { entry: existing, verified }; }
    if (existing) removeEntry(existing);
    // The same source context may not silently keep an earlier token/MIME snapshot.
    for (const entry of [...cache.values()]) if (entry.source.ownerKey === authority.key && sameContext(entry.source, spec) && entry.key !== key) removeEntry(entry);
    const blob = new Blob([verified.bytes], { type: verified.source.mimeType }), url = createObjectURL(blob);
    try {
      check(authority, signal); requireCurrent(verified.proof);
      if (typeof url !== 'string' || !url.startsWith('blob:') || urls.has(url) || nativeURLs.has(url)) throw issue('The byte host did not return a fresh Blob URL.', 500, 'WORKSPACE_DOWNLOAD_URL_INVALID');
      const entry = { key, authority, proof: verified.proof, source: verified.source, url, sequence: ++sequence };
      cache.set(key, entry); urls.set(url, entry);
      recognizedBytes.set(byteKey(authority.key, verified.source.sha256, verified.source.size), true);
      note({ type: 'workspace-download-issued', size: verified.source.size });
      return { entry, verified };
    } catch (error) { revoke(url); throw error; }
  }
  function ownsObjectURL(url) {
    try {
      if (typeof url !== 'string' || !url.startsWith('blob:')) return false;
      owner();
      const entry = urls.get(url) ?? nativeURLs.get(url)?.entry;
      if (!entry) return false;
      if (!entryCurrent(entry)) { removeEntry(entry); return false; }
      const grant = nativeURLs.get(url);
      if (grant && (!sameSource(grant.proof, entry.source) || !current(grant.proof))) { nativeURLs.delete(url); revoke(url); return false; }
      return true;
    } catch { return false; }
  }
  function invokeNativeDownload(entry, verified, downloadName, signal, nativeDownload) {
    if (typeof nativeDownload !== 'function') throw new TypeError('The original synchronous native download primitive is required.');
    check(entry.authority, signal); requireCurrent(entry.proof); requireCurrent(verified.proof);
    if (!entryCurrent(entry) || !sameSource(verified.source, entry.source)) {
      throw issue('The source download grant changed. Reopen the preview.', 409, 'WORKSPACE_DOWNLOAD_SOURCE_CHANGED');
    }
    const blob = new Blob([verified.bytes], { type: verified.source.mimeType });
    const grant = { entry, proof: verified.proof, used: false };
    nativeBlobGrants.set(blob, grant);
    try {
      const output = nativeDownload(blob, downloadName);
      if (output != null && typeof output.then === 'function') throw new TypeError('The original native download primitive must remain synchronous.');
    } finally { nativeBlobGrants.delete(blob); }
  }

  async function downloadSource({ conversationId, messageId, sandboxPath: path }, { signal } = {}, nativeDownload) {
    if (![conversationId, messageId].every(value => typeof value === 'string' && ID.test(value))) {
      throw issue('An exact conversation and message are required.');
    }
    const spec = { conversationId, messageId, sandboxPath: sandboxPath(path) };
    const { entry, verified } = await resource(spec, signal);
    invokeNativeDownload(entry, verified, verified.source.fileName, signal, nativeDownload);
  }

  async function downloadVerifiedBytes(value, { fileName, signal } = {}, nativeDownload) {
    if (typeof nativeDownload !== 'function') throw new TypeError('The original synchronous native download primitive is required.');
    const authority = owner(), bytes = byteCopy(value);
    if (bytes.length > WORKSPACE_DOWNLOAD_MAX_BYTES) throw issue('The file exceeds the local workspace transfer limit.', 413, 'WORKSPACE_DOWNLOAD_TOO_LARGE');
    const hash = await digest(bytes); check(authority, signal);
    let candidates = [...cache.values()].filter(entry => entry.source.ownerKey === authority.key && entry.source.size === bytes.length && entry.source.sha256 === hash);
    if (!candidates.length) {
      if (recognizedBytes.has(byteKey(authority.key, hash, bytes.length))) throw issue('These workspace bytes were issued by a source that is no longer available. Reopen the preview.', 409, 'WORKSPACE_DOWNLOAD_SOURCE_UNAVAILABLE');
      return { handled: false };
    }
    const exactName = candidates.filter(entry => entry.source.fileName === fileName);
    if (exactName.length) candidates = exactName;
    if (new Set(candidates.map(entry => entry.source.mimeType)).size > 1) throw issue('The same bytes have multiple source MIME contexts. Reopen the exact file preview.', 409, 'WORKSPACE_DOWNLOAD_AMBIGUOUS_SOURCE');
    const entry = candidates.sort((a, b) => b.sequence - a.sequence)[0];
    if (!entryCurrent(entry)) { removeEntry(entry); throw issue('The source download grant changed. Reopen the preview.', 409, 'WORKSPACE_DOWNLOAD_SOURCE_CHANGED'); }
    let verified;
    try { verified = await resolve(entry.source, authority, signal); }
    catch (error) { removeEntry(entry); throw error; }
    check(authority, signal);
    if (!sameSource(verified.source, entry.source) || verified.bytes.length !== bytes.length || verified.source.sha256 !== hash || !entryCurrent(entry)) {
      removeEntry(entry); throw issue('The workspace file version changed before Save.', 409, 'WORKSPACE_DOWNLOAD_BYTES_CHANGED');
    }
    invokeNativeDownload(entry, verified, filename(fileName ?? verified.source.fileName), signal, nativeDownload);
    return { handled: true };
  }
  // Compose with Library's same method; the innermost callback creates one URL.
  function createNativeDownloadURL(blob, createURL) {
    if (typeof createURL !== 'function') throw new TypeError('The actual URL creator is required.');
    const grant = nativeBlobGrants.get(blob);
    if (!grant) return createURL(blob);
    if (grant.used) throw issue('A native download Blob grant can create only one URL.', 409, 'WORKSPACE_DOWNLOAD_GRANT_USED');
    check(grant.entry.authority); requireCurrent(grant.proof);
    if (!entryCurrent(grant.entry)) throw issue('The native source grant changed.', 409, 'WORKSPACE_DOWNLOAD_SOURCE_CHANGED');
    const url = createURL(blob);
    try {
      check(grant.entry.authority); requireCurrent(grant.proof);
      if (!entryCurrent(grant.entry) || typeof url !== 'string' || !url.startsWith('blob:') || urls.has(url) || nativeURLs.has(url)) throw issue('The native byte URL could not be authorized.', 409, 'WORKSPACE_DOWNLOAD_URL_INVALID');
      grant.used = true; nativeURLs.set(url, grant);
      return url;
    } catch (error) { revoke(url); throw error; }
  }
  function forgetNativeDownloadURL(url) {
    nativeURLs.delete(url);
    const entry = urls.get(url);
    if (entry) {
      cache.delete(entry.key); urls.delete(url);
      for (const [derived, grant] of nativeURLs) if (grant.entry === entry) { nativeURLs.delete(derived); revoke(derived); }
    }
  }
  function dispose() { if (disposed) return; disposed = true; generation++; abortPending(issue('The workspace download service is closed.', 409, 'WORKSPACE_DOWNLOAD_DISPOSED')); clearURLs(); }
  async function handle(request, pathname) {
    const url = new URL(request.url), canonical = pathname ?? url.pathname.replace(/^\/(?:__codex-api|backend-api)(?=\/)/, ''), match = /^\/conversation\/([^/]+)\/interpreter\/download$/.exec(canonical);
    if (!match) return null;
    if (request.method !== 'GET') return json({ error: { code: 'WORKSPACE_DOWNLOAD_METHOD_NOT_ALLOWED', message: 'Only GET is supported.' } }, 405, { Allow: 'GET' });
    try {
      const spec = requestSpec(url, match[1]);
      const { entry } = await resource(spec, request.signal);
      return json({ status: 'success', download_url: entry.url });
    } catch (error) {
      const aborted = error?.name === 'AbortError', code = aborted ? 'WORKSPACE_DOWNLOAD_ABORTED' : error?.code ?? 'WORKSPACE_DOWNLOAD_ERROR';
      note({ type: 'workspace-download-failed', code });
      return json({ error: { code, message: error?.message ?? 'The local workspace file is unavailable.' } }, aborted ? 499 : error?.status ?? 500);
    }
  }
  return { handle, ownsObjectURL, downloadSource, downloadVerifiedBytes, createNativeDownloadURL, forgetNativeDownloadURL, dispose };
}
