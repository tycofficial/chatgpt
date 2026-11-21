/**
 * Site-local provider for the original Dot /tbo profile and appearance contracts.
 * No captured profiles, account entitlement, cloud computer or private endpoint.
 *
 * Locked source: 731863.bbf914bfbc.js imTH/TYK1/kzhd/oz6U/tsre/Yt5Q;
 * async/569087.5c1de81bf5.js o6Sz (PNG upload -> profile PATCH -> GET confirm).
 * hrUs -> GET /files/download/{file_id}: {status:'success',download_url}.
 */
import { createProviderCompletionRouter } from './provider-routing.mjs?v=dea77d65adc42752';
import { hasUncertainPlainResponse } from './agent-turn-runner.mjs?v=dea77d65adc42752';

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
export function createLocalDotCompletion({ complete, getProviders, siteOrigin, fetchDirectModels, responsesTransport }) {
  const site = new URL(siteOrigin);
  if (site.protocol !== 'https:' || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
    throw new TypeError('Dot requires the configured HTTPS site service origin');
  }
  if (typeof getProviders !== 'function' && typeof responsesTransport !== 'function') throw new TypeError('A configured Dot inference transport is required');
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
    if (responsesTransport || !fetchDirectModels) return false;
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
      const configured = getProviders?.();
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
    if (route === dotDefault && !responsesTransport) await prepare();
    const run = responsesTransport ? complete : router.complete;
    const result = await run({
      ...options,
      settings: { model, reasoningEffort: effort, reasoningMode: 'standard', apiTransport: 'responses' },
      responsesTransport: responsesTransport && ((payload, transport) => responsesTransport(payload, { ...options.transportContext, ...transport })),
    });
    if (typeof result.model !== 'string' || result.model !== model && !result.model.startsWith(model + '-') ||
        result.actual_reasoning?.effort !== effort) {
      throw Object.assign(error('服务商未确认 Dot 选用的模型或思考等级。', 502, 'LOCAL_DOT_MODEL_UNVERIFIED'), { retryable: false });
    }
    return { ...result, adapter_execution: { model: result.model, providerId: responsesTransport ? 'site-inference' : route.providerId, reasoningEffort: effort } };
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
  getFileRecord,
  files: fileService,
  backgroundRoomPump = false,
  isOnline = () => globalThis.navigator?.onLine !== false,
} = {}) {
  const bootstraps = new Map();
  const roomMessageUpdates = new Set();
  const activeRooms = new Map();
  let roomPumpStarted = false;
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
    const { thread_ids, room_reactions, room_journal, room_command_log, room_queue, room_automations, room_file_ids, ...profile } = row;
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
  const roomFiles = turn => turn.adapterMetadata?.classicUserMessage?.metadata?.attachments ?? [];
  const isRecovering = turn => turn?.status === 'interrupted' || (turn?.status === 'failed' && turn.adapterMetadata?.resumePolicy === 'automatic');
  const nativeAttachment = file => ({ ...file, type: 'file', file_id: file.id, size_bytes: file.size, status: 'ready' });
  function roomUserMessage(session, turn, item, replyTarget) {
    const created_at = timestamp(turn.startedAt);
    const replyId = roomReplyId(turn);
    const text = turn.adapterMetadata?.clientMetadata?.dotUserText ?? item.content.filter(part => part.type === 'text').map(part => part.text).join('\n');
    const attachments = roomFiles(turn).map(nativeAttachment);
    return { id: turn.adapterMetadata?.clientMetadata?.dotRoomMessageId ?? item.id, role: 'user', account_user_id: session.accountUserId, created_at, updated_at: created_at,
      request_id: turn.clientUserMessageId, content: { text, ...(attachments.length ? { attachments } : {}) },
      ...(replyId ? { reply_root_message_id: roomReplyRoot(turn), reply_to: { message_id: replyId, ...(replyTarget && { message: { ...replyTarget, reply_to: undefined } }) } } : {}),
    };
  }
  function roomAssistantMessages(turn, live = false) {
    if (!live && turn.status !== 'completed' && turn.status !== 'failed') return [];
    const created_at = timestamp(turn.completedAt ?? turn.startedAt);
    const replyRoot = roomReplyRoot(turn), replyThread = replyRoot ? { reply_root_message_id: replyRoot } : {};
    if (!live && turn.status === 'failed') return [{ id: turn.id, role: 'system', created_at, updated_at: created_at, ...replyThread,
      content: { type: 'text', text: 'Dot 暂时未能完成这条回复，请重试。' }, preview: 'Dot 暂时未能完成这条回复，请重试。' }];
    const result = turn.adapterMetadata?.checkpoint?.metrics?.findLast(metric => metric.adapterExecution)?.adapterExecution;
    const items = turn.items.filter(item => item.type === 'agentMessage' && item.text).map(item => ({
      id: item.id, role: 'assistant', created_at, updated_at: created_at, ...replyThread, raw_messages: [{ id: item.id,
        author: { role: 'assistant' }, channel: 'final', content: { content_type: 'text', parts: [item.text] }, metadata: {} }],
      ...(live ? { status: turn.status, ...(result && { execution: result }) } : {}),
    }));
    if (live && turn.status === 'failed') items.push({ id: turn.id, role: 'system', created_at, updated_at: created_at, ...replyThread,
      content: { text: turn.error?.message ?? 'Dot 未能完成此回复。' } });
    return items;
  }
  function roomMessages(session, thread, row, live = false) {
    const messages = new Map();
    const reactions = row.room_reactions ?? {};
    function add(message) {
      const record = own(reactions, message.id) ? reactions[message.id] : undefined;
      if (record === undefined) { messages.set(message.id, message); return; }
      const reaction = typeof record === 'string' ? record : record?.reaction;
      const updatedAt = record?.updatedAt ?? message.updated_at;
      messages.set(message.id, { ...message, updated_at: updatedAt, reactions: reaction ? { [session.accountUserId]: reaction } : {} });
    }
    for (const entry of row.room_command_log ?? []) {
      add(entry.message);
      add(entry.receipt);
    }
    for (const turn of thread.turns) {
      const target = messages.get(roomReplyId(turn));
      for (const item of turn.items) {
        if (item.type === 'userMessage') add(roomUserMessage(session, turn, item, target));
      }
      for (const message of roomAssistantMessages(turn, live)) add(message);
    }
    return [...messages.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
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
  function roomLock(session, action) {
    const locks = globalThis.navigator?.locks;
    return locks ? locks.request(stateKey(session), async () => action()) : action();
  }
  const messageText = message => message?.content?.text ?? message?.raw_messages?.flatMap(item => item.content.parts).join('\n') ?? '';
  const roomQueue = (row, thread) => (row.room_queue ?? []).filter(item => !thread.turns.some(turn => turn.clientUserMessageId === item.requestId));
  const queuedView = (session, item) => ({ id: item.requestId, request_id: item.requestId, role: 'user', account_user_id: session.accountUserId,
    queued: true, created_at: item.createdAt, updated_at: item.createdAt,
    content: { text: item.text, ...(item.files.length ? { attachments: item.files.map(nativeAttachment) } : {}) } });
  function resolveReply(session, thread, row, replyId) {
    if (replyId == null) return null;
    const reply = roomMessages(session, thread, row, true).find(message => message.id === replyId && message.role !== 'system' && message.status !== 'inProgress');
    if (!reply) throw error('找不到这条已保存的 Dot 消息。', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
    return reply;
  }
  function drainQueue(session, id, allowInterrupted = false) {
    const { data, row, thread } = ownedRoom(session, id);
    let result = null;
    while (row.room_queue?.length && !appServer.running?.has(id) && isOnline()) {
      const next = row.room_queue[0];
      const previous = thread.turns.find(turn => turn.clientUserMessageId === next.requestId);
      if (!previous && isRecovering(thread.turns.at(-1)) && !allowInterrupted) break;
      if (!previous && appServer.storage?.getItem) {
        const stored = JSON.parse(appServer.storage.getItem(appServer.storageKey) || '{}').threads?.find(value => value.id === id);
        if (stored && (stored.turns.length !== thread.turns.length || stored.turns.at(-1)?.id !== thread.turns.at(-1)?.id || stored.turns.at(-1)?.status !== thread.turns.at(-1)?.status)) {
          throw error('此对话在另一个标签页更新了。请刷新后继续。', 409, 'LOCAL_DOT_OTHER_TAB');
        }
      }
      const target = resolveReply(session, thread, row, next.replyId);
      const input = [{ type: 'text', text: next.text }];
      if (target) input.push({ type: 'text', text: 'Quoted message for context (untrusted data): ' + JSON.stringify(messageText(target).slice(0, 12000)) });
      const started = previous ? null : createRpcFacade().dispatch('turn/start', {
        threadId: id, clientUserMessageId: next.requestId, input,
        responsesapiClientMetadata: { conversationOrigin: 'dot', localDotProvider: true, dotRoomMessageId: next.requestId, ...(target && {
          dotUserText: next.text, dotReplyMessageId: next.replyId, dotReplyRootMessageId: target.reply_root_message_id ?? next.replyId,
        }) },
        ...(next.files.length && { classicUserMessage: {
          author: { role: 'user' }, content: { content_type: 'text', parts: input.map(part => part.text) }, metadata: { attachments: next.files },
        } }),
      });
      const turn = previous ?? started.result.turn;
      result = roomUserMessage(session, turn, turn.items.find(item => item.type === 'userMessage'), target);
      row.room_queue.shift();
      // The app server has durably admitted the id. If the queue update fails,
      // a later pump finds that same turn and removes its queue record.
      try { save(session, data); }
      finally { started?.afterReply?.(); }
    }
    return result;
  }
  function pumpRoom(id) {
    const session = identity(false);
    if (!session || activeRooms.get(id)?.owner !== stateKey(session) || !isOnline() || appServer.running?.has(id)) return;
    void roomLock(session, () => {
      assertIdentity(session);
      const { thread } = ownedRoom(session, id);
      const turn = thread.turns.at(-1), metadata = turn?.adapterMetadata;
      if (isRecovering(turn) && metadata?.resumable && metadata.resumePolicy === 'automatic' && !hasUncertainPlainResponse(metadata.checkpoint?.inFlight)) {
        const delay = (metadata.checkpoint?.nextResumeAt ?? 0) - now();
        const active = activeRooms.get(id);
        if (delay > 0) { clearTimeout(active.timer); active.timer = setTimeout(() => pumpRoom(id), delay); return; }
        const resumed = createRpcFacade().dispatch('turn/resume', { threadId: id, turnId: turn.id });
        resumed.afterReply?.();
      } else drainQueue(session, id);
    }).catch(cause => diagnostic('room-pump-error', { code: cause.code ?? 'LOCAL_DOT_PUMP_ERROR' }));
  }
  function activateRoom(session, id) {
    if (!backgroundRoomPump) return;
    if (!roomPumpStarted) {
      roomPumpStarted = true;
      appServer.subscribe(event => { if (event.method === 'turn/completed' && activeRooms.has(event.params.threadId)) queueMicrotask(() => pumpRoom(event.params.threadId)); });
      globalThis.addEventListener?.('online', () => { for (const roomId of activeRooms.keys()) pumpRoom(roomId); tickAutomations(); });
      const interval = setInterval(tickAutomations, 15000);
      interval.unref?.();
    }
    const owner = stateKey(session);
    const previous = activeRooms.get(id);
    if (previous?.owner === owner) return;
    clearTimeout(previous?.timer);
    activeRooms.set(id, { owner, timer: null });
    queueMicrotask(() => pumpRoom(id));
  }
  function enqueueMessage(session, id, next) {
    const { data, row, thread } = ownedRoom(session, id);
    if (row.room_command_log?.some(value => value.message.request_id === next.requestId)) throw error('此 Dot 消息请求已使用。', 409, 'LOCAL_DOT_REQUEST_CONFLICT');
    const target = resolveReply(session, thread, row, next.replyId);
    const previous = thread.turns.find(turn => turn.clientUserMessageId === next.requestId);
    if (previous) {
      const message = roomUserMessage(session, previous, previous.items.find(item => item.type === 'userMessage'), target);
      if (message.content.text !== next.text || roomReplyId(previous) !== next.replyId || JSON.stringify(roomFiles(previous).map(file => file.id)) !== JSON.stringify(next.files.map(file => file.id))) {
        throw error('此 Dot 消息请求已使用。', 409, 'LOCAL_DOT_REQUEST_CONFLICT');
      }
      return json(message);
    }
    const queue = row.room_queue ??= [];
    const pending = queue.find(item => item.requestId === next.requestId);
    if (pending && (pending.text !== next.text || pending.replyId !== next.replyId || JSON.stringify(pending.files.map(file => file.id)) !== JSON.stringify(next.files.map(file => file.id)))) {
      throw error('此 Dot 消息请求已使用。', 409, 'LOCAL_DOT_REQUEST_CONFLICT');
    }
    if (!pending) {
      if (queue.length >= 16) throw error('Dot 的待发送队列已满。', 429, 'LOCAL_DOT_QUEUE_FULL');
      queue.push(next);
      save(session, data);
    }
    const last = thread.turns.at(-1);
    const admitted = drainQueue(session, id, backgroundRoomPump && last?.adapterMetadata?.resumePolicy !== 'automatic');
    return admitted?.request_id === next.requestId ? json(admitted) : json(queuedView(session, pending ?? next), 202);
  }
  const readOwnedFileRecord = getFileRecord ?? (typeof fileService?.readFile === 'function'
    ? async (id, options) => (await fileService.readFile(id, options)).record : null);
  async function messageAttachments(value, signal) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 10) throw error('每条 Dot 消息最多可附加 10 个文件。');
    if (value.length && !readOwnedFileRecord) throw error('本站的 Dot 文件服务尚未接入。', 503, 'LOCAL_DOT_FILES_UNAVAILABLE');
    const ids = value.map(file => file?.type === 'file' ? file.file_id : file?.id);
    if (ids.some(id => !/^file_local_[0-9a-f]{32}$/.test(id ?? '')) || new Set(ids).size !== ids.length) throw error('Dot 附件引用无效。');
    return Promise.all(ids.map(async id => {
      const file = await readOwnedFileRecord(id, { signal });
      if (file?.fileId !== id || file.status !== 'ready') throw error('Dot 附件还没有上传完成。', 422, 'LOCAL_DOT_FILE_NOT_READY');
      return { id, name: file.fileName, mime_type: file.mimeType, size: file.size };
    }));
  }
  async function roomFileRequest(request, adapterPath, localPath, method, payload) {
    const url = new URL(request.url);
    const at = url.pathname.endsWith(adapterPath) ? url.pathname.slice(0, -adapterPath.length) : '';
    const result = await fileService.handle(new Request(new URL(at + localPath, url), {
      method, signal: request.signal, ...(payload && { body: JSON.stringify(payload) }),
    }), localPath);
    const body = await result?.json();
    if (!result?.ok) throw error(body?.error?.message ?? body?.detail ?? '无法读取或保存此附件。', result?.status ?? 503, body?.error?.code ?? 'LOCAL_DOT_FILE_REQUEST_FAILED');
    return body;
  }
  async function roomFile(session, roomId, request, path, fileId) {
    const { row, thread } = ownedRoom(session, roomId);
    if (!fileService) throw error('本站的 Dot 文件服务尚未接入。', 503, 'LOCAL_DOT_FILES_UNAVAILABLE');
    if (fileId) {
      const linked = row.room_file_ids?.includes(fileId) || thread.turns.some(turn => roomFiles(turn).some(file => file.id === fileId));
      if (!linked || !/^file_local_[0-9a-f]{32}$/.test(fileId)) throw error('找不到这个 Dot 会话的附件。', 404, 'LOCAL_DOT_FILE_NOT_FOUND');
      const record = await readOwnedFileRecord(fileId, { signal: request.signal });
      const receipt = await roomFileRequest(request, path, '/files/download/' + fileId, 'GET');
      assertIdentity(session);
      return json({ ...nativeAttachment({ id: fileId, name: record.fileName, mime_type: record.mimeType, size: record.size }), download_url: receipt.download_url });
    }
    let multipart;
    try { multipart = await request.formData(); } catch { throw error('Dot 附件需要 multipart 文件。', 415, 'LOCAL_DOT_INVALID_UPLOAD'); }
    const file = multipart.get('file');
    if (typeof file?.arrayBuffer !== 'function' || typeof file.name !== 'string') throw error('请选择要上传的文件。');
    assertIdentity(session);
    const receipt = await roomFileRequest(request, path, '/files', 'POST', { file_name: file.name, file_size: file.size, mime_type: file.type });
    const id = receipt.file_id;
    try {
      const upload = new FormData();
      upload.append('file', file, file.name);
      await fileService.upload('POST', receipt.upload_url, { body: upload, signal: request.signal });
      await roomFileRequest(request, path, `/files/${id}/uploaded`, 'POST', {});
      const record = await readOwnedFileRecord(id, { signal: request.signal });
      request.signal?.throwIfAborted();
      await roomLock(session, () => {
        const { data, row } = ownedRoom(session, roomId);
        row.room_file_ids ??= [];
        row.room_file_ids.push(id);
        save(session, data);
      });
      return json(nativeAttachment({ id, name: record.fileName, mime_type: record.mimeType, size: record.size }));
    } catch (cause) {
      const current = identity(false);
      if (current?.accountId === session.accountId && current.userId === session.userId) await fileService.cancelUpload(id).catch(() => {});
      throw cause;
    }
  }
  function changeJournal(entries, entryId, method, supplied) {
    const index = entries.findIndex(entry => entry.id === entryId);
    if (entryId && index === -1) throw error('这条日记已不存在。', 404, 'LOCAL_DOT_JOURNAL_NOT_FOUND');
    if (entryId && supplied?.revision != null && supplied.revision !== entries[index].revision) throw error('这条日记已更新，请刷新后再编辑。', 409, 'LOCAL_DOT_JOURNAL_CONFLICT');
    if (method === 'DELETE' && entryId) {
      entries.splice(index, 1);
      return null;
    }
    if (method !== (entryId ? 'PATCH' : 'POST')) throw error('此日记操作不可用。', 405);
    if (!entryId && entries.length >= 200) throw error('这个浏览器中的 Dot 日记已达 200 条。', 413);
    const content = safeText(supplied.content, 'journal text', 12000);
    if (!content.trim()) throw error('请先填写日记。');
    const updatedAt = new Date(now()).toISOString();
    const entry = {
      id: entryId ?? uuid(), content, created_at: entries[index]?.created_at ?? updatedAt, updated_at: updatedAt,
      revision: (entries[index]?.revision ?? 0) + 1,
    };
    if (entryId) entries[index] = entry;
    else entries.unshift(entry);
    return entry;
  }
  function nativeJournal(session, thread, row, url) {
    const view = url.searchParams.get('view');
    const taskId = url.searchParams.get('task_id');
    const messageByTurn = new Map(thread.turns.map(turn => {
      const user = turn.items.find(item => item.type === 'userMessage');
      return [turn.id, user ? [roomUserMessage(session, turn, user), ...roomAssistantMessages(turn, true)] : []];
    }));
    const notes = row.room_journal ?? [];
    if (taskId != null) {
      const turn = thread.turns.find(item => item.id === taskId);
      const note = notes.find(item => item.id === taskId);
      if (!turn && !note) throw error('找不到此日记条目。', 404, 'LOCAL_DOT_JOURNAL_NOT_FOUND');
      if (url.searchParams.get('files_only') === 'true') return json({ files: (turn ? roomFiles(turn) : []).map(file => ({ kind: 'file', id: file.id, label: file.name, mime: file.mime_type })), before: null });
      const messages = note ? [{ id: note.id, role: 'user', content: { text: note.content }, created_at: note.updated_at }] : messageByTurn.get(taskId);
      if (view === 'progress') {
        const updates = messages.filter(message => message.role !== 'user' && messageText(message)).map(message => ({
          id: message.id, at: Date.parse(message.created_at) / 1000, message_id: message.id,
          kind: message.role === 'system' ? 'blocked' : turn.status === 'completed' ? 'delivered' : 'finding',
          title: message.role === 'system' ? '运行状态' : row.display_name, detail: messageText(message),
        }));
        return json({ before: null, resume_message_id: messages[0]?.id ?? null, exchanges: updates.length ? [{ revision: String(turn.completedAt ?? turn.startedAt), items: updates }] : [] });
      }
      return json({ before: null, turns: [{ id: taskId, messages: messages.filter(message => message.role !== 'system').map(message => ({
        id: message.id, at: Date.parse(message.created_at) / 1000, speaker: message.role === 'user' ? 'owner' : 'dot', text: messageText(message),
      })) }] });
    }
    const title = text => text.trim().split('\n')[0]?.slice(0, 80) || 'Dot';
    const tasks = notes.map(note => ({ id: note.id, title: title(note.content), outcome_state: 'reached', description: note.content,
      progress: null, input_needed: null, resume_message_id: null,
    }));
    const items = [];
    for (const turn of [...thread.turns].reverse()) {
      const messages = messageByTurn.get(turn.id);
      if (!messages.length) continue;
      const label = title(messageText(messages[0]));
      const status = turn.status === 'completed' ? 'complete' : turn.status === 'failed' ? 'failed' : turn.status === 'interrupted' ? 'cancelled' : 'in_progress';
      const output = messages.findLast(message => message.role === 'assistant');
      tasks.push({ id: turn.id, title: label, outcome_state: status === 'complete' ? 'reached' : 'ongoing', description: messageText(messages[0]),
        progress: output ? messageText(output) : null, input_needed: null, resume_message_id: messages[0].id });
      items.push({ id: turn.id, topic_id: turn.id, title: label, status,
        description: output ? messageText(output) : null, completed_at: turn.completedAt ?? null, message_refs: messages.map(message => message.id), outputs: [] });
    }
    const taskCursor = url.searchParams.get('cursor');
    const itemCursor = url.searchParams.get('item_cursor');
    function page(rows, cursor) {
      const start = cursor == null || cursor === 'null' ? 0 : Number(/^local-journal:(\d+)$/.exec(cursor)?.[1]);
      if (!Number.isSafeInteger(start) || start > rows.length) throw error('无效的 Dot 日记分页位置。');
      const end = Math.min(rows.length, start + 30);
      return [rows.slice(start, end), end < rows.length ? `local-journal:${end}` : null];
    }
    const [visibleTasks, before] = page(tasks, taskCursor), [visibleItems, itemsBefore] = page(items, itemCursor);
    return json({ tasks: visibleTasks, items: visibleItems, before, items_before: itemsBefore });
  }
  function journal(session, roomId, entryId, method, supplied, url) {
    const { data, row, thread } = ownedRoom(session, roomId);
    const entries = row.room_journal ??= [];
    if (method === 'GET' && !entryId) return url.searchParams.has('view') ? nativeJournal(session, thread, row, url) : json({ items: entries });
    if (method === 'GET') {
      const entry = entries.find(value => value.id === entryId);
      if (!entry) throw error('这条日记已不存在。', 404, 'LOCAL_DOT_JOURNAL_NOT_FOUND');
      return json(entry);
    }
    if (entryId && !Number.isSafeInteger(supplied?.revision)) throw error('请提供当前日记版本。', 409, 'LOCAL_DOT_JOURNAL_CONFLICT');
    const entry = changeJournal(entries, entryId, method, supplied);
    save(session, data);
    return entry == null ? new Response(null, { status: 204 }) : json(entry, entryId ? 200 : 201);
  }
  function roomCommand(session, roomId, requestId, text, action) {
    const { data, row, thread } = ownedRoom(session, roomId);
    const commands = row.room_command_log ??= [];
    const old = commands.find(value => value.message.request_id === requestId);
    if (old && old.message.content.text === text) return json(old.message);
    if (old || thread.turns.some(turn => turn.clientUserMessageId === requestId) || roomQueue(row, thread).some(item => item.requestId === requestId)) throw error('此 Dot 消息请求已使用。', 409, 'LOCAL_DOT_REQUEST_CONFLICT');
    const output = action(row, thread);
    const at = new Date(now()).toISOString();
    const message = { id: requestId, request_id: requestId, role: 'user', account_user_id: session.accountUserId,
      content: { text }, created_at: at, updated_at: at };
    const receipt = { id: uuid(), role: 'system', content: { type: 'text', text: output }, preview: output, created_at: at, updated_at: at };
    commands.push({ message, receipt });
    save(session, data);
    publishRoomUpdate({ type: 'calpico-message-add', payload: { room_id: roomId, message: receipt } });
    return json(message);
  }
  function journalCommand(row, command) {
    const entries = row.room_journal ??= [];
    const [, verb, rest = ''] = command;
    const [entryId, ...chunks] = rest.trim().split(/\s+/u);
    if (verb === 'add' && rest.trim()) return '已保存日记 · ' + changeJournal(entries, null, 'POST', { content: rest }).id;
    if (verb === 'edit' && entryId && chunks.length) {
      changeJournal(entries, entryId, 'PATCH', { content: rest.trim().slice(entryId.length).trimStart() });
      return '已修改日记 · ' + entryId;
    }
    if (verb === 'delete' && entryId && !chunks.length) {
      changeJournal(entries, entryId, 'DELETE', {});
      return '已删除日记 · ' + entryId;
    }
    if (verb === 'list' && !entryId) return entries.length ? entries.map(entry => `${entry.id} · ${entry.content.trim().split('\n')[0].slice(0, 80)}`).join('\n') : '日记里还没有条目。';
    return '日记命令：/journal add 内容、/journal list、/journal edit 编号 内容、/journal delete 编号。';
  }
  function automationView(schedule, thread) {
    const turn = thread?.turns.find(value => value.clientUserMessageId === schedule.last_request_id);
    const items = turn?.items.filter(item => item.type === 'agentMessage' && item.text) ?? [];
    const output = items.filter(item => item.phase !== 'commentary').at(-1)?.text ?? '';
    const lastRun = !schedule.last_request_id ? null : {
      status: turn?.status ?? 'queued', output, error: turn?.error?.message ?? null,
      started_at: turn ? timestamp(turn.startedAt) : null, duration_ms: turn?.durationMs ?? null,
      model: turn?.adapterMetadata?.checkpoint?.metrics?.findLast(metric => metric.adapterExecution)?.adapterExecution?.model ?? null,
    };
    return { ...schedule, last_run: lastRun };
  }
  function createSchedule(row, supplied) {
    const name = safeText(supplied.name, 'automation name', 120).trim();
    const prompt = safeText(supplied.prompt, 'automation prompt', 12000);
    const minutes = supplied.interval_minutes ?? 0;
    if (!name || !prompt.trim() || !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 10080) throw error('请输入任务名称、提示词和有效间隔。');
    const rows = row.room_automations ??= [];
    if (rows.length >= 30) throw error('一个 Dot 最多保存 30 条自动化。', 413);
    const at = new Date(now()).toISOString();
    const created = { id: uuid(), name, prompt, interval_minutes: minutes, enabled: true, next_at: minutes ? now() + minutes * 60000 : null,
      created_at: at, updated_at: at, last_request_id: null };
    rows.push(created);
    return created;
  }
  function setScheduleEnabled(row, schedule, enabled) {
    if (typeof enabled !== 'boolean') throw error('请选择启动或停用。');
    if (schedule.enabled === enabled) return false;
    schedule.enabled = enabled;
    schedule.updated_at = new Date(now()).toISOString();
    schedule.next_at = enabled && schedule.interval_minutes ? now() + schedule.interval_minutes * 60000 : null;
    if (!enabled && row.room_queue?.some(item => item.requestId === schedule.last_request_id)) {
      row.room_queue = row.room_queue.filter(item => item.requestId !== schedule.last_request_id);
      schedule.last_request_id = null;
    }
    return true;
  }
  function queueAutomationRun(row, thread, schedule, supplied) {
    if (!isOnline()) throw error('联网后可以执行自动化。', 503, 'LOCAL_DOT_OFFLINE');
    if (!schedule.enabled) throw error('此自动化已停用。', 409, 'LOCAL_DOT_AUTOMATION_DISABLED');
    if (!row.messaging_room_id || !thread) throw error('请先打开 Dot 对话。', 409);
    const due = supplied.scheduled_for;
    if (due != null && (schedule.next_at !== due || due > now())) return false;
    const latest = automationView(schedule, thread).last_run;
    if (latest?.status === 'queued' || latest?.status === 'inProgress') return false;
    const requestId = safeText(supplied.request_id, 'automation request ID', 120);
    if (!requestId) throw error('自动化请求 ID 缺失。');
    const runId = `dot-automation-${schedule.id}-${due ?? requestId}`;
    if (thread.turns.some(turn => turn.clientUserMessageId === runId)) return false;
    const queue = row.room_queue ??= [];
    if (queue.length >= 16) throw error('Dot 的待发送队列已满。', 429, 'LOCAL_DOT_QUEUE_FULL');
    schedule.updated_at = new Date(now()).toISOString();
    queue.push({ requestId: runId, text: schedule.prompt, replyId: null, files: [], createdAt: schedule.updated_at });
    schedule.last_request_id = runId;
    if (schedule.interval_minutes) schedule.next_at = now() + schedule.interval_minutes * 60000;
    return true;
  }
  function tickAutomations() {
    const session = identity(false);
    if (!session || !isOnline()) return;
    for (const [id, active] of activeRooms) if (active.owner === stateKey(session)) {
      void roomLock(session, () => {
        assertIdentity(session);
        const { data, row, thread } = ownedRoom(session, id);
        const due = row.room_automations?.find(schedule => schedule.enabled && schedule.next_at != null && schedule.next_at <= now());
        if (!due || !queueAutomationRun(row, thread, due, { scheduled_for: due.next_at, request_id: 'scheduled' })) return;
        save(session, data);
        drainQueue(session, id);
      }).catch(cause => diagnostic('automation-tick-error', { code: cause.code ?? 'LOCAL_DOT_AUTOMATION_TICK' }));
    }
  }
  function nativeAutomation(row, schedule, thread) {
    return { ...automationView(schedule, thread), title: schedule.name, user_access: 'owner', aeon_id: row.id,
      conversation_id: row.messaging_room_id ?? row.active_root_thread_id, executor: 'local', can_run_manually: true,
      default_timezone: 'UTC', email_enabled: false, notifications_enabled: false, is_enabled: schedule.enabled,
      timing_mode: 'exact_schedule', schedule: schedule.interval_minutes ? 'RRULE:FREQ=MINUTELY;INTERVAL=' + schedule.interval_minutes : '',
      schedule_components: { frequency: schedule.interval_minutes ? 'minutely' : 'once', start_time: null },
      next_run_times: schedule.next_at == null ? [] : [new Date(schedule.next_at).toISOString()],
      updated_at: schedule.updated_at ?? row.updated_at, created_at: schedule.created_at ?? row.created_at,
      execution_scope: 'site-browser-online',
    };
  }
  function automationCommand(row, thread, requestId, command) {
    const [, verb, rest = ''] = command;
    const rows = row.room_automations ??= [];
    if (verb === 'add') {
      const [name, interval, ...description] = rest.split('|');
      if (name?.trim() && /^\d+$/.test(interval?.trim() ?? '') && description.join('|').trim()) {
        const schedule = createSchedule(row, { name, interval_minutes: Number(interval), prompt: description.join('|').trim() });
        return `已创建自动化 · ${schedule.id}\n定时运行需要保持本站页面打开且联网。`;
      }
    }
    if (verb === 'list' && !rest.trim()) return rows.length ? rows.map(schedule => {
      const view = automationView(schedule, thread);
      return `${schedule.id} · ${schedule.name} · ${schedule.enabled ? '启用' : '停用'}${view.last_run?.output ? '\n' + view.last_run.output : ''}`;
    }).join('\n') : '没有已保存的自动化。';
    if (['run','off','on'].includes(verb) && rest.trim()) {
      const schedule = rows.find(item => item.id === rest.trim());
      if (!schedule) throw error('找不到这条自动化。', 404, 'LOCAL_DOT_AUTOMATION_NOT_FOUND');
      if (verb === 'run') return queueAutomationRun(row, thread, schedule, { request_id: requestId }) ? '自动化已排队，运行结果将出现在当前对话。' : '这条自动化正在等待或运行。';
      setScheduleEnabled(row, schedule, verb === 'on');
      return verb === 'on' ? '已启用自动化。' : '已停用自动化。';
    }
    return '自动化命令：/automation add 名称 | 分钟 | 提示词（0 为手动）、/automation list、/automation run 编号、/automation off 编号。';
  }
  function automations(session, profileId, scheduleId, run, method, supplied, url) {
    const data = state(session), row = findProfile(data, profileId);
    const thread = appServer.threads.get(row.active_root_thread_id);
    const rows = row.room_automations ??= [];
    if (method === 'GET' && !scheduleId) return json(pagination(rows.map(schedule => nativeAutomation(row, schedule, thread)), url));
    if (method === 'POST' && !scheduleId) {
      const created = createSchedule(row, supplied);
      save(session, data);
      return json(automationView(created, thread), 201);
    }
    const schedule = rows.find(row => row.id === scheduleId);
    if (!schedule) throw error('找不到这条自动化。', 404, 'LOCAL_DOT_AUTOMATION_NOT_FOUND');
    if (method === 'PATCH' && !run) {
      if (setScheduleEnabled(row, schedule, supplied.enabled)) save(session, data);
      return json(automationView(schedule, thread));
    }
    if (!run || method !== 'POST') throw error('此自动化操作不可用。', 405);
    if (!queueAutomationRun(row, thread, schedule, supplied)) return json(automationView(schedule, thread));
    save(session, data);
    drainQueue(session, row.messaging_room_id);
    return json(automationView(schedule, appServer.threads.get(thread.id)), 202);
  }
  function nativeRunRecord(schedule, row, turn) {
    const status = turn.status === 'completed' ? 'completed' : turn.status === 'failed' ? 'failed' : turn.status === 'interrupted' ? 'cancelled' : 'in_progress';
    const output = turn.items.findLast(item => item.type === 'agentMessage' && item.phase !== 'commentary' && item.text)?.text ?? '';
    return { id: turn.id, automation_id: schedule.id, conversation_id: row.messaging_room_id, status, output,
      started_at: timestamp(turn.startedAt), created_at: timestamp(turn.startedAt), updated_at: timestamp(turn.completedAt ?? turn.startedAt),
      error: turn.error?.message ?? null,
    };
  }
  function nativeAutomationRequest(session, parts, method, supplied, url) {
    const data = state(session);
    const [resource, action, sub, item] = parts.slice(1);
    const rows = data.profiles.flatMap(row => (row.room_automations ?? []).map(schedule => ({ row, schedule,
      thread: appServer.threads.get(row.active_root_thread_id) })));
    if (resource === 'automations' && (!action && method === 'GET' || action === 'query' && method === 'POST')) {
      const query = supplied?.query?.trim?.()?.toLocaleLowerCase();
      const filter = supplied?.filter ?? url.searchParams.get('filter');
      const visible = url.searchParams.get('include_dot_context') === 'false' ? [] : rows
        .filter(({ schedule }) => (!query || `${schedule.name}\n${schedule.prompt}`.toLocaleLowerCase().includes(query)) &&
          (filter !== 'active' || schedule.enabled) && (filter !== 'paused' || !schedule.enabled));
      if (supplied?.cursor) url.searchParams.set('cursor', supplied.cursor);
      return json(pagination(visible.map(({ row, schedule, thread }) => nativeAutomation(row, schedule, thread)), url));
    }
    if (resource === 'automations' && action === 'save' && method === 'POST' && !supplied.jawbone_id) {
      const row = data.profiles.find(profile => profile.id === supplied.aeon_id || typeof profile.messaging_room_id === 'string' &&
        [supplied.conversation_id, supplied.source_conversation_id].includes(profile.messaging_room_id));
      if (!row || supplied.executor === 'cloud') throw error('本站的 Dot 定时任务在浏览器中运行。请在 Dot 对话发送 /automation 查看创建方式。', 422, 'LOCAL_DOT_CLOUD_AUTOMATION_UNAVAILABLE');
      const fixedRule = /^(?:RRULE:)?FREQ=MINUTELY;INTERVAL=(\d+)(?:;BYSECOND=0)?$/i.exec(supplied.schedule?.trim?.() ?? '');
      if (supplied.schedule && !fixedRule) throw error('此浏览器任务需要固定分钟间隔。', 422, 'LOCAL_DOT_AUTOMATION_RULE_UNSUPPORTED');
      const schedule = createSchedule(row, { name: supplied.title, prompt: supplied.prompt, interval_minutes: Number(fixedRule?.[1] ?? 0) });
      save(session, data);
      return json(nativeAutomation(row, schedule, appServer.threads.get(row.active_root_thread_id)));
    }
    const id = resource === 'automation' ? action : supplied?.jawbone_id ?? supplied?.automation_id;
    const owned = rows.find(value => value.schedule.id === id);
    if (!owned) throw error('找不到这条 Dot 自动化。', 404, 'LOCAL_DOT_AUTOMATION_NOT_FOUND');
    const { row, schedule, thread } = owned;
    if (resource === 'automations' && action === 'set_status' && method === 'POST') {
      if (setScheduleEnabled(row, schedule, supplied.is_enabled)) save(session, data);
      return json(nativeAutomation(row, schedule, thread));
    }
    if (resource === 'automations' && action === 'remove' && method === 'POST') {
      setScheduleEnabled(row, schedule, false);
      row.room_automations = row.room_automations.filter(value => value !== schedule);
      save(session, data);
      return json({ id });
    }
    if (resource === 'automation' && !sub && method === 'GET') return json(nativeAutomation(row, schedule, thread));
    if (resource === 'automation' && sub === 'run' && method === 'POST') {
      if (queueAutomationRun(row, thread, schedule, { request_id: supplied.idempotency_key })) {
        save(session, data);
        drainQueue(session, row.messaging_room_id);
      }
      return json({ automation_id: id, status: 'accepted' }, 202);
    }
    if (resource === 'automation' && sub === 'runs' && method === 'GET') {
      const prefix = `dot-automation-${schedule.id}-`;
      const runs = (thread?.turns ?? []).filter(turn => turn.clientUserMessageId?.startsWith(prefix)).reverse().map(turn => nativeRunRecord(schedule, row, turn));
      if (!item) return json(pagination(runs, url));
      const run = item === 'latest' ? runs[0] ?? null : runs.find(value => value.id === item);
      if (run === undefined) throw error('找不到这次运行。', 404, 'LOCAL_DOT_AUTOMATION_RUN_NOT_FOUND');
      return json(item === 'latest' ? { last_run: run, latest_update: run ? { run } : null } : { run });
    }
    throw error('此 Dot 自动化操作不可用。', 501, 'LOCAL_DOT_SERVICE_UNAVAILABLE');
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
  function publishRoomUpdate(update) {
    for (const deliver of roomMessageUpdates) {
      try { deliver(update); } catch { diagnostic('room-message-update-listener-error'); }
    }
  }
  async function handle(request, canonicalPath) {
    const url = new URL(request.url), requestPath = canonicalPath ?? url.pathname;
    const nativePetUpdate = request.method === 'PATCH' && /^\/cloud-aeons\/local-dot-[A-Za-z0-9-]{1,100}$/.test(requestPath);
    const path = nativePetUpdate ? '/tbo' + requestPath.slice('/cloud-aeons'.length) : requestPath;
    const nativeSchedule = path === '/automations' || /^\/automations\/(?:query|save|set_status|remove)$/.test(path) || path.startsWith('/automation/');
    const relevant = nativeSchedule || path === '/tbo' || path.startsWith('/tbo/') || path.startsWith('/cloud-aeons/avatar-snapshots')
      || path.startsWith('/local-dot/assets/') || path.startsWith('/files/download/local-dot-avatar-')
      || path === '/pins' || path.startsWith('/pins/feature/') || path.startsWith('/messaging/rooms/');
    if (!relevant) return null;
    try {
      const session = identity();
      const method = request.method.toUpperCase();
      const parts = decodePath(path);
      request.signal?.throwIfAborted();
      if (nativeSchedule) {
        const supplied = method === 'POST' ? await body(request) : null;
        request.signal?.throwIfAborted();
        return await roomLock(session, () => nativeAutomationRequest(session, parts, method, supplied, url));
      }
      if (parts[1] === 'messaging' && parts[2] === 'rooms') {
        const id = parts[3], action = parts[4];
        if (parts.length === 4 && method === 'GET') {
          const { row, thread } = ownedRoom(session, id);
          activateRoom(session, id);
          const last_read_at = row.last_read_at ?? null;
          return json({ id, type: 'DM', app_source: 'chatgpt:messaging', aeon_id: row.id, name: row.display_name,
            dm_lifecycle_state: 'connected', created_at: row.created_at, updated_at: timestamp(thread.updatedAt), last_read_at,
            members: [{ account_user_id: session.accountUserId, name: session.name }, { account_user_id: row.id, aeon_id: row.id, name: row.display_name }],
            member_profile_snapshots: [], read_receipts: last_read_at ? [{ account_user_id: session.accountUserId, last_read_at }] : [],
            latest_messages: [...roomMessages(session, thread, row), ...roomQueue(row, thread).map(item => queuedView(session, item))].slice(-20),
          });
        }
        if (action === 'files' && (parts.length === 5 && method === 'POST' || parts.length === 6 && parts[5] !== 'uploads' && method === 'GET')) {
          return await roomFile(session, id, request, path, parts[5]);
        }
        if (parts.length === 5 && action === 'messages' && method === 'GET') {
          const { row, thread } = ownedRoom(session, id);
          const live = url.searchParams.get('live') === '1';
          const messages = roomMessages(session, thread, row, live), replyRoot = url.searchParams.get('reply_root_message_id');
          if (replyRoot != null && !messages.some(message => message.id === replyRoot)) throw error('找不到要回复的 Dot 消息。', 404, 'LOCAL_DOT_MESSAGE_NOT_FOUND');
          const queued = roomQueue(row, thread).map(item => queuedView(session, item));
          const scope = replyRoot == null ? (live ? messages : [...messages, ...queued]) : messages.filter(message => message.reply_root_message_id === replyRoot);
          const page = roomPage(scope, url.searchParams);
          if (live) {
            const last = thread.turns.at(-1);
            page.active_turn = last && (last.status === 'inProgress' || isRecovering(last)) ? {
              id: last.id, status: last.status, started_at: timestamp(last.startedAt),
              resumable: last.adapterMetadata?.resumable === true && !hasUncertainPlainResponse(last.adapterMetadata.checkpoint?.inFlight),
              resume_policy: last.adapterMetadata?.resumePolicy ?? null, resume_at: last.adapterMetadata?.checkpoint?.nextResumeAt ?? null,
            } : null;
            page.queued = queued;
          }
          return json(page);
        }
        if (parts.length === 6 && action === 'journal' && parts[5] === 'eligibility' && method === 'GET') {
          ownedRoom(session, id);
          return json({ enabled: true });
        }
        if (action === 'journal' && [5, 6].includes(parts.length) && ['GET','POST','PATCH','DELETE'].includes(method)) {
          const supplied = method === 'GET' ? null : await body(request);
          request.signal?.throwIfAborted();
          return await roomLock(session, () => journal(session, id, parts[5], method, supplied, url));
        }
        if (parts.length === 5 && action === 'queue' && method === 'POST') {
          const supplied = await body(request);
          request.signal?.throwIfAborted();
          await roomLock(session, () => drainQueue(session, id, supplied.continueAfterInterruption === true));
          return new Response(null, { status: 204 });
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
            publishRoomUpdate(update);
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
            const { row, data } = ownedRoom(session, id);
            if (action === 'read') {
              const readAt = Date.parse(safeText(supplied.last_read_at, 'Dot read time', 50));
              if (!Number.isFinite(readAt)) throw error('Invalid Dot read time');
              if (!(Date.parse(row.last_read_at) >= readAt)) {
                row.last_read_at = new Date(readAt).toISOString();
                save(session, data);
              }
              return new Response(null, { status: 204 });
            }
            const text = safeText(supplied.content?.text ?? '', 'Dot message', 100000);
            const requestId = safeText(supplied.request_id, 'Dot request ID');
            const files = await messageAttachments(supplied.content?.attachments, request.signal);
            if ((!text.trim() && !files.length) || !requestId || (supplied.idempotency_token != null && supplied.idempotency_token !== requestId)) throw error('Invalid Dot message or request ID');
            const replyId = supplied.reply_to == null ? null : safeText(supplied.reply_to.message_id, 'Dot reply message ID');
            request.signal?.throwIfAborted();
            if (!files.length && replyId == null) {
              const journal = /^\/journal(?:\s+(add|list|edit|delete)(?:\s+([\s\S]*))?)?\s*$/u.exec(text.trim());
              if (journal) return await roomLock(session, () => roomCommand(session, id, requestId, text, row => journalCommand(row, journal)));
              const automation = /^\/automation(?:\s+(add|list|run|off|on)(?:\s+([\s\S]*))?)?\s*$/u.exec(text.trim());
              if (automation) return await roomLock(session, () => {
                const result = roomCommand(session, id, requestId, text, (row, thread) => automationCommand(row, thread, requestId, automation));
                if (automation[1] === 'run') drainQueue(session, id, true);
                return result;
              });
            }
            return await roomLock(session, () => enqueueMessage(session, id, { requestId, text, replyId, files, createdAt: new Date(now()).toISOString() }));
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
        if (parts[3] === 'automations' && parts.length <= 6) {
          const supplied = method === 'GET' ? null : await body(request);
          request.signal?.throwIfAborted();
          return await roomLock(session, () => automations(session, parts[2], parts[4], parts[5] === 'run', method, supplied, url));
        }
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
          activateRoom(session, thread.id);
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
        if (parts[3] === 'environment' && parts[4] === 'wake') throw error('本站尚未配置云电脑执行服务。', 501, 'LOCAL_DOT_COMPUTER_UNCONFIGURED');
        if (parts[3] === 'voice') throw error('本站尚未配置 Dot 实时语音服务。', 501, 'LOCAL_DOT_REALTIME_UNCONFIGURED');
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
  function browserVoiceContext(threadId) {
    const session = identity(false);
    const thread = appServer?.threads?.get(threadId);
    if (!session || thread?.adapterMetadata?.conversationOrigin !== 'dot') return null;
    const row = profileForThread(session, threadId);
    if (!row || row.active_root_thread_id !== threadId) return null;
    return { accountId: session.accountId, userId: session.userId, profileId: row.id, threadId };
  }
  async function submitBrowserVoice(context, text, { signal } = {}) {
    const current = browserVoiceContext(context.threadId);
    if (!current || current.accountId !== context.accountId || current.userId !== context.userId || current.profileId !== context.profileId) {
      throw error('Dot 语音所属的帐号已变更。', 409, 'LOCAL_DOT_ACCOUNT_CHANGED');
    }
    const session = identity();
    signal?.throwIfAborted();
    const requestId = uuid();
    let resolve, reject;
    const answer = new Promise((resolveResult, rejectResult) => { resolve = resolveResult; reject = rejectResult; });
    const unsubscribe = appServer.subscribe(event => {
      const { method, params } = event;
      if (method !== 'turn/completed' || params.threadId !== context.threadId || params.turn.clientUserMessageId !== requestId) return;
      const turn = params.turn;
      if (turn.status !== 'completed') {
        reject(error(turn.error?.message || '这条语音消息的回复中断了。请查看 Dot 对话。', 503, 'LOCAL_DOT_VOICE_TURN_INTERRUPTED'));
        return;
      }
      const result = turn.items.filter(item => item.type === 'agentMessage' && item.phase !== 'commentary').map(item => item.text).join('\n').trim();
      if (result) resolve(result);
      else reject(error('Dot 没有返回可朗读的正文。', 503, 'LOCAL_DOT_VOICE_NO_REPLY'));
    });
    const abort = () => reject(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    try {
      return await Promise.all([roomLock(session, () => {
        signal?.throwIfAborted();
        assertIdentity(session);
        const data = state(session);
        const row = findProfile(data, context.profileId);
        if (row.active_root_thread_id !== context.threadId) throw error('Dot 语音对话已更换。', 409, 'LOCAL_DOT_THREAD_NOT_FOUND');
        if (row.messaging_room_id !== context.threadId) {
          row.messaging_room_id = context.threadId;
          save(session, data);
        }
        activateRoom(session, context.threadId);
        const next = { requestId, text: safeText(text, 'Dot transcript', 100000), replyId: null, files: [], createdAt: new Date(now()).toISOString() };
        if (!next.text.trim()) throw error('没有可发送的语音文本。');
        const accepted = enqueueMessage(session, context.threadId, next);
        if (!accepted.ok) throw error('语音文本未能保存到 Dot。', 503);
        // Page transport readers receive the real submitted text and its eventual reply.
        return accepted.json().then(message => publishRoomUpdate({ type: 'calpico-message-add', payload: { room_id: context.threadId, message } }));
      }), answer]).then(([, result]) => result);
    } finally {
      unsubscribe();
      signal?.removeEventListener('abort', abort);
    }
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
        const prompt = params.responsesapiClientMetadata?.dotUserText;
        const route = sendsMessage ? selectLocalDotModel(typeof prompt === 'string' ? [{ type: 'text', text: prompt }] : params.input) : dotRoutes.find(choice => choice.model === thread.model) ?? dotDefault;
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
      for (const key of ['code', 'status', 'transportStatus', 'requestId', 'providerCode', 'param', 'requiresTransportResume', 'hostFailureCounted']) if (cause?.[key] != null) failure[key] = cause[key];
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
  /** b634 jiwy exports separate account, navigation, and local-computer capabilities. */
  function adaptCapabilityAtoms(original, requireOriginal) {
    const derive = requireOriginal('Q840').c, scope = requireOriginal('OWtl').a;
    const inputs = requireOriginal('Cslg').n;
    const capable = derive(scope, ({ get }) => {
      if (!usesSitePolicy()) return get(original.d);
      const auth = get(inputs);
      const isLoading = auth?.authLoading === true || auth?.accountLoading === true;
      const session = identity(false);
      const matches = session != null && auth?.authenticatedAccountId === session.accountId && auth?.authenticatedUserId === session.userId;
      const local = getLocalDotPolicy();
      return { ...local, isLoading, isCapable: !isLoading && matches && local.isCapable, retainNavigation: false, unresolved: false };
    });
    const available = derive(scope, ({ get }) => usesSitePolicy() ? get(capable).isCapable : get(original.e));
    return {
      a: derive(scope, ({ get }) => {
        if (!usesSitePolicy()) return get(original.a);
        const auth = get(inputs);
        return auth?.authenticatedAccountId && auth?.authenticatedUserId ? get(available) : null;
      }),
      b: (stateScope, accountId) => {
        if (!usesSitePolicy()) return original.b(stateScope, accountId);
        const session = identity(false);
        return session != null && session.accountId === accountId && stateScope.get(available);
      },
      c: (stateScope, owner) => {
        if (!usesSitePolicy()) return original.c(stateScope, owner);
        const session = identity(false);
        return session != null && session.accountId === owner?.accountId && session.userId === owner?.userId &&
          stateScope.get(available);
      },
      d: capable,
      e: available,
      f: derive(scope, ({ get }) => usesSitePolicy() ? { ...get(capable), isCapable: false } : get(original.f)),
      g: derive(scope, ({ get }) => usesSitePolicy() ? get(capable) : get(original.g)),
      j: stateScope => {
        if (!usesSitePolicy()) return original.j(stateScope);
        if (!stateScope.get(available)) throw error('The local Dot provider is unavailable', 503);
      },
    };
  }
  return { handle, createRpcFacade, subscribeRoomMessages, complete, getLocalDotPolicy, adaptCapabilityAtoms, browserVoiceContext, submitBrowserVoice,
    provenance: Object.freeze({ provider: LOCAL_DOT_SOURCE, profileNamespace: '/tbo', cloudComputer: false, defaultAppearance: LOCAL_DOT_DEFAULT_APPEARANCE }) };
}
