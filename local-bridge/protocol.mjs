import crypto from 'node:crypto';
import { BridgeError } from './constants.mjs';
const unsupported = new Set(['background', 'conversation', 'max_output_tokens', 'max_tool_calls', 'metadata', 'moderation', 'multi_agent', 'prompt', 'prompt_cache_retention', 'safety_identifier', 'temperature', 'top_logprobs', 'top_p', 'truncation', 'user', 'previous_response_id']);
const allowed = new Set(['model', 'input', 'instructions', 'include', 'reasoning', 'text', 'tools', 'tool_choice', 'parallel_tool_calls', 'service_tier']);
const unsupportedTools = new Set(['image_generation', 'file_search', 'code_interpreter', 'computer', 'computer_use', 'computer_use_preview', 'mcp', 'tool_search', 'programmatic_tool_calling']);
function leaf(tool) {
  if (tool.type === 'function') return tool.function ? { type: 'function', ...structuredClone(tool.function) } : structuredClone(tool);
  if (tool.type === 'custom') return structuredClone(tool);
  throw new BridgeError('UNSUPPORTED_TOOL', 'Only local function/custom tools can be grouped in this namespace');
}
export function normalizeResponsesRequest(payload, availableModels = null) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BridgeError('INVALID_PAYLOAD', 'Responses payload must be an object');
  if (typeof payload.model !== 'string' || !payload.model) throw new BridgeError('INVALID_MODEL', 'Select a model from the signed-in account catalog');
  if (availableModels && !availableModels.some(model => model.slug === payload.model)) throw new BridgeError('MODEL_NOT_AVAILABLE', 'The selected model is not in this ChatGPT account catalog');
  const result = Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, structuredClone(value)]));
  result.store = false; result.stream = true;
  result.input = typeof result.input === 'string' ? [{ role: 'user', content: result.input }] : result.input;
  if (!Array.isArray(result.input)) throw new BridgeError('INVALID_INPUT', 'This public HTTP route requires the complete input history as an array');
  result.input = result.input.map(item => item && typeof item === 'object' && item.role === 'system' ? { ...item, role: 'developer' } : item);
  const functions = [], tools = [];
  for (const tool of result.tools || []) {
    if (unsupportedTools.has(tool.type)) throw new BridgeError('UNSUPPORTED_TOOL', 'The official subscription route does not support hosted tool: ' + tool.type, { param: 'tools' });
    if (['function', 'custom'].includes(tool.type)) functions.push(leaf(tool));
    else if (tool.type === 'namespace') {
      if (typeof tool.name !== 'string' || !Array.isArray(tool.tools) || !tool.tools.length) throw new BridgeError('INVALID_NAMESPACE', 'A tool namespace must have a name and tools');
      tools.push({ ...structuredClone(tool), tools: tool.tools.map(leaf) });
    } else if (['web_search', 'web_search_preview', 'web_search_preview_2025_03_11'].includes(tool.type)) tools.push(structuredClone(tool));
    else throw new BridgeError('UNSUPPORTED_TOOL', 'Unsupported official subscription tool: ' + String(tool.type), { param: 'tools' });
  }
  if (functions.length) { if (tools.some(tool => tool.name === 'app_tools')) throw new BridgeError('NAMESPACE_COLLISION', 'app_tools is reserved for flat local functions'); tools.push({ type: 'namespace', name: 'app_tools', description: 'Tools executed by the application; not hosted OpenAI tools.', tools: functions }); }
  if (payload.tools) result.tools = tools;
  return { payload: result, omittedFields: Object.keys(payload).filter(key => unsupported.has(key)) };
}
export const payloadHash = payload => crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
export function attemptKey(job) { return payloadHash({ payload: job.payload, attemptId: typeof job.resume === 'object' && job.resume ? job.resume.attemptId ?? null : null }); }
/** Observe terminal status while forwarding the original SSE text unchanged. */
export class ResponsesObserver {
  constructor() { this.buffer = ''; this.completed = false; this.failed = false; this.error = null; this.usage = null; this.model = null; this.responseId = null; }
  push(text, final = false) {
    this.buffer += text; let match;
    while ((match = /\r?\n\r?\n/.exec(this.buffer))) { const record = this.buffer.slice(0, match.index); this.buffer = this.buffer.slice(match.index + match[0].length); this.event(record); }
    if (final && this.buffer.trim()) { this.event(this.buffer); this.buffer = ''; }
  }
  event(record) {
    const text = record.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
    if (!text || text === '[DONE]') return;
    let value; try { value = JSON.parse(text); } catch { throw new BridgeError('INVALID_SSE', 'OpenAI returned malformed SSE JSON'); }
    const response = value.response;
    if (response?.usage) this.usage = response.usage;
    if (response?.model) this.model = response.model;
    if (response?.id) this.responseId = response.id;
    if (value.type === 'response.completed') this.completed = true;
    if (value.type === 'response.failed' || value.type === 'response.incomplete' || value.type === 'error') { this.failed = true; this.error = response?.error ?? value.error ?? { code: value.type === 'response.incomplete' ? 'RESPONSE_INCOMPLETE' : 'OPENAI_RESPONSE_FAILED', message: 'The official response did not complete', details: response?.incomplete_details }; }
  }
}
