import { publicAuthEnvelope } from './public-auth-envelope.mjs?v=d54056d29411fe79';
import { getPrototypeLocalSession, isPrototypeLocalSession } from './local-identity.mjs?v=d54056d29411fe79';
import { getPrototypeConfiguration } from './local-configuration.mjs?v=d54056d29411fe79';

/** Plain-JSON subset of the format consumed by original jqIZ.nl (447351...). */
export function encodeRouterState(value) {
  const flattened = [];
  const seen = new Map();
  function index(entry) {
    if (entry === undefined) return -7;
    if (entry === null) return -5;
    if (typeof entry === 'number' && !Number.isFinite(entry)) throw Error('Only plain JSON is supported');
    if (typeof entry === 'object' && seen.has(entry)) return seen.get(entry);
    const position = flattened.length;
    flattened.push(null);
    if (entry && typeof entry === 'object') {
      seen.set(entry, position);
      if (Array.isArray(entry)) flattened[position] = entry.map(index);
      else {
        const object = {};
        for (const [key, child] of Object.entries(entry)) object[`_${index(key)}`] = index(child);
        flattened[position] = object;
      }
    } else flattened[position] = entry;
    return position;
  }
  index(value);
  return `${JSON.stringify(flattened)}\n`;
}

export function installSyntheticDocumentState() {
  const bootstrap = {
    // This synthetic identity is local; signing out must not affect an official session.
    auth: { ...structuredClone(publicAuthEnvelope), federatedLogoutUrl: null },
    authStatus: isPrototypeLocalSession() ? 'logged_in' : 'logged_out',
    session: getPrototypeLocalSession(),
    sessionCookieContext: null,
    locale: 'zh-CN',
    shouldDeepLinkAndroidHomepageToNativeApp: false,
    shouldDeepLinkHomepageToNativeApp: false,
    sidetronMergedWebEnabled: false,
    appServerBackendEnabled: true,
    portalPreviewEnabled: false,
    universeJobsEnabled: false,
    employeeFrontendSwitcherEnabled: false,
    isSearchEvals: false,
    isRoutingExperimentParticipant: false,
    isBrowserSideChat: false,
    optimizeStartup: false,
    composerMode: 'chat',
    statsigPayload: JSON.stringify(getPrototypeConfiguration()),
    statsigBootstrap: { deferredConfigNames: [] },
    statsigContext: { locale: 'zh-CN', deviceId: 'local-prototype' },
    adapterIdentity: isPrototypeLocalSession() ? 'prototype-local-only-not-google-or-openai' : null,
  };
  let node = document.getElementById('client-bootstrap');
  if (!node) {
    node = document.createElement('script');
    node.id = 'client-bootstrap';
    node.type = 'application/json';
    document.head.append(node);
  }
  node.textContent = JSON.stringify(bootstrap);

  // Structure from public HTML, with local no-history data instead of captured
  // account promises. Empty gates use original defaults, so this is deliberately
  // a first-boot probe, not a claim of matching the signed-in feature cohort.
  window.__reactRouterContext = {
    basename: '/',
    future: {
      unstable_enableNodeReadableStream: false,
      unstable_optimizeDeps: false,
      unstable_subResourceIntegrity: false,
      unstable_trailingSlashAwareDataRequests: false,
      v8_middleware: false,
      v8_splitRouteModules: false,
      v8_viteEnvironmentApi: false,
    },
    routeDiscovery: { mode: 'initial' },
    ssr: true,
    isSpaMode: false,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(encodeRouterState({
          loaderData: { 'app.route': null, 'authenticated-layout.route': null },
          actionData: null,
          errors: null,
        })));
        controller.close();
      },
    }),
  };
}
