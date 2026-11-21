import { originalAssetURL } from './startup-compatibility.mjs?v=923e7f59b16a7c09';
import { nativeWebSearchHint } from './local-web-search.mjs?v=923e7f59b16a7c09';
import { createLocalReadAloudSource } from './local-native-read-aloud.mjs?v=923e7f59b16a7c09';
import * as modelCatalog from '../model-catalog.js?v=923e7f59b16a7c09';
import { createModelCatalogAdapter } from './model-catalog-adapter.mjs?v=923e7f59b16a7c09';
import { DEFAULT_SETTINGS } from '../config.js?v=923e7f59b16a7c09';
import { streamCompletion, PythonRuntime, PYTHON_TOOL } from '../runtime.js?v=923e7f59b16a7c09';
import { LocalAppServer, LocalProtocolSocket } from './local-app-server.mjs?v=923e7f59b16a7c09';
import { getPrototypeLocalSession, getPrototypeLocalAuth, getLocalAccountCheck, getLocalOptimizedAccount, getLocalWhamAccounts, getPrototypeCurrentUser, isPrototypeLocalSession, clearPrototypeLocalSession, getLocalAccountStorageKey } from './local-identity.mjs?v=923e7f59b16a7c09';
import { getPrototypeConfiguration, setLocalLibraryAvailability } from './local-configuration.mjs?v=923e7f59b16a7c09';
import { ClassicChatAdapter } from './classic-chat-adapter.mjs?v=923e7f59b16a7c09';
import { createPortableConversationShare } from './portable-conversation-share.mjs?v=923e7f59b16a7c09';
import { createClassicResponseActions } from './classic-response-branches.mjs?v=923e7f59b16a7c09';
import { LocalConversationPubSub } from './local-pubsub.mjs?v=923e7f59b16a7c09';
import { readLocalUserPreferences, updateLocalUserPreference, acknowledgeLocalAnnouncement } from './local-user-preferences.mjs?v=923e7f59b16a7c09';
import { createLocalPersonalizationService } from './local-personalization-service.mjs?v=923e7f59b16a7c09';
import { createPersonalizationIdentityProvider, createConversationIdentityProvider, createPersonalizedSettingsReader } from './local-personalization-context.mjs?v=923e7f59b16a7c09';
import { createBrowserToolExecutor, workspacePath } from './browser-tool-executor.mjs?v=923e7f59b16a7c09';
import { createWorkspaceDownloadSource } from './local-workspace-download-source.mjs?v=923e7f59b16a7c09';
import { createLocalWorkspaceDownloadService } from './local-workspace-download-service.mjs?v=923e7f59b16a7c09';
import { createOwnedDownloadTransport } from './owned-download-transport.mjs?v=923e7f59b16a7c09';
import { createLocalFilesService } from './local-files-service.mjs?v=923e7f59b16a7c09';
import { createLocalLibraryService } from './local-library-service.mjs?v=923e7f59b16a7c09';
import { createLibraryPublishingExecutor, normalizePublicationReceipt } from './local-library-publisher.mjs?v=923e7f59b16a7c09';
import { createPublishedResourceRehydrator } from './published-resource-rehydration.mjs?v=923e7f59b16a7c09';
import { createNativeLibraryRefresh } from './native-library-refresh.mjs?v=923e7f59b16a7c09';
import { createNativePublicationReferences } from './native-publication-references.mjs?v=923e7f59b16a7c09';
import { createNativeWorkspaceReferences } from './native-workspace-references.mjs?v=923e7f59b16a7c09';
import { createNativeFileReferenceComposition } from './native-file-reference-composition.mjs?v=923e7f59b16a7c09';
import { createLocalInputPreparer } from './local-input-preparation.mjs?v=923e7f59b16a7c09';
import { createPreparedInputStore } from './prepared-input-store.mjs?v=923e7f59b16a7c09';
import { createLocalPricingAdapter } from './local-pricing.mjs?v=923e7f59b16a7c09';
import { SITE_ACCOUNT_SERVICE, getSiteAccount, getSiteSessionToken, hasModelSelectionAccess, getSitePlanCapabilities, logoutSiteAccount, getSiteHomeUrl, refreshSiteAccount, startSiteGuestSession } from './site-account.mjs?v=923e7f59b16a7c09';
import { createSiteSignOutController, isNativeSignOutLink, getSiteSignOutPageUrl } from './site-signout.mjs?v=923e7f59b16a7c09';
import { isSitePricingPath, nativePricingDestination } from './native-pricing-trials.mjs?v=923e7f59b16a7c09';
import { createLocalCodexAdapter } from './local-codex-adapter.mjs?v=923e7f59b16a7c09';
import { isOpenStreetMapTileRequest, fetchOpenStreetMapTile } from './local-map-provider.mjs?v=923e7f59b16a7c09';
import { createLocalDiscoveryAdapter } from './local-discovery.mjs?v=923e7f59b16a7c09';
import { createLocalDotAdapter, createLocalDotCompletion } from './local-dot-adapter.mjs?v=923e7f59b16a7c09';
import { createLocalMapsService } from './local-maps-service.mjs?v=923e7f59b16a7c09';
import { createPreferredHostTransport, createPreferredCompletion, turnHostCheckpoints, cancelTurnHostRequests } from './preferred-host-transport.mjs?v=923e7f59b16a7c09';
import { createChatHistorySync, projectChatHistoryThread } from './chat-history-sync.mjs?v=923e7f59b16a7c09';
import { createAccountHistoryCoordinator } from './account-history-coordinator.mjs?v=923e7f59b16a7c09';
import { createNativeCloudSyncFeedback } from './native-cloud-sync-feedback.mjs?v=923e7f59b16a7c09';
import { createSiteInferenceTransport, isSiteInferenceCheckpoint, turnSiteInferenceCheckpoints } from './site-inference-transport.mjs?v=923e7f59b16a7c09';

let nativeFileReferenceCodecs = null;
export function registerNativeFileReferenceSources({ parseMarkdown, sha256Bytes } = {}) {
  if (typeof parseMarkdown !== 'function' || typeof sha256Bytes !== 'function') throw TypeError('The original Markdown parser and byte SHA source callbacks are required.');
  if (nativeFileReferenceCodecs && (nativeFileReferenceCodecs.parseMarkdown !== parseMarkdown || nativeFileReferenceCodecs.sha256Bytes !== sha256Bytes)) throw Error('Original file-reference codecs were already registered for this page.');
  nativeFileReferenceCodecs = Object.freeze({ parseMarkdown, sha256Bytes });
}

export const localModelAdapter = createModelCatalogAdapter(modelCatalog);
export const localProtocolDiagnostics = [];
// Original analytics retries must never grow an unbounded browser log.
localProtocolDiagnostics.push = function (...events) {
  const size = Array.prototype.push.apply(this, events);
  if (size > 500) this.splice(0, size - 500);
  return this.length;
};
const getPersonalizationIdentity = createPersonalizationIdentityProvider({ getSiteAccount, getLocalIdentity: getPrototypeLocalAuth, getStorageKey: getLocalAccountStorageKey });
const getConversationIdentity = createConversationIdentityProvider({ getSiteAccount, getVerifiedIdentity: getPersonalizationIdentity, getStorageKey: getLocalAccountStorageKey });
export const localPersonalizationService = createLocalPersonalizationService({
  storage: {
    getItem: key => globalThis.localStorage.getItem(key),
    setItem: (key, value) => globalThis.localStorage.setItem(key, value),
    removeItem: key => globalThis.localStorage.removeItem(key),
  },
  getIdentity: getPersonalizationIdentity, getStorageKey: getLocalAccountStorageKey,
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
const readPersonalizedSettings = createPersonalizedSettingsReader({
  readSettings: () => ({ ...DEFAULT_SETTINGS }),
  personalization: localPersonalizationService, getIdentity: getPersonalizationIdentity,
});
// A local preview/session flag is not a verified site account. File ownership
// must use the same boot-bound identity guard as account-owned preferences.
const getOwnedFileAccountId = () => getPersonalizationIdentity()?.accountId ?? null;
export const localPreferredHostTransport = createPreferredHostTransport({ baseURL: SITE_ACCOUNT_SERVICE,
  fetchImpl: (...args) => globalThis.fetch(...args), getSiteAccount, getSiteSessionToken,
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
async function verifiedSiteToken() {
  if (!getSiteSessionToken() && getSiteAccount() && navigator.onLine !== false) await refreshSiteAccount();
  return getSiteSessionToken();
}
const siteInferenceTransport = createSiteInferenceTransport({
  baseURL: SITE_ACCOUNT_SERVICE,
  getSessionToken: verifiedSiteToken,
  getAccountId: () => getSiteAccount()?.id ?? null,
});
function completeWithSiteInference(options) {
  // Chat's Pro presentation is backed by the highest conventional effort for Astra.
  const settings = options.settings.reasoningMode === 'pro' && options.settings.model === 'gpt-6-astra'
    ? { ...options.settings, reasoningMode: 'standard', reasoningEffort: 'max' }
    : options.settings;
  const directSiteResponse = async (payload, { signal }) => {
    return siteInferenceTransport.request(payload, { ...options.transportContext, signal, isFreeChat: options.providerRoutingContext?.isFreeChat });
  };
  return streamCompletion({
    ...options,
    settings: { ...settings, apiTransport: 'responses' },
    responsesTransport: (payload, transport) => options.responsesTransport
      ? options.responsesTransport(payload, { ...transport, fallbackResponses: () => directSiteResponse(payload, transport) })
      : directSiteResponse(payload, transport),
  });
}
const localHostCompletion = createPreferredCompletion({
  runtimeCompletion: completeWithSiteInference, preferredTransport: localPreferredHostTransport,
  enabled: () => globalThis.__CHATGPT_REPLICA_ENV__?.preferredHostEnabled === true && getSiteAccount()?.role === 'administrator',
});
export function localPreferredCompletion(options) {
  if (options.providerRoutingContext?.conversationOrigin === 'dot') return localDotAdapter.complete(options);
  if (isSiteInferenceCheckpoint(options.transportContext?.checkpoint)) return completeWithSiteInference(options);
  return localHostCompletion(options);
}
const localWorkspaceExecutor = createBrowserToolExecutor({ PythonRuntime, PYTHON_TOOL,
  getWorkspaceNamespace: () => {
    const account = getSiteAccount();
    return account?.role === 'administrator' ? null : account?.accountId ?? 'guest';
  },
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
const mapSearchTool = { type: 'function', function: {
  name: 'search_places', description: 'Find a public place requested by the user and return links to its map.',
  parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
} };
export const localToolExecutor = createLibraryPublishingExecutor({
  baseExecutor: {
    ...localWorkspaceExecutor,
    tools: [...localWorkspaceExecutor.tools, mapSearchTool],
    async execute(call, context) {
      if (call?.function?.name !== 'search_places') return localWorkspaceExecutor.execute(call, context);
      const { query } = JSON.parse(call.function.arguments || '{}');
      const result = await localMapsService.searchPlaces(query, { signal: context?.signal });
      const places = result.places.map(place => ({ ...place, url: new URL('maps/' + encodeURIComponent(place.entity_id), getSiteHomeUrl()).href }));
      const structuredContent = { ...result, places };
      return { content: [{ type: 'text', text: JSON.stringify(structuredContent) }], structuredContent, isError: false };
    },
  },
  getIdentity: getPersonalizationIdentity,
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
export const localPricingAdapter = createLocalPricingAdapter({
  diagnostics: localProtocolDiagnostics, readMembership: getSiteAccount, readUsageIdentity: getPrototypeLocalAuth,
  async readUsage({ signal }) {
    const token = await verifiedSiteToken();
    if (!token) return null;
    const response = await fetch(SITE_ACCOUNT_SERVICE + '/inference/v1/usage', {
      credentials: 'omit', redirect: 'error', cache: 'no-store', signal,
      headers: { Authorization: 'Bearer ' + token },
    });
    return response.ok ? response.json() : null;
  },
});
export const localDiscoveryAdapter = createLocalDiscoveryAdapter({ storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }, getAccountId: () => getPrototypeLocalAuth()?.accountId ?? null, diagnostics: localProtocolDiagnostics });
export const localMapsService = createLocalMapsService({ storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }, getAccountId: () => getPrototypeLocalAuth()?.accountId ?? null, geocodeFetch: globalThis.fetch.bind(globalThis), diagnostics: localProtocolDiagnostics });
// Verified site ownership and the local namespace are both bound at boot.
// A preview flag, prototype account ID or late login cannot claim cloud history.
const getHistoryIdentity = () => {
  const local = getPersonalizationIdentity(), site = getSiteAccount();
  return local && site?.id && site.authenticationMode !== 'offline-administrator' ? { ownerId: site.id, accountId: local.accountId, namespace: getLocalAccountStorageKey('cg-original-app-server:v1') } : null;
};
export let localAccountHistory = null;
let historyFeedback = null, nativeHistoryToaster = () => null, historyApplying = false;
export const localAppServer = new LocalAppServer({
  storage: {
    getItem: key => globalThis.localStorage.getItem(getLocalAccountStorageKey(key)),
    setItem: (key, value) => globalThis.localStorage.setItem(getLocalAccountStorageKey(key), value),
  },
  streamCompletion: localPreferredCompletion,
  onIdleTurnInterrupt: ({ turn, reason }) => {
    const options = { onCheckpoint: () => localAppServer.persist() };
    return Promise.allSettled([
      ...turnHostCheckpoints(turn).map(checkpoint => (reason === 'pagehide' ? localPreferredHostTransport.detach : localPreferredHostTransport.cancel)(checkpoint, options)),
      ...(reason === 'pagehide' ? [] : turnSiteInferenceCheckpoints(turn).map(checkpoint => siteInferenceTransport.cancel(checkpoint, options))),
    ]);
  },
  readSettings: readPersonalizedSettings,
  models: localModelAdapter,
  catalog: modelCatalog,
  diagnostics: localProtocolDiagnostics,
  toolExecutor: localToolExecutor,
  prepareUserInput: createLocalInputPreparer({ files: localFilesService }),
  preparedInputStore: createPreparedInputStore({ namespace: getLocalAccountStorageKey('cg-original-app-server:v1') }),
  agentOptions: { toolTransport: 'responses', requestPriority: true, ultraOrchestration: true },
  getExecutionPolicy: () => ({ modelSelection: hasModelSelectionAccess(), freeChatModel: DEFAULT_SETTINGS.freeChatModel, freeChatEffort: 'medium' }),
  onPersist: threads => localAccountHistory?.capture(threads),
});
await localAppServer.migratePreparedInputs();
// Transient sandbox files keep their exact assistant/producer context and real
// workspace bytes. They never enter the permanent Library publication registry.
export const localWorkspaceDownloadSource = createWorkspaceDownloadSource({
  getIdentity: getPersonalizationIdentity, getThread: id => localAppServer.threads.get(id),
  getWorkspacePrefix: localWorkspaceExecutor.getWorkspacePrefix, storage: localWorkspaceExecutor.storage, workspacePath,
  artifactBaseURL: new URL(globalThis.__CHATGPT_REPLICA_ENV__?.basePath || '/', globalThis.location.origin).href,
  sha256Bytes: bytes => {
    if (!nativeFileReferenceCodecs) throw Error('The original byte SHA source is not ready.');
    return nativeFileReferenceCodecs.sha256Bytes(bytes);
  },
});
export const localWorkspaceDownloadService = createLocalWorkspaceDownloadService({
  getIdentity: getPersonalizationIdentity, resolveSource: spec => localWorkspaceDownloadSource.resolve(spec),
  isSourceCurrent: proof => localWorkspaceDownloadSource.isCurrent(proof),
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
export const localOwnedDownloadTransport = createOwnedDownloadTransport({
  providers: [localLibraryService, localWorkspaceDownloadService],
  fetchImpl: (...args) => globalThis.fetch(...args), onDiagnostic: event => localProtocolDiagnostics.push(event),
});
// Keep the existing native upload/fetch wrapper's public provider identity.
export const localLibraryByteTransport = localOwnedDownloadTransport;
globalThis.addEventListener('pagehide', () => localWorkspaceDownloadService.dispose());
export const localConversationPubSub = new LocalConversationPubSub(localAppServer, {
  getOwner: () => {
    const who = getConversationIdentity();
    return who ? JSON.stringify([who.accountId, who.userId]) : null;
  },
  hasRoomAccess: () => getSitePlanCapabilities().dot,
  subscribeRoomMessages: listener => localDotAdapter.subscribeRoomMessages(listener),
});
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
    if (!historyApplying && event.method === 'turn/completed' && getSiteSessionToken()) void localAccountHistory.synchronize();
  });
  globalThis.addEventListener('codex-site-account-changed', () => {
    if (getSiteSessionToken() && getHistoryIdentity()?.ownerId === historyIdentity.ownerId) void localAccountHistory.synchronize();
  });
}
export async function initializeLocalAccountHistory({ threadOnEntry } = {}) {
  if (threadOnEntry && !localAppServer.threads.has(threadOnEntry) && getSiteAccount()?.authenticationMode === 'site-offline-cache' && navigator.onLine !== false) {
    await refreshSiteAccount();
  }
  return getSiteSessionToken() && localAccountHistory ? localAccountHistory.start() : { ok: true, localHistoryOnly: true };
}
export function setNativeAccountHistoryToaster(provider) {
  nativeHistoryToaster = typeof provider === 'function' ? provider : () => null;
  historyFeedback?.flush();
}
async function finishAccountHistoryBeforeLogout(signal) {
  if (!localAccountHistory) return;
  try {
    do {
      const outcome = await localAccountHistory.synchronize({ signal });
      if (!outcome.ok || outcome.deferred || outcome.conflictCount || !outcome.pending) break;
    } while (!signal.aborted);
  } finally { localAccountHistory.dispose(); historyFeedback?.dispose(); }
}
export const siteSignOut = createSiteSignOutController({
  home: getSiteHomeUrl, clearSiteAccount: () => logoutSiteAccount({ waitForRemote: true }),
  clearNativeSession() {
    clearPrototypeLocalSession();
    startSiteGuestSession();
  },
  async prepare(signal) {
    localAppServer.interruptAll({ reason: 'logout' });
    localNativeLibraryRefresh.dispose();
    localLibraryService.dispose();
    localWorkspaceDownloadService.dispose();
    if (!getSiteSessionToken()) { localAccountHistory?.dispose(); return; }
    await Promise.allSettled([
      cancelTurnHostRequests(localPreferredHostTransport, [...localAppServer.threads.values()].flatMap(thread => thread.turns), { onCheckpoint: () => localAppServer.persist() }),
      finishAccountHistoryBeforeLogout(signal),
    ]);
  },
});
export const localDotAdapter = createLocalDotAdapter({
  complete: createLocalDotCompletion({
    complete: streamCompletion, getProviders: () => DEFAULT_SETTINGS.apiProviders, siteOrigin: SITE_ACCOUNT_SERVICE,
    fetchDirectModels: (url, options) => globalThis.fetch(url, options),
    responsesTransport: siteInferenceTransport.request,
  }),
  storage: { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) },
  appServer: localAppServer, getIdentity: getPrototypeLocalAuth, isLocalSession: isPrototypeLocalSession,
  hasDotAccess: () => getSitePlanCapabilities().dot, siteAccountsOnly: true,
  files: localFilesService, backgroundRoomPump: true,
  getFileRecord: async (id, options) => (await localFilesService.readFile(id, options)).record,
  readSettings: () => ({ ...DEFAULT_SETTINGS }), getCapabilities: getLocalExecutionCapabilities, diagnostics: localProtocolDiagnostics,
});
const localNativePublicationReferences = createNativePublicationReferences({
  normalizeReceipt: normalizePublicationReceipt, getIdentity: getPersonalizationIdentity,
  ownsPublishedResource: (uri, receipt) => localLibraryService.ownsPublishedResource(uri, receipt),
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
const localNativeWorkspaceReferences = createNativeWorkspaceReferences({
  getIdentity: getPersonalizationIdentity, getThread: id => localAppServer.threads.get(id),
  parseMarkdown: text => {
    if (!nativeFileReferenceCodecs) throw Error('The original Markdown source is not ready.');
    return nativeFileReferenceCodecs.parseMarkdown(text);
  },
  describeFile: spec => localWorkspaceDownloadSource.describe(spec),
  isDescriptionCurrent: description => localWorkspaceDownloadSource.isDescriptionCurrent(description),
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
const localNativeFileReferences = createNativeFileReferenceComposition({
  getIdentity: getPersonalizationIdentity, getThread: id => localAppServer.threads.get(id),
  publicationProjector: localNativePublicationReferences, workspaceProjector: localNativeWorkspaceReferences,
  normalizeReceipt: normalizePublicationReceipt,
  describePublicationSource: receipt => localFilesService.describePublicationSource(receipt),
  isPublicationSourceCurrent: proof => localFilesService.isPublicationSourceCurrent(proof),
  getDescriptionSHA: description => localWorkspaceDownloadSource.getDescriptionSHA(description),
  onDiagnostic: event => localProtocolDiagnostics.push(event),
});
export const localClassicChatAdapter = new ClassicChatAdapter({ appServer: localAppServer, models: localModelAdapter, onConversationChange: (type, payload) => localConversationPubSub.publish(type, payload),
  getPublishedFileReferences: context => localNativeFileReferences.forAssistant(context),
});
export const localReadAloudHost = Object.freeze({
  getIdentity: getPersonalizationIdentity,
  source: createLocalReadAloudSource({
    getIdentity: getPersonalizationIdentity,
    getThread: id => localAppServer.threads.get(id),
  }),
});

const getResponseIdentity = getConversationIdentity;
const localResponseActions = createClassicResponseActions({
  appServer: localAppServer, classic: localClassicChatAdapter,
  models: localModelAdapter, getIdentity: getResponseIdentity,
});
localClassicChatAdapter.responseActions = localResponseActions;
localClassicChatAdapter.detail = localResponseActions.detail;
localClassicChatAdapter.message = localResponseActions.message;
localClassicChatAdapter.projectItem = localResponseActions.projectItem;
export const localConversationShare = createPortableConversationShare({
  getIdentity: getResponseIdentity,
  getConversation: id => localClassicChatAdapter.detail(localAppServer.getThread(id)),
  baseURL: getSiteHomeUrl().href,
  getLocation: () => {
    const location = new URL(globalThis.location.href);
    const id = location.searchParams.get('share');
    if (/^[a-f0-9-]{36}$/.test(id ?? '')) location.pathname = new URL(`share/${id}`, getSiteHomeUrl()).pathname;
    return location.href;
  },
});
export const localCodexAdapter = createLocalCodexAdapter({ appServer: localAppServer, models: localModelAdapter, readSettings: () => ({ ...DEFAULT_SETTINGS }), getIdentity: getPrototypeLocalAuth, isLocalSession: isPrototypeLocalSession, getCapabilities: getLocalExecutionCapabilities, diagnostics: localProtocolDiagnostics });
export function getLocalExecutionCapabilities() {
  return { executionSource: 'local-app-server',
    textConversations: Boolean((getSiteAccount() || DEFAULT_SETTINGS.apiBase && DEFAULT_SETTINGS.apiKey) && typeof streamCompletion === 'function' && typeof localAppServer.dispatch === 'function' && modelCatalog.WORK_MODEL_IDS.length),
    openaiCloudEntitlement: false, modelSelection: hasModelSelectionAccess(), filesystem: true, tools: localToolExecutor.tools.map(tool => tool.function.name), filesystemScope: 'browser-origin-workspace', pythonEnvironment: 'pyodide-webassembly' };
}

/** Only local assets/adapters and the explicitly configured gateway can run. */
export function installNetworkBoundary() {
  const originalFetch = globalThis.fetch.bind(globalThis);
  const originalCreateObjectURL = URL.createObjectURL.bind(URL), originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = blob => localOwnedDownloadTransport.createNativeDownloadURL(blob, originalCreateObjectURL);
  URL.revokeObjectURL = url => { localOwnedDownloadTransport.forgetNativeDownloadURL(url); return originalRevokeObjectURL(url); };
  const diagnostics = localProtocolDiagnostics;
  const localCsrfToken = crypto.randomUUID();
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
    if (globalThis.__CHATGPT_REPLICA_ENV__?.directAssetHost && ['GET', 'HEAD'].includes(request.method)) {
      const asset = originalAssetURL(url.href, new URL(globalThis.__CHATGPT_REPLICA_ENV__.basePath, location.origin));
      if (asset !== url.href) { const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie'); return originalFetch(new Request(asset, { method: request.method, headers, credentials: 'omit', signal: request.signal })); }
    }
    if (url.protocol === 'blob:' && ['GET', 'HEAD'].includes(request.method) && localOwnedDownloadTransport.ownsObjectURL(url.href)) {
      const headers = new Headers(request.headers); headers.delete('Authorization'); headers.delete('Cookie');
      return originalFetch(new Request(request, { headers, credentials: 'omit' }));
    }
    if (isOpenStreetMapTileRequest(request)) return fetchOpenStreetMapTile(originalFetch, request);
    if (url.origin === SITE_ACCOUNT_SERVICE && request.method === 'POST' && /^\/api-proxy\/(?:docode|openclawplan)\/v1\/responses$/.test(url.pathname)) {
      return originalFetch(new Request(request, { credentials: 'omit', redirect: 'error' }));
    }
    if (url.origin === SITE_ACCOUNT_SERVICE && /^\/(?:auth\/(?:login|register|session|logout|site-trial)|inference\/v1\/(?:usage|responses(?:\/[a-f0-9-]{36})?)|bridge\/status|usage|jobs(?:\/[^/]+(?:\/events)?)?|sync\/(?:conversations(?:\/[^/]+)?|changes|batch))$/.test(url.pathname)) return originalFetch(new Request(request, {
      credentials: 'omit', redirect: url.pathname.startsWith('/auth/') ? 'manual' : 'error',
    }));
    // Consume analytics locally; never forward captured telemetry to its vendor.
    if (isTelemetry(url)) return response({ success: true });
    if (local && (/^\/cdn\//.test(url.pathname) || /^\/__prototype\//.test(url.pathname))) {
      const headers = new Headers(request.headers);
      headers.delete('Authorization');
      headers.delete('Cookie');
      return originalFetch(new Request(request, { headers, credentials: 'omit' }));
    }
    // Normalize the deployment basename at the service boundary.
    if (local && deploymentBase !== '/' && url.pathname.startsWith(deploymentBase)) url.pathname = '/' + url.pathname.slice(deploymentBase.length);
    // Log the contract name, never query parameters, headers or payload values.
    diagnostics.push({ type: 'request', method: request.method, path: url.pathname });
    // Original ci3G.b validates non-empty csrfToken and signout {url};
    // AqQr then runs its existing local cleanup and same-origin navigation.
    if (local && request.method === 'GET' && url.pathname === '/api/auth/csrf') return response({ csrfToken: localCsrfToken });
    if (local && request.method === 'POST' && url.pathname === '/api/auth/signout') {
      const body = new URLSearchParams(await request.text());
      if (body.get('csrfToken') !== localCsrfToken) return response({ error: 'Invalid local signout token' }, 403);
      return response({ url: await siteSignOut.complete() });
    }
    if (/\/api\/auth\/session$/.test(url.pathname)) return response(getPrototypeLocalSession() ?? {});
    if (request.method === 'GET' && /\/api\/auth\/account-picker$/.test(url.pathname)) return response({ unified_sessions: [] });
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?me\/?$/.test(url.pathname)) return response(getPrototypeCurrentUser() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?accounts\/optimized\/check\/?$/.test(url.pathname)) return response(getLocalOptimizedAccount() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?wham\/accounts\/check\/?$/.test(url.pathname)) return response(getLocalWhamAccounts());
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?settings\/user\/?$/.test(url.pathname)) return response(readLocalUserPreferences());
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?system_hints\/?$/.test(url.pathname)) {
      const hints = url.searchParams.get('mode') === 'basic' ? [{ system_hint: 'reason', name: '思考一下', action_label: '思考一下', aliases: [], required_features: [], required_models: [], required_conversation_modes: [], allow_in_temporary_chat: true, requires_personalization: false, surfaces: ['chat'], description: '' }] : [];
      if (url.searchParams.get('mode') === 'basic') hints.push(nativeWebSearchHint());
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
      const share = await localConversationShare.handle(request, adapterPath);
      if (share) return share;
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
      const workspaceDownload = await localWorkspaceDownloadService.handle(request, adapterPath);
      if (workspaceDownload) return workspaceDownload;
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
    const home = getSiteHomeUrl();
    if (isNativeSignOutLink(url ?? target, location.href, home)) {
      return originalOpen(getSiteSignOutPageUrl(home).href, ...rest);
    }
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
    const home = getSiteHomeUrl();
    if (isNativeSignOutLink(link.getAttribute('href'), location.href, home)) {
      link.href = getSiteSignOutPageUrl(home).href;
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault(); event.stopPropagation();
        void siteSignOut.navigateAfterSignOut();
      }
      return;
    }
    if ((url.origin === location.origin || url.origin === 'https://chatgpt.com') &&
        (isSitePricingPath(url.pathname, home.pathname) || url.hash === '#pricing' && (url.origin !== location.origin || !url.pathname.startsWith(home.pathname)))) {
      const { url: destination, returnPath } = nativePricingDestination(url.href, location.href);
      link.href = destination.href;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      const state = { idx: (history.state?.idx ?? 0) + 1, key: crypto.randomUUID(), usr: { returnPath } };
      history.pushState(state, '', destination.href);
      window.dispatchEvent(new PopStateEvent('popstate', { state }));
      return;
    }
    const ownedDownload = url.protocol === 'blob:' && link.hasAttribute('download') && localOwnedDownloadTransport.ownsObjectURL(url.href);
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
