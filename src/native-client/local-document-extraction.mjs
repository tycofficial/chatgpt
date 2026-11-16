/** Isolated document CPU transport. Only a copied buffer is transferred. */
const fail = (message, code, status = 422) => Object.assign(new Error(message), { code, status });
const abortError = () => new DOMException('Document extraction cancelled', 'AbortError');
export function documentWorkerURL(base = import.meta.url) {
  const url = new URL('./document-text-worker.mjs', base), version = new URL(base).searchParams.get('v');
  if (version) url.searchParams.set('v', version);
  return url;
}
export function createLocalDocumentExtractor({
  workerFactory = url => {
    if (typeof globalThis.Worker !== 'function') throw fail('Dedicated document workers are unavailable in this browser', 'document_parser_unavailable', 503);
    return new Worker(url, { type: 'module', name: 'site-local-document-extraction' });
  },
  timeoutMs = 30000, maxConcurrent = 2, maxQueued = 16,
  maxInputBytes = 20 * 1024 * 1024, limits = {}, workerURL = documentWorkerURL(),
} = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000 || !Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 4 || !Number.isSafeInteger(maxQueued) || maxQueued < 0 || maxQueued > 64) throw new TypeError('Invalid document worker budget');
  const queue = [], jobs = new Set();
  let running = 0, closed = false;
  function stopWorker(worker) {
    try { const stopped = worker?.terminate(); stopped?.catch?.(() => {}); } catch {}
  }
  function validResult(value, format) {
    const maxCharacters = limits.maxCharacters ?? 1000000;
    if (!value || value.format !== format || typeof value.text !== 'string' || !value.text.trim() || value.text.length > maxCharacters || typeof value.partial !== 'boolean' || typeof value.truncated !== 'boolean' || value.ocr !== false || !Array.isArray(value.reasons) || value.reasons.some(reason => typeof reason !== 'string') || !value.parser || value.parser.name !== (format === 'pdf' ? 'pdfjs-dist' : 'mammoth') || value.parser.version !== (format === 'pdf' ? '5.7.284' : '1.13.0')) throw fail('The dedicated parser returned an invalid result; the file was not marked ready', 'document_worker_protocol_error', 502);
    return value;
  }
  function pump() {
    while (!closed && running < maxConcurrent && queue.length) {
      const job = queue.shift();
      if (job.done) continue;
      job.started = true; running++;
      try {
        job.worker = workerFactory(workerURL);
        if (!job.worker || typeof job.worker.postMessage !== 'function' || typeof job.worker.addEventListener !== 'function') throw fail('The browser document worker API is unavailable', 'document_parser_unavailable', 503);
        job.message = event => {
          const response = event.data;
          if (response?.id !== job.id) return;
          if (response.ok !== true) {
            const error = response.error;
            job.finish(fail(typeof error?.message === 'string' ? error.message : 'The document parser failed', typeof error?.code === 'string' ? error.code : 'document_parser_error', Number.isInteger(error?.status) ? error.status : 422));
          } else {
            try { job.finish(null, validResult(response.result, job.format)); } catch (error) { job.finish(error); }
          }
        };
        job.error = event => job.finish(fail('The document worker failed before completing extraction: ' + String(event?.message || event?.error?.message || 'worker error').slice(0, 250), 'document_parser_unavailable', 503));
        job.worker.addEventListener('message', job.message);
        job.worker.addEventListener('error', job.error);
        job.worker.addEventListener('messageerror', job.error);
        const copy = job.bytes.slice();
        job.worker.postMessage({ id: job.id, format: job.format, bytes: copy.buffer, limits }, [copy.buffer]);
      } catch (error) { job.finish(error); }
    }
  }
  function extract(bytes, { format, signal } = {}) {
    if (closed) return Promise.reject(fail('The document parser was closed', 'document_parser_unavailable', 503));
    if (!['pdf','docx'].includes(format)) return Promise.reject(fail('Only PDF and DOCX parsing is connected', 'unhandled_mime_type', 415));
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > maxInputBytes) return Promise.reject(fail('The real document bytes are missing or exceed the parser limit', 'file_too_large', 413));
    if (signal?.aborted) return Promise.reject(abortError());
    if (queue.filter(job => !job.done).length >= maxQueued && running >= maxConcurrent) return Promise.reject(fail('The local document worker queue is full', 'document_parser_busy', 503));
    return new Promise((resolve, reject) => {
      const job = { id: crypto.randomUUID(), bytes, format, done: false, started: false, worker: null };
      job.finish = (error, result) => {
        if (job.done) return;
        job.done = true; clearTimeout(job.timer); signal?.removeEventListener('abort', job.abort);
        job.worker?.removeEventListener?.('message', job.message);
        job.worker?.removeEventListener?.('error', job.error);
        job.worker?.removeEventListener?.('messageerror', job.error);
        stopWorker(job.worker);
        if (job.started) running--;
        jobs.delete(job); job.bytes = null;
        if (error) reject(error); else resolve(result);
        queueMicrotask(pump);
      };
      job.abort = () => job.finish(abortError());
      job.timer = setTimeout(() => job.finish(fail('Document extraction exceeded its local CPU/time budget; no complete text was reported', 'document_parse_timeout', 408)), timeoutMs);
      signal?.addEventListener('abort', job.abort, { once: true });
      jobs.add(job); queue.push(job); pump();
    });
  }
  function close() {
    closed = true;
    for (const job of [...jobs]) job.finish(abortError());
    queue.length = 0;
  }
  return Object.freeze({ extract, close, limits: Object.freeze({ ...limits }), source: Object.freeze({ dedicatedWorker: true, timeoutMs, maxConcurrent, pinnedPdfVersion: '5.7.284', pinnedMammothVersion: '1.13.0' }) });
}
