/**
 * Read boundary for the original MapsPage, never a vendor/business database.
 *
 * Original: hC2y /maps/:entityId? -> mjCR.Qb -> ic58.a ->
 * async/40409.e01ea662d1.js jeQp.MapsPage.
 * Its home query directly uses nearby_entities.flatMap,
 * personalized_prompts.map and map_center.latitude/longitude.
 *
 * No captured location, geolocation request, fake business, recommendation,
 * external geocoder, translation or provider credential is used here.
 */
export const LOCAL_MAPS_SOURCE = 'site-local-map-records';
export const LOCAL_MAPS_WORLD_CENTER = Object.freeze({ latitude: 0, longitude: 0 });
const ENTITY_ID = /^lbe1_[A-Za-z0-9_-]{24}$/;
const PREFIX = 'site-local-map-records:v1:';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
const fault = (message, status = 400, code = 'LOCAL_MAP_ERROR') => Object.assign(new Error(message), { status, code });
function response(value, status = 200, headers) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers,
  } });
}
function fail(cause) {
  const message = cause?.message || 'The local map operation failed';
  const code = cause?.code || 'LOCAL_MAP_ERROR';
  return response({ detail: { error_type: code.toLowerCase(), message }, error: { code, message }, adapter_source: LOCAL_MAPS_SOURCE }, cause?.status || 500);
}
function center(value) {
  if (!object(value) || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)
    || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) throw fault('A valid explicit map center is required');
  return { latitude: value.latitude, longitude: value.longitude };
}
function entity(value) {
  if (!object(value) || !ENTITY_ID.test(value.entity_id) || !object(value.business)
    || value.business.id !== value.entity_id
    || (value.business.entity_lookup_id != null && value.business.entity_lookup_id !== value.entity_id)) {
    throw fault('Map entity identity must match its original local lookup ID', 422, 'LOCAL_MAP_ENTITY_IDENTITY_MISMATCH');
  }
  if (typeof value.business.name !== 'string' || !value.business.name.trim() || value.business.name.length > 500) throw fault('A real supplied entity name is required');
  if ((value.business.latitude != null && (!Number.isFinite(value.business.latitude) || Math.abs(value.business.latitude) > 90))
    || (value.business.longitude != null && (!Number.isFinite(value.business.longitude) || Math.abs(value.business.longitude) > 180))) throw fault('Invalid supplied entity coordinates');
  if (JSON.stringify(value).length > 262144) throw fault('The local map record is too large', 413);
  // Preserve actual supplied facts; never synthesize a rating, address or photo.
  return { entity_id: value.entity_id, business: copy(value.business) };
}

/**
 * .handle(request, canonicalPath) -> Response|null.
 * readEntity may be an explicitly attached real provider; null means unknown.
 * saveEntityRecord is a host-only local storage method, not an invented HTTP API.
 */
export function createLocalMapsService({
  storage = globalThis.localStorage,
  getAccountId = () => null,
  readEntity,
  diagnostics = [],
  now = Date.now,
} = {}) {
  const account = required => {
    const id = getAccountId();
    if (typeof id === 'string' && id) return id;
    if (required) throw fault('Sign in to this site to save map records', 401, 'LOCAL_MAP_SIGN_IN_REQUIRED');
    return null;
  };
  const key = id => PREFIX + encodeURIComponent(id);
  function readState(id) {
    if (id == null) return { version: 1, center: null, entities: {} };
    let raw;
    try {
      if (typeof storage?.getItem !== 'function') throw Error('Persistent storage unavailable');
      raw = storage.getItem(key(id));
    } catch { throw fault('Local map storage is unavailable', 503, 'LOCAL_MAP_STORAGE_UNAVAILABLE'); }
    if (raw == null) return { version: 1, center: null, entities: {} };
    let state;
    try { state = JSON.parse(raw); } catch { throw fault('Local map records are damaged; existing bytes were preserved', 500, 'LOCAL_MAP_STORAGE_DAMAGED'); }
    if (!object(state) || state.version !== 1 || !object(state.entities)) throw fault('Unsupported local map record format; existing bytes were preserved', 500, 'LOCAL_MAP_STORAGE_DAMAGED');
    if (state.center != null) {
      try { center(state.center); } catch { throw fault('Local map center is damaged; existing bytes were preserved', 500, 'LOCAL_MAP_STORAGE_DAMAGED'); }
    }
    for (const [id, record] of Object.entries(state.entities)) {
      if (id !== record?.entity_id) throw fault('Local map identity index is damaged', 500, 'LOCAL_MAP_STORAGE_DAMAGED');
      try { entity(record); } catch { throw fault('Local map record identity is damaged', 500, 'LOCAL_MAP_STORAGE_DAMAGED'); }
    }
    return state;
  }
  function saveState(id, state) {
    if (account(true) !== id) throw fault('The site account changed during this map operation', 409, 'LOCAL_MAP_ACCOUNT_CHANGED');
    try {
      if (typeof storage?.setItem !== 'function') throw Error('Persistent storage unavailable');
      storage.setItem(key(id), JSON.stringify(state));
    } catch { throw fault('Local map changes could not be saved', 507, 'LOCAL_MAP_STORAGE_WRITE_FAILED'); }
  }
  function provenance(value) {
    if (!object(value) || !['user-created', 'public-provider', 'local-tool'].includes(value.kind)
      || typeof value.source !== 'string' || !value.source.trim() || value.source.length > 2000) throw fault('The real supplied local entity source is required', 422, 'LOCAL_MAP_ENTITY_SOURCE_REQUIRED');
    return copy(value);
  }
  function saveEntityRecord(value, actualSource) {
    const id = account(true), record = entity(value), suppliedSource = provenance(actualSource), state = readState(id);
    state.entities[record.entity_id] = { ...record, adapter_source: LOCAL_MAPS_SOURCE, local_provenance: suppliedSource, saved_at: new Date(now()).toISOString() };
    saveState(id, state);
    return copy(state.entities[record.entity_id]);
  }
  function removeEntityRecord(entityId) {
    const id = account(true), state = readState(id);
    if (!ENTITY_ID.test(entityId)) throw fault('Invalid map entity ID');
    const existed = Object.hasOwn(state.entities, entityId);
    delete state.entities[entityId];
    saveState(id, state);
    return existed;
  }
  function setMapCenter(explicitCenter) {
    const id = account(true), state = readState(id);
    state.center = center(explicitCenter);
    saveState(id, state);
    return copy(state.center);
  }
  async function handle(request, canonicalPath) {
    const url = new URL(request.url);
    const path = (canonicalPath ?? url.pathname).replace(/^\/(?:backend-api|__codex-api)(?=\/)/, '').replace(/\/+$/, '') || '/';
    if (path !== '/local/home' && !path.startsWith('/local/entities/')) return null;
    try {
      const method = request.method.toUpperCase();
      if (method !== 'GET') return response({ detail: 'Method Not Allowed', adapter_source: LOCAL_MAPS_SOURCE }, 405, { Allow: 'GET' });
      const id = account(false);
      request.signal?.throwIfAborted();
      if (path === '/local/home') {
        const state = readState(id);
        return response({
          nearby_entities: [], personalized_prompts: [],
          map_center: copy(state.center ?? LOCAL_MAPS_WORLD_CENTER),
          adapter_source: LOCAL_MAPS_SOURCE,
          recommendation_source: 'no-local-recommendations',
          geographic_search_available: false,
        });
      }
      let entityId;
      try { entityId = decodeURIComponent(path.slice('/local/entities/'.length)); } catch {}
      if (!ENTITY_ID.test(entityId ?? '')) throw fault('This local map entity was not found', 404, 'LOCAL_MAP_ENTITY_NOT_FOUND');
      const stored = id == null ? null : readState(id).entities[entityId];
      if (stored) return response(copy(stored));
      // No header can impersonate another site account. Unknown lookups remain
      // 404 unless a real explicitly injected read provider returns this entity.
      let supplied = null;
      if (id != null && typeof readEntity === 'function') {
        supplied = await readEntity(entityId, { accountId: id, signal: request.signal });
        request.signal?.throwIfAborted();
        if (account(false) !== id) throw fault('The site account changed during map lookup', 409, 'LOCAL_MAP_ACCOUNT_CHANGED');
      }
      if (supplied == null) throw fault('This local map entity was not found', 404, 'LOCAL_MAP_ENTITY_NOT_FOUND');
      let parsed;
      try { parsed = entity(supplied); } catch { throw fault('The attached map provider returned a different or invalid entity', 502, 'LOCAL_MAP_PROVIDER_IDENTITY_MISMATCH'); }
      if (parsed.entity_id !== entityId) throw fault('The attached map provider returned a different entity', 502, 'LOCAL_MAP_PROVIDER_IDENTITY_MISMATCH');
      return response({ ...parsed, adapter_source: LOCAL_MAPS_SOURCE, local_provenance: { kind: 'attached-provider' } });
    } catch (cause) {
      diagnostics.push({ type: 'local-map-service', path, status: cause?.status ?? 500, code: cause?.code ?? 'LOCAL_MAP_ERROR' });
      return fail(cause);
    }
  }
  return Object.freeze({
    handle, saveEntityRecord, removeEntityRecord, setMapCenter,
    source: Object.freeze({ provider: LOCAL_MAPS_SOURCE, capturedLocationUsed: false, syntheticBusinesses: false, geocoderConnected: false }),
  });
}
