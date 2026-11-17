import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';
import { createLibraryPublishingExecutor } from '../src/native-client/local-library-publisher.mjs';
const encoder = new TextEncoder(), decoder = new TextDecoder();
const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
const logical = 'file_local_' + '1'.repeat(32), raw = 'file_local_' + '2'.repeat(32);
const context = { threadId: 'neutral-thread', turnId: 'neutral-turn' };
const call = (args = { path: 'deliverable.md' }, id = 'neutral-call') => ({ id, function: { name: 'publish_file', arguments: JSON.stringify(args) } });
function fixture(options = {}) {
  const bytes = new Map(), calls = [], operations = new Map(), urls = new Set();
  let owner = { accountId: 'neutral-owner', userId: 'neutral-user', accountUserId: 'neutral-user' };
  const storage = { write: async (key, value) => bytes.set(key, new Uint8Array(value)), read: async key => { if (!bytes.has(key)) throw Error('Neutral missing file'); return new Uint8Array(bytes.get(key)); }, list: async prefix => [...bytes].filter(([key]) => key.startsWith(prefix + '/')).map(([key, value]) => ({ name: key.slice(prefix.length + 1), size: value.length })), remove: async key => bytes.delete(key) };
  const base = createBrowserToolExecutor({ storage });
  // Explicit adapter-contract fixture; FileService journaling/concurrency is tested by its own domain suite.
  const publish = async args => {
    calls.push(structuredClone(args));
    if (operations.has(args.requestId)) return structuredClone(operations.get(args.requestId));
    const data = await storage.read(base.getWorkspacePrefix(args.threadId) + '/' + args.path);
    const receipt = { committed: true, operationId: args.requestId, fileId: logical, rawFileId: raw, revision: 1, sha256: await sha(data), size: data.length, fileName: 'deliverable.md', mimeType: 'text/markdown', publication: { origin: 'generated', revision: 1, updatedAt: 1700000000000 } };
    operations.set(args.requestId, receipt); return structuredClone(receipt);
  };
  const resolve = async receipt => {
    const data = await storage.read(base.getWorkspacePrefix(context.threadId) + '/deliverable.md');
    const uri = URL.createObjectURL(new Blob([data], { type: receipt.mimeType })); urls.add(uri);
    return { uri, name: receipt.fileName, mimeType: receipt.mimeType, rawFileId: receipt.rawFileId, revision: receipt.revision, sha256: receipt.sha256 };
  };
  const executor = createLibraryPublishingExecutor({ baseExecutor: base, getIdentity: () => owner, publishGeneratedFile: publish, resolvePublishedResource: resolve, ownsObjectURL: value => urls.has(value), ...options });
  return { base, storage, bytes, executor, calls, operations, publish, resolve, setOwner: value => owner = value, cleanup: () => { for (const uri of urls) URL.revokeObjectURL(uri); } };
}
const create = fixture => fixture.executor.execute({ id: 'neutral-create', function: { name: 'create_file', arguments: JSON.stringify({ name: 'deliverable.md', content: 'Neutral real workspace bytes 中文.' }) } }, context);

test('unconnected publication is absent, and ordinary real file operations never implicitly publish', async () => {
  const env = fixture(); assert.equal(createLibraryPublishingExecutor({ baseExecutor: env.base }), env.base);
  assert.equal(env.base.tools.some(tool => tool.function.name === 'publish_file'), false);
  assert.equal(env.executor.tools.filter(tool => tool.function.name === 'publish_file').length, 1);
  await create(env); assert.equal(env.calls.length, 0);
  const result = await env.executor.execute({ function: { name: 'read_file', arguments: '{"path":"deliverable.md"}' } }, context);
  assert.equal(result.structuredContent.content, 'Neutral real workspace bytes 中文.');
  assert.equal(env.executor.storage, env.storage);
});

test('explicit publication maps a normalized path and stable operation identity to a genuine owned Blob result', async () => {
  const env = fixture(); await create(env);
  try {
    const result = await env.executor.execute(call({ path: '/mnt/data/./deliverable.md', file_name: 'deliverable.md', mime_type: 'text/markdown' }), context);
    assert.equal(result.isError, false); assert.equal(result.structuredContent.committed, true);
    assert.match(env.calls[0].requestId, /^tool_[0-9a-f]{64}$/); assert.equal(env.calls[0].path, 'deliverable.md');
    assert.equal(env.calls[0].threadId, context.threadId); assert.equal(env.calls[0].fileName, 'deliverable.md');
    const link = result.content.find(value => value.type === 'resource_link');
    assert.ok(link.uri.startsWith('blob:')); const bytes = new Uint8Array(await (await fetch(link.uri)).arrayBuffer());
    assert.equal(decoder.decode(bytes), 'Neutral real workspace bytes 中文.'); assert.equal(await sha(bytes), result.structuredContent.sha256);
  } finally { env.cleanup(); }
});

test('uncertain-tool recovery uses the same operation, while another actual turn cannot collide', async () => {
  const env = fixture(); await create(env);
  try {
    const first = await env.executor.execute(call(), context), recovered = await env.executor.recoverCall(call(), context);
    assert.deepEqual(recovered.structuredContent, first.structuredContent); assert.equal(env.operations.size, 1);
    await env.executor.execute(call(), { ...context, turnId: 'next-neutral-turn' });
    assert.equal(env.operations.size, 2); assert.notEqual(env.calls[0].requestId, env.calls[2].requestId);
    assert.equal(await env.executor.recoverCall({ function: { name: 'python' } }, context), undefined);
  } finally { env.cleanup(); }
});

test('invalid paths, unknown fields and incomplete edit expectations fail before publication', async () => {
  const env = fixture(); await create(env);
  for (const args of [{ path: '../escape.md' }, { path: 'deliverable.md', requestId: 'spoof' }, { path: 'deliverable.md', file_id: logical }, { path: 'deliverable.md', expected_revision: 1 }, { path: 'deliverable.md', file_id: logical, expected_revision: 0, expected_raw_file_id: raw }, { path: 'deliverable.md', expected_source_sha256: 'invalid' }]) await assert.rejects(env.executor.execute(call(args), context));
  await assert.rejects(env.executor.execute(call(), { threadId: context.threadId }));
  assert.equal(env.calls.length, 0);
});

test('an edit forwards the exact expected raw revision and optional source hash without altering identity', async () => {
  const env = fixture(); await create(env);
  try {
    const digest = await sha(await env.storage.read('neutral-thread/deliverable.md'));
    await env.executor.execute(call({ path: 'deliverable.md', file_id: logical, expected_revision: 3, expected_raw_file_id: raw, expected_source_sha256: digest }), context);
    assert.equal(env.calls[0].fileId, logical); assert.equal(env.calls[0].expectedRevision, 3); assert.equal(env.calls[0].expectedRawFileId, raw); assert.equal(env.calls[0].expectedSourceSHA256, digest);
  } finally { env.cleanup(); }
});

test('domain failure cannot create a success receipt or a download resource', async () => {
  let resolved = false;
  const env = fixture({ publishGeneratedFile: async () => { throw Object.assign(Error('Neutral quota failure'), { status: 507 }); }, resolvePublishedResource: async () => { resolved = true; } });
  await assert.rejects(env.executor.execute(call(), context), error => error.status === 507); assert.equal(resolved, false);
});

test('post-commit resource failure honestly retains the committed receipt without a fictional link', async () => {
  const env = fixture({ resolvePublishedResource: async () => { throw Error('Neutral resource unavailable'); } }); await create(env);
  const result = await env.executor.execute(call(), context);
  assert.equal(result.isError, false); assert.equal(result.structuredContent.committed, true); assert.equal(result.structuredContent.downloadUnavailable, true);
  assert.equal(result.structuredContent.downloadAvailable, false); assert.equal(result.content.filter(value => value.type === 'resource_link').length, 0); assert.equal(env.operations.size, 1);
});

test('a resource for the wrong raw version, wrong SHA or unowned URL is never returned as this publication', async () => {
  for (const mutate of [value => ({ ...value, rawFileId: logical }), value => ({ ...value, sha256: '0'.repeat(64) }), value => ({ ...value, uri: 'blob:unowned-neutral' }), value => ({ ...value, uri: 'https://fictional-share.invalid/' })]) {
    let env; env = fixture({ resolvePublishedResource: async receipt => mutate(await env.resolve(receipt)) }); await create(env);
    try { const result = await env.executor.execute(call(), context); assert.equal(result.structuredContent.committed, true); assert.equal(result.structuredContent.downloadUnavailable, true); assert.equal(result.content.filter(value => value.type === 'resource_link').length, 0); } finally { env.cleanup(); }
  }
});

test('owner change after commit refuses output to the replacement account and marks the outcome committed', async () => {
  let env; env = fixture({ resolvePublishedResource: async receipt => { const resource = await env.resolve(receipt); env.setOwner({ accountId: 'other-neutral', userId: 'other-neutral' }); return resource; } }); await create(env);
  try { await assert.rejects(env.executor.execute(call(), context), error => error.committed === true && error.code === 'LOCAL_LIBRARY_PUBLICATION_ACCOUNT_CHANGED'); assert.equal(env.operations.size, 1); } finally { env.cleanup(); }
});

test('no site identity, changed identity before admission, and an aborted context cannot publish', async () => {
  const env = fixture(); env.setOwner(null); await assert.rejects(env.executor.execute(call(), context)); assert.equal(env.calls.length, 0);
  let reads = 0; const changed = fixture({ getIdentity: () => ({ accountId: ++reads === 1 ? 'neutral-a' : 'neutral-b', userId: 'neutral-user' }) });
  await assert.rejects(changed.executor.execute(call(), context)); assert.equal(changed.calls.length, 0);
  const controller = new AbortController(); controller.abort(); await assert.rejects(changed.executor.execute(call(), { ...context, signal: controller.signal })); assert.equal(changed.calls.length, 0);
});

test('only legitimate public receipt fields reach AI or the resolver; arbitrary private and uncloneable extras are stripped', async () => {
  let env, resolverInput, privateReads = 0;
  env = fixture({ publishGeneratedFile: async args => {
    const receipt = await env.publish(args), cycle = {}; cycle.self = cycle;
    const extended = { ...receipt, kind: 'text', created: true, updated: false, createdAt: 1700000000000, updatedAt: 1700000000000, currentRevision: 1, superseded: false,
      namespace: 'PRIVATE_NAMESPACE', ticket: 'PRIVATE_TICKET', token: 'PRIVATE_TOKEN', providerExtras: { raw: 'PRIVATE_PROVIDER', cycle }, sourcePath: '/PRIVATE_SOURCE',
      downloadAvailable: false, downloadUnavailable: true, downloadUrl: 'https://PRIVATE_DOWNLOAD.invalid/', unsafeFunction: () => 'PRIVATE_FUNCTION', bigintExtra: 1n,
      publication: { ...receipt.publication, namespace: 'PRIVATE_NESTED_NAMESPACE', headers: { Authorization: 'PRIVATE_HEADER' }, cycle } };
    Object.defineProperty(extended, 'credentials', { enumerable: true, get() { ++privateReads; throw Error('Private extras must not be accessed'); } });
    return extended;
  }, resolvePublishedResource: async receipt => { resolverInput = receipt; return env.resolve(receipt); } });
  await create(env);
  try {
    const result = await env.executor.execute(call(), context), data = result.structuredContent;
    assert.equal(result.isError, false); assert.equal(data.committed, true); assert.equal(data.downloadAvailable, true); assert.equal(Object.hasOwn(data, 'downloadUnavailable'), false);
    assert.equal(privateReads, 0); assert.equal(JSON.stringify(result).includes('PRIVATE_'), false); assert.equal(JSON.stringify(resolverInput).includes('PRIVATE_'), false);
    assert.deepEqual(Object.keys(data).sort(), ['committed', 'operationId', 'fileId', 'rawFileId', 'revision', 'sha256', 'fileName', 'mimeType', 'size', 'kind', 'created', 'updated', 'createdAt', 'updatedAt', 'publication', 'currentRevision', 'superseded', 'downloadAvailable'].sort());
    assert.deepEqual(Object.keys(data.publication).sort(), ['origin', 'revision', 'updatedAt']);
    assert.equal(result.content[0].text, JSON.stringify(data));
  } finally { env.cleanup(); }
});

test('genuine old-operation recovery preserves original immutable revision and source-backed superseded flags', async () => {
  let env;
  env = fixture({ publishGeneratedFile: async args => ({ ...await env.publish(args), kind: 'text', created: true, updated: false,
    createdAt: 1700000000000, updatedAt: 1700000000000, currentRevision: 3, superseded: true }) });
  await create(env);
  try {
    const first = await env.executor.execute(call(), context), again = await env.executor.recoverCall(call(), context);
    assert.deepEqual(again.structuredContent, first.structuredContent); assert.equal(env.operations.size, 1);
    const data = again.structuredContent;
    assert.equal(data.revision, 1); assert.equal(data.publication.revision, 1); assert.equal(data.currentRevision, 3); assert.equal(data.superseded, true);
    assert.equal(data.created, true); assert.equal(data.updated, false); assert.equal(data.rawFileId, raw); assert.equal(data.downloadAvailable, true);
  } finally { env.cleanup(); }
});

test('malformed required metadata or inconsistent optional commit/recovery fields cannot create a success receipt', async () => {
  for (const mutate of [
    () => null, value => [value], value => Object.create(value), value => ({ ...value, fileId: raw }),
    value => ({ ...value, fileId: { toString: () => logical } }), value => ({ ...value, committed: 'true' }), value => ({ ...value, operationId: 'wrong-operation' }),
    value => ({ ...value, publication: { ...value.publication, revision: 2 } }), value => ({ ...value, publication: { ...value.publication, updatedAt: -1 } }),
    value => ({ ...value, kind: { private: 'PRIVATE_KIND' } }), value => ({ ...value, kind: 'unknown' }),
    value => ({ ...value, createdAt: 'PRIVATE_DATE' }), value => ({ ...value, updatedAt: 1 }), value => ({ ...value, createdAt: 1800000000000 }),
    value => ({ ...value, created: true, updated: true }), value => ({ ...value, created: true }),
    value => ({ ...value, currentRevision: 0, superseded: false }), value => ({ ...value, currentRevision: 2, superseded: false }),
    value => ({ ...value, currentRevision: 1, superseded: true }), value => ({ ...value, currentRevision: 1 }),
    value => Object.assign(Object.create({ superseded: true }), value, { currentRevision: 2 }),
    value => Object.defineProperty({ ...value }, 'fileId', { enumerable: true, get() { throw Error('Required acknowledgement fields cannot be accessors'); } }),
  ]) {
    let env, resolverCalled = false;
    env = fixture({ publishGeneratedFile: async args => mutate(await env.publish(args)), resolvePublishedResource: async () => { resolverCalled = true; } }); await create(env);
    await assert.rejects(env.executor.execute(call(), context), error => error.code === 'LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID');
    assert.equal(resolverCalled, false); assert.equal(env.operations.size, 1); env.cleanup();
  }
});

test('a resolver cannot mutate the committed public receipt or append internal state after initial validation', async () => {
  for (const changeDigest of [false, true]) {
    let env;
    env = fixture({ resolvePublishedResource: async receipt => {
      receipt.namespace = 'PRIVATE_RESOLVER_NAMESPACE'; receipt.publication.ticket = 'PRIVATE_RESOLVER_TICKET';
      if (changeDigest) receipt.sha256 = '0'.repeat(64);
      return env.resolve(receipt);
    } }); await create(env);
    try {
      const result = await env.executor.execute(call(), context);
      assert.equal(JSON.stringify(result).includes('PRIVATE_'), false); assert.equal(result.structuredContent.committed, true);
      assert.notEqual(result.structuredContent.sha256, '0'.repeat(64));
      assert.equal(result.structuredContent.downloadAvailable, !changeDigest);
      assert.equal(result.content.some(value => value.type === 'resource_link'), !changeDigest);
    } finally { env.cleanup(); }
  }
});

test('incoming provider download claims never override a real post-commit resource failure', async () => {
  let env;
  env = fixture({ publishGeneratedFile: async args => ({ ...await env.publish(args), downloadAvailable: true, downloadUnavailable: false,
    resource: { uri: 'https://PRIVATE_FICTIONAL_RESOURCE.invalid/' }, cleanupPending: 'PRIVATE_CLEANUP' }), resolvePublishedResource: async () => { throw Error('Neutral resource unavailable'); } });
  await create(env);
  const result = await env.executor.execute(call(), context);
  assert.equal(result.isError, false); assert.equal(result.structuredContent.committed, true);
  assert.equal(result.structuredContent.downloadAvailable, false); assert.equal(result.structuredContent.downloadUnavailable, true);
  assert.equal(result.content.some(value => value.type === 'resource_link'), false); assert.equal(JSON.stringify(result).includes('PRIVATE_'), false);
});

test('public normalizer export reuses the exact receipt validation and strips private extras without changing v2 behavior', async () => {
  const { normalizePublicationReceipt } = await import('../src/native-client/local-library-publisher.mjs');
  const requestId = 'tool_' + 'a'.repeat(64);
  const receipt = { committed: true, operationId: requestId, fileId: logical, rawFileId: raw, revision: 1,
    sha256: 'b'.repeat(64), fileName: 'neutral-public.txt', mimeType: 'text/plain', size: 9, kind: 'text',
    created: true, updated: false, createdAt: 1700000000000, updatedAt: 1700000000000, currentRevision: 1, superseded: false,
    publication: { origin: 'generated', revision: 1, updatedAt: 1700000000000 } };
  assert.deepEqual(normalizePublicationReceipt(receipt, requestId), receipt);
  const extra = { ...receipt, token: 'PRIVATE_TOKEN', namespace: 'PRIVATE_NAMESPACE', publication: { ...receipt.publication, ticket: 'PRIVATE_TICKET' } };
  assert.deepEqual(normalizePublicationReceipt(extra, requestId), receipt);
  assert.equal(JSON.stringify(normalizePublicationReceipt(extra, requestId)).includes('PRIVATE_'), false);
  assert.throws(() => normalizePublicationReceipt({ ...extra, rawFileId: logical }, requestId), error => error.code === 'LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID');
  assert.throws(() => normalizePublicationReceipt(receipt, 'wrong-operation'), error => error.code === 'LOCAL_LIBRARY_PUBLICATION_RECEIPT_INVALID');
});
