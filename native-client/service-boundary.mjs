import * as modelCatalog from '../model-catalog.js?v=af4b4c8d85347af9';
import { createModelCatalogAdapter } from './model-catalog-adapter.mjs?v=af4b4c8d85347af9';
import { DEFAULT_SETTINGS } from '../config.js?v=af4b4c8d85347af9';
import { streamCompletion, PythonRuntime, PYTHON_TOOL } from '../runtime.js?v=af4b4c8d85347af9';
import { LocalAppServer, LocalProtocolSocket } from './local-app-server.mjs?v=af4b4c8d85347af9';
import { getPrototypeLocalSession, getPrototypeLocalAuth, getLocalAccountCheck, getLocalOptimizedAccount, getLocalWhamAccounts, getPrototypeCurrentUser, isPrototypeLocalSession, clearPrototypeLocalSession, getLocalSignedOutUrl, getLocalAccountStorageKey } from './local-identity.mjs?v=af4b4c8d85347af9';
import { getPrototypeConfiguration, setLocalLibraryAvailability } from './local-configuration.mjs?v=af4b4c8d85347af9';
import { ClassicChatAdapter } from './classic-chat-adapter.mjs?v=af4b4c8d85347af9';
import { LocalConversationPubSub } from './local-pubsub.mjs?v=af4b4c8d85347af9';
import { readLocalUserPreferences, updateLocalUserPreference, acknowledgeLocalAnnouncement } from './local-user-preferences.mjs?v=af4b4c8d85347af9';
import { createLocalPersonalizationService } from './local-personalization-service.mjs?v=af4b4c8d85347af9';
import { createPersonalizationIdentityProvider, createPersonalizedSettingsReader } from './local-personalization-context.mjs?v=af4b4c8d85347af9';
import { createBrowserToolExecutor } from './browser-tool-executor.mjs?v=af4b4c8d85347af9';
import { createLocalFilesService } from './local-files-service.mjs?v=af4b4c8d85347af9';
import { createLocalLibraryService } from './local-library-service.mjs?v=af4b4c8d85347af9';
import { createLibraryPublishingExecutor, normalizePublicationReceipt } from './local-library-publisher.mjs?v=af4b4c8d85347af9';
import { createPublishedResourceRehydrator } from './published-resource-rehydration.mjs?v=af4b4c8d85347af9';
import { createNativeLibraryRefresh } from './native-library-refresh.mjs?v=af4b4c8d85347af9';
import { createLocalInputPreparer } from './local-input-preparation.mjs?v=af4b4c8d85347af9';
import { createLocalPricingAdapter } from './local-pricing.mjs?v=af4b4c8d85347af9';
import { SITE_ACCOUNT_SERVICE, getSiteAccount, getSiteSessionToken, hasModelSelectionAccess, logoutSiteAccount } from './site-account.mjs?v=af4b4c8d85347af9';
import { createLocalCodexAdapter } from './local-codex-adapter.mjs?v=af4b4c8d85347af9';
import { isOpenStreetMapTileRequest, fetchOpenStreetMapTile } from './local-map-provider.mjs?v=af4b4c8d85347af9';
import { createLocalDiscoveryAdapter } from './local-discovery.mjs?v=af4b4c8d85347af9';
import { createLocalDotAdapter } from './local-dot-adapter.mjs?v=af4b4c8d85347af9';
import { createLocalMapsService } from './local-maps-service.mjs?v=af4b4c8d85347af9';
import { createPreferredHostTransport, createPreferredCompletion, turnHostCheckpoints, cancelTurnHostRequests } from './preferred-host-transport.mjs?v=af4b4c8d85347af9';
import { createChatHistorySync, projectChatHistoryThread } from './chat-history-sync.mjs?v=af4b4c8d85347af9';
import { createAccountHistoryCoordinator } from './account-history-coordinator.mjs?v=af4b4c8d85347af9';
import { createNativeCloudSyncFeedback } from './native-cloud-sync-feedback.mjs?v=af4b4c8d85347af9';

export const localModelAdapter = createModelCatalogAdapter(modelCatalog);
export const localProtocolDiagnostics = [];
// Original analytics retries must never grow an unbounded browser log.
localProtocolDiagnostics.push = function (...events) {
  const size = Array.prototype.push.apply(this, events);
  if (size > 500) this.splice(0, size - 500);
  return this.length;
};
const getPersonalizationIdentity = createPersonalizationIdentityProvider({ getSiteAccount, getLocalIdentity: getPrototypeLocalAuth, getStorageKey: getLocalAccountStorageKey });
export const localPersonalizationService = createLocalPersonalizationService({
  storage: {
    getItem: key => globalThis.localStorage.getItem(key),
    setItem: (key, value) => globalThis.localStorage.setItem(key, value),
    removeItem: key => globalThis.localStorage.removeItem(key),
  },
  getIdentity: getPersonalizationIdentity, getStorageKey: getLocalAccountStorageKey,
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
const readPersonalizedSettings = createPersonalizedSettingsReader({ readSettings: () => ({ ...DEFAULT_SETTINGS }), personalization: localPersonalizationService, getIdentity: getPersonalizationIdentity });
// A local preview/session flag is not a verified site account. File ownership
// must use the same boot-bound identity guard as account-owned preferences.
const getOwnedFileAccountId = () => getPersonalizationIdentity()?.accountId ?? null;
export const localPreferredHostTransport = createPreferredHostTransport({ baseURL: SITE_ACCOUNT_SERVICE,
  fetchImpl: (...args) => globalThis.fetch(...args), getSiteAccount, getSiteSessionToken,
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
export const localPreferredCompletion = createPreferredCompletion({ runtimeCompletion: streamCompletion, preferredTransport: localPreferredHostTransport,
  enabled: () => globalThis.__CHATGPT_REPLICA_ENV__?.preferredHostEnabled === true,
});
const localWorkspaceExecutor = createBrowserToolExecutor({ PythonRuntime, PYTHON_TOOL,
  getWorkspaceNamespace: () => hasModelSelectionAccess() ? null : getSiteAccount()?.accountId ?? 'guest',
});
export const localFilesService = createLocalFilesService({ storage: localWorkspaceExecutor.storage,
  metadataStorage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) },
  getAccountId: getOwnedFileAccountId,
  getWorkspacePrefix: localWorkspaceExecutor.getWorkspacePrefix, diagnostics: localProtocolDiagnostics,
  getOwnedSourceWorkspace: ({ threadId, signal }) => {
    signal?.throwIfAborted();
    const accountId = getOwnedFileAccountId(), thread = localAppServer.threads.get(threadId);
    if (!accountId || !thread) throw Object.assign(Error('The source conversation is unavailable for this verified account'), { status: 404, code: 'publication_source_unavailable' });
    if (thread.ephemeral) throw Object.assign(Error('Temporary conversations cannot publish permanent Library files'), { status: 409, code: 'publication_ephemeral' });
    return { accountId, threadId, prefix: localWorkspaceExecutor.getWorkspacePrefix(threadId) };
  },
});
export const localLibraryService = createLocalLibraryService({ files: localFilesService,
  metadataStorage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) },
  getAccountId: getOwnedFileAccountId, diagnostics: localProtocolDiagnostics,
});
export const localLibraryByteTransport = Object.freeze({
  ownsObjectURL: value => localLibraryService.ownsObjectURL(value),
  fetch: (value, options) => globalThis.fetch(value, options),
});
let nativeLibraryClient = null, nativeLibraryInvalidator = null;
const localNativeLibraryRefresh = createNativeLibraryRefresh({
  getIdentity: getPersonalizationIdentity, getClient: () => nativeLibraryClient,
  invalidate: (...args) => {
    if (typeof nativeLibraryInvalidator !== 'function') throw Error('Original Library cache service is not ready');
    return nativeLibraryInvalidator(...args);
  },
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
export function notifyNativeLibrarySourceReady() { void localNativeLibraryRefresh.notifyReady(); }
export function registerNativeLibrarySource(client, invalidate) {
  if (client === nativeLibraryClient && invalidate === nativeLibraryInvalidator) return;
  nativeLibraryClient = client ?? null; nativeLibraryInvalidator = invalidate ?? null;
  // Original provider renders only register identity. Native cache work runs
  // outside render and only when an actual committed file made it dirty.
  queueMicrotask(notifyNativeLibrarySourceReady);
}
export const localToolExecutor = createLibraryPublishingExecutor({
  baseExecutor: localWorkspaceExecutor, getIdentity: getPersonalizationIdentity,
  publishGeneratedFile: getPersonalizationIdentity() ? async (...args) => {
    const receipt = await localFilesService.publishGeneratedFile(...args);
    try { void localNativeLibraryRefresh.notifyCommitted(receipt).catch(() => localProtocolDiagnostics.push({ type: 'native-library-refresh-observer-error' })); }
    catch { localProtocolDiagnostics.push({ type: 'native-library-refresh-observer-error' }); }
    return receipt;
  } : undefined,
  resolvePublishedResource: (...args) => localLibraryService.resolvePublishedResource(...args),
  ownsObjectURL: value => localLibraryService.ownsObjectURL(value),
});
setLocalLibraryAvailability(() => localLibraryService.source.nativeNodeListing === true
  && localLibraryService.source.rawFileListing === true && localLibraryService.source.localFolders === true
  && localLibraryService.source.permanentDelete === true);
globalThis.addEventListener('pagehide', () => { localLibraryService.dispose(); localNativeLibraryRefresh.dispose(); });
export const localPricingAdapter = createLocalPricingAdapter({ diagnostics: localProtocolDiagnostics, readMembership: () => getSiteAccount() });
export const localDiscoveryAdapter = createLocalDiscoveryAdapter({ storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }, getAccountId: () => getPrototypeLocalAuth()?.accountId ?? null, diagnostics: localProtocolDiagnostics });
export const localMapsService = createLocalMapsService({ storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }, getAccountId: () => getPrototypeLocalAuth()?.accountId ?? null, diagnostics: localProtocolDiagnostics });
// Verified site ownership and the local namespace are both bound at boot.
// A preview flag, prototype account ID or late login cannot claim cloud history.
const getHistoryIdentity = () => {
  const local = getPersonalizationIdentity(), site = getSiteAccount();
  return local && site?.id ? { ownerId: site.id, accountId: local.accountId, namespace: getLocalAccountStorageKey('cg-original-app-server:v1') } : null;
};
export let localAccountHistory = null;
let historyFeedback = null, nativeHistoryToaster = () => null, historyApplying = false;
export const localAppServer = new LocalAppServer({
  storage: {
    getItem: key => globalThis.localStorage.getItem(getLocalAccountStorageKey(key)),
    setItem: (key, value) => globalThis.localStorage.setItem(getLocalAccountStorageKey(key), value),
  },
  streamCompletion: localPreferredCompletion,
  onIdleTurnInterrupt: ({ turn, reason }) => Promise.all(turnHostCheckpoints(turn).map(checkpoint => (reason === 'pagehide' ? localPreferredHostTransport.detach : localPreferredHostTransport.cancel)(checkpoint, { onCheckpoint: () => localAppServer.persist() }))),
  readSettings: readPersonalizedSettings,
  models: localModelAdapter,
  catalog: modelCatalog,
  diagnostics: localProtocolDiagnostics,
  toolExecutor: localToolExecutor,
  prepareUserInput: createLocalInputPreparer({ files: localFilesService }),
  agentOptions: { toolTransport: 'responses', verifiedPriority: false, ultraOrchestration: true },
  getExecutionPolicy: () => ({ modelSelection: hasModelSelectionAccess() }),
  onPersist: threads => localAccountHistory?.capture(threads),
});
export const localConversationPubSub = new LocalConversationPubSub(localAppServer);
const localPublishedResourceRehydrator = getPersonalizationIdentity() ? createPublishedResourceRehydrator({
  normalizeReceipt: normalizePublicationReceipt, getIdentity: getPersonalizationIdentity, projectThread: projectChatHistoryThread,
  resolvePublishedResource: (...args) => localLibraryService.resolvePublishedResource(...args),
  ownsObjectURL: value => localLibraryService.ownsObjectURL(value),
  onDiagnostic: event => localProtocolDiagnostics.push(event),
}) : null;
const publicationRestorations = new Map();
export function initializeLocalPublishedResources({ threadId = null, signal } = {}) {
  if (!localPublishedResourceRehydrator) return Promise.resolve({ ok: true, signedOut: true });
  const key = threadId ?? '*';
  if (publicationRestorations.has(key)) return publicationRestorations.get(key);
  const operation = (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    const abort = () => controller.abort(signal.reason);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const waitForResources = promise => new Promise((resolve, reject) => {
      const interrupted = () => reject(controller.signal.reason ?? new DOMException('Resource restoration interrupted', 'AbortError'));
      if (controller.signal.aborted) { void Promise.resolve(promise).catch(() => {}); interrupted(); return; }
      controller.signal.addEventListener('abort', interrupted, { once: true });
      Promise.resolve(promise).then(value => { controller.signal.removeEventListener('abort', interrupted); resolve(value); }, error => { controller.signal.removeEventListener('abort', interrupted); reject(error); });
    });
    let targets = threadId ? [threadId] : [...localAppServer.threads.keys()], updatedCount = 0;
    try {
      for (let attempt = 0; attempt < 2 && targets.length; attempt++) {
        const records = targets.map(id => localAppServer.threads.get(id)).filter(thread => thread && !thread.ephemeral && !localAppServer.running.has(thread.id));
        const plan = await waitForResources(localPublishedResourceRehydrator.rehydrateHistory(records, { signal: controller.signal }));
        controller.signal.throwIfAborted();
        if (!plan.safeToApply || !getPersonalizationIdentity()) throw Error('Resource restoration no longer belongs to the verified account');
        const applied = localAppServer.applyToolResultPresentation(plan.pairs, { projectThread: projectChatHistoryThread });
        updatedCount += applied.updated.length; targets = applied.skipped;
      }
      return { ok: true, updatedCount, deferredCount: targets.length };
    } catch (error) {
      localProtocolDiagnostics.push({ type: 'local-publication-links-deferred', code: typeof error.code === 'string' ? error.code : 'LOCAL_LIBRARY_RESOURCE_RESTORE_DEFERRED' });
      return { ok: false, updatedCount };
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  })().finally(() => publicationRestorations.delete(key));
  publicationRestorations.set(key, operation); return operation;
}
const historyIdentity = getHistoryIdentity();
if (historyIdentity) {
  historyFeedback = createNativeCloudSyncFeedback({
    ownerId: historyIdentity.ownerId, getOwnerId: () => getHistoryIdentity()?.ownerId,
    getToaster: () => nativeHistoryToaster(),
    onRetry: ({ signal }) => localAccountHistory.synchronize({ signal }),
    onResolveConflict: (id, choice) => localAccountHistory.resolveConflict(id, choice),
  });
  const feedback = historyFeedback;
  localAccountHistory = createAccountHistoryCoordinator({
    appServer: localAppServer, getIdentity: getHistoryIdentity, projectThread: projectChatHistoryThread,
    createSync: () => createChatHistorySync({ baseURL: SITE_ACCOUNT_SERVICE,
      fetchImpl: (...args) => globalThis.fetch(...args), getIdentity: getHistoryIdentity,
      getSessionToken: getSiteSessionToken, onDiagnostic: event => localProtocolDiagnostics.push(event),
    }),
    onFeedback: event => feedback.report(event),
    onClearFeedback: event => { if (event.ownerId === historyIdentity.ownerId) feedback.clear(event.kind, event.conversationId); },
    onDiagnostic: event => localProtocolDiagnostics.push(event),
    onApplied: ({ added, updated, removed }) => {
      historyApplying = true;
      try {
      for (const id of removed) {
        localConversationPubSub.publish('conversation-history-update', { conversation_id: id, update_type: 'conversation-deleted' });
        localAppServer.notify('thread/deleted', { threadId: id });
      }
      for (const id of added) localAppServer.notify('thread/started', { thread: localAppServer.snapshot(localAppServer.threads.get(id), false) });
      for (const id of updated) {
        const thread = localAppServer.threads.get(id);
        if (!thread || localAppServer.running.has(id)) continue;
        localAppServer.notify('thread/name/updated', { threadId: id, threadName: thread.name });
        localAppServer.notify(thread.archived ? 'thread/archived' : 'thread/unarchived', { threadId: id });
        const turn = thread.turns.at(-1);
        if (turn) localAppServer.notify('turn/completed', { threadId: id, turn });
      }
      } finally { historyApplying = false; }
    },
  });
  localAppServer.subscribe(event => {
    if (!historyApplying && event.method === 'turn/completed') void localAccountHistory.synchronize();
  });
}
export function initializeLocalAccountHistory() { return localAccountHistory?.start() ?? Promise.resolve({ ok: true, signedOut: true }); }
export function setNativeAccountHistoryToaster(provider) {
  nativeHistoryToaster = typeof provider === 'function' ? provider : () => null;
  historyFeedback?.flush();
}
async function finishAccountHistoryBeforeLogout() {
  if (!localAccountHistory) return;
  const controller = new AbortController(), deadline = setTimeout(() => controller.abort(), 8000);
  try {
    do {
      const outcome = await localAccountHistory.synchronize({ signal: controller.signal });
      if (!outcome.ok || outcome.deferred || outcome.conflictCount || !outcome.pending) break;
    } while (!controller.signal.aborted);
  } finally { clearTimeout(deadline); localAccountHistory.dispose(); historyFeedback?.dispose(); }
}
export const localDotAdapter = createLocalDotAdapter({
  storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) },
  appServer: localAppServer, getIdentity: getPrototypeLocalAuth, isLocalSession: isPrototypeLocalSession,
  readSettings: () => ({ ...DEFAULT_SETTINGS }), getCapabilities: getLocalExecutionCapabilities, diagnostics: localProtocolDiagnostics,
});
export const localClassicChatAdapter = new ClassicChatAdapter({ appServer: localAppServer, models: localModelAdapter, onConversationChange: (type, payload) => localConversationPubSub.publish(type, payload) });
export const localCodexAdapter = createLocalCodexAdapter({ appServer: localAppServer, models: localModelAdapter, readSettings: () => ({ ...DEFAULT_SETTINGS }), getIdentity: getPrototypeLocalAuth, isLocalSession: isPrototypeLocalSession, getCapabilities: getLocalExecutionCapabilities, diagnostics: localProtocolDiagnostics });
export function getLocalExecutionCapabilities() {
  return { executionSource: 'local-app-server',
    textConversations: Boolean(DEFAULT_SETTINGS.apiBase && DEFAULT_SETTINGS.apiKey && typeof streamCompletion === 'function' && typeof localAppServer.dispatch === 'function' && modelCatalog.WORK_MODEL_IDS.length),
    openaiCloudEntitlement: false, modelSelection: hasModelSelectionAccess(), filesystem: true, tools: localToolExecutor.tools.map(tool => tool.function.name), filesystemScope: 'browser-origin-workspace', pythonEnvironment: 'pyodide-webassembly' };
}

/** Only local assets/adapters and the explicitly configured gateway can run. */
export function installNetworkBoundary() {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const diagnostics = localProtocolDiagnostics;
  const localCsrfToken = crypto.randomUUID();
  const gateway = new URL(DEFAULT_SETTINGS.apiBase);
  const cleanPath = gateway.pathname.replace(/\/+$/, '');
  const apiPath = cleanPath.endsWith('/v1') ? cleanPath : `${cleanPath}/v1`;
  const gatewayPaths = new Set([`${apiPath}/chat/completions`, `${apiPath}/responses`, `${apiPath}/models`]);
  const response = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  const isTelemetry = url => /^(?:\/ces\/v1\/(?:rgstr|telemetry\/intake)|\/v1\/(?:sdk_exception|rgstr)|\/api\/v2\/(?:logs|rum))\/?$/.test(url.pathname);
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url, location.href);
    const local = url.origin === location.origin;
    const deploymentBase = globalThis.__CHATGPT_REPLICA_ENV__?.basePath || '/';
    const adapterPrefix = new URL('./', import.meta.url).pathname;
    if (local && (url.pathname.startsWith(adapterPrefix) || url.pathname.startsWith(deploymentBase+'original-client/public/'))) {
      const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie');
      return originalFetch(new Request(request, {headers,credentials:'omit'}));
    }
    if (url.protocol === 'blob:' && ['GET', 'HEAD'].includes(request.method) && localLibraryService.ownsObjectURL(url.href)) {
      const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie');
      return originalFetch(new Request(request, { headers, credentials: 'omit' }));
    }
    if (isOpenStreetMapTileRequest(request)) return fetchOpenStreetMapTile(originalFetch, request);
    if (url.origin === SITE_ACCOUNT_SERVICE && /^\/(?:auth\/(?:login|register|session|logout)|bridge\/status|usage|jobs(?:\/[^/]+(?:\/events)?)?|sync\/(?:conversations(?:\/[^/]+)?|changes|batch))$/.test(url.pathname)) return originalFetch(new Request(request, { credentials: 'omit', redirect: 'error' }));
    // Consume analytics locally; never forward captured telemetry to its vendor.
    if (isTelemetry(url)) return response({ success: true });
    if (local && (/^\/cdn\//.test(url.pathname) || /^\/__prototype\//.test(url.pathname))) {
      const headers = new Headers(request.headers);
      headers.delete('Authorization');
      headers.delete('Cookie');
      return originalFetch(new Request(request, { headers, credentials: 'omit' }));
    }
    if (url.origin === gateway.origin && gatewayPaths.has(url.pathname)) {
      diagnostics.push({ type: 'authorized-gateway-request', method: request.method, path: url.pathname });
      return originalFetch(new Request(request, { credentials: 'omit', redirect: 'error' }));
    }
    // Normalize the deployment basename at the service boundary.
    if (local && deploymentBase !== '/' && url.pathname.startsWith(deploymentBase)) url.pathname = '/' + url.pathname.slice(deploymentBase.length);
    // Log the contract name, never query parameters, headers or payload values.
    diagnostics.push({ type: 'request', method: request.method, path: url.pathname });
    // Original ci3G.b validates non-empty csrfToken and signout {url};
    // AqQr then runs its existing local cleanup and same-origin navigation.
    if (request.method === 'GET' && /\/api\/auth\/csrf$/.test(url.pathname)) return response({ csrfToken: localCsrfToken });
    if (request.method === 'POST' && /\/api\/auth\/signout$/.test(url.pathname)) {
      const body = new URLSearchParams(await request.text());
      if (body.get('csrfToken') !== localCsrfToken) return response({ error: 'Invalid local signout token' }, 403);
      const target = getLocalSignedOutUrl();
      localAppServer.interruptAll({ reason: 'logout' });
      const stopResults = await cancelTurnHostRequests(localPreferredHostTransport, [...localAppServer.threads.values()].flatMap(thread => thread.turns), { onCheckpoint: () => localAppServer.persist() });
      for (const result of stopResults) if (result.status === 'rejected') diagnostics.push({ type: 'local-signout-host-cancel-unconfirmed', code: result.reason?.code ?? null });
      await finishAccountHistoryBeforeLogout();
      localNativeLibraryRefresh.dispose();
      localLibraryService.dispose();
      await logoutSiteAccount();
      clearPrototypeLocalSession({ reload: false });
      return response({ url: target });
    }
    if (/\/api\/auth\/session$/.test(url.pathname)) return response(getPrototypeLocalSession() ?? {});
    if (request.method === 'GET' && /\/api\/auth\/account-picker$/.test(url.pathname)) return response({ unified_sessions: [] });
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?me\/?$/.test(url.pathname)) return response(getPrototypeCurrentUser() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?accounts\/optimized\/check\/?$/.test(url.pathname)) return response(getLocalOptimizedAccount() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?wham\/accounts\/check\/?$/.test(url.pathname)) return response(getLocalWhamAccounts());
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?settings\/user\/?$/.test(url.pathname)) return response(readLocalUserPreferences());
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?system_hints\/?$/.test(url.pathname)) {
      const hints = url.searchParams.get('mode') === 'basic' ? [{ system_hint: 'reason', name: '思考一下', action_label: '思考一下', aliases: [], required_features: [], required_models: [], required_conversation_modes: [], allow_in_temporary_chat: true, requires_personalization: false, surfaces: ['chat'], description: '' }] : [];
      return response({ system_hints: hints });
    }
    if (request.method === 'PATCH' && /^\/(?:__codex-api\/|backend-api\/)?settings\/account_user_setting\/?$/.test(url.pathname)) {
      let value = url.searchParams.get('value');
      try { value = JSON.parse(value); } catch {}
      return response(updateLocalUserPreference(url.searchParams.get('feature'), value));
    }
    if (request.method === 'POST' && /^\/(?:__codex-api\/|backend-api\/)?settings\/announcement_viewed\/?$/.test(url.pathname)) return response(acknowledgeLocalAnnouncement(url.searchParams.get('announcement_id')));
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?accounts\/check(?:\/[^/]+)?\/?$/.test(url.pathname)) return response(getLocalAccountCheck());
    if (request.method === 'POST' && /\/v1\/initialize\/?$/.test(url.pathname)) {
      let requestedUser;
      try { requestedUser = (await request.clone().json()).user; } catch {}
      return response(localCodexAdapter.mergeConfiguration(getPrototypeConfiguration(requestedUser)));
    }
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?(?:tpp\/)?models\/?$/.test(url.pathname)) {
      diagnostics.push({ type: 'local-adapter', service: 'models', source: 'model-catalog.js', capabilitySource: modelCatalog.WORK_CATALOG_PROVENANCE.pinned });
      return response(/\/tpp\/models\/?$/.test(url.pathname) ? localModelAdapter.getWorkModels() : localModelAdapter.getChatGptModels());
    }
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?celsius\/ws\/user\/?$/.test(url.pathname)) {
      const socket = new URL('/__prototype/local-conversations', location.href);
      socket.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return response({ websocket_url: socket.href, adapter_source: 'local-conversation-pubsub-not-openai-cloud' });
    }
    const adapterPath = url.pathname.replace(/^\/(?:__codex-api|backend-api)(?=\/)/, '');
    try {
      const personalization = await localPersonalizationService.handle(request, adapterPath);
      if (personalization) return personalization;
      const artifact = await localToolExecutor.handleArtifactRequest(request, adapterPath);
      if (artifact) return artifact;
      const dot = await localDotAdapter.handle(request, adapterPath);
      if (dot) return dot;
      const maps = await localMapsService.handle(request, adapterPath);
      if (maps) return maps;
      const pricing = await localPricingAdapter.handle(request, adapterPath);
      if (pricing) return pricing;
      const discovery = await localDiscoveryAdapter.handle(request, adapterPath);
      if (discovery) return discovery;
      const library = await localLibraryService.handle(request, adapterPath);
      if (library) return library;
      const files = await localFilesService.handle(request, adapterPath);
      if (files) return files;
      if (request.method === 'GET' && /^\/conversation\/[^/]+$/.test(adapterPath)) await initializeLocalPublishedResources({ threadId: decodeURIComponent(adapterPath.split('/')[2]), signal: request.signal });
      const classic = await localClassicChatAdapter.handle(request, adapterPath);
      if (classic) return classic;
    } catch (error) {
      return response({ error: { message: error.message, code: 'LOCAL_ADAPTER_ERROR' } }, error.code === -32601 ? 501 : error.code === -32001 ? 404 : 400);
    }
    return response({ error: { code: 'LOCAL_ADAPTER_UNIMPLEMENTED', message: `Local adapter is not implemented for ${request.method} ${url.pathname}` } }, 501);
  };
  class DeniedConnection {
    constructor() { throw new DOMException('External connections are disabled in this local prototype', 'NotSupportedError'); }
  }
  globalThis.WebSocket = class LocalOnlyWebSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    constructor(address) {
      const url = new URL(address, location.href);
      if (['ws:', 'wss:'].includes(url.protocol) && url.host === location.host && url.pathname === '/__prototype/local-conversations') return localConversationPubSub.open(url.href);
      throw new DOMException('Only the declared local conversation socket is available', 'NotSupportedError');
    }
  };
  globalThis.EventSource = DeniedConnection;
  globalThis.XMLHttpRequest = DeniedConnection;
  try { Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: address => { try { return isTelemetry(new URL(address, location.href)); } catch { return false; } } }); } catch {}
  const originalOpen = window.open.bind(window);
  window.open = (url, ...rest) => {
    const target = new URL(url ?? 'about:blank', location.href);
    if (!['http:', 'https:', 'about:'].includes(target.protocol)) {
      diagnostics.push({ type: 'navigation-unavailable', origin: target.origin });
      return null;
    }
    const opened = originalOpen(target.href, ...rest);
    if (opened && target.origin !== location.origin) try { opened.opener = null; } catch {}
    return opened;
  };
  document.addEventListener('click', event => {
    const link = event.target instanceof Element && event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    const ownedDownload = url.protocol === 'blob:' && link.hasAttribute('download') && localLibraryService.ownsObjectURL(url.href);
    if (!ownedDownload && !['http:', 'https:'].includes(url.protocol)) {
      event.preventDefault();
      event.stopPropagation();
      diagnostics.push({ type: 'navigation-unavailable', origin: url.origin });
    }
  }, true);
  window.addEventListener('pagehide', () => localAppServer.interruptAll({ reason: 'pagehide' }));
  return { diagnostics };
}

/**
 * EAKz.a keeps its original protocol/reconciliation implementation. This local
 * transport now supports real text turns via the authorized gateway. Tools,
 * filesystem and cloud execution remain explicit unsupported RPC errors.
 */
export class LocalAppServerSocket extends LocalProtocolSocket {
  constructor(diagnostics = localProtocolDiagnostics, server = localAppServer) {
    super(server, diagnostics);
    const auth = getPrototypeLocalAuth();
    if (auth) this.authenticatedPrincipal = { accountId: auth.accountId, userId: auth.userId };
  }
}
