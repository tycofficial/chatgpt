/** Bounded cloud-history feedback through the original native toaster only.
 * getToaster() MUST return null until SGsN.c registered a real service AND its
 * native viewport is ready; SGsN.b's initial no-op service cannot be inferred
 * from method names. API delivery is not a claim of physical rendering.
 */
const messages = Object.freeze({
  failure: Object.freeze({
    level: 'danger', title: '聊天记录尚未同步',
    description: '云端尚未确认保存聊天记录。请检查网络后重试。',
  }),
  conflict: Object.freeze({
    level: 'warning', title: '聊天记录存在同步冲突',
    description: '此对话在其他设备上发生了更改。请选择要保留的版本。',
  }),
});
let instanceSequence = 0;
const safeConversationLabel = value => {
  if (typeof value !== 'string') return '未命名对话';
  // Bounded plain text only. The original renderer receives a string rather
  // than markup, a React element, an object coercion or an error description.
  const plain = value.slice(0, 2048).replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/gu, ' ').trim();
  return Array.from(plain).slice(0, 120).join('') || '未命名对话';
};

export function createNativeCloudSyncFeedback({
  ownerId, getOwnerId, getToaster, onRetry, onResolveConflict,
  eventTarget = globalThis.window ?? null,
  pollMs = 500,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = handle => globalThis.clearTimeout(handle),
} = {}) {
  if (typeof ownerId !== 'string' || !ownerId || ownerId.length > 200 ||
      typeof getOwnerId !== 'function' || typeof getToaster !== 'function' || typeof onRetry !== 'function' || typeof onResolveConflict !== 'function') {
    throw new TypeError('Cloud feedback requires an explicit verified owner and native service callbacks.');
  }
  const instanceId = ++instanceSequence;
  const delay = Number.isFinite(pollMs) ? Math.min(5000, Math.max(100, pollMs)) : 500;
  // One generic failure and at most five distinct conversation conflicts.
  // Overflow is returned explicitly; the durable coordinator retains the rest.
  const entries = new Map();
  let disposed = false, timer = null, entrySequence = 0;

  const close = handle => { try { handle?.close?.(); } catch {} };
  const cancelTimer = () => { if (timer !== null) { clearTimer(timer); timer = null; } };
  function release(entry) {
    ++entry.generation;
    entry.retryController?.abort();
    entry.retryController = null;
    const handle = entry.handle;
    entry.handle = null;
    close(handle);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelTimer();
    eventTarget?.removeEventListener?.('pagehide', pageHide);
    for (const entry of entries.values()) release(entry);
    entries.clear();
  }
  function current() {
    if (disposed) return false;
    let actual; try { actual = getOwnerId(); } catch { actual = null; }
    if (actual !== ownerId) { dispose(); return false; }
    return true;
  }
  function pending() { return [...entries.values()].some(entry => !entry.notified); }
  function schedule() {
    if (timer !== null || !pending() || !current()) return;
    timer = setTimer(() => { timer = null; flush(); }, delay);
    timer?.unref?.();
  }

  function action(entry, choice, generation) {
    if (!current() || entries.get(entry.key) !== entry || entry.generation !== generation || entry.retryController) return Promise.resolve(false);
    const controller = new AbortController();
    entry.retryController = controller;
    // The native button does not await onClick; rejection must be contained.
    return Promise.resolve().then(() => {
      if (!current() || controller.signal.aborted || entries.get(entry.key) !== entry || entry.generation !== generation) return false;
      if (entry.kind === 'conflict') return onResolveConflict(entry.conversationId, choice, { ownerId, remoteDeleted: entry.remoteDeleted, signal: controller.signal });
      return onRetry({ ownerId, kind: entry.kind, signal: controller.signal });
    }).then(() => false, () => false).finally(() => {
      if (entry.retryController === controller) entry.retryController = null;
      current();
      // A retry resolving is NOT evidence of a persisted sync. The owner must
      // explicitly call clear only after its real client confirms resolution.
    });
  }

  function flush() {
    if (!current()) return 0;
    let toaster; try { toaster = getToaster(); } catch { toaster = null; }
    if (!toaster || typeof toaster.warning !== 'function' || typeof toaster.danger !== 'function') { schedule(); return 0; }
    let delivered = 0;
    for (const entry of entries.values()) {
      if (!current()) break;
      if (entry.notified && entry.toaster === toaster) continue;
      if (entry.notified) release(entry);
      entry.notified = false;
      const generation = ++entry.generation;
      let removed = false, handle;
      const message = messages[entry.kind];
      try {
        handle = toaster[message.level](message.title, {
          id: `site-cloud-history-${instanceId}-${entry.sequence}`,
          description: entry.kind === 'conflict'
            ? `对话：${entry.conversationLabel}。${entry.remoteDeleted ? '云端已删除此对话。请选择保留此设备版本或使用云端删除结果。' : message.description}`
            : message.description,
          duration: 0,
          // A conflict must remain reachable until an explicit decision is
          // confirmed; original SGsN suppresses close/swipe for this option.
          ...(entry.kind === 'conflict' ? { hasCloseButton: false } : {}),
          primaryAction: entry.kind === 'conflict'
            ? { label: '保留此设备版本', onClick: () => action(entry, 'local', generation) }
            : { label: '重试', onClick: () => action(entry, 'retry', generation) },
          ...(entry.kind === 'conflict' ? { secondaryAction: { label: '使用云端版本', onClick: () => action(entry, 'remote', generation) } } : {}),
          onRemove: () => {
            removed = true;
            if (entry.generation === generation) entry.handle = null;
          },
        });
      } catch { schedule(); continue; }
      if (!current() || entries.get(entry.key) !== entry || entry.generation !== generation) { close(handle); continue; }
      entry.notified = true;
      entry.toaster = toaster;
      entry.handle = removed ? null : handle;
      ++delivered;
    }
    if (!pending()) cancelTimer(); else schedule();
    return delivered; // Native service calls, not a browser/paint assertion.
  }

  function report(event) {
    if (!current() || event?.ownerId !== ownerId || !Object.prototype.hasOwnProperty.call(messages, event?.kind)) return { status: 'ignored' };
    if (event.kind === 'conflict' && (typeof event.conversationId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(event.conversationId))) return { status: 'ignored' };
    const key = event.kind === 'failure' ? 'failure' : 'conflict:' + event.conversationId;
    const conversationLabel = event.kind === 'conflict' ? safeConversationLabel(event.conversationLabel) : undefined;
    const existing = entries.get(key);
    if (existing) {
      if (existing.kind === 'conflict' && (existing.remoteDeleted !== (event.remoteDeleted === true) || existing.conversationLabel !== conversationLabel)) {
        release(existing); existing.notified = false; existing.remoteDeleted = event.remoteDeleted === true; existing.conversationLabel = conversationLabel;
      }
      flush();
      return { status: 'deduplicated' };
    }
    if (event.kind === 'conflict' && [...entries.values()].filter(entry => entry.kind === 'conflict').length >= 5) return { status: 'overflow' };
    const entry = { key, kind: event.kind, conversationId: event.conversationId, conversationLabel, remoteDeleted: event.kind === 'conflict' && event.remoteDeleted === true,
      sequence: ++entrySequence, generation: 0, notified: false, toaster: null, handle: null, retryController: null };
    entries.set(key, entry);
    flush();
    if (!current()) return { status: 'ignored' };
    return { status: entry.notified ? 'notified' : 'queued' };
  }
  function clear(kind, conversationId) {
    if (!current()) return false;
    if (kind !== undefined && !Object.prototype.hasOwnProperty.call(messages, kind)) return false;
    for (const [key, entry] of entries) if ((kind === undefined || entry.kind === kind) && (conversationId === undefined || entry.conversationId === conversationId)) { entries.delete(key); release(entry); }
    if (!pending()) cancelTimer();
    return true;
  }
  function getState() {
    current();
    const values = [...entries.values()];
    return Object.freeze({ disposed, pendingCount: values.filter(entry => !entry.notified).length,
      notifiedCount: values.filter(entry => entry.notified).length,
      retryingCount: values.filter(entry => entry.retryController !== null).length });
  }
  function pageHide(event) { if (!event.persisted) dispose(); }
  eventTarget?.addEventListener?.('pagehide', pageHide);
  return Object.freeze({ report, flush, clear, dispose, getState });
}
