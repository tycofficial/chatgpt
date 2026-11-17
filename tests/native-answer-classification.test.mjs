import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassicChatAdapter } from '../src/native-client/classic-chat-adapter.mjs';
import { groupOriginalMessages, originalGroupingProof } from './support/original-reasoning-group.mjs';

function setup(status = 'inProgress') {
  const thread = { id: 'thread', createdAt: 1700, updatedAt: 1701, model: 'gpt-6-sol', adapterMetadata: {} };
  const turn = { id: 'turn', status, startedAt: 1700, model: 'gpt-6-sol', reasoningEffort: 'medium', items: [], adapterMetadata: { reasoningLifecycle: { startedAtMs: 1700000, completedAtMs: status === 'completed' ? 1702500 : null } } };
  thread.turns = [turn];
  return { thread, turn, adapter: new ClassicChatAdapter({ appServer: {}, models: {}, now: () => 1702500 }) };
}
const nativeItem = message => ({ item: message.content.content_type === 'thoughts' ? { type: 'reasoning', presentation: 'thought', content: message.content.thoughts.map(x => x.summary).join('\n'), completed: message.status !== 'in_progress' } : { type: 'assistant-message', content: message.content.parts.join('\n') }, sourceMessage: message, role: 'assistant', turnId: 'turn' });
const group = (messages, streaming) => groupOriginalMessages(messages.map(nativeItem), { isStreaming: streaming, clinicalSearchEnabled: false });

test('exact original classifier reproduces the former final-answer folding bug', () => {
  const { adapter, thread, turn } = setup('completed');
  const answer = { type: 'agentMessage', id: 'answer', text: 'Here is the actual result.' }; turn.items.push(answer);
  const message = adapter.message(thread, turn, answer, 'assistant');
  const old = { ...message, metadata: { ...message.metadata, ...adapter.reasoningMetadata(turn) } };
  assert.equal(group([old], false)[0].item.type, 'chatgpt-reasoning-group');
  assert.equal(group([message], false)[0].item.type, 'assistant-message');
  assert.equal(originalGroupingProof.factories, 167);
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

test('original v5 ordering places a live thinking group after genuine intermediate commentary', () => {
  const { adapter, thread, turn } = setup();
  turn.items.push(
    { type: 'reasoning', id: 'reason-before', summary: ['Actual earlier summary'], status: 'completed', startedAtMs: 1700000, completedAtMs: 1700500, durationMs: 500 },
    { type: 'agentMessage', id: 'progress', text: 'The first file is ready; checking the second.', phase: 'commentary' },
    { type: 'reasoning', id: 'reason-after', summary: [], status: 'inProgress', startedAtMs: 1700500 },
  );
  const messages = turn.items.flatMap(item => adapter.projectItem(thread, turn, item));
  const grouped = group(messages, true);
  assert.deepEqual(Array.from(grouped, value => value.item.type), ['chatgpt-reasoning-group', 'assistant-message', 'chatgpt-reasoning-group']);
  assert.equal(grouped[1].sourceMessage.content.parts[0], turn.items[1].text);
  assert.equal(grouped[2].item.completed, false);
  assert.equal(messages[2].metadata.reasoning_status, 'is_reasoning');
  assert.equal(messages[2].metadata.reasoning_end_time, undefined);
  turn.status = 'completed'; turn.adapterMetadata.reasoningLifecycle.completedAtMs = 1702500;
  turn.items[2].status = 'completed'; turn.items[2].durationMs = 2000;
  turn.items.push({ type: 'agentMessage', id: 'answer', text: 'Both files passed.' });
  const ended = group(turn.items.flatMap(item => adapter.projectItem(thread, turn, item)), false);
  assert.equal(ended.at(-1).item.type, 'assistant-message');
  assert.equal(ended.at(-1).sourceMessage.content.parts[0], 'Both files passed.');
  assert(ended.filter(x => x.item.type === 'chatgpt-reasoning-group').every(x => x.item.completed));
});
