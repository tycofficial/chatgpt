/**
 * Site-local provider for the original Dot /tbo profile and appearance contracts.
 * No captured profiles, account entitlement, cloud computer or private endpoint.
 *
 * Locked source: 731863.bbf914bfbc.js imTH/TYK1/kzhd/oz6U/tsre/Yt5Q;
 * async/569087.5c1de81bf5.js o6Sz (PNG upload -> profile PATCH -> GET confirm).
 * hrUs -> GET /files/download/{file_id}: {status:'success',download_url}.
 */
export const LOCAL_DOT_SOURCE = 'site-local-dot-provider';
export const LOCAL_DOT_DEFAULT_APPEARANCE = Object.freeze({ avatar: 'sunglasses', color: 'pink' });
export const LOCAL_DOT_PUBLIC_DEFAULT_IMAGE = 'https://persistent.oaistatic.com/images/d75c9ceb8b1f60bc8d9b54e703bc5c256f2000716d29a1a3b9b6d18ff15658e6.png';
export const LOCAL_DOT_DEFAULT_IMAGE_URL = new URL('./dot-assets/default-dot.png', import.meta.url).href;
export const LOCAL_DOT_RESOURCE_BUNDLE = 'e37ccf13bacedcfe04cff3facf545ebc96c7c02173bbe813ec4d54d68dc79fed';
const PREFIX = 'site-local-dot:v1:';
const ASSET_PREFIX = 'site-local-dot-image:v1:';
const MAX_PNG = 2 * 1024 * 1024;
const ACCESSORIES = new Set(['sunglasses', 'bow-tie', 'balancing-ball', 'cowboy', 'beanie', 'mustache', 'pirate', 'feather', 'monocle', 'party-hat', 'bowler', 'headphones']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
const error = (message, status = 400, code = 'LOCAL_DOT_ERROR') => Object.assign(new Error(message), { status, code });
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function fail(cause) {
  const message = cause?.message || 'The local Dot operation failed';
  const code = cause?.code || 'LOCAL_DOT_ERROR';
  return json({ detail: { error_type: code.toLowerCase(), message }, error: { code, message }, adapter_source: LOCAL_DOT_SOURCE }, cause?.status || 500);
}
function safeText(value, name, limit = 200) {
  if (typeof value !== 'string' || value.includes('\0') || value.length > limit) throw error('Invalid ' + name);
  return value;
}
function appearance(value) {
  if (!object(value) || ![1, 2, 3].includes(value.schemaVersion)) throw error('Unsupported Dot appearance version');
  for (const key of ['shape', 'color', 'eyes', 'eyewear']) {
    const text = safeText(value[key], 'appearance ' + key, 63);
    if (new TextEncoder().encode(text).byteLength > 63) throw error('Appearance field exceeds the original 63-byte limit');
  }
  if (!Array.isArray(value.accessories) || value.accessories.length > 32) throw error('Invalid Dot accessories');
  for (const item of value.accessories) if (new TextEncoder().encode(safeText(item, 'accessory', 63)).byteLength > 63) throw error('Invalid Dot accessory');
  if (typeof value.depth !== 'number' || !Number.isFinite(value.depth)) throw error('Invalid Dot depth');
  if (value.studioShape != null && value.studioShape !== 'donut') throw error('Invalid Dot studio shape');
  if ((value.model != null && value.schemaVersion !== 2) || ((value.schemaVersion === 3) !== (value.hereCharacter != null))) throw error('Inconsistent Dot appearance version');
  if (JSON.stringify(value).length > 65536) throw error('Dot appearance is too large', 413);
  return copy(value);
}
function decodePath(path) {
  try { return path.split('/').map(decodeURIComponent); } catch { throw error('Invalid encoded path'); }
}
function pagination(rows, url, key = 'cursor') {
  const raw = url.searchParams.get(key);
  let start = 0;
  if (raw && raw !== 'null') {
    if (!/^local-dot:[0-9]+$/.test(raw)) throw error('Invalid local Dot cursor');
    start = Number(raw.slice(10));
    if (!Number.isSafeInteger(start) || start > rows.length) throw error('Invalid local Dot cursor');
  }
  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit == null ? 25 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw error('Limit must be an integer from 1 to 200');
  const end = Math.min(rows.length, start + limit);
  return { items: copy(rows.slice(start, end)), cursor: end < rows.length ? 'local-dot:' + end : null };
}
function encode64(bytes) {
  let binary = '';
  for (let at = 0; at < bytes.length; at += 32768) binary += String.fromCharCode(...bytes.subarray(at, at + 32768));
  return btoa(binary);
}
function decode64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function assertPng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || bytes.length > MAX_PNG || signature.some((part, index) => bytes[index] !== part)) throw error('A PNG image up to 2 MiB is required', 415);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8) !== 13 || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') throw error('Invalid PNG header', 415);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (width < 1 || height < 1 || width > 4096 || height > 4096) throw error('Invalid PNG dimensions', 415);
  return { width, height };
}

/**
 * Wire .handle(request, canonicalPath) before generic unavailable-service fallbacks.
 * appServer is the SAME LocalAppServer used by Work/Codex (no second history).
 * Storage must implement synchronous, atomic getItem/setItem (e.g. localStorage).
 */
export function createLocalDotAdapter({
  storage = globalThis.localStorage,
  appServer,
  getIdentity = () => null,
  isLocalSession = () => false,
  readSettings = () => ({}),
  getCapabilities = () => ({}),
  diagnostics = [],
  now = Date.now,
  uuid = () => crypto.randomUUID(),
  bootstrapDefault = true,
  validateAppearance,
  makeAssetURL,
} = {}) {
  const bootstraps = new Map();
  function diagnostic(kind, details = {}) {
    diagnostics.push({ type: 'local-dot', kind, at: now(), ...details });
  }
  function identity(required = true) {
    const supplied = getIdentity();
    const accountId = supplied?.accountId ?? supplied?.authenticatedAccountId;
    const userId = supplied?.userId ?? supplied?.authenticatedUserId;
    if (isLocalSession() !== true || typeof accountId !== 'string' || !accountId || typeof userId !== 'string' || !userId) {
      if (!required) return null;
      throw error('Sign in to this site to use local Dot profiles', 401, 'LOCAL_DOT_SIGN_IN_REQUIRED');
    }
    return { accountId, userId };
  }
  function assertIdentity(initial) {
    const current = identity();
    if (current.accountId !== initial.accountId || current.userId !== initial.userId) throw error('The active site account changed during this operation', 409, 'LOCAL_DOT_ACCOUNT_CHANGED');
  }
  const stateKey = session => PREFIX + encodeURIComponent(session.accountId) + ':' + encodeURIComponent(session.userId);
  const imageKey = (session, id) => ASSET_PREFIX + encodeURIComponent(session.accountId) + ':' + encodeURIComponent(session.userId) + ':' + id;
  function readJSON(key, fallback) {
    let raw;
    try { raw = storage.getItem(key); } catch { throw error('Local Dot storage is unavailable', 503, 'LOCAL_DOT_STORAGE_UNAVAILABLE'); }
    if (raw == null) return fallback();
    try { return JSON.parse(raw); } catch { throw error('Local Dot storage is damaged; existing bytes were preserved', 500, 'LOCAL_DOT_STORAGE_DAMAGED'); }
  }
  function state(session) {
    const result = readJSON(stateKey(session), () => ({ version: 1, profiles: [], pins: [], primaryGeneration: 0 }));
    if (!object(result) || result.version !== 1 || !Array.isArray(result.profiles) || !Array.isArray(result.pins) || !Number.isSafeInteger(result.primaryGeneration)
      || result.profiles.some(row => !object(row) || typeof row.id !== 'string' || !Array.isArray(row.thread_ids))) throw error('Local Dot storage has an unsupported format; existing bytes were preserved', 500, 'LOCAL_DOT_STORAGE_DAMAGED');
    return result;
  }
  function writeJSON(key, value, session) {
    assertIdentity(session);
    try { storage.setItem(key, JSON.stringify(value)); } catch { throw error('Local Dot changes could not be saved', 507, 'LOCAL_DOT_STORAGE_WRITE_FAILED'); }
  }
  const save = (session, value) => writeJSON(stateKey(session), value, session);
  function publicProfile(row) {
    const { thread_ids, ...profile } = row;
    return copy(profile);
  }
  function findProfile(data, id) {
    const row = data.profiles.find(profile => profile.id === id);
    if (!row) throw error('This local Dot does not exist for the active account', 404, 'LOCAL_DOT_NOT_FOUND');
    return row;
  }
  function pngRecord(session, id) {
    if (!/^local-dot-avatar-[A-Za-z0-9-]{1,100}$/.test(id)) throw error('This image is not a local Dot avatar', 404, 'LOCAL_DOT_IMAGE_NOT_FOUND');
    const record = readJSON(imageKey(session, id), () => null);
    if (!object(record) || record.version !== 1 || record.mime_type !== 'image/png' || typeof record.base64 !== 'string') throw error('This local Dot image does not exist for the active account', 404, 'LOCAL_DOT_IMAGE_NOT_FOUND');
    return record;
  }
  function validateSnapshot(session, value) {
    if (!object(value) || value.schema_version !== 1 || typeof value.asset_pointer !== 'string' || !value.asset_pointer.startsWith('file-service://')) throw error('Invalid Dot avatar snapshot');
    const id = value.asset_pointer.slice('file-service://'.length);
    pngRecord(session, id);
    return { schema_version: 1, asset_pointer: value.asset_pointer };
  }
  function validateManifest(session, type, manifest) {
    if (!object(manifest)) throw error('An avatar manifest is required');
    if (type === 'rendered-interactive') {
      if (manifest.schema_version !== 1 || typeof manifest.resource_bundle_id !== 'string' || !/^[0-9a-f]{64}$/.test(manifest.resource_bundle_id)) throw error('Invalid Dot resource bundle manifest');
      const parsed = appearance(manifest.appearance);
      if (typeof validateAppearance === 'function') {
        const checked = validateAppearance(copy(parsed));
        if (checked === false || checked?.success === false) throw error('The original Dot appearance schema rejected this avatar');
      }
      return { ...copy(manifest), appearance: parsed, snapshot: validateSnapshot(session, manifest.snapshot) };
    }
    if (type === 'codex-pet') {
      safeText(manifest.pet_id, 'public pet identifier', 200);
      return { pet_id: manifest.pet_id, snapshot: validateSnapshot(session, manifest.snapshot) };
    }
    if (type === 'default') return copy(manifest);
    throw error('Unsupported local Dot avatar type', 422, 'LOCAL_DOT_AVATAR_UNSUPPORTED');
  }
  async function createProfile(session, fields = {}, initialData) {
    if (!appServer || typeof appServer.dispatch !== 'function') throw error('The real local conversation server is unavailable', 503, 'LOCAL_DOT_EXECUTOR_UNAVAILABLE');
    if (fields.scope != null && fields.scope !== 'personal') throw error('Shared cloud Dot profiles are unavailable from this local provider', 501, 'LOCAL_DOT_SHARED_UNAVAILABLE');
    const name = fields.display_name == null ? 'Dot' : safeText(fields.display_name, 'Dot name', 100).trim();
    if (!name) throw error('Dot name is required');
    const description = fields.description == null ? '' : safeText(fields.description, 'Dot description', 4000);
    const avatar = fields.avatar == null ? 'sunglasses' : fields.avatar;
    if (!ACCESSORIES.has(avatar)) throw error('Unknown original Dot accessory');
    const requestedAvatarType = fields.avatar_type ?? 'default';
    const requestedManifest = requestedAvatarType === 'default' ? null : validateManifest(session, requestedAvatarType, fields.avatar_manifest);
    const result = appServer.dispatch('thread/start', {
      model: readSettings()?.model,
      conversationOrigin: 'dot',
      responsesapiClientMetadata: { conversationOrigin: 'dot', localDotProvider: true },
    });
    if (!object(result?.result?.thread) || typeof result.result.thread.id !== 'string') throw error('The local server did not create a real Dot conversation', 502, 'LOCAL_DOT_THREAD_CREATE_FAILED');
    const threadId = result.result.thread.id;
    const data = initialData ?? state(session);
    const primary = !data.profiles.some(row => row.is_primary);
    const timestamp = new Date(now()).toISOString();
    const row = {
      id: 'local-dot-' + uuid(), display_name: name, description, aeon_kind: 'orbit',
      scope: 'personal', status: 'active', is_primary: primary,
      root_thread_id: threadId, active_root_thread_id: threadId, thread_ids: [threadId],
      avatar, avatar_id: avatar, avatar_type: 'default', avatar_url: LOCAL_DOT_DEFAULT_IMAGE_URL,
      avatar_manifest: { schema_version: 1, tint: LOCAL_DOT_DEFAULT_APPEARANCE.color },
      created_at: timestamp, updated_at: timestamp,
      adapter_source: LOCAL_DOT_SOURCE,
      local_capabilities: { ...copy(getCapabilities() || {}), cloudComputer: false, cloudRooms: false },
    };
    if (fields.avatar_type != null && fields.avatar_type !== 'default') {
      row.avatar_type = fields.avatar_type;
      row.avatar_manifest = requestedManifest;
      row.avatar_url = null;
    }
    data.profiles.push(row);
    if (primary) data.primaryGeneration += 1;
    try { save(session, data); }
    catch (cause) {
      // No success notification until both actual thread and profile were stored.
      if (appServer.threads instanceof Map && appServer.threads.has(threadId)) {
        appServer.threads.delete(threadId);
        try { appServer.persist(); } catch { diagnostic('thread-rollback-storage-error'); }
      } else diagnostic('unreferenced-thread-after-storage-error', { threadId });
      throw cause;
    }
    result.afterReply?.();
    diagnostic('profile-created', { profileId: row.id });
    return publicProfile(row);
  }
  async function ensureDefault(session) {
    if (!bootstrapDefault || state(session).profiles.length) return;
    const key = stateKey(session);
    let pending = bootstraps.get(key);
    if (!pending) {
      pending = createProfile(session, {}, state(session));
      bootstraps.set(key, pending);
      pending.finally(() => { if (bootstraps.get(key) === pending) bootstraps.delete(key); }).catch(() => {});
    }
    await pending;
  }
  function assetURL(request, path, id) {
    if (typeof makeAssetURL === 'function') return makeAssetURL(id, request);
    const incoming = new URL(request.url);
    const prefix = incoming.pathname.endsWith(path) ? incoming.pathname.slice(0, -path.length) : '';
    return new URL(prefix + '/local-dot/assets/' + encodeURIComponent(id), incoming.origin).href;
  }
  async function body(request) {
    try {
      const result = await request.json();
      if (!object(result)) throw error('A JSON object is required');
      return result;
    } catch (cause) { if (cause.status) throw cause; throw error('Invalid JSON body'); }
  }
  async function handle(request, canonicalPath) {
    const url = new URL(request.url), path = canonicalPath ?? url.pathname;
    const relevant = path === '/tbo' || path.startsWith('/tbo/') || path.startsWith('/cloud-aeons/avatar-snapshots')
      || path.startsWith('/local-dot/assets/') || path.startsWith('/files/download/local-dot-avatar-')
      || path === '/pins' || path.startsWith('/pins/feature/');
    if (!relevant) return null;
    try {
      const session = identity();
      const method = request.method.toUpperCase();
      const parts = decodePath(path);
      request.signal?.throwIfAborted();
      if (path === '/cloud-aeons/avatar-snapshots' && method === 'POST') {
        let form;
        try { form = await request.formData(); } catch { throw error('A multipart PNG upload is required', 415); }
        const file = form.get('file');
        if (!file || typeof file.arrayBuffer !== 'function' || (file.type && file.type !== 'image/png')) throw error('The original avatar PNG file field is required', 415);
        if (file.size > MAX_PNG) throw error('Dot PNG is too large', 413);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const dimensions = assertPng(bytes);
        const rawManifest = form.get('avatar_manifest');
        let manifest = null;
        if (rawManifest != null) {
          if (typeof rawManifest !== 'string' || rawManifest.length > 131072) throw error('Invalid avatar manifest');
          try { manifest = JSON.parse(rawManifest); } catch { throw error('Invalid avatar manifest JSON'); }
          if (manifest.schema_version !== 1 || typeof manifest.resource_bundle_id !== 'string') throw error('Invalid avatar manifest');
          appearance(manifest.appearance);
        }
        request.signal?.throwIfAborted();
        const id = 'local-dot-avatar-' + uuid();
        writeJSON(imageKey(session, id), { version: 1, mime_type: 'image/png', base64: encode64(bytes), ...dimensions, created_at: new Date(now()).toISOString(), manifest }, session);
        return json({ snapshot: { schema_version: 1, asset_pointer: 'file-service://' + id } });
      }
      if (path.startsWith('/local-dot/assets/') && method === 'GET') {
        const record = pngRecord(session, parts[3]);
        return new Response(decode64(record.base64), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
      }
      if (path.startsWith('/files/download/local-dot-avatar-') && method === 'GET') {
        const id = parts[3];
        pngRecord(session, id);
        return json({ status: 'success', download_url: assetURL(request, path, id) });
      }
      if (path === '/pins' && method === 'GET') {
        const pins = state(session).pins;
        const filter = url.searchParams.get('item_type');
        return json(copy(filter ? pins.filter(pin => pin.item_type === filter) : pins));
      }
      if (parts[1] === 'pins' && parts[2] === 'feature' && parts.length === 4) {
        const id = safeText(parts[3], 'feature pin id', 100);
        if (!/^[A-Za-z0-9_-]+$/.test(id)) throw error('Invalid feature pin id');
        const data = state(session);
        const previous = data.pins.find(pin => pin.item_type === 'feature' && pin.item.id === id);
        if (method === 'POST') {
          const pin = previous ?? { item_type: 'feature', item: { id }, pinned_at: new Date(now()).toISOString() };
          if (!previous) { data.pins.push(pin); save(session, data); }
          return json(copy(pin));
        }
        if (method === 'DELETE') {
          data.pins = data.pins.filter(pin => pin !== previous);
          save(session, data);
          return new Response(null, { status: 204 });
        }
      }
      if (path === '/tbo/name/validate' && method === 'POST') {
        const supplied = await body(request);
        const name = safeText(supplied.name, 'Dot name', 100);
        if (!name.trim() || /[\u0000-\u001f\u007f]/.test(name)) throw error('A nonempty local Dot name without control characters is required');
        assertIdentity(session);
        return json({ name, validation_scope: 'site-local-format', provider_moderation: false, adapter_source: LOCAL_DOT_SOURCE });
      }
      if (path === '/tbo' && method === 'GET') {
        await ensureDefault(session);
        assertIdentity(session);
        return json(pagination(state(session).profiles.map(publicProfile), url));
      }
      if (path === '/tbo' && method === 'POST') return json(await createProfile(session, await body(request)));
      if (path === '/tbo/primary') {
        const data = state(session);
        if (method === 'PUT') {
          const supplied = await body(request);
          const selected = findProfile(data, supplied.tbo_id);
          for (const row of data.profiles) row.is_primary = row === selected;
          data.primaryGeneration += 1;
          save(session, data);
          return json({ selection: { available: true, aeon_id: selected.id }, profile: publicProfile(selected) });
        }
        if (method === 'DELETE') {
          const generation = url.searchParams.get('generation');
          // The original generation is a provider token, not this local store's counter.
          // No cloud generation token is fabricated or compared to unrelated local state.
          if (generation != null && generation.length > 200) throw error('Invalid generation token');
          for (const row of data.profiles) row.is_primary = false;
          data.primaryGeneration += 1;
          save(session, data);
          return new Response(null, { status: 204 });
        }
      }
      if (parts[1] === 'tbo' && parts[2] === 'by-thread' && parts.length === 4 && method === 'GET') {
        const row = state(session).profiles.find(profile => profile.thread_ids.includes(parts[3]));
        if (!row) throw error('No local Dot owns this thread', 404, 'LOCAL_DOT_NOT_FOUND');
        return json(publicProfile(row));
      }
      if (parts[1] === 'tbo' && parts.length >= 3) {
        const data = state(session), row = findProfile(data, parts[2]);
        if (parts.length === 3) {
          if (method === 'GET') return json(publicProfile(row));
          if (method === 'PATCH') {
            const patch = await body(request);
            const supported = new Set(['display_name', 'description', 'avatar', 'avatar_id', 'avatar_type', 'avatar_manifest', 'avatar_url', 'only_if_default_avatar']);
            if (Object.keys(patch).some(key => !supported.has(key))) throw error('This Dot profile field is unavailable from the local provider', 422);
            if (own(patch, 'display_name')) {
              row.display_name = safeText(patch.display_name, 'Dot name', 100).trim();
              if (!row.display_name) throw error('Dot name is required');
            }
            if (own(patch, 'description')) row.description = safeText(patch.description, 'Dot description', 4000);
            const changeAvatar = !patch.only_if_default_avatar || row.avatar_type === 'default';
            if (changeAvatar && own(patch, 'avatar')) {
              if (!ACCESSORIES.has(patch.avatar)) throw error('Unknown original Dot accessory');
              row.avatar = patch.avatar; row.avatar_id = patch.avatar; row.avatar_type = 'default';
              row.avatar_manifest = { schema_version: 1, tint: LOCAL_DOT_DEFAULT_APPEARANCE.color };
              row.avatar_url = LOCAL_DOT_DEFAULT_IMAGE_URL;
            }
            if (changeAvatar && (own(patch, 'avatar_type') || own(patch, 'avatar_manifest'))) {
              const type = patch.avatar_type ?? row.avatar_type;
              row.avatar_manifest = validateManifest(session, type, patch.avatar_manifest ?? row.avatar_manifest);
              row.avatar_type = type;
              row.avatar_url = null;
            }
            if (own(patch, 'avatar_url') && patch.avatar_url != null) {
              // Persisted snapshots are resolved locally; no arbitrary remote image fetch.
              const snapshot = validateSnapshot(session, row.avatar_manifest?.snapshot);
              if (patch.avatar_url !== snapshot.asset_pointer) throw error('Only the saved local avatar pointer is accepted');
            }
            row.updated_at = new Date(now()).toISOString();
            save(session, data);
            return json(publicProfile(row));
          }
          if (method === 'DELETE') {
            const expected = url.searchParams.get('thread_id');
            if (expected && expected !== row.active_root_thread_id) throw error('The local Dot root thread changed', 409);
            data.profiles = data.profiles.filter(profile => profile !== row);
            data.primaryGeneration += 1;
            save(session, data);
            // Conversation history remains owned by the shared real app server.
            return new Response(null, { status: 204 });
          }
        }
        if (parts.length === 4 && method === 'GET' && parts[3] === 'root-thread') return json(row.active_root_thread_id);
        if (parts.length === 4 && method === 'GET' && parts[3] === 'threads') {
          const rows = row.thread_ids.map(id => {
            let thread;
            try { thread = appServer?.getThread?.(id); } catch {}
            return { thread_id: id, title: thread?.name ?? '', created_at: thread?.createdAt ?? null, updated_at: thread?.updatedAt ?? null };
          });
          return json(pagination(rows, url));
        }
        if (parts.length === 4 && method === 'GET' && parts[3] === 'computers') return json({ thread_id: row.active_root_thread_id, computers: [] });

      }
      throw error('This Dot operation needs a service that is not provided locally', 501, 'LOCAL_DOT_SERVICE_UNAVAILABLE');
    } catch (cause) {
      diagnostic('request-error', { path, code: cause?.code ?? 'LOCAL_DOT_ERROR', status: cause?.status ?? 500 });
      return fail(cause);
    }
  }
  function getLocalDotPolicy() {
    const session = identity(false);
    return {
      isLoading: false, isError: false,
      isCapable: session != null && typeof appServer?.dispatch === 'function',
      adapter_source: LOCAL_DOT_SOURCE, openai_cloud_entitlement: false,
    };
  }
  /** Original jiwy c/f are capability atoms; a/d are boolean/null atoms. */
  function adaptCapabilityAtoms(original, requireOriginal) {
    const derive = requireOriginal('BolX').c, scope = requireOriginal('OWtl').a;
    const inputs = requireOriginal('Cslg').m;
    const capable = derive(scope, ({ get }) => {
      const originalValue = get(original.c);
      if (isLocalSession() !== true) return originalValue;
      const auth = get(inputs);
      const authenticated = auth?.authenticatedAccountId != null && auth?.authenticatedUserId != null;
      if (auth?.authLoading || auth?.accountLoading) return { ...originalValue, isLoading: true, isCapable: false, adapter_source: LOCAL_DOT_SOURCE };
      const localIdentity = identity(false);
      if (!authenticated || !localIdentity || auth.authenticatedAccountId !== localIdentity.accountId || auth.authenticatedUserId !== localIdentity.userId) return { ...originalValue, isLoading: false, isCapable: false, adapter_source: LOCAL_DOT_SOURCE };
      return { ...originalValue, ...getLocalDotPolicy(), retainNavigation: false, unresolved: false };
    });
    const available = derive(scope, ({ get }) => get(capable).isCapable);
    return {
      a: available, c: capable, d: available, f: capable,
      b: (stateScope, accountId) => {
        const session = identity(false);
        return isLocalSession() === true && session?.accountId === accountId ? getLocalDotPolicy().isCapable : original.b(stateScope, accountId);
      },
      i: stateScope => {
        if (isLocalSession() === true) {
          if (!getLocalDotPolicy().isCapable) throw error('The local Dot provider is unavailable', 503);
          return;
        }
        return original.i(stateScope);
      },
    };
  }
  return { handle, getLocalDotPolicy, adaptCapabilityAtoms, provenance: Object.freeze({ provider: LOCAL_DOT_SOURCE, profileNamespace: '/tbo', cloudComputer: false, defaultAppearance: LOCAL_DOT_DEFAULT_APPEARANCE }) };
}
