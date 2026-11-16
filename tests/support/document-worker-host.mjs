/** Real Node worker host for the browser-only document worker protocol. */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (!isMainThread) {
  const require = createRequire(import.meta.url);
  // This is the actual public DOMMatrix implementation from @napi-rs/canvas,
  // not a stub parser or fabricated PDF extraction result.
  globalThis.DOMMatrix = require(path.join(projectRoot, 'node_modules/@napi-rs/canvas/geometry.js')).DOMMatrix;
  const assetRoot = path.resolve(projectRoot, 'src/native-client/document-vendor');
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
    if (url.protocol !== 'file:') throw Error('Document test host denies all network egress');
    const target = path.resolve(fileURLToPath(url));
    if (!target.startsWith(assetRoot + path.sep)) throw Error('Document asset escaped the exact vendor directory');
    parentPort.postMessage({ __documentAssetRequest: url.href, authorization: new Headers(init.headers).has('Authorization'), credentials: init.credentials });
    try { return new Response(await fs.readFile(target), { status: 200 }); } catch { return new Response('Not found', { status: 404 }); }
  };
  globalThis.postMessage = (value, transfer) => parentPort.postMessage(value, transfer);
  globalThis.addEventListener = (kind, callback) => {
    if (kind !== 'message') throw Error('Unsupported document worker event');
    parentPort.on('message', async data => {
      if (workerData.delayMs) await new Promise(resolve => setTimeout(resolve, workerData.delayMs));
      callback({ data });
    });
  };
  await import(workerData.entry);
}
export function createNodeDocumentWorkerFactory({ delayMs = 0 } = {}) {
  const workers = [];
  function factory(entry) {
    const url = new URL(entry);
    if (url.protocol !== 'file:' || path.resolve(fileURLToPath(url)) !== path.resolve(projectRoot, 'src/native-client/document-text-worker.mjs')) throw Error('Only the canonical document worker is allowed');
    const node = new Worker(new URL(import.meta.url), { type: 'module', workerData: { entry: url.href, delayMs } });
    const handlers = new Map(), worker = {
      assets: [], terminated: false,
      postMessage(value, transfer) { node.postMessage(value, transfer); },
      addEventListener(kind, callback) {
        const wrapped = kind === 'message' ? value => { if (!value?.__documentAssetRequest) callback({ data: value }); } : error => callback({ message: error.message, error });
        handlers.set(callback, { kind, wrapped }); node.on(kind === 'messageerror' ? 'messageerror' : kind, wrapped);
      },
      removeEventListener(kind, callback) { const entry = handlers.get(callback); if (entry) { node.off(entry.kind, entry.wrapped); handlers.delete(callback); } },
      terminate() { worker.terminated = true; return node.terminate(); },
    };
    node.on('message', value => { if (value?.__documentAssetRequest) worker.assets.push(value); });
    // A transport listener is always installed before work is posted; retaining
    // this catch keeps a deliberate terminated worker from becoming global noise.
    node.on('error', () => {});
    workers.push(worker);
    return worker;
  }
  factory.workers = workers;
  return factory;
}
export function canonicalDocumentWorkerURL(version) {
  const url = pathToFileURL(path.join(projectRoot, 'src/native-client/document-text-worker.mjs'));
  if (version) url.searchParams.set('v', version);
  return url;
}
