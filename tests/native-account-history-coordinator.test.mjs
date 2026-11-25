import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalAppServer } from '../src/native-client/local-app-server.mjs';
import { createChatHistorySync, createIndexedDBChatHistoryStore, projectChatHistoryThread } from '../src/native-client/chat-history-sync.mjs';
import { createAccountHistoryCoordinator } from '../src/native-client/account-history-coordinator.mjs';
import { syncFixture, nativeDocument, mutation, save } from '../chatgpt-services/tests/chat-sync-fixture.mjs';
const copy = value => structuredClone(value);
const gate = () => { let release, enter; return { entered: new Promise(resolve => { enter = resolve; }), waiting: new Promise(resolve => { release = resolve; }), enter: () => enter(), release: () => release() }; };
function store() {
  const states = new Map(); let chain = Promise.resolve();
  return { states, failNext: false, load: async key => { await chain; return copy(states.get(key)); },
    transact(key, action) { const next = chain.catch(() => {}).then(() => { const state = copy(states.get(key) ?? { schemaVersion: 1, cursor: null, heads: {}, known: {}, outbox: [], conflicts: {}, localIds: [] }); const result = action(state); if (this.failNext) { this.failNext = false; throw Error('Neutral durable outbox failure'); } states.set(key, state); return copy(result); }); chain = next.catch(() => {}); return next; } };
}
function storage(threads) {
  const values = new Map([['cg-original-app-server:v1', JSON.stringify({ schemaVersion: 1, threads })]]);
  return { values, failNext: false, getItem: key => values.get(key) ?? null, setItem(key, value) { if (this.failNext) { this.failNext = false; throw Error('Neutral native quota failure'); } values.set(key, String(value)); } };
}
async function fixture(t, documents = [], stateStore = store()) {
  const backend = await syncFixture(); t.after(() => backend.DB.raw.close());
  const disk = storage(documents), calls = [], events = [], clear = [], applied = [], trace = [], timers = new Map();
  let identity = { ownerId: backend.alice.user.id, accountId: backend.alice.user.accountId, namespace: 'neutral-history-a' }, nextTimer = 0, coordinator;
  const network = { online: true, before: null, after: null }, eventTarget = new EventTarget(); eventTarget.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const app = new LocalAppServer({ storage: disk, streamCompletion: () => { throw Error('No model execution allowed'); }, readSettings: () => ({}), models: {}, catalog: {} });
  const createSync = () => {
    const engine = createChatHistorySync({ baseURL: 'https://neutral-sync.test', getIdentity: () => identity, getSessionToken: () => backend.alice.token, store: stateStore,
      fetchImpl: async (input, options) => {
        const url = new URL(input), body = options.body ? JSON.parse(options.body) : undefined;
        calls.push({ path: url.pathname, method: options.method, body: copy(body) });
        if (!network.online) throw Error('Neutral offline');
        await network.before?.(url, options);
        const response = await backend.call(url.pathname + url.search, { method: options.method, token: options.headers.Authorization.slice(7), body });
        await network.after?.(url, options, response); return response;
      }, requestTimeoutMs: 5000,
    });
    for (const name of ['capture', 'acknowledgeApplied', 'dispose']) {
      const original = engine[name].bind(engine);
      engine[name] = (...args) => { trace.push({ method: name, input: copy(args[0]) }); return original(...args); };
    }
    return engine;
  };
  coordinator = createAccountHistoryCoordinator({ appServer: app, createSync, getIdentity: () => identity, projectThread: projectChatHistoryThread,
    onFeedback: event => events.push(event), onClearFeedback: event => clear.push(event), onApplied: changes => applied.push(changes), eventTarget,
    timers: { setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; }, clearTimeout: id => timers.delete(id) },
  });
  app.onPersist = records => coordinator.capture(records);
  t.after(() => coordinator.dispose());
  return { backend, app, disk, stateStore, calls, events, clear, applied, trace, network, eventTarget, timers, coordinator, createSync,
    identity: () => copy(identity), changeOwner() { identity = { ...identity, ownerId: 'foreign-owner' }; },
    edit(id, text) { const doc = app.threads.get(id); doc.name = text; doc.turns[0].items.at(-1).text = text; doc.updatedAt++; app.persist(); },
  };
}
const cloud = async (f, id) => (await (await f.backend.call('/sync/conversations/' + id, { token: f.backend.alice.token })).json());

test('pre-mount start applies genuine remote JSON through native disk and captures/acks the SAME S1 exactly', async t => {
  const f = await fixture(t), doc = nativeDocument('remote-start');
  await save(f.backend, f.backend.alice, doc.id, mutation(projectChatHistoryThread(doc)));
  const result = await f.coordinator.start(); assert.equal(result.ready, true); assert.equal(result.pending, false);
  assert.equal(f.app.threads.get(doc.id).turns[0].items.at(-1).text, '已完成。');
  assert.deepEqual(JSON.parse(f.disk.getItem(f.app.storageKey)).threads, [...f.app.threads.values()]);
  const ack = f.trace.findLast(entry => entry.method === 'acknowledgeApplied'), before = f.trace[f.trace.indexOf(ack) - 1];
  assert.equal(before.method, 'capture'); assert.deepEqual(before.input, ack.input);
  assert.equal(f.applied[0].added[0], doc.id); assert.equal(f.calls.filter(call => call.method === 'DELETE').length, 0);
});

test('startup applies account history with an oversized local thread and clears its warning when it can sync', async t => {
  const oversized = nativeDocument('oversized-local-kept');
  oversized.turns[0].items[0].text = '中'.repeat(180000);
  const f = await fixture(t, [oversized]);
  const other = nativeDocument('normal-remote-restored');
  await save(f.backend, f.backend.alice, other.id, mutation(projectChatHistoryThread(other)));

  const started = await f.coordinator.start();
  assert.equal(started.ready, true);
  assert.equal(started.oversizedCount, 1);
  assert.equal(started.lastErrorCode, 'SYNC_DOCUMENT_TOO_LARGE');
  assert.equal(started.pendingCaptures, 0);
  assert.equal(started.deferred, false);
  assert.equal(started.pending, false);
  assert.deepEqual(f.app.threads.get(oversized.id), oversized);
  assert.deepEqual(JSON.parse(f.disk.getItem(f.app.storageKey)).threads.find(record => record.id === oversized.id), oversized);
  assert.equal(f.app.threads.has(other.id), true);
  assert.deepEqual(f.events.map(event => event.kind), ['oversized']);
  assert.ok(f.calls.every(call => call.method === 'GET'));

  f.edit(oversized.id, 'Now fits the budget');
  const synced = await f.coordinator.synchronize();
  assert.equal(synced.oversizedCount, 0);
  assert.equal(synced.lastErrorCode, null);
  assert.ok(f.clear.some(event => event.kind === 'oversized'));
  assert.equal((await cloud(f, oversized.id)).document.name, 'Now fits the budget');
});

test('an existing conflict cannot publish an older local copy while the visible conversation is oversized', async t => {
  const original = nativeDocument('existing-conflict-grows');
  const f = await fixture(t, [original]);
  await f.coordinator.start();
  f.edit(original.id, 'Local conflict edit');
  await f.coordinator.whenIdle();
  const remote = projectChatHistoryThread({ ...original, name: 'Cloud conflict edit' });
  assert.equal((await save(f.backend, f.backend.alice, original.id, mutation(remote, 1))).status, 200);
  assert.equal((await f.coordinator.synchronize()).conflictCount, 1);
  assert.ok(f.events.some(event => event.kind === 'conflict'));

  f.edit(original.id, '中'.repeat(180000));
  await f.coordinator.whenIdle();
  const fullCopy = copy(f.app.threads.get(original.id));
  const before = f.calls.filter(call => call.method === 'PUT').length;
  assert.ok(f.clear.some(event => event.kind === 'conflict' && event.conversationId === original.id));
  for (const decision of ['local', 'remote']) {
    const result = await f.coordinator.resolveConflict(original.id, decision);
    assert.equal(result.ok, false);
    assert.equal(result.lastErrorCode, 'SYNC_DOCUMENT_TOO_LARGE');
  }
  await assert.rejects(f.coordinator.sync.resolveConflict(original.id, 'local'), { code: 'SYNC_DOCUMENT_TOO_LARGE' });
  assert.deepEqual(f.app.threads.get(original.id), fullCopy);
  assert.deepEqual((await cloud(f, original.id)).document, remote);
  assert.equal(f.calls.filter(call => call.method === 'PUT').length, before);

  f.edit(original.id, 'A smaller local conflict edit');
  await f.coordinator.whenIdle();
  assert.equal((await f.coordinator.resolveConflict(original.id, 'remote')).ok, true);
  assert.equal(f.app.threads.get(original.id).name, remote.name);
});

test('a stalled IndexedDB open releases pre-mount history and preserves the local copy', { timeout: 3000 }, async t => {
  let request, closed = 0;
  const indexedDB = { open() { return request = { result: { close() { closed++; } } }; } };
  const stateStore = createIndexedDBChatHistoryStore({ indexedDB, timeoutMs: 25 });
  const doc = nativeDocument('local-before-indexeddb-timeout');
  const f = await fixture(t, [doc], stateStore);
  const before = f.disk.getItem(f.app.storageKey);

  const result = await f.coordinator.start();
  assert.equal(result.ok, false);
  assert.equal(result.ready, false);
  assert.equal(result.restartNeeded, true);
  assert.equal(result.lastErrorCode, 'SYNC_LOCAL_STORAGE_TIMEOUT');
  assert.deepEqual(f.app.threads.get(doc.id), doc);
  assert.equal(f.disk.getItem(f.app.storageKey), before);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.applied, []);

  request.onsuccess();
  assert.equal(closed, 1);
});

test('onPersist clones immediately, queues every capture and a bounded debounce sends the latest native version', async t => {
  const doc = nativeDocument('captures'); const f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'version-one'); f.edit(doc.id, 'version-two'); await f.coordinator.whenIdle();
  const captured = f.trace.filter(entry => entry.method === 'capture').map(entry => entry.input[0]?.name);
  assert.ok(captured.includes('version-one')); assert.ok(captured.includes('version-two'));
  assert.ok(f.timers.size <= 2); await f.coordinator.synchronize();
  assert.equal((await cloud(f, doc.id)).document.name, 'version-two'); assert.equal(f.coordinator.status().pending, false);
});

test('persist arriving during network is consumed BEFORE cloud apply, so queued old membership never deletes a new remote conversation', async t => {
  const f = await fixture(t), remote = nativeDocument('cloud-only'), local = nativeDocument('native-during-network'), hold = gate();
  await save(f.backend, f.backend.alice, remote.id, mutation(projectChatHistoryThread(remote)));
  let once = true; f.network.after = async url => { if (once && url.pathname === '/sync/changes') { once = false; hold.enter(); await hold.waiting; } };
  const starting = f.coordinator.start(); await hold.entered;
  f.app.threads.set(local.id, local); f.app.persist(); hold.release(); await starting; await f.coordinator.whenIdle();
  assert.equal(f.app.threads.has(remote.id), true); assert.equal(f.app.threads.has(local.id), true);
  await f.coordinator.synchronize(); assert.equal((await cloud(f, remote.id)).deleted, false);
  assert.equal(f.calls.filter(call => call.method === 'DELETE').length, 0);
});

test('a turn finishing while cloud waits is neither rewound nor acknowledged as an older final reply', async t => {
  const doc = nativeDocument('last-output'), f = await fixture(t, [doc]); await f.coordinator.start();
  const active = f.app.threads.get(doc.id); active.turns[0].status = 'inProgress'; active.turns[0].items.at(-1).text = 'partial'; f.app.running.set(doc.id, { fixture: true }); f.app.persist(); await f.coordinator.whenIdle();
  const hold = gate(); let once = true;
  f.network.after = async url => { if (once && url.pathname === '/sync/changes') { once = false; hold.enter(); await hold.waiting; } };
  const syncing = f.coordinator.synchronize(); await hold.entered;
  active.turns[0].status = 'completed'; active.turns[0].items.at(-1).text = 'FINAL-NATIVE-OUTPUT'; f.app.running.delete(doc.id); f.app.persist();
  hold.release(); await syncing; await f.coordinator.whenIdle(); await f.coordinator.synchronize();
  assert.equal(f.app.threads.get(doc.id).turns[0].items.at(-1).text, 'FINAL-NATIVE-OUTPUT');
  assert.equal((await cloud(f, doc.id)).document.turns[0].items.at(-1).text, 'FINAL-NATIVE-OUTPUT');
  assert.equal(f.coordinator.status().conflictCount, 0);
});

test('S2 arriving while post-apply capture awaits cannot change the acknowledged S1 input', async t => {
  const f = await fixture(t, [nativeDocument('fixed-s1')]); await f.coordinator.start();
  const originalApply = f.app.applyHistorySnapshot.bind(f.app), hold = gate(); let once = true;
  f.app.applyHistorySnapshot = (...args) => { const result = originalApply(...args); if (once) { once = false; const engine = f.coordinator.sync, capture = engine.capture.bind(engine); engine.capture = async records => { engine.capture = capture; await capture(records); hold.enter(); await hold.waiting; }; } return result; };
  const syncing = f.coordinator.synchronize(); await hold.entered; f.edit('fixed-s1', 'S2-after-apply'); hold.release(); await syncing; await f.coordinator.whenIdle();
  const ack = f.trace.filter(entry => entry.method === 'acknowledgeApplied').at(-1);
  assert.notEqual(ack.input[0].name, 'S2-after-apply');
  await f.coordinator.synchronize(); assert.equal((await cloud(f, 'fixed-s1')).document.name, 'S2-after-apply');
});

test('native apply quota failure never acknowledges, preserves disk/Map and retries with a fresh engine', async t => {
  const f = await fixture(t, [nativeDocument('local-before-fail')]), remote = nativeDocument('incoming-before-fail');
  await save(f.backend, f.backend.alice, remote.id, mutation(projectChatHistoryThread(remote)));
  const before = f.disk.getItem(f.app.storageKey); f.disk.failNext = true;
  const failed = await f.coordinator.start(); assert.equal(failed.ok, false); assert.equal(failed.restartNeeded, true); assert.equal(failed.ready, false);
  assert.equal(f.disk.getItem(f.app.storageKey), before); assert.equal(f.app.threads.has(remote.id), false);
  assert.equal(f.trace.some(entry => entry.method === 'acknowledgeApplied'), false); assert.equal(f.trace.some(entry => entry.method === 'dispose'), true);
  const retried = await f.coordinator.start(); assert.equal(retried.ready, true); assert.equal(f.app.threads.has(remote.id), true);
  assert.ok(f.events.some(event => event.kind === 'failure'));
});

test('initial offline deferral still renders durable local history and reconnect synchronizes without a false saved result', async t => {
  const f = await fixture(t, [nativeDocument('offline-local')]); f.network.online = false;
  const result = await f.coordinator.start(); assert.equal(result.ready, true); assert.equal(result.deferred, true); assert.equal(result.pending, true);
  assert.equal(f.app.threads.has('offline-local'), true); assert.ok(f.events.some(event => event.kind === 'failure'));
  f.network.online = true; await f.coordinator.synchronize(); assert.equal(f.coordinator.status().pending, false);
  assert.ok(f.clear.some(event => event.kind === 'failure')); assert.equal((await cloud(f, 'offline-local')).deleted, false);
});

test('remote retained version is only applied after explicit choice and native labels identify that exact conflict', async t => {
  const doc = nativeDocument('choose-remote'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'LOCAL-VERSION'); await f.coordinator.whenIdle();
  await save(f.backend, f.backend.alice, doc.id, mutation(projectChatHistoryThread({ ...doc, name: 'REMOTE-VERSION' }), 1));
  await f.coordinator.synchronize(); assert.equal(f.coordinator.status().conflictCount, 1);
  assert.equal(f.app.threads.get(doc.id).name, 'LOCAL-VERSION'); assert.ok(f.events.some(event => event.kind === 'conflict' && event.conversationId === doc.id && event.conversationLabel === 'LOCAL-VERSION'));
  await f.coordinator.resolveConflict(doc.id, 'remote'); assert.equal(f.app.threads.get(doc.id).name, 'REMOTE-VERSION'); assert.equal(f.coordinator.status().conflictCount, 0);
  assert.ok(f.clear.some(event => event.kind === 'conflict' && event.conversationId === doc.id));
});

test('explicit normal local conflict choice stays pending through an offline mutation and only clears after real ack', async t => {
  const doc = nativeDocument('choose-local'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'LOCAL-WINNER'); await f.coordinator.whenIdle();
  await save(f.backend, f.backend.alice, doc.id, mutation(projectChatHistoryThread({ ...doc, name: 'REMOTE-OTHER' }), 1));
  await f.coordinator.synchronize(); f.network.online = false;
  const failed = await f.coordinator.resolveConflict(doc.id, 'local'); assert.equal(failed.ok, false); assert.equal(f.coordinator.status().conflictCount, 1);
  assert.equal(f.clear.some(event => event.kind === 'conflict' && event.conversationId === doc.id), false);
  f.network.online = true; await f.coordinator.synchronize(); assert.equal(f.coordinator.status().conflictCount, 0);
  assert.equal((await cloud(f, doc.id)).document.name, 'LOCAL-WINNER');
});

test('local retention after cloud deletion durably creates a fresh UUID copy and never resurrects the original', async t => {
  const doc = nativeDocument('deleted-copy'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'RETAIN-LOCAL-DELETED'); await f.coordinator.whenIdle();
  await f.backend.call('/sync/conversations/' + doc.id, { method: 'DELETE', token: f.backend.alice.token, body: { baseRevision: 1, mutationId: 'neutral-delete-copy' } });
  await f.coordinator.synchronize(); assert.equal(f.coordinator.status().conflictCount, 1);
  const result = await f.coordinator.resolveConflict(doc.id, 'local'); assert.equal(result.ok, true); assert.notEqual(result.forkedId, doc.id);
  assert.equal(f.app.threads.has(doc.id), false); const actual = f.app.threads.get(result.forkedId);
  assert.equal(actual.name, 'RETAIN-LOCAL-DELETED'); assert.equal(actual.forkedFromId, doc.id); assert.equal(actual.adapterMetadata.classicRootId, result.forkedId);
  assert.equal((await f.backend.call('/sync/conversations/' + doc.id, { token: f.backend.alice.token })).status, 410);
  assert.equal((await cloud(f, result.forkedId)).document.name, 'RETAIN-LOCAL-DELETED');
  assert.equal(f.calls.filter(call => call.method === 'PUT' && call.path.endsWith('/' + doc.id)).length, 1);
});

test('running references and same-device unchanged idle checkpoints survive cloud apply without onPersist recursion', async t => {
  const doc = nativeDocument('running-ref'), f = await fixture(t, [doc]); await f.coordinator.start();
  const actual = f.app.threads.get(doc.id); actual.turns[0].status = 'inProgress'; actual.turns[0].adapterMetadata.checkpoint = { native: 'same-ref' }; f.app.running.set(doc.id, { active: true });
  await f.coordinator.synchronize(); assert.equal(f.app.threads.get(doc.id), actual);
  assert.equal(JSON.parse(f.disk.getItem(f.app.storageKey)).threads[0].turns[0].adapterMetadata.checkpoint.native, 'same-ref');
  assert.equal(f.coordinator.status().pendingCaptures, 0);
});

test('account switch aborts old synchronization before apply and cannot publish another owners labels or history', async t => {
  const f = await fixture(t, [nativeDocument('owner-switch')]); await f.coordinator.start(); const hold = gate(); let once = true;
  f.network.after = async () => { if (once) { once = false; hold.enter(); await hold.waiting; } };
  const before = f.disk.getItem(f.app.storageKey), pending = f.coordinator.synchronize(); await hold.entered; f.changeOwner(); hold.release();
  await pending; assert.equal(f.coordinator.status().disposed, true); assert.equal(f.disk.getItem(f.app.storageKey), before); assert.equal(f.timers.size, 0);
});

test('polling skips hidden documents; foreground and online enqueue work, pagehide disposes all timers', async t => {
  const f = await fixture(t); await f.coordinator.start(); const before = f.calls.length;
  f.eventTarget.document.visibilityState = 'hidden';
  const poll = [...f.timers.entries()].find(([, task]) => task.delay === 30000); f.timers.delete(poll[0]); poll[1].callback(); await f.coordinator.whenIdle(); assert.equal(f.calls.length, before);
  f.eventTarget.document.visibilityState = 'visible'; f.eventTarget.dispatchEvent(new Event('online')); await f.coordinator.whenIdle(); assert.ok(f.calls.length > before);
  f.eventTarget.dispatchEvent(new Event('pagehide')); assert.equal(f.timers.size, 0); assert.equal(f.coordinator.status().disposed, true);
});

test('a hidden tab flushes the already durable edit when its document becomes visible', async t => {
  const f = await fixture(t, [nativeDocument('visibility-recovery')]);
  await f.coordinator.start();
  const previous = (await cloud(f, 'visibility-recovery')).document.name;
  f.eventTarget.document.visibilityState = 'hidden';
  f.edit('visibility-recovery', 'SAVED WHILE BACKGROUNDED');
  await f.coordinator.whenIdle();

  const timer = [...f.timers.entries()].find(([, task]) => task.delay === 750);
  assert.ok(timer);
  f.timers.delete(timer[0]);
  timer[1].callback();
  await f.coordinator.whenIdle();
  assert.equal((await cloud(f, 'visibility-recovery')).document.name, previous);

  f.eventTarget.document.visibilityState = 'visible';
  f.eventTarget.document.dispatchEvent(new Event('visibilitychange'));
  await f.coordinator.whenIdle();
  assert.equal((await cloud(f, 'visibility-recovery')).document.name, 'SAVED WHILE BACKGROUNDED');
  assert.equal(f.coordinator.status().pending, false);
});

test('restoring a cached page saves the existing outbox once and keeps new edits synchronized', async t => {
  const f = await fixture(t, [nativeDocument('cached-page')]);
  await f.coordinator.start();
  f.edit('cached-page', 'BEFORE NAVIGATING AWAY');
  await f.coordinator.whenIdle();
  f.eventTarget.document.visibilityState = 'hidden';
  f.eventTarget.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
  assert.equal(f.timers.size, 0);
  assert.equal(f.coordinator.status().disposed, false);

  f.eventTarget.document.visibilityState = 'visible';
  f.eventTarget.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  await f.coordinator.whenIdle();
  const restored = await cloud(f, 'cached-page');
  assert.equal(restored.document.name, 'BEFORE NAVIGATING AWAY');
  assert.equal(restored.revision, 2);

  f.edit('cached-page', 'AFTER RETURNING');
  await f.coordinator.synchronize();
  const changed = await cloud(f, 'cached-page');
  assert.equal(changed.document.name, 'AFTER RETURNING');
  assert.equal(changed.revision, 3);
});

test('logout signal bounds an in-flight network wait while local pending captures and outbox stay durable', async t => {
  const f = await fixture(t, [nativeDocument('bounded-logout')]); await f.coordinator.start(); f.edit('bounded-logout', 'LAST-BEFORE-LOGOUT'); await f.coordinator.whenIdle();
  f.network.before = async (url, options) => { await new Promise((resolve, reject) => { options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }); }); };
  const controller = new AbortController(), result = f.coordinator.synchronize({ signal: controller.signal }); await new Promise(resolve => setImmediate(resolve)); controller.abort();
  const bounded = await result; assert.equal(bounded.ok, false); assert.equal(bounded.timedOut, true);
  f.coordinator.dispose(); await f.coordinator.whenIdle();
  assert.equal(JSON.parse(f.disk.getItem(f.app.storageKey)).threads[0].name, 'LAST-BEFORE-LOGOUT');
  assert.ok([...f.stateStore.states.values()][0].outbox.length > 0);
});

test('more than forty pending cloud mutations remain explicitly pending after one bounded synchronization', async t => {
  const documents = Array.from({ length: 85 }, (_, index) => nativeDocument('bounded-' + index));
  const f = await fixture(t, documents); const first = await f.coordinator.start();
  assert.equal(first.pending, true); assert.equal(first.queuedCount, 45);
  const second = await f.coordinator.synchronize(); assert.equal(second.pending, true); assert.equal(second.queuedCount, 5);
  const last = await f.coordinator.synchronize(); assert.equal(last.pending, false); assert.equal(last.queuedCount, 0);
  assert.equal(f.backend.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 85);
});

test('fresh-copy local apply failure retains original conflict and durable copy, then retries without creating another ID', async t => {
  const doc = nativeDocument('fork-apply-failure'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'LOCAL-RETAINED'); await f.coordinator.whenIdle();
  await f.backend.call('/sync/conversations/' + doc.id, { method: 'DELETE', token: f.backend.alice.token, body: { baseRevision: 1, mutationId: 'fork-failure-delete' } });
  await f.coordinator.synchronize(); f.disk.failNext = true;
  const failed = await f.coordinator.resolveConflict(doc.id, 'local'); assert.equal(failed.ok, false); assert.equal(failed.restartNeeded, true);
  const state = [...f.stateStore.states.values()][0], copies = Object.values(state.heads).filter(thread => thread.forkedFromId === doc.id);
  assert.equal(copies.length, 1); assert.ok(state.conflicts[doc.id]);
  assert.equal(f.clear.some(event => event.kind === 'conflict' && event.conversationId === doc.id), false);
  await f.coordinator.start(); const resolved = await f.coordinator.resolveConflict(doc.id, 'local'); assert.equal(resolved.ok, true); assert.equal(resolved.forkedId, copies[0].id);
  assert.equal([...f.app.threads.values()].filter(thread => thread.forkedFromId === doc.id).length, 1);
  assert.equal((await f.backend.call('/sync/conversations/' + doc.id, { token: f.backend.alice.token })).status, 410);
});

test('active conversation conflicts defer explicit choice while retaining original object and durable branches', async t => {
  const doc = nativeDocument('active-conflict'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'LOCAL-ACTIVE'); await f.coordinator.whenIdle();
  await save(f.backend, f.backend.alice, doc.id, mutation(projectChatHistoryThread({ ...doc, name: 'REMOTE-ACTIVE' }), 1));
  await f.coordinator.synchronize(); const original = f.app.threads.get(doc.id); f.app.running.set(doc.id, {});
  const blocked = await f.coordinator.resolveConflict(doc.id, 'remote'); assert.equal(blocked.ok, false); assert.equal(blocked.lastErrorCode, 'SYNC_CONFLICT_ACTIVE');
  assert.equal(f.app.threads.get(doc.id), original); assert.equal((await f.coordinator.sync.conflicts()).length, 1);
  f.app.running.delete(doc.id); assert.equal((await f.coordinator.resolveConflict(doc.id, 'remote')).ok, true);
});

test('ephemeral conversations never enter cloud or captured membership while native Map still retains them', async t => {
  const doc = nativeDocument('ephemeral-only'); doc.ephemeral = true;
  const f = await fixture(t, [doc]); const result = await f.coordinator.start();
  assert.equal(result.pending, false); assert.equal(f.app.threads.get(doc.id).ephemeral, true);
  assert.equal(f.calls.some(call => call.method === 'PUT'), false); assert.equal(f.backend.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 0);
});

test('post-apply durable capture failure cannot acknowledge a snapshot; fresh initialization retains the applied native data', async t => {
  const f = await fixture(t), doc = nativeDocument('capture-after-apply-failure');
  await save(f.backend, f.backend.alice, doc.id, mutation(projectChatHistoryThread(doc)));
  const originalApply = f.app.applyHistorySnapshot.bind(f.app); let once = true;
  f.app.applyHistorySnapshot = (...args) => { const result = originalApply(...args); if (once) { once = false; f.stateStore.failNext = true; } return result; };
  const failed = await f.coordinator.start(); assert.equal(failed.ok, false); assert.equal(failed.restartNeeded, true);
  assert.equal(f.app.threads.has(doc.id), true); assert.equal(f.trace.some(entry => entry.method === 'acknowledgeApplied'), false);
  assert.equal((await f.coordinator.start()).ready, true); assert.equal(f.calls.some(call => call.method === 'DELETE'), false);
});

test('remote title change retains an unchanged interrupted idle turn real private checkpoint on this device', async t => {
  const doc = nativeDocument('idle-checkpoint'); doc.turns[0].status = 'interrupted';
  doc.turns[0].adapterMetadata.checkpoint = { transcript: [{ role: 'user', content: 'NEUTRAL-LOCAL-PRIVATE-CHECKPOINT' }], pendingCalls: [] };
  doc.turns[0].adapterMetadata.resumable = true; doc.turns[0].adapterMetadata.resumePolicy = 'automatic';
  const f = await fixture(t, [doc]); await f.coordinator.start();
  const renamed = { ...projectChatHistoryThread(doc), name: 'Renamed on another device' };
  await save(f.backend, f.backend.alice, doc.id, mutation(renamed, 1)); await f.coordinator.synchronize();
  assert.equal(f.app.threads.get(doc.id).name, renamed.name);
  assert.deepEqual(f.app.threads.get(doc.id).turns[0].adapterMetadata.checkpoint, doc.turns[0].adapterMetadata.checkpoint);
  assert.equal(JSON.stringify((await cloud(f, doc.id)).document).includes('NEUTRAL-LOCAL-PRIVATE-CHECKPOINT'), false);
});

test('deleted local-retain decision can be locally durable while cloud stays pending, with explicit failure feedback', async t => {
  const doc = nativeDocument('fork-cloud-pending'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'ONLY-LOCAL-UNTIL-ONLINE'); await f.coordinator.whenIdle();
  await f.backend.call('/sync/conversations/' + doc.id, { method: 'DELETE', token: f.backend.alice.token, body: { baseRevision: 1, mutationId: 'fork-pending-delete' } });
  await f.coordinator.synchronize(); f.network.online = false;
  const result = await f.coordinator.resolveConflict(doc.id, 'local'); assert.equal(result.ok, false); assert.equal(result.pending, true);
  assert.ok(result.forkedId); assert.equal(f.app.threads.get(result.forkedId).name, 'ONLY-LOCAL-UNTIL-ONLINE');
  assert.equal(JSON.parse(f.disk.getItem(f.app.storageKey)).threads[0].id, result.forkedId);
  assert.equal((await f.backend.call('/sync/conversations/' + result.forkedId, { token: f.backend.alice.token })).status, 404);
  assert.ok(f.events.some(event => event.kind === 'failure')); f.network.online = true; await f.coordinator.synchronize();
  assert.equal((await cloud(f, result.forkedId)).document.name, 'ONLY-LOCAL-UNTIL-ONLINE');
});

test('page reload between durable fork staging and failed native apply recovers the exact fork instead of duplicating history', async t => {
  const doc = nativeDocument('fork-reload'), f = await fixture(t, [doc]); await f.coordinator.start();
  f.edit(doc.id, 'LOCAL-FORK-AFTER-RELOAD'); await f.coordinator.whenIdle();
  await f.backend.call('/sync/conversations/' + doc.id, { method: 'DELETE', token: f.backend.alice.token, body: { baseRevision: 1, mutationId: 'fork-reload-delete' } });
  await f.coordinator.synchronize(); f.disk.failNext = true;
  assert.equal((await f.coordinator.resolveConflict(doc.id, 'local')).ok, false);
  const staged = Object.values([...f.stateStore.states.values()][0].heads).find(thread => thread.forkedFromId === doc.id); assert.ok(staged);
  f.coordinator.dispose();
  const fresh = createAccountHistoryCoordinator({ appServer: f.app, createSync: f.createSync, getIdentity: f.identity, projectThread: projectChatHistoryThread, eventTarget: null,
    timers: { setTimeout: () => 1, clearTimeout() {} } }); t.after(() => fresh.dispose()); f.app.onPersist = records => fresh.capture(records);
  await fresh.start(); const resolved = await fresh.resolveConflict(doc.id, 'local');
  assert.equal(resolved.ok, true); assert.equal(resolved.forkedId, staged.id);
  assert.equal([...f.app.threads.values()].filter(thread => thread.forkedFromId === doc.id).length, 1);
  assert.equal(f.backend.DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sync_conversations').get().n, 2);
});

test('status remains pending after durable capture while its subsequent snapshot read is still waiting', async t => {
  const f = await fixture(t, [nativeDocument('pending-window')]); await f.coordinator.start();
  const hold = gate(), engine = f.coordinator.sync, snapshot = engine.snapshot.bind(engine); let once = true;
  engine.snapshot = async records => { if (once) { once = false; hold.enter(); await hold.waiting; } return snapshot(records); };
  f.edit('pending-window', 'DURABLE-BUT-NOT-YET-SENT'); await hold.entered;
  assert.equal(f.coordinator.status().pending, true); assert.equal(f.coordinator.status().queuedCount, 1);
  hold.release(); await f.coordinator.whenIdle();
});
