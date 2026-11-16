import test from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { createBrowserToolExecutor, workspacePath } from '../src/native-client/browser-tool-executor.mjs';
const models = createModelCatalogAdapter(catalog);
const memory = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const workspace = () => { const files = new Map(); return { files, async write(path, bytes) { files.set(path, new Uint8Array(bytes)); }, async read(path) { if (!files.has(path)) throw Error('File not found'); return files.get(path); }, async list(prefix) { return [...files].filter(([key]) => key.startsWith(prefix + '/')).map(([key, bytes]) => ({ name: key.slice(prefix.length + 1), size: bytes.length })); }, async remove(path) { if (!files.delete(path)) throw Error('File not found'); } }; };
const setup = (transport, options = {}) => new LocalAppServer({ storage: options.storage ?? memory(), streamCompletion: transport, readSettings: () => ({ model: 'gpt-6.1-sol', apiBase: 'https://fixture.invalid', apiKey: 'fixture-only' }), models, catalog, getExecutionPolicy: () => ({ modelSelection: true }), ...options });
function start(server, effort = 'high') { const tx = server.dispatch('thread/start', { model: 'gpt-6.1-sol', effort }); tx.afterReply(); return tx.result.thread.id; }
function terminal(server, threadId) { return new Promise(resolve => { const dispose = server.subscribe(event => { if (event.method === 'turn/completed' && event.params.threadId === threadId) { dispose(); resolve(event.params.turn); } }); }); }
function turn(server, threadId, extra = {}) { const tx = server.dispatch('turn/start', { threadId, clientUserMessageId: 'neutral-user', input: [{ type: 'text', text: 'Create the requested neutral artifact.' }], ...extra }); const done = terminal(server, threadId); tx.afterReply(); return done; }
const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });

test('real executor file operations, API tool feedback and length continuation preserve model and effort', async () => {
  const store = workspace(), executor = createBrowserToolExecutor({ storage: store }); let count = 0;
  const server = setup(async options => {
    assert.equal(options.settings.model, 'gpt-6.1-sol'); assert.equal(options.settings.reasoningEffort, 'high');
    count++;
    if (count === 1) return { content: 'I will create it.', tool_calls: [call('write-1', 'create_file', { name: 'probe.txt', content: 'neutral artifact' })], finish_reason: 'tool_calls', response_items: [{ type: 'reasoning', id: 'reasoning-fixture', encrypted_content: 'fixture' }] };
    assert(options.messages.some(message => message.role === 'tool' && message.tool_call_id === 'write-1'));
    assert(options.messages.some(message => message.response_items?.[0]?.id === 'reasoning-fixture'));
    if (count === 2) { options.onDelta('Part one', { content: 'Part one' }); return { content: 'Part one', finish_reason: 'length' }; }
    return { content: 'Part two, complete.', finish_reason: 'stop' };
  }, { toolExecutor: executor });
  const id = start(server), completed = await turn(server, id);
  assert.equal(completed.status, 'completed'); assert.equal(count, 3);
  assert.equal(new TextDecoder().decode(await store.read(encodeURIComponent(id) + '/probe.txt')), 'neutral artifact');
  const item = completed.items.find(item => item.type === 'mcpToolCall'); assert.equal(item.status, 'completed'); assert(Array.isArray(item.result.content));
  assert.equal(completed.adapterMetadata.checkpoint.metrics.length, 3);
  assert.equal(completed.items.filter(item => item.type === 'agentMessage').length, 3);
});

test('transient stream loss continues from actual saved partial, without rerunning completed tools', async () => {
  let requests = 0, executions = 0;
  const executor = { tools: [{ type: 'function', function: { name: 'fixture_tool' } }], async execute() { executions++; return { content: [{ type: 'text', text: 'Actual fixture result' }] }; } };
  const server = setup(async options => {
    if (++requests === 1) return { content: '', tool_calls: [call('once', 'fixture_tool', {})], finish_reason: 'tool_calls' };
    if (requests === 2) { options.onDelta('Saved partial', { content: 'Saved partial' }); throw Error('Network stream terminated'); }
    assert(options.messages.some(message => message.role === 'assistant' && message.content === 'Saved partial'));
    return { content: 'Continued final', finish_reason: 'stop' };
  }, { toolExecutor: executor });
  const completed = await turn(server, start(server)); assert.equal(completed.status, 'completed'); assert.equal(executions, 1); assert.equal(requests, 3);
});

test('reload resumes a checkpoint and retains completed tool outputs instead of executing them again', async () => {
  const storage = memory(); let executions = 0, notifySecond;
  const second = new Promise(resolve => notifySecond = resolve);
  const executor = { tools: [{ function: { name: 'fixture_tool' } }], async execute() { executions++; return { content: [{ type: 'text', text: 'Done once' }] }; } };
  let requests = 0;
  const server = setup(async options => {
    if (++requests === 1) return { tool_calls: [call('saved-tool', 'fixture_tool', {})], finish_reason: 'tool_calls' };
    notifySecond(); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  }, { storage, toolExecutor: executor });
  const id = start(server); const first = turn(server, id); await second; server.interrupt(id); await first;
  const restored = setup(async options => { assert(options.messages.some(m => m.role === 'tool' && m.tool_call_id === 'saved-tool')); return { content: 'Finished after reload', finish_reason: 'stop' }; }, { storage, toolExecutor: executor });
  const tx = restored.dispatch('turn/resume', { threadId: id }), done = terminal(restored, id); tx.afterReply(); assert.equal((await done).status, 'completed'); assert.equal(executions, 1);
});

test('tool errors reach the model as failed MCP results and can be repaired', async () => {
  let calls = 0; const executor = { tools: [{ function: { name: 'broken' } }], async execute() { throw Error('Real tool failure'); } };
  const server = setup(async options => { if (++calls === 1) return { tool_calls: [call('error-tool', 'broken', {})], finish_reason: 'tool_calls' }; assert.match(options.messages.at(-1).content, /Real tool failure/); return { content: 'Reported actual failure.', finish_reason: 'stop' }; }, { toolExecutor: executor });
  const completed = await turn(server, start(server)), item = completed.items.find(item => item.type === 'mcpToolCall'); assert.equal(item.status, 'failed'); assert.equal(item.result.isError, true); assert.equal(completed.status, 'completed');
});

test('Classic stream includes real intermediate/tool messages and detail retains all steps', async () => {
  let count = 0; const executor = createBrowserToolExecutor({ storage: workspace() });
  const server = setup(async () => ++count === 1 ? { content: 'Creating file.', tool_calls: [call('file', 'create_file', { name: 'answer.txt', content: 'Actual bytes' })], finish_reason: 'tool_calls' } : { content: 'File ready.', finish_reason: 'stop' }, { toolExecutor: executor });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const response = await adapter.handle(new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ action: 'next', model: 'auto', messages: [{ id: 'classic-neutral', author: { role: 'user' }, content: { content_type: 'text', parts: ['Create the neutral file.'] } }] }) }), '/f/conversation');
  const wire = await response.text(); assert.match(wire, /Actual bytes|answer.txt/); assert.match(wire, /message_stream_complete/); assert.match(wire, /\[DONE\]/);
  const detail = adapter.detail([...server.threads.values()][0]), messages = Object.values(detail.mapping).map(row => row.message).filter(Boolean); assert(messages.some(message => message.author.role === 'tool')); assert.equal(messages.filter(message => message.author.role === 'assistant' && message.content.content_type === 'text').length, 2); assert.equal(detail.default_model_slug, 'auto');
});

test('workspace rejects escaping paths and Fast UI state never enables unverified provider priority', async () => {
  assert.throws(() => workspacePath('../outside')); assert.throws(() => workspacePath('/etc/passwd')); assert.equal(workspacePath('/mnt/data/sub/file.txt'), 'sub/file.txt');
  const server = setup(async options => { assert.equal(options.settings.fastMode, false); assert.equal(options.settings.serviceTier, undefined); return { content: 'Fixture standard scheduling', finish_reason: 'stop' }; });
  const id = start(server), result = await turn(server, id, { serviceTier: 'fast' });
  assert.equal(result.status, 'completed'); assert.equal(server.getThread(id).serviceTier, 'fast'); assert.equal(server.settingsSnapshot(server.getThread(id)).serviceTier, 'fast');
  assert.equal(result.adapterMetadata.serviceTierExecution.apiServiceTier, null);
});

test('source stream-status/resume DTO reattaches a dropped reader without another API request', async () => {
  let requests = 0, release, entered; const started = new Promise(resolve => entered = resolve);
  const server = setup(async () => { requests++; entered(); return new Promise(resolve => release = () => resolve({ content: 'Actual resumed output', finish_reason: 'stop' })); });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const initial = await adapter.handle(new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ action: 'next', model: 'auto', messages: [{ id: 'drop-user', author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral stream probe'] } }] }) }), '/f/conversation');
  const reader = initial.body.getReader(); await reader.read(); await started; const thread = [...server.threads.values()][0]; await reader.cancel();
  assert.equal(server.running.size, 1);
  const status = await (await adapter.handle(new Request('http://fixture.invalid/conversation/' + thread.id + '/stream_status'), '/conversation/' + thread.id + '/stream_status')).json(); assert.equal(status.status, 'IS_STREAMING');
  const resumed = await adapter.handle(new Request('http://fixture.invalid/f/conversation/resume', { method: 'POST', body: JSON.stringify({ conversation_id: thread.id, offset: 0 }) }), '/f/conversation/resume');
  release(); assert.match(await resumed.text(), /Actual resumed output/); assert.equal(requests, 1);
  assert.equal((await (await adapter.handle(new Request('http://fixture.invalid/conversation/' + thread.id + '/stream_status'), '/conversation/' + thread.id + '/stream_status')).json()).status, 'COMPLETE');
});

test('a tool interrupted mid-execution is uncertain and is not automatically executed again on resume', async () => {
  const storage = memory(); let executions = 0, started; const entered = new Promise(resolve => started = resolve);
  const executor = { tools: [{ function: { name: 'nonidempotent' } }], async execute(_call, { signal }) { executions++; started(); return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); } };
  const original = setup(async () => ({ tool_calls: [call('uncertain-tool', 'nonidempotent', {})], finish_reason: 'tool_calls' }), { storage, toolExecutor: executor }); const id = start(original), first = turn(original, id); await entered; original.interrupt(id); await first;
  const restored = setup(async options => { assert.match(options.messages.at(-1).content, /Completion is unknown/); return { content: 'Reported the interrupted execution accurately.', finish_reason: 'stop' }; }, { storage, toolExecutor: executor });
  const tx = restored.dispatch('turn/resume', { threadId: id }), done = terminal(restored, id); tx.afterReply(); const result = await done;
  assert.equal(result.status, 'completed'); assert.equal(executions, 1); assert.equal(result.items.find(item => item.type === 'mcpToolCall').result.isError, true);
});

test('length-truncated function arguments are continued, not executed as a real tool call', async () => {
  let requests = 0, executions = 0;
  const executor = { tools: [{ function: { name: 'fixture_tool' } }], async execute() { executions++; return { content: [{ type: 'text', text: 'Actual result' }] }; } };
  const server = setup(async () => { requests++; if (requests === 1) return { tool_calls: [{ id: 'partial-call', type: 'function', function: { name: 'fixture_tool', arguments: '{"incomplete":' } }], finish_reason: 'length' }; if (requests === 2) return { tool_calls: [call('complete-call', 'fixture_tool', {})], finish_reason: 'tool_calls' }; return { content: 'Completed after valid arguments.', finish_reason: 'stop' }; }, { toolExecutor: executor });
  const result = await turn(server, start(server)); assert.equal(result.status, 'completed'); assert.equal(executions, 1); assert.equal(requests, 3);
});

test('nonretryable provider quota errors never loop and remain an explicitly manual checkpoint', async () => {
  let calls = 0;
  const server = setup(async () => { calls++; throw Object.assign(Error('network stream: insufficient account balance'), { status: 403, retryable: false, code: 'API_QUOTA_EXHAUSTED' }); });
  const id = start(server), result = await turn(server, id);
  assert.equal(calls, 1); assert.equal(result.status, 'failed'); assert.equal(result.adapterMetadata.resumePolicy, 'manual'); assert.equal(result.adapterMetadata.lastFailure.code, 'API_QUOTA_EXHAUSTED');
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  assert.equal((await (await adapter.handle(new Request('http://fixture.invalid/conversation/' + id + '/stream_status'), '/conversation/' + id + '/stream_status')).json()).status, 'UNAVAILABLE');
});

test('pagehide checkpoint remains unfinished in the exact source snapshot and resumes through source REST', async () => {
  const storage = memory(); let ready; const began = new Promise(resolve => ready = resolve);
  const original = setup(async options => { options.onDelta('Saved partial', { content: 'Saved partial' }); ready(); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })); }, { storage });
  const id = start(original), paused = turn(original, id); await began; original.interruptAll({ reason: 'pagehide' }); await paused;
  const restored = setup(async () => ({ content: 'Finished after reopening', finish_reason: 'stop' }), { storage });
  const adapter = new ClassicChatAdapter({ appServer: restored, models }), detail = adapter.detail(restored.getThread(id));
  assert.equal(detail.mapping[detail.current_node].message.end_turn, false);
  assert.equal((await (await adapter.handle(new Request('http://fixture.invalid/conversation/' + id + '/stream_status'), '/conversation/' + id + '/stream_status')).json()).status, 'FAILURE');
  const resumed = await adapter.handle(new Request('http://fixture.invalid/f/conversation/resume', { method: 'POST', body: JSON.stringify({ conversation_id: id, offset: 0 }) }), '/f/conversation/resume'); assert.match(await resumed.text(), /Finished after reopening/);
});

test('long model waits send source-compatible SSE ping events instead of pretending to output text', async () => {
  const server = setup(async () => { await new Promise(resolve => setTimeout(resolve, 30)); return { content: 'Actual delayed text', finish_reason: 'stop' }; });
  const adapter = new ClassicChatAdapter({ appServer: server, models, heartbeatMs: 5 });
  const response = await adapter.handle(new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ model: 'auto', messages: [{ id: 'heartbeat-user', author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral probe'] } }] }) }), '/f/conversation');
  const wire = await response.text(); assert.match(wire, /event: ping\ndata: \{\}/); assert.match(wire, /Actual delayed text/);
});

test('consecutive network failures are bounded across automatic resume attempts', async () => {
  let requests = 0; const server = setup(async () => { requests++; throw Error('Network stream disconnected'); }, { agentOptions: { streamRetries: 0, retryDelayMs: 0, maxConsecutiveFailures: 2 } });
  const id = start(server), first = await turn(server, id); assert.equal(first.adapterMetadata.resumePolicy, 'automatic');
  const tx = server.dispatch('turn/resume', { threadId: id }), done = terminal(server, id); tx.afterReply(); const second = await done;
  assert.equal(requests, 2); assert.equal(second.adapterMetadata.checkpoint.networkFailures, 2); assert.equal(second.adapterMetadata.resumePolicy, 'manual');
});

test('three Classic follow-up turns release execution and preserve per-turn model/history', async () => {
  const seen = [], server = setup(async options => {
    seen.push({ model: options.settings.model, effort: options.settings.reasoningEffort, history: structuredClone(options.messages) });
    return { content: 'Fixture completed turn ' + seen.length, finish_reason: 'stop' };
  });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const selections = [['gpt-6.1-sol', 'extended'], ['gpt-6-astra', 'xhigh'], ['gpt-6-luna', 'max']];
  let id;
  for (const [index, [model, thinking_effort]] of selections.entries()) {
    const response = await adapter.handle(new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ action: 'next', conversation_id: id, model, thinking_effort, messages: [{ id: 'followup-' + index, author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral follow-up ' + index] } }] }) }), '/f/conversation');
    const wire = await response.text(); assert.match(wire, /message_stream_complete/); assert.match(wire, /\[DONE\]/);
    id ??= [...server.threads.keys()][0]; assert.equal(server.running.size, 0); assert.equal(server.getThread(id).status.type, 'idle');
  }
  assert.equal(server.getThread(id).turns.length, 3); assert.deepEqual(seen.map(value => [value.model, value.effort]), [['gpt-6.1-sol', 'high'], ['gpt-6-astra', 'xhigh'], ['gpt-6-luna', 'max']]);
  assert(seen[2].history.some(message => message.content === 'Fixture completed turn 1')); assert(seen[2].history.some(message => message.content === 'Fixture completed turn 2'));
  const messages = Object.values(adapter.detail(server.getThread(id)).mapping).map(row => row.message).filter(message => message?.author.role === 'assistant');
  assert.deepEqual(messages.map(message => message.metadata.model_slug), selections.map(value => value[0])); assert(messages.every(message => message.end_turn));
});

test('Classic nonretryable403 releases the thread for a distinct follow-up without auto-resuming the failure', async () => {
  let calls = 0;
  const server = setup(async options => { if (++calls === 1) throw Object.assign(Error('Fixture insufficient balance'), { status: 403, code: 'API_QUOTA_EXHAUSTED', retryable: false }); assert.equal(options.settings.model, 'gpt-6-astra'); return { content: 'Fixture follow-up accepted', finish_reason: 'stop' }; });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const request = (id, clientId, model) => new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ action: 'next', conversation_id: id, model, thinking_effort: 'extended', messages: [{ id: clientId, author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral quota follow-up fixture'] } }] }) });
  const failure = await (await adapter.handle(request(undefined, 'before-quota', 'gpt-6.1-sol'), '/f/conversation')).text(), id = [...server.threads.keys()][0];
  assert.match(failure, /API_QUOTA_EXHAUSTED/); assert.doesNotMatch(failure, /message_stream_complete/); assert.equal(calls, 1); assert.equal(server.running.size, 0); assert.equal(server.getThread(id).status.type, 'idle');
  const followup = await (await adapter.handle(request(id, 'after-quota', 'gpt-6-astra'), '/f/conversation')).text(); assert.match(followup, /Fixture follow-up accepted/); assert.match(followup, /message_stream_complete/);
  assert.equal(calls, 2); assert.equal(server.getThread(id).turns[0].status, 'failed'); assert.equal(server.getThread(id).turns[0].adapterMetadata.resumePolicy, 'manual'); assert.equal(server.getThread(id).turns[1].status, 'completed');
});


test('Free execution policy fixes Luna and allows only low or explicitly selected Think medium', async () => {
  const seen = [], server = setup(async options => { seen.push([options.settings.model, options.settings.reasoningEffort]); return { content: 'Fixture free result', finish_reason: 'stop' }; }, { getExecutionPolicy: null });
  const tx = server.dispatch('thread/start', { model: 'gpt-6-astra', effort: 'ultra' }); tx.afterReply(); const id = tx.result.thread.id;
  assert.equal(server.getThread(id).model, 'gpt-6-luna'); assert.equal(server.getThread(id).reasoningEffort, 'low');
  const inputs = [{ model: 'gpt-6.1-sol', effort: 'max' }, { model: 'gpt-6-astra', effort: 'medium' }, { model: 'gpt-6-astra' }];
  for (const [i, selection] of inputs.entries()) { const result = await turn(server, id, { clientUserMessageId: 'free-policy-' + i, ...selection }); assert.equal(result.status, 'completed'); }
  assert.deepEqual(seen, [['gpt-6-luna', 'low'], ['gpt-6-luna', 'medium'], ['gpt-6-luna', 'low']]);
});

test('a Free account cannot resume a saved unrestricted-family checkpoint', async () => {
  let privileged = true, requests = 0;
  const server = setup(async () => { requests++; throw Object.assign(Error('Fixture403'), { status: 403, retryable: false }); }, { getExecutionPolicy: () => ({ modelSelection: privileged }) });
  const id = start(server), failed = await turn(server, id); assert.equal(failed.status, 'failed'); privileged = false;
  assert.throws(() => server.dispatch('turn/resume', { threadId: id }), { code: -32003 }); assert.equal(requests, 1);
});

test('provider priority is sent only after capability verification while source Fast remains selected', async () => {
  const server = setup(async options => { assert.equal(options.settings.fastMode, true); assert.equal(options.settings.serviceTier, 'priority'); assert.equal(options.settings.apiTransport, 'responses'); return { content: 'Fixture verified scheduling', finish_reason: 'stop' }; }, { agentOptions: { verifiedPriority: true } });
  const result = await turn(server, start(server), { serviceTier: 'fast' }); assert.equal(result.status, 'completed'); assert.equal(result.adapterMetadata.serviceTierExecution.apiServiceTier, 'priority');
});


test('native reason system hint selects Free medium while model and higher effort remain restricted', async () => {
  let captured;
  const server = setup(async options => { captured = [options.settings.model, options.settings.reasoningEffort]; return { content: 'Fixture native Think', finish_reason: 'stop' }; }, { getExecutionPolicy: null });
  const adapter = new ClassicChatAdapter({ appServer: server, models });
  const response = await adapter.handle(new Request('http://fixture.invalid/f/conversation', { method: 'POST', body: JSON.stringify({ model: 'gpt-6-astra', thinking_effort: 'ultra', system_hints: ['reason'], messages: [{ id: 'native-free-think', author: { role: 'user' }, content: { content_type: 'text', parts: ['Neutral Think fixture'] } }] }) }), '/f/conversation');
  assert.match(await response.text(), /Fixture native Think/); assert.deepEqual(captured, ['gpt-6-luna', 'medium']);
  const detail = adapter.detail([...server.threads.values()][0]); assert.equal(detail.mapping[detail.current_node].message.metadata.model_slug, 'gpt-6-luna');
});

test('account workspace namespaces isolate real file keys and artifact lookups while Admin keeps old paths', async () => {
  let account = 'guest'; const storage = workspace(), executor = createBrowserToolExecutor({ storage, getWorkspaceNamespace: () => account });
  const context = { threadId: 'fixture-thread', signal: new AbortController().signal };
  const first = await executor.execute(call('ns-1', 'create_file', { name: 'same.txt', content: 'guest bytes' }), context);
  assert(storage.files.has('account-guest--fixture-thread/same.txt')); assert.match(first.structuredContent.file.url, /account-guest--fixture-thread/);
  account = 'free-account'; await executor.execute(call('ns-2', 'create_file', { name: 'same.txt', content: 'free bytes' }), context);
  assert.equal(await (await executor.getArtifact('fixture-thread', 'same.txt')).text(), 'free bytes');
  const denied = await executor.handleArtifactRequest(new Request('http://fixture.invalid' + first.structuredContent.file.url)); assert.equal(denied.status, 404);
  account = null; await executor.execute(call('ns-3', 'create_file', { name: 'same.txt', content: 'admin bytes' }), context);
  assert(storage.files.has('fixture-thread/same.txt')); assert.equal(await (await executor.getArtifact('fixture-thread', 'same.txt')).text(), 'admin bytes');
});

test('unenabled Ultra fails explicitly without silently sending max or an unsupported ultra API enum', async () => {
  let calls = 0; const server = setup(async () => { calls++; throw Error('No Ultra transport should run'); });
  const id = start(server), result = await turn(server, id, { effort: 'ultra' });
  assert.equal(calls, 0); assert.equal(result.status, 'failed'); assert.equal(result.adapterMetadata.lastFailure.code, 'ULTRA_ORCHESTRATION_NOT_ENABLED');
});
