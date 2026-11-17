import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeLibraryRefresh } from '../src/native-client/native-library-refresh.mjs';
const receipt = number => ({ committed: true, operationId: 'tool_' + String(number).padStart(64, '0'), fileId: 'file_local_' + '1'.repeat(32), rawFileId: 'file_local_' + '2'.repeat(32), revision: number, sha256: 'a'.repeat(64) });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const turn = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
  let identity = { accountId: 'neutral-account', userId: 'neutral-user', accountUserId: 'neutral-account-user' }, client = { name: 'original-client' };
  const calls = [], diagnostics = [];
  const refresh = createNativeLibraryRefresh({ getIdentity: () => identity, getClient: () => client,
    invalidate: async (...args) => { calls.push(args); return options.invalidate ? options.invalidate(...args) : args[3](() => {}); },
    onDiagnostic: value => diagnostics.push(value),
  });
  return { refresh, calls, diagnostics, get identity() { return identity; }, setIdentity: value => { identity = value; }, get client() { return client; }, setClient: value => { client = value; } };
}

test('only actual committed receipt identities schedule refresh, and missing identity never creates an unscoped job', async () => {
  const e = fixture();
  for (const value of [null, {}, { ...receipt(1), committed: false }, { ...receipt(1), fileId: receipt(1).rawFileId }, { ...receipt(1), revision: 0 }, { ...receipt(1), sha256: 'invalid' }]) await assert.rejects(e.refresh.notifyCommitted(value), TypeError);
  e.setIdentity(null); assert.equal((await e.refresh.notifyCommitted(receipt(1))).reason, 'identity-unavailable'); assert.equal(e.calls.length, 0); assert.equal((await e.refresh.notifyReady()).reason, 'clean'); e.refresh.dispose();
});

test('same-owner saves in one turn coalesce into the exact original account prefix, active refetch and cancelRefetch:false', async () => {
  const e = fixture(); const results = await Promise.all([e.refresh.notifyCommitted(receipt(1)), e.refresh.notifyCommitted(receipt(2))]);
  assert.equal(e.calls.length, 1); assert.equal(e.calls[0][0], e.client); assert.deepEqual(e.calls[0][1], { queryKey: ['library-api', 'neutral-account'], refetchType: 'active' }); assert.deepEqual(e.calls[0][2], { cancelRefetch: false }); assert.equal(typeof e.calls[0][3], 'function'); assert.equal(results.every(row => row.invalidated), true);
  assert.equal(JSON.stringify(e.diagnostics).includes('neutral-account'), false); e.refresh.dispose();
});

test('client-unavailable keeps a dirty save until an explicit native readiness notification without a retry loop', async () => {
  const e = fixture(), client = e.client; e.setClient(null);
  assert.deepEqual(await e.refresh.notifyCommitted(receipt(1)), { invalidated: false, deferred: true, reason: 'client-unavailable' }); await turn(); assert.equal(e.calls.length, 0);
  e.setClient(client); assert.equal((await e.refresh.notifyReady()).invalidated, true); assert.equal(e.calls.length, 1); assert.equal((await e.refresh.notifyReady()).reason, 'clean'); e.refresh.dispose();
});

test('an invalidation failure cannot change committed-file status and retries only after an explicit readiness signal', async () => {
  let attempts = 0; const e = fixture({ invalidate: async (_client, _filters, _options, batch) => { if (++attempts === 1) throw Error('Neutral source request failed'); return batch(() => {}); } });
  const actualReceipt = receipt(1), original = structuredClone(actualReceipt); assert.equal((await e.refresh.notifyCommitted(actualReceipt)).reason, 'invalidation-deferred'); assert.deepEqual(actualReceipt, original); await turn(); assert.equal(attempts, 1);
  assert.equal((await e.refresh.notifyReady()).invalidated, true); assert.equal(attempts, 2); e.refresh.dispose();
});

test('a later save during an actual outstanding refresh receives a second pass instead of being falsely acknowledged by the older fetch', async () => {
  const hold = deferred(), entered = deferred(); let attempts = 0;
  const e = fixture({ invalidate: async (_client, _filters, _options, batch) => { if (++attempts === 1) { entered.resolve(); await hold.promise; } return batch(() => {}); } });
  const first = e.refresh.notifyCommitted(receipt(1)); await entered.promise; const second = e.refresh.notifyCommitted(receipt(2)); hold.resolve();
  assert.equal((await first).invalidated, true); assert.equal((await second).invalidated, true); assert.equal(attempts, 2); e.refresh.dispose();
});

test('owner replacement before the queued work starts does not issue invalidation for either account', async () => {
  const e = fixture(), pending = e.refresh.notifyCommitted(receipt(1)); e.setIdentity({ ...e.identity, userId: 'replacement-user' });
  assert.equal((await pending).reason, 'owner-changed'); assert.equal(e.calls.length, 0); assert.equal((await e.refresh.notifyCommitted(receipt(2))).reason, 'owner-changed'); e.refresh.dispose();
});

test('the fourth original batch callback blocks a delayed refetch after account replacement and settles every queued save', async () => {
  const hold = deferred(), entered = deferred(); let actualInvalidations = 0;
  const e = fixture({ invalidate: async (_client, _filters, _options, batch) => { entered.resolve(); await hold.promise; return batch(() => { actualInvalidations++; }); } });
  const first = e.refresh.notifyCommitted(receipt(1)); await entered.promise; const second = e.refresh.notifyCommitted(receipt(2)); e.setIdentity({ accountId: 'other-account', userId: 'other-user' }); hold.resolve();
  assert.equal((await first).reason, 'owner-changed'); assert.equal((await second).reason, 'owner-changed'); assert.equal(actualInvalidations, 0); assert.equal(e.calls.length, 1); e.refresh.dispose();
});

test('replacement of the native QueryClient defers the old pass and performs the explicitly requested pass on the new client', async () => {
  const hold = deferred(), entered = deferred(); let attempts = 0; const changedClient = { name: 'new-native-client' };
  const e = fixture({ invalidate: async (_client, _filters, _options, batch) => { if (++attempts === 1) { entered.resolve(); await hold.promise; } return batch(() => {}); } });
  const first = e.refresh.notifyCommitted(receipt(1)); await entered.promise; e.setClient(changedClient); const ready = e.refresh.notifyReady(); hold.resolve();
  assert.equal((await first).reason, 'client-changed'); assert.equal((await ready).invalidated, true); assert.equal(e.calls[1][0], changedClient); assert.equal(attempts, 2); e.refresh.dispose();
});

test('dispose immediately settles pending callers and prevents a late source continuation from touching the old client', async () => {
  const hold = deferred(), entered = deferred(); let actualInvalidations = 0;
  const e = fixture({ invalidate: async (_client, _filters, _options, batch) => { entered.resolve(); await hold.promise; batch(() => { actualInvalidations++; }); } });
  const first = e.refresh.notifyCommitted(receipt(1)); await entered.promise; const second = e.refresh.notifyCommitted(receipt(2)); e.refresh.dispose();
  assert.equal((await first).reason, 'disposed'); assert.equal((await second).reason, 'disposed'); hold.resolve(); await turn(); assert.equal(actualInvalidations, 0); assert.equal((await e.refresh.notifyReady()).reason, 'disposed');
});
