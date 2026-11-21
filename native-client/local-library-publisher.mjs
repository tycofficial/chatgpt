/** Explicit publication of real completed workspace deliverables into this site's Library. */
import { workspacePath } from './browser-tool-executor.mjs?v=ca63aad189abab8c';

const FILE_ID = /^file_local_[0-9a-f]{32}$/;
const SHA = /^[0-9a-f]{64}$/;
const string = { type: 'string' };
const properties = {
  path: string, file_name: string, mime_type: string, file_id: string,
  expected_revision: { type: 'integer', minimum: 1 }, expected_raw_file_id: string, expected_source_sha256: string,
};
export const PUBLISH_FILE_TOOL = Object.freeze({ type: 'function', function: {
  name: 'publish_file',
  description: 'Save one completed deliverable from this conversation\'s browser /mnt/data workspace into this site\'s persistent Library. Create the actual file first. For edits, retain its Library identity by passing file_id, expected_revision and expected_raw_file_id from the prior receipt. This does not create a cloud editor or a public share link. The site displays committed deliverables as native file cards. Refer to the file name in your final response; resource-link Blob URIs are browser transport handles.',
  parameters: { type: 'object', properties, required: ['path'], additionalProperties: false },
} });
const failure = (message, code = 'LOCAL_LIBRARY_PUBLICATION_INVALID') => Object.assign(Error(message), { code });
const identity = value => value && typeof value.accountId === 'string' && value.accountId && typeof value.userId === 'string' && value.userId
  ? { accountId: value.accountId, userId: value.userId, accountUserId: value.accountUserId ?? null } : null;
const sameOwner = (a, b) => !!a && !!b && a.accountId === b.accountId && a.userId === b.userId && a.accountUserId === b.accountUserId;
function argumentsFor(call) {
  let args;
  try { args = JSON.parse(call.function.arguments || '{}'); } catch { throw failure('Publication arguments must be valid JSON.'); }
  if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => !Object.hasOwn(properties, key))) throw failure('Unsupported publication arguments.');
  if (typeof args.path !== 'string') throw failure('A workspace file path is required.');
  const path = workspacePath(args.path);
  for (const key of ['file_name', 'mime_type']) if (Object.hasOwn(args, key) && (typeof args[key] !== 'string' || !args[key].trim())) throw failure('Publication name and MIME hints must be nonempty text.');
  if (Object.hasOwn(args, 'file_id')) {
    if (!FILE_ID.test(args.file_id) || !Number.isSafeInteger(args.expected_revision) || args.expected_revision < 1 || !FILE_ID.test(args.expected_raw_file_id)) throw failure('Updating a Library file requires its file ID and exact previous revision/raw file ID.');
  } else if (Object.hasOwn(args, 'expected_revision') || Object.hasOwn(args, 'expected_raw_file_id')) throw failure('Revision expectations require an existing Library file ID.');
  if (Object.hasOwn(args, 'expected_source_sha256') && !SHA.test(args.expected_source_sha256)) throw failure('The expected source SHA-256 is invalid.');
  return { path, ...(args.file_name !== undefined ? { fileName: args.file_name } : {}), ...(args.mime_type !== undefined ? { mimeType: args.mime_type } : {}),
    ...(args.file_id !== undefined ? { fileId: args.file_id, expectedRevision: args.expected_revision, expectedRawFileId: args.expected_raw_file_id } : {}),
    ...(args.expected_source_sha256 !== undefined ? { expectedSourceSHA256: args.expected_source_sha256 } : {}) };
}
async function operationId(call, context) {
  if (typeof call.id !== 'string' || !call.id || typeof context.threadId !== 'string' || !context.threadId || typeof context.turnId !== 'string' || !context.turnId) throw failure('Publication requires an actual conversation, turn and tool-call identity.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([context.threadId, context.turnId, call.id])));
  return 'tool_' + [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}
function checkedReceipt(value, requestId) {
  const invalid = () => { throw failure('The Library did not return a verified committed publication receipt.', 'LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID'); };
  const object = entry => entry !== null && typeof entry === 'object' && !Array.isArray(entry);
  const timestamp = entry => Number.isSafeInteger(entry) && entry >= 0;
  const ownData = (entry, key) => { const descriptor = Object.getOwnPropertyDescriptor(entry, key); return !!descriptor && Object.hasOwn(descriptor, 'value'); };
  const required = ['committed', 'operationId', 'fileId', 'rawFileId', 'sha256', 'revision', 'size', 'fileName', 'mimeType', 'publication'];
  const optional = ['kind', 'created', 'updated', 'createdAt', 'updatedAt', 'currentRevision', 'superseded'];
  if (!object(value) || required.some(key => !ownData(value, key)) || optional.some(key => Object.hasOwn(value, key) && !ownData(value, key)) || value.committed !== true || value.operationId !== requestId ||
      typeof value.fileId !== 'string' || !FILE_ID.test(value.fileId) || typeof value.rawFileId !== 'string' || !FILE_ID.test(value.rawFileId) || value.fileId === value.rawFileId ||
      typeof value.sha256 !== 'string' || !SHA.test(value.sha256) || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
      !Number.isSafeInteger(value.size) || value.size < 1 || typeof value.fileName !== 'string' || !value.fileName.trim() || typeof value.mimeType !== 'string' || !value.mimeType.trim() ||
      !object(value.publication) || ['origin', 'revision', 'updatedAt'].some(key => !ownData(value.publication, key)) || value.publication.origin !== 'generated' || value.publication.revision !== value.revision || !timestamp(value.publication.updatedAt)) invalid();
  if (Object.hasOwn(value, 'kind') && !['text', 'image', 'document'].includes(value.kind)) invalid();
  for (const key of ['createdAt', 'updatedAt']) if (Object.hasOwn(value, key) && !timestamp(value[key])) invalid();
  if (Object.hasOwn(value, 'updatedAt') && value.updatedAt !== value.publication.updatedAt ||
      Object.hasOwn(value, 'createdAt') && value.createdAt > value.publication.updatedAt) invalid();
  if (Object.hasOwn(value, 'created') || Object.hasOwn(value, 'updated')) {
    if (!ownData(value, 'created') || !ownData(value, 'updated') || typeof value.created !== 'boolean' || typeof value.updated !== 'boolean' || value.created === value.updated) invalid();
  }
  if (Object.hasOwn(value, 'currentRevision') || Object.hasOwn(value, 'superseded')) {
    if (!ownData(value, 'currentRevision') || !ownData(value, 'superseded') || !Number.isSafeInteger(value.currentRevision) || value.currentRevision < value.revision || typeof value.superseded !== 'boolean' ||
        value.superseded !== (value.currentRevision > value.revision)) invalid();
  }
  // Reconstruct the public protocol instead of cloning arbitrary domain state.
  // Never forward namespaces, source paths, operation journals, upload tickets,
  // credentials, internal provider payloads, or incoming download claims.
  const receipt = { committed: true, operationId: value.operationId, fileId: value.fileId, rawFileId: value.rawFileId,
    revision: value.revision, sha256: value.sha256, fileName: value.fileName, mimeType: value.mimeType, size: value.size,
    publication: { origin: 'generated', revision: value.publication.revision, updatedAt: value.publication.updatedAt } };
  for (const key of optional) if (Object.hasOwn(value, key)) receipt[key] = value[key];
  return receipt;
}
export { checkedReceipt as normalizePublicationReceipt };
export function createLibraryPublishingExecutor({ baseExecutor, publishGeneratedFile, getIdentity, resolvePublishedResource, ownsObjectURL } = {}) {
  if (!baseExecutor || !Array.isArray(baseExecutor.tools) || typeof baseExecutor.execute !== 'function') throw TypeError('A real base workspace tool executor is required.');
  // An unconnected provider must never appear as an executable model tool.
  if (typeof publishGeneratedFile !== 'function') return baseExecutor;
  if (typeof getIdentity !== 'function') throw TypeError('An authoritative site identity provider is required.');
  async function publish(call, context) {
    context.signal?.throwIfAborted();
    const owner = identity(getIdentity());
    if (!owner) throw failure('Sign in to this site before saving a Library deliverable.', 'LOCAL_LIBRARY_PUBLICATION_IDENTITY_REQUIRED');
    const args = argumentsFor(call), requestId = await operationId(call, context);
    context.signal?.throwIfAborted();
    if (!sameOwner(owner, identity(getIdentity()))) throw failure('The active site account changed before publication.', 'LOCAL_LIBRARY_PUBLICATION_ACCOUNT_CHANGED');
    const receipt = checkedReceipt(await publishGeneratedFile({ ...args, requestId, threadId: context.threadId }, { signal: context.signal }), requestId);
    const assertCurrent = () => {
      if (!sameOwner(owner, identity(getIdentity()))) throw Object.assign(failure('The publication committed, but the active account changed. Reopen the original account to inspect its saved file.', 'LOCAL_LIBRARY_PUBLICATION_ACCOUNT_CHANGED'), { committed: true, operationId: requestId });
    };
    assertCurrent();
    let resource = null, downloadUnavailable = false;
    if (typeof resolvePublishedResource === 'function' && typeof ownsObjectURL === 'function') {
      try {
        context.signal?.throwIfAborted();
        // Give the resolver its own public copy; it cannot append internal
        // state to or alter the committed receipt eventually returned to AI.
        const value = await resolvePublishedResource(structuredClone(receipt), { signal: context.signal });
        assertCurrent();
        if (!value || typeof value.uri !== 'string' || !value.uri.startsWith('blob:') || !ownsObjectURL(value.uri) || value.rawFileId !== receipt.rawFileId || value.revision !== receipt.revision || value.sha256 !== receipt.sha256 || value.mimeType !== receipt.mimeType || typeof value.name !== 'string' || !value.name) throw failure('A verified download resource for the committed revision is unavailable.');
        resource = { type: 'resource_link', uri: value.uri, name: value.name, mimeType: value.mimeType, size: receipt.size };
      } catch { assertCurrent(); downloadUnavailable = true; }
    } else downloadUnavailable = true;
    assertCurrent();
    // A failed download resolver cannot turn an already committed save into an alleged rollback.
    const data = { ...receipt, downloadAvailable: !!resource, ...(downloadUnavailable ? { downloadUnavailable: true } : {}) };
    return { content: [{ type: 'text', text: JSON.stringify(data) }, ...(resource ? [resource] : [])], structuredContent: data, isError: false };
  }
  return Object.assign(Object.create(baseExecutor), {
    tools: [...baseExecutor.tools, PUBLISH_FILE_TOOL],
    execute(call, context) { return call?.function?.name === 'publish_file' ? publish(call, context) : baseExecutor.execute(call, context); },
    recoverCall(call, context) { return call?.function?.name === 'publish_file' ? publish(call, context) : baseExecutor.recoverCall?.(call, context); },
  });
}
