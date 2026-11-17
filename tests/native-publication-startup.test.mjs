import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sourceURL = process.env.PUBLICATION_SERVICE_SOURCE
  ? new URL('file:///' + process.env.PUBLICATION_SERVICE_SOURCE.replaceAll('\\', '/'))
  : new URL('../src/native-client/service-boundary.mjs', import.meta.url);
const source = fs.readFileSync(sourceURL, 'utf8');
const begin = source.indexOf('const publicationRestorations = new Map();');
const end = source.indexOf('\nconst historyIdentity', begin);
assert.ok(begin >= 0 && end > begin, 'The actual publication startup contract must be located.');
const block = source.slice(begin, end).replace('export function initializeLocalPublishedResources', 'function initializeLocalPublishedResources');
const tick = () => new Promise(resolve => setImmediate(resolve));
function controlled() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
function fixture(resolveHistory) {
  const applies = [], diagnostics = [], signals = [], deadlines = [];
  const thread = { id: 'neutral-startup', ephemeral: false, turns: [] };
  const context = vm.createContext({
    AbortController, DOMException, queueMicrotask,
    localPublishedResourceRehydrator: { rehydrateHistory(records, { signal }) { signals.push(signal); return resolveHistory(records, signal); } },
    localAppServer: { threads: new Map([[thread.id, thread]]), running: new Map(), applyToolResultPresentation(pairs) { applies.push(pairs); return { updated: ['neutral-startup'], skipped: [] }; } },
    projectChatHistoryThread: value => value,
    getPersonalizationIdentity: () => ({ accountId: 'neutral-account', userId: 'neutral-user' }),
    localProtocolDiagnostics: diagnostics,
    setTimeout(callback, ms) { deadlines.push(ms); return setTimeout(callback, ms === 8000 ? 5 : ms); },
    clearTimeout,
  });
  vm.runInContext(block + '\nglobalThis.run = initializeLocalPublishedResources; globalThis.pendingMap = publicationRestorations;', context, { timeout: 1000 });
  return { run: context.run, pending: context.pendingMap, applies, diagnostics, signals, deadlines };
}

test('actual publication startup settles at its deadline even when trusted local storage IO never settles', async () => {
  const f = fixture(() => new Promise(() => {}));
  const result = await Promise.race([f.run({ threadId: 'neutral-startup' }), new Promise((_, reject) => setTimeout(() => reject(Error('The startup deadline did not settle the actual outer operation')), 150))]);
  assert.equal(result.ok, false); assert.equal(f.signals[0].aborted, true);
  assert.equal(f.deadlines[0], 8000); assert.equal(f.applies.length, 0); assert.equal(f.pending.size, 0);
});

test('late resource completion after startup timeout cannot apply a stale result or write any history', async () => {
  const io = controlled(), f = fixture(() => io.promise);
  const result = await f.run({ threadId: 'neutral-startup' }); assert.equal(result.ok, false);
  io.resolve({ safeToApply: true, pairs: [{ before: { id: 'neutral-startup' }, after: { id: 'neutral-startup' } }] });
  await tick(); await tick();
  assert.equal(f.applies.length, 0); assert.equal(f.pending.size, 0);
});

test('same-key callers share the pending operation; timeout clears the map and a later genuine retry can apply once', async () => {
  const firstIO = controlled(); let calls = 0;
  const f = fixture(() => ++calls === 1 ? firstIO.promise : Promise.resolve({ safeToApply: true, pairs: [{ before: { id: 'neutral-startup' }, after: { id: 'neutral-startup' } }] }));
  const first = f.run({ threadId: 'neutral-startup' }), same = f.run({ threadId: 'neutral-startup' });
  assert.equal(first, same); assert.equal((await first).ok, false); assert.equal(f.pending.size, 0);
  const retry = f.run({ threadId: 'neutral-startup' }); assert.notEqual(retry, first);
  const result = await retry; assert.equal(result.ok, true); assert.equal(result.updatedCount, 1); assert.equal(calls, 2);
  firstIO.resolve({ safeToApply: true, pairs: [] }); await tick();
  assert.equal(f.applies.length, 1); assert.equal(f.pending.size, 0);
});
