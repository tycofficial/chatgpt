/** OpenAI-compatible transport and an isolated, persistent browser Python session. */
function apiURL(base, resource) {
  const clean = String(base || 'https://api.openai.com').trim().replace(/\/+$/, '');
  return `${clean.endsWith('/v1') ? clean : `${clean}/v1`}/${resource}`;
}

function requestHeaders(settings) {
  return { 'Content-Type': 'application/json', ...(settings.apiKey ? settings.apiKeyHeader === 'x-api-key' ? { 'x-api-key': settings.apiKey } : { Authorization: `Bearer ${settings.apiKey}` } : {}) };
}

// Verified against the exact model's official capability documentation.
// Do not guess effort support for provider aliases or other model families.
const VERIFIED_REASONING_EFFORTS = Object.freeze({
  'gpt-6.2-sol': Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6.2-astra': Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6.1-sol': Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6.1-terra': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6-astra': Object.freeze(['low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6-sol': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-6-luna': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-5.6-sol': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-5.6-terra': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
  'gpt-5.6-luna': Object.freeze(['none', 'low', 'medium', 'high', 'xhigh', 'max']),
});

export function allowedReasoningEfforts(model) {
  return typeof model === 'string' && Object.hasOwn(VERIFIED_REASONING_EFFORTS, model)
    ? [...VERIFIED_REASONING_EFFORTS[model]] : [];
}

export function validatedReasoningEffort(settings) {
  const supported = allowedReasoningEfforts(settings.model);
  const effort = settings.reasoningEffort;
  if (!supported.length || effort === undefined || effort === null || effort === '') return undefined;
  if (!supported.includes(effort)) {
    throw new Error(`模型 ${settings.model} 不支持思考等级 ${String(effort)}。可选值：${supported.join('、')}。`);
  }
  return effort;
}

export function responsesReasoning(settings) {
  const effort = validatedReasoningEffort(settings);
  const mode = settings.reasoningMode;
  if (mode !== undefined && mode !== null && mode !== '' && !['standard', 'pro'].includes(mode)) {
    throw new Error(`无效的推理模式：${String(mode)}。`);
  }
  const knownModel = allowedReasoningEfforts(settings.model).length > 0;
  if (!knownModel && mode === 'pro') throw new Error(`尚未核实模型 ${settings.model} 支持原生 Pro 模式。`);
  const reasoning = {};
  if (effort !== undefined) reasoning.effort = effort;
  if (knownModel && (mode === 'standard' || mode === 'pro')) reasoning.mode = mode;
  return Object.keys(reasoning).length ? reasoning : undefined;
}

export function verifyResponseReasoning(settings, response) {
  const requested = responsesReasoning(settings);
  const actual = response.reasoning;
  if (requested?.mode === 'pro' && actual?.mode !== 'pro') {
    throw Object.assign(new Error('服务商未启用请求的原生 Pro 模式。'), {code:'PROVIDER_REASONING_UNSUPPORTED'});
  }
  if (requested?.effort !== undefined && actual?.effort !== undefined && actual.effort !== requested.effort) {
    throw Object.assign(new Error(`服务商未采用请求的思考等级 ${requested.effort}，实际返回 ${actual.effort}。`), {code:'PROVIDER_REASONING_UNSUPPORTED'});
  }
}

function providerError(body, { status, requestId, transportStatus = status } = {}) {
  const detail = body?.error && typeof body.error === 'object' ? body.error : body;
  const message = typeof body?.error === 'string' ? body.error : detail?.message || (typeof detail?.detail === 'string' ? detail.detail : undefined);
  const code = detail?.code || body?.code;
  const proUnsupported = detail?.param === 'reasoning.mode' && (status === 400 || code === 'unsupported_value');
  const subscriptionQuota = code === 'subscription_sharing_usage_limit_exceeded';
  const exhausted = /insufficient.{0,32}(?:balance|quota|credit)|(?:credit|balance|quota).{0,32}(?:exhaust|insufficient)|insufficient_quota|额度不足|余额不足/i.test(String(message || '') + ' ' + String(code || ''));
  const explicitStatus = [detail?.status_code, detail?.http_status, body?.status_code].find(value => Number.isInteger(value) && value >= 400 && value < 600);
  status ??= explicitStatus;
  const error = new Error(subscriptionQuota ? `ChatGPT 订阅额度暂时不可用。${message || '请在官网用量页面查看恢复时间。'}` : exhausted ? `API 额度或余额已耗尽。${message || '请补充服务商额度后重试。'}` : message || (status === 401 || status === 403 ? 'API 认证失败，请在设置中检查密钥及模型访问权限。' : status === 429 ? 'API 请求过于频繁或额度不足，请稍后重试。' : status ? `API 请求失败（HTTP ${status}）` : '模型响应失败。'));
  if (proUnsupported) error.message = '当前 API 服务商不支持所选模型的 Pro 推理模式。';
  error.status = status;
  error.transportStatus = transportStatus;
  error.providerCode = code || null;
  error.code = proUnsupported ? 'PROVIDER_REASONING_UNSUPPORTED' : subscriptionQuota ? 'SUBSCRIPTION_QUOTA_EXHAUSTED' : exhausted ? 'API_QUOTA_EXHAUSTED' : code || 'API_REQUEST_FAILED';
  error.param = detail?.param ?? null;
  error.requestId = detail?.request_id || body?.request_id || requestId || null;
  if (proUnsupported || subscriptionQuota || exhausted) error.retryable = false;
  else if (status) error.retryable = status === 408 || status === 429 || status >= 500;
  else if (['server_error','rate_limit_exceeded'].includes(code) || detail?.type === 'server_error') error.retryable = true;
  else if (['invalid_api_key','permission_denied','invalid_request_error','model_not_found'].includes(code) || detail?.type === 'invalid_request_error') error.retryable = false;
  return error;
}
async function responseError(response) {
  let body;
  try { body = await response.json(); } catch { /* Some providers return an HTML error page. */ }
  return providerError(body, { status: response.status, requestId: response.headers.get('x-request-id') });
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

export async function streamCompletion({ settings, messages, tools, toolChoice, signal, onDelta = () => {}, onActivity = () => {}, responsesTransport }) {
  if (settings.apiTransport === 'responses' || settings.reasoningMode === 'pro') {
    return streamResponses({ settings, messages, tools, toolChoice, signal, onDelta, onActivity, responsesTransport });
  }
  if (settings.browserChatCompletions === false) throw Object.assign(new Error('当前主接口的跨域配置未允许浏览器使用所需的 Authorization 鉴权。'), { code: 'API_BROWSER_CHAT_UNAVAILABLE', retryable: false });
  const payload = { model: settings.model, messages: messages.map(({ response_items, phase, ...message }) => message), stream: true };
  const effort = validatedReasoningEffort(settings);
  if (effort !== undefined) payload.reasoning_effort = effort;
  if ((!allowedReasoningEfforts(settings.model).length || effort === 'none') && settings.temperature !== undefined && settings.temperature !== '' && settings.temperature !== null) payload.temperature = Number(settings.temperature);
  if (tools?.length) { payload.tools = tools; payload.tool_choice = 'auto'; }
  const response = await fetch(apiURL(settings.apiBase, 'chat/completions'), {
    method: 'POST', headers: requestHeaders(settings), body: JSON.stringify(payload), signal,
  });
  if (!response.ok) throw await responseError(response);
  const assembled = { role: 'assistant', content: '' };
  const toolCalls = [];
  let finished = false;
  const consume = (body) => {
    if (body.error) throw providerError(body, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
    if (body.usage) assembled.usage = body.usage;
    if (typeof body.model === 'string') {
      if (body.model !== settings.model && !body.model.startsWith(settings.model+'-')) throw Object.assign(new Error('服务商返回的模型与所选模型不一致。'),{code:'PROVIDER_MODEL_UNSUPPORTED'});
      assembled.model=body.model;
    }
    const choice = body.choices?.[0];
    if (!choice) return;
    const delta = choice.delta || choice.message || {};
    const content = typeof delta.content === 'string' ? delta.content : Array.isArray(delta.content)
      ? delta.content.filter(part => part && (part.type == null || part.type === 'text' || part.type === 'output_text'))
        .map(part => typeof part.text === 'string' ? part.text : '').join('')
      : '';
    if (content) { assembled.content += content; onActivity({type:'text_delta'}); onDelta(content, assembled); }
    // Some compatibility gateways send raw reasoning in a vendor extension.
    // It marks upstream activity, but only Responses summaries reach the UI.
    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) onActivity({type:'provider_progress'});
    for (const call of delta.tool_calls || []) {
      onActivity({type:'tool_delta'});
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

function publicReasoningItem(item) {
  return {
    type: 'reasoning',
    ...(typeof item.id === 'string' ? { id: item.id } : {}),
    summary: (Array.isArray(item.summary) ? item.summary : [])
      .filter(part => part?.type === 'summary_text' && typeof part.text === 'string')
      .map(part => ({ type: 'summary_text', text: part.text })),
    ...(typeof item.encrypted_content === 'string' ? { encrypted_content: item.encrypted_content } : {}),
    ...(['in_progress', 'completed', 'incomplete'].includes(item.status) ? { status: item.status } : {}),
  };
}

export function isPublicReasoningPart(part) {
  return Number.isSafeInteger(part?.index) && part.index >= 0 &&
    Number.isSafeInteger(part.summaryIndex) && part.summaryIndex >= 0 &&
    typeof part.text === 'string' && part.text.length > 0;
}

/** Convert the app's existing Chat history, including function results and images. */
export function toResponsesInput(messages) {
  const input = [];
  for (const message of messages) {
    if (message.role === 'tool') {
      input.push({ type: 'function_call_output', call_id: message.tool_call_id, output: String(message.content ?? '') });
      continue;
    }
    // Reuse complete Responses items so stateless tool turns retain encrypted reasoning.
    if (message.role === 'assistant' && Array.isArray(message.response_items) && message.response_items.length) {
      input.push(...message.response_items.map(item => item?.type === 'reasoning' ? publicReasoningItem(item) : structuredClone(item)));
      continue;
    }
    let content = message.content;
    if (Array.isArray(content)) {
      content = content.map(part => {
        if (part.type === 'text') return { type: 'input_text', text: part.text };
        if (part.type === 'image_url') return { type: 'input_image', image_url: part.image_url.url, detail: part.image_url.detail || 'auto' };
        return structuredClone(part);
      });
    }
    if (content !== undefined && content !== null && content !== '') input.push({ role: message.role, content,
      ...(message.role === 'assistant' && ['commentary', 'final_answer'].includes(message.phase) ? { phase: message.phase } : {}),
    });
    for (const call of message.tool_calls || []) {
      input.push({ type: 'function_call', call_id: call.id, name: call.function.name, arguments: call.function.arguments || '{}' });
    }
  }
  return input;
}

export function toResponsesTools(tools = []) {
  return tools.map(tool => tool.type === 'function' && tool.function
    ? { type: 'function', ...structuredClone(tool.function) } : structuredClone(tool));
}

/** Responses transport preserves the same app-facing assistant/tool-call contract. */
async function streamResponses({ settings, messages, tools, toolChoice, signal, onDelta, onActivity, responsesTransport }) {
  const payload = { model: settings.model, input: toResponsesInput(messages), stream: true, store: false, include: ['reasoning.encrypted_content'] };
  if (settings.serviceTier) payload.service_tier = settings.serviceTier;
  const reasoning = responsesReasoning(settings);
  if (reasoning) payload.reasoning = reasoning;
  if ((!allowedReasoningEfforts(settings.model).length || reasoning?.effort === 'none') && settings.temperature !== undefined && settings.temperature !== null && settings.temperature !== '') payload.temperature = Number(settings.temperature);
  if (tools?.length) { payload.tools = toResponsesTools(tools); payload.tool_choice = toolChoice ? structuredClone(toolChoice) : 'auto'; }
  const fallbackResponses = () => {
    if (settings.browserResponses === false) throw Object.assign(new Error('当前主接口的 Responses 鉴权与跨域配置不支持浏览器直连。'), { code: 'API_BROWSER_RESPONSES_UNAVAILABLE', retryable: false });
    return fetch(apiURL(settings.apiBase, 'responses'), { method: 'POST', headers: requestHeaders(settings), body: JSON.stringify(payload), signal });
  };
  const response = responsesTransport ? await responsesTransport(payload, { signal, fallbackResponses }) : await fallbackResponses();
  if (!response.ok) throw await responseError(response);

  const assembled = { role: 'assistant', content: '' };
  const texts = new Map(), outputMessages = new Map(), reasoningTexts = new Map(), calls = new Map(), items = new Map(), itemIndexes = new Map(), searchCalls = new Map();
  let finished = false;
  const outputIndex = event => event.output_index ?? itemIndexes.get(event.item_id) ?? 0;
  const refreshCalls = () => {
    if (!calls.size) return;
    assembled.tool_calls = [...calls.entries()].sort((a,b) => a[0]-b[0]).map(([,call]) => ({ id: call.call_id || '', type: 'function', function: { name: call.name || '', arguments: call.arguments || '' } }));
  };
  const refreshText = () => {
    const messages = new Map();
    for (const part of [...texts.values()].sort((a, b) => a.index - b.index || a.contentIndex - b.contentIndex)) {
      const message = messages.get(part.index) ?? { index: part.index, phase: null, ...outputMessages.get(part.index), text: '' };
      message.text += part.text;
      messages.set(part.index, message);
    }
    assembled.output_messages = [...messages.values()].filter(message => message.text);
    assembled.content = assembled.output_messages.map(message => message.text).join('');
    const phase = assembled.output_messages.at(-1)?.phase;
    if (phase) assembled.phase = phase;
    else delete assembled.phase;
  };
  const textPart = (index, contentIndex, text, append = false) => {
    const key = `${index}:${contentIndex}`, previous = texts.get(key)?.text || '';
    const next = append ? previous + text : text;
    if (next === previous) return;
    texts.set(key, { index, contentIndex, text: next });
    refreshText();
    onActivity({type:'text_delta'});
    onDelta(next.startsWith(previous) ? next.slice(previous.length) : '', assembled);
  };
  const reasoningPart = (index, summaryIndex, text, append = false) => {
    if (!isPublicReasoningPart({ index, summaryIndex, text })) return;
    const key = `${index}:${summaryIndex}`, previous = reasoningTexts.get(key)?.text || '';
    const next = append ? previous + text : text;
    if (next === previous) return;
    // Some gateways revise or compact the optional terminal summary. Keep the
    // public text already shown without treating a summary edit as turn failure.
    if (!next.startsWith(previous)) return;
    reasoningTexts.set(key, { index, summaryIndex, text: next });
    const parts = [...reasoningTexts.values()].sort((a, b) => a.index - b.index || a.summaryIndex - b.summaryIndex);
    assembled.reasoning_parts = parts;
    // Preserve the monotonic legacy string used by older clients and durable replay.
    const summary = parts.map(part => part.text).join('');
    if (summary.startsWith(assembled.reasoning ?? '')) assembled.reasoning = summary;
    onActivity({type:'reasoning_delta'}); onDelta('', assembled);
  };
  const ensureCall = (index, item = {}) => {
    const call = calls.get(index) || { type: 'function_call', arguments: '' };
    for (const key of ['id','call_id','name','arguments','status']) if (item[key] !== undefined) call[key] = item[key];
    calls.set(index, call);
    if (item.id) itemIndexes.set(item.id, index);
    refreshCalls();
    return call;
  };
  const ingestSearch = (item, index) => {
    const value = { ...(searchCalls.get(index) || {}), ...structuredClone(item), type: 'web_search_call' };
    searchCalls.set(index, value);
    assembled.web_search_calls = [...searchCalls.entries()].sort((a,b) => a[0]-b[0]).map(([,call]) => structuredClone(call));
    onActivity({type:'web_search_delta'}); onDelta('', assembled);
  };
  const ingestItem = (item, index, complete = false) => {
    if (!item) return;
    if (item.id) itemIndexes.set(item.id, index);
    if (complete) items.set(index, item.type === 'reasoning' ? publicReasoningItem(item) : structuredClone(item));
    if (item.type === 'reasoning' && Array.isArray(item.summary)) item.summary.forEach((part, summaryIndex) => {
      if (part?.type === 'summary_text' && typeof part.text === 'string') reasoningPart(index, summaryIndex, part.text);
    });
    if (item.type === 'web_search_call') ingestSearch(item, index);
    if (item.type === 'function_call') { onActivity({type:'tool_delta'}); ensureCall(index, item); }
    if (item.type === 'message') {
      const previous = outputMessages.get(index);
      const phase = item.phase === 'commentary' || item.phase === 'final_answer' ? item.phase : previous?.phase ?? null;
      const completed = complete || previous?.completed === true;
      outputMessages.set(index, { phase, id: item.id ?? previous?.id, completed });
      if (assembled.output_messages?.some(message => message.index === index)) {
        refreshText();
        if (phase !== (previous?.phase ?? null) || phase === 'commentary' && completed && !previous?.completed) onDelta('', assembled);
      }
      (item.content || []).forEach((part, contentIndex) => {
        if (part.type === 'output_text') textPart(index, contentIndex, part.text || '');
        if (part.type === 'refusal') textPart(index, contentIndex, part.refusal || '');
      });
    }
  };
  const ingestResponse = body => {
    if (body.error) throw providerError(body, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
    if (body.usage) assembled.usage = body.usage;
    if (body.status === 'failed') throw providerError(body, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
    verifyResponseReasoning(settings, body);
    (body.output || []).forEach((item,index) => ingestItem(item,index,true));
    if (!body.output?.length && typeof body.output_text === 'string') textPart(0,0,body.output_text);
    if (body.reasoning) assembled.actual_reasoning = body.reasoning;
    if (body.model) assembled.model = body.model;
    if (typeof body.service_tier === 'string') assembled.service_tier = body.service_tier;
    assembled.finish_reason = body.status === 'incomplete' ? 'length' : calls.size ? 'tool_calls' : 'stop';
  };
  const consume = body => {
    if (body.error) throw providerError(body, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
    if (body.type === 'error') throw providerError(body, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
    const index = outputIndex(body);
    switch (body.type) {
      case 'response.web_search_call.in_progress':
      case 'response.web_search_call.searching':
      case 'response.web_search_call.completed':
        ingestSearch({ id: body.item_id, status: body.type.endsWith('.completed') ? 'completed' : body.type.endsWith('.searching') ? 'searching' : 'in_progress' }, index); break;
      case 'response.output_item.added': ingestItem(body.item,index); break;
      case 'response.output_item.done': ingestItem(body.item,index,true); break;
      case 'response.output_text.delta': textPart(index,body.content_index || 0,body.delta || '',true); break;
      case 'response.output_text.done': textPart(index,body.content_index || 0,body.text || ''); break;
      case 'response.refusal.delta': textPart(index,body.content_index || 0,body.delta || '',true); break;
      case 'response.refusal.done': textPart(index,body.content_index || 0,body.refusal || ''); break;
      case 'response.function_call_arguments.delta': {
        onActivity({type:'tool_delta'});
        const call = ensureCall(index,{ id: body.item_id, ...(body.call_id ? {call_id:body.call_id} : {}), ...(body.name ? {name:body.name} : {}) });
        call.arguments += body.delta || ''; refreshCalls(); break;
      }
      case 'response.function_call_arguments.done': ensureCall(index,{ id: body.item_id, arguments: body.arguments || '', ...(body.name ? {name:body.name} : {}) }); break;
      case 'response.reasoning_summary_part.added':
      case 'response.reasoning_summary_part.done':
        if (body.part?.type === 'summary_text') reasoningPart(index, body.summary_index ?? 0, body.part.text);
        break;
      case 'response.reasoning_summary_text.delta': reasoningPart(index, body.summary_index ?? 0, body.delta || '', true); break;
      case 'response.reasoning_summary_text.done': reasoningPart(index, body.summary_index ?? 0, body.text || ''); break;
      case 'response.completed':
      case 'response.incomplete': ingestResponse(body.response || {}); finished = true; break;
      case 'response.failed': throw providerError({ ...body.response, request_id: body.request_id || body.response?.request_id }, { transportStatus: response.status, requestId: response.headers.get('x-request-id') });
      default: if (Array.isArray(body.output) || typeof body.output_text === 'string') ingestResponse(body);
    }
  };

  if (/application\/json/i.test(response.headers.get('content-type') || '')) consume(await response.json());
  else {
    if (!response.body) throw new Error('API 未返回响应内容。');
    const decoder = new TextDecoder();
    const parser = new SSEDecoder(data => {
      if (data.trim() === '[DONE]') { finished = true; return; }
      if (finished) return;
      let event;
      try { event = JSON.parse(data); } catch { throw new Error('API 返回了无效的流式数据。'); }
      consume(event);
    });
    const reader = response.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        parser.push(decoder.decode(value,{stream:true}));
        if (finished) { await reader.cancel(); break; }
      }
      parser.push(decoder.decode(),true);
    } finally { reader.releaseLock(); }
  }
  refreshCalls();
  if (!['stop', 'tool_calls', 'length'].includes(assembled.finish_reason)) throw Object.assign(new Error('API 流未确认完成，未执行该响应中的工具调用。已保留实际收到的进度，请检查连接后重试。'), { code: 'INCOMPLETE_RESPONSE_STREAM', retryable: false });
  if (assembled.tool_calls?.some(call => !call.id || !call.function.name)) throw new Error('服务商返回的工具调用缺少 call_id 或名称。');
  for (const [index,call] of calls) if (items.has(index)) items.set(index,{...items.get(index),...call});
  if (items.size) assembled.response_items = [...items.entries()].sort((a,b)=>a[0]-b[0]).map(([,item])=>item);
  if (!assembled.content && !assembled.tool_calls?.length && !assembled.response_items?.some(item => item.type === 'web_search_call' && item.status === 'completed')) throw new Error('模型没有返回内容。请检查模型可用性或重新生成。');
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
    const workerURL = new URL('./python-worker.js', import.meta.url);
    workerURL.search = new URL(import.meta.url).search;
    this.worker = new Worker(workerURL, { type: 'module' });
    this.worker.onmessage = ({ data }) => {
      const job = this.pending.get(data.id);
      if (!job) return;
      if (data.type === 'status') { job.onStatus?.(data.message); return; }
      if (data.type === 'output') {
        if (['stdout', 'stderr'].includes(data.streamName) && typeof data.text === 'string' && data.text) job.onOutput?.(data.streamName, data.text);
        return;
      }
      clearTimeout(job.timer); this.pending.delete(data.id);
      if (data.type === 'error') job.reject(new Error(data.error)); else job.resolve(data.result);
    };
    this.worker.onerror = event => {
      const message = event.message || 'Python Worker 加载失败，请检查网络后重试。';
      this.terminate(new Error(message));
    };
  }
  run(code, files = [], onStatus, onOutput) {
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
        this.pending.set(id, { resolve, reject, timer, onStatus, onOutput });
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
