import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createLocalLibraryService, LOCAL_LIBRARY_ROOT_ID } from '../src/native-client/local-library-service.mjs';
import { createLocalFilesService } from '../src/native-client/local-files-service.mjs';
const encode = value => new TextEncoder().encode(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const png = new Uint8Array(fs.readFileSync(new URL('../src/native-client/dot-assets/default-dot.png', import.meta.url))); 
function environment(t, options = {}) {
  let account = 'library-fixture-account-a', clock = 1700000000000, failLibrary = false, libraryWrites = 0, failWriteAt = null;
  const raw = new Map(), fileMeta = new Map(), libraryMeta = new Map();
  const storage = { async write(key, bytes) { raw.set(key, bytes.slice()); }, async read(key) { if (options.beforeRead) await options.beforeRead(key); if (!raw.has(key)) throw Error('File not found'); return raw.get(key).slice(); }, async remove(key) { await options.beforeRemove?.(key); if (options.failRemove?.(key)) throw Error('Fixture storage IO failed'); if (!raw.delete(key)) throw Error('File not found'); } };
  const fileStore = { getItem: key => fileMeta.get(key) ?? null, setItem: (key, value) => fileMeta.set(key, value) };
  const metaStore = { getItem: key => libraryMeta.get(key) ?? null, setItem: (key, value) => { libraryWrites++; if (failLibrary || libraryWrites === failWriteAt) throw Error('Fixture Library quota exceeded'); libraryMeta.set(key, value); } };
  const files = createLocalFilesService({ storage, metadataStorage: fileStore, getAccountId: () => account, getWorkspacePrefix: id => account + '--' + encodeURIComponent(id), now: () => clock });
  const args = { files: options.files?.(files) ?? files, metadataStorage: metaStore, getAccountId: () => account, now: () => clock, uuid: randomUUID, ...options.library };
  const library = createLocalLibraryService(args); t.after(() => library.dispose());
  return { library, files, raw, fileMeta, libraryMeta, restore: () => { const value = createLocalLibraryService(args); t.after(() => value.dispose()); return value; }, setAccount: value => { account = value; }, failLibrary: value => { failLibrary = value; }, failWriteAt: value => { failWriteAt = value; }, writes: () => libraryWrites, now: value => { clock = value; }, options };
}
async function call(library, path, method = 'GET', value, signal) {
  const response = await library.handle(new Request('https://library.invalid/site/__codex-api' + path, { method, ...(value === undefined ? {} : { body: JSON.stringify(value), headers: { 'Content-Type': 'application/json' } }), signal }), path.split('?')[0]);
  assert.ok(response, path + ' must belong to Library');
  return { response, value: response.headers.get('Content-Type')?.includes('application/json') ? await response.json() : new Uint8Array(await response.arrayBuffer()) };
}
async function upload(env, text = 'Neutral Library attachment. Actual bytes.\n', fileName = 'neutral.txt', mime = 'text/plain') {
  const bytes = typeof text === 'string' ? encode(text) : text;
  const response = await env.files.handle(new Request('https://library.invalid/site/__codex-api/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_name: fileName, file_size: bytes.length, mime_type: mime, store_in_library: true }) }), '/files');
  const allocated = await response.json(); assert.equal(response.status, 200, JSON.stringify(allocated));
  const data = new FormData(); data.append('file', new File([bytes], fileName, { type: mime }), fileName); data.append('upload_url', new URL(allocated.upload_url).searchParams.get('upload_url'));
  await env.files.upload('POST', allocated.upload_url, { body: data });
  const ready = await env.files.handle(new Request('https://library.invalid/site/__codex-api/files/process_upload_stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file_id: allocated.file_id }) }), '/files/process_upload_stream');
  assert.equal(ready.status, 200, await ready.text());
  return { id: allocated.file_id, bytes, fileName, mime, sha256: digest(bytes) };
}
const recommendation = extra => ({ cursor: null, limit: 50, categories: [], source: null, include_hidden_files: false, include_saved_entities: true, include_sites: false, trashed_only: false, ranking: 'suggested', ...extra });
const recommended = (env, extra, service = env.library) => call(service, '/files/library', 'POST', recommendation(extra));
const nodes = (env, query = '', service = env.library) => call(service, '/files/library/nodes?entry_surface=library&include_files=true' + query, 'GET');
const folder = (env, name, parent = null) => call(env.library, '/files/library/directories', 'POST', { name, parent_directory_id: parent });

test('actual uploaded bytes appear in distinct native recommended-file and all-node DTOs without private registry fields', async t => {
  const env = environment(t), text = await upload(env), image = await upload(env, png, 'neutral.png', 'image/png');
  const first = await recommended(env); assert.equal(first.response.status, 200); assert.equal(first.value.items.length, 2);
  for (const item of first.value.items) { assert.equal(item.kind, undefined); assert.equal(item.name, undefined); assert.equal(item.file_id, item.id); assert.equal(item.state, 'ready'); assert.equal(item.library_artifact_type, null); assert.equal(item.directory_id, null); assert.equal(item.cloud_doc_url, undefined); }
  assert.equal(first.value.items.find(item => item.id === image.id).library_file_category, 'image');
  const all = await nodes(env); assert.equal(all.response.status, 200); assert.equal(all.value.items.length, 2);
  assert.equal(all.value.items.find(item => item.id === text.id).name, text.fileName); assert.equal(all.value.items[0].kind, 'file');
  assert.equal(/ticket|upload_url|namespace|requestOrigin|storageName/.test(JSON.stringify(all.value)), false);
  assert.equal((await env.files.readFile(text.id)).record.fileName, text.fileName); assert.equal(digest((await env.files.readFile(image.id)).bytes), image.sha256);
  assert.equal((await env.library.handle(new Request('https://library.invalid/site/__codex-api/conversations'), '/conversations')), null);
});

test('native category/source/search filters use actual filenames and MIME; generated does not claim uploaded files', async t => {
  const env = environment(t), text = await upload(env, 'First neutral text', 'readable.txt'), code = await upload(env, '{"neutral":true}', 'data.json', 'application/json'), image = await upload(env, png, 'picture.png', 'image/png');
  const documents = await recommended(env, { categories: ['documents'] }); assert.deepEqual(documents.value.items.map(item => item.id), [text.id]);
  const images = await recommended(env, { categories: ['image'] }); assert.deepEqual(images.value.items.map(item => item.id), [image.id]);
  const search = await recommended(env, { q: 'DATA.JSON', source: 'uploaded' }); assert.deepEqual(search.value.items.map(item => item.id), [code.id]);
  assert.equal((await recommended(env, { source: 'generated' })).value.items.length, 0);
  assert.equal((await recommended(env, { categories: ['pages'] })).value.items.length, 0);
});

test('opaque pagination is stable, filter/account bound, and restarts when real file catalog or Library state changes', async t => {
  const env = environment(t); for (let i = 0; i < 7; i++) { env.now(1700000000000 + i); await upload(env, 'Neutral ' + i, i + '.txt'); }
  const first = await recommended(env, { limit: 3 }); assert.equal(first.value.items.length, 3); assert.equal(typeof first.value.cursor, 'string');
  const second = await recommended(env, { limit: 3, cursor: first.value.cursor }); assert.equal(second.value.items.length, 3);
  const third = await recommended(env, { limit: 3, cursor: second.value.cursor }); assert.equal(third.value.items.length, 1); assert.equal(third.value.cursor, null);
  assert.equal(new Set([...first.value.items,...second.value.items,...third.value.items].map(item => item.id)).size, 7);
  assert.equal((await recommended(env, { limit: 3, cursor: first.value.cursor, source: 'uploaded' })).response.status, 409);
  await folder(env, 'new-folder'); assert.equal((await recommended(env, { limit: 3, cursor: first.value.cursor })).response.status, 409);
  env.setAccount('library-fixture-account-b'); assert.equal((await recommended(env, { limit: 3, cursor: first.value.cursor })).response.status, 409);
});

test('native folder create/path/rename/move and file rename persist while upload history name and raw SHA remain intact', async t => {
  const env = environment(t), file = await upload(env), first = await folder(env, 'Root folder'), second = await folder(env, 'Nested', first.value.id);
  assert.equal(first.response.status, 200); assert.equal(first.value.kind, 'directory'); assert.equal(second.value.parent_directory_id, first.value.id);
  assert.equal((await call(env.library, '/files/library/files/' + file.id + '/move', 'PATCH', { directory_id: second.value.id })).response.status, 200);
  const renamed = await call(env.library, '/files/library/files/' + file.id, 'PATCH', { file_name: 'renamed.txt' }); assert.equal(renamed.value.file_name, 'renamed.txt'); assert.equal(renamed.value.name, undefined);
  const childNodes = await nodes(env, '&parent_directory_id=' + second.value.id); assert.equal(childNodes.value.items[0].name, 'renamed.txt'); assert.equal(childNodes.value.items[0].parent_directory_id, second.value.id);
  const path = await call(env.library, '/files/library/directories/path?directory_id=' + second.value.id); assert.deepEqual(path.value.items.map(item => item.id), [LOCAL_LIBRARY_ROOT_ID,first.value.id,second.value.id]);
  const rootFolders = await call(env.library, '/files/library/nodes?include_files=false'); assert.deepEqual(rootFolders.value.items.map(item => item.id), [first.value.id]); assert.equal(rootFolders.value.items[0].folder_count, 1);
  const restored = env.restore(); const restoredNodes = await nodes(env, '&parent_directory_id=' + second.value.id, restored); assert.equal(restoredNodes.value.items[0].name, 'renamed.txt');
  const original = await env.files.readFile(file.id); assert.equal(original.record.fileName, 'neutral.txt'); assert.equal(digest(original.bytes), file.sha256);
});

test('directory duplicate names, cycles, foreign parents, path names and malformed mutations fail without changing state', async t => {
  const env = environment(t), a = await folder(env, 'A'), b = await folder(env, 'B', a.value.id), before = JSON.stringify([...env.libraryMeta]);
  assert.equal((await folder(env, 'A')).response.status, 409);
  assert.equal((await call(env.library, '/files/library/directories/' + a.value.id, 'PATCH', { parent_directory_id: b.value.id })).response.status, 409);
  assert.equal((await folder(env, '../escape')).response.status, 400);
  assert.equal((await folder(env, 'foreign', 'libdir_site_' + 'f'.repeat(32))).response.status, 404);
  assert.equal((await call(env.library, '/files/library/directories/' + a.value.id, 'PATCH', { unexpected: true })).response.status, 400);
  assert.equal(JSON.stringify([...env.libraryMeta]), before);
});

test('source soft-delete and restore preserve real bytes, original directory and favorite across new service instances', async t => {
  const env = environment(t), file = await upload(env), dir = await folder(env, 'Keep');
  await call(env.library, '/files/library/files/' + file.id + '/move', 'PATCH', { directory_id: dir.value.id });
  const favorite = await call(env.library, '/files/library/favorites', 'POST', { target_ref: { type: 'library_file', library_file_id: file.id } });
  const deleted = await call(env.library, '/files/library/files/' + file.id + '?file_id=' + file.id + '&soft_delete=true', 'DELETE'); assert.equal(deleted.value.success, true);
  assert.equal((await recommended(env)).value.items.length, 0); const trash = await recommended(env, { trashed_only: true }); assert.equal(trash.value.items[0].id, file.id); assert.ok(trash.value.items[0].trashed_at);
  assert.equal(digest((await env.files.readFile(file.id)).bytes), file.sha256); assert.equal((await call(env.library, '/files/library/favorites')).value.items.length, 0);
  const restored = env.restore(); assert.equal((await call(restored, '/files/library/files/' + file.id + '/restore', 'POST', {})).value.success, true);
  const listed = await recommended(env, {}, restored); assert.equal(listed.value.items[0].directory_id, dir.value.id); assert.equal(listed.value.items[0].trashed_at, null);
  assert.equal((await call(restored, '/files/library/favorites')).value.items[0].favorite_id, favorite.value.favorite_id);
});

test('native favorite add/status/remove are real, idempotent, persisted and owner-scoped', async t => {
  const env = environment(t), file = await upload(env), target = { type: 'library_file', library_file_id: file.id };
  const added = await call(env.library, '/files/library/favorites', 'POST', { target_ref: target }), repeated = await call(env.library, '/files/library/favorites', 'POST', { target_ref: target }); assert.equal(added.value.favorite_id, repeated.value.favorite_id);
  const status = await call(env.library, '/files/library/favorites/status', 'POST', { target_refs: [target] }); assert.equal(status.value.items[0].availability, 'available'); assert.equal(status.value.items[0].favorite.favorite_id, added.value.favorite_id);
  const persisted = await call(env.restore(), '/files/library/favorites'); assert.equal(persisted.value.items[0].item.file_name, file.fileName);
  env.setAccount('library-fixture-account-b'); assert.equal((await call(env.library, '/files/library/favorites')).value.items.length, 0); assert.equal((await call(env.library, '/files/library/favorites/' + added.value.favorite_id, 'DELETE')).response.status, 404);
  env.setAccount('library-fixture-account-a'); assert.equal((await call(env.library, '/files/library/favorites/' + added.value.favorite_id, 'DELETE')).value.success, true); assert.equal((await call(env.library, '/files/library/favorites')).value.items.length, 0);
});

test('failed Library storage commits roll back rename/trash/create and never call physical cancellation', async t => {
  const env = environment(t), file = await upload(env), before = JSON.stringify([...env.libraryMeta]); env.failLibrary(true);
  for (const [path,method,value] of [['/files/library/files/' + file.id,'PATCH',{file_name:'not-committed.txt'}],['/files/library/files/' + file.id + '?soft_delete=true','DELETE'],['/files/library/directories','POST',{name:'not-committed',parent_directory_id:null}]]) assert.equal((await call(env.library,path,method,value)).response.status,507);
  assert.equal(JSON.stringify([...env.libraryMeta]),before); assert.equal(digest((await env.files.readFile(file.id)).bytes),file.sha256);
  env.failLibrary(false); assert.equal((await recommended(env)).value.items[0].file_name,'neutral.txt');
});

test('downloads and blob URLs contain actual SHA-verified bytes; corrupted storage never yields a successful URL', async t => {
  const env = environment(t), file = await upload(env), image = await upload(env,png,'actual.png','image/png');
  await call(env.library,'/files/library/files/'+file.id,'PATCH',{file_name:'中性文本.txt'});
  const direct = await call(env.library,'/files/library/files/'+file.id+'/download'); assert.equal(direct.response.status,200); assert.equal(digest(direct.value),file.sha256); assert.match(direct.response.headers.get('Content-Disposition'),/filename\*=UTF-8''/);
  const resolved = await call(env.library,'/files/library/files/'+image.id+'/thumbnail'); assert.equal(resolved.response.status,200); assert.match(resolved.value.thumbnail_url,/^blob:/); assert.equal(digest(new Uint8Array(await (await fetch(resolved.value.thumbnail_url)).arrayBuffer())),image.sha256);
  const info = await env.files.readFile(file.id); env.raw.set(info.record.namespace+'/'+info.record.storageName,encode('corrupted bytes'));
  const corrupt = await call(env.library,'/files/library/files/'+file.id+'/download_url'); assert.equal(corrupt.response.status,409); assert.equal(corrupt.value.download_url,undefined);
});

test('account change during awaited file listing/read returns conflict; old owner blob URLs are revoked', async t => {
  let switchRead=false,env; env=environment(t,{beforeRead:async()=>{if(switchRead){switchRead=false;env.setAccount('library-fixture-account-b');}}}); const file=await upload(env);
  const link=await call(env.library,'/files/library/files/'+file.id+'/download_url'); assert.equal(link.response.status,200);
  switchRead=true; const changed=await call(env.library,'/files/library/files/'+file.id+'/download_url'); assert.equal(changed.response.status,409); assert.equal(changed.value.download_url,undefined);
  await assert.rejects(fetch(link.value.download_url)); assert.equal((await recommended(env)).value.items.length,0);
  env.setAccount(null); assert.equal((await recommended(env)).response.status,401);
});

test('pending files are never fabricated as ready Library items and aborted access leaves catalog unchanged', async t => {
  const env=environment(t); const response=await env.files.handle(new Request('https://library.invalid/site/__codex-api/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file_name:'pending.txt',file_size:10,mime_type:'text/plain'})}),'/files'); assert.equal(response.status,200);
  assert.equal((await recommended(env)).value.items.length,0);
  const controller=new AbortController();controller.abort();assert.equal((await call(env.library,'/files/library','POST',recommendation(),controller.signal)).response.status,499);assert.equal(env.libraryMeta.size,0);
});

test('permanent deletion unavailable is explicit and does not turn native folder deletion into soft trash', async t => {
  const env=environment(t,{files:files=>({listFiles:files.listFiles,readFile:files.readFile,cancelUpload:()=>{throw Error('must never cancel');}})}),file=await upload(env),dir=await folder(env,'contains-real-file');await call(env.library,'/files/library/files/'+file.id+'/move','PATCH',{directory_id:dir.value.id});
  assert.equal((await call(env.library,'/files/library/files/'+file.id+'?soft_delete=false','DELETE')).response.status,501);
  assert.equal((await call(env.library,'/files/library/directories/'+dir.value.id,'DELETE')).response.status,501);
  assert.equal(digest((await env.files.readFile(file.id)).bytes),file.sha256);assert.equal((await recommended(env,{trashed_only:true})).value.items.length,0);
});

test('confirmed real permanent deletion and recursive native directory removal delete bytes and metadata only after success', async t => {
  const env=environment(t),a=await upload(env,'A neutral','a.txt'),b=await upload(env,png,'b.png','image/png'),dir=await folder(env,'permanent'),child=await folder(env,'nested',dir.value.id);
  await call(env.library,'/files/library/files/'+a.id+'/move','PATCH',{directory_id:dir.value.id});await call(env.library,'/files/library/files/'+b.id+'/move','PATCH',{directory_id:child.value.id});
  const result=await call(env.library,'/files/library/directories/'+dir.value.id,'DELETE');assert.equal(result.response.status,200);assert.equal(result.value.success,true);assert.equal(env.raw.size,0);assert.equal((await env.files.listFiles()).length,0);assert.equal((await nodes(env)).value.items.length,0);
});

test('permanent IO failures retain retryable records; final Library commit failure can retry after confirmed domain deletion', async t => {
  let failRemove=true;const env=environment(t,{failRemove:()=>failRemove}),file=await upload(env);
  const failed=await call(env.library,'/files/library/files/'+file.id+'?soft_delete=false','DELETE');assert.equal(failed.response.status,503);assert.equal((await env.files.listFiles()).length,1);assert.equal(env.raw.size,1);
  failRemove=false;env.failWriteAt(env.writes()+2);const commitFailed=await call(env.library,'/files/library/files/'+file.id+'?soft_delete=false','DELETE');assert.equal(commitFailed.response.status,507);assert.equal(env.raw.size,0);assert.equal((await env.files.listFiles()).length,0);
  env.failWriteAt(null);const retried=await call(env.library,'/files/library/files/'+file.id+'?soft_delete=false','DELETE');assert.equal(retried.response.status,200);assert.equal(retried.value.success,true);
});

test('batch soft delete reports exact owned successes and storage failure commits none; cloud sharing is never fabricated', async t => {
  const env=environment(t),a=await upload(env,'A','a.txt'),b=await upload(env,'B','b.txt'),foreign='file_local_'+'f'.repeat(32),body={files:[{library_file_id:a.id,file_id:a.id},{library_file_id:b.id,file_id:b.id},{library_file_id:foreign,file_id:foreign}]};
  env.failLibrary(true);assert.equal((await call(env.library,'/files/library/files/delete-batch','POST',body)).response.status,507);env.failLibrary(false);assert.equal((await recommended(env)).value.items.length,2);
  const result=await call(env.library,'/files/library/files/delete-batch','POST',body);assert.deepEqual(result.value.files.map(item=>item.success),[true,true,false]);assert.equal((await recommended(env,{trashed_only:true})).value.items.length,2);assert.equal(env.raw.size,2);
  const share=await call(env.library,'/files/library/files/'+a.id+'/share','POST',{});assert.equal(share.response.status,501);assert.equal(share.value.url,undefined);assert.match(share.value.error.message,/共享/);
});

test('only exact registered object URLs belong to the current authenticated owner; foreign/disposed/old-account URLs are rejected', async t => {
  const env=environment(t),file=await upload(env),resolved=await call(env.library,'/files/library/files/'+file.id+'/download_url'),url=resolved.value.download_url;
  assert.equal(env.library.ownsObjectURL(url),true);assert.equal(env.library.ownsObjectURL(url+'/extra'),false);assert.equal(env.library.ownsObjectURL('blob:https://foreign.invalid/other'),false);assert.equal(env.library.ownsObjectURL('https://library.invalid/'),false);
  env.library.dispose();assert.equal(env.library.ownsObjectURL(url),false);await assert.rejects(fetch(url));
  const next=(await call(env.library,'/files/library/files/'+file.id+'/download_url')).value.download_url;env.setAccount('library-fixture-account-b');assert.equal(env.library.ownsObjectURL(next),false);await assert.rejects(fetch(next));
  env.setAccount(null);assert.equal(env.library.ownsObjectURL(next),false);
});

test('recursive permanent directory deletion serializes concurrent Library moves and never leaves an orphaned file parent', async t => {
  let enter,release,first=true;const entered=new Promise(resolve=>{enter=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  const env=environment(t,{beforeRemove:async()=>{if(first){first=false;enter();await gate;}}}),inside=await upload(env,'inside','inside.txt'),outside=await upload(env,'outside','outside.txt'),dir=await folder(env,'serial');
  await call(env.library,'/files/library/files/'+inside.id+'/move','PATCH',{directory_id:dir.value.id});
  const deletion=call(env.library,'/files/library/directories/'+dir.value.id,'DELETE');await entered;
  const pendingMove=call(env.library,'/files/library/files/'+outside.id+'/move','PATCH',{directory_id:dir.value.id});release();assert.equal((await deletion).response.status,200);assert.equal((await pendingMove).response.status,404);
  const remaining=(await nodes(env)).value.items;assert.equal(remaining.length,1);assert.equal(remaining[0].id,outside.id);assert.equal(remaining[0].parent_directory_id,null);assert.equal(digest((await env.files.readFile(outside.id)).bytes),outside.sha256);
});

test('a valid epoch-zero trash timestamp remains deleted and restored without changing raw bytes', async t => {
  const env=environment(t);env.now(0);const file=await upload(env);await call(env.library,'/files/library/files/'+file.id+'?soft_delete=true','DELETE');assert.equal((await recommended(env)).value.items.length,0);assert.equal((await recommended(env,{trashed_only:true})).value.items[0].trashed_at,'1970-01-01T00:00:00.000Z');await call(env.library,'/files/library/files/'+file.id+'/restore','POST',{});assert.equal((await recommended(env)).value.items[0].id,file.id);assert.equal(digest((await env.files.readFile(file.id)).bytes),file.sha256);
});


test('actual native generic file download resolves only owned local upload IDs to verified provider blobs and original trash-state metadata', async t => {
  const env=environment(t),file=await upload(env),result=await call(env.library,'/files/download/'+file.id+'?inline=true&include_library_file_state=true');
  assert.equal(result.response.status,200);assert.equal(result.value.status,'success');assert.equal(env.library.ownsObjectURL(result.value.download_url),true);assert.equal(digest(new Uint8Array(await (await fetch(result.value.download_url)).arrayBuffer())),file.sha256);assert.equal(result.value.metadata,undefined);
  await call(env.library,'/files/library/files/'+file.id+'?soft_delete=true','DELETE');const trashed=await call(env.library,'/files/download/'+file.id+'?include_library_file_state=true');assert.deepEqual(trashed.value.metadata,{library_file_state:{library_file_id:file.id,status:'trashed'}});
  env.setAccount('library-fixture-account-b');const denied=await call(env.library,'/files/download/'+file.id);assert.equal(denied.response.status,404);assert.equal(denied.value.download_url,undefined);assert.equal(env.library.ownsObjectURL(result.value.download_url),false);
  assert.equal(await env.library.handle(new Request('https://library.invalid/files/download/file_some_other_provider'),'/files/download/file_some_other_provider'),null);
});

test('native generic download cannot return a URL for corrupt bytes or after explicit provider URL disposal', async t => {
  const env=environment(t),file=await upload(env),result=await call(env.library,'/files/download/'+file.id);env.library.dispose();assert.equal(env.library.ownsObjectURL(result.value.download_url),false);
  const record=(await env.files.readFile(file.id)).record;env.raw.set(record.namespace+'/'+record.storageName,encode('broken'));
  const corrupted=await call(env.library,'/files/download/'+file.id);assert.equal(corrupted.response.status,409);assert.equal(corrupted.value.download_url,undefined);
});


test('original EmptyLibraryTrash counts only owned trashed files, preserves active files/folders/foreign records, and retries actual IO failure', async t => {
  let blockedKey=null,fail=true;const env=environment(t,{failRemove:key=>fail&&key===blockedKey}),a=await upload(env,'Trash A','a.txt'),b=await upload(env,'Trash B','b.txt'),activeFile=await upload(env,'Keep active','active.txt'),dir=await folder(env,'Keep folder');
  const bRecord=(await env.files.readFile(b.id)).record;blockedKey=bRecord.namespace+'/'+bRecord.storageName;
  env.setAccount('library-fixture-account-b');const foreign=await upload(env,'Other owner','foreign.txt');env.setAccount('library-fixture-account-a');
  for(const file of [a,b])await call(env.library,'/files/library/files/'+file.id+'?soft_delete=true','DELETE');
  assert.equal((await call(env.library,'/files/library/files/'+foreign.id+'?soft_delete=true','DELETE')).response.status,404);
  const partial=await call(env.library,'/files/library/trash','DELETE');assert.equal(partial.response.status,200);assert.equal(partial.value.deleted_count,1);assert.equal(partial.value.failed_count,1);assert.equal(partial.value.failures[0].library_file_id,b.id);assert.equal((await env.files.listFiles()).length,2);assert.equal(digest((await env.files.readFile(activeFile.id)).bytes),activeFile.sha256);
  fail=false;const retry=await call(env.library,'/files/library/trash','DELETE');assert.equal(retry.value.deleted_count,1);assert.equal(retry.value.failed_count,0);assert.equal((await recommended(env,{trashed_only:true})).value.items.length,0);assert.equal((await env.files.listFiles()).length,1);assert.equal((await call(env.library,'/files/library/directories/path?directory_id='+dir.value.id)).response.status,200);
  env.setAccount('library-fixture-account-b');assert.equal(digest((await env.files.readFile(foreign.id)).bytes),foreign.sha256);assert.equal((await call(env.library,'/files/library/trash','DELETE')).value.deleted_count,0);
});
