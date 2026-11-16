/**
 * Loads the public original component graph with explicit local host services.
 * Private original backend credentials are never used by this entry point.
 */
import { installNetworkBoundary, LocalAppServerSocket, getLocalExecutionCapabilities, localCodexAdapter, localDotAdapter, localFilesService, localLibraryService, localLibraryByteTransport } from './service-boundary.mjs?v=3b90ea6eb4e00062';
import * as mapLibreRenderer from './map-vendor/maplibre-gl.mjs?v=3b90ea6eb4e00062';
import { createLocalMapProvider } from './local-map-provider.mjs?v=3b90ea6eb4e00062';
import { installSyntheticDocumentState } from './synthetic-bootstrap.mjs?v=3b90ea6eb4e00062';
import { getPrototypeLocalSession, getPrototypeLocalAuth, isPrototypeLocalSession, getPrototypeLocalAuthGeneration, clearPrototypeLocalSession } from './local-identity.mjs?v=3b90ea6eb4e00062';
import { createLocalHostSettingsClass } from './local-host-settings.mjs?v=3b90ea6eb4e00062';
import { createLocalWorkPolicy } from './local-work-policy.mjs?v=3b90ea6eb4e00062';
import { hasModelSelectionAccess, getSiteLoginUrl } from './site-account.mjs?v=3b90ea6eb4e00062';
import { createNativeModelSelectionPolicy, createNativeThinkingEntryPolicy } from './local-model-selection-policy.mjs?v=3b90ea6eb4e00062';
import { createLocalHostClaimsReader } from './local-token-identity.mjs?v=3b90ea6eb4e00062';
import { wrapNativeFileUploadClass } from './local-native-upload.mjs?v=3b90ea6eb4e00062';

const boundary = installNetworkBoundary();
globalThis.__originalClientProbe = boundary.diagnostics;
installSyntheticDocumentState();
if (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\/$/, '') || '/';

const plan = await (await fetch(new URL('./entry-plan.json?v=3b90ea6eb4e00062', import.meta.url))).json();
const { __webpack_require__: requireOriginal } = await import(plan.runtime);
// One mechanical entry transform defers its terminal hxQI invocation and
// rebases its relative imports. All original factories and chunks are retained.
const entryLibrary = await import(plan.registrationEntry);
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

// Keep native upload behavior while local tickets store their real bytes.
overrideExports('GDNt', {}, { deferred: true }, { b: NativeWebFetch => wrapNativeFileUploadClass(NativeWebFetch, localFilesService, undefined, localLibraryByteTransport) });

// The native download flow also serves this browser's verified local files.
// Preserve its URL validation for every URL outside this provider's registry.
overrideExports('GfAi', {}, { deferred: true }, {
  b: validateURL => function (value, ...args) {
    if (typeof value === 'string' && localLibraryService.ownsObjectURL(value.trim())) return value.trim();
    return validateURL.call(this, value, ...args);
  },
});

// Retain the original viewer/worker version pair under this site's asset base.
// A Worker entry must be directly available from the deployed project path.
const nativePdfWorker = new URL('./artifact-assets/pdf.worker.min.f6ffbd8da0.mjs', import.meta.url);
const nativeAssetVersion = new URL(import.meta.url).searchParams.get('v');
if (nativeAssetVersion) nativePdfWorker.searchParams.set('v', nativeAssetVersion);
overrideExports('uvgn', { a: nativePdfWorker.toString() }, { deferred: true });

// Only the map renderer/style provider changes. The original s2JQ React map
// and all its surrounding controls retain their captured implementation.
const localMapProvider = createLocalMapProvider({ renderer: mapLibreRenderer, diagnostics: boundary.diagnostics });
localMapProvider.configureRenderer();
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
  b: async () => new LocalAppServerSocket(boundary.diagnostics, codexContextRpc),
});

// Preserve the original host class/RpcTarget inheritance and all public setting
// definitions. Only its browser-storage implementation changes; UI/controller
// readiness still follows the real readAll result through original ADAj.
adaptFactory('YCTv', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, {
    get(target, key, receiver) {
      if (key !== 'd') return Reflect.get(target, key, receiver);
      return (destination, getters, values) => {
        if (destination === exports && values?.b) values = { ...values, b: createLocalHostSettingsClass(values.b, { settings: require('I07G'), browser: require('vOiO'), cookie: require('ZhRn'), cookieValue: require('NGML') }) };
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
const routeModules = {};
for (const [id, file] of Object.entries(plan.initialRoutes)) {
  routeModules[id] = await import(file);
}
window.__reactRouterRouteModules = routeModules;

// This is the original entry's terminal statement. No extracted component,
// custom UI fragment, HTML click handler, or alternate application is mounted.
await entryLibrary.startOriginalClient();
