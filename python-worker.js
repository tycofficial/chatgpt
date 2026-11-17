// A module worker keeps CPython execution off the interface thread.
// Version and module-worker API verified against https://pyodide.org/en/stable/usage/webworker.html
const PYODIDE_VERSION = '314.0.8';
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
let engine;
let enginePromise;
let currentId;
const uploadedSignatures = new Map();
const status = message => self.postMessage({ id: currentId, type: 'status', message });

async function initialize() {
  if (engine) return engine;
  if (!enginePromise) enginePromise = (async () => {
    status('正在准备 Python 运行环境…');
    const { loadPyodide } = await import(`${CDN}pyodide.mjs`);
    const runtime = await loadPyodide({ indexURL: CDN });
    runtime.FS.mkdirTree('/mnt/data');
    runtime.FS.chdir('/mnt/data');
    runtime.runPython(`
import os, sys
os.chdir('/mnt/data')
os.environ['MPLBACKEND'] = 'Agg'
if '/mnt/data' not in sys.path:
    sys.path.insert(0, '/mnt/data')
`);
    engine = runtime;
    status('Python 已就绪');
    return engine;
  })().catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}

export function safeRelativePath(name) {
  const path = String(name || 'file.txt').replace(/\\/g, '/').replace(/\0/g, '').replace(/^[a-z]:/i, '').replace(/^\/+/, '').replace(/^mnt\/data\//, '');
  const parts = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { parts.pop(); continue; }
    parts.push(part);
  }
  return parts.join('/') || 'file.txt';
}

async function contentHash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function snapshot(fs, path = '/mnt/data', result = new Map()) {
  for (const name of fs.readdir(path)) {
    if (name === '.' || name === '..' || name === '__pycache__' || name.startsWith('.')) continue;
    const full = `${path}/${name}`;
    const stat = fs.stat(full);
    if (fs.isDir(stat.mode)) await snapshot(fs, full, result);
    else {
      // Same-size writes may preserve timestamps. Compare actual byte hashes as
      // well; oversized files retain the existing transfer-limit behavior.
      const sha256 = stat.size <= 20 * 1024 * 1024 ? await contentHash(fs.readFile(full)) : null;
      result.set(full, { size: stat.size, mtime: stat.mtime.getTime(), sha256 });
    }
  }
  return result;
}

function mimeType(name) {
  const extensions = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', csv: 'text/csv', json: 'application/json', html: 'text/html', txt: 'text/plain', md: 'text/markdown', py: 'text/x-python', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip' };
  const extension = name.split('.').pop().toLowerCase();
  return Object.hasOwn(extensions, extension) ? extensions[extension] : 'application/octet-stream';
}

function dataURL(bytes, mime) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return `data:${mime};base64,${btoa(binary)}`;
}

async function execute({ id, code, files = [] }) {
  currentId = id;
  const runtime = await initialize();
  for (const file of files) {
    const name = safeRelativePath(file.name);
    const bytes = new Uint8Array(file.bytes);
    let hash = 2166136261;
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
    const signature = `${bytes.length}:${hash >>> 0}`;
    if (uploadedSignatures.get(name) !== signature) {
      const parent = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
      if (parent) runtime.FS.mkdirTree(`/mnt/data/${parent}`);
      runtime.FS.writeFile(`/mnt/data/${name}`, bytes);
      uploadedSignatures.set(name, signature);
    }
  }
  const before = await snapshot(runtime.FS);
  let stdout = '', stderr = '', result = '', executionError = null;
  const outDecoder = new TextDecoder(), errDecoder = new TextDecoder();
  runtime.setStdin({ stdin: () => undefined });
  runtime.setStdout({ write: bytes => { stdout += outDecoder.decode(bytes, { stream: true }); return bytes.length; } });
  runtime.setStderr({ write: bytes => { stderr += errDecoder.decode(bytes, { stream: true }); return bytes.length; } });
  status('正在加载所需的 Python 包…');
  try {
    await runtime.loadPackagesFromImports(code, { messageCallback: status, errorCallback: message => { stderr += `${message}\n`; } });
    status('正在运行 Python…');
    const value = await runtime.runPythonAsync(code);
    if (value !== undefined && value !== null) {
      result = String(value);
      value?.destroy?.();
    }
  } catch (error) { executionError = String(error.message || error); stderr += `${executionError}\n`; }
  try { runtime.runPython('import sys as _runtime_sys; _runtime_sys.stdout.flush(); _runtime_sys.stderr.flush()'); } catch { /* Closed streams do not prevent artifact recovery. */ }
  // Capture every open figure even if model code omitted savefig()/show().
  try {
    runtime.runPython(`
import sys as _runtime_sys
if 'matplotlib.pyplot' in _runtime_sys.modules:
    import matplotlib.pyplot as _runtime_plt
    import time as _runtime_time
    for _runtime_n in _runtime_plt.get_fignums():
        _runtime_plt.figure(_runtime_n).savefig('/mnt/data/chart_' + str(int(_runtime_time.time()*1000)) + '_' + str(_runtime_n) + '.png', bbox_inches='tight', dpi=140)
    _runtime_plt.close('all')
`);
  } catch (error) { stderr += `Plot capture: ${error.message}\n`; }
  const generated = [];
  for (const [path, stat] of await snapshot(runtime.FS)) {
    const old = before.get(path);
    if (old && old.size === stat.size && old.mtime === stat.mtime && old.sha256 === stat.sha256) continue;
    if (stat.size > 20 * 1024 * 1024) { stderr += `文件 ${path} 超过 20 MB，未传回浏览器。\n`; continue; }
    const name = path.slice('/mnt/data/'.length);
    const mime = mimeType(name);
    generated.push({ name, path, mime, dataUrl: dataURL(runtime.FS.readFile(path), mime) });
  }
  try { runtime.runPython('_runtime_sys.stdout.flush(); _runtime_sys.stderr.flush()'); } catch { /* Preserve any remaining output. */ }
  stdout += outDecoder.decode();
  stderr += errDecoder.decode();
  return { ok: executionError === null, error: executionError, stdout, stderr, result, files: generated, images: generated.filter(file => file.mime.startsWith('image/') && file.mime !== 'image/svg+xml').map(file => file.dataUrl) };
}

let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try { self.postMessage({ id: data.id, type: 'result', result: await execute(data) }); }
    catch (error) { self.postMessage({ id: data.id, type: 'error', error: `Python 运行环境不可用：${error.message || error}` }); }
  });
};
