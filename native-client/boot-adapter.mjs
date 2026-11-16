/**
 * Isolated first-boot scaffold. Never imported by the production application.
 * Loads the original component graph; changes only declared service boundaries.
 * It has not been run against the original bundles.
 */
import { installNetworkBoundary, LocalAppServerSocket, getLocalExecutionCapabilities } from './service-boundary.mjs?v=78e7bc02bd4001a6';
import { installSyntheticDocumentState } from './synthetic-bootstrap.mjs?v=78e7bc02bd4001a6';
import { getPrototypeLocalAuth, isPrototypeLocalSession, getPrototypeLocalAuthGeneration, clearPrototypeLocalSession } from './local-identity.mjs?v=78e7bc02bd4001a6';
import { createLocalHostSettingsClass } from './local-host-settings.mjs?v=78e7bc02bd4001a6';
import { createLocalWorkPolicy } from './local-work-policy.mjs?v=78e7bc02bd4001a6';
import { hasModelSelectionAccess, getSiteLoginUrl } from './site-account.mjs?v=78e7bc02bd4001a6';
import { createNativeModelSelectionPolicy } from './local-model-selection-policy.mjs?v=78e7bc02bd4001a6';

const boundary = installNetworkBoundary();
globalThis.__originalClientProbe = boundary.diagnostics;
installSyntheticDocumentState();
if (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\/$/, '') || '/';

const plan = await (await fetch(new URL('./entry-plan.json?v=78e7bc02bd4001a6', import.meta.url))).json();
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

function adaptFactory(moduleId, transform) {
  if (requireOriginal.c[moduleId]) throw Error(`Adapter installed too late: ${moduleId}`);
  transforms.set(moduleId, transform);
  if (!requireOriginal.m[moduleId]) throw Error(`Original boundary module is absent: ${moduleId}`);
  requireOriginal.m[moduleId] = requireOriginal.m[moduleId];
}

/** Substitute exports before their factory is instantiated, leaving its code intact. */
function overrideExports(moduleId, overrides) {
  adaptFactory(moduleId, factory => function(module, exports, require) {
    const scopedRequire = new Proxy(require, {
      get(target, key, receiver) {
        if (key !== 'd') return Reflect.get(target, key, receiver);
        return (destination, getters, values) => {
          if (destination !== exports) return require.d(destination, getters, values);
          const nextGetters = { ...getters };
          const nextValues = { ...values };
          for (const [name, value] of Object.entries(overrides)) {
            delete nextGetters[name];
            nextValues[name] = value;
          }
          return require.d(destination, nextGetters, nextValues);
        };
      },
    });
    return factory.call(this, module, exports, scopedRequire);
  });
}

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
overrideExports('EAKz', {
  b: async () => new LocalAppServerSocket(boundary.diagnostics),
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

// Site policy uses the source picker's own disabled prop. It disables the
// original trigger, open callback and model shortcut without replacing its UI.
// The merged-picker layer stays enabled, preserving Chat/Work.
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

// The explicit ?localSession=1 switch supplies an unmistakably local identity.
// Default is signed out. No Google/OpenAI login or captured credential is used.
// The original auth state machine is the default; originalAuth=0 is a comparison-only local shim.
const useOriginalAuth = new URL(location.href).searchParams.get('originalAuth') !== '0';
boundary.diagnostics.push({ type: 'auth-state-engine', source: useOriginalAuth ? 'original-QdUF-with-local-bootstrap' : 'declared-local-auth-getters' });
overrideExports('QdUF', {
  getBrowserAuthPageUrl: name => name === 'login' ? new URL(getSiteLoginUrl(), location.href) : new URL('/auth/' + name, location.origin),
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
  maybeRedirectToBrowserChatGptLogin: () => false,
  maybeRedirectToBrowserChatGptLogout: () => false,
  redirectToBrowserChatGptLogin: () => boundary.diagnostics.push({ type: 'unavailable', service: 'login' }),
  } : {}),
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
