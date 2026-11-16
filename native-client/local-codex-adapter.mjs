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
export const CODEX_DETAIL_MODE = 'STEPS_COMMANDS';
export const WORK_DETAIL_MODE = 'STEPS_PROSE';
export const CODEX_BROWSER_UI_GATES = Object.freeze(['3999836663', '4019944087', '515412992']);
export const CODEX_MODEL_IDS = Object.freeze(['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra']);
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
    throw new RangeError('Codex must use the same explicit three-model catalog as Work');
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

  /**
   * Keep synchronous {result,afterReply} and the same server/history instance.
   * Only an explicitly scoped NEW Codex thread gets local origin metadata.
   * Existing Work/Codex reads, resumes, turns and notifications pass unchanged.
   */
  function dispatch(method, params = {}, requestContext = {}) {
    let forwarded = params;
    if (method === 'thread/start' && requestContext?.productMode === 'codex' && object(params)) {
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
    dispatch, subscribe: listener => appServer.subscribe(listener), createRpcFacade,
    executionCapabilities, resolveBrowserCapability,
    createBrowserCapabilityAtom, adaptBrowserCapabilityAtom,
    featureGateEntries, mergeConfiguration, providerInstructions,
    modelIds: Object.freeze([...modelIds]), detailMode: CODEX_DETAIL_MODE,
  });
}
