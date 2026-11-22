import { createBrowserReadAloudController, createNativeReadAloudBindings } from './local-native-read-aloud.mjs?v=771721901c169502';
import { normalizeWorkUIStoredPreference, WORK_DEFAULT_OPTION } from '../model-catalog.js?v=771721901c169502';
import { consolidateWorkDefaults } from './model-catalog-adapter.mjs?v=771721901c169502';
/**
 * Loads the public original component graph with explicit local host services.
 * Private original backend credentials are never used by this entry point.
 */
import { installNetworkBoundary, LocalAppServerSocket, getLocalExecutionCapabilities, localCodexAdapter, localDotAdapter, localFilesService, localOwnedDownloadTransport, localLibraryByteTransport, initializeLocalAccountHistory, setNativeAccountHistoryToaster, initializeLocalPublishedResources, registerNativeLibrarySource, notifyNativeLibrarySourceReady, registerNativeFileReferenceSources, localReadAloudHost } from './service-boundary.mjs?v=771721901c169502';
import { installDeferredMapProvider } from './local-map-provider.mjs?v=771721901c169502';
import { installSyntheticDocumentState } from './synthetic-bootstrap.mjs?v=771721901c169502';
import { getPrototypeLocalSession, getPrototypeLocalAuth, isPrototypeLocalSession, getPrototypeLocalAuthGeneration, clearPrototypeLocalSession } from './local-identity.mjs?v=771721901c169502';
import { createLocalHostSettingsClass } from './local-host-settings.mjs?v=771721901c169502';
import { createLocalWorkPolicy } from './local-work-policy.mjs?v=771721901c169502';
import { hasModelSelectionAccess, getSiteAccount, getSiteLoginUrl, getSiteHomeUrl } from './site-account.mjs?v=771721901c169502';
import { createNativeSiteTrialCard } from './native-pricing-trials.mjs?v=771721901c169502';
import { createNativeSiteUsageLayout } from './local-pricing.mjs?v=771721901c169502';
import { createNativeSiteSignOut, isSiteSignOutPage } from './site-signout.mjs?v=771721901c169502';
import { createNativeSiteLoginRoute } from './native-site-login.mjs?v=771721901c169502';
import { localizeRouterAssets } from './startup-compatibility.mjs?v=771721901c169502';
import { siteSignOut, localAppServer as timingServer } from './service-boundary.mjs?v=771721901c169502';
import { wrapNativeChatPreamble, wrapNativeClassicChatTiming, wrapNativeClassicStatus, wrapNativeClassicTiming, wrapNativeReasoningGroups } from './classic-chat-adapter.mjs?v=771721901c169502';
import { projectNativeCodexPublicSummary, storedConversationSurface, wrapNativeCodexActivityItem, wrapNativeCodexWorkTiming, wrapNativeWorkedDuration } from './local-app-server.mjs?v=771721901c169502';
import { projectNativeCodexPythonResult } from './native-python-activity.mjs?v=771721901c169502';
import { terminalSiteInferenceReason } from './site-inference-transport.mjs?v=771721901c169502';
import { createNativeModelSelectionPolicy, createNativeThinkingEntryPolicy } from './local-model-selection-policy.mjs?v=771721901c169502';
import { createLocalHostClaimsReader } from './local-token-identity.mjs?v=771721901c169502';
import { wrapNativeFileUploadClass } from './local-native-upload.mjs?v=771721901c169502';
import { wrapNativeDownloadServices } from './local-native-download.mjs?v=771721901c169502';
import { createLocalDotVoiceTargetWrapper, createLocalDotVoiceWrappers } from './local-dot-browser-voice.mjs?v=771721901c169502';

const boundary = installNetworkBoundary();
globalThis.__originalClientProbe = boundary.diagnostics;
// A fresh-device deep link needs its conversation before the router reads it.
// A home page can render while the same owner-scoped sync and attachment restore run.
const threadOnEntry = location.pathname.match(/\/(?:c|conversation|tasks|local)\/([^/]+)\/?$/)?.[1];
const needsHistoryBeforeMount = threadOnEntry && !timingServer.threads.has(threadOnEntry);
const initialHistory = initializeLocalAccountHistory({ threadOnEntry });
void initialHistory.then(() => initializeLocalPublishedResources()).catch(() => {});
installSyntheticDocumentState(localCodexAdapter.mergeConfiguration);
if (globalThis.__CHATGPT_REPLICA_ENV__) window.__reactRouterContext.basename = globalThis.__CHATGPT_REPLICA_ENV__.basePath.replace(/\/$/, '') || '/';

const plan = {"mountMode":"client","runtime":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/633146.511711c8b9.js","manifest":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/manifest-cc4b2666.js","initialRoutes":{"root":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/736644.5dc2aa3e01.js","app.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/538990.0b9bfd953f.js","flow-layout.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/687836.2297ae7176.js","authenticated-layout.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/42763.651fb3c98a.js","home.route":"/chatgpt/original-client/public/chatgpt.com/cdn/assets/906348.52ddffd68a.js"},"registrationEntry":"./entry-library.mjs?v=5c7eb02b441bce39"};
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
    mutableAtom: (...args) => requireOriginal('Q840').u(...args),
    derivedAtom: (...args) => requireOriginal('Q840').d(...args),
    scopeAtom: rootScope,
    // Read the player's stop action after its factory has instantiated.
    // wrapped stop is safe: the new speech record has not been created yet.
    stopNative: scope => requireOriginal('WNfO').b(scope),
  });
}
overrideExports('WNfO', {}, { deferred: true }, {
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
  b: originalAtom => requireOriginal('Q840').c(
    requireOriginal('OWtl').a,
    ({ get }) => normalizeWorkUIStoredPreference(get(originalAtom)),
  ),
});
// END LOCAL LUNA SAVED-PREFERENCE READ BOUNDARY

overrideExports('Q840', {}, { deferred: true }, {
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
      sanitizeFileName: value => requireOriginal('yZpl').oh(value),
      maxBytes: requireOriginal('yZpl').Jd,
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
const mapStylesURL = new URL('./map-vendor/maplibre-gl.css', import.meta.url);
if (nativeAssetVersion) mapRendererURL.searchParams.set('v', nativeAssetVersion);
if (nativeAssetVersion) mapStylesURL.searchParams.set('v', nativeAssetVersion);
let mapStylesReady;
function loadMapStyles() {
  return mapStylesReady ??= new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = mapStylesURL.href;
    link.onload = resolve;
    link.onerror = () => {
      link.remove();
      reject(Error('Could not load the map renderer stylesheet.'));
    };
    document.head.append(link);
  }).catch(error => {
    mapStylesReady = undefined;
    throw error;
  });
}
const localMapProvider = installDeferredMapProvider(requireOriginal, {
  async loadRenderer() {
    const [renderer] = await Promise.all([requireOriginal.ir(mapRendererURL.href), loadMapStyles()]);
    return renderer;
  },
  diagnostics: boundary.diagnostics,
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

// The native browser-host model slider consumes the site's shared Work presets.
overrideExports('agZi', {}, { deferred: true }, {
  a: atom => localCodexAdapter.adaptBrowserSliderConfigAtom(atom, requireOriginal),
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
      for (const name of ['a','b','c','d','e','f','g','j']) {
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
overrideExports('AuIy', {}, { deferred: true }, { o: wrapNativeChatPreamble });
overrideExports('hUUF', {}, { deferred: true }, { b: wrapNativeReasoningGroups });
overrideExports('R2pa', {}, { deferred: true }, {
  a: original => wrapNativeClassicTiming(wrapNativeClassicChatTiming(original)),
});
function useTerminalSiteReceipt(conversationId) {
  const { useCallback, useSyncExternalStore } = requireOriginal('zd8w');
  const subscribe = useCallback(onChange => {
    if (!conversationId) return () => {};
    return timingServer.subscribe(({ method, params }) => {
      if (params.threadId === conversationId && (method === 'turn/started' || method === 'turn/completed')) onChange();
    });
  }, [conversationId]);
  const read = useCallback(() => terminalSiteInferenceReason(timingServer.threads.get(conversationId)?.turns.at(-1)), [conversationId]);
  return useSyncExternalStore(subscribe, read, read);
}
// The original recovery row can still be awaiting a stream after the
// Worker confirms a terminal receipt. The turn owns the final notice.
overrideExports('ESlL', {}, { deferred: true }, {
  a: NativeStatus => function SiteClassicResponseStatus(props) {
    const reason = useTerminalSiteReceipt(props.conversationId);
    if (reason && storedConversationSurface(timingServer.threads.get(props.conversationId)) === 'work') return null;
    return requireOriginal('ABep').jsx(NativeStatus, props);
  },
});
function ChatElapsedStatus({ durationMs }) {
  const { jsx } = requireOriginal('ABep');
  const { locale } = requireOriginal('Wf1j').a();
  const elapsed = requireOriginal('waM8').a(durationMs, locale);
  const summary = jsx(requireOriginal('oyxz').a, {
    id: 'reasoningItem.thoughtWithElapsed', defaultMessage: 'Thought for {elapsed}', values: { elapsed },
  });
  return jsx(requireOriginal('q5qu').a, { padding: 'offset',
    children: jsx(requireOriginal('IgqH').a, { summary, canExpand: false }),
  });
}
// Preserve the native timing row when there is no collapsible activity.
overrideExports('dDrQ', {}, { deferred: true }, {
  a: original => wrapNativeClassicStatus(original, {
    getThread: id => timingServer.threads.get(id),
    useTerminalReceipt: useTerminalSiteReceipt,
    renderTurn: (Component, props) => requireOriginal('ABep').jsx(Component, props),
    renderStatus: (turn, status) => {
      const { jsx, jsxs, Fragment } = requireOriginal('ABep');
      return jsxs(Fragment, { children: [turn, jsx(requireOriginal('XSEO').a, status)] });
    },
    renderRecovery: (turn, reason) => {
      const { jsx, jsxs, Fragment } = requireOriginal('ABep');
      const state = reason === 'expired' ? '服务端回放已到期。' : '这次回复已中断。';
      return jsxs(Fragment, { children: [turn, jsx(requireOriginal('MM0V').a, {
        role: 'alert', type: 'error', variant: 'callout',
        content: state + '已保留此对话中的现有内容。请在输入框发送新消息继续。',
        primaryCtaText: '继续输入',
        onPrimaryCtaClick: () => {
          const editors = document.querySelectorAll('#prompt-textarea, .ProseMirror[contenteditable=true]');
          Array.from(editors).find(node => node.getClientRects().length > 0)?.focus();
        },
      })] });
    },
    renderChatElapsed: (turn, durationMs) => {
      const { jsx, jsxs, Fragment } = requireOriginal('ABep');
      return jsxs(Fragment, { children: [turn, jsx(ChatElapsedStatus, { durationMs })] });
    },
  }),
});
const { o: voicePhase, q: voiceFailure, r: voiceBlock, v: startVoice, ...voiceControls } =
  createLocalDotVoiceWrappers({ adapter: localDotAdapter, requireOriginal });
overrideExports('Sd1s', {}, { deferred: true }, { ...voiceControls, n: voicePhase, p: voiceFailure, q: voiceBlock, u: startVoice });
overrideExports('AXK1', {}, { deferred: true }, { b: createLocalDotVoiceTargetWrapper({ adapter: localDotAdapter, requireOriginal }) });
const siteLoginRoute = () => createNativeSiteLoginRoute({
  useLocation: requireOriginal('rEML').Z, useEffect: requireOriginal('zd8w').useEffect,
});
overrideExports('jEbc', {}, { deferred: true }, { Mb: siteLoginRoute, S: siteLoginRoute });
overrideExports('cOHk', {}, { deferred: true }, { e: original => wrapNativeCodexWorkTiming(original, timingServer) });
overrideExports('NQNw', {}, { deferred: true }, { a: wrapNativeCodexActivityItem });
overrideExports('qGHI', {}, { deferred: true }, {
  a: NativeItem => function SiteCodexActivityRow(props) {
    return requireOriginal('ABep').jsx(NativeItem, { ...props, item: projectNativeCodexPublicSummary(props.item) });
  },
});
overrideExports('oUAt', {}, { deferred: true }, {
  a: NativeTurn => function SiteCodexTurn(props) {
    const { jsx, jsxs, Fragment } = requireOriginal('ABep');
    const component = jsx(NativeTurn, props);
    const thread = timingServer.threads.get(props.conversationId);
    if (storedConversationSurface(thread) !== 'codex') return component;
    const turn = thread.turns.findLast(turn => turn.id === props.turn?.turnId);
    const running = turn?.status === 'inProgress' && turn.items.some(item =>
      item.type === 'agentMessage' && typeof item.text === 'string' && item.text.trim());
    const startedAtMs = running && turn.adapterMetadata?.reasoningLifecycle?.workStartedAtMs;
    return jsxs(Fragment, { children: [component,
      Number.isFinite(startedAtMs) ? jsx(requireOriginal('XSEO').a, { status: 'working', startedAtMs, completedAtMs: null }) : null,
    ] });
  },
});
overrideExports('BGqp', {}, { deferred: true }, {
  a: NativeTool => function SiteCodexTool(props) {
    const { jsx } = requireOriginal('ABep');
    const thread = timingServer.threads.get(props.conversationId);
    if (storedConversationSurface(thread) !== 'codex') return jsx(NativeTool, props);
    const { item } = props;
    const observed = item.result?.type === 'error' && item.invocation.server === 'browser_workspace' && item.invocation.tool === 'python'
      ? thread.turns.findLast(turn => turn.items.some(entry => entry.id === item.callId))?.items.find(entry => entry.id === item.callId)?.livePythonOutput
      : undefined;
    return jsx(NativeTool, { ...props, item: projectNativeCodexPythonResult(item, observed) });
  },
});
overrideExports('lAsD', {}, { deferred: true }, {
  b: NativeActivity => function SiteCodexActivity(props) {
    const { jsx, jsxs, Fragment } = requireOriginal('ABep');
    const thread = timingServer.threads.get(props.agentActivityProps?.conversationId);
    if (storedConversationSurface(thread) !== 'codex') return jsx(NativeActivity, props);
    const body = [], activities = [];
    for (const unit of props.units) {
      const item = unit.kind === 'standalone' ? unit.item.item : null;
      (item?.type === 'assistant-message' && item.phase === 'commentary' ? body : activities).push(unit);
    }
    return jsxs(Fragment, { children: [
      body.length ? jsx(requireOriginal('toTV').a, { ...props.agentActivityProps, ...props.visibleAgentActivityProps, units: body }) : null,
      jsx(NativeActivity, { ...props, units: body.length ? activities : props.units }),
    ] });
  },
});
overrideExports('OrBF', {}, { deferred: true }, {
  a: frameURL => (...args) => {
    const path = frameURL(...args);
    if (typeof path === 'string' && path.startsWith('/_orbit-renderer/')) return new URL(path.slice(1), getSiteHomeUrl()).pathname;
    return path;
  },
});

// The native curated option already offers the automatic selection and slider.
overrideExports('majR', {}, { deferred: true }, {
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

const isSiteUsageRoute = () => Boolean(getSiteAccount()) &&
  location.pathname.replace(/\/$/, '') === new URL('settings/usage', getSiteHomeUrl()).pathname;
overrideExports('jxU8', {}, { deferred: true }, {
  a: Layout => createNativeSiteUsageLayout(Layout, {
    React: requireOriginal('zd8w'), Section: requireOriginal('BSnr').a,
    Group: requireOriginal('ZEx5').a, Row: requireOriginal('AWNZ').d,
    useUsage: () => requireOriginal('Q840').z(requireOriginal('gPv1').c),
    getIdentity: getPrototypeLocalAuth, isUsageRoute: isSiteUsageRoute,
  }),
});
overrideExports('WXto', {}, { deferred: true }, {
  g: original => function useSiteCreditSettings(...args) {
    const settings = original.apply(this, args);
    return args[1] === 'usage' && isSiteUsageRoute()
      ? { ...settings, canManageCreditSettings: false, canPurchaseBusinessCredits: false }
      : settings;
  },
});

// Preserve the original host class/RpcTarget inheritance and all public setting
// definitions. Only its browser-storage implementation changes; UI/controller
// readiness still follows the real readAll result through original ADAj.
adaptFactory('YCTv', factory => function(module, exports, require) {
  const scopedRequire = new Proxy(require, {
    get(target, key, receiver) {
      if (key !== 'd') return Reflect.get(target, key, receiver);
      return (destination, getters, values) => {
        if (destination === exports && values?.b) {
          const definitions = require('osjx');
          const settings = { Od: definitions.b, lf: definitions.k, lh: definitions.q, Ij: definitions.x, mh: definitions.r, uh: definitions.s };
          values = { ...values, b: createLocalHostSettingsClass(values.b, { canSelectModels: hasModelSelectionAccess, settings, browser: require('vOiO'), cookie: require('ZhRn'), cookieValue: require('NGML') }) };
        }
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

overrideExports('cE61', {}, undefined, {
  b: OriginalPicker => createNativeModelSelectionPolicy(OriginalPicker, requireOriginal('zd8w').createElement, hasModelSelectionAccess),
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
function shouldSkipSiteLogin() {
  return siteLoginRedirecting || isSiteLoginPage() || isSiteSignOutPage(location.href, getSiteHomeUrl());
}
function redirectToSiteLogin() {
  if (shouldSkipSiteLogin()) return;
  const target = new URL(getSiteLoginUrl(), location.href);
  if (target.origin !== location.origin) throw Error('Site login must use the current origin');
  target.searchParams.set('next', location.pathname + location.search + location.hash);
  siteLoginRedirecting = true;
  location.assign(target.href);
}
function maybeRedirectToSiteLogin() {
  if (isPrototypeLocalSession() || shouldSkipSiteLogin()) return false;
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
overrideExports('okWI', {}, { deferred: true }, {
  a: original => async args => {
    const id = args.params?.entityId;
    if (typeof id !== 'string' || !/^lbe1_[A-Za-z0-9_-]{24}$/.test(id)) return original(args);
    const response = await fetch('/__codex-api/local/entities/' + encodeURIComponent(id), { signal: args.request?.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw response;
    const { business } = await response.json();
    return { place: business, canonicalUrl: new URL('maps/' + id, getSiteHomeUrl()).href, image: null, richLinkRendersEnabled: false };
  },
});
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
