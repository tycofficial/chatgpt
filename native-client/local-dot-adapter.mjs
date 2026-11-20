/**
 * Site-local provider for the original Dot /tbo profile and appearance contracts.
 * No captured profiles, account entitlement, cloud computer or private endpoint.
 *
 * Locked source: 731863.bbf914bfbc.js imTH/TYK1/kzhd/oz6U/tsre/Yt5Q;
 * async/569087.5c1de81bf5.js o6Sz (PNG upload -> profile PATCH -> GET confirm).
 * hrUs -> GET /files/download/{file_id}: {status:'success',download_url}.
 */
import { createProviderCompletionRouter } from './provider-routing.mjs?v=39c29eae31156e71';

export const LOCAL_DOT_SOURCE = 'site-local-dot-provider';
export const LOCAL_DOT_DEFAULT_APPEARANCE = Object.freeze({ avatar: 'sunglasses', color: 'pink' });
export const LOCAL_DOT_PUBLIC_DEFAULT_IMAGE = 'https://persistent.oaistatic.com/images/d75c9ceb8b1f60bc8d9b54e703bc5c256f2000716d29a1a3b9b6d18ff15658e6.png';
export const LOCAL_DOT_DEFAULT_IMAGE_URL = new URL('./dot-assets/default-dot.png', import.meta.url).href;
export const LOCAL_DOT_RESOURCE_BUNDLE = 'e37ccf13bacedcfe04cff3facf545ebc96c7c02173bbe813ec4d54d68dc79fed';
const PREFIX = 'site-local-dot:v1:';
const ASSET_PREFIX = 'site-local-dot-image:v1:';
const MAX_PNG = 2 * 1024 * 1024;
const ACCESSORIES = new Set(['sunglasses', 'bow-tie', 'balancing-ball', 'cowboy', 'beanie', 'mustache', 'pirate', 'feather', 'monocle', 'party-hat', 'bowler', 'headphones']);
const dotDefault = Object.freeze({ model: 'gpt-6.1-terra', effort: 'medium', providerId: 'openclawplan', providerOrigin: 'https://api.openclawplan.com' });
const dotComplex = Object.freeze({ model: 'gpt-6-astra', effort: 'high', providerId: 'docode', providerOrigin: 'https://docode.cc' });
const dotRoutes = [dotDefault, dotComplex];
const dotSelectionMethods = new Set(['thread/resume', 'thread/settings/update', 'turn/start', 'turn/addUserMessage']);
const complexDotPrompt = /\b(?:use (?:gpt-6[- ]?)?astra|deep (?:analysis|research)|multi[- ]step|rigorous proof|prove that|root cause analysis|architecture trade-?offs)\b|(?:切换至|切换到|使用)\s*(?:gpt-6[- ]?)?astra\b|深入(?:分析|研究|评估)|深度(?:分析|研究)|严格证明|推导|复杂(?:难题|问题|分析)|根因分析|多步(?:分析|推理)|架构权衡/iu;

export function selectLocalDotModel(input) {
  const prompt = Array.isArray(input) ? input.filter(item => item?.type === 'text' && typeof item.text === 'string').map(item => item.text).join('\n').trim() : '';
  return prompt.length >= 1200 || complexDotPrompt.test(prompt) ? dotComplex : dotDefault;
}

/** Dot uses the same Responses decoder, exact-model admission and request checkpoints as other surfaces. */
export function createLocalDotCompletion({ complete, getProviders, siteOrigin, fetchDirectModels }) {
  const site = new URL(siteOrigin);
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new TypeError('Dot requires the configured HTTPS site service origin');
  }
  if (typeof getProviders !== 'function') throw new TypeError('A configured Dot provider reader is required');
  let directTerra = false, probe = null, probeExpiresAt = 0;
  function configuredProvider(route, configured) {
    const provider = configured?.find(candidate => candidate.id === route.providerId);
    if (!provider?.supportedModels?.includes(route.model) || !provider.apiKey) return null;
    let upstream;
    try { upstream = new URL(provider.apiBase); } catch { return null; }
    return upstream.origin === route.providerOrigin && !upstream.username && !upstream.password &&
      !upstream.search && !upstream.hash ? provider : null;
  }
  function prepare() {
    if (!fetchDirectModels) return false;
    if (probe && Date.now() < probeExpiresAt) return probe;
    const provider = configuredProvider(dotDefault, getProviders());
    if (!provider) return false;
    probeExpiresAt = Date.now() + 300000;
    // Select a route before submitting the prompt, so a lost response cannot bill a second turn.
    probe = Promise.resolve().then(() => fetchDirectModels(new URL('/v1/models', dotDefault.providerOrigin), {
      headers: { Authorization: 'Bearer ' + provider.apiKey }, credentials: 'omit',
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3500),
    })).then(response => {
      if (response.body) void response.body.cancel().catch(() => {});
      return response.ok;
    }).catch(() => false).then(reachable => {
      directTerra = reachable;
      if (!reachable) probeExpiresAt = Date.now() + 60000;
      return reachable;
    });
    return probe;
  }
  const router = createProviderCompletionRouter({
    complete,
    getProviders: () => {
      const configured = getProviders();
      return dotRoutes.flatMap(route => {
        const provider = configuredProvider(route, configured);
        if (!provider) return [];
        return [{
          id: route.providerId,
          apiBase: route === dotDefault && directTerra ? dotDefault.providerOrigin + '/v1' :
            new URL('/api-proxy/' + route.providerId + '/v1', site).href,
          apiKey: provider.apiKey,
          supportedModels: [route.model],
          responsesModels: [route.model],
        }];
      });
    },
  });
  const run = async options => {
    const model = options.settings?.model, effort = options.settings?.reasoningEffort;
    const route = dotRoutes.find(candidate => candidate.model === model && candidate.effort === effort);
    if (!route || options.settings?.reasoningMode === 'pro') throw error('请选择新消息以使用本站 Dot 支持的模型。', 422, 'LOCAL_DOT_MODEL_UNSUPPORTED');
    if (route === dotDefault) await prepare();
    const result = await router.complete({
      ...options,
      settings: { model, reasoningEffort: effort, reasoningMode: 'standard', apiTransport: 'responses' },
      responsesTransport: undefined,
    });
    if (typeof result.model !== 'string' || result.model !== model && !result.model.startsWith(model + '-') ||
        result.actual_reasoning?.effort !== effort) {
      throw Object.assign(error('服务商未确认 Dot 选用的模型或思考等级。', 502, 'LOCAL_DOT_MODEL_UNVERIFIED'), { retryable: false });
    }
    return { ...result, adapter_execution: { model: result.model, providerId: route.providerId, reasoningEffort: effort } };
  };
  run.prepare = prepare;
  return run;
}

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = value => structuredClone(value);
const error = (message, status = 400, code = 'LOCAL_DOT_ERROR') => Object.assign(new Error(message), { status, code });
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function fail(cause) {
  const message = cause?.status && cause.message ? cause.message : '本站暂时无法完成 Dot 操作。请重试。';
  const code = typeof cause?.code === 'string' ? cause.code : 'LOCAL_DOT_ERROR';
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
  hasDotAccess = () => true,
  siteAccountsOnly = false,
  complete: completeDotTurn,
  getCapabilities = () => ({}),
  diagnostics = [],
  now = Date.now,
  uuid = () => crypto.randomUUID(),
  bootstrapDefault = true,
  validateAppearance,
  makeAssetURL,
} = {}) {
  const bootstraps = new Map();
  const roomMessageUpdates = new Set();
  const usesSitePolicy = () => siteAccountsOnly || isLocalSession() === true;
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
    if (hasDotAccess() !== true) {
      if (!required) return null;
      throw error('当前站内套餐不支持 Dot。', 403, 'LOCAL_DOT_PLAN_REQUIRED');
    }
    return { accountId, userId, accountUserId: supplied.accountUserId ?? userId, name: supplied.name ?? '' };
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
    const { thread_ids, room_reactions, ...profile } = row;
    const manifest = profile.avatar_manifest;
    if (profile.avatar_type === 'default' && ACCESSORIES.has(profile.avatar_id ?? profile.avatar)
      && manifest?.schema_version === 1 && manifest.tint === LOCAL_DOT_DEFAULT_APPEARANCE.color
      && Object.keys(manifest).length === 2) {
      profile.avatar_manifest = null;
      profile.avatar_url = null;
    }
    const snapshot = profile.avatar_manifest?.snapshot;
    if (profile.avatar_type === 'codex-pet' && profile.avatar_url == null && snapshot?.schema_version === 1
      && /^file-service:\/\/local-dot-avatar-[A-Za-z0-9-]{1,100}$/.test(snapshot.asset_pointer)) profile.avatar_url = snapshot.asset_pointer;
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
      model: dotDefault.model,
      effort: dotDefault.effort,
      executionSurface: 'work',
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
      avatar, avatar_id: avatar, avatar_type: 'default', avatar_url: null, avatar_manifest: null,
      created_at: timestamp, updated_at: timestamp,
      adapter_source: LOCAL_DOT_SOURCE,
      local_capabilities: { ...copy(getCapabilities() || {}), cloudComputer: false, cloudRooms: false },
    };
    if (fields.avatar_type != null && fields.avatar_type !== 'default') {
      row.avatar_type = fields.avatar_type;
      row.avatar_manifest = requestedManifest;
      row.avatar_url = row.avatar_type === 'codex-pet' ? requestedManifest.snapshot.asset_pointer : null;
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
  async function body(request) {
    try {
      const result = await request.json();
      if (!object(result)) throw error('A JSON object is required');
      return result;
    } catch (cause) { if (cause.status) throw cause; throw error('Invalid JSON body'); }
  }
  function ownedRoom(session, roomId) {
    const data = state(session);
    const row = data.profiles.find(profile => profile.messaging_room_id === roomId && profile.thread_ids.includes(roomId));
    const thread = row && appServer?.threads?.get(roomId);
    if (thread?.adapterMetadata?.conversationOrigin !== 'dot') throw error('此 Dot 会话暂不可用。', 404, 'LOCAL_DOT_ROOM_NOT_FOUND');
    return { data, row, thread };
  }
  function timestamp(seconds) {
    return new Date(seconds * 1000).toISOString();
  }
  const roomReplyId = turn => turn.adapterMetadata?.clientMetadata?.dotReplyMessageId ?? null;
  const roomReplyRoot = turn => turn.adapterMetadata?.clientMetadata?.dotReplyRootMessageId ?? roomReplyId(turn);
  function roomUserMessage(session, turn, item, replyTarget) {
    const created_at = timestamp(turn.startedAt);
    const replyId = roomReplyId(turn);
    return { id: item.id, role: 'user', account_user_id: session.accountUserId, created_at, updated_at: created_at,
      request_id: turn.clientUserMessageId, content: { text: item.content.filter(part => part.type === 'text').map(part => part.text).join('\n') },
      ...(replyId ? { reply_root_message_id: roomReplyRoot(turn), reply_to: { message_id: replyId, ...(replyTarget && { message: { ...replyTarget, reply_to: undefined } }) } } : {}),
    };
  }
  function roomAssistantMessages(turn) {
    if (turn.status !== 'completed' && turn.status !== 'failed') return [];
    const created_at = timestamp(turn.completedAt ?? turn.startedAt);
    const replyRoot = roomReplyRoot(turn), replyThread = replyRoot ? { reply_root_message_id: replyRoot } : {};
    if (turn.status === 'failed') return [{ id: turn.id, role: 'system', created_at, updated_at: created_at, ...replyThread,
      content: { type: 'text', text: 'Dot 暂时未能完成这条回复，请重试。' }, preview: 'Dot 暂时未能完成这条回复，请重试。' }];
    return turn.items.filter(item => item.type === 'agentMessage' && item.text).map(item => ({
      id: item.id, role: 'assistant', created_at, updated_at: created_at, ...replyThread, raw_messages: [{ id: item.id,
        author: { role: 'assistant' }, channel: 'final', content: { content_type: 'text', parts: [item.text] }, metadata: {} }],
    }));
  }
  function roomMessages(session, thread, row) {
    const messages = new Map();
    const reactions = row.room_reactions ?? {};
    function add(message) {
      const record = own(reactions, message.id) ? reactions[message.id] : undefined;
      if (record === undefined) { messages.set(message.id, message); return; }
      const reaction = typeof record === 'string' ? record : record?.reaction;
      const updatedAt = record?.updatedAt ?? message.updated_at;
      messages.set(message.id, { ...message, updated_at: updatedAt, reactions: reaction ? { [session.accountUserId]: reaction } : {} });
    }
    for (const turn of thread.turns) {
      const target = messages.get(roomReplyId(turn));
      for (const item of turn.items) {
        if (item.type === 'userMessage') add(roomUserMessage(session, turn, item, target));
      }
      for (const message of roomAssistantMessages(turn)) add(message);
    }
    return [...messages.values()];
  }
  function roomPage(messages, query) {
    const rawLimit = query.get('limit');
    const limit = rawLimit == null ? 20 : Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw error('Invalid Dot message page limit');
    const after = query.get('after'), before = query.get('before'), around = query.get('around');
    const cursor = around ?? after ?? before;
    const index = cursor == null ? messages.length : messages.findIndex(message => message.id === cursor);
    if (index < 0) throw error('This Dot message cursor was not found', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
    const start = around != null ? Math.max(0, Math.min(index - Math.floor(limit / 2), messages.length - limit))
      : after != null ? index + 1 : Math.max(0, index - limit);
    const end = after != null || around != null ? Math.min(messages.length, start + limit) : index;
    const items = messages.slice(start, end);
    return { items, prev_cursor: start > 0 ? items[0]?.id ?? null : null, next_cursor: end < messages.length ? items.at(-1)?.id ?? null : null };
  }
  function subscribeRoomMessages(listener) {
    const session = identity(false);
    if (!session || typeof appServer?.subscribe !== 'function') return () => {};
    function deliver(value) {
      const current = identity(false);
      if (current?.accountId !== session.accountId || current.userId !== session.userId) return;
      const roomId = value.payload.room_id;
      if (state(session).profiles.some(row => row.messaging_room_id === roomId && row.thread_ids.includes(roomId))) listener(value);
    }
    const unsubscribe = appServer.subscribe(event => {
      if (event.method !== 'turn/completed') return;
      const { threadId, turn } = event.params;
      for (const message of roomAssistantMessages(turn)) deliver({ type: 'calpico-message-add', payload: { room_id: threadId, message } });
    });
    roomMessageUpdates.add(deliver);
    return () => { roomMessageUpdates.delete(deliver); unsubscribe(); };
  }
  async function handle(request, canonicalPath) {
    const url = new URL(request.url), requestPath = canonicalPath ?? url.pathname;
    const nativePetUpdate = request.method === 'PATCH' && /^\/cloud-aeons\/local-dot-[A-Za-z0-9-]{1,100}$/.test(requestPath);
    const path = nativePetUpdate ? '/tbo' + requestPath.slice('/cloud-aeons'.length) : requestPath;
    const relevant = path === '/tbo' || path.startsWith('/tbo/') || path.startsWith('/cloud-aeons/avatar-snapshots')
      || path.startsWith('/local-dot/assets/') || path.startsWith('/files/download/local-dot-avatar-')
      || path === '/pins' || path.startsWith('/pins/feature/') || path.startsWith('/messaging/rooms/');
    if (!relevant) return null;
    try {
      const session = identity();
      const method = request.method.toUpperCase();
      const parts = decodePath(path);
      request.signal?.throwIfAborted();
      if (parts[1] === 'messaging' && parts[2] === 'rooms') {
        const id = parts[3], action = parts[4];
        if (parts.length === 4 && method === 'GET') {
          const { row, thread } = ownedRoom(session, id);
          const last_read_at = row.last_read_at ?? null;
          return json({ id, type: 'DM', app_source: 'chatgpt:messaging', aeon_id: row.id, name: row.display_name,
            dm_lifecycle_state: 'connected', created_at: row.created_at, updated_at: timestamp(thread.updatedAt), last_read_at,
            members: [{ account_user_id: session.accountUserId, name: session.name }, { account_user_id: row.id, aeon_id: row.id, name: row.display_name }],
            member_profile_snapshots: [], read_receipts: last_read_at ? [{ account_user_id: session.accountUserId, last_read_at }] : [],
            latest_messages: roomMessages(session, thread, row).slice(-20),
          });
        }
        if (parts.length === 5 && action === 'messages' && method === 'GET') {
          const { row, thread } = ownedRoom(session, id);
          const messages = roomMessages(session, thread, row), replyRoot = url.searchParams.get('reply_root_message_id');
          if (replyRoot != null && !messages.some(message => message.id === replyRoot)) throw error('找不到要回复的 Dot 消息。', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
          const scope = replyRoot == null ? messages : messages.filter(message => message.reply_root_message_id === replyRoot);
          return json(roomPage(scope, url.searchParams));
        }
        if (parts.length === 6 && action === 'journal' && parts[5] === 'eligibility' && method === 'GET') {
          ownedRoom(session, id);
          return json({ enabled: false });
        }
        if (parts.length === 7 && action === 'messages' && parts[6] === 'reactions' && ['POST', 'DELETE'].includes(method)) {
          ownedRoom(session, id);
          const supplied = method === 'POST' ? await body(request) : null;
          request.signal?.throwIfAborted();
          assertIdentity(session);
          const { data, row, thread } = ownedRoom(session, id), messageId = parts[5];
          const message = roomMessages(session, thread, row).find(item => item.id === messageId && item.role !== 'system');
          if (!message) throw error('找不到这条 Dot 消息。', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
          const reaction = supplied ? safeText(supplied.reaction, 'Dot reaction', 128).trim() : null;
          if (reaction === '') throw error('请选择一个表情。');
          if (reaction !== (message.reactions?.[session.accountUserId] ?? null)) {
            const updatedAt = new Date(Math.max(now(), Date.parse(message.updated_at) + 1)).toISOString();
            row.room_reactions = { ...row.room_reactions, [messageId]: { reaction, updatedAt } };
            save(session, data);
            const update = { type: 'calpico-message-update', payload: { room_id: id, message_id: messageId } };
            for (const deliver of roomMessageUpdates) {
              try { deliver(update); } catch { diagnostic('room-message-update-listener-error'); }
            }
          }
          return new Response(null, { status: 204 });
        }
        if (parts.length === 5 && method === 'POST') {
          ownedRoom(session, id);
          if (action === 'responding_heartbeat') return new Response(null, { status: 204 });
          if (action === 'messages' || action === 'read') {
            const supplied = await body(request);
            request.signal?.throwIfAborted();
            assertIdentity(session);
            const { row, data, thread } = ownedRoom(session, id);
            if (action === 'read') {
              const readAt = Date.parse(safeText(supplied.last_read_at, 'Dot read time', 50));
              if (!Number.isFinite(readAt)) throw error('Invalid Dot read time');
              if (!(Date.parse(row.last_read_at) >= readAt)) {
                row.last_read_at = new Date(readAt).toISOString();
                save(session, data);
              }
              return new Response(null, { status: 204 });
            }
            const text = safeText(supplied.content?.text, 'Dot message', 100000);
            const requestId = safeText(supplied.request_id, 'Dot request ID');
            if (!text.trim() || !requestId || (supplied.idempotency_token != null && supplied.idempotency_token !== requestId)) throw error('Invalid Dot message or request ID');
            if (supplied.content?.attachments?.length) throw error('当前 Dot 会话仅支持文字消息。', 422, 'LOCAL_DOT_FILES_UNAVAILABLE');
            const replyId = supplied.reply_to == null ? null : safeText(supplied.reply_to.message_id, 'Dot reply message ID');
            const replyTarget = replyId == null ? null : roomMessages(session, thread, row).find(message => message.id === replyId && message.role !== 'system');
            if (replyId != null && !replyTarget) throw error('找不到要回复的 Dot 消息。', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
            const prior = thread.turns.find(turn => turn.clientUserMessageId === requestId);
            if (prior) {
              const message = roomUserMessage(session, prior, prior.items.find(item => item.type === 'userMessage'), replyTarget);
              if (message.content.text !== text || roomReplyId(prior) !== replyId) throw error('此 Dot 消息请求已使用。', 409, 'LOCAL_DOT_REQUEST_CONFLICT');
              return json(message);
            }
            if (appServer.running?.has(id)) throw error('Dot 正在处理上一条消息。', 409, 'LOCAL_DOT_TURN_RUNNING');
            const started = createRpcFacade().dispatch('turn/start', {
              threadId: id, clientUserMessageId: requestId, input: [{ type: 'text', text }],
              ...(replyTarget && { responsesapiClientMetadata: { conversationOrigin: 'dot', localDotProvider: true, dotReplyMessageId: replyId,
                dotReplyRootMessageId: replyTarget.reply_root_message_id ?? replyId } }),
            });
            const { turn } = started.result;
            const accepted = roomUserMessage(session, turn, turn.items.find(item => item.type === 'userMessage'), replyTarget);
            const response = json(accepted);
            started.afterReply?.();
            return response;
          }
        }
      }
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
        const id = parts[3], record = pngRecord(session, id);
        // Native Image.decode() needs a directly loadable source for this browser-stored PNG.
        const download_url = typeof makeAssetURL === 'function' ? makeAssetURL(id, request) : 'data:image/png;base64,' + record.base64;
        return json({ status: 'success', download_url });
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
      if (path === '/tbo' && method === 'POST') {
        const fields = await body(request);
        request.signal?.throwIfAborted();
        assertIdentity(session);
        return json(await createProfile(session, fields));
      }
      if (path === '/tbo/primary') {
        if (method === 'PUT') {
          const supplied = await body(request);
          request.signal?.throwIfAborted();
          assertIdentity(session);
          const data = state(session), selected = findProfile(data, supplied.tbo_id);
          for (const row of data.profiles) row.is_primary = row === selected;
          data.primaryGeneration += 1;
          save(session, data);
          return json({ selection: { available: true, aeon_id: selected.id }, profile: publicProfile(selected) });
        }
        if (method === 'DELETE') {
          const data = state(session), generation = url.searchParams.get('generation');
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
            request.signal?.throwIfAborted();
            assertIdentity(session);
            const data = state(session), row = findProfile(data, parts[2]);
            const supported = new Set(nativePetUpdate ? ['avatar_type', 'avatar_manifest', 'avatar_url']
              : ['display_name', 'description', 'avatar', 'avatar_id', 'avatar_type', 'avatar_manifest', 'avatar_url', 'only_if_default_avatar']);
            if (nativePetUpdate && patch.avatar_type !== 'codex-pet') throw error('Only native pet appearances can use this Dot profile route', 422);
            if (Object.keys(patch).some(key => !supported.has(key))) throw error('This Dot profile field is unavailable from the local provider', 422);
            if (own(patch, 'display_name')) {
              row.display_name = safeText(patch.display_name, 'Dot name', 100).trim();
              if (!row.display_name) throw error('Dot name is required');
            }
            if (own(patch, 'description')) row.description = safeText(patch.description, 'Dot description', 4000);
            const changeAvatar = !patch.only_if_default_avatar || row.avatar_type === 'default';
            if (changeAvatar && (own(patch, 'avatar') || own(patch, 'avatar_id'))) {
              const selected = patch.avatar_id ?? patch.avatar;
              if (!ACCESSORIES.has(selected)) throw error('Unknown original Dot accessory');
              row.avatar = selected; row.avatar_id = selected; row.avatar_type = 'default';
              row.avatar_manifest = null; row.avatar_url = null;
            }
            if (changeAvatar && (own(patch, 'avatar_type') || own(patch, 'avatar_manifest'))) {
              const type = patch.avatar_type ?? row.avatar_type;
              row.avatar_manifest = type === 'default' && patch.avatar_manifest == null
                ? null : validateManifest(session, type, patch.avatar_manifest ?? row.avatar_manifest);
              row.avatar_type = type;
              row.avatar_url = type === 'codex-pet' ? row.avatar_manifest.snapshot.asset_pointer : null;
            }
            if (changeAvatar && own(patch, 'avatar_url') && patch.avatar_url != null) {
              // Persisted snapshots are resolved locally; no arbitrary remote image fetch.
              const snapshot = validateSnapshot(session, row.avatar_manifest?.snapshot);
              if (patch.avatar_url !== snapshot.asset_pointer) throw error('Only the saved local avatar pointer is accepted');
              row.avatar_url = snapshot.asset_pointer;
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
        if (parts.length === 4 && method === 'POST' && parts[3] === 'messaging-room') {
          const thread = appServer?.threads?.get(row.active_root_thread_id);
          if (thread?.adapterMetadata?.conversationOrigin !== 'dot') throw error('此 Dot 会话暂不可用。', 404, 'LOCAL_DOT_THREAD_NOT_FOUND');
          void completeDotTurn?.prepare?.();
          if (row.messaging_room_id !== thread.id) {
            row.messaging_room_id = thread.id;
            save(session, data);
          }
          return json(publicProfile(row));
        }
        if (parts.length === 4 && method === 'GET' && parts[3] === 'root-thread') return json({ root_thread_id: row.active_root_thread_id });
        if (parts.length === 4 && method === 'GET' && parts[3] === 'threads') {
          const rows = row.thread_ids.map(id => {
            let thread;
            try { thread = appServer?.getThread?.(id); } catch {}
            return { thread_id: id, title: thread?.name ?? '', created_at: thread?.createdAt ?? null, updated_at: thread?.updatedAt ?? null };
          });
          return json(pagination(rows, url));
        }
        if (parts.length === 4 && method === 'GET' && parts[3] === 'computers') return json({ thread_id: row.active_root_thread_id, computers: [] });
        if (parts.length === 5 && method === 'GET' && parts[3] === 'environment' && parts[4] === 'status') {
          const threadId = url.searchParams.get('thread_id');
          if (threadId !== null && !row.thread_ids.includes(threadId)) {
            throw error('No local Dot owns this thread', 404, 'LOCAL_DOT_NOT_FOUND');
          }
          return json({ environmentId: null, status: 'unknown', capabilities: [] });
        }
        if (parts.length === 4 && method === 'GET' && parts[3] === 'automations') return json(pagination([], url));

      }
      throw error('This Dot operation needs a service that is not provided locally', 501, 'LOCAL_DOT_SERVICE_UNAVAILABLE');
    } catch (cause) {
      diagnostic('request-error', { path: requestPath, code: cause?.code ?? 'LOCAL_DOT_ERROR', status: cause?.status ?? 500 });
      return fail(cause);
    }
  }
  function profileForThread(session, threadId) {
    return typeof threadId === 'string' ? state(session).profiles.find(profile => profile.thread_ids.includes(threadId)) : undefined;
  }
  function createRpcFacade(base = appServer) {
    if (typeof base?.dispatch !== 'function' || typeof base?.subscribe !== 'function') throw new TypeError('Dot requires the shared conversation RPC façade');
    return Object.freeze({
      dispatch(method, params = {}) {
        const thread = appServer?.threads?.get(params?.threadId);
        if (thread?.adapterMetadata?.conversationOrigin !== 'dot') return base.dispatch(method, params);
        const session = identity(false);
        const profile = session && profileForThread(session, thread.id);
        if (!profile) {
          throw Object.assign(new Error('当前账户无法访问此 Dot 会话。'), { rpcCode: -32003 });
        }
        if (!dotSelectionMethods.has(method)) return base.dispatch(method, params);
        const existing = typeof params.clientUserMessageId === 'string'
          ? thread.turns.find(turn => turn.clientUserMessageId === params.clientUserMessageId) : null;
        const sendsMessage = method === 'turn/start' || method === 'turn/addUserMessage';
        const route = sendsMessage ? selectLocalDotModel(params.input) : dotRoutes.find(choice => choice.model === thread.model) ?? dotDefault;
        const model = existing?.model ?? route.model, effort = existing?.reasoningEffort ?? route.effort;
        if (sendsMessage) diagnostic('turn-model-selected', { model, effort });
        return base.dispatch(method, { ...params, model, effort, executionSurface: 'work', reasoningMode: 'standard', serviceTier: 'standard' });
      },
      subscribe: listener => base.subscribe(listener),
    });
  }
  async function complete(options) {
    const session = identity();
    if (!profileForThread(session, options.providerRoutingContext?.threadId)) {
      throw error('当前账户无法运行此 Dot 会话。', 403, 'LOCAL_DOT_THREAD_FORBIDDEN');
    }
    if (typeof completeDotTurn !== 'function') throw error('本站 Dot 推理服务尚未接入。', 503, 'LOCAL_DOT_EXECUTOR_UNAVAILABLE');
    let result;
    try { result = await completeDotTurn(options); }
    catch (cause) {
      options.signal?.throwIfAborted();
      // The gateways do not guarantee idempotent inference after a lost response.
      const failure = new Error(cause?.message || 'Dot inference failed', { cause });
      for (const key of ['code', 'status', 'transportStatus', 'requestId']) if (cause?.[key] != null) failure[key] = cause[key];
      failure.retryable = false;
      throw failure;
    }
    assertIdentity(session);
    return result;
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
      if (!usesSitePolicy()) return get(original.c);
      const auth = get(inputs);
      const isLoading = auth?.authLoading === true || auth?.accountLoading === true;
      const session = identity(false);
      const matches = session != null && auth?.authenticatedAccountId === session.accountId && auth?.authenticatedUserId === session.userId;
      const local = getLocalDotPolicy();
      return { ...local, isLoading, isCapable: !isLoading && matches && local.isCapable, retainNavigation: false, unresolved: false };
    });
    const available = derive(scope, ({ get }) => get(capable).isCapable);
    return {
      a: available, c: capable, d: available, f: capable,
      b: (stateScope, accountId) => {
        if (!usesSitePolicy()) return original.b(stateScope, accountId);
        const session = identity(false);
        return session != null && session.accountId === accountId && getLocalDotPolicy().isCapable;
      },
      i: stateScope => {
        if (usesSitePolicy()) {
          if (!getLocalDotPolicy().isCapable) throw error('The local Dot provider is unavailable', 503);
          return;
        }
        return original.i(stateScope);
      },
    };
  }
  return { handle, createRpcFacade, subscribeRoomMessages, complete, getLocalDotPolicy, adaptCapabilityAtoms, provenance: Object.freeze({ provider: LOCAL_DOT_SOURCE, profileNamespace: '/tbo', cloudComputer: false, defaultAppearance: LOCAL_DOT_DEFAULT_APPEARANCE }) };
}
