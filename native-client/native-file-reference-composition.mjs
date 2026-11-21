/** Relocate an already trusted Library reference onto one proven workspace span.
 * Presentation only: no raw reads, URL grants, publication or body rewriting.
 */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha256 = /^[0-9a-f]{64}$/;
const terminal = new Set(['completed', 'failed', 'interrupted']);
const owner = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim() && typeof value.userId === 'string' && value.userId.trim()
  && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? { accountId: value.accountId, userId: value.userId, accountUserId: value.accountUserId ?? null } : null;
const keyOfOwner = value => value ? JSON.stringify([value.accountId, value.userId, value.accountUserId]) : null;
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assistant = item => ({ id: item?.id, type: item?.type, text: item?.text, phase: item?.phase });
const publications = turn => turn.items.filter(item => item?.type === 'mcpToolCall' && item.server === 'browser_workspace' && item.tool === 'publish_file');
const contextStamp = context => JSON.stringify({ thread: context.thread.id, turn: context.turn.id, status: context.turn.status, assistant: assistant(context.item), publications: publications(context.turn).map(item => ({ id: item.id, status: item.status, arguments: item.arguments, result: item.result })) });

export function createNativeFileReferenceComposition({ getIdentity, getThread, publicationProjector, workspaceProjector, normalizeReceipt, describePublicationSource, isPublicationSourceCurrent, getDescriptionSHA, onDiagnostic = () => {} } = {}) {
  if (![getIdentity, getThread, normalizeReceipt, describePublicationSource, isPublicationSourceCurrent, getDescriptionSHA].every(value => typeof value === 'function')
    || typeof publicationProjector?.forAssistant !== 'function' || typeof workspaceProjector?.forAssistant !== 'function' || typeof workspaceProjector?.getReferenceDescription !== 'function') throw TypeError('Verified native reference projectors and branded source/provenance readers are required.');
  const readOwner = () => { try { return owner(getIdentity()); } catch { return null; } }, bootOwner = readOwner(), bootKey = keyOfOwner(bootOwner);
  const currentOwner = () => !!bootKey && keyOfOwner(readOwner()) === bootKey;
  const note = code => { try { onDiagnostic({ type: 'native-file-reference-composition-skipped', code }); } catch {} };
  function canonical(context) {
    if (!currentOwner() || !object(context?.thread) || typeof context.thread.id !== 'string' || typeof context.turn?.id !== 'string' || typeof context.item?.id !== 'string') return null;
    const thread = getThread(context.thread.id);
    if (!object(thread) || thread.id !== context.thread.id || !Array.isArray(thread.turns)) return null;
    const turns = thread.turns.filter(turn => turn?.id === context.turn.id);
    if (turns.length !== 1 || !Array.isArray(turns[0].items) || !terminal.has(turns[0].status) || turns[0].status !== context.turn.status) return null;
    const turn = turns[0], matches = turn.items.filter(item => item?.type === 'agentMessage' && item.id === context.item.id);
    if (matches.length !== 1 || turn.items.findLast(item => item?.type === 'agentMessage') !== matches[0] || matches[0].phase === 'commentary' || typeof matches[0].text !== 'string' || !equal(assistant(matches[0]), assistant(context.item))) return null;
    return { thread, turn, item: matches[0] };
  }
  function forAssistant(context) {
    try {
      const actual = canonical(context); if (!actual) return [];
      const stamp = contextStamp(actual), unchanged = () => { try { const value = canonical(context); return !!value && contextStamp(value) === stamp; } catch { return false; } };
      const library = publicationProjector.forAssistant(actual), workspace = workspaceProjector.forAssistant(actual);
      if (!Array.isArray(library) || !Array.isArray(workspace) || !unchanged()) return [];
      const descriptions = workspace.map(reference => workspaceProjector.getReferenceDescription(reference));
      const fallback = () => [...library, ...workspace];
      const proofs = [], candidates = [];
      // Do not obtain a byte digest when there is no strict Library target.
      if (library.length && workspace.length) {
        for (const publication of publications(actual.turn)) {
          if (publication.status !== 'completed' || publication.result?.isError !== false) continue;
          const data = publication.result?.structuredContent, operation = object(data) ? Object.getOwnPropertyDescriptor(data, 'operationId') : null;
          if (!operation || !Object.hasOwn(operation, 'value') || typeof operation.value !== 'string') continue;
          let receipt, proof;
          try {
            receipt = normalizeReceipt(data, operation.value);
            proof = describePublicationSource(receipt);
          } catch { continue; }
          if (!unchanged()) return [];
          if (!object(proof) || proof.bytesVerified !== false || proof.owner !== bootOwner.accountId || proof.operationId !== receipt.operationId || proof.fileId !== receipt.fileId || proof.rawFileId !== receipt.rawFileId || proof.revision !== receipt.revision || proof.sourceSHA256 !== receipt.sha256 || proof.size !== receipt.size || !sha256.test(proof.sourceSHA256 ?? '') || isPublicationSourceCurrent(proof) !== true) continue;
          proofs.push(proof);
          for (let index = 0; index < library.length; index++) {
            const reference = library[index];
            if (!object(reference) || reference.type !== 'file' || reference.file_id !== receipt.rawFileId || reference.library_file_id !== receipt.fileId || reference.name !== receipt.fileName || reference.mime_type !== receipt.mimeType || reference.size !== receipt.size
              || ['start_idx', 'end_idx', 'matched_text'].some(key => Object.hasOwn(reference, key))) continue;
            const candidateKey = JSON.stringify([index, proof.operationId, proof.fileId, proof.rawFileId, proof.revision]);
            if (!candidates.some(value => value.key === candidateKey)) candidates.push({ key: candidateKey, libraryIndex: index, receipt, proof });
          }
        }
      }
      const sourceKeys = descriptions.map(description => object(description) ? JSON.stringify([description.ownerKey, description.conversationId, description.messageId, description.sandboxPath, description.artifactURI]) : null);
      const edges = [];
      for (let index = 0; index < workspace.length; index++) {
        const description = descriptions[index], reference = workspace[index];
        if (!object(description) || description.ownerKey !== bootKey || description.conversationId !== actual.thread.id || description.messageId !== actual.item.id || description.bytesVerified !== false || sourceKeys.filter(value => value === sourceKeys[index]).length !== 1 || workspaceProjector.getReferenceDescription(reference) !== description) continue;
        const cheap = candidates.filter(candidate => candidate.proof.sourceThreadId === description.conversationId && '/mnt/data/' + candidate.proof.sourcePath === description.sandboxPath && candidate.proof.size === description.size);
        if (!cheap.length) continue;
        const digest = getDescriptionSHA(description);
        if (!unchanged() || workspaceProjector.getReferenceDescription(reference) !== description) return [];
        if (typeof digest !== 'string' || !sha256.test(digest)) continue;
        const matches = cheap.filter(candidate => candidate.proof.sourceSHA256 === digest && candidate.receipt.sha256 === digest && isPublicationSourceCurrent(candidate.proof) === true);
        const indices = [...new Set(matches.map(candidate => candidate.libraryIndex))];
        if (indices.length !== 1) continue;
        edges.push({ workspaceIndex: index, libraryIndex: indices[0], proof: matches.find(candidate => candidate.libraryIndex === indices[0]).proof });
      }
      if (!unchanged() || proofs.some(proof => isPublicationSourceCurrent(proof) !== true)) return [];
      // A callback may revoke registered ownership without changing a journal.
      // Recheck the unchanged strict projector rather than inventing a new grant.
      if (!equal(publicationProjector.forAssistant(actual), library) || !unchanged()) return [];
      for (let index = 0; index < workspace.length; index++) if (descriptions[index] && workspaceProjector.getReferenceDescription(workspace[index]) !== descriptions[index]) return [];
      const unique = edges.filter(edge => edges.filter(value => value.libraryIndex === edge.libraryIndex).length === 1 && isPublicationSourceCurrent(edge.proof) === true);
      if (!unique.length) return currentOwner() ? fallback() : [];
      const moved = new Map(unique.map(edge => [edge.libraryIndex, edge])), removed = new Set(unique.map(edge => edge.workspaceIndex));
      const output = library.map((reference, index) => {
        const edge = moved.get(index); if (!edge) return reference;
        const span = workspace[edge.workspaceIndex];
        return { ...reference, start_idx: span.start_idx, end_idx: span.end_idx, matched_text: span.matched_text };
      });
      output.push(...workspace.filter((_reference, index) => !removed.has(index)));
      return unchanged() && currentOwner() && unique.every(edge => isPublicationSourceCurrent(edge.proof) === true) ? output : [];
    } catch { note('SOURCE_OR_PROVENANCE_CHANGED'); return []; }
  }
  return Object.freeze({ forAssistant });
}
