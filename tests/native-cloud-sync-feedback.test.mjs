import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeCloudSyncFeedback } from '../src/native-client/native-cloud-sync-feedback.mjs';

function fixture(overrides = {}) {
  let owner = 'site-user:neutral-a', ready = false;
  const tasks = new Map(), calls = [], closed = [], retries = [], resolutions = [];
  let nextTimer = 1;
  const toaster = {
    warning: (title, options) => emit('warning', title, options),
    danger: (title, options) => emit('danger', title, options),
    closeAll: () => { throw Error('Must not close unrelated native notifications'); },
  };
  const emit = (level, title, options) => {
    const call = { level, title, options }; calls.push(call);
    return { close() { closed.push(call); options.onRemove?.(); } };
  };
  const target = new EventTarget();
  const helper = createNativeCloudSyncFeedback({
    ownerId: owner, getOwnerId: () => owner,
    getToaster: () => ready ? toaster : null,
    onRetry: async event => { retries.push(event); },
    onResolveConflict: async (id, choice, context) => { resolutions.push({ id, choice, context }); }, eventTarget: target,
    setTimer: callback => { const id = nextTimer++; tasks.set(id, callback); return id; },
    clearTimer: id => tasks.delete(id),
    ...overrides,
  });
  return { helper, calls, closed, retries, resolutions, toaster, target, tasks,
    setOwner(value) { owner = value; }, setReady(value = true) { ready = value; },
    tick() { const callbacks = [...tasks.values()]; tasks.clear(); for (const callback of callbacks) callback(); },
    report(kind = 'failure', extra = {}) { return helper.report({ ownerId: 'site-user:neutral-a', kind, ...(kind === 'conflict' ? { conversationId: 'conversation-neutral' } : {}), ...extra }); },
  };
}
const nextMicrotask = () => new Promise(resolve => queueMicrotask(resolve));

test('unready native service queues at most two generic kinds, deduplicates and uses one readiness timer', () => {
  const f = fixture();
  for (let index = 0; index < 50; index++) { f.report('failure'); f.report('conflict'); }
  assert.equal(f.calls.length, 0); assert.equal(f.tasks.size, 1);
  assert.deepEqual(f.helper.getState(), { disposed: false, pendingCount: 2, notifiedCount: 0, retryingCount: 0 });
  f.setReady(); f.tick(); assert.equal(f.calls.length, 2); assert.equal(f.tasks.size, 0);
  assert.deepEqual(f.calls.map(call => call.level), ['danger', 'warning']);
  assert.ok(f.calls.every(call => call.options.duration === 0));
  assert.equal(f.calls[0].options.primaryAction.label, '重试');
  assert.equal(f.calls[1].options.primaryAction.label, '保留此设备版本');
  assert.equal(f.calls[1].options.secondaryAction.label, '使用云端版本');
  assert.equal(f.calls[1].options.hasCloseButton, false);
  f.helper.dispose(); assert.equal(f.closed.length, 2);
});

test('raw error text, owner identifiers, titles, prompts and content are never forwarded to native UI', () => {
  const f = fixture(); f.setReady();
  f.report('failure', { error: new Error('PRIVATE_ERROR_SENTINEL'), message: 'PRIVATE_PROMPT_SENTINEL', title: 'PRIVATE_TITLE_SENTINEL', document: { text: 'PRIVATE_DOCUMENT_SENTINEL' } });
  const forwarded = JSON.stringify(f.calls.map(call => ({ level: call.level, title: call.title, options: call.options })));
  assert.equal(/PRIVATE_|neutral-a/.test(forwarded), false);
  assert.equal(f.calls[0].title, '聊天记录尚未同步');
  f.helper.dispose();
});

test('oversized local histories have a deduplicated warning without a futile retry action', () => {
  const f = fixture(); f.setReady();
  assert.equal(f.report('oversized', { document: { text: 'PRIVATE_OVERSIZED_TEXT' } }).status, 'notified');
  assert.equal(f.report('oversized').status, 'deduplicated');
  const [notice] = f.calls;
  assert.equal(f.calls.length, 1);
  assert.equal(notice.level, 'warning');
  assert.match(notice.options.description, /超过云端同步上限/);
  assert.equal(notice.options.primaryAction, undefined);
  assert.equal(JSON.stringify(notice.options).includes('PRIVATE_OVERSIZED_TEXT'), false);
  f.helper.clear('oversized');
  assert.equal(f.closed.length, 1);
  f.helper.dispose();
});

test('callbacks for a foreign owner or unknown kind cannot enter the queue', () => {
  const f = fixture(); f.setReady();
  assert.equal(f.report('failure', { ownerId: 'site-user:neutral-b' }).status, 'ignored');
  assert.equal(f.report('success').status, 'ignored'); assert.equal(f.helper.report(null).status, 'ignored');
  assert.equal(f.calls.length, 0); assert.equal(f.tasks.size, 0); f.helper.dispose();
});

test('owner switch before native readiness disposes queued messages and cancels the poll', () => {
  const f = fixture(); f.report(); f.setOwner('site-user:neutral-b'); f.setReady(); f.tick();
  assert.equal(f.calls.length, 0); assert.equal(f.tasks.size, 0); assert.equal(f.helper.getState().disposed, true);
  assert.equal(f.report().status, 'ignored');
});

test('owner switch after notification closes only owned handles and disables their old actions', async () => {
  const f = fixture(); f.setReady(); f.report();
  f.setOwner('site-user:neutral-b'); await f.calls[0].options.primaryAction.onClick();
  assert.equal(f.closed.length, 1); assert.equal(f.retries.length, 0); assert.equal(f.helper.getState().disposed, true);
});

test('retries are owner-bound and coalesced; promise resolution never fabricates synchronized success', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }); let count = 0;
  const f = fixture({ onRetry: event => { ++count; assert.equal(event.ownerId, 'site-user:neutral-a'); return pending; } });
  f.setReady(); f.report(); const action = f.calls[0].options.primaryAction.onClick;
  const first = action(), second = action(); await nextMicrotask(); assert.equal(count, 1);
  release(); await Promise.all([first, second]);
  assert.equal(f.closed.length, 0); assert.equal(f.helper.getState().notifiedCount, 1);
  assert.equal(f.calls.length, 1); f.helper.dispose();
});

test('retry rejection is contained and does not display private failure data or a success signal', async () => {
  const f = fixture({ onRetry: async () => { throw Error('PRIVATE_RETRY_ERROR'); } }); f.setReady(); f.report();
  await assert.doesNotReject(f.calls[0].options.primaryAction.onClick());
  assert.equal(f.calls.length, 1); assert.equal(f.closed.length, 0); f.helper.dispose();
});

test('pagehide disposes owned native notifications, cancels queued work and aborts an in-flight retry', async () => {
  let signal;
  const f = fixture({ onRetry: event => { signal = event.signal; return new Promise(resolve => event.signal.addEventListener('abort', resolve, { once: true })); } });
  f.setReady(); f.report(); const promise = f.calls[0].options.primaryAction.onClick(); await nextMicrotask();
  assert.equal(signal.aborted, false); f.target.dispatchEvent(new Event('pagehide'));
  assert.equal(signal.aborted, true); await promise; assert.equal(f.closed.length, 1); assert.equal(f.tasks.size, 0);
  assert.equal(f.helper.getState().disposed, true);
});

test('a cached page keeps its sync feedback and still tears down on a later real departure', async () => {
  const f = fixture(); f.setReady(); f.report();
  f.target.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
  assert.equal(f.helper.getState().disposed, false);
  await f.calls[0].options.primaryAction.onClick();
  assert.equal(f.retries.length, 1);
  f.target.dispatchEvent(new Event('pagehide'));
  assert.equal(f.helper.getState().disposed, true);
  assert.equal(f.closed.length, 1);
});

test('explicit logout disposal is idempotent and a late retry completion cannot act on a new account', async () => {
  let done; const result = new Promise(resolve => { done = resolve; }); let actionCalls = 0;
  const f = fixture({ onRetry: async () => { ++actionCalls; await result; } }); f.setReady(); f.report();
  const oldAction = f.calls[0].options.primaryAction.onClick, promise = oldAction(); await nextMicrotask();
  f.helper.dispose(); f.helper.dispose(); f.setOwner('site-user:neutral-b'); done(); await promise; await oldAction();
  assert.equal(actionCalls, 1); assert.equal(f.closed.length, 1); assert.equal(f.calls.length, 1);
});

test('native user dismissal remains deduplicated until explicit confirmed resolution clears a kind', () => {
  const f = fixture(); f.setReady(); f.report();
  f.calls[0].options.onRemove();
  assert.equal(f.report().status, 'deduplicated'); assert.equal(f.calls.length, 1);
  f.helper.clear('failure'); f.report(); assert.equal(f.calls.length, 2); f.helper.dispose();
});

test('clear of a queued kind prevents stale readiness delivery and preserves another unresolved kind', () => {
  const f = fixture(); f.report('failure'); f.report('conflict'); f.helper.clear('failure');
  f.setReady(); f.tick(); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].level, 'warning');
  f.helper.clear(); assert.equal(f.closed.length, 1); assert.equal(f.tasks.size, 0); f.helper.dispose();
});

test('native service errors leave feedback queued for later real registration', () => {
  let broken = true;
  const f = fixture({ getToaster: () => { if (broken) throw Error('PRIVATE_TOASTER_ERROR'); return f.toaster; } });
  assert.equal(f.report().status, 'queued'); broken = false; f.tick();
  assert.equal(f.calls.length, 1); assert.equal(f.tasks.size, 0); f.helper.dispose();
});

test('native service replacement rebinds unresolved feedback and closes only its old handle', () => {
  let chosen; const f = fixture({ getToaster: () => chosen }); chosen = f.toaster; f.report();
  const otherCalls = [];
  chosen = { danger: (title, options) => { otherCalls.push({ title, options }); return { close() {} }; }, warning() {} };
  assert.equal(f.helper.flush(), 1); assert.equal(f.closed.length, 1); assert.equal(otherCalls.length, 1);
  assert.equal(f.helper.flush(), 0); f.helper.dispose();
});

test('identity getter failure closes existing feedback instead of binding it to a later owner', () => {
  let broken = false;
  const f = fixture({ getOwnerId: () => { if (broken) throw Error('neutral'); return 'site-user:neutral-a'; } });
  f.setReady(); f.report(); broken = true; f.helper.flush(); assert.equal(f.closed.length, 1); assert.equal(f.helper.getState().disposed, true);
});

test('identity change inside service delivery immediately closes the just-returned handle', () => {
  let closed = 0;
  const f = fixture({ getToaster: () => ({ warning() {}, danger() { f.setOwner('site-user:neutral-b'); return { close() { ++closed; } }; } }) });
  assert.equal(f.report().status, 'ignored'); assert.equal(closed, 1); assert.equal(f.helper.getState().disposed, true);
});

test('each conflict action forwards its exact neutral conversation and explicit choice without auto-clearing', async () => {
  const f = fixture(); f.setReady(); f.report('conflict', { conversationId: 'neutral-local' }); f.report('conflict', { conversationId: 'neutral-remote' });
  await f.calls[0].options.primaryAction.onClick(); await f.calls[1].options.secondaryAction.onClick();
  assert.deepEqual(f.resolutions.map(item => [item.id, item.choice]), [['neutral-local', 'local'], ['neutral-remote', 'remote']]);
  assert.equal(f.helper.getState().notifiedCount, 2); assert.equal(f.closed.length, 0);
  f.helper.clear('conflict', 'neutral-local'); assert.equal(f.closed.length, 1); assert.equal(f.helper.getState().notifiedCount, 1);
  f.helper.dispose();
});

test('conflict decisions coalesce both buttons while pending and stay owner-bound', async () => {
  let finish, signal, decisions = 0;
  const f = fixture({ onResolveConflict: (id, choice, context) => { assert.equal(id, 'conversation-neutral'); assert.equal(choice, 'local'); signal = context.signal; ++decisions; return new Promise(resolve => { finish = resolve; }); } });
  f.setReady(); f.report('conflict'); const actions = f.calls[0].options;
  const first = actions.primaryAction.onClick(), second = actions.secondaryAction.onClick(); await nextMicrotask();
  assert.equal(decisions, 1); f.setOwner('site-user:neutral-b'); f.helper.flush(); assert.equal(signal.aborted, true);
  finish(); await Promise.all([first, second]); await actions.secondaryAction.onClick(); assert.equal(decisions, 1);
});

test('deleted remote conflict keeps two native choices and passes the deletion fact to the coordinator', async () => {
  const f = fixture(); f.setReady(); f.report('conflict', { remoteDeleted: true });
  assert.ok(f.calls[0].options.description.includes('云端已删除'));
  await f.calls[0].options.primaryAction.onClick();
  assert.equal(f.resolutions[0].choice, 'local'); assert.equal(f.resolutions[0].context.remoteDeleted, true);
  assert.equal(f.resolutions[0].id, 'conversation-neutral');
  // Creation of a NEW ID for local retention is the real coordinator's job,
  // not a fabricated success or resurrection performed by this UI adapter.
  assert.equal(f.closed.length, 0); f.helper.dispose();
});

test('five bounded conflict notices never silently resolve or discard an overflow decision', async () => {
  const f = fixture();
  for (let index = 0; index < 5; index++) assert.equal(f.report('conflict', { conversationId: 'bounded-' + index }).status, 'queued');
  assert.equal(f.report('conflict', { conversationId: 'bounded-5' }).status, 'overflow');
  f.report('failure'); assert.equal(f.helper.getState().pendingCount, 6); assert.equal(f.tasks.size, 1);
  assert.equal(f.resolutions.length, 0); f.helper.clear('conflict', 'bounded-0');
  assert.equal(f.report('conflict', { conversationId: 'bounded-5' }).status, 'queued');
  f.setReady(); f.tick(); assert.equal(f.calls.length, 6); assert.equal(f.resolutions.length, 0); f.helper.dispose();
});

test('a changed remote deletion fact replaces only that notice and old callback instances cannot act', async () => {
  const f = fixture(); f.setReady(); f.report('conflict', { remoteDeleted: false });
  const oldAction = f.calls[0].options.primaryAction.onClick;
  f.report('conflict', { remoteDeleted: true }); assert.equal(f.calls.length, 2); assert.equal(f.closed.length, 1);
  await oldAction();
  // The entry still exists; an old rendered callback must not submit an action
  // after its remote state was replaced. This is tested below by generation.
  assert.equal(f.resolutions.length, 0); f.helper.dispose();
});

test('same-owner conversation labels distinguish the two version choices and remain bounded Unicode plain text', async () => {
  const f = fixture(); f.setReady();
  f.report('conflict', { conversationId: 'label-one', conversationLabel: '财务报表 👩‍💻' });
  f.report('conflict', { conversationId: 'label-two', conversationLabel: '项目二 ' + '🙂'.repeat(140) });
  assert.ok(f.calls[0].options.description.startsWith('对话：财务报表 👩‍💻。'));
  const secondLabel = f.calls[1].options.description.split('。')[0].slice('对话：'.length);
  assert.equal(Array.from(secondLabel).length, 120); assert.ok(secondLabel.endsWith('🙂'));
  await f.calls[0].options.primaryAction.onClick(); await f.calls[1].options.secondaryAction.onClick();
  assert.deepEqual(f.resolutions.map(item => [item.id, item.choice]), [['label-one', 'local'], ['label-two', 'remote']]);
  f.report('conflict', { conversationId: 'label-one', conversationLabel: '已重命名的对话' });
  assert.equal(f.closed.length, 1); assert.ok(f.calls.at(-1).options.description.startsWith('对话：已重命名的对话。'));
  f.helper.dispose();
});

test('labels cannot inject HTML or controls; arbitrary private remote errors and foreign-owner labels are ignored', () => {
  const f = fixture(); f.setReady();
  f.report('conflict', { conversationId: 'plain-label', conversationLabel: '<b> 项目 </b>\u0000\n\u202e<svg onload="untrusted()"></svg>', error: { message: 'PRIVATE_REMOTE_ERROR_SENTINEL' }, description: '<script>PRIVATE_DESCRIPTION_SENTINEL</script>', title: 'PRIVATE_TITLE_SENTINEL' });
  const description = f.calls[0].options.description;
  assert.ok(description.startsWith('对话：项目。')); assert.equal(/[<>\u0000-\u001f\u202a-\u202e]/.test(description), false);
  const nativeText = JSON.stringify(f.calls.map(call => ({ title: call.title, options: call.options })));
  assert.equal(/PRIVATE_|onload|untrusted/.test(nativeText), false);
  assert.equal(f.report('conflict', { ownerId: 'site-user:foreign', conversationId: 'foreign', conversationLabel: 'FOREIGN_LABEL_SENTINEL' }).status, 'ignored');
  assert.equal(f.calls.length, 1);
  let coercions = 0;
  f.report('conflict', { conversationId: 'object-label', conversationLabel: { toString() { ++coercions; return 'PRIVATE_OBJECT_SENTINEL'; } } });
  assert.equal(coercions, 0); assert.ok(f.calls[1].options.description.startsWith('对话：未命名对话。'));
  f.helper.dispose();
});
