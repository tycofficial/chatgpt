/** Exact local create_file versions for the original private sandbox-download route.
 * This domain reads one owned workspace path; it never recreates bytes from
 * history, lists a filesystem, imports a Library file, or publishes a resource.
 */
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const terminal = new Set(['completed', 'failed', 'interrupted']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const issue = (message, status, code) => Object.assign(new Error(message), { status, code });
const fail = (suffix, message, status = 409) => { throw issue(message, status, 'LOCAL_WORKSPACE_DOWNLOAD_' + suffix); };
const owner = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim()
  && typeof value.userId === 'string' && value.userId.trim()
  && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? JSON.stringify([value.accountId, value.userId, value.accountUserId ?? null]) : null;
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', value))].map(byte => byte.toString(16).padStart(2, '0')).join('');

export function createWorkspaceDownloadSource({ getIdentity, getThread, getWorkspacePrefix, storage, workspacePath, maxBytes = MAX_FILE_BYTES } = {}) {
  if (![getIdentity, getThread, getWorkspacePrefix, workspacePath].every(value => typeof value === 'function') || typeof storage?.read !== 'function'
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_FILE_BYTES) throw new TypeError('Verified identity, actual thread/workspace readers and the bounded original path resolver are required.');
  const readOwner = () => { try { return owner(getIdentity()); } catch { return null; } };
  const bootOwner = readOwner(), issued = new WeakMap(), encoder = new TextEncoder();
  function guardOwner() {
    if (!bootOwner) fail('AUTH_REQUIRED', 'Sign in before downloading a conversation workspace file.', 401);
    if (readOwner() !== bootOwner) fail('ACCOUNT_CHANGED', 'The verified workspace account changed. Reopen the original account.');
    return bootOwner;
  }
  function request(value) {
    if (!object(value) || !['conversationId', 'messageId'].every(key => typeof value[key] === 'string' && value[key].trim() === value[key]
      && value[key].length > 0 && value[key].length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value[key]))
      || typeof value.sandboxPath !== 'string' || value.sandboxPath.length > 4096 || !value.sandboxPath.startsWith('/mnt/data/')) {
      fail('INVALID_REQUEST', 'An actual conversation, assistant message and canonical /mnt/data path are required.', 400);
    }
    let relativePath;
    try { relativePath = workspacePath(value.sandboxPath); } catch { fail('INVALID_PATH', 'The workspace path is invalid.', 400); }
    if (typeof relativePath !== 'string' || !relativePath || value.sandboxPath !== '/mnt/data/' + relativePath
      || relativePath.startsWith('/') || /[\\\u0000-\u001f\u007f]/u.test(relativePath) || relativePath.split('/').some(part => !part || part === '.' || part === '..')) {
      fail('INVALID_PATH', 'The workspace path must be canonical and remain inside /mnt/data.', 400);
    }
    return { conversationId: value.conversationId, messageId: value.messageId, sandboxPath: value.sandboxPath, relativePath };
  }
  const pathOf = value => {
    if (typeof value !== 'string') return null;
    try { return workspacePath(value); } catch { return null; }
  };
  function capture(spec) {
    guardOwner();
    let thread;
    try { thread = getThread(spec.conversationId); }
    catch { fail('CONVERSATION_NOT_FOUND', 'The conversation is unavailable in this verified account.', 404); }
    if (!object(thread) || thread.id !== spec.conversationId || !Array.isArray(thread.turns)) fail('CONVERSATION_NOT_FOUND', 'The actual conversation was not found.', 404);
    const matches = [];
    for (let turnIndex = 0; turnIndex < thread.turns.length; turnIndex++) {
      const turn = thread.turns[turnIndex];
      if (!object(turn) || !Array.isArray(turn.items)) fail('INVALID_HISTORY', 'The conversation source is invalid.', 409);
      for (let itemIndex = 0; itemIndex < turn.items.length; itemIndex++) {
        const item = turn.items[itemIndex];
        if (item?.type === 'agentMessage' && item.id === spec.messageId) matches.push({ turn, item, turnIndex, itemIndex });
      }
    }
    if (matches.length !== 1) fail('MESSAGE_NOT_FOUND', 'A unique actual assistant message was not found in this conversation.', matches.length ? 409 : 404);
    const context = matches[0];
    if (!terminal.has(context.turn.status) || typeof context.item.text !== 'string' || typeof context.turn.id !== 'string') fail('MESSAGE_PENDING', 'Wait for this assistant message to finish before downloading its file.', 409);
    let event = null;
    for (let ti = 0; ti <= context.turnIndex; ti++) {
      const turn = thread.turns[ti], count = ti === context.turnIndex ? context.itemIndex : turn.items.length;
      for (let ii = 0; ii < count; ii++) {
        const item = turn.items[ii];
        if (item?.type !== 'mcpToolCall' || item.server !== 'browser_workspace') continue;
        const args = object(item.arguments) ? item.arguments : {}, result = object(item.result) ? item.result : null;
        const data = object(result?.structuredContent) ? result.structuredContent : null;
        if (item.tool === 'create_file' || item.tool === 'write_file') {
          if (pathOf(args.name ?? args.path) === spec.relativePath) event = { turn, item, args, result, file: object(data?.file) ? data.file : null, kind: item.tool };
        } else if (item.tool === 'delete_file' && pathOf(args.path) === spec.relativePath) {
          event = { turn, item, kind: 'deleted' };
        } else if (item.tool === 'python' && (Array.isArray(data?.files) ? data.files : []).some(file => pathOf(file?.path ?? file?.name) === spec.relativePath)) {
          event = { turn, item, kind: 'python' };
        }
      }
    }
    if (!event) fail('PRODUCER_NOT_FOUND', 'No actual earlier file producer is recorded for this assistant context.', 404);
    if (event.kind === 'deleted') fail('VERSION_UNAVAILABLE', 'This workspace file was deleted before the requested assistant message.', 404);
    if (event.kind !== 'create_file') fail('PRODUCER_UNSUPPORTED', 'This workspace producer has no recorded exact byte version. Its historical contents cannot be guessed.', 501);
    const { item: producer, args, result, file } = event;
    // Copy the values used below before the first asynchronous digest or IO.
    const content = args.content, producerPath = args.name ?? args.path;
    const filePath = file?.path, metadataName = file?.name, size = file?.size, mimeType = file?.mime;
    if (producer.status !== 'completed' || result?.isError !== false || typeof content !== 'string' || typeof producerPath !== 'string' || !object(file)
      || typeof producer.id !== 'string' || !producer.id || typeof event.turn.id !== 'string' || !event.turn.id
      || filePath !== spec.sandboxPath || metadataName !== spec.relativePath || !Number.isSafeInteger(size) || size < 0
      || typeof mimeType !== 'string' || !mimeType || mimeType.length > 255 || /[\u0000-\u001f\u007f]/u.test(mimeType)) {
      fail('VERSION_UNAVAILABLE', 'The actual file producer did not record a successful exact file version.', 409);
    }
    if (content.length > maxBytes || size > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
    const fileName = spec.relativePath.split('/').at(-1);
    if (!fileName || fileName.length > 255) fail('INVALID_PATH', 'The actual workspace filename is unavailable.', 400);
    let prefix;
    try { prefix = getWorkspacePrefix(spec.conversationId); } catch { fail('WORKSPACE_UNAVAILABLE', 'The owned workspace namespace is unavailable.', 503); }
    if (typeof prefix !== 'string' || !prefix || /[/\\\u0000-\u001f\u007f]/u.test(prefix) || prefix === '.' || prefix === '..') fail('WORKSPACE_UNAVAILABLE', 'The owned workspace namespace is invalid.', 503);
    const snapshot = {
      conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath,
      assistant: { turnId: context.turn.id, turnStatus: context.turn.status, id: context.item.id, text: context.item.text, phase: context.item.phase ?? null },
      producer: { turnId: event.turn.id, id: producer.id, status: producer.status, server: producer.server, tool: producer.tool, path: producerPath, content,
        result: { isError: result.isError, fileName: metadataName, path: filePath, mimeType, size } },
    };
    const signature = JSON.stringify(snapshot);
    guardOwner();
    return { spec, prefix, content, fileName, mimeType, size, signature };
  }
  function current(source) {
    try { const next = capture(source.spec); return next.prefix === source.prefix && next.signature === source.signature; } catch { return false; }
  }
  function assertCurrent(source, signal) {
    signal?.throwIfAborted(); guardOwner();
    if (!current(source)) fail('SOURCE_CHANGED', 'The conversation message or workspace producer changed while reading its file.', 409);
    guardOwner(); signal?.throwIfAborted();
  }
  async function resolve(value) {
    const signal = value?.signal; signal?.throwIfAborted();
    const spec = request(value), source = capture(spec);
    if (source.content.length > maxBytes || source.size > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
    const expected = encoder.encode(source.content);
    if (expected.length > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
    if (expected.length !== source.size) fail('VERSION_UNAVAILABLE', 'The producer size does not match its actual UTF-8 content.', 409);
    const expectedSHA = await hash(expected); assertCurrent(source, signal);
    let input;
    try { input = await storage.read(source.prefix + '/' + spec.relativePath); }
    catch (error) {
      assertCurrent(source, signal);
      if (error?.name === 'NotFoundError' || error?.code === 'ENOENT' || /not found/i.test(error?.message ?? '')) fail('FILE_NOT_FOUND', 'The actual workspace file bytes are missing.', 404);
      fail('STORAGE_UNAVAILABLE', 'The workspace bytes could not be read. No substitute file was returned.', 503);
    }
    assertCurrent(source, signal);
    const view = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
    if (!view) fail('STORAGE_INVALID', 'The workspace storage did not return actual binary bytes.', 503);
    if (view.byteLength > maxBytes) fail('FILE_TOO_LARGE', 'The actual workspace file exceeds the configured transfer limit.', 413);
    const bytes = view.slice();
    if (bytes.length !== source.size) fail('VERSION_UNAVAILABLE', 'The workspace path now contains a different file version.', 409);
    const sha256 = await hash(bytes); assertCurrent(source, signal);
    if (sha256 !== expectedSHA) fail('VERSION_UNAVAILABLE', 'The workspace path was overwritten; historical bytes are not available.', 409);
    const sourceToken = await hash(encoder.encode(JSON.stringify([bootOwner, source.prefix, source.signature, sha256])));
    assertCurrent(source, signal);
    const proof = { conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath,
      ownerKey: bootOwner, fileName: source.fileName, mimeType: source.mimeType, size: bytes.length, sha256, sourceToken };
    // The proof itself is branded. Its bytes are real readback bytes, returned
    // as copies so callers cannot mutate the private verified snapshot.
    Object.defineProperty(proof, 'bytes', { enumerable: false, get: () => bytes.slice() });
    Object.freeze(proof); issued.set(proof, source); return proof;
  }
  function isCurrent(proof) {
    const source = object(proof) ? issued.get(proof) : null;
    return !!source && readOwner() === bootOwner && current(source) && readOwner() === bootOwner;
  }
  return Object.freeze({ resolve, isCurrent });
}
