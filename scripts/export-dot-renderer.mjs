/**
 * Export the exact public static Dot renderer subtree named by OrBF.a.
 * Node --use-env-proxy scripts/export-dot-renderer.mjs [--out D:/...]
 * Read-only HTTP; no cookies, auth headers, private API, browser or source execution.
 */
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const WORKSPACE = path.resolve(import.meta.dirname, '..');
const defaultOutput = 'D:/Codex-Static-Staging/dot-renderer-16ed1c7d9045dbdf-4d3311b40f55a3e2';
const argument = process.argv.indexOf('--out');
const output = path.resolve(argument < 0 ? defaultOutput : process.argv[argument + 1]);
if (output === path.parse(output).root) throw Error('The export output must be a named staging directory');
const rootURL = 'https://chatgpt.com/_orbit-renderer/assets/orbit-character-16ed1c7d9045dbdf/';
const frameURL = new URL('4d3311b40f55a3e2/frame.html', rootURL).href;
const acorn = await import('acorn');
const assets = new Map(), failed = new Map(), edges = [], pending = [], seen = new Set();
const startedAt = new Date().toISOString();
let writes = Promise.resolve(), finished = 0;
const manifestPath = path.join(output, 'manifest.json');

function resolveAsset(raw, base, proof) {
  if (typeof raw !== 'string' || raw.includes('\0') || /[\r\n]/.test(raw)) return;
  let url;
  try { url = new URL(raw, base ?? undefined); } catch { return; }
  if (!url.href.startsWith(rootURL) || url.username || url.password || url.search || url.hash) return;
  const extension = path.posix.extname(url.pathname).toLowerCase();
  if (!['.html', '.mjs', '.js', '.wasm', '.data', '.css', '.json', '.bin', '.png', '.webp', '.txt'].includes(extension)) return;
  const href = url.href;
  if (base) edges.push({ from: base, to: href, proof });
  if (!seen.has(href)) { seen.add(href); pending.push(href); }
}
function childPath(url) {
  const relative = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
  const target = path.resolve(output, relative);
  if (!target.startsWith(output + path.sep)) throw Error('Resolved export asset escaped its staging directory');
  return target;
}
async function atomic(target, value) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const file = target + '.pending-' + randomUUID();
  const handle = await fs.open(file, 'wx');
  try { await handle.writeFile(value); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(file, target);
}
function snapshot() {
  return {
    format: 'exact-public-dot-renderer-v1', startedAt, updatedAt: new Date().toISOString(),
    rootURL, frameURL, outputDirectory: output,
    sourceContract: {
      module: 'OrBF.a', file: '7078.c420b9a2f6.js', start: 296630, end: 296882,
      sourcePath: '/_orbit-renderer/assets/orbit-character-16ed1c7d9045dbdf/4d3311b40f55a3e2/frame.html',
      iframeSandbox: 'allow-scripts allow-same-origin',
      singleThreadFallback: 'crossOriginIsolated && SharedArrayBuffer selects threaded; otherwise original single-thread',
    },
    privacy: { originalPublicStaticOnly: true, cookies: false, authorization: false, accountMaterials: false },
    assets: [...assets.values()].sort((a, b) => a.url.localeCompare(b.url)),
    failures: [...failed.values()], edges,
    summary: { known: seen.size, available: assets.size, failed: failed.size, pending: pending.length, bytes: [...assets.values()].reduce((sum, entry) => sum + entry.bytes, 0) },
  };
}
async function checkpoint() {
  const serialized = JSON.stringify(snapshot(), null, 2) + '\n';
  writes = writes.then(() => atomic(manifestPath, serialized));
  await writes;
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function discover(text, url) {
  const ext = path.posix.extname(new URL(url).pathname);
  if (ext === '.html') {
    for (const match of text.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) resolveAsset(match[1], url, 'HTML attribute');
    return;
  }
  if (ext === '.css') {
    for (const match of text.matchAll(/url\(\s*["']?([^"')\s]+)|@import\s+["']([^"']+)["']/g)) resolveAsset(match[1] ?? match[2], url, 'CSS URL');
    return;
  }
  if (ext !== '.mjs' && ext !== '.js') return;
  const ast = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  walk(ast, node => {
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source?.value) resolveAsset(node.source.value, url, 'ESM import/export');
    if (node.type === 'ImportExpression' && typeof node.source?.value === 'string') resolveAsset(node.source.value, url, 'ESM dynamic literal import');
    if (node.type === 'NewExpression' && node.callee?.name === 'URL' && typeof node.arguments[0]?.value === 'string') resolveAsset(node.arguments[0].value, url, 'new URL literal');
    if (node.type === 'CallExpression' && node.callee?.name === 'fetch' && typeof node.arguments[0]?.value === 'string') resolveAsset(node.arguments[0].value, url, 'fetch literal');
    // Emscripten locateFile/package literals are engine filenames, not embedded VFS names.
    if (node.type === 'Literal' && typeof node.value === 'string' && /^(?:\.\/)?orbit-characters(?:[.-][A-Za-z0-9_-]+)*\.(?:mjs|js|wasm|data)$/.test(node.value)) resolveAsset(node.value, url, 'Emscripten exact runtime filename');
  });
  if (new URL(url).pathname.endsWith('/4d3311b40f55a3e2/frame.mjs')) {
    // Exact source loop: ["mjs","wasm","data"], runtime ternary has these two prefixes.
    if (!text.includes('["mjs", "wasm", "data"]') || !text.includes('"../runtime/" : "../runtime/single-thread/"')) throw Error('The pinned frame dependency proof changed');
    for (const directory of ['../runtime/', '../runtime/single-thread/']) for (const extension of ['mjs', 'wasm', 'data']) {
      resolveAsset(directory + 'orbit-characters.' + extension, url, 'Pinned frame preload loop and runtime ternary');
    }
  }
}
async function fetchOne(url) {
  const target = childPath(url);
  let bytes, headers, last;
  // Existing exact source bytes in this private staging may be reused on reruns.
  const prior = previous.get(url);
  if (prior) {
    try {
      const data = await fs.readFile(target);
      if (createHash('sha256').update(data).digest('hex') === prior.sha256) bytes = data;
    } catch {}
  }
  for (let attempt = 0; bytes == null && attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000), credentials: 'omit', redirect: 'error' });
      if (!response.ok) {
        last = { url, status: response.status, attempts: attempt + 1 };
        if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) break;
        continue;
      }
      headers = { contentType: response.headers.get('content-type'), contentLength: response.headers.get('content-length') };
      bytes = Buffer.from(await response.arrayBuffer());
      await atomic(target, bytes);
    } catch (cause) { last = { url, error: cause.message, cause: cause.cause?.code, attempts: attempt + 1 }; }
  }
  if (bytes == null) failed.set(url, last ?? { url, error: 'Unknown download error' });
  else {
    assets.set(url, { url, path: path.relative(output, target).split(path.sep).join('/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...headers });
    if (/\.(?:html|css|mjs|js)$/.test(new URL(url).pathname)) discover(bytes.toString('utf8'), url);
  }
  finished++;
  if (finished % 5 === 0 || pending.length === 0) console.log(JSON.stringify({ finished, known: seen.size, available: assets.size, failed: failed.size, bytes: snapshot().summary.bytes }));
}
await fs.mkdir(output, { recursive: true });
const previous = new Map(await fs.readFile(manifestPath, 'utf8').then(value => JSON.parse(value).assets.map(entry => [entry.url, entry])).catch(() => []));
resolveAsset(frameURL, null, 'OrBF.a original absolute pathname');
while (pending.length) {
  const batch = pending.splice(0, 4);
  const results = await Promise.allSettled(batch.map(fetchOne));
  for (let index = 0; index < results.length; index++) if (results[index].status === 'rejected') {
    failed.set(batch[index], { url: batch[index], error: results[index].reason.message });
    console.log(JSON.stringify({ error: results[index].reason.message, url: batch[index] }));
  }
  await checkpoint();
}
await checkpoint();
console.log(JSON.stringify({ manifestPath, ...snapshot().summary }));
