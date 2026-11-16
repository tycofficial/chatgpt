/**
 * Local service seam for the unmodified original Codex component graph.
 * No alternate UI, cloud task DTO, account entitlement, or OAuth implementation.
 *
 * Source lock ef0c3fb941611420d8683bf88f61acf1a8ac6b19 / manifest98f8ff8a:
 * StMt 337882.da1b5beae8.js:231308-238125 (three browser Codex UI gates).
 * ztxE 7078.c420b9a2f6.js:72482-73402 (browser/account access policy atom).
 * r8WG/qixt 76629.ac20799396.js:163172-164852 (detail mode persistence).
 * dZk8 76629.ac20799396.js:394740-403985 (native sidebar click handler).
 * pasN 76629.ac20799396.js:817570-818096 (sidebar product mode).
 * Tqg2 async/179531.371d1de6a1.js:696-32533 (CodexComposerAdapter).
 * aVy5 async/131573.a965ef0d42.js:523279-547256 (local submission hook).
 * EAKz retains its original protocol/state reconciliation over LocalProtocolSocket.
 */
import { WORK_MODEL_IDS } from '../model-catalog.js?v=3b90ea6eb4e00062';
export const CODEX_DETAIL_MODE = 'STEPS_COMMANDS';
export const WORK_DETAIL_MODE = 'STEPS_PROSE';
export const CODEX_BROWSER_UI_GATES = Object.freeze(['3999836663', '4019944087', '515412992']);
export const CODEX_MODEL_IDS = WORK_MODEL_IDS;
export const CODEX_SOURCE_CONTRACT = Object.freeze({
  route: '/', routeState: 'sidebarProductMode', productMode: 'codex',
  policyModule: 'ztxE', policyExport: 'a',
  nativeInputsModule: 'Cslg', nativeInputsExport: 'm',
  nativeAtomModule: 'BolX', nativeAtomExport: 'c',
  nativeScopeModule: 'OWtl', nativeScopeExport: 'a',
  detailMode: CODEX_DETAIL_MODE,
  composerModule: 'Tqg2', composerExport: 'CodexComposerAdapter',
  transportModule: 'EAKz', transportExport: 'b',
  originalClientBuild: 'ef0c3fb941611420d8683bf88f61acf1a8ac6b19',
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const MODEL_SET = new Set(CODEX_MODEL_IDS);
// Same original MEQB._DJB2 key lookup, also used by local-configuration.mjs.
function gateHash(name) {
  let hash = 0;
  for (let index = 0; index < name.length; index++) hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  return String(hash >>> 0);
}
function toolName(tool) {
  const name = typeof tool === 'string' ? tool : tool?.function?.name ?? tool?.name;
  return typeof name === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(name) ? name : null;
}

export function createLocalCodexAdapter({
  appServer, models, readSettings,
  getIdentity = () => null,
  isLocalSession = () => false,
  getCapabilities,
  diagnostics = [],
} = {}) {
  if (typeof appServer?.dispatch !== 'function' || typeof appServer?.subscribe !== 'function') {
    throw new TypeError('The shared LocalAppServer is required');
  }
  if (typeof models?.getRpcModelList !== 'function' || typeof readSettings !== 'function') {
    throw new TypeError('The shared model adapter and settings reader are required');
  }
  const rows = models.getRpcModelList()?.data;
  const modelIds = [...new Set(Array.isArray(rows) ? rows.map(row => row.model ?? row.id) : [])];
  if (modelIds.length !== CODEX_MODEL_IDS.length || modelIds.some(id => !MODEL_SET.has(id))) {
    throw new RangeError('Codex must use the same explicit verified model catalog as Work');
  }

  function state() {
    const identity = getIdentity();
    const local = isLocalSession() === true && !!identity?.accountId && !!identity?.userId;
    const settings = readSettings();
    const declared = typeof getCapabilities === 'function' ? getCapabilities() : {
      executionSource: 'local-app-server',
      textConversations: typeof appServer.streamCompletion === 'function' && !!settings?.apiBase && !!settings?.apiKey,
    };
    const executor = appServer.toolExecutor;
    const executable = typeof executor?.execute === 'function';
    const tools = executable && Array.isArray(executor.tools)
      ? [...new Set(executor.tools.map(toolName).filter(Boolean))] : [];
    return {
      identity, local,
      modelSelectionVerified: declared?.modelSelection === true,
      configuredTextProvider: local && declared?.executionSource === 'local-app-server' && declared.textConversations === true && declared.modelSelection !== false,
      toolExecution: executable && declared?.toolExecution !== false,
      filesystem: executable && !!executor.storage && declared?.filesystem !== false,
      tools,
    };
  }

  function executionCapabilities() {
    const current = state();
    const active = current.configuredTextProvider;
    return Object.freeze({
      executionSource: 'local-app-server',
      configuredTextProvider: active,
      textConversations: active,
      // Configuration is not proof of provider access; real response/error wins.
      inferenceAccessVerified: false,
      modelIds: [...modelIds],
      toolExecution: active && current.toolExecution,
      filesystem: active && current.filesystem,
      toolNames: active && current.toolExecution ? [...current.tools] : [],
      pythonExecution: active && current.toolExecution && current.tools.includes('python'),
      shellExecution: false, repositoryWorktree: false,
      cloudEnvironment: false, cloudTaskExecution: false,
      openaiCloudEntitlement: false,
    });
  }

  /**
   * The original policy supplies loading/errors and platform support. Only a
   * coherent authenticated local host may replace its first-party paid-plan
   * requirement. Neither a plan upgrade nor a ChatGPT token is manufactured.
   */
  function resolveBrowserCapability(originalDecision, { inputs, supportedBrowser = false } = {}) {
    const current = state();
    if (!object(originalDecision) || !current.local || !supportedBrowser ||
        originalDecision.isLoading || originalDecision.isError || !object(inputs) ||
        inputs.authLoading || inputs.accountLoading ||
        inputs.accountId !== current.identity.accountId ||
        inputs.authenticatedAccountId !== current.identity.accountId ||
        inputs.userId !== current.identity.userId) return originalDecision;
    return {
      ...originalDecision,
      isLoading: false, isError: false, isCapable: current.configuredTextProvider,
      executionSource: 'local-app-server',
      adapterSource: 'local-codex-provider',
      openaiCloudEntitlement: false,
      capabilities: executionCapabilities(),
    };
  }

  function createBrowserCapabilityAtom(originalAtom, {
    createDerivedAtom, scope, inputsAtom, isSupportedBrowser,
  } = {}) {
    if (!originalAtom || typeof createDerivedAtom !== 'function' || !scope || !inputsAtom ||
        typeof isSupportedBrowser !== 'function') {
      throw new TypeError('Original policy/inputs atoms, BolX.c, OWtl.a and browser check are required');
    }
    return createDerivedAtom(scope, ({ get }) => resolveBrowserCapability(get(originalAtom), {
      inputs: get(inputsAtom), supportedBrowser: isSupportedBrowser() === true,
    }));
  }

  /** Convenience seam for root's existing pre-instantiation export adapter. */
  function adaptBrowserCapabilityAtom(originalAtom, requireOriginal) {
    if (typeof requireOriginal !== 'function') throw new TypeError('Original module require is required');
    return createBrowserCapabilityAtom(originalAtom, {
      createDerivedAtom: requireOriginal('BolX').c,
      scope: requireOriginal('OWtl').a,
      inputsAtom: requireOriginal('Cslg').m,
      isSupportedBrowser: () => requireOriginal('whbo').a() && !requireOriginal('ipGa').a(),
    });
  }

  /**
   * The original cloud-onboarding discovery state is not a local provider
   * entitlement. A verified, ready local Codex provider uses the original
   * settled discovery branch, retaining its native navigation/components.
   */
  const discoverySource = Object.freeze({
    source: 'site-local-codex-provider', discoveryMode: 'configured-local-provider',
    officialCloudEntitlement: false, officialDesktopUsageClaimed: false,
  });
  function resolveBrowserDiscovery(originalValue, { inputs, browserCapability } = {}) {
    const current = state();
    if (!current.local || !current.configuredTextProvider || !current.modelSelectionVerified ||
        !object(inputs) || inputs.authLoading || inputs.accountLoading ||
        inputs.accountId !== current.identity.accountId ||
        inputs.authenticatedAccountId !== current.identity.accountId ||
        inputs.userId !== current.identity.userId ||
        !object(browserCapability) || browserCapability.isLoading ||
        browserCapability.isError || browserCapability.isCapable !== true) return originalValue;
    return false;
  }
  function createBrowserDiscoveryAtom(originalAtom, { createDerivedAtom, scope, inputsAtom, browserCapabilityAtom } = {}) {
    if (!originalAtom || typeof createDerivedAtom !== 'function' || !scope || !inputsAtom || !browserCapabilityAtom) {
      throw new TypeError('Original discovery, capability and identity atoms are required');
    }
    const request = Object.freeze({ name: 'codex.browser' });
    return createDerivedAtom(scope, ({ get }) => resolveBrowserDiscovery(get(originalAtom), {
      inputs: get(inputsAtom), browserCapability: get(browserCapabilityAtom, request),
    }));
  }
  function adaptBrowserDiscoveryAtom(originalAtom, requireOriginal) {
    if (typeof requireOriginal !== 'function') throw new TypeError('Original module require is required');
    return createBrowserDiscoveryAtom(originalAtom, {
      createDerivedAtom: requireOriginal('BolX').c, scope: requireOriginal('OWtl').a,
      inputsAtom: requireOriginal('Cslg').m, browserCapabilityAtom: requireOriginal('StMt').a,
    });
  }

  /** ckTT.a is the original local-target availability seam, not an OS claim. */
  function supportsBrowserOriginExecution() {
    const current = state();
    return typeof appServer.dispatch === 'function' && current.local && current.modelSelectionVerified && current.configuredTextProvider &&
      current.toolExecution && current.filesystem;
  }
  function createBrowserExecutionCapability(originalCapability) {
    if (typeof originalCapability !== 'function') throw new TypeError('The original local execution capability is required');
    return function browserOriginExecutionCapability(...args) {
      return supportsBrowserOriginExecution() || originalCapability.apply(this, args);
    };
  }
  function getBrowserOriginHost(originalHost) {
    if (!object(originalHost) || originalHost.id !== 'local' || originalHost.kind !== 'local' || !supportsBrowserOriginExecution()) return originalHost;
    return Object.freeze({ ...originalHost, display_name: '浏览器工作区',
      adapter_source: 'site-local-codex-provider', filesystem_scope: 'browser-origin-workspace',
      os_shell_available: false, repository_worktree_available: false,
    });
  }

  /**
   * OVto.a is the original read-only native project catalog service. Its empty
   * browser catalog has no active directory, so the original missing-workspace
   * guard correctly rejects a local Codex task. Expose the actual origin-local
   * /mnt/data mount through that same catalog; never manufacture a repository.
   */
  const workspaceCreatedAt = new Map();
  async function getBrowserOriginWorkspaceProject() {
    const current = state(), executor = appServer.toolExecutor;
    if (!supportsBrowserOriginExecution() || typeof executor?.storage?.list !== 'function' ||
        typeof executor.getWorkspacePrefix !== 'function') return null;
    const { accountId, userId } = current.identity;
    // Opening the real OPFS/IDB store must succeed before declaring a directory.
    // The virtual /mnt/data mount is scoped again to each thread by the executor.
    await executor.storage.list(executor.getWorkspacePrefix('codex-browser-workspace'));
    const next = state();
    if (!supportsBrowserOriginExecution() || next.identity?.accountId !== accountId || next.identity?.userId !== userId) {
      throw new DOMException('The browser workspace identity changed', 'AbortError');
    }
    const id = 'site-browser-workspace:' + accountId;
    if (!workspaceCreatedAt.has(id)) workspaceCreatedAt.set(id, Date.now());
    const createdAt = workspaceCreatedAt.get(id);
    return Object.freeze({ id, name: '浏览器工作区', rootPaths: ['/mnt/data'], createdAt, updatedAt: createdAt,
      adapter_source: 'site-local-codex-provider', adapter_provider_default: true, filesystem_scope: 'browser-origin-workspace' });
  }
  function createBrowserProjectCatalog(OriginalProjectCatalog) {
    if (typeof OriginalProjectCatalog !== 'function') throw new TypeError('The original OVto project catalog class is required');
    return class BrowserOriginProjectCatalog extends OriginalProjectCatalog {
      async readLocalProjects(...args) {
        const originalProjects = await super.readLocalProjects(...args);
        if (object(originalProjects) && Object.keys(originalProjects).length) return originalProjects;
        const project = await getBrowserOriginWorkspaceProject();
        return project ? { [project.id]: project } : originalProjects;
      }
    };
  }
  /** Supply the real provider default only to native Codex workspace context.
   * Keep the global project selection unchanged so Chat and Work can retain
   * their native run location. Missing raw selection may use the sole ready
   * provider mount; explicit null, query errors and user choices are preserved.
   */
  const projectContextDiagnostics = new Set();
  function resolveBrowserWorkspaceSelection(originalSelection, { inputs, routeKind, productMode, selection, projects, selectionPending = false, projectsPending = false, selectionError = false, projectsError = false } = {}) {
    const current = state();
    const expectedId = current.identity?.accountId ? 'site-browser-workspace:' + current.identity.accountId : null, candidate = expectedId ? projects?.[expectedId] : null;
    const providerDefault = selection === undefined && productMode === 'codex' && object(projects) && Object.keys(projects).length === 1 && !!candidate && candidate.id === expectedId;
    const effectiveSelection = providerDefault ? { type: 'local', projectId: expectedId } : selection;
    const diagnostic = { type: 'local-codex-project-context', productMode, providerDefault, original: originalSelection === null ? 'null' : typeof originalSelection,
      routeKind: ['home','local-thread','client-local-thread','other'].includes(routeKind) ? routeKind : 'unknown',
      executionReady: supportsBrowserOriginExecution(), identityMatches: !!current.identity && !!inputs && inputs.accountId === current.identity.accountId && inputs.authenticatedAccountId === current.identity.accountId && inputs.userId === current.identity.userId,
      identityPending: !!(inputs?.authLoading || inputs?.accountLoading), selectionPending: !!selectionPending, projectsPending: !!projectsPending,
      localSelection: selection?.type === 'local', exactSelection: !!expectedId && selection?.projectId === expectedId,
      catalogCount: object(projects) ? Object.keys(projects).length : 0,
      exactDirectory: !!candidate && candidate.id === expectedId && Array.isArray(candidate.rootPaths) && candidate.rootPaths.length === 1 && candidate.rootPaths[0] === '/mnt/data' };
    const diagnosticKey = JSON.stringify(diagnostic);
    if (projectContextDiagnostics.size < 40 && !projectContextDiagnostics.has(diagnosticKey)) { projectContextDiagnostics.add(diagnosticKey); diagnostics.push(diagnostic); }
    if (originalSelection !== null || productMode !== 'codex') return originalSelection;
    if (!supportsBrowserOriginExecution() || routeKind !== 'home' || selectionPending || projectsPending || selectionError || projectsError ||
        !object(inputs) || inputs.authLoading || inputs.accountLoading ||
        inputs.accountId !== current.identity.accountId || inputs.authenticatedAccountId !== current.identity.accountId ||
        inputs.userId !== current.identity.userId || effectiveSelection?.type !== 'local') return originalSelection;
    const id = 'site-browser-workspace:' + current.identity.accountId, project = projects?.[id];
    if (effectiveSelection.projectId !== id || !object(project) || project.id !== id ||
        !Array.isArray(project.rootPaths) || project.rootPaths.length !== 1 || project.rootPaths[0] !== '/mnt/data') return originalSelection;
    return effectiveSelection;
  }
  function adaptBrowserWorkspaceSelectionAtom(originalAtom, requireOriginal) {
    if (!originalAtom || typeof requireOriginal !== 'function') throw new TypeError('The original route project atom and module require are required');
    const { c: derive } = requireOriginal('BolX'), scope = requireOriginal('tSEg').a;
    const { c: read, d: query } = requireOriginal('PFP1'), keys = requireOriginal('I07G').kc, inputsAtom = requireOriginal('Cslg').m;
    return derive(scope, ({ get, scope: route }) => resolveBrowserWorkspaceSelection(get(originalAtom), {
      routeKind: route.value.routeKind, productMode: get(requireOriginal('pasN').a), inputs: get(inputsAtom),
      selection: get(query, keys.SELECTED_PROJECT).data?.value, projects: read(get, keys.LOCAL_PROJECTS),
      selectionPending: get(query, keys.SELECTED_PROJECT).isPending, projectsPending: get(query, keys.LOCAL_PROJECTS).isPending,
      selectionError: get(query, keys.SELECTED_PROJECT).isError, projectsError: get(query, keys.LOCAL_PROJECTS).isError,
    }));
  }
  /** HSUP.a/b are the native host workspace resolvers, not submit policy.
   * Feed the selected provider directory into their existing scoped-project input
   * when the browser Home has no native project picker callback of its own.
   */
  function adaptBrowserWorkspaceResolverAtom(originalAtom, requireOriginal) {
    if (!originalAtom || typeof requireOriginal !== 'function') throw new TypeError('The original HSUP workspace resolver is required');
    const atoms = requireOriginal('BolX'), composerScope = requireOriginal('Sd8U').a;
    const routeKindAtom = atoms.c(requireOriginal('tSEg').a, ({ scope }) => scope.value.routeKind);
    const { c: read, d: query } = requireOriginal('PFP1'), keys = requireOriginal('I07G').kc, inputsAtom = requireOriginal('Cslg').m;
    const requests = new WeakMap();
    return atoms.d(composerScope, (request, { get, scope }) => {
      const diagnostic = { type: 'local-codex-workspace-resolver', composerKind: ['new','local','chatgpt','cloud','other'].includes(scope.value.kind) ? scope.value.kind : 'unknown',
        scoped: request?.useScopedProject === true, projectUndefined: request?.selectedProject === undefined, projectNull: request?.selectedProject === null,
        cwdUndefined: request?.defaultCwd === undefined, cwdNull: request?.defaultCwd === null,
        existingRootAbsent: request?.existingWorkspaceRoot == null, remoteProjectAbsent: request?.homeRemoteProject == null };
      const diagnosticKey = JSON.stringify(diagnostic);
      if (projectContextDiagnostics.size < 40 && !projectContextDiagnostics.has(diagnosticKey)) { projectContextDiagnostics.add(diagnosticKey); diagnostics.push(diagnostic); }
      if (scope.value.kind !== 'new' || !object(request) || request.useScopedProject === true ||
          request.defaultCwd != null || request.existingWorkspaceRoot != null || request.homeRemoteProject != null) return get(originalAtom, request);
      const selection = resolveBrowserWorkspaceSelection(null, {
        inputs: get(inputsAtom), routeKind: get(routeKindAtom), productMode: get(requireOriginal('pasN').a),
        selection: get(query, keys.SELECTED_PROJECT).data?.value, projects: read(get, keys.LOCAL_PROJECTS),
        selectionPending: get(query, keys.SELECTED_PROJECT).isPending, projectsPending: get(query, keys.LOCAL_PROJECTS).isPending,
        selectionError: get(query, keys.SELECTED_PROJECT).isError, projectsError: get(query, keys.LOCAL_PROJECTS).isError,
      });
      if (!selection || request.selectedProject != null && (request.selectedProject.type !== 'local' || request.selectedProject.projectId !== selection.projectId)) return get(originalAtom, request);
      let cached = requests.get(request);
      if (!cached || cached.projectId !== selection.projectId) {
        cached = { projectId: selection.projectId, value: { ...request, selectedProject: request.selectedProject ?? selection, useScopedProject: true } };
        requests.set(request, cached);
      }
      return get(originalAtom, cached.value);
    });
  }
  function createBrowserExecutionHosts(OriginalExecutionHosts) {
    if (typeof OriginalExecutionHosts !== 'function') throw new TypeError('The original mYel execution-host service class is required');
    return class BrowserOriginExecutionHosts extends OriginalExecutionHosts {
      constructor(host, ...args) { super(getBrowserOriginHost(host), ...args); }
    };
  }

  function featureGateEntries({ includeHashAliases = true } = {}) {
    const current = state();
    if (!current.local) return {};
    const result = {};
    for (const name of CODEX_BROWSER_UI_GATES) {
      const gate = {
        name, value: current.configuredTextProvider, rule_id: 'local-codex-provider',
        secondary_exposures: [], adapter_source: 'local-app-server',
        openai_cloud_entitlement: false,
      };
      result[name] = gate;
      if (includeHashAliases) result[gateHash(name)] = gate;
    }
    return result;
  }

  function mergeConfiguration(configuration) {
    if (!object(configuration)) throw new TypeError('Original local configuration envelope is required');
    return { ...configuration, feature_gates: { ...configuration.feature_gates, ...featureGateEntries() } };
  }

  function providerInstructions() {
    const capabilities = executionCapabilities();
    const statements = [
      'This conversation uses the site-local app server and its configured inference provider.',
      capabilities.toolExecution && capabilities.toolNames.length
        ? 'Available local tools: ' + capabilities.toolNames.join(', ') + '. Use the actual tool protocol; do not simulate tool results.'
        : 'No executable local tools are attached. Provide code and explanations in messages.',
      capabilities.filesystem
        ? 'Files are stored in this site origin\'s private browser storage; they are not arbitrary operating-system files or a connected repository.'
        : 'No filesystem is attached.',
      capabilities.pythonExecution
        ? 'Python execution is available only through the actual local python tool.'
        : 'No Python execution tool is attached.',
      'No operating-system shell, repository worktree, remote cloud environment, or cloud task executor is implied.',
      'Only report files changed, code executed, or tasks completed after an actual successful execution result. Preserve real provider and tool errors; never turn an unavailable service or uncertain checkpoint into success.',
    ];
    return statements.join('\n');
  }

  /** Read only the original native navigation context for a new user task.
   * The same transport also carries ephemeral text-generation work; those and
   * explicit origins are never relabelled. Runtime requests keep their own IDs.
   */
  function getBrowserRequestContext(method, params, { sidebarProductMode } = {}) {
    if (method !== 'thread/start' || !object(params) || params.ephemeral === true ||
        params.conversationOrigin != null || sidebarProductMode !== 'codex' || params.cwd !== '/mnt/data' ||
        !supportsBrowserOriginExecution()) return {};
    return { productMode: 'codex', executionSource: 'local-app-server' };
  }
  /**
   * Keep synchronous {result,afterReply} and the same server/history instance.
   * Only an explicitly scoped NEW Codex thread gets local origin metadata.
   * Existing Work/Codex reads, resumes, turns and notifications pass unchanged.
   */
  function dispatch(method, params = {}, requestContext = {}) {
    let forwarded = params;
    if (method === 'thread/start' && requestContext?.productMode === 'codex' && object(params) &&
        params.ephemeral !== true && params.conversationOrigin == null && params.cwd === '/mnt/data' && supportsBrowserOriginExecution()) {
      const metadata = object(params.responsesapiClientMetadata) ? params.responsesapiClientMetadata : {};
      forwarded = {
        ...params,
        conversationOrigin: 'codex',
        developerInstructions: [params.developerInstructions, providerInstructions()]
          .filter(value => typeof value === 'string' && value.trim()).join('\n\n'),
        responsesapiClientMetadata: {
          ...metadata, localProductSurface: 'codex', localExecutionSource: 'local-app-server',
        },
      };
    }
    diagnostics.push({
      type: 'local-codex-rpc', method: typeof method === 'string' ? method : 'invalid-method',
      executionSource: 'local-app-server',
    });
    return appServer.dispatch(method, forwarded);
  }

  function createRpcFacade({ getRequestContext = () => ({}) } = {}) {
    if (typeof getRequestContext !== 'function') throw new TypeError('A synchronous request-context reader is required');
    return Object.freeze({
      dispatch: (method, params) => dispatch(method, params, getRequestContext(method, params)),
      subscribe: listener => appServer.subscribe(listener),
    });
  }

  return Object.freeze({
    dispatch, subscribe: listener => appServer.subscribe(listener), createRpcFacade, getBrowserRequestContext,
    executionCapabilities, resolveBrowserCapability,
    createBrowserCapabilityAtom, adaptBrowserCapabilityAtom,
    resolveBrowserDiscovery, createBrowserDiscoveryAtom, adaptBrowserDiscoveryAtom, discoverySource,
    supportsBrowserOriginExecution, createBrowserExecutionCapability, getBrowserOriginHost,
    getBrowserOriginWorkspaceProject, createBrowserProjectCatalog, createBrowserExecutionHosts,
    resolveBrowserWorkspaceSelection, adaptBrowserWorkspaceSelectionAtom, adaptBrowserWorkspaceResolverAtom,
    featureGateEntries, mergeConfiguration, providerInstructions,
    modelIds: Object.freeze([...modelIds]), detailMode: CODEX_DETAIL_MODE,
  });
}
