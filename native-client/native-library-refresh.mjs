/** Owner-bound notifications to the original fvOC Library invalidation utility. */
const FILE_ID = /^file_local_[0-9a-f]{32}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const copyIdentity = value => value && typeof value.accountId === 'string' && value.accountId && typeof value.userId === 'string' && value.userId
  && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? { accountId: value.accountId, userId: value.userId, accountUserId: value.accountUserId ?? null } : null;
const sameIdentity = (a, b) => !!a && !!b && a.accountId === b.accountId && a.userId === b.userId && a.accountUserId === b.accountUserId;
const receiptIsCommitted = value => value?.committed === true && typeof value.operationId === 'string' && value.operationId.length > 0
  && FILE_ID.test(value.fileId ?? '') && FILE_ID.test(value.rawFileId ?? '') && value.fileId !== value.rawFileId
  && Number.isSafeInteger(value.revision) && value.revision > 0 && SHA256.test(value.sha256 ?? '');
const outcome = (reason, invalidated = false, deferred = false) => ({ invalidated, deferred, reason });

/**
 * invalidate must forward all four arguments to the ACTUAL original fvOC.a.
 * Its fourth batch(work) callback is the guard for delayed re-invalidations.
 * No separate cache, DOM control, upload job, pubsub event or reload is created.
 */
export function createNativeLibraryRefresh({ getIdentity, getClient, invalidate, onDiagnostic = () => {} } = {}) {
  if (typeof getIdentity !== 'function' || typeof getClient !== 'function' || typeof invalidate !== 'function') throw TypeError('Verified native identity, current native QueryClient, and original invalidator callbacks are required');
  let owner = readIdentity(), disposed = false, dirty = false, running = false, scheduled = false, generation = 0;
  const waiters = new Set();
  function readIdentity() { try { return copyIdentity(getIdentity()); } catch { return null; } }
  function readClient() { try { return getClient() ?? null; } catch { return null; } }
  function note(reason) { try { onDiagnostic({ type: 'native-library-refresh', reason }); } catch {} }
  function settleThrough(version, value) {
    for (const waiter of waiters) if (waiter.generation <= version) { waiters.delete(waiter); waiter.resolve({ ...value }); }
  }
  function changed(reason) { return Object.assign(Error(reason), { code: reason }); }
  function check(client) {
    if (disposed) throw changed('disposed');
    if (!sameIdentity(owner, readIdentity())) throw changed('owner-changed');
    if (readClient() !== client) throw changed('client-changed');
  }
  function schedule() {
    if (disposed || running || scheduled || !dirty) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; void run(); });
  }
  async function run() {
    if (disposed || running || !dirty) return;
    const version = generation, identity = readIdentity();
    if (!sameIdentity(owner, identity)) {
      dirty = false; note('owner-changed'); settleThrough(version, outcome('owner-changed')); return;
    }
    const client = readClient();
    if (!client) { note('client-unavailable'); settleThrough(version, outcome('client-unavailable', false, true)); return; }
    running = true; dirty = false;
    try {
      check(client);
      await invalidate(client, { queryKey: ['library-api', owner.accountId], refetchType: 'active' }, { cancelRefetch: false }, work => {
        // fvOC calls this both now and after an already-running query settles.
        // A check only around await would permit an old owner's delayed refetch.
        check(client);
        return work();
      });
      check(client);
      note('invalidated'); settleThrough(version, outcome('invalidated', true));
    } catch (error) {
      const reason = disposed ? 'disposed' : !sameIdentity(owner, readIdentity()) ? 'owner-changed' : readClient() !== client ? 'client-changed' : 'invalidation-deferred';
      if (!['disposed', 'owner-changed'].includes(reason)) dirty = true;
      else dirty = false;
      note(reason); settleThrough(['disposed', 'owner-changed'].includes(reason) ? generation : version, outcome(reason, false, dirty));
    } finally {
      running = false;
      // A new commit/readiness event gets one more pass. Failures alone never
      // cause an automatic retry loop; readiness must be signalled explicitly.
      if (dirty && generation > version) schedule();
    }
  }
  function enqueue() {
    dirty = true; generation++;
    const result = new Promise(resolve => waiters.add({ generation, resolve }));
    schedule(); return result;
  }
  return Object.freeze({
    notifyCommitted(receipt) {
      if (!receiptIsCommitted(receipt)) return Promise.reject(TypeError('A genuine committed immutable FileService receipt is required'));
      if (disposed) return Promise.resolve(outcome('disposed'));
      const identity = readIdentity();
      if (!identity) return Promise.resolve(outcome('identity-unavailable'));
      owner ??= identity;
      if (!sameIdentity(owner, identity)) return Promise.resolve(outcome('owner-changed'));
      return enqueue();
    },
    notifyReady() {
      if (disposed) return Promise.resolve(outcome('disposed'));
      if (!dirty && !running) return Promise.resolve(outcome('clean'));
      return enqueue();
    },
    dispose() {
      disposed = true; dirty = false; generation++;
      settleThrough(generation, outcome('disposed'));
    },
  });
}
