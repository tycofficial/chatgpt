import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
import { parseHTML } from 'linkedom';
import {
  ClassicChatAdapter, wrapNativeChatPreamble, wrapNativeClassicChatTiming,
  wrapNativeClassicTiming, wrapNativeReasoningGroups,
} from '../src/native-client/classic-chat-adapter.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url));
const plan = JSON.parse(read('src/native-client/entry-plan.json'));
const manifest = JSON.parse(read('original-client/resource-manifest.json'));
assert.equal(manifest.sourceBuild, plan.sourceBuild);
const captures = new Map(manifest.assets.map(asset => [asset.url, asset]));
// JrPc is in a lazy progress chunk. Read all factory tables without running their entries.
const progressChunk = '/cdn/assets/533131.b24809b2cb.js';
const factorySources = new Map();
for (const chunk of [...plan.registrationChunks, progressChunk]) {
  const captured = captures.get('https://chatgpt.com' + chunk);
  assert.ok(captured, 'Chunk was not in the published asset capture ' + chunk);
  const bytes = read('original-client/' + captured.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), captured.sha256, chunk);
  const source = bytes.toString('utf8');
  const { body } = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const { properties } = body.flatMap(statement => statement.declaration?.declarations ?? [])
    .find(declaration => declaration.id.name === '__webpack_modules__').init;
  for (const { key, value } of properties) {
    factorySources.set(key.name ?? key.value, { source, start: value.start, end: value.end, chunk });
  }
}

function originalFixture() {
  const { window, document } = parseHTML('<html><body></body></html>');
  const context = vm.createContext({
    window, document, location: new URL('https://fixture.test/chatgpt/'),
    URL, URLSearchParams, TextEncoder, TextDecoder, crypto: webcrypto,
  });
  const modules = new Map([['LF5P', { exports: {} }]]);
  function original(id) {
    if (modules.has(id)) return modules.get(id).exports;
    const record = factorySources.get(id);
    assert.ok(record, 'Original classifier dependency is absent ' + id);
    const { source, start, end, chunk } = record;
    const factory = vm.runInContext('(' + source.slice(start, end) + ')', context, { filename: chunk + '#' + id });
    const module = { id, exports: {} };
    modules.set(id, module);
    factory.call(module.exports, module, module.exports, original);
    return module.exports;
  }
  original.d = (exports, getters = {}, values = {}) => {
    for (const [name, get] of Object.entries(getters)) Object.defineProperty(exports, name, { get, enumerable: true, configurable: true });
    Object.assign(exports, values);
  };
  original.o = Object.hasOwn;
  original.n = value => { const get = () => value?.__esModule ? value.default : value; Object.defineProperty(get, 'a', { get }); return get; };
  original.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
  original.nmd = module => { module.paths = []; module.children ??= []; return module; };
  original.g = context;
  return original;
}

const raw = originalFixture();

function setup(status = 'inProgress') {
  const thread = { id: 'thread', createdAt: 1700, updatedAt: 1701, model: 'gpt-6-sol', adapterMetadata: {} };
  const turn = { id: 'turn', status, startedAt: 1700, model: 'gpt-6-sol', reasoningEffort: 'medium', items: [], adapterMetadata: { reasoningLifecycle: { startedAtMs: 1700000, completedAtMs: status === 'completed' ? 1702500 : null } } };
  thread.turns = [turn];
  return { thread, turn, adapter: new ClassicChatAdapter({ appServer: {}, models: {}, now: () => 1702500 }) };
}
const nativeItem = message => ({ item: message.content.content_type === 'thoughts' ? { type: 'reasoning', presentation: 'thought', content: message.content.thoughts.map(x => x.summary).join('\n'), completed: message.status !== 'in_progress' } : { type: 'assistant-message', content: message.content.parts.join('\n') }, sourceMessage: message, role: 'assistant', turnId: 'turn' });
const group = (messages, streaming) => raw('hUUF').b(messages.map(nativeItem), { isStreaming: streaming, clinicalSearchEnabled: false });

test('exact original classifier reproduces the former final-answer folding bug', () => {
  const { adapter, thread, turn } = setup('completed');
  const answer = { type: 'agentMessage', id: 'answer', text: 'Here is the actual result.' }; turn.items.push(answer);
  const message = adapter.message(thread, turn, answer, 'assistant');
  const old = { ...message, metadata: { ...message.metadata, ...adapter.reasoningMetadata(turn) } };
  assert.equal(group([old], false)[0].item.type, 'chatgpt-reasoning-group');
  assert.equal(group([message], false)[0].item.type, 'assistant-message');
});

test('ordinary text that sounds like thinking remains visible during streaming and after restore', () => {
  for (const status of ['inProgress', 'completed']) {
    const { adapter, thread, turn } = setup(status);
    const answer = { type: 'agentMessage', id: 'answer', text: 'Let me think through this. The result is 42.' }; turn.items.push(answer);
    const message = adapter.message(thread, turn, answer, 'assistant');
    assert.equal(message.channel, 'final');
    assert.equal(message.end_turn, status === 'completed');
    for (const field of ['reasoning_status', 'reasoning_group_id', 'reasoning_start_time', 'reasoning_end_time']) assert.equal(message.metadata[field], undefined);
    assert.equal(group([message], status === 'inProgress')[0].item.type, 'assistant-message');
    const restored = adapter.detail(structuredClone(thread)).mapping.answer.message;
    assert.equal(group([restored], status === 'inProgress')[0].item.type, 'assistant-message');
    assert.equal(restored.content.parts[0], answer.text);
  }
});

test('native Chat projection preserves intermediate and final body, keeps progress below it, and uses actual elapsed time', () => {
  const { adapter, thread, turn } = setup();
  thread.executionSurface = 'chat';
  const commentary = { type: 'agentMessage', id: 'progress', text: 'The first file is ready; checking the second.', phase: 'commentary' };
  const answer = { type: 'agentMessage', id: 'answer', text: 'Both files passed.', phase: 'final_answer' };
  const activeReasoning = { type: 'reasoning', id: 'reason-after', summary: [], status: 'inProgress', startedAtMs: 1700500 };
  turn.items.push(
    { type: 'userMessage', id: 'prompt', content: [{ type: 'text', text: 'Check both sample files.' }] },
    { type: 'reasoning', id: 'reason-before', summary: ['Actual earlier summary'], status: 'completed', startedAtMs: 1700000, completedAtMs: 1700500, durationMs: 500 },
    commentary,
    activeReasoning,
  );
  turn.adapterMetadata.completedItemIds = [commentary.id];
  const original = originalFixture();
  const wrap = (id, key, fn) => {
    const module = original(id);
    Object.defineProperty(module, key, { value: fn(module[key]) });
  };
  wrap('AuIy', 'o', wrapNativeChatPreamble);
  wrap('hUUF', 'b', wrapNativeReasoningGroups);
  wrap('R2pa', 'a', project => wrapNativeClassicTiming(wrapNativeClassicChatTiming(project)));
  const project = (detail, isStreaming) => original('G6Ip').a(detail, { isWorkConversation: false, isStreaming })[0].turn;
  const pendingPayload = adapter.detail(thread);
  const pendingThoughts = pendingPayload.mapping['reason-after'].message;
  assert.equal(pendingThoughts.metadata.reasoning_status, 'is_reasoning');
  assert.equal(pendingThoughts.metadata.reasoning_end_time, undefined);
  const publicParagraphs = node => Array.from(node.items.filter(item => item.type === 'assistant-message'))
    .flatMap(item => item.content.split('\n\n'));
  const checkPending = (detail, expectedBody) => {
    const pending = project(detail, true);
    assert.equal(pending.status, 'in_progress');
    assert.deepEqual(publicParagraphs(pending), expectedBody);
    const trailingProgress = pending.items.at(-1);
    assert.equal(trailingProgress.type, 'chatgpt-reasoning-group');
    assert.equal(trailingProgress.completed, false);
    const { status } = original('JrPc').a({ group: trailingProgress, family: 'chat', isLive: true, isBlocked: false });
    assert.equal(status.kind, 'standalone');
    assert.equal(status.content.kind, 'awaiting-fallback');
    assert.doesNotMatch(JSON.stringify(pending.items.filter(item => item.type === 'chatgpt-reasoning-group')), /The first file|Both files passed/);
  };
  checkPending(pendingPayload, [commentary.text]);
  turn.items.push(answer);
  checkPending(adapter.detail(thread), [commentary.text, answer.text]);

  turn.status = 'completed'; turn.adapterMetadata.reasoningLifecycle.completedAtMs = 1702500;
  activeReasoning.status = 'completed'; activeReasoning.durationMs = 2000;
  const ended = project(adapter.detail(structuredClone(thread)), false);
  assert.deepEqual(publicParagraphs(ended), [commentary.text, answer.text]);
  const thinking = ended.items.filter(item => item.type === 'chatgpt-reasoning-group');
  assert.match(JSON.stringify(thinking), /Actual earlier summary/);
  assert.doesNotMatch(JSON.stringify(thinking), /The first file|Both files passed/);
  assert(thinking.every(item => item.completed));
  assert.equal(ended.workCompletedAtMs - ended.workStartedAtMs, 2500);
});
