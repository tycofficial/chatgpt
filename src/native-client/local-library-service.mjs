/** Native Library service boundary backed only by this site's real uploads.
 * TCFx/jU86: recommended POST returns raw files; nodes GET returns native nodes.
 * e7El: file soft_delete=true retains bytes; directory DELETE is permanent.
 * No original account inventory, mounted cloud provider, share URL or UI lives here.
 */
export const LOCAL_LIBRARY_SOURCE = 'browser-origin-local-library';
export const LOCAL_LIBRARY_ROOT_ID = 'libdir_site_root';
const PREFIX = 'site-local-library:v1:';
const FILE_ID = /^file_local_[0-9a-f]{32}$/;
const DIRECTORY_ID = /^libdir_site_[0-9a-f]{32}$/;
const FAVORITE_ID = /^libfav_site_[0-9a-f]{32}$/;
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const issue = (message, status = 400, code = 'LOCAL_LIBRARY_INVALID_REQUEST') => Object.assign(new Error(message), { status, code });
const json = (value, status = 200, extra) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
function failure(cause) {
  const message = cause?.message || '本站资料库操作失败';
  const code = cause?.name === 'AbortError' ? 'LOCAL_LIBRARY_ABORTED' : cause?.code || 'LOCAL_LIBRARY_ERROR';
  return json({ detail: { error_type: code.toLowerCase(), message }, error: { code, message }, adapter_source: LOCAL_LIBRARY_SOURCE }, cause?.name === 'AbortError' ? 499 : cause?.status || 500);
}
function name(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 255 || /[/\\\u0000-\u001f\u007f]/.test(value) || ['.', '..'].includes(value.trim())) throw issue('请输入有效的文件或文件夹名称');
  return value.trim();
}
const iso = value => new Date(value).toISOString();
const hex = value => [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join('');
async function hash(value) { return hex(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value)); }
function bool(value, fallback = false) {
  if (value == null) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw issue('资料库筛选参数必须是布尔值');
}
// The native ok2n/Rzcw precedence: PDF, spreadsheets, presentations, Word,
// code, plain/Markdown text, then images. Native Documents includes text files.
function fileCategory(file, displayName) {
  const ext = displayName.split('.').at(-1).toLowerCase(), mime = file.mimeType.toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) return 'pdfs';
  if (['csv','tsv','xls','xlsm','xlsx'].includes(ext) || /csv|spreadsheet|excel/.test(mime)) return 'spreadsheets';
  if (['ppt','pptx','key'].includes(ext) || /presentation|powerpoint/.test(mime)) return 'presentations';
  if (['doc','docx'].includes(ext) || /word|wordprocessingml/.test(mime)) return 'documents';
  if (['bash','c','cc','cpp','cs','css','go','h','html','htm','ini','ipynb','java','js','json','jsonc','jsx','kt','lua','mjs','php','ps1','py','rb','rs','sh','sql','swift','toml','ts','tsx','xml','yaml','yml'].includes(ext) || /javascript|typescript|python|json|xml|html/.test(mime)) return 'other';
  if (mime.startsWith('text/') || ['dotenv','env','gitignore','lock','markdown','md','mdown','mdx','mkd','rtf','txt'].includes(ext)) return 'documents';
  if (file.kind === 'image' || mime.startsWith('image/') || ['png','jpg','jpeg','webp','gif','svg','avif','bmp','heic','heif','tif','tiff'].includes(ext)) return 'images';
  return 'other';
}
function filters(value, mode) {
  const many = key => value instanceof URLSearchParams ? value.getAll(key).flatMap(v => v.includes(',') ? v.split(',') : [v]) : value[key] ?? [];
  const one = key => value instanceof URLSearchParams ? value.get(key) : value[key];
  let categories = many('categories'); if (!Array.isArray(categories) || categories.some(v => typeof v !== 'string')) throw issue('资料库类型筛选无效');
  categories = [...new Set(categories.map(v => v === 'image' ? 'images' : v))].sort();
  if (categories.some(v => !['images','documents','pdfs','spreadsheets','presentations','pages','meetings'].includes(v))) throw issue('资料库类型筛选无效');
  const q = one('q') ?? one('search') ?? ''; if (typeof q !== 'string' || q.length > 2000) throw issue('资料库搜索词无效');
  const source = one('source') || null; if (source !== null && !['uploaded','generated'].includes(source)) throw issue('资料库来源筛选无效');
  const parent = one('parent_directory_id') ?? one('directory_id') ?? null;
  if (parent !== null && typeof parent !== 'string') throw issue('资料库文件夹无效');
  const cursor = one('cursor') ?? null; if (cursor !== null && typeof cursor !== 'string') throw issue('资料库分页游标无效');
  const limit = Number(one('limit') ?? 50); if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw issue('资料库分页数量无效');
  return { mode, categories, q: q.trim(), source, parent: parent === LOCAL_LIBRARY_ROOT_ID ? null : parent, cursor, limit,
    deleted: bool(one('trashed_only')), includeFiles: mode !== 'nodes' || bool(one('include_files'), true),
    includeHidden: bool(one('include_hidden_files')), ranking: one('ranking') ?? null };
}
export function createLocalLibraryService({
  files, metadataStorage = globalThis.localStorage, getAccountId = () => null,
  diagnostics = [], now = Date.now, uuid = () => crypto.randomUUID(), rootName = '资料库',
  createObjectURL = blob => URL.createObjectURL(blob), revokeObjectURL = url => URL.revokeObjectURL(url),
  lockManager = globalThis.navigator?.locks,
} = {}) {
  if (typeof files?.listFiles !== 'function' || typeof files?.readFile !== 'function' || typeof metadataStorage?.getItem !== 'function' || typeof metadataStorage?.setItem !== 'function') throw new TypeError('A real account-scoped file catalog/read service and persistent Library storage are required');
  let pending = Promise.resolve(), lastOwner = null;
  const blobs = new Map();
  function dispose() { for (const value of blobs.values()) try { revokeObjectURL(value.url); } catch {} blobs.clear(); }
  function owner() {
    const id = getAccountId();
    if (id !== lastOwner) { dispose(); lastOwner = id; }
    if (typeof id !== 'string' || !id) throw issue('请先登录本站后再打开资料库', 401, 'LOCAL_LIBRARY_AUTH_REQUIRED');
    return id;
  }
  function ownsObjectURL(value) {
    try { const id = owner(); return typeof value === 'string' && value.startsWith('blob:') && [...blobs.values()].some(row => row.owner === id && row.url === value); }
    catch { return false; }
  }
  const check = (id, signal) => { signal?.throwIfAborted(); if (owner() !== id) throw issue('资料库账户已更改，请重新打开', 409, 'LOCAL_LIBRARY_ACCOUNT_CHANGED'); };
  const key = id => PREFIX + encodeURIComponent(id);
  const empty = id => ({ schemaVersion: 1, accountId: id, revision: 0, directories: {}, overrides: {}, favorites: {}, deletions: {} });
  function read(id) {
    check(id); let raw; try { raw = metadataStorage.getItem(key(id)); } catch { throw issue('无法读取本站资料库记录，原文件未更改', 503, 'LOCAL_LIBRARY_STORAGE_UNAVAILABLE'); }
    if (raw == null) return empty(id);
    let state; try { state = JSON.parse(raw); } catch { throw issue('资料库记录损坏，未覆盖原记录或文件', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED'); }
    if (!object(state) || state.schemaVersion !== 1 || state.accountId !== id || !Number.isSafeInteger(state.revision) || state.revision < 0 || !['directories','overrides','favorites','deletions'].every(k => object(state[k]))) throw issue('资料库记录格式无效，原文件已保留', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED');
    for (const [id, row] of Object.entries(state.directories)) if (!DIRECTORY_ID.test(id) || row.id !== id || typeof row.name !== 'string' || !(row.parentId === null || DIRECTORY_ID.test(row.parentId)) || !Number.isFinite(row.createdAt) || !Number.isFinite(row.updatedAt)) throw issue('资料库文件夹记录损坏', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED');
    for (const [id, row] of Object.entries(state.overrides)) if (!FILE_ID.test(id) || !object(row) || row.name != null && typeof row.name !== 'string' || row.directoryId != null && !DIRECTORY_ID.test(row.directoryId) || row.trashedAt != null && !Number.isFinite(row.trashedAt)) throw issue('资料库文件记录损坏', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED');
    for (const [id, row] of Object.entries(state.favorites)) if (!FAVORITE_ID.test(id) || row.id !== id || !FILE_ID.test(row.fileId) || !Number.isFinite(row.createdAt)) throw issue('资料库收藏记录损坏', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED');
    return state;
  }
  function save(id, state, signal) {
    check(id, signal); const next = { ...state, revision: state.revision + 1 };
    try { metadataStorage.setItem(key(id), JSON.stringify(next)); } catch { throw issue('无法保存资料库更改；原目录和文件未被更改', 507, 'LOCAL_LIBRARY_STORAGE_WRITE_FAILED'); }
    return next;
  }
  async function list(id, signal, includeUnready = false) {
    check(id, signal); const input = await files.listFiles({ signal }); check(id, signal);
    if (!Array.isArray(input)) throw issue('真实文件服务返回了无效目录', 502, 'LOCAL_LIBRARY_FILE_CATALOG_INVALID');
    const result = new Map();
    for (const row of input) {
      if (!object(row) || !FILE_ID.test(row.fileId ?? '') || typeof row.fileName !== 'string' || typeof row.mimeType !== 'string' || !Number.isSafeInteger(row.size) || row.size < 0 || !Number.isFinite(row.createdAt)) throw issue('真实文件元数据无效', 502, 'LOCAL_LIBRARY_FILE_CATALOG_INVALID');
      if (row.status !== 'ready') { if (includeUnready) result.set(row.fileId, copy(row)); continue; }
      if (!/^[0-9a-f]{64}$/.test(row.sha256 ?? '') || result.has(row.fileId)) throw issue('真实文件身份或摘要无效', 502, 'LOCAL_LIBRARY_FILE_CATALOG_INVALID');
      result.set(row.fileId, copy(row));
    }
    return result;
  }
  function directory(state, id) {
    if (id == null || id === LOCAL_LIBRARY_ROOT_ID) return null;
    const row = state.directories[id]; if (!row) throw issue('此文件夹不存在或不属于当前账户', 404, 'LOCAL_LIBRARY_DIRECTORY_NOT_FOUND');
    return row;
  }
  const parentId = value => value == null || value === LOCAL_LIBRARY_ROOT_ID ? null : value;
  function root() { return { id: LOCAL_LIBRARY_ROOT_ID, kind: 'directory', name: rootName, parent_directory_id: null, is_root: true, access_kind: 'owned' }; }
  function nativeDirectory(state, row, records) {
    return { id: row.id, kind: 'directory', name: row.name, parent_directory_id: row.parentId,
      item_count: [...records.values()].filter(file => state.overrides[file.fileId]?.trashedAt == null && parentId(state.overrides[file.fileId]?.directoryId) === row.id).length,
      folder_count: Object.values(state.directories).filter(file => file.parentId === row.id).length,
      updated_at: iso(row.updatedAt), created_at: iso(row.createdAt), access_kind: 'owned' };
  }
  function rawFile(state, file) {
    const overlay = state.overrides[file.fileId] ?? {}, displayName = overlay.name ?? file.fileName;
    return { id: file.fileId, file_id: file.fileId, file_name: displayName, file_extension: displayName.includes('.') ? displayName.split('.').at(-1) : '', mime_type: file.mimeType,
      file_size_bytes: file.size, file_upload_time: iso(file.createdAt), record_creation_time: iso(file.createdAt), updated_at: iso(overlay.updatedAt ?? file.processedAt ?? file.createdAt),
      library_artifact_type: null, library_file_category: fileCategory(file, displayName) === 'images' ? 'image' : 'other', state: 'ready', access_kind: 'owned', is_shared: false,
      directory_id: overlay.directoryId ?? null, trashed_at: overlay.trashedAt == null ? null : iso(overlay.trashedAt),
      ...(Number.isSafeInteger(file.width) ? { width: file.width } : {}), ...(Number.isSafeInteger(file.height) ? { height: file.height } : {}) };
  }
  const nativeFile = (state, file) => { const value = rawFile(state, file); return { ...value, kind: 'file', name: value.file_name, parent_directory_id: value.directory_id }; };
  function find(records, fileId) { const row = records.get(fileId); if (!row) throw issue('此文件不存在或不属于当前账户', 404, 'LOCAL_LIBRARY_FILE_NOT_FOUND'); return row; }
  const patch = (state, fileId, changes) => { state.overrides[fileId] = { ...state.overrides[fileId], ...changes }; };
  function serial(id, action) {
    const execute = () => lockManager?.request ? lockManager.request(key(id), () => { check(id); return action(); }) : action();
    const current = pending.catch(() => {}).then(execute); pending = current.catch(() => {}); return current;
  }
  async function mutate(id, signal, action) {
    return serial(id, async () => { const records = await list(id, signal), state = read(id), result = await action(state, records); save(id, state, signal); return result; });
  }
  function duplicate(state, displayName, parent, ignore) { return Object.values(state.directories).some(row => row.id !== ignore && row.parentId === parent && row.name === displayName); }
  function validateParent(state, target, moving) {
    const targetId = parentId(target); directory(state, targetId);
    let id = targetId, seen = new Set();
    while (id !== null) { if (id === moving || seen.has(id)) throw issue('不能把文件夹移入自身或其子文件夹', 409, 'LOCAL_LIBRARY_DIRECTORY_CYCLE'); seen.add(id); id = directory(state, id).parentId; }
    return targetId;
  }
  function newId(prefix) { const value = String(uuid()).replaceAll('-', ''); if (!/^[0-9a-f]{32}$/.test(value)) throw issue('本地资料库无法分配有效标识', 503); return prefix + value; }
  async function page(id, state, records, values, criteria) {
    const fingerprint = await hash(JSON.stringify([id, state.revision, { ...criteria, cursor: null }, [...records.values()].map(file => [file.fileId,file.sha256,file.fileName]).sort((a,b) => a[0].localeCompare(b[0]))]));
    let offset = 0;
    if (criteria.cursor !== null) {
      try { const v = JSON.parse(atob(criteria.cursor.replaceAll('-', '+').replaceAll('_', '/'))); if (v.v !== 1 || v.f !== fingerprint || !Number.isSafeInteger(v.o) || v.o < 0 || v.o > values.length) throw Error(); offset = v.o; }
      catch { throw issue('资料库目录或筛选已更改，请重新加载列表', 409, 'catalog_cursor_restart_required'); }
    }
    const items = values.slice(offset, offset + criteria.limit), next = offset + items.length;
    const cursor = next < values.length ? btoa(JSON.stringify({ v: 1, f: fingerprint, o: next })).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : null;
    return { items, cursor, adapter_source: LOCAL_LIBRARY_SOURCE };
  }
  async function browse(id, input, mode, signal) {
    const criteria = filters(input, mode), records = await list(id, signal), state = read(id); directory(state, criteria.parent);
    const match = file => { const overlay = state.overrides[file.fileId] ?? {}, displayName = overlay.name ?? file.fileName;
      return ((overlay.trashedAt != null) === criteria.deleted) && criteria.source !== 'generated'
        && (!criteria.categories.length || criteria.categories.includes(fileCategory(file, displayName)))
        && displayName.toLocaleLowerCase().includes(criteria.q.toLocaleLowerCase())
        && (mode !== 'nodes' || parentId(overlay.directoryId) === criteria.parent); };
    let values = criteria.includeFiles ? [...records.values()].filter(match).sort((a,b) => (state.overrides[b.fileId]?.lastOpenedAt ?? b.createdAt) - (state.overrides[a.fileId]?.lastOpenedAt ?? a.createdAt) || a.fileId.localeCompare(b.fileId)).map(file => mode === 'nodes' ? nativeFile(state, file) : rawFile(state, file)) : [];
    if (mode === 'nodes' && !criteria.deleted && !criteria.source && !criteria.categories.length) {
      const dirs = Object.values(state.directories).filter(row => row.parentId === criteria.parent && row.name.toLocaleLowerCase().includes(criteria.q.toLocaleLowerCase())).sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map(row => nativeDirectory(state, row, records)); values = [...dirs, ...values];
    }
    const output = await page(id, state, records, values, criteria); check(id, signal); return output;
  }
  function favorite(state, fileId) { return Object.values(state.favorites).find(row => row.fileId === fileId) ?? null; }
  function favoriteDTO(row, raw) { return { favorite_id: row.id, target_ref: { type: 'library_file', library_file_id: row.fileId }, created_at: iso(row.createdAt), ...(raw ? { availability: 'available', retryable: false, item: raw } : {}) }; }
  async function verifiedBytes(id, fileId, signal) {
    check(id, signal); const value = await files.readFile(fileId, { signal }); check(id, signal);
    const data = value?.bytes, bytes = data instanceof Uint8Array ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
    const record = value?.record;
    if (!record || record.fileId !== fileId || !bytes || bytes.length !== record.size || !/^[0-9a-f]{64}$/.test(record.sha256 ?? '') || await hash(bytes) !== record.sha256) throw issue('文件大小或 SHA-256 校验失败，未返回下载内容', 409, 'LOCAL_LIBRARY_FILE_CORRUPTED');
    check(id, signal); return { record, bytes };
  }
  async function resource(id, fileId, kind, signal) {
    const { record, bytes } = await verifiedBytes(id, fileId, signal), state = read(id), raw = rawFile(state, record);
    if (kind === 'thumbnail' && record.kind !== 'image' && !record.mimeType.startsWith('image/')) return { thumbnail_url: null, adapter_source: LOCAL_LIBRARY_SOURCE };
    let cached = blobs.get(fileId);
    if (!cached || cached.sha256 !== record.sha256 || cached.owner !== id) {
      if (cached) revokeObjectURL(cached.url);
      let url; try { url = createObjectURL(new Blob([bytes], { type: record.mimeType })); } catch { throw issue('浏览器无法创建真实文件下载资源', 503, 'LOCAL_LIBRARY_BLOB_UNAVAILABLE'); }
      if (typeof url !== 'string' || !url.startsWith('blob:')) throw issue('文件资源提供者没有返回有效的本地 Blob URL', 502, 'LOCAL_LIBRARY_BLOB_INVALID');
      cached = { owner: id, sha256: record.sha256, url }; blobs.set(fileId, cached);
    }
    check(id, signal);
    return { [kind === 'thumbnail' ? 'thumbnail_url' : kind === 'content_url' ? 'content_url' : 'download_url']: cached.url, file_name: raw.file_name, adapter_source: LOCAL_LIBRARY_SOURCE };
  }
  async function deleteConfirmed(id, fileId, signal) {
    if (typeof files.permanentDeleteFile !== 'function') throw issue('永久删除文件尚未接通；文件和提取文本均已保留', 501, 'LOCAL_LIBRARY_PERMANENT_DELETE_UNAVAILABLE');
    {
      const state = read(id), records = await list(id, signal, true); check(id, signal);
      if (!records.has(fileId) && !state.deletions[fileId]) throw issue('此文件不存在或不属于当前账户', 404, 'LOCAL_LIBRARY_FILE_NOT_FOUND');
      // A retryable tombstone precedes physical deletion. No success is returned
      // until the file service confirms both raw bytes and the sidecar are gone.
      state.deletions[fileId] = { startedAt: state.deletions[fileId]?.startedAt ?? now() }; save(id, state, signal);
      // The file domain removes its metadata only after confirming raw+sidecar
      // absence. A pending Library tombstone plus an absent domain record means
      // a previous confirmed delete only failed its final Library commit.
      const result = records.has(fileId) ? await files.permanentDeleteFile(fileId, { signal }) : { deleted: true }; check(id, signal);
      if (result?.deleted !== true) throw issue('真实文件服务未确认永久删除，资料库保留重试记录', 502, 'LOCAL_LIBRARY_DELETE_UNCONFIRMED');
      const after = read(id); delete after.deletions[fileId]; delete after.overrides[fileId];
      for (const [favoriteId,row] of Object.entries(after.favorites)) if (row.fileId === fileId) delete after.favorites[favoriteId];
      save(id, after, signal); const blob = blobs.get(fileId); if (blob) { revokeObjectURL(blob.url); blobs.delete(fileId); }
      return { success: true, adapter_source: LOCAL_LIBRARY_SOURCE };
    }
  }
  const permanentlyDelete = (id, fileId, signal) => serial(id, () => deleteConfirmed(id, fileId, signal));
  async function body(request) { let value; try { value = await request.json(); } catch { throw issue('需要有效的资料库 JSON 请求'); } if (!object(value)) throw issue('需要有效的资料库 JSON 请求'); return value; }
  async function handle(request, canonicalPath) {
    const incoming = new URL(request.url), path = (canonicalPath ?? incoming.pathname).replace(/^\/(?:backend-api|__codex-api)(?=\/)/, ''), method = request.method.toUpperCase();
    const sourceDownload = /^\/files\/download\/(file_local_[0-9a-f]{32})$/.exec(path);
    if (!sourceDownload && path !== '/files/library' && !path.startsWith('/files/library/')) return null;
    try {
      const id = owner(), signal = request.signal; check(id, signal);
      diagnostics.push({ type: 'local-library', method, path, source: LOCAL_LIBRARY_SOURCE });
      // Native J0RG/vvmK/hrUs use the generic file-download service for real
      // file_local_ upload IDs. Preserve its DTO; no fake HTTP/first-party ID.
      if (sourceDownload && method === 'GET') {
        const fileId = sourceDownload[1], result = await resource(id, fileId, 'download_url', signal), state = read(id);
        const showTrashState = bool(incoming.searchParams.get('include_library_file_state')) && state.overrides[fileId]?.trashedAt != null;
        return json({ status: 'success', ...result, ...(showTrashState ? { metadata: { library_file_state: { library_file_id: fileId, status: 'trashed' } } } : {}) });
      }
      if (path === '/files/library' && method === 'POST') return json(await browse(id, await body(request), 'files', signal));
      if (path === '/files/library/nodes' && method === 'GET') return json(await browse(id, incoming.searchParams, 'nodes', signal));
      if (path === '/files/library/directories/path' && method === 'GET') {
        const state = read(id), records = await list(id, signal), result = []; let current = parentId(incoming.searchParams.get('directory_id'));
        const seen = new Set(); while (current !== null) { if (seen.has(current)) throw issue('资料库目录层级损坏', 500, 'LOCAL_LIBRARY_METADATA_CORRUPTED'); seen.add(current); const row = directory(state, current); result.unshift(nativeDirectory(state, row, records)); current = row.parentId; }
        check(id, signal); return json({ items: [root(), ...result], adapter_source: LOCAL_LIBRARY_SOURCE });
      }
      if (path === '/files/library/directories' && method === 'POST') {
        const input = await body(request); return json(await mutate(id, signal, (state, records) => { const displayName = name(input.name), parent = validateParent(state, input.parent_directory_id);
          if (duplicate(state, displayName, parent)) throw issue('此文件夹中已存在同名文件夹', 409, 'LOCAL_LIBRARY_DIRECTORY_NAME_CONFLICT');
          const row = { id: newId('libdir_site_'), name: displayName, parentId: parent, createdAt: now(), updatedAt: now() }; state.directories[row.id] = row; return nativeDirectory(state, row, records); }));
      }
      const directoryMatch = /^\/files\/library\/directories\/(libdir_site_[0-9a-f]{32})$/.exec(path);
      if (directoryMatch && method === 'PATCH') {
        const input = await body(request); if (!['name','parent_directory_id'].some(k => k in input) || Object.keys(input).some(k => !['name','parent_directory_id'].includes(k))) throw issue('需要原生文件夹名称或移动字段');
        return json(await mutate(id, signal, (state, records) => { const row = directory(state, directoryMatch[1]), parent = 'parent_directory_id' in input ? validateParent(state, input.parent_directory_id, row.id) : row.parentId, displayName = 'name' in input ? name(input.name) : row.name;
          if (duplicate(state, displayName, parent, row.id)) throw issue('目标文件夹中已存在同名文件夹', 409, 'LOCAL_LIBRARY_DIRECTORY_NAME_CONFLICT'); row.name = displayName; row.parentId = parent; row.updatedAt = now(); return nativeDirectory(state, row, records); }));
      }
      if (directoryMatch && method === 'DELETE') return json(await serial(id, async () => {
        const records = await list(id, signal), state = read(id), rootId = directoryMatch[1]; directory(state, rootId);
        const descendants = new Set([rootId]); let changed = true; while (changed) { changed = false; for (const row of Object.values(state.directories)) if (descendants.has(row.parentId) && !descendants.has(row.id)) { descendants.add(row.id); changed = true; } }
        const contained = [...records.keys()].filter(fileId => descendants.has(state.overrides[fileId]?.directoryId));
        if (contained.length && typeof files.permanentDeleteFile !== 'function') throw issue('原操作要求永久删除文件夹及全部内容，真实文件删除服务尚未就绪', 501, 'LOCAL_LIBRARY_PERMANENT_DELETE_UNAVAILABLE');
        for (const fileId of contained) await deleteConfirmed(id, fileId, signal);
        const after = read(id); for (const rowId of descendants) delete after.directories[rowId]; save(id, after, signal);
        return { success: true, adapter_source: LOCAL_LIBRARY_SOURCE };
      }));
      if (path === '/files/library/favorites/status' && method === 'POST') {
        const input = await body(request), records = await list(id, signal), state = read(id); if (!Array.isArray(input.target_refs) || input.target_refs.length > 100 || input.target_refs.some(row => row?.type !== 'library_file' || !FILE_ID.test(row.library_file_id))) throw issue('收藏文件引用无效');
        return json({ items: input.target_refs.map(target => { const row = favorite(state, target.library_file_id), available = records.has(target.library_file_id) && state.overrides[target.library_file_id]?.trashedAt == null; return { target_ref: target, availability: available ? 'available' : 'unavailable', favorite: row ? favoriteDTO(row) : null }; }), adapter_source: LOCAL_LIBRARY_SOURCE });
      }
      if (path === '/files/library/favorites' && method === 'POST') {
        const input = await body(request); if (input.target_ref?.type !== 'library_file' || !FILE_ID.test(input.target_ref.library_file_id)) throw issue('收藏文件引用无效');
        return json(await mutate(id, signal, (state, records) => { const fileId = input.target_ref.library_file_id; find(records, fileId); if (state.overrides[fileId]?.trashedAt != null) throw issue('请先从回收站恢复此文件', 409); let row = favorite(state, fileId); if (!row) { row = { id: newId('libfav_site_'), fileId, createdAt: now() }; state.favorites[row.id] = row; } return favoriteDTO(row); }));
      }
      if (path === '/files/library/favorites' && method === 'GET') {
        const records = await list(id, signal), state = read(id), criteria = filters(incoming.searchParams, 'favorites');
        const values = Object.values(state.favorites).filter(row => records.has(row.fileId) && state.overrides[row.fileId]?.trashedAt == null).sort((a,b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)).map(row => favoriteDTO(row, rawFile(state, records.get(row.fileId)))).filter(row => row.item.file_name.toLowerCase().includes(criteria.q.toLowerCase()) && (!criteria.categories.length || criteria.categories.includes(fileCategory(records.get(row.target_ref.library_file_id), row.item.file_name))) && criteria.source !== 'generated');
        const output = await page(id, state, records, values, criteria); check(id, signal); return json(output);
      }
      const favoriteMatch = /^\/files\/library\/favorites\/(libfav_site_[0-9a-f]{32})$/.exec(path);
      if (favoriteMatch && method === 'DELETE') return json(await mutate(id, signal, state => { if (!state.favorites[favoriteMatch[1]]) throw issue('此收藏不存在或不属于当前账户', 404); delete state.favorites[favoriteMatch[1]]; return { success: true }; }));
      // iKaf/EmptyLibraryTrashDialog (327702:2052) consumes actual counts.
      if (path === '/files/library/trash' && method === 'DELETE') return json(await serial(id, async () => {
        const state = read(id), records = await list(id, signal, true);
        const targets = Object.entries(state.overrides).filter(([fileId, row]) => row.trashedAt != null && (records.has(fileId) || state.deletions[fileId])).map(([fileId]) => fileId);
        let deleted_count = 0, failed_count = 0; const failures = [];
        for (const fileId of targets) {
          try { await deleteConfirmed(id, fileId, signal); deleted_count++; }
          catch (cause) { check(id, signal); failed_count++; failures.push({ library_file_id: fileId, code: cause?.code ?? 'LOCAL_LIBRARY_DELETE_FAILED', status: cause?.status ?? 500 }); }
        }
        check(id, signal); return { deleted_count, failed_count, ...(failures.length ? { failures } : {}), adapter_source: LOCAL_LIBRARY_SOURCE };
      }));
      if (path === '/files/library/files/delete-batch' && method === 'POST') {
        const input = await body(request); if (!Array.isArray(input.files) || input.files.length < 1 || input.files.length > 100 || input.files.some(row => !FILE_ID.test(row?.library_file_id))) throw issue('批量文件引用无效');
        return json(await mutate(id, signal, (state, records) => ({ files: input.files.map(target => { const fileId = target.library_file_id; if (!records.has(fileId) || target.file_id != null && target.file_id !== fileId) return { library_file_id: fileId, success: false }; if (state.overrides[fileId]?.trashedAt == null) patch(state, fileId, { trashedAt: now(), updatedAt: now() }); return { library_file_id: fileId, success: true }; }) })));
      }
      const fileMatch = /^\/files\/library\/files\/(file_local_[0-9a-f]{32})(?:\/(node|content_url|download_url|thumbnail|content|download|restore|move|opened))?$/.exec(path);
      if (fileMatch) {
        const [, fileId, action] = fileMatch;
        if (method === 'GET' && ['content_url','download_url','thumbnail'].includes(action)) return json(await resource(id, fileId, action, signal));
        if (method === 'GET' && ['content','download'].includes(action)) {
          const { record, bytes } = await verifiedBytes(id, fileId, signal), state = read(id), displayName = rawFile(state, record).file_name;
          return new Response(bytes, { headers: { 'Content-Type': record.mimeType, 'Content-Length': String(bytes.length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': (action === 'download' ? 'attachment' : 'inline') + "; filename*=UTF-8''" + encodeURIComponent(displayName) } });
        }
        if (method === 'GET' && (action === undefined || action === 'node')) { const records = await list(id, signal), state = read(id), file = find(records, fileId); return json(action === 'node' ? nativeFile(state, file) : rawFile(state, file)); }
        if (method === 'PATCH' && action === undefined) {
          const input = await body(request); if (Object.keys(input).some(key => key !== 'file_name')) throw issue('需要原生 file_name 字段');
          return json(await mutate(id, signal, (state, records) => { const file = find(records, fileId); patch(state, fileId, { name: name(input.file_name), updatedAt: now() }); return rawFile(state, file); }));
        }
        if (method === 'PATCH' && action === 'move') { const input = await body(request); if (!('directory_id' in input) || Object.keys(input).some(key => key !== 'directory_id')) throw issue('需要原生 directory_id 字段'); return json(await mutate(id, signal, (state, records) => { find(records, fileId); patch(state, fileId, { directoryId: validateParent(state, input.directory_id), updatedAt: now() }); return { success: true }; })); }
        if (method === 'POST' && action === 'restore') return json(await mutate(id, signal, (state, records) => { find(records, fileId); const prior = state.overrides[fileId] ?? {}, target = prior.directoryId && state.directories[prior.directoryId] ? prior.directoryId : null; patch(state, fileId, { trashedAt: null, directoryId: target, updatedAt: now() }); return { success: true }; }));
        if (method === 'POST' && action === 'opened') return json(await mutate(id, signal, (state, records) => { find(records, fileId); patch(state, fileId, { lastOpenedAt: now() }); return { success: true }; }));
        if (method === 'DELETE' && action === undefined) {
          if (incoming.searchParams.has('file_id') && incoming.searchParams.get('file_id') !== fileId) throw issue('真实文件身份不一致', 404, 'LOCAL_LIBRARY_FILE_NOT_FOUND');
          if (!bool(incoming.searchParams.get('soft_delete'), true)) return json(await permanentlyDelete(id, fileId, signal));
          return json(await mutate(id, signal, (state, records) => { find(records, fileId); if (!state.overrides[fileId]?.trashedAt) patch(state, fileId, { trashedAt: now(), updatedAt: now() }); return { success: true }; }));
        }
      }
      if (/shar(?:e|ing)/i.test(path)) throw issue('本站资料库保存于当前浏览器，尚未连接可生成共享链接的云服务', 501, 'LOCAL_LIBRARY_CLOUD_SHARING_UNAVAILABLE');
      throw issue('此资料库服务操作尚未接通；原文件未更改', 501, 'LOCAL_LIBRARY_OPERATION_UNSUPPORTED');
    } catch (cause) { if (getAccountId() !== lastOwner) { dispose(); lastOwner = getAccountId(); } diagnostics.push({ type: 'local-library-error', method, path, code: cause?.code ?? cause?.name, status: cause?.status ?? 500 }); return failure(cause); }
  }
  return Object.freeze({ handle, dispose, ownsObjectURL, source: Object.freeze({ provider: LOCAL_LIBRARY_SOURCE, capturedAccountFiles: false, openaiCloud: false, rawFileListing: true, nativeNodeListing: true, localFolders: true, localFavorites: true, localTrash: true, permanentDelete: typeof files.permanentDeleteFile === 'function', rawBytesVerifiedBySHA256: true }) });
}