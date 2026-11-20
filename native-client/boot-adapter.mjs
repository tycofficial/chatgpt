import { createBrowserReadAloudController, createNativeReadAloudBindings } from './local-native-read-aloud.mjs?v=d54056d29411fe79';
import { normalizeWorkUIStoredPreference, WORK_DEFAULT_OPTION } from '../model-catalog.js?v=d54056d29411fe79';
import { consolidateWorkDefaults } from './model-catalog-adapter.mjs?v=d54056d29411fe79';
/**
 * Loads the public original component graph with explicit local host services.
 * Private original backend credentials are never used by this entry point.
 */
import { installNetworkBoundary, LocalAppServerSocket, getLocalExecutionCapabilities, localCodexAdapter, localDotAdapter, localFilesService, localOwnedDownloadTransport, localLibraryByteTransport, initializeLocalAccountHistory, setNativeAccountHistoryToaster, initializeLocalPublishedResources, registerNativeLibrarySource, notifyNativeLibrarySourceReady, registerNativeFileReferenceSources, localReadAloudHost } from './service-boundary.mjs?v=d54056d29411fe79';
import { installDeferredMapProvider } from './local-map-provider.mjs?v=d54056d29411fe79';
import { installSyntheticDocumentState } from './synthetic-bootstrap.mjs?v=d54056d29411fe79';
import { getPrototypeLocalSession, getPrototypeLocalAuth, isPrototypeLocalSession, getPrototypeLocalAuthGeneration, clearPrototypeLocalSession } from './local-identity.mjs?v=d54056d29411fe79';
import { createLocalHostSettingsClass } from './local-host-settings.mjs?v=d54056d29411fe79';
import { createLocalWorkPolicy } from './local-work-policy.mjs?v=d54056d29411fe79';
import { hasModelSelectionAccess, getSiteLoginUrl, getSiteHomeUrl } from './site-account.mjs?v=d54056d29411fe79';
import { createNativeSiteTrialCard } from './native-pricing-trials.mjs?v=d54056d29411fe79';
import { createNativeSiteSignOut } from './site-signout.mjs?v=d54056d29411fe79';
import { createNativeSiteLoginRoute } from './native-site-login.mjs?v=d54056d29411fe79';
import { localizeRouterAssets } from './startup-compatibility.mjs?v=d54056d29411fe79';
import { siteSignOut, localAppServer as timingServer } from './service-boundary.mjs?v=d54056d29411fe79';
import { wrapNativeReasoningGroups } from './classic-chat-adapter.mjs?v=d54056d29411fe79';
import { wrapNativeCodexWorkTiming, wrapNativeWorkedDuration } from './local-app-server.mjs?v=d54056d29411fe79';
import { createNativeModelSelectionPolicy, createNativeThinkingEntryPolicy } from './local-model-selection-policy.mjs?v=d54056d29411fe79';
import { createLocalHostClaimsReader } from './local-token-identity.mjs?v=d54056d29411fe79';
import { wrapNativeFileUploadClass } from './local-native-upload.mjs?v=d54056d29411fe79';
import { wrapNativeDownloadServices } from './local-native-download.mjs?v=d54056d29411fe79';

const boundary = installNetworkBoundary();
globalThis.__originalClientProbe = boundary.diagnostics;
// A fresh-device deep link needs its conversation before the router reads it.
// A home page can render while the same owner-scoped sync and attachment restore run.
const threadOnEntry = location.pathname.match(/\/(?:c|conversation|tasks|local)\/([^/]+)\/?$/)?.[1];
const needsHistoryBeforeMount = threadOnEntry && !timingServer.threads.has(threadOnEntry);
const initialHistory = initializeLocalAccountHistory({ threadOnEntry });
void initialHistory.then(() => initializeLocalPublishedResources()).catch(() => {});
installSyntheticDocumentState();
if (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\/$/, '') || '/';

const plan = {"runtime":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/633146.6428a93122.js","manifest":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/manifest-98f8ff8a.js","initialRoutes":{"root":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/736644.130f255edd.js","app.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/538990.492f1e5a13.js","flow-layout.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/687836.2c400a1faa.js","authenticated-layout.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/42763.e7759944c5.js","home.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/906348.348ecd5024.js"},"registrationEntry":"./entry-library.mjs?v=d54056d29411fe79"};
const { __webpack_require__: requireOriginal } = await import(plan.runtime);
if (globalThis.__CHATGPT_REPLICA_ENV__?.directAssetHost) requireOriginal.p = new URL('original-client/public/chatgpt.com/cdn/', new URL(globalThis.__CHATGPT_REPLICA_ENV__.basePath, location.origin)).href;
// One mechanical entry transform defers its terminal hxQI invocation and
// rebases its relative imports. All original factories and chunks are retained.
const entryLibrary = await import(plan.registrationEntry);
// Reuse the exact public Markdown parser and byte SHA factories. These
// callbacks run only when a completed native message requests file metadata.
registerNativeFileReferenceSources({
  parseMarkdown: text => requireOriginal('cC4N').a(text),
  sha256Bytes: bytes => requireOriginal('hAXn').e(requireOriginal('LMwm').a(bytes)),
});
const transforms = new Map();
const transformed = new WeakMap();
requireOriginal.m = new Proxy(requireOriginal.m, {
  set(target, id, factory) {
    const transform = transforms.get(id);
    if (transform) {
      let byId = transformed.get(factory);
      if (!byId) transformed.set(factory, byId = new Map());
      if (!byId.has(id)) byId.set(id, transform(factory));
      factory = byId.get(id);
    }
    target[id] = factory;
    if (id === 'fvOC') queueMicrotask(notifyNativeLibrarySourceReady);
    return true;
  },
});

function adaptFactory(moduleId, transform, { deferred = false } = {}) {
  if (requireOriginal.c[moduleId]) throw Error(`Adapter installed too late: ${moduleId}`);
  transforms.set(moduleId, transform);
  if (!requireOriginal.m[moduleId]) { if (!deferred) throw Error(`Original boundary module is absent: ${moduleId}`); }
  else requireOriginal.m[moduleId] = requireOriginal.m[moduleId];
}

/** Substitute exports before their factory is instantiated, leaving its code intact. */
function overrideExports(moduleId, overrides, options, wrappers = {}) {
  adaptFactory(moduleId, factory => function(module, exports, require) {
    const scopedRequire = new Proxy(require, {
      get(target, key, receiver) {
        if (key !== 'd') return Reflect.get(target, key, receiver);
        return (destination, getters, values) => {
          if (destination !== exports) return require.d(destination, getters, values);
          const nextGetters = { ...getters };
          const nextValues = { ...values };
          for (const [name, wrap] of Object.entries(wrappers)) {
            const readOriginal = getters?.[name] ?? (() => values?.[name]);
            let wrapped;
            nextGetters[name] = () => wrapped ??= wrap(readOriginal());
            delete nextValues[name];
          }
          for (const [name, value] of Object.entries(overrides)) {
            delete nextGetters[name];
            nextValues[name] = value;
          }
          return require.d(destination, nextGetters, nextValues);
        };
      },
    });
    return factory.call(this, module, exports, scopedRequire);
  }, options);
}

let nativeReadAloudBindings;
function readAloudBindings() {
  if (nativeReadAloudBindings) return nativeReadAloudBindings;
  const rootScope = requireOriginal('OWtl').a;
  const controller = createBrowserReadAloudController({
    resolveSource: localReadAloudHost.source.resolve,
    isSourceCurrent: localReadAloudHost.source.isCurrent,
    getIdentity: localReadAloudHost.getIdentity,
    getScopeKey: scope => scope.chain.get(rootScope.id) ?? scope.node,
    speechSynthesis: globalThis.speechSynthesis,
    Utterance: globalThis.SpeechSynthesisUtterance,
    getLanguage: () => globalThis.navigator?.language ?? '',
    eventTarget: globalThis.window,
    reportError: (scope, errorMessage) => {
      if (typeof errorMessage === 'string' && errorMessage) scope.get(requireOriginal('SGsN').f).danger(errorMessage);
    },
    onDiagnostic: event => boundary.diagnostics.push(event),
  });
  return nativeReadAloudBindings = createNativeReadAloudBindings({
    controller,
    mutableAtom: (...args) => requireOriginal('BolX').u(...args),
    derivedAtom: (...args) => requireOriginal('BolX').d(...args),
    scopeAtom: rootScope,
    // This getter is read at playback time after BJ43 instantiation. Its own
    // wrapped stop is safe: the new speech record has not been created yet.
    stopNative: scope => requireOriginal('BJ43').b(scope),
  });
}
overrideExports('BJ43', {}, { deferred: true }, {
  a: original => readAloudBindings().wrapStatus(original),
  b: original => readAloudBindings().wrapStop(original),
  c: original => readAloudBindings().wrapConversationStop(original),
  e: original => readAloudBindings().wrapPlay(original),
});

// Retain the original QueryProvider and its QueryClient. Observe the supplied
// client at the host seam so actual completed publications use the same native
// Library invalidation path as the original upload controller.
const invalidateOriginalLibrary = (...args) => {
  if (!requireOriginal.m.fvOC) throw Error('Original Library invalidator is not registered');
  return requireOriginal('fvOC').a(...args);
};
// BEGIN LOCAL LUNA SAVED-PREFERENCE READ BOUNDARY
// Keep the original decoder/writer and its original atom as the dependency.
// Only the deprecated saved Luna UI Zero value is represented as Low.
overrideExports('pQ72', {}, { deferred: true }, {
  b: originalAtom => requireOriginal('BolX').c(
    requireOriginal('OWtl').a,
    ({ get }) => normalizeWorkUIStoredPreference(get(originalAtom)),
  ),
});
// END LOCAL LUNA SAVED-PREFERENCE READ BOUNDARY

overrideExports('BolX', {}, { deferred: true }, {
  a: OriginalProvider => function NativeLibraryQueryProvider(props) {
    registerNativeLibrarySource(props.queryClient, invalidateOriginalLibrary);
    return requireOriginal('zd8w').createElement(OriginalProvider, props);
  },
});

// Keep native upload behavior while local tickets store their real bytes.
overrideExports('GDNt', {}, { deferred: true }, { b: NativeWebFetch => wrapNativeFileUploadClass(NativeWebFetch, localFilesService, undefined, localLibraryByteTransport) });

// Keep the original preview, temporary byte registry, RPC lifecycle and save
// primitive. Only this site's previously verified Library bytes get a local
// download capability at the awaited workspaceFiles host-service boundary.
overrideExports('GaA7', {}, { deferred: true }, {
  c: register => function(services, ...args) {
    return register.call(this, wrapNativeDownloadServices(services, {
      isTemporaryPath: path => requireOriginal('Afr7').c(path),
      getTemporaryFile: path => requireOriginal('Afr7').b(path),
      getDefaultFileName: path => requireOriginal('bnxy').j(path),
      sanitizeFileName: value => requireOriginal('I07G').kh(value),
      maxBytes: requireOriginal('I07G').Hd,
      createTooLargeError: size => new (requireOriginal('smHt').b)(size),
      wrapRpcMethod: callback => new (requireOriginal('ZG9f').b)(callback),
      downloadVerifiedBytes: (...input) => localOwnedDownloadTransport.downloadVerifiedBytes(...input),
      nativeDownload: (blob, fileName) => requireOriginal('ripK').a(blob, fileName),
    }), ...args);
  },
});

// The native download flow also serves this browser's verified local files.
// Preserve its URL validation for every URL outside this provider's registry.
overrideExports('GfAi', {}, { deferred: true }, {
  b: validateURL => function (value, ...args) {
    if (typeof value === 'string' && localOwnedDownloadTransport.ownsObjectURL(value.trim())) return value.trim();
    return validateURL.call(this, value, ...args);
  },
});

// Retain the original viewer/worker version pair under this site's asset base.
// A Worker entry must be directly available from the deployed project path.
const nativePdfWorker = new URL('./artifact-assets/pdf.worker.min.f6ffbd8da0.mjs', import.meta.url);
const nativeAssetVersion = new URL(import.meta.url).searchParams.get('v');
if (nativeAssetVersion) nativePdfWorker.searchParams.set('v', nativeAssetVersion);
overrideExports('uvgn', { a: nativePdfWorker.toString() }, { deferred: true });

// Keep native map factories synchronous after their own chunk has loaded.
const mapRendererURL = new URL('./map-vendor/maplibre-gl.mjs', import.meta.url);
if (nativeAssetVersion) mapRendererURL.searchParams.set('v', nativeAssetVersion);
const localMapProvider = installDeferredMapProvider(requireOriginal, {
  loadRenderer: () => requireOriginal.ir(mapRendererURL.href), diagnostics: boundary.diagnostics,
});
adaptFactory('FxuF', () => function(module) { module.exports = localMapProvider.renderer; }, { deferred: true });
overrideExports('eS9I', { a: localMapProvider.createStyle(), b: localMapProvider.createStyle(), c: localMapProvider.configureRenderer }, { deferred: true });

adaptFactory('ztxE', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, { get(target, key, receiver) {
    if (key !== 'd') return Reflect.get(target, key, receiver);
    return (destination, getters, values) => {
      if (destination === exports && values?.a) values = { ...values, a: localCodexAdapter.adaptBrowserCapabilityAtom(values.a, require) };
      return require.d(destination, getters, values);
    };
  } });
  return factory.call(this, module, exports, scopedRequire);
});

// cKRc's original first-party discovery expects cloud/desktop onboarding.
// Only a verified ready site-local Codex provider uses its settled branch.
overrideExports('cKRc', {}, { deferred: true }, {
  d: atom => localCodexAdapter.adaptBrowserDiscoveryAtom(atom, requireOriginal),
});

// The site supplies a real text/tool executor over browser-origin storage.
// Retain native permissions/workspace/config checks and unsupported OS errors.
overrideExports('ckTT', {}, { deferred: true }, {
  a: capability => localCodexAdapter.createBrowserExecutionCapability(capability),
});
overrideExports('bVzl', {}, { deferred: true }, {
  a: host => localCodexAdapter.getBrowserOriginHost(host),
});
overrideExports('mYel', {}, { deferred: true }, {
  a: HostService => localCodexAdapter.createBrowserExecutionHosts(HostService),
});
overrideExports('OVto', {}, { deferred: true }, {
  a: ProjectCatalog => localCodexAdapter.createBrowserProjectCatalog(ProjectCatalog),
});
overrideExports('o4oB', {}, { deferred: true }, {
  b: atom => localCodexAdapter.adaptBrowserWorkspaceSelectionAtom(atom, requireOriginal),
});
overrideExports('HSUP', {}, { deferred: true }, {
  a: atom => localCodexAdapter.adaptBrowserWorkspaceResolverAtom(atom, requireOriginal),
  b: atom => localCodexAdapter.adaptBrowserWorkspaceResolverAtom(atom, requireOriginal),
});

// jiwy is the native provider-capability boundary. Keep its other permissions,
// including computer/Slack access, and supply only the real local Dot service.
adaptFactory('jiwy', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, { get(target, key, receiver) {
    if (key !== 'd') return Reflect.get(target, key, receiver);
    return (destination, getters, values) => {
      if (destination !== exports) return require.d(destination, getters, values);
      const original = { ...values };
      for (const [name, read] of Object.entries(getters || {})) Object.defineProperty(original, name, { get: read, enumerable: true, configurable: true });
      let adapted;
      const nextGetters = { ...getters }, nextValues = { ...values };
      for (const name of ['a','c','d','f','b','i']) {
        nextGetters[name] = () => (adapted ??= localDotAdapter.adaptCapabilityAtoms(original, require))[name];
        delete nextValues[name];
      }
      return require.d(destination, nextGetters, nextValues);
    };
  } });
  return factory.call(this, module, exports, scopedRequire);
}, { deferred: true });

// A clean document contains no private server-rendered state. Use the original
// React DOM renderer at the document root for this first proof; its entire
// component tree, router, event handlers and animation components stay intact.
// This is a single platform mount boundary, not a replacement UI implementation.
if (plan.mountMode === 'client') adaptFactory('CE87', factory => function(module, exports, require) {
  factory.call(this, module, exports, require);
  const original = module.exports;
  module.exports = {
    ...original,
    hydrateRoot(container, children, options) {
      const root = original.createRoot(container, options);
      root.render(children);
      return root;
    },
  };
});

// EAKz.a remains the original class: initialization, pending requests,
// notification dispatch and reconciliation all retain their original code.
const codexContextRpc = localCodexAdapter.createRpcFacade({
  getRequestContext: (method, params) => localCodexAdapter.getBrowserRequestContext(method, params, {
    sidebarProductMode: globalThis.history?.state?.usr?.sidebarProductMode ?? globalThis.history?.state?.sidebarProductMode,
  }),
});
overrideExports('EAKz', {
  b: async () => new LocalAppServerSocket(boundary.diagnostics, localDotAdapter.createRpcFacade(codexContextRpc)),
});
overrideExports('AqQr', {}, { deferred: true }, {
  b: () => createNativeSiteSignOut({ complete: siteSignOut.complete, markBrowserSignedOut: () => requireOriginal('QdUF').markBrowserChatGptSignedOut() }),
});
overrideExports('waM8', {}, { deferred: true }, {
  a: wrapNativeWorkedDuration,
});
overrideExports('hUUF', {}, { deferred: true }, { b: wrapNativeReasoningGroups });
const siteLoginRoute = () => createNativeSiteLoginRoute({
  useLocation: requireOriginal('jqIZ').Y, useEffect: requireOriginal('zd8w').useEffect,
});
overrideExports('mjCR', {}, { deferred: true }, { Nb: siteLoginRoute, T: siteLoginRoute });
overrideExports('AqC0', {}, { deferred: true }, { e: original => wrapNativeCodexWorkTiming(original, timingServer) });
overrideExports('OrBF', {}, { deferred: true }, {
  a: frameURL => (...args) => {
    const path = frameURL(...args);
    if (typeof path === 'string' && path.startsWith('/_orbit-renderer/')) return new URL(path.slice(1), getSiteHomeUrl()).pathname;
    return path;
  },
});

// The native curated option already offers the automatic selection and slider.
overrideExports('dU23', {}, { deferred: true }, {
  a: NativePicker => function SiteWorkModelPicker(props) {
    const modelListConfig = consolidateWorkDefaults(props.modelListConfig, WORK_DEFAULT_OPTION.label);
    return requireOriginal('ABep').jsx(NativePicker, { ...props, modelListConfig });
  },
});

overrideExports('Y0ov', {}, { deferred: true }, {
  b: Card => createNativeSiteTrialCard(Card, {
    React: requireOriginal('zd8w'), Button: requireOriginal('Sm6l').a,
    Amount: requireOriginal('EamN').a, Frequency: requireOriginal('EamN').c,
  }),
});

// Preserve the original host class/RpcTarget inheritance and all public setting
// definitions. Only its browser-storage implementation changes; UI/controller
// readiness still follows the real readAll result through original ADAj.
adaptFactory('YCTv', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, {
    get(target, key, receiver) {
      if (key !== 'd') return Reflect.get(target, key, receiver);
      return (destination, getters, values) => {
        if (destination === exports && values?.b) values = { ...values, b: createLocalHostSettingsClass(values.b, { canSelectModels: hasModelSelectionAccess, settings: require('I07G'), browser: require('vOiO'), cookie: require('ZhRn'), cookieValue: require('NGML') }) };
        return require.d(destination, getters, values);
      };
    },
  });
  return factory.call(this, module, exports, scopedRequire);
});

// Source OFP1 still owns readiness/aggregation. Its pure access-policy seam
// delegates only the local Free text provider to our actual local transport.
adaptFactory('dbUr', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, {
    get(target, key, receiver) {
      if (key !== 'd') return Reflect.get(target, key, receiver);
      return (destination, getters, values) => {
        if (destination === exports && values?.a) values = { ...values, a: createLocalWorkPolicy(values.a, getLocalExecutionCapabilities, getPrototypeLocalAuth) };
        return require.d(destination, getters, values);
      };
    },
  });
  return factory.call(this, module, exports, scopedRequire);
});

// Site policy keeps the original Pro controller and hides it for Free.
// Separate Chat/Work mode controls remain owned by the original parent.
adaptFactory('pPWr', factory => function(module, exports, require) {
  let PolicyPicker;
  const scopedRequire = new Proxy(require, {
    get(target, key, receiver) {
      if (key !== 'd') return Reflect.get(target, key, receiver);
      return (destination, getters, values) => {
        if (destination === exports && (getters?.a || values?.a)) {
          const getOriginal = getters?.a ?? (() => values.a);
          getters = { ...getters, a: () => PolicyPicker ??= createNativeModelSelectionPolicy(getOriginal(), require('zd8w').createElement, hasModelSelectionAccess) };
          if (values?.a) { values = { ...values }; delete values.a; }
        }
        return require.d(destination, getters, values);
      };
    },
  });
  return factory.call(this, module, exports, scopedRequire);
});

overrideExports('IBeT', {}, undefined, {
  a: OriginalPicker => createNativeModelSelectionPolicy(OriginalPicker, requireOriginal('zd8w').createElement, hasModelSelectionAccess),
});

// Free keeps the source's original + menu Think item without a model controller.
// i8cy's eligibility and system-hint state remain native; this selects its
// existing menu-only branch, also used by the original narrow/coarse layout.
overrideExports('i8cy', {}, undefined, {
  a: originalHook => createNativeThinkingEntryPolicy(originalHook, hasModelSelectionAccess),
});

// The explicit ?localSession=1 switch supplies an unmistakably local identity.
// Default is signed out. No Google/OpenAI login or captured credential is used.
// The original auth state machine is the default; originalAuth=0 is a comparison-only local shim.
const useOriginalAuth = new URL(location.href).searchParams.get('originalAuth') !== '0';
boundary.diagnostics.push({ type: 'auth-state-engine', source: useOriginalAuth ? 'original-QdUF-with-local-bootstrap' : 'declared-local-auth-getters' });
// QdUF's internal eh/ey closures keep the official hostname assumptions.
// Route both public login functions through the same local account boundary.
let siteLoginRedirecting = false;
function getSiteAuthPageUrl(name) {
  if (name === 'logout') return new URL('auth/logout', getSiteHomeUrl());
  if (name !== 'login' && name !== 'signup') return new URL('/auth/' + name, location.origin);
  const target = new URL(getSiteLoginUrl(), location.href);
  if (name === 'signup') target.pathname = target.pathname.replace(/\/login\/?$/, '/signup');
  return target;
}
function isSiteLoginPage() {
  const target = new URL(getSiteLoginUrl(), location.href);
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const login = target.pathname.replace(/\/+$/, '') || '/';
  return path === login || path === login.replace(/\/login$/, '/auth/login');
}
function redirectToSiteLogin() {
  if (siteLoginRedirecting || isSiteLoginPage()) return;
  const target = new URL(getSiteLoginUrl(), location.href);
  if (target.origin !== location.origin) throw Error('Site login must use the current origin');
  target.searchParams.set('next', location.pathname + location.search + location.hash);
  siteLoginRedirecting = true;
  location.assign(target.href);
}
function maybeRedirectToSiteLogin() {
  if (isPrototypeLocalSession() || siteLoginRedirecting || isSiteLoginPage()) return false;
  redirectToSiteLogin();
  return true;
}

overrideExports('QdUF', {
  getBrowserAuthPageUrl: getSiteAuthPageUrl,
  redirectToBrowserChatGptLogin: redirectToSiteLogin,
  maybeRedirectToBrowserChatGptLogin: maybeRedirectToSiteLogin,
  maybeRedirectToBrowserChatGptLogout: () => false,
  ...(!useOriginalAuth ? {
  loadBrowserChatGptAuth: async () => getPrototypeLocalAuth(),
  getOrLoadBrowserChatGptAuth: () => getPrototypeLocalAuth(),
  getBrowserChatGptAuthSnapshot: getPrototypeLocalAuth,
  getBrowserChatGptDocumentAuth: getPrototypeLocalAuth,
  getBrowserChatGptAuthGeneration: getPrototypeLocalAuthGeneration,
  isBrowserChatGptSignedOut: async () => !isPrototypeLocalSession(),
  isBrowserGuestChatSession: () => false,
  isBrowserSessionExpired: () => false,
  isBrowserWorkspaceSwitchPending: () => false,
  isBrowserAccountSwitchLoading: () => false,
  refreshBrowserChatGptAuth: async () => getPrototypeLocalAuth(),
  recoverBrowserChatGptAuth: async () => ({ auth: getPrototypeLocalAuth(), recovery: 'reused_current_session' }),
  clearBrowserAuth: clearPrototypeLocalSession,
  markBrowserChatGptSignedOut: clearPrototypeLocalSession,
  maybeRedirectToBrowserChatGptLogout: () => false,
  } : {}),
}, undefined, {
  readChatGptTokenClaims: originalReader => createLocalHostClaimsReader(originalReader, {
    getSession: getPrototypeLocalSession, getAuth: getPrototypeLocalAuth, isLocalSession: isPrototypeLocalSession,
  }),
});

// Browser-saved HTML omits the initial module bootstrap. Reconstitute the exact
// five-route module envelope found in chatgpt-public.html, before original hxQI.
await import(plan.manifest);
if (globalThis.__CHATGPT_REPLICA_ENV__?.directAssetHost) {
  const siteRoot = new URL(globalThis.__CHATGPT_REPLICA_ENV__.basePath, location.origin);
  localizeRouterAssets(window.__reactRouterManifest, siteRoot, new URL(plan.registrationEntry, import.meta.url).href);
}
const routeModules = Object.fromEntries(await Promise.all(Object.entries(plan.initialRoutes).map(async ([id, file]) => [id, await import(file)])));
window.__reactRouterRouteModules = routeModules;
const initialHistoryToaster = requireOriginal.m.SGsN ? requireOriginal('SGsN').b() : null;
setNativeAccountHistoryToaster(() => {
  if (!requireOriginal.m.SGsN || !document.querySelector('[data-sonner-toaster]')) return null;
  const service = requireOriginal('SGsN').b();
  return service !== initialHistoryToaster ? service : null;
});

// This is the original entry's terminal statement. No extracted component,
// custom UI fragment, HTML click handler, or alternate application is mounted.
if (needsHistoryBeforeMount) await initialHistory;
await entryLibrary.startOriginalClient();
