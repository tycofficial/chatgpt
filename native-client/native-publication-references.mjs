/** Read-only native file references for verified, completed site publications.
 * The injected identity must be the verified boot-bound site identity provider.
 * Receipt validation and immutable-resource ownership remain their own services.
 */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const terminal = new Set(['completed', 'failed', 'interrupted']);
const operationId = /^tool_[0-9a-f]{64}$/;
const owner = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim() && typeof value.userId === 'string' && value.userId.trim()
  && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? { accountId: value.accountId, userId: value.userId, accountUserId: value.accountUserId ?? null } : null;
const sameOwner = (a, b) => !!a && !!b && a.accountId === b.accountId && a.userId === b.userId && a.accountUserId === b.accountUserId;
const publicationItems = turn => turn.items.filter(item => item?.type === 'mcpToolCall' && item.server === 'browser_workspace' && item.tool === 'publish_file');
const assistantSource = item => ({ id: item.id, type: item.type, text: item.text, phase: item.phase });
const publicationSource = turn => publicationItems(turn).map(item => ({ id: item.id, status: item.status, result: item.result }));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createNativePublicationReferences({ normalizeReceipt, getIdentity, ownsPublishedResource, onDiagnostic = () => {} } = {}) {
  if (![normalizeReceipt, getIdentity, ownsPublishedResource].every(value => typeof value === 'function')) throw TypeError('Shared receipt validation, verified identity and immutable resource ownership callbacks are required.');
  const readOwner = () => { try { return owner(getIdentity()); } catch { return null; } };
  const bootOwner = readOwner();
  const current = () => sameOwner(bootOwner, readOwner());
  const diagnostic = code => { try { onDiagnostic({ type: 'native-publication-reference-skipped', code }); } catch {} };
  const none = code => { diagnostic(code); return []; };

  function forAssistant(context) {
    try {
      const { thread, turn, item } = object(context) ? context : {};
      if (!current()) return none('ACCOUNT_UNAVAILABLE');
      if (!object(thread) || typeof thread.id !== 'string' || !thread.id || !Array.isArray(thread.turns)
        || !object(turn) || typeof turn.id !== 'string' || !Array.isArray(turn.items) || !object(item) || item.type !== 'agentMessage') return [];
      if (!terminal.has(turn.status)) return [];
      // turn/completed notifications contain structured clones. Bind by native
      // IDs and the source fields used here, rather than reference equality.
      const members = thread.turns.filter(value => value?.id === turn.id);
      if (members.length !== 1) return none('SOURCE_MISMATCH');
      const actual = members[0];
      if (!Array.isArray(actual.items) || actual.status !== turn.status || !terminal.has(actual.status)) return [];
      const last = actual.items.findLast(value => value?.type === 'agentMessage');
      const requestedLast = turn.items.findLast(value => value?.type === 'agentMessage');
      if (!last || !requestedLast || typeof item.id !== 'string' || !item.id || typeof item.text !== 'string'
        || last.id !== item.id || requestedLast.id !== item.id
        || !equal(assistantSource(last), assistantSource(item)) || !equal(assistantSource(last), assistantSource(requestedLast))
        || !equal(publicationSource(actual), publicationSource(turn))) return [];

      const references = [], seen = new Set();
      for (const publication of publicationItems(actual)) {
        if (publication.status !== 'completed') continue;
        const result = publication.result, data = result?.structuredContent;
        if (!object(result) || result.isError !== false || !object(data) || data.committed !== true || data.downloadAvailable !== true || data.downloadUnavailable === true || !Array.isArray(result.content)) continue;
        try {
          const operation = Object.getOwnPropertyDescriptor(data, 'operationId');
          if (!operation || !Object.hasOwn(operation, 'value') || typeof operation.value !== 'string' || !operationId.test(operation.value)) { diagnostic('INVALID_RECEIPT'); continue; }
          const receipt = normalizeReceipt(data, operation.value);
          if (!current()) return none('ACCOUNT_CHANGED');
          // The V3 validator returns only its public receipt. Do not forward any
          // original result object to the verifier, mutate a result, or export URI.
          const reference = { type: 'file', name: receipt.fileName, file_id: receipt.rawFileId, library_file_id: receipt.fileId, mime_type: receipt.mimeType, size: receipt.size };
          if (seen.has(reference.file_id)) continue;
          let verified = false;
          for (const resource of result.content) {
            if (resource?.type !== 'resource_link' || typeof resource.uri !== 'string' || !resource.uri
              || resource.name !== reference.name || resource.mimeType !== reference.mime_type || resource.size !== reference.size) continue;
            verified = ownsPublishedResource(resource.uri, structuredClone(receipt)) === true;
            if (!current()) return none('ACCOUNT_CHANGED');
            if (verified) break;
          }
          if (!verified) { diagnostic('RESOURCE_UNAVAILABLE'); continue; }
          seen.add(reference.file_id); references.push(reference);
        } catch {
          if (!current()) return none('ACCOUNT_CHANGED');
          diagnostic('INVALID_OR_UNAVAILABLE_PUBLICATION');
        }
      }
      return current() ? references : none('ACCOUNT_CHANGED');
    } catch {
      return none('INVALID_CONTEXT');
    }
  }
  return Object.freeze({ forAssistant });
}
