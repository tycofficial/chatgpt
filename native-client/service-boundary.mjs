import * as modelCatalog from '../model-catalog.js?v=254853a0391083ac';
import { createModelCatalogAdapter } from './model-catalog-adapter.mjs?v=254853a0391083ac';
import { DEFAULT_SETTINGS } from '../config.js?v=254853a0391083ac';
import { streamCompletion } from '../runtime.js?v=254853a0391083ac';
import { LocalAppServer, LocalProtocolSocket } from './local-app-server.mjs?v=254853a0391083ac';
import { getPrototypeLocalSession, getPrototypeLocalAuth, getLocalAccountCheck, getLocalOptimizedAccount, getLocalWhamAccounts, getPrototypeCurrentUser, isPrototypeLocalSession, clearPrototypeLocalSession, getLocalSignedOutUrl } from './local-identity.mjs?v=254853a0391083ac';
import { getPrototypeConfiguration } from './local-configuration.mjs?v=254853a0391083ac';
import { ClassicChatAdapter } from './classic-chat-adapter.mjs?v=254853a0391083ac';
import { LocalConversationPubSub } from './local-pubsub.mjs?v=254853a0391083ac';
import { readLocalUserPreferences, updateLocalUserPreference, acknowledgeLocalAnnouncement } from './local-user-preferences.mjs?v=254853a0391083ac';

export const localModelAdapter = createModelCatalogAdapter(modelCatalog);
export const localProtocolDiagnostics = [];
export const localAppServer = new LocalAppServer({
  storage: {
    getItem: key => globalThis.localStorage.getItem(key),
    setItem: (key, value) => globalThis.localStorage.setItem(key, value),
  },
  streamCompletion,
  readSettings: () => ({ ...DEFAULT_SETTINGS }),
  models: localModelAdapter,
  catalog: modelCatalog,
  diagnostics: localProtocolDiagnostics,
});
export const localConversationPubSub = new LocalConversationPubSub(localAppServer);
export const localClassicChatAdapter = new ClassicChatAdapter({ appServer: localAppServer, models: localModelAdapter, onConversationChange: (type, payload) => localConversationPubSub.publish(type, payload) });
export function getLocalExecutionCapabilities() {
  return { executionSource: 'local-app-server',
    textConversations: Boolean(DEFAULT_SETTINGS.apiBase && DEFAULT_SETTINGS.apiKey && typeof streamCompletion === 'function' && typeof localAppServer.dispatch === 'function' && modelCatalog.WORK_MODEL_IDS.length),
    openaiCloudEntitlement: false, filesystem: false, tools: [] };
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
      localAppServer.interruptAll();
      clearPrototypeLocalSession({ reload: false });
      return response({ url: target });
    }
    if (/\/api\/auth\/session$/.test(url.pathname)) return response(getPrototypeLocalSession() ?? {});
    if (request.method === 'GET' && /\/api\/auth\/account-picker$/.test(url.pathname)) return response({ unified_sessions: [] });
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?me\/?$/.test(url.pathname)) return response(getPrototypeCurrentUser() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?accounts\/optimized\/check\/?$/.test(url.pathname)) return response(getLocalOptimizedAccount() ?? { error: 'Local session is disabled' }, isPrototypeLocalSession() ? 200 : 401);
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?wham\/accounts\/check\/?$/.test(url.pathname)) return response(getLocalWhamAccounts());
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?settings\/user\/?$/.test(url.pathname)) return response(readLocalUserPreferences());
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
      return response(getPrototypeConfiguration(requestedUser));
    }
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?(?:tpp\/)?models\/?$/.test(url.pathname)) {
      diagnostics.push({ type: 'local-adapter', service: 'models', source: 'model-catalog.js', capabilitySource: modelCatalog.WORK_CATALOG_PROVENANCE.pinned });
      return response(localModelAdapter.getChatGptModels());
    }
    if (request.method === 'GET' && /^\/(?:__codex-api\/|backend-api\/)?celsius\/ws\/user\/?$/.test(url.pathname)) {
      const socket = new URL('/__prototype/local-conversations', location.href);
      socket.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return response({ websocket_url: socket.href, adapter_source: 'local-conversation-pubsub-not-openai-cloud' });
    }
    const adapterPath = url.pathname.replace(/^\/(?:__codex-api|backend-api)(?=\/)/, '');
    try {
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
  try { Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: () => false }); } catch {}
  const originalOpen = window.open.bind(window);
  window.open = (url, ...rest) => {
    const target = new URL(url ?? 'about:blank', location.href);
    if (target.origin !== location.origin) {
      diagnostics.push({ type: 'navigation-unavailable', origin: target.origin });
      return null;
    }
    return originalOpen(target.href, ...rest);
  };
  document.addEventListener('click', event => {
    const link = event.target instanceof Element && event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) {
      event.preventDefault();
      event.stopPropagation();
      diagnostics.push({ type: 'navigation-unavailable', origin: url.origin });
    }
  }, true);
  window.addEventListener('pagehide', () => localAppServer.interruptAll());
  return { diagnostics };
}

/**
 * EAKz.a keeps its original protocol/reconciliation implementation. This local
 * transport now supports real text turns via the authorized gateway. Tools,
 * filesystem and cloud execution remain explicit unsupported RPC errors.
 */
export class LocalAppServerSocket extends LocalProtocolSocket {
  constructor(diagnostics = localProtocolDiagnostics) {
    super(localAppServer, diagnostics);
    const auth = getPrototypeLocalAuth();
    if (auth) this.authenticatedPrincipal = { accountId: auth.accountId, userId: auth.userId };
  }
}
