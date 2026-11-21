/** Native presentation metadata for explicitly linked, actual workspace outputs.
 * Original Markdown AST and the source domain are injected. No body rewrite,
 * filesystem access, storage enumeration, Library publication or URL grant.
 */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const terminal = new Set(['completed', 'failed', 'interrupted']);
const writers = new Set(['create_file', 'python', 'write_file', 'delete_file']);
const owner = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim() && typeof value.userId === 'string' && value.userId.trim() && (value.accountUserId == null || typeof value.accountUserId === 'string') ? JSON.stringify([value.accountId, value.userId, value.accountUserId ?? null]) : null;
const assistant = item => ({ id: item?.id, type: item?.type, text: item?.text, phase: item?.phase ?? null });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function locate(thread, turnId, messageId) {
  if (!object(thread) || !Array.isArray(thread.turns)) return null;
  const turns = thread.turns.filter(turn => turn?.id === turnId);
  if (turns.length !== 1 || !Array.isArray(turns[0].items)) return null;
  const turn = turns[0], matches = turn.items.filter(item => item?.type === 'agentMessage' && item.id === messageId);
  if (matches.length !== 1 || turn.items.findLast(item => item?.type === 'agentMessage') !== matches[0]) return null;
  const item = matches[0];
  if (!terminal.has(turn.status) || typeof item.text !== 'string' || item.phase === 'commentary') return null;
  return { turn, item, turnIndex: thread.turns.indexOf(turn), itemIndex: turn.items.indexOf(item) };
}
const turnView = (turn, index) => ({ id: turn.id, status: turn.status, sources: turn.items.slice(0, index).filter(item => item?.type === 'mcpToolCall' && item.server === 'browser_workspace' && writers.has(item.tool)).map(item => ({ id: item.id, server: item.server, tool: item.tool, status: item.status, arguments: item.arguments, result: { isError: item.result?.isError, structuredContent: item.result?.structuredContent } })) });
function prefixView(thread, context) {
  return thread.turns.slice(0, context.turnIndex + 1).map((turn, index) => turnView(turn, index === context.turnIndex ? context.itemIndex : turn.items.length));
}
const isBoundary = (text, offset) => offset === 0 || offset === text.length || !(text.charCodeAt(offset) >= 0xdc00 && text.charCodeAt(offset) <= 0xdfff && text.charCodeAt(offset - 1) >= 0xd800 && text.charCodeAt(offset - 1) <= 0xdbff);
function linksFromAST(ast, text, maxNodes, maxLinks) {
  if (!object(ast) || ast.type !== 'root') throw Error('AST_INVALID');
  const pending = [ast], seen = new Set(), links = [], definitions = new Map(), referenceLinks = [];
  const addLink = (node, uri) => {
    const start = node.position?.start?.offset, end = node.position?.end?.offset;
    if (typeof uri !== 'string' || !uri || uri.length > 8192 || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > text.length || !isBoundary(text, start) || !isBoundary(text, end)) throw Error('AST_INVALID');
    if (!/^sandbox:/i.test(uri)) links.push({ uri, start, end, text: text.slice(start, end) });
    if (links.length > maxLinks) throw Error('LINK_LIMIT');
  };
  for (let index = 0; index < pending.length; index++) {
    if (pending.length > maxNodes) throw Error('AST_LIMIT');
    const node = pending[index];
    if (!object(node) || seen.has(node)) throw Error('AST_INVALID');
    seen.add(node);
    if (['code', 'inlineCode', 'html', 'image', 'imageReference'].includes(node.type)) continue;
    if (node.type === 'definition') {
      // Native identifiers are already normalized. Count every definition before
      // inspecting its URL so an owned later URL cannot displace an earlier one.
      if (typeof node.identifier === 'string' && node.identifier) definitions.set(node.identifier, definitions.has(node.identifier) ? null : node);
      continue;
    }
    if (node.type === 'linkReference') {
      if (['full', 'collapsed', 'shortcut'].includes(node.referenceType) && typeof node.identifier === 'string' && node.identifier) referenceLinks.push(node);
      continue;
    }
    if (node.type === 'link') {
      addLink(node, node.url);
      continue;
    }
    if ('children' in node) {
      if (!Array.isArray(node.children)) throw Error('AST_INVALID');
      if (pending.length + node.children.length > maxNodes) throw Error('AST_LIMIT');
      pending.push(...node.children);
    }
  }
  for (const node of referenceLinks) {
    const definition = definitions.get(node.identifier);
    if (!definition || typeof definition.url !== 'string' || !definition.url || definition.url.length > 8192) continue;
    addLink(node, definition.url);
  }
  links.sort((a, b) => a.start - b.start || a.end - b.end);
  const result = [];
  for (const link of links) {
    const previous = result.at(-1);
    if (previous?.start === link.start && previous.end === link.end && previous.uri === link.uri) continue;
    if (previous && link.start < previous.end) throw Error('AST_OVERLAP');
    result.push(link);
  }
  return result;
}
export function createNativeWorkspaceReferences({ getIdentity, getThread, parseMarkdown, describeFile, isDescriptionCurrent, onDiagnostic = () => {}, maxTextCharacters = 1000000, maxNodes = 10000, maxLinks = 64 } = {}) {
  if (![getIdentity, getThread, parseMarkdown, describeFile, isDescriptionCurrent].every(value => typeof value === 'function') || !Number.isSafeInteger(maxTextCharacters) || maxTextCharacters < 1 || maxTextCharacters > 1000000 || !Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 10000 || !Number.isSafeInteger(maxLinks) || maxLinks < 1 || maxLinks > 64) throw TypeError('Verified native history, original synchronous Markdown AST and workspace description readers are required.');
  const issuedReferences = new WeakMap();
  const readOwner = () => { try { return owner(getIdentity()); } catch { return null; } }, bootOwner = readOwner();
  const current = () => !!bootOwner && readOwner() === bootOwner;
  const note = code => { try { onDiagnostic({ type: 'native-workspace-reference-skipped', code }); } catch {} };
  function forAssistant(context) {
    try {
      const { thread, turn, item } = object(context) ? context : {};
      if (!current() || !object(thread) || typeof thread.id !== 'string' || !object(turn) || typeof turn.id !== 'string' || !object(item) || typeof item.id !== 'string') return [];
      const actual = getThread(thread.id), canonical = locate(actual, turn.id, item.id), supplied = locate(thread, turn.id, item.id), suppliedTurn = locate({ turns: [turn] }, turn.id, item.id);
      if (!canonical || !supplied || !suppliedTurn || !equal(assistant(canonical.item), assistant(item)) || !equal(assistant(canonical.item), assistant(supplied.item)) || !equal(assistant(canonical.item), assistant(suppliedTurn.item)) || !equal(turnView(canonical.turn, canonical.itemIndex), turnView(suppliedTurn.turn, suppliedTurn.itemIndex)) || (thread !== actual && !equal(prefixView(actual, canonical), prefixView(thread, supplied)))) return [];
      const original = assistant(canonical.item), status = canonical.turn.status, text = canonical.item.text, sourceFingerprint = JSON.stringify(prefixView(actual, canonical));
      if (text.length > maxTextCharacters) { note('TEXT_LIMIT'); return []; }
      const sourceCurrent = () => { try { const next = locate(getThread(thread.id), turn.id, item.id); return current() && !!next && next.turn.status === status && equal(assistant(next.item), original); } catch { return false; } };
      const sourcesCurrent = () => { try { const nextThread = getThread(thread.id), next = locate(nextThread, turn.id, item.id); return !!next && JSON.stringify(prefixView(nextThread, next)) === sourceFingerprint; } catch { return false; } };
      const ast = parseMarkdown(text);
      if (ast?.then) throw Error('AST_ASYNC');
      if (!sourceCurrent() || !sourcesCurrent()) return [];
      const links = linksFromAST(ast, text, maxNodes, maxLinks), descriptions = [], references = [];
      for (const link of links) {
        let description;
        try { description = describeFile({ conversationId: thread.id, messageId: item.id, artifactURI: link.uri }); }
        catch { continue; }
        if (description?.then) throw Error('DESCRIPTION_ASYNC');
        if (!object(description) || description.ownerKey !== bootOwner || description.conversationId !== thread.id || description.messageId !== item.id || typeof description.sandboxPath !== 'string' || !description.sandboxPath.startsWith('/mnt/data/') || typeof description.fileName !== 'string' || !description.fileName || typeof description.mimeType !== 'string' || !description.mimeType || !Number.isSafeInteger(description.size) || description.size < 0 || description.bytesVerified !== false || !['create_file', 'python'].includes(description.producerKind) || isDescriptionCurrent(description) !== true || !sourceCurrent()) continue;
        descriptions.push(description);
        references.push({ type: 'file', name: description.fileName, sandbox_path: description.sandboxPath, message_id: item.id, mime_type: description.mimeType, size: description.size, start_idx: Array.from(text.slice(0, link.start)).length, end_idx: Array.from(text.slice(0, link.end)).length, matched_text: link.text });
      }
      if (!sourceCurrent() || !sourcesCurrent() || descriptions.some(description => isDescriptionCurrent(description) !== true)) return [];
      for (let index = 0; index < references.length; index++) issuedReferences.set(references[index], { description: descriptions[index], referenceFingerprint: JSON.stringify(references[index]), sourceCurrent, sourcesCurrent });
      return references;
    } catch { note('SOURCE_OR_AST_UNAVAILABLE'); return []; }
  }
  function getReferenceDescription(reference) {
    try {
      const issued = object(reference) ? issuedReferences.get(reference) : null;
      if (!issued || !current() || JSON.stringify(reference) !== issued.referenceFingerprint || !issued.sourceCurrent() || !issued.sourcesCurrent() || isDescriptionCurrent(issued.description) !== true || !current()) return null;
      return issued.description;
    } catch { return null; }
  }
  return Object.freeze({ forAssistant, getReferenceDescription });
}
