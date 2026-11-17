import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
import { createLocalLibraryService } from '../src/native-client/local-library-service.mjs';
import { createBrowserToolExecutor } from '../src/native-client/browser-tool-executor.mjs';
import { createPersonalizationIdentityProvider } from '../src/native-client/local-personalization-context.mjs';

const source = fs.readFileSync(new URL('../src/native-client/service-boundary.mjs', import.meta.url), 'utf8');
const identitySource = fs.readFileSync(new URL('../src/native-client/local-identity.mjs', import.meta.url), 'utf8');
const identities = source.match(/^const getPersonalizationIdentity = .*;$/m)?.[0];
const fileOwner = source.match(/^const getOwnedFileAccountId = .*;$/m)?.[0];
// The byte transport now composes providers after AppServer construction.
// Extract only the actual file/Library constructors tested by this fixture.
const start = source.indexOf('export const localFilesService ='), end = source.indexOf('let nativeLibraryClient =', start);
assert.ok(identities && fileOwner && start > 0 && end > start);
const constructors = source.slice(start, end).replace('export const localFilesService =', 'globalThis.localFilesService =').replace('export const localLibraryService =', 'globalThis.localLibraryService =');
const admin = { id: 'site-admin', username: 'Neutral admin', role: 'administrator', planType: 'pro', createdAt: 1 };
const free = { id: 'site-user:cccccccc-cccc-4ccc-8ccc-cccccccccccc', accountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', username: 'Neutral free', role: 'user', planType: 'free', createdAt: 1 };
function store() {
  const data = new Map();
  return { write: async (key, bytes) => data.set(key, new Uint8Array(bytes)), read: async key => { if (!data.has(key)) throw Object.assign(Error('Neutral missing bytes'), { name: 'NotFoundError' }); return new Uint8Array(data.get(key)); }, remove: async key => data.delete(key), list: async () => [] };
}
function environment(initialSite, shared, { query = '', localFlag = null } = {}) {
  let site = initialSite;
  const session = new Map(localFlag === null ? [] : [['original-client-prototype-local-session', localFlag]]);
  const localStorage = { getItem: key => shared.metadata.get(key) ?? null, setItem: (key, value) => shared.metadata.set(key, value), removeItem: key => shared.metadata.delete(key) };
  const context = vm.createContext({ URL, Event, localStorage, sessionStorage: { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value) }, location: { href: 'https://neutral.invalid/chatgpt/' + query }, getSiteAccount: () => site, createLocalFilesService, createLocalLibraryService, createPersonalizationIdentityProvider, localProtocolDiagnostics: [] });
  const executable = identitySource.replace(/^import .*;\r?\n/gm, '').replace(/^export\s+/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../src/native-client/local-identity.mjs', import.meta.url).href));
  vm.runInContext(executable + '\nglobalThis.identityAPI={getPrototypeLocalAuth,clearPrototypeLocalSession};', context);
  context.localWorkspaceExecutor = createBrowserToolExecutor({ storage: shared.raw, getWorkspaceNamespace: () => site?.role === 'administrator' ? null : site?.accountId ?? 'guest' });
  context.localAppServer = { threads: new Map() };
  vm.runInContext(identities + '\n' + fileOwner + '\n' + constructors, context);
  return { files: context.localFilesService, library: context.localLibraryService, identity: context.identityAPI, workspace: context.localWorkspaceExecutor, server: context.localAppServer, setSite: value => site = value };
}

test('the actual publication boundary admits only the verified boot account own non-temporary thread workspace', async () => {
  for (const site of [admin, free]) {
    const env = environment(site, { metadata: new Map(), raw: store() });
    env.server.threads.set('owned-publication-thread', { id: 'owned-publication-thread', ephemeral: false });
    env.server.threads.set('temporary-publication-thread', { id: 'temporary-publication-thread', ephemeral: true });
    await env.workspace.execute({ id: 'neutral-create', function: { name: 'create_file', arguments: JSON.stringify({ name: 'neutral-owned.md', content: 'Actual verified account deliverable.' }) } }, { threadId: 'owned-publication-thread' });
    const receipt = await env.files.publishGeneratedFile({ requestId: 'neutral-owned-publication', threadId: 'owned-publication-thread', path: '/mnt/data/neutral-owned.md' });
    assert.equal(receipt.committed, true); assert.notEqual(receipt.fileId, receipt.rawFileId);
    assert.equal(new TextDecoder().decode((await env.files.readFile(receipt.rawFileId)).bytes), 'Actual verified account deliverable.');
    await assert.rejects(env.files.publishGeneratedFile({ requestId: 'neutral-missing-thread', threadId: 'foreign-thread-not-in-server', path: '/mnt/data/neutral-owned.md' }), error => error.status === 404);
    await assert.rejects(env.files.publishGeneratedFile({ requestId: 'neutral-temporary-thread', threadId: 'temporary-publication-thread', path: '/mnt/data/neutral-owned.md' }), error => error.code === 'publication_ephemeral');
    env.setSite(null);
    await assert.rejects(env.files.publishGeneratedFile({ requestId: 'neutral-after-logout', threadId: 'owned-publication-thread', path: '/mnt/data/neutral-owned.md' }), error => error.status === 401);
  }
  const guest = environment(null, { metadata: new Map(), raw: store() }, { query: '?localSession=1' });
  guest.server.threads.set('owned-publication-thread', { id: 'owned-publication-thread', ephemeral: false });
  await assert.rejects(guest.files.publishGeneratedFile({ requestId: 'neutral-guest-publication', threadId: 'owned-publication-thread', path: '/mnt/data/neutral-owned.md' }), error => error.status === 401);
});
const request = (path, body) => new Request('https://neutral.invalid/chatgpt/__codex-api' + path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function list(env) { const response = await env.library.handle(request('/files/library', { limit: 50, categories: [], trashed_only: false }), '/files/library'); return { response, body: await response.json() }; }
async function upload(env) {
  const bytes = new TextEncoder().encode('Neutral actual owner file bytes 中文.');
  const allocatedResponse = await env.files.handle(request('/files', { file_name: 'neutral-owner.txt', file_size: bytes.length, mime_type: 'text/plain', store_in_library: true }), '/files');
  assert.equal(allocatedResponse.status, 200); const allocated = await allocatedResponse.json();
  const form = new FormData(); form.append('file', new File([bytes], 'neutral-owner.txt', { type: 'text/plain' })); form.append('upload_url', new URL(allocated.upload_url).searchParams.get('upload_url'));
  await env.files.upload('POST', allocated.upload_url, { body: form });
  const processed = await env.files.handle(request('/files/process_upload_stream', { file_id: allocated.file_id }), '/files/process_upload_stream');
  assert.equal(processed.status, 200); await processed.text(); return { id: allocated.file_id, bytes };
}

test('actual boundary denies both guest prototype flags even when their prototype account ID aliases admin', async () => {
  const shared = { metadata: new Map(), raw: store() }, owner = environment(admin, shared), file = await upload(owner);
  assert.equal((await list(owner)).body.items[0].id, file.id);
  for (const options of [{}, { localFlag: '1' }, { query: '?localSession=1' }]) {
    const guest = environment(null, shared, options), listing = await list(guest);
    if (options.localFlag || options.query) assert.equal(guest.identity.getPrototypeLocalAuth().accountId, owner.identity.getPrototypeLocalAuth().accountId);
    assert.equal(listing.response.status, 401); assert.equal(listing.body.items, undefined);
    await assert.rejects(guest.files.readFile(file.id), error => error.status === 401);
    const resource = await guest.library.handle(request('/files/library/files/' + file.id + '/download_url'), '/files/library/files/' + file.id + '/download_url');
    assert.equal(resource.status, 401); guest.library.dispose();
  }
  const readback = await owner.files.readFile(file.id); assert.deepEqual(readback.bytes, file.bytes); owner.library.dispose();
});

test('verified Free and admin retain independent real files and owned download resources', async () => {
  const shared = { metadata: new Map(), raw: store() }, pro = environment(admin, shared), other = environment(free, shared);
  const original = await upload(pro); assert.equal((await list(other)).body.items.length, 0);
  const mine = await upload(other); assert.notEqual(mine.id, original.id);
  assert.equal((await list(pro)).body.items.length, 1); assert.equal((await list(other)).body.items.length, 1);
  await assert.rejects(other.files.readFile(original.id), error => error.status === 404);
  const resource = await other.library.handle(request('/files/library/files/' + mine.id + '/download_url'), '/files/library/files/' + mine.id + '/download_url');
  assert.equal(resource.status, 200); const url = (await resource.json()).download_url;
  assert.equal(other.library.ownsObjectURL(url), true); assert.equal(pro.library.ownsObjectURL(url), false);
  assert.deepEqual(new Uint8Array(await (await fetch(url)).arrayBuffer()), mine.bytes);
  pro.library.dispose(); other.library.dispose();
});

test('logout or replacement identity immediately revokes file access and prior owned blob capability', async () => {
  const shared = { metadata: new Map(), raw: store() }, env = environment(admin, shared), file = await upload(env);
  const response = await env.library.handle(request('/files/library/files/' + file.id + '/download_url'), '/files/library/files/' + file.id + '/download_url');
  const url = (await response.json()).download_url; assert.equal(env.library.ownsObjectURL(url), true);
  env.setSite(free); assert.equal(env.library.ownsObjectURL(url), false); assert.equal((await list(env)).response.status, 401);
  await assert.rejects(env.files.readFile(file.id), error => error.status === 401); env.library.dispose();
});

test('an old guest identity module cannot acquire file access from a later site login without its normal reload', async () => {
  const shared = { metadata: new Map(), raw: store() }, guest = environment(null, shared, { localFlag: '1' });
  guest.setSite(admin); assert.equal((await list(guest)).response.status, 401);
  const refreshed = environment(admin, shared); assert.equal((await list(refreshed)).response.status, 200); refreshed.library.dispose(); guest.library.dispose();
});
