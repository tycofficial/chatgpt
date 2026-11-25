/** Exact local create_file versions for the original private sandbox-download route.
 * This domain reads one owned workspace path; it never recreates bytes from
 * history, lists a filesystem, imports a Library file, or publishes a resource.
 */
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;
const MANIFEST = Object.freeze({ version: 1, source: 'browser-workspace-written-files', algorithm: 'sha256', verification: 'write-readback' });
const hasManifest = data => object(data?.artifact_manifest) && Object.keys(data.artifact_manifest).length === Object.keys(MANIFEST).length && Object.entries(MANIFEST).every(([key, value]) => data.artifact_manifest[key] === value);
const terminal = new Set(['completed', 'failed', 'interrupted']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const issue = (message, status, code) => Object.assign(new Error(message), { status, code });
const fail = (suffix, message, status = 409) => { throw issue(message, status, 'LOCAL_WORKSPACE_DOWNLOAD_' + suffix); };
const owner = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim()
  && typeof value.userId === 'string' && value.userId.trim()
  && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? JSON.stringify([value.accountId, value.userId, value.accountUserId ?? null]) : null;
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', value))].map(byte => byte.toString(16).padStart(2, '0')).join('');

export function createWorkspaceDownloadSource({ getIdentity, getThread, getWorkspacePrefix, storage, workspacePath, maxBytes = MAX_FILE_BYTES, artifactBaseURL = null, sha256Bytes = null } = {}) {
  if (![getIdentity, getThread, getWorkspacePrefix, workspacePath].every(value => typeof value === 'function') || typeof storage?.read !== 'function'
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_FILE_BYTES) throw new TypeError('Verified identity, actual thread/workspace readers and the bounded original path resolver are required.');
  if (sha256Bytes !== null && typeof sha256Bytes !== 'function') throw new TypeError('A supplied synchronous expected-byte SHA callback must be a function.');
  const expectedSHACache = new WeakMap();
  const readOwner = () => { try { return owner(getIdentity()); } catch { return null; } };
  const bootOwner = readOwner(), issued = new WeakMap(), descriptions = new WeakMap(), encoder = new TextEncoder();
  let artifactBase = null;
  if (artifactBaseURL !== null) {
    try { artifactBase = new URL(artifactBaseURL); } catch { throw TypeError('The artifact presentation base must be an absolute HTTP app directory URL.'); }
    if (!['https:', 'http:'].includes(artifactBase.protocol) || artifactBase.username || artifactBase.password || artifactBase.search || artifactBase.hash || !artifactBase.pathname.endsWith('/')) throw TypeError('The artifact presentation base must be an absolute HTTP app directory URL.');
  }
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
    let event = null, unversionedPython = false;
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
        } else if (item.tool === 'python') {
          const files = Array.isArray(data?.files) ? data.files : [];
          if (!hasManifest(data)) unversionedPython = true;
          const matching = files.filter(file => pathOf(file?.path ?? file?.name) === spec.relativePath);
          if (matching.length) event = { turn, item, args, result, data, files, matching, kind: 'python' };
        }
      }
    }
    if (!event) {
      if (unversionedPython) fail('PRODUCER_UNSUPPORTED', 'This Python history has no structured per-write artifact version. File contents cannot be recovered from tool text.', 501);
      fail('PRODUCER_NOT_FOUND', 'No actual earlier file producer is recorded for this assistant context.', 404);
    }
    if (event.kind === 'deleted') fail('VERSION_UNAVAILABLE', 'This workspace file was deleted before the requested assistant message.', 404);
    if (event.kind !== 'create_file' && event.kind !== 'python') fail('PRODUCER_UNSUPPORTED', 'This workspace producer has no recorded exact byte version. Its historical contents cannot be guessed.', 501);
    if (event.kind === 'python') {
      if (!hasManifest(event.data)) fail('PRODUCER_UNSUPPORTED', 'This Python history has no supported per-write artifact version. Its historical contents cannot be guessed.', 501);
      if (event.matching.length !== 1) fail('VERSION_UNAVAILABLE', 'The Python result contains duplicate file versions for this path.', 409);
      const paths = new Set();
      for (const descriptor of event.files) {
        const relative = pathOf(descriptor?.path);
        if (!object(descriptor) || typeof relative !== 'string' || descriptor.path !== '/mnt/data/' + relative || descriptor.name !== relative || paths.has(relative)
          || !Number.isSafeInteger(descriptor.size) || descriptor.size < 0 || descriptor.size > maxBytes || !SHA256.test(descriptor.sha256 ?? '')
          || typeof descriptor.mime !== 'string' || !descriptor.mime || descriptor.mime.length > 255 || /[\u0000-\u001f\u007f]/u.test(descriptor.mime)) {
          fail('VERSION_UNAVAILABLE', 'The Python per-write artifact descriptors are invalid or ambiguous.', 409);
        }
        paths.add(relative);
      }
      event.file = event.matching[0];
    }
    const { item: producer, args, result, file } = event;
    // Copy the values used below before the first asynchronous digest or IO.
    const content = event.kind === 'create_file' ? args.content : null, producerPath = event.kind === 'create_file' ? args.name ?? args.path : spec.relativePath, pythonCode = event.kind === 'python' ? args.code : null;
    const filePath = file?.path, metadataName = file?.name, size = file?.size, mimeType = file?.mime;
    if (producer.status !== 'completed' || result?.isError !== false || event.kind === 'create_file' && typeof content !== 'string' || event.kind === 'python' && typeof pythonCode !== 'string' || typeof producerPath !== 'string' || !object(file)
      || typeof producer.id !== 'string' || !producer.id || typeof event.turn.id !== 'string' || !event.turn.id
      || filePath !== spec.sandboxPath || metadataName !== spec.relativePath || !Number.isSafeInteger(size) || size < 0
      || typeof mimeType !== 'string' || !mimeType || mimeType.length > 255 || /[\u0000-\u001f\u007f]/u.test(mimeType)) {
      fail('VERSION_UNAVAILABLE', 'The actual file producer did not record a successful exact file version.', 409);
    }
    if (event.kind === 'create_file' && content.length > maxBytes || size > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
    const fileName = spec.relativePath.split('/').at(-1);
    if (!fileName || fileName.length > 255) fail('INVALID_PATH', 'The actual workspace filename is unavailable.', 400);
    let prefix;
    try { prefix = getWorkspacePrefix(spec.conversationId); } catch { fail('WORKSPACE_UNAVAILABLE', 'The owned workspace namespace is unavailable.', 503); }
    if (typeof prefix !== 'string' || !prefix || /[/\\\u0000-\u001f\u007f]/u.test(prefix) || prefix === '.' || prefix === '..') fail('WORKSPACE_UNAVAILABLE', 'The owned workspace namespace is invalid.', 503);
    const snapshot = {
      conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath,
      assistant: { turnId: context.turn.id, turnStatus: context.turn.status, id: context.item.id, text: context.item.text, phase: context.item.phase ?? null },
      producer: event.kind === 'create_file' ? { turnId: event.turn.id, id: producer.id, status: producer.status, server: producer.server, tool: producer.tool, path: producerPath, content,
        result: { isError: result.isError, fileName: metadataName, path: filePath, mimeType, size } }
        : { turnId: event.turn.id, id: producer.id, status: producer.status, server: producer.server, tool: producer.tool, code: pythonCode,
          result: { isError: result.isError, fileName: metadataName, path: filePath, mimeType, size, sha256: file.sha256, artifact_manifest: { ...MANIFEST } } },
    };
    const signature = JSON.stringify(snapshot);
    guardOwner();
    return { spec, prefix, content, fileName, mimeType, size, signature, producer, kind: event.kind, expectedSHA: event.kind === 'python' ? file.sha256 : null, artifactURI: file.url };
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
    if (source.kind === 'create_file' && source.content.length > maxBytes || source.size > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
    let expectedSHA = source.expectedSHA;
    if (source.kind === 'create_file') {
      const expected = encoder.encode(source.content);
      if (expected.length > maxBytes) fail('FILE_TOO_LARGE', 'The workspace file exceeds the configured real-byte transfer limit.', 413);
      if (expected.length !== source.size) fail('VERSION_UNAVAILABLE', 'The producer size does not match its actual UTF-8 content.', 409);
      expectedSHA = await hash(expected);
    }
    assertCurrent(source, signal);
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

  // Presentation descriptions do not read storage, verify current disk bytes,
  // issue URLs or replace resolve(). They reuse the same actual source capture.
  function descriptionCurrent(source) {
    try { const next = capture(source.spec); return next.prefix === source.prefix && next.signature === source.signature && next.artifactURI === source.artifactURI && readOwner() === bootOwner; } catch { return false; }
  }
  function describe(value, expectedProducer) {
    guardOwner();
    if (!artifactBase) fail('PRESENTATION_UNAVAILABLE', 'A verified artifact app base has not been configured.', 503);
    const ids = request({ ...value, sandboxPath: '/mnt/data/presentation-request' });
    if (typeof value?.artifactURI !== 'string' || !value.artifactURI || value.artifactURI.length > 8192 || value.artifactURI.trim() !== value.artifactURI || /[\u0000-\u0020\u007f]/u.test(value.artifactURI)) fail('INVALID_ARTIFACT_URI', 'An exact produced artifact URI is required.', 400);
    let uri, prefix;
    try { uri = new URL(value.artifactURI, artifactBase); prefix = getWorkspacePrefix(ids.conversationId); } catch { fail('INVALID_ARTIFACT_URI', 'The produced artifact URI is unavailable.', 400); }
    if (typeof prefix !== 'string' || !prefix || /[/\\\u0000-\u001f\u007f]/u.test(prefix)) fail('WORKSPACE_UNAVAILABLE', 'The owned workspace namespace is invalid.', 503);
    const prefixURI = new URL('__local_artifacts/' + prefix + '/', artifactBase);
    if (uri.origin !== artifactBase.origin || uri.username || uri.password || uri.search || uri.hash || prefixURI.search || prefixURI.hash || !uri.pathname.startsWith(prefixURI.pathname)) fail('INVALID_ARTIFACT_URI', 'The URI does not identify this owned conversation workspace.', 400);
    let relative;
    try { relative = uri.pathname.slice(prefixURI.pathname.length).split('/').map(decodeURIComponent).join('/'); } catch { fail('INVALID_ARTIFACT_URI', 'The produced artifact URI has invalid escaping.', 400); }
    const spec = request({ conversationId: ids.conversationId, messageId: ids.messageId, sandboxPath: '/mnt/data/' + relative }), source = capture(spec);
    if (expectedProducer && source.producer !== expectedProducer) fail('SOURCE_CHANGED', 'The file belongs to a different recorded operation.', 409);
    const expected = new URL(prefixURI.pathname + spec.relativePath.split('/').map(encodeURIComponent).join('/'), artifactBase.origin);
    if (source.prefix !== prefix || uri.href !== expected.href || typeof source.artifactURI !== 'string' || ![expected.href, expected.pathname].includes(source.artifactURI) || ![source.artifactURI, expected.href].includes(value.artifactURI)) fail('ARTIFACT_URI_MISMATCH', 'The URI does not match the actual produced file descriptor.', 409);
    if (source.kind === 'create_file') {
      const bytes = encoder.encode(source.content);
      if (bytes.length > maxBytes) fail('FILE_TOO_LARGE', 'The produced file exceeds the configured presentation limit.', 413);
      if (bytes.length !== source.size) fail('VERSION_UNAVAILABLE', 'The producer size does not match its actual UTF-8 content.', 409);
    }
    if (!descriptionCurrent(source)) fail('SOURCE_CHANGED', 'The actual source changed while preparing a file reference.', 409);
    const description = Object.freeze({ conversationId: spec.conversationId, messageId: spec.messageId, sandboxPath: spec.sandboxPath, ownerKey: bootOwner, fileName: source.fileName, mimeType: source.mimeType, size: source.size, artifactURI: expected.href, producerKind: source.kind, bytesVerified: false });
    descriptions.set(description, source); return description;
  }
  function describeWorkFileActivity(conversationId, activityId) {
    guardOwner();
    const thread = getThread(conversationId);
    if (!thread || thread.id !== conversationId || !Array.isArray(thread.turns) || typeof activityId !== 'string') return null;
    let match;
    for (const turn of thread.turns) {
      if (typeof turn?.id !== 'string' || !activityId.startsWith(turn.id + ':') || !Array.isArray(turn.items)) continue;
      const id = activityId.slice(turn.id.length + 1);
      for (const item of turn.items) {
        if (item?.id !== id) continue;
        if (match) return null;
        match = { turn, item };
      }
    }
    if (!match) return null;
    const { turn, item } = match;
    if (item.type !== 'mcpToolCall' || item.server !== 'browser_workspace' || item.tool !== 'create_file' ||
        item.status !== 'completed' || item.error || item.result?.isError !== false || typeof item.arguments?.content !== 'string') return null;
    const file = item.result.structuredContent?.file;
    if (!object(file)) return null;
    const spec = request({ conversationId, messageId: item.id, sandboxPath: file.path });
    const fileName = spec.relativePath.split('/').at(-1);
    if (file.name !== spec.relativePath || pathOf(item.arguments.name ?? item.arguments.path) !== spec.relativePath ||
        fileName.length > 255 || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > maxBytes) return null;

    let description = null;
    const assistant = turn.items.findLast(candidate => candidate?.type === 'agentMessage' && candidate.phase !== 'commentary');
    if (assistant && terminal.has(turn.status) && turn.items.indexOf(assistant) > turn.items.indexOf(item)) {
      try { description = describe({ conversationId, messageId: assistant.id, artifactURI: file.url }, item); }
      catch { /* The writer remains in activity even without its original downloadable revision. */ }
    }
    guardOwner();
    return { fileName, description };
  }

  async function readDescribedFile(description, { signal } = {}) {
    const source = object(description) ? descriptions.get(description) : null;
    if (!source || !isDescriptionCurrent(description)) fail('SOURCE_CHANGED', 'The original workspace file is no longer available.', 409);
    const proof = await resolve({ ...source.spec, signal });
    signal?.throwIfAborted();
    if (!isDescriptionCurrent(description) || !isCurrent(proof) || issued.get(proof).signature !== source.signature) {
      fail('SOURCE_CHANGED', 'The original workspace file is no longer available.', 409);
    }
    return new Blob([proof.bytes], { type: proof.mimeType });
  }

  function isDescriptionCurrent(description) {
    const source = object(description) ? descriptions.get(description) : null;
    return !!source && readOwner() === bootOwner && descriptionCurrent(source) && readOwner() === bootOwner;
  }
  function getDescriptionSHA(description) {
    try {
      const original = object(description) ? descriptions.get(description) : null;
      if (!original || !isDescriptionCurrent(description)) return null;
      const source = capture(original.spec);
      if (!isDescriptionCurrent(description)) return null;
      if (source.kind === 'python') return SHA256.test(source.expectedSHA ?? '') && isDescriptionCurrent(description) ? source.expectedSHA : null;
      if (source.kind !== 'create_file' || !sha256Bytes || typeof source.content !== 'string' || !object(source.producer)) return null;
      const version = [source.kind, source.producer.id, source.producer.status, source.fileName, source.mimeType, source.size, source.artifactURI];
      const cached = expectedSHACache.get(source.producer);
      if (cached && cached.content === source.content && cached.version.length === version.length && version.every((value, index) => value === cached.version[index])) return isDescriptionCurrent(description) ? cached.sha256 : null;
      const bytes = encoder.encode(source.content);
      if (bytes.length !== source.size || bytes.length > maxBytes || !isDescriptionCurrent(description)) return null;
      const argument = bytes.slice(), digest = sha256Bytes(argument);
      if (typeof digest !== 'string' || !SHA256.test(digest) || argument.length !== bytes.length || argument.some((value, index) => value !== bytes[index]) || !isDescriptionCurrent(description)) return null;
      expectedSHACache.set(source.producer, { content: source.content, version, sha256: digest });
      return isDescriptionCurrent(description) ? digest : null;
    } catch { return null; }
  }
  return Object.freeze({ resolve, isCurrent, describe, describeWorkFileActivity, readDescribedFile, isDescriptionCurrent, getDescriptionSHA });
}
