/** One account-owned controller chain for native history capture/apply/ack.
 * This module does not create UI, read credentials or start model execution.
 */
const clone = value => structuredClone(value);
const scope = value => value && ['ownerId', 'accountId', 'namespace'].every(key => typeof value[key] === 'string' && value[key])
  ? JSON.stringify([value.ownerId, value.accountId, value.namespace]) : null;
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const coordinatorError = code => Object.assign(new Error(code), { code });

export function createAccountHistoryCoordinator({
  appServer, createSync, getIdentity, projectThread,
  onFeedback = () => {}, onClearFeedback = () => {}, onApplied = () => {}, onDiagnostic = () => {},
  eventTarget = globalThis.window ?? null,
  debounceMs = 750, pollMs = 30000, uuid = () => crypto.randomUUID(),
  timers = {},
} = {}) {
  if (!appServer?.threads || typeof appServer.applyHistorySnapshot !== 'function' || typeof createSync !== 'function' ||
      typeof getIdentity !== 'function' || typeof projectThread !== 'function') throw new TypeError('Native history coordinator requires its real server and verified account callbacks.');
  const initialIdentity = clone(getIdentity()), bootScope = scope(initialIdentity), ownerId = initialIdentity?.ownerId;
  const documentTarget = eventTarget?.document;
  const setTimer = timers.setTimeout ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clearTimer = timers.clearTimeout ?? (handle => globalThis.clearTimeout(handle));
  const debounceDelay = Number.isFinite(debounceMs) ? Math.min(10000, Math.max(0, debounceMs)) : 750;
  const pollDelay = Number.isFinite(pollMs) ? Math.min(300000, Math.max(5000, pollMs)) : 30000;
  let engine = null, chain = Promise.resolve(), disposed = false, ready = false, restartNeeded = false;
  let cachedPage = false;
  let debounceTimer = null, pollTimer = null, startPromise = null, synchronizePromise = null, activeOperation = null;
  let sequence = 0, queuedCount = 0, conflictCount = 0, lastErrorCode = null, deferred = false;
  let oversizedCount = 0;
  const captures = new Map(), notices = new Set(), copiedConflicts = new Map();

  const diagnostic = (type, code) => { try { onDiagnostic({ type, ...(typeof code === 'string' ? { code } : {}) }); } catch {} };
  const currentThreads = () => clone([...appServer.threads.values()].filter(thread => !thread.ephemeral));
  const visible = () => !cachedPage && documentTarget?.visibilityState !== 'hidden' && eventTarget?.visibilityState !== 'hidden';
  const notify = event => { try { onFeedback({ ownerId, ...event }); } catch { diagnostic('account-history-feedback-error'); } };
  const clearNotice = event => { try { onClearFeedback({ ownerId, ...event }); } catch { diagnostic('account-history-feedback-error'); } };
  function status() { return Object.freeze({ ready, disposed, restartNeeded, queuedCount, conflictCount, oversizedCount, pendingCaptures: captures.size,
    pending: queuedCount > 0 || captures.size > 0 || deferred || restartNeeded || conflictCount > 0, deferred, lastErrorCode: lastErrorCode ?? (oversizedCount ? 'SYNC_DOCUMENT_TOO_LARGE' : null) }); }
  function stopTimer(kind) {
    if (kind === 'debounce' && debounceTimer !== null) { clearTimer(debounceTimer); debounceTimer = null; }
    if (kind === 'poll' && pollTimer !== null) { clearTimer(pollTimer); pollTimer = null; }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; ready = false;
    stopTimer('debounce'); stopTimer('poll');
    activeOperation?.abort(); engine?.dispose(); captures.clear();
    eventTarget?.removeEventListener?.('pagehide', pageHide);
    eventTarget?.removeEventListener?.('pageshow', pageShow);
    documentTarget?.removeEventListener?.('visibilitychange', foreground);
    eventTarget?.removeEventListener?.('online', foreground);
    eventTarget?.removeEventListener?.('focus', foreground);
    clearNotice({ kind: 'failure' });
    if (oversizedCount) clearNotice({ kind: 'oversized' });
    for (const id of notices) clearNotice({ kind: 'conflict', conversationId: id });
    notices.clear();
  }
  function assertCurrent() {
    let actual; try { actual = getIdentity(); } catch { actual = null; }
    if (disposed || !bootScope || scope(actual) !== bootScope) { dispose(); throw coordinatorError('SYNC_ACCOUNT_CHANGED'); }
  }
  function enqueue(task) {
    const result = chain.catch(() => {}).then(async () => {
      try { assertCurrent(); return await task(); }
      catch (error) { return failed(error); }
    });
    chain = result.then(() => {}, () => {});
    return result;
  }
  function failed(error) {
    if (error?.code === 'SYNC_ACCOUNT_CHANGED') dispose();
    if (disposed) return { ok: false, ...status() };
    try { assertCurrent(); } catch { return { ok: false, ...status() }; }
    lastErrorCode = typeof error?.code === 'string' ? error.code : 'SYNC_COORDINATOR_STORAGE_FAILURE';
    deferred = true;
    notify({ kind: 'failure' }); diagnostic('account-history-deferred', lastErrorCode);
    if (error?.retryable !== true && !['SYNC_CONFLICT_ACTIVE', 'SYNC_CONFLICT_NOT_FOUND', 'SYNC_CONCURRENT_LOCAL_ACTIVITY'].includes(lastErrorCode)) {
      engine?.dispose(); engine = null; ready = false; restartNeeded = true;
    }
    return { ok: false, ...status() };
  }
  function schedule() {
    if (disposed || cachedPage || debounceTimer !== null) return;
    debounceTimer = setTimer(() => { debounceTimer = null; if (visible()) void synchronize(); }, debounceDelay);
    debounceTimer?.unref?.();
  }
  function schedulePoll() {
    if (disposed || cachedPage || pollTimer !== null) return;
    pollTimer = setTimer(() => { pollTimer = null; if (visible()) void synchronize(); schedulePoll(); }, pollDelay);
    pollTimer?.unref?.();
  }
  function foreground() { if (!disposed && visible()) void synchronize(); }
  function pageHide(event) {
    if (!event.persisted) { dispose(); return; }
    cachedPage = true;
    stopTimer('debounce'); stopTimer('poll');
  }
  function pageShow(event) {
    if (!event.persisted || !cachedPage || disposed) return;
    cachedPage = false;
    if (ready) schedulePoll();
    // If the browser paused an in-flight save, wait for its durable receipt
    // before running a fresh pass against the current native conversation.
    if (synchronizePromise) void synchronizePromise.then(foreground);
    else foreground();
  }
  function refresh(snapshot) {
    queuedCount = snapshot.queuedCount ?? 0;
    const previousOversizedCount = oversizedCount;
    oversizedCount = snapshot.oversizedConversationIds?.length ?? 0;
    if (oversizedCount && !previousOversizedCount) notify({ kind: 'oversized' });
    else if (!oversizedCount && previousOversizedCount) clearNotice({ kind: 'oversized' });
    const conflicts = snapshot.conflicts ?? [], oversized = new Set(snapshot.oversizedConversationIds);
    const ids = new Set(conflicts.filter(value => !oversized.has(value.id)).map(value => value.id));
    conflictCount = conflicts.length;
    for (const id of notices) if (!ids.has(id)) { clearNotice({ kind: 'conflict', conversationId: id }); notices.delete(id); copiedConflicts.delete(id); }
    for (const conflict of conflicts) {
      if (oversized.has(conflict.id)) continue;
      const label = appServer.threads.get(conflict.id)?.name ?? conflict.local?.name ?? conflict.remote?.name ?? '未命名对话';
      notify({ kind: 'conflict', conversationId: conflict.id, conversationLabel: typeof label === 'string' ? label : '未命名对话', remoteDeleted: conflict.remoteMetadata?.deleted === true });
      notices.add(conflict.id);
    }
    if (snapshot.deferred) { deferred = true; lastErrorCode = snapshot.deferred.code ?? 'SYNC_NETWORK_UNAVAILABLE'; notify({ kind: 'failure' }); }
    else if (queuedCount === 0) { deferred = false; lastErrorCode = null; clearNotice({ kind: 'failure' }); }
    if (queuedCount > 0) schedule();
  }
  async function drainCaptures() {
    const cutoff = sequence;
    for (const [id, input] of captures) {
      if (id > cutoff) break;
      await captureInside(input);
      captures.delete(id);
    }
  }
  async function captureInside(input) {
    const result = await engine.capture(input); assertCurrent();
    if (Number.isSafeInteger(result?.queuedCount)) queuedCount = result.queuedCount;
    if (Number.isSafeInteger(result?.conflictCount)) conflictCount = result.conflictCount;
    return result;
  }
  async function appliedSnapshot(snapshot) {
    assertCurrent();
    const oversized = new Set(snapshot.oversizedConversationIds);
    const changes = appServer.applyHistorySnapshot(snapshot.threads, { projectThread: thread => {
      if (oversized.has(thread.id)) return null;
      try { return projectThread(thread); }
      catch (error) {
        if (error?.code === 'SYNC_DOCUMENT_TOO_LARGE') return null;
        throw error;
      }
    } });
    // Clone ONCE before awaiting capture; acknowledge exactly this S1 even if
    // native persist(S2) arrives while the durable store is awaiting commit.
    const S1 = currentThreads();
    try { onApplied(changes); } catch { diagnostic('account-history-publish-error'); }
    await captureInside(S1);
    await engine.acknowledgeApplied(S1); assertCurrent();
    const committed = await engine.snapshot(S1); assertCurrent();
    refresh({ ...committed, ...(snapshot.deferred ? { deferred: snapshot.deferred } : {}) });
    return committed;
  }
  async function reconcile(snapshot) {
    // Network can finish after a live turn becomes idle. Absorb the already
    // durable native capture records BEFORE applying any older cloud view.
    for (let round = 0; round < 8; round++) {
      await drainCaptures(); assertCurrent();
      const before = currentThreads();
      await captureInside(before);
      const merged = await engine.snapshot(before); assertCurrent();
      if (captures.size || !same(before, currentThreads())) continue;
      return appliedSnapshot({ ...merged, ...(snapshot?.deferred ? { deferred: snapshot.deferred } : {}) });
    }
    schedule(); throw coordinatorError('SYNC_CONCURRENT_LOCAL_ACTIVITY');
  }
  async function initializeInside(signal) {
    if (ready && engine && !restartNeeded) return { ok: true, ...status() };
    engine?.dispose(); engine = createSync(); restartNeeded = false;
    if (!engine || typeof engine.initialize !== 'function') throw coordinatorError('SYNC_INVALID_ENGINE');
    const initial = currentThreads();
    const snapshot = await engine.initialize(initial, { signal }); assertCurrent();
    await reconcile(snapshot); assertCurrent();
    ready = true; schedulePoll();
    return { ok: true, ...status() };
  }
  function start() {
    if (startPromise) return startPromise;
    startPromise = enqueue(initializeInside).finally(() => { startPromise = null; });
    return startPromise;
  }
  function capture(records) {
    if (disposed) return Promise.resolve({ ok: false, ...status() });
    let input; try { input = clone(records); assertCurrent(); } catch (error) { return enqueue(() => { throw error; }); }
    const id = ++sequence; captures.set(id, input);
    return enqueue(async () => {
      if (!engine || !ready) { const started = await initializeInside(); if (!started.ok) return started; }
      // A preceding network task may already have consumed this record before
      // applying cloud additions. Replaying an old full membership afterwards
      // could falsely DELETE newly applied remote conversations.
      if (captures.has(id)) await drainCaptures();
      const view = await engine.snapshot(currentThreads()); assertCurrent(); refresh(view); schedule();
      return { ok: true, ...status() };
    });
  }
  function waitWithSignal(promise, signal) {
    if (!signal) return promise;
    return new Promise(resolve => {
      const abort = () => { activeOperation?.abort(signal.reason); resolve({ ok: false, timedOut: true, ...status() }); };
      if (signal.aborted) { abort(); return; }
      signal.addEventListener('abort', abort, { once: true });
      promise.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, () => { signal.removeEventListener('abort', abort); resolve({ ok: false, ...status() }); });
    });
  }
  function synchronize({ signal } = {}) {
    if (synchronizePromise) return waitWithSignal(synchronizePromise, signal);
    stopTimer('debounce');
    synchronizePromise = enqueue(async () => {
      const controller = new AbortController(); activeOperation = controller;
      const abort = () => controller.abort(signal.reason);
      if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
      try {
        if (!ready || !engine || restartNeeded) return await initializeInside(controller.signal);
        await drainCaptures(); assertCurrent();
        const snapshot = await engine.synchronize(currentThreads(), { signal: controller.signal }); assertCurrent();
        await reconcile(snapshot); assertCurrent();
        return { ok: true, ...status() };
      } finally { signal?.removeEventListener('abort', abort); if (activeOperation === controller) activeOperation = null; }
    }).finally(() => { synchronizePromise = null; });
    return waitWithSignal(synchronizePromise, signal);
  }
  async function resolveInside(id, decision) {
    if (!['local', 'remote'].includes(decision)) throw coordinatorError('SYNC_INVALID_CONFLICT_DECISION');
    if (!ready || !engine || restartNeeded) await initializeInside();
    await drainCaptures(); assertCurrent();
    if (appServer.running?.has(id)) throw coordinatorError('SYNC_CONFLICT_ACTIVE');
    const conflict = (await engine.conflicts()).find(value => value.id === id); assertCurrent();
    if (!conflict) {
      const resolved = await engine.snapshot(currentThreads()); assertCurrent();
      await reconcile(resolved);
      return { ok: true, alreadyResolved: true, ...status() };
    }
    const current = appServer.threads.get(id);
    try { if (current) projectThread(current); }
    catch (error) {
      // A saved conflict may hold the earlier, smaller local version. Do not
      // resolve that version while a different unsynced record is visible.
      if (error?.code === 'SYNC_DOCUMENT_TOO_LARGE') return { ok: false, ...status(), lastErrorCode: error.code };
      throw error;
    }
    let forkedId = null;
    if (decision === 'local' && conflict.remoteMetadata?.deleted && conflict.local !== null) {
      const retainedView = value => {
        const view = projectThread(value); view.id = 'retained-copy'; view.sessionId = 'retained-copy'; view.forkedFromId = id;
        if (view.adapterMetadata?.classicRootId) view.adapterMetadata.classicRootId = 'retained-copy';
        return view;
      };
      const pendingCopies = await engine.snapshot(currentThreads()); assertCurrent();
      // The original conflict intentionally survives an interrupted local
      // apply. Recover its already durable exact fork after page reload, using
      // real native fork provenance and equivalent projected history.
      const recovered = pendingCopies.threads.find(thread => thread.forkedFromId === id && same(retainedView(thread), retainedView(conflict.local)));
      forkedId = copiedConflicts.get(id) ?? recovered?.id ?? uuid();
      const existingCopy = appServer.threads.get(forkedId);
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(forkedId) || forkedId === id || existingCopy && ((copiedConflicts.get(id) !== forkedId && recovered?.id !== forkedId) || existingCopy.forkedFromId !== id)) throw coordinatorError('SYNC_INVALID_FORK_ID');
      copiedConflicts.set(id, forkedId);
      const makeCopy = () => {
        const actual = appServer.threads.get(id);
        const retained = projectThread(actual ?? appServer.threads.get(forkedId) ?? recovered ?? conflict.local);
        const copy = clone(retained); copy.id = forkedId; copy.sessionId = forkedId; copy.forkedFromId = id;
        if (copy.adapterMetadata?.classicRootId) copy.adapterMetadata.classicRootId = forkedId;
        return copy;
      };
      const initialCopy = makeCopy();
      const target = currentThreads().filter(thread => thread.id !== id && thread.id !== forkedId); target.push(initialCopy);
      // The fresh copy reaches the durable outbox BEFORE the original durable
      // conflict can be cleared. Neither operation resurrects the tombstone ID.
      await captureInside(target);
      const latestTarget = currentThreads().filter(thread => thread.id !== id && thread.id !== forkedId); latestTarget.push(makeCopy());
      // This full, current Map incorporates native writes that arrived while
      // the explicit fork decision was being durably staged. Their older
      // membership records must not later remove the new explicit copy.
      const beforeApplySequence = sequence;
      await appliedSnapshot({ threads: latestTarget }); assertCurrent();
      for (const recordId of captures.keys()) if (recordId <= beforeApplySequence) captures.delete(recordId);
      await engine.resolveConflict(id, 'remote'); assertCurrent();
    } else { await engine.resolveConflict(id, decision); assertCurrent(); }
    // Pending normal choices stay conflicts until their conditional mutation
    // is really acknowledged. A fork is only cloud-saved after this succeeds.
    try { await engine.flush(); assertCurrent(); }
    catch (error) {
      const pendingView = await engine.snapshot(currentThreads()); assertCurrent();
      await reconcile(pendingView);
      const result = failed(error); return { ...result, ...(forkedId ? { forkedId } : {}) };
    }
    const view = await engine.snapshot(currentThreads()); assertCurrent();
    await reconcile(view); return { ok: true, ...(forkedId ? { forkedId } : {}), ...status() };
  }
  function resolveConflict(id, decision) { return enqueue(() => resolveInside(id, decision)); }
  async function whenIdle() { for (;;) { const pending = chain; await pending; if (pending === chain) return status(); } }

  eventTarget?.addEventListener?.('pagehide', pageHide);
  eventTarget?.addEventListener?.('pageshow', pageShow);
  documentTarget?.addEventListener?.('visibilitychange', foreground);
  eventTarget?.addEventListener?.('online', foreground);
  eventTarget?.addEventListener?.('focus', foreground);
  return Object.freeze({ start, synchronize, capture, whenIdle, resolveConflict, dispose, status, get sync() { return engine; } });
}
