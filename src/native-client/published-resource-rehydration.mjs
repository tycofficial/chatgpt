/** Rebuild presentation-only links for already committed publish_file results.
 * This module has no executor/publisher/model APIs and never scans a workspace.
 */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => structuredClone(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const ownerShape = value => value && typeof value.accountId === 'string' && value.accountId && typeof value.userId === 'string' && value.userId
  ? { accountId: value.accountId, userId: value.userId, accountUserId: value.accountUserId ?? null } : null;
const sameOwner = (left, right) => !!left && !!right && left.accountId === right.accountId && left.userId === right.userId && left.accountUserId === right.accountUserId;
const operationPattern = /^tool_[0-9a-f]{64}$/;
const PUBLIC_UNAVAILABLE = 'LOCAL_LIBRARY_PUBLICATION_DOWNLOAD_UNAVAILABLE';
export class PublicationRehydrationError extends Error {
  constructor(code, message, extra = {}) { super(message); this.name = 'PublicationRehydrationError'; this.code = code; Object.assign(this, extra); }
}
function error(code, message, extra) { return new PublicationRehydrationError(code, message, extra); }
function hasReceipt(result) { return object(result) && object(result.structuredContent) && result.structuredContent.committed === true; }
function toolName(call) { return call?.function?.name; }
function publicReason(cause) { return /^LOCAL_LIBRARY_[A-Z0-9_]+$/.test(cause?.code ?? '') ? cause.code : PUBLIC_UNAVAILABLE; }
function resultFor(receipt, resource, reason) {
  const data = { ...clone(receipt), downloadAvailable: !!resource, ...(!resource ? { downloadUnavailable: true, downloadUnavailableReason: reason ?? PUBLIC_UNAVAILABLE } : {}) };
  return { content: [{ type: 'text', text: JSON.stringify(data) }, ...(resource ? [{ type: 'resource_link', uri: resource.uri, name: receipt.fileName, mimeType: receipt.mimeType, size: receipt.size }] : [])], structuredContent: data, isError: false };
}
/** normalizeReceipt is the exact shared publisher V3 normalizer, injected by root. */
export function createPublishedResourceRehydrator({ normalizeReceipt, resolvePublishedResource, ownsObjectURL, getIdentity, projectThread, onDiagnostic = () => {} } = {}) {
  if (![normalizeReceipt, resolvePublishedResource, ownsObjectURL, getIdentity].every(value => typeof value === 'function')) throw TypeError('Exact receipt validation, owned Library resolution and verified identity callbacks are required.');
  const bootOwner = ownerShape(getIdentity());
  const currentOwner = () => sameOwner(bootOwner, ownerShape(getIdentity()));
  const diagnostic = value => { try { onDiagnostic(value); } catch {} };
  const signalCheck = signal => signal?.throwIfAborted();
  const requireOwner = () => { if (!currentOwner()) throw error('LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', 'Reopen the original verified account before restoring its saved file links.', { safeToApply: false }); };
  function normalize(result) {
    if (!hasReceipt(result)) return null;
    if (result.isError === true) return null;
    const data = result.structuredContent;
    if (typeof data.operationId !== 'string' || !operationPattern.test(data.operationId)) throw error('LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID', 'The completed publication has no valid operation identity.', { safeToApply: false });
    // The exact immutable raw association/SHA/owner are checked by the real Library.
    // Native item IDs and tool-call IDs are not substituted for publication IDs.
    try { return normalizeReceipt(data, data.operationId); }
    catch { throw error('LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID', 'The completed publication receipt is invalid; it was not executed again.', { safeToApply: false }); }
  }
  async function resolve(receipt, signal, memo) {
    const key = JSON.stringify(receipt);
    if (!memo.has(key)) memo.set(key, (async () => {
      signalCheck(signal);
      if (!currentOwner()) return { resource: null, reason: 'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', safeToApply: false };
      try {
        const value = await resolvePublishedResource(clone(receipt), { signal });
        signalCheck(signal);
        const owned = typeof value?.uri === 'string' && value.uri.startsWith('blob:') && ownsObjectURL(value.uri);
        if (!currentOwner()) return { resource: null, reason: 'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', safeToApply: false };
        if (!owned || value.rawFileId !== receipt.rawFileId || value.revision !== receipt.revision || value.sha256 !== receipt.sha256 || value.mimeType !== receipt.mimeType || value.name !== receipt.fileName) return { resource: null, reason: 'LOCAL_LIBRARY_PUBLICATION_RESOURCE_MISMATCH', safeToApply: true };
        return { resource: { uri: value.uri }, reason: null, safeToApply: true };
      } catch (cause) {
        signalCheck(signal);
        if (!currentOwner()) return { resource: null, reason: 'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', safeToApply: false };
        return { resource: null, reason: publicReason(cause), safeToApply: true };
      }
    })());
    const result = await memo.get(key); signalCheck(signal);
    if (!currentOwner()) return { resource: null, reason: 'LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', safeToApply: false };
    return result;
  }
  async function transform(result, { signal, memo = new Map() } = {}) {
    signalCheck(signal);
    const receipt = normalize(result);
    if (!receipt) return { result: clone(result), changed: false, state: 'not-committed-publication', safeToApply: true };
    const resolved = await resolve(receipt, signal, memo), next = resultFor(receipt, resolved.resource, resolved.reason);
    return { result: next, changed: !equal(result, next), state: resolved.resource ? 'available' : 'unavailable', reason: resolved.reason, safeToApply: resolved.safeToApply, receipt: clone(receipt) };
  }
  function transcriptCalls(array, names) {
    if (!Array.isArray(array)) return;
    for (const message of array) if (message?.role === 'assistant' && Array.isArray(message.tool_calls)) for (const call of message.tool_calls) if (typeof call?.id === 'string' && toolName(call) === 'publish_file') names.add(call.id);
  }
  async function threadResult(thread, { signal, memo = new Map() } = {}) {
    signalCheck(signal); requireOwner();
    if (!object(thread) || typeof thread.id !== 'string' || !Array.isArray(thread.turns)) throw TypeError('A native thread snapshot is required.');
    if (typeof projectThread !== 'function') throw TypeError('The actual cloud thread projection is required for history rehydration.');
    const before = clone(thread), after = clone(thread), projectedBefore = projectThread(before), reports = [];
    if (thread.ephemeral === true) return { before, after, changed: false, reports, skipped: 'ephemeral', safeToApply: true };
    for (let turnIndex = 0; turnIndex < after.turns.length; turnIndex++) {
      const turn = after.turns[turnIndex], originalTurn = before.turns[turnIndex];
      if (turn.status === 'inProgress') { reports.push({ threadId: thread.id, turnId: turn.id, state: 'skipped-active-turn' }); continue; }
      const cp = turn.adapterMetadata?.checkpoint, names = new Set();
      if (object(cp?.completedCalls)) for (const [callId, record] of Object.entries(cp.completedCalls)) if (record?.name === 'publish_file') names.add(callId);
      if (Array.isArray(cp?.pendingCalls)) for (const record of cp.pendingCalls) if (record?.state === 'completed' && typeof record.call?.id === 'string' && toolName(record.call) === 'publish_file') names.add(record.call.id);
      transcriptCalls(cp?.transcript, names); transcriptCalls(turn.adapterMetadata?.apiTranscript, names);
      let turnChanged = false;
      async function rewrite(value, write, target, callId) {
        const resolved = await transform(value, { signal, memo });
        if (!resolved.safeToApply) throw error('LOCAL_LIBRARY_REHYDRATION_ACCOUNT_CHANGED', 'The account changed while rebuilding a committed file link; no restored result was applied.', { safeToApply: false });
        if (resolved.changed) { write(resolved.result); turnChanged = true; }
        if (resolved.receipt) reports.push({ threadId: thread.id, turnId: turn.id, target, ...(callId ? { callId } : {}), state: resolved.state, reason: resolved.reason, fileId: resolved.receipt.fileId, rawFileId: resolved.receipt.rawFileId, revision: resolved.receipt.revision, sha256: resolved.receipt.sha256 });
      }
      for (const item of turn.items ?? []) if (item?.type === 'mcpToolCall' && item.server === 'browser_workspace' && item.tool === 'publish_file' && item.status === 'completed' && item.result) await rewrite(item.result, value => { item.result = value; }, 'native-item');
      if (object(cp?.completedCalls)) for (const [callId, record] of Object.entries(cp.completedCalls)) if (record?.name === 'publish_file' && record.output) await rewrite(record.output, value => { record.output = value; }, 'completed-cache', callId);
      if (Array.isArray(cp?.pendingCalls)) for (const record of cp.pendingCalls) if (record?.state === 'completed' && toolName(record.call) === 'publish_file' && record.output) await rewrite(record.output, value => { record.output = value; }, 'pending-completed-output', record.call.id);
      async function rewriteTranscript(array, target) {
        if (!Array.isArray(array)) return;
        for (const message of array) {
          if (message?.role !== 'tool' || !names.has(message.tool_call_id) || typeof message.content !== 'string') continue;
          let value; try { value = JSON.parse(message.content); } catch { continue; }
          if (!hasReceipt(value)) continue;
          await rewrite(value, updated => { message.content = JSON.stringify(updated); }, target, message.tool_call_id);
        }
      }
      await rewriteTranscript(cp?.transcript, 'checkpoint-transcript');
      await rewriteTranscript(turn.adapterMetadata?.apiTranscript, 'api-transcript');
      if (turnChanged) {
        // Removing a stale link must not erase its already-public resource
        // descriptor from the canonical cloud projection or trigger re-upload.
        const derived = projectedBefore?.turns?.[turnIndex]?.adapterMetadata?.cloudUnavailableResources;
        if (derived?.length) {
          turn.adapterMetadata ??= {};
          turn.adapterMetadata.cloudUnavailableResources = clone(derived);
        }
      }
      // Only output/result slots and their derived availability metadata changed.
      if (turn.id !== originalTurn.id || turn.status !== originalTurn.status) throw error('LOCAL_LIBRARY_REHYDRATION_STATUS_CHANGED', 'A presentation update cannot change turn execution state.');
    }
    signalCheck(signal); requireOwner();
    if (!equal(projectedBefore, projectThread(after))) throw error('LOCAL_LIBRARY_REHYDRATION_PROJECTION_CHANGED', 'The result presentation would alter synced conversation semantics; no update was applied.', { safeToApply: false });
    const changed = !equal(before, after);
    return { before, after, changed, reports, projectionIdentical: true, safeToApply: true };
  }
  return Object.freeze({
    rehydrateResult: (result, options = {}) => transform(clone(result), options),
    rehydrateThread: (thread, options = {}) => threadResult(clone(thread), options),
    async rehydrateHistory(threads, { signal } = {}) {
      if (!Array.isArray(threads)) throw TypeError('Native thread snapshots are required.');
      const input = clone(threads), memo = new Map(), pairs = [], reports = [];
      requireOwner();
      for (const thread of input) { const value = await threadResult(thread, { signal, memo }); reports.push(...value.reports); if (value.changed) pairs.push({ before: value.before, after: value.after }); }
      signalCheck(signal); requireOwner();
      diagnostic({ type: 'library-publication-rehydrated', changedThreads: pairs.length, unavailableSlots: reports.filter(value => value.state === 'unavailable').length });
      return { pairs, changedThreadIds: pairs.map(pair => pair.before.id), reports, projectionIdentical: true, safeToApply: true };
    },
  });
}
