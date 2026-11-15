/** OpenAI-compatible transport and an isolated, persistent browser Python session. */
function apiURL(base, resource) {
  const clean = String(base || 'https://api.openai.com').trim().replace(/\/+$/, '');
  return `${clean.endsWith('/v1') ? clean : `${clean}/v1`}/${resource}`;
}

function requestHeaders(settings) {
  return { 'Content-Type': 'application/json', ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) };
}

async function responseError(response) {
  let detail;
  try {
    const body = await response.json();
    detail = body.error?.message || body.message || body.detail;
  } catch { /* Some providers return an HTML error page. */ }
  if (response.status === 401 || response.status === 403) return new Error(detail || 'API 认证失败，请在设置中检查密钥及模型访问权限。');
  if (response.status === 429) return new Error(detail || 'API 请求过于频繁或额度不足，请稍后重试。');
  return new Error(detail || `API 请求失败（HTTP ${response.status}）`);
}

export async function getModels(settings, signal) {
  const response = await fetch(apiURL(settings.apiBase, 'models'), { headers: requestHeaders(settings), signal });
  if (!response.ok) throw await responseError(response);
  const body = await response.json();
  const models = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : [];
  return models.map(item => typeof item === 'string' ? item : item.id || item.name).filter(Boolean).sort();
}

/** Incremental SSE decoder: handles split UTF-8, CRLF and multi-line event data. */
export class SSEDecoder {
  constructor(onEvent) { this.buffer = ''; this.onEvent = onEvent; }
  push(text, final = false) {
    this.buffer += text;
    let match;
    while ((match = /\r?\n\r?\n/.exec(this.buffer))) {
      const event = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      this.dispatch(event);
    }
    if (final && this.buffer.trim()) { this.dispatch(this.buffer); this.buffer = ''; }
  }
  dispatch(event) {
    const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
    if (data) this.onEvent(data);
  }
}

export async function streamCompletion({ settings, messages, tools, signal, onDelta = () => {} }) {
  const payload = { model: settings.model, messages, stream: true };
  if (settings.temperature !== undefined && settings.temperature !== '' && settings.temperature !== null) payload.temperature = Number(settings.temperature);
  if (tools?.length) { payload.tools = tools; payload.tool_choice = 'auto'; }
  const response = await fetch(apiURL(settings.apiBase, 'chat/completions'), {
    method: 'POST', headers: requestHeaders(settings), body: JSON.stringify(payload), signal,
  });
  if (!response.ok) throw await responseError(response);
  const assembled = { role: 'assistant', content: '' };
  const toolCalls = [];
  let finished = false;
  const consume = (body) => {
    if (body.error) throw new Error(body.error.message || String(body.error));
    const choice = body.choices?.[0];
    if (!choice) return;
    const delta = choice.delta || choice.message || {};
    const content = typeof delta.content === 'string' ? delta.content : Array.isArray(delta.content) ? delta.content.map(part => part.text || '').join('') : '';
    if (content) { assembled.content += content; onDelta(content, assembled); }
    if (delta.reasoning_content) { assembled.reasoning = (assembled.reasoning || '') + delta.reasoning_content; onDelta('', assembled); }
    for (const call of delta.tool_calls || []) {
      const index = call.index ?? toolCalls.findIndex(t => t?.id === call.id);
      const position = index < 0 ? toolCalls.length : index;
      const target = toolCalls[position] ||= { id: '', type: 'function', function: { name: '', arguments: '' } };
      if (call.id) target.id = call.id;
      if (call.type) target.type = call.type;
      if (call.function?.name) target.function.name += call.function.name;
      if (call.function?.arguments) target.function.arguments += call.function.arguments;
    }
    if (toolCalls.length) assembled.tool_calls = toolCalls.filter(Boolean);
    if (choice.finish_reason) assembled.finish_reason = choice.finish_reason;
  };
  // Providers occasionally ignore stream=true and return a normal completion.
  if (/application\/json/i.test(response.headers.get('content-type') || '')) {
    consume(await response.json());
    return assembled;
  }
  if (!response.body) throw new Error('API 未返回响应内容。');
  const decoder = new TextDecoder();
  const events = new SSEDecoder(data => {
    if (data.trim() === '[DONE]') { finished = true; return; }
    if (finished) return;
    let body;
    try { body = JSON.parse(data); } catch { throw new Error('API 返回了无效的流式数据。'); }
    consume(body);
  });
  const reader = response.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      events.push(decoder.decode(value, { stream: true }));
      if (finished) { await reader.cancel(); break; }
    }
    events.push(decoder.decode(), true);
  } finally { reader.releaseLock(); }
  if (!assembled.content && !assembled.tool_calls?.length) throw new Error('模型没有返回内容。请检查模型可用性或重新生成。');
  return assembled;
}

export const PYTHON_TOOL = {
  type: 'function',
  function: {
    name: 'python',
    description: 'Execute real Python in a persistent isolated CPython WebAssembly session. Use for calculations, data analysis, generating files, and charts. Supports numpy, pandas, matplotlib and Pyodide packages, not shell commands, subprocess, or an operating system. Working directory and uploaded/generated files: /mnt/data. Variables persist across calls within this chat. Save output files under /mnt/data; use matplotlib with the Agg backend. The tool returns stdout, stderr, result and downloadable files.',
    parameters: { type: 'object', properties: { code: { type: 'string', description: 'Python source code to execute.' } }, required: ['code'], additionalProperties: false },
  },
};

export const FILE_TOOL = {
  type: 'function',
  function: {
    name: 'create_file',
    description: 'Create a UTF-8 text file in /mnt/data and return a downloadable artifact. Use for code, Markdown, HTML, SVG, CSV, JSON, or other text documents. To produce binary documents use the python tool instead.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, content: { type: 'string' } }, required: ['name', 'content'], additionalProperties: false },
  },
};

export class PythonRuntime {
  constructor({ timeout = 120000 } = {}) { this.timeout = timeout; this.worker = null; this.pending = new Map(); this.serial = Promise.resolve(); this.nextId = 1; this.generation = 0; }
  ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(new URL('./python-worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      const job = this.pending.get(data.id);
      if (!job) return;
      if (data.type === 'status') { job.onStatus?.(data.message); return; }
      clearTimeout(job.timer); this.pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.error)); else job.resolve(data.result);
    };
    this.worker.onerror = event => {
      const message = event.message || 'Python Worker 加载失败，请检查网络后重试。';
      this.terminate(new Error(message));
    };
  }
  run(code, files = [], onStatus) {
    const generation = this.generation;
    const run = async () => {
      if (generation !== this.generation) throw new DOMException('Python 运行已停止。', 'AbortError');
      const uploads = await Promise.all(files.map(async file => {
        if (typeof File !== 'undefined' && file instanceof File) return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
        if (file.dataUrl) { const response = await fetch(file.dataUrl); return { name: file.name, bytes: new Uint8Array(await response.arrayBuffer()) }; }
        if (file.bytes || file.content !== undefined) return { name: file.name, bytes: file.bytes || new TextEncoder().encode(String(file.content)) };
        return null;
      }));
      if (generation !== this.generation) throw new DOMException('Python 运行已停止。', 'AbortError');
      this.ensureWorker();
      return new Promise((resolve, reject) => {
        const id = this.nextId++;
        const timer = setTimeout(() => this.terminate(new Error('Python 执行超时，运行环境已重置。')), this.timeout);
        this.pending.set(id, { resolve, reject, timer, onStatus });
        this.worker.postMessage({ id, code: String(code), files: uploads.filter(Boolean) });
      });
    };
    const result = this.serial.then(run, run);
    this.serial = result.catch(() => {});
    return result;
  }
  reset() { this.terminate(); }
  terminate(reason = new DOMException('Python 运行已停止。', 'AbortError')) {
    this.generation += 1;
    this.worker?.terminate(); this.worker = null;
    for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(reason); }
    this.pending.clear();
  }
}
