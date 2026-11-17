/** Real, origin-local workspace and Python tools. No hosted filesystem is implied. */
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_FILE = 20 * 1024 * 1024;
const decodeWorkspaceText = bytes => bytes[0] === 0xff && bytes[1] === 0xfe
  ? new TextDecoder('utf-16le').decode(bytes)
  : bytes[0] === 0xfe && bytes[1] === 0xff ? new TextDecoder('utf-16be').decode(bytes) : decoder.decode(bytes);
const mime = name => ({ txt: 'text/plain', md: 'text/markdown', py: 'text/x-python', js: 'text/javascript', html: 'text/html', svg: 'image/svg+xml', csv: 'text/csv', json: 'application/json', png: 'image/png', pdf: 'application/pdf', zip: 'application/zip' }[name.split('.').at(-1)] || 'application/octet-stream');
const PYTHON_ARTIFACT_MANIFEST = Object.freeze({ version: 1, source: 'browser-workspace-written-files', algorithm: 'sha256', verification: 'write-readback' });
const artifactSHA256 = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
function copyArtifactBytes(value) {
  const input = value instanceof ArrayBuffer ? new Uint8Array(value) : ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT === 1 ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : Array.isArray(value) && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255) ? Uint8Array.from(value) : null;
  if (!input) throw new TypeError('Python returned a file without actual binary bytes');
  if (input.byteLength > MAX_FILE) throw Error('File exceeds the workspace 20 MB transfer limit');
  return input.slice();
}
export function workspacePath(value) {
  const raw = String(value || '').replace(/\\/g, '/').replace(/^\/mnt\/data\//, '');
  if (!raw || /^[a-z]:/i.test(raw) || raw.startsWith('/') || raw.includes('\0') || raw.split('/').some(part => part === '..' || part === '')) throw Error('Use a relative file name inside /mnt/data');
  const path = raw.split('/').filter(part => part !== '.').join('/'); if (!path) throw Error('File name must not be empty'); return path;
}
export class BrowserWorkspaceStore {
  constructor({ indexedDB = globalThis.indexedDB, navigator = globalThis.navigator } = {}) { this.indexedDB = indexedDB; this.navigator = navigator; this.database = null; }
  async root() { try { return this.navigator?.storage?.getDirectory ? await this.navigator.storage.getDirectory() : null; } catch (error) { if (['SecurityError', 'NotAllowedError', 'NotSupportedError'].includes(error.name)) return null; throw error; } }
  async db() {
    if (!this.indexedDB) throw Error('Persistent browser file storage is unavailable');
    return this.database ??= new Promise((resolve, reject) => { const r = this.indexedDB.open('chatgpt-native-workspace', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'key' }); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  }
  async directory(root, key, create = false) { const parts = key.split('/'), name = parts.pop(); for (const part of parts) root = await root.getDirectoryHandle(part, { create }); return { root, name }; }
  async write(key, bytes) {
    bytes = new Uint8Array(bytes); if (bytes.byteLength > MAX_FILE) throw Error('File exceeds the workspace 20 MB transfer limit');
    const root = await this.root();
    if (root) { const at = await this.directory(root, key, true), handle = await at.root.getFileHandle(at.name, { create: true }), out = await handle.createWritable(); try { await out.write(bytes); await out.close(); } catch (error) { await out.abort().catch(() => {}); throw error; } return; }
    const db = await this.db(); await new Promise((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put({ key, bytes, modifiedAt: Date.now() }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  }
  async read(key) {
    const root = await this.root();
    if (root) { const at = await this.directory(root, key), file = await (await at.root.getFileHandle(at.name)).getFile(); return new Uint8Array(await file.arrayBuffer()); }
    const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('files').objectStore('files').get(key); r.onsuccess = () => r.result ? resolve(new Uint8Array(r.result.bytes)) : reject(Error('File not found')); r.onerror = () => reject(r.error); });
  }
  async list(prefix) {
    const root = await this.root(), records = [];
    if (root) { let dir; try { dir = await root.getDirectoryHandle(prefix); } catch (error) { if (error.name === 'NotFoundError') return []; throw error; } const visit = async (at, path) => { for await (const [name, handle] of at.entries()) { const next = path + name; if (handle.kind === 'directory') await visit(handle, next + '/'); else { const file = await handle.getFile(); records.push({ name: next, size: file.size, modifiedAt: file.lastModified }); } } }; await visit(dir, ''); return records; }
    const db = await this.db(); return new Promise((resolve, reject) => { const r = db.transaction('files').objectStore('files').getAll(); r.onsuccess = () => resolve(r.result.filter(f => f.key.startsWith(prefix + '/')).map(f => ({ name: f.key.slice(prefix.length + 1), size: f.bytes.byteLength, modifiedAt: f.modifiedAt }))); r.onerror = () => reject(r.error); });
  }
  async remove(key) { const root = await this.root(); if (root) { const at = await this.directory(root, key); await at.root.removeEntry(at.name); return; } const db = await this.db(); await new Promise((resolve, reject) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
}
const definition = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } });
const string = { type: 'string' };
export function createBrowserToolExecutor({ PythonRuntime, PYTHON_TOOL, storage = new BrowserWorkspaceStore(), pythonOptions = {}, getWorkspaceNamespace = () => null } = {}) {
  const runtimes = new Map();
  const tools = [
    ...(PythonRuntime && PYTHON_TOOL ? [PYTHON_TOOL] : []),
    definition('create_file', 'Write a real UTF-8 file in the browser /mnt/data workspace and return its download URL. Binary documents can be produced with python.', { name: string, content: string }, ['name', 'content']),
    definition('read_file', 'Read an existing workspace text file, optionally in chunks. Use python for binary formats.', { path: string, offset: { type: 'integer', minimum: 0 }, length: { type: 'integer', minimum: 1, maximum: 50000 } }, ['path']),
    definition('list_files', 'List real files saved for this conversation in /mnt/data.', {}, []),
    definition('delete_file', 'Delete a named file from this conversation workspace.', { path: string }, ['path']),
    definition('task_status', 'Persist progress of a multi-step task. Use running while deliverables remain; complete only when finished. This does not itself execute other tools.', { status: { type: 'string', enum: ['running', 'complete'] }, summary: string }, ['status', 'summary']),
  ];
  const owner = () => { const value = getWorkspaceNamespace(); if (value == null) return null; if (typeof value !== 'string' || !/^[a-z0-9_-]{1,128}$/i.test(value)) throw Error('Invalid account workspace namespace'); return value; };
  const namespace = id => { const scope = owner(), thread = encodeURIComponent(String(id)); return scope == null ? thread : 'account-' + scope + '--' + thread; };
  const url = (threadId, path, prefix = namespace(threadId)) => { const base = globalThis.__CHATGPT_REPLICA_ENV__?.basePath || '/'; return `${base}__local_artifacts/${prefix}/${path.split('/').map(encodeURIComponent).join('/')}`; };
  const artifact = (threadId, name, size, prefix) => ({ name, path: '/mnt/data/' + name, mime: mime(name), size, url: url(threadId, name, prefix) });
  async function writePythonArtifact(threadId, name, value, prefix, signal, seen) {
    const check = () => {
      signal?.throwIfAborted();
      if (namespace(threadId) !== prefix) throw Object.assign(Error('The workspace namespace changed while recording Python artifacts'), { status: 409, code: 'LOCAL_WORKSPACE_ARTIFACT_NAMESPACE_CHANGED' });
    };
    check();
    if (seen.has(name)) throw Object.assign(Error('Python returned duplicate canonical output paths'), { status: 409, code: 'LOCAL_WORKSPACE_ARTIFACT_DUPLICATE_PATH' });
    seen.add(name);
    const bytes = copyArtifactBytes(value), key = prefix + '/' + name;
    // Preserve a private copy even if a storage adapter mutates its input.
    await storage.write(key, bytes.slice()); check();
    const sha256 = await artifactSHA256(bytes); check();
    const readback = copyArtifactBytes(await storage.read(key)); check();
    const actualSHA256 = await artifactSHA256(readback); check();
    if (readback.length !== bytes.length || actualSHA256 !== sha256) throw Object.assign(Error('The written Python artifact changed before byte-version verification'), { status: 409, code: 'LOCAL_WORKSPACE_ARTIFACT_WRITE_CHANGED' });
    return { ...artifact(threadId, name, bytes.length, prefix), sha256 };
  }
  const result = (data, isError = false) => ({ content: [{ type: 'text', text: JSON.stringify(data) }, ...(data.files || (data.file ? [data.file] : [])).map(file => ({ type: 'resource_link', uri: globalThis.location ? new URL(file.url, location.origin).href : file.url, name: file.name, mimeType: file.mime }))], structuredContent: data, isError });
  return {
    tools, storage, getWorkspacePrefix: namespace, capabilitySource: 'browser-origin-local-tools',
    async execute(call, { threadId, signal, onStatus = () => {}, onTaskStatus = () => {} }) {
      signal?.throwIfAborted(); const name = call.function.name, args = JSON.parse(call.function.arguments || '{}'), prefix = namespace(threadId);
      if (name === 'task_status') { if (!['running', 'complete'].includes(args.status)) throw Error('Invalid task status'); await onTaskStatus({ status: args.status, summary: String(args.summary || '') }); return result({ status: args.status, summary: args.summary }); }
      if (name === 'list_files') return result({ files: (await storage.list(prefix)).map(f => artifact(threadId, f.name, f.size, prefix)) });
      if (name === 'create_file' || name === 'write_file') { const path = workspacePath(args.name ?? args.path); if (typeof args.content !== 'string') throw Error('File content must be text'); const bytes = encoder.encode(args.content); await storage.write(prefix + '/' + path, bytes); return result({ file: artifact(threadId, path, bytes.length, prefix) }); }
      if (name === 'read_file') { const path = workspacePath(args.path), bytes = await storage.read(prefix + '/' + path), text = decodeWorkspaceText(bytes), offset = Math.max(0, Number(args.offset) || 0), length = Math.min(50000, Math.max(1, Number(args.length) || 30000)); return result({ path: '/mnt/data/' + path, content: text.slice(offset, offset + length), offset, totalCharacters: text.length, truncated: offset + length < text.length }); }
      if (name === 'delete_file') { const path = workspacePath(args.path); await storage.remove(prefix + '/' + path); return result({ path: '/mnt/data/' + path, deleted: true }); }
      if (name !== 'python' || !PythonRuntime) throw Error('Tool is not available: ' + name);
      if (typeof args.code !== 'string') throw Error('Python code must be text');
      let runtime = runtimes.get(prefix); if (!runtime) { runtime = new PythonRuntime(pythonOptions); runtimes.set(prefix, runtime); }
      const stop = () => runtime.terminate(new DOMException('Python execution interrupted', 'AbortError'));
      signal?.addEventListener('abort', stop, { once: true });
      try {
        const files = await Promise.all((await storage.list(prefix)).map(async f => ({ name: f.name, bytes: await storage.read(prefix + '/' + f.name) })));
        signal?.throwIfAborted(); const output = await runtime.run(args.code, files, onStatus); signal?.throwIfAborted(); const generated = [], writtenPaths = new Set();
        for (const file of output.files || []) { const path = workspacePath(file.name); let bytes = file.bytes; if (!bytes && file.dataUrl) { const encoded = file.dataUrl.split(',')[1]; bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)); } if (!bytes) throw Error('Python returned a file without bytes'); generated.push(await writePythonArtifact(threadId, path, bytes, prefix, signal, writtenPaths)); }
        const bounded = {};
        for (const key of ['stdout', 'stderr', 'result']) { const text = String(output[key] || ''); bounded[key] = text.slice(0, 32000); if (text.length > 32000) { const name = '.logs/' + String(call.id || Date.now()).replace(/[^a-z0-9_-]/gi, '_') + '-' + key + '.txt', bytes = encoder.encode(text); generated.push(await writePythonArtifact(threadId, name, bytes, prefix, signal, writtenPaths)); bounded[key + '_truncated'] = true; } }
        signal?.throwIfAborted();
        return result({ ...bounded, files: generated, artifact_manifest: PYTHON_ARTIFACT_MANIFEST, ...(output.error ? { error: output.error } : {}), executionEnvironment: 'browser-pyodide' }, output.ok === false || Boolean(output.error));
      } finally { signal?.removeEventListener('abort', stop); }
    },
    recover() { return { pythonVariablesRestored: false, filesPersisted: true }; },
    async getArtifact(threadId, path) { const bytes = await storage.read(namespace(threadId) + '/' + workspacePath(path)); return new Blob([bytes], { type: mime(path) }); },
    async handleArtifactRequest(request, pathname = new URL(request.url).pathname) {
      const match = /^\/__local_artifacts\/([^/]+)\/(.+)$/.exec(pathname); if (!match || request.method !== 'GET') return null;
      try {
        const key = decodeURIComponent(match[1]), scope = owner();
        if (!/^[a-z0-9_-]+$/i.test(key) || (scope == null ? key.startsWith('account-') : !key.startsWith('account-' + scope + '--'))) throw Error('Artifact belongs to another account workspace');
        const path = workspacePath(match[2].split('/').map(decodeURIComponent).join('/')), blob = new Blob([await storage.read(key + '/' + path)], { type: mime(path) }); return new Response(blob, { headers: { 'Content-Type': blob.type, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.split('/').at(-1))}`, 'Cache-Control': 'private, no-store' } }); } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 404, headers: { 'Content-Type': 'application/json' } }); }
    },
    dispose(threadId) { if (threadId) { runtimes.get(threadId)?.terminate(); runtimes.delete(threadId); } else { for (const runtime of runtimes.values()) runtime.terminate(); runtimes.clear(); } },
  };
}
