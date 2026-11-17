/** Original app-server protocol over real, resumable local execution. */
import { runAgentTurn } from './agent-turn-runner.mjs?v=bc79f07ae8ccb077';
import { readWebSearchIntent, interruptHostedSearch } from './local-web-search.mjs?v=bc79f07ae8ccb077';
import { readClassicBranchRequest, getClassicExecutionThread } from './classic-response-branches.mjs?v=bc79f07ae8ccb077';
import { parseClassicInputMessages } from './classic-input-messages.mjs?v=bc79f07ae8ccb077';
import { allowedReasoningEfforts } from '../runtime.js?v=bc79f07ae8ccb077';
export class RpcError extends Error {
  constructor(code, message, data) { super(message); this.name = 'RpcError'; this.code = code; if (data !== undefined) this.data = data; }
}
const copy = value => structuredClone(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const idle = () => ({ type: 'idle' });
const active = () => ({ type: 'active', activeFlags: [] });
const errorShape = message => ({ message, codexErrorInfo: null, additionalDetails: null, misalignment: null });
const defaultCollaboration = model => ({ mode: 'default', settings: { model, reasoning_effort: null, developer_instructions: null } });

export class LocalAppServer {
  constructor({ storage, streamCompletion, readSettings, models, catalog, diagnostics = [], now = Date.now, uuid = () => crypto.randomUUID(), toolExecutor = null, checkpointStore = null, agentOptions = {}, getExecutionPolicy = null, onIdleTurnInterrupt = null, prepareUserInput = null, onPersist = null }) {
    this.storage = storage;
    this.toolExecutor = toolExecutor;
    this.prepareUserInput = prepareUserInput;
    this.checkpointStore = checkpointStore;
    this.agentOptions = agentOptions;
    this.onIdleTurnInterrupt = onIdleTurnInterrupt;
    this.onPersist = onPersist;
    this.getExecutionPolicy = getExecutionPolicy ?? (() => ({ modelSelection: false, fixedModel: 'gpt-6-luna', defaultEffort: 'low', allowedEfforts: ['low', 'medium'] }));
    this.streamCompletion = streamCompletion;
    this.readSettings = readSettings;
    this.models = models;
    this.catalog = catalog;
    this.diagnostics = diagnostics;
    this.now = now;
    this.uuid = uuid;
    this.storageKey = 'cg-original-app-server:v1';
    this.threads = new Map();
    this.running = new Map();
    this.listeners = new Set();
    this.loadError = null;
    this.restore();
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify(method, params) {
    const event = { method, params: copy(params) };
    for (const listener of this.listeners) {
      try { listener(event); }
      catch (error) { this.diagnostics.push({ type: 'local-protocol-listener-error', message: String(error?.message ?? error) }); }
    }
  }
  restore() {
    let changed = false;
    try {
      const serialized = this.storage?.getItem(this.storageKey);
      if (!serialized) return;
      const state = JSON.parse(serialized);
      if (state.schemaVersion !== 1 || !Array.isArray(state.threads)) throw Error('Unsupported local conversation storage');
      for (const thread of state.threads) {
        if (!object(thread) || typeof thread.id !== 'string' || !Array.isArray(thread.turns)) throw Error('Invalid local conversation storage');
        for (const turn of thread.turns) if (turn.status === 'inProgress') {
          turn.status = 'interrupted';
          turn.error = null;
          turn.completedAt = Math.floor(this.now() / 1000);
          turn.durationMs = Math.max(0, this.now() - (turn.adapterMetadata?.startedAtMs ?? this.now()));
          turn.adapterMetadata = { ...turn.adapterMetadata, interruption: 'page-reload-checkpoint-saved', resumable: Boolean(turn.adapterMetadata?.checkpoint), resumePolicy: 'automatic' };
          for (const call of turn.adapterMetadata.checkpoint?.pendingCalls || []) if (call.state === 'running') call.state = 'uncertain';
          // A crash has no observed provider end time. Stop the local pending
          // presentation without inventing elapsed compute/offline duration.
          for (const item of turn.items) if (item.type === 'reasoning' && item.status === 'inProgress') { item.status = 'cancelled'; item.completedAtMs = null; item.durationMs = null; }
          if (turn.adapterMetadata.reasoningLifecycle) { turn.adapterMetadata.reasoningLifecycle.status = 'cancelled'; turn.adapterMetadata.reasoningLifecycle.completedAtMs = null; }
          changed = true;
        }
        thread.status = idle();
        this.threads.set(thread.id, thread);
      }
      if (changed) this.persist();
    } catch (error) {
      this.loadError = new RpcError(-32000, `Local conversation storage could not be loaded: ${error.message}`);
      this.diagnostics.push({ type: 'local-history-storage-error', message: this.loadError.message });
    }
  }
  persist() {
    if (this.loadError) throw this.loadError;
    if (!this.storage) return;
    let serialized;
    try {
      serialized = JSON.stringify({ schemaVersion: 1, threads: [...this.threads.values()].filter(thread => !thread.ephemeral) });
      this.storage.setItem(this.storageKey, serialized);
    } catch (error) { throw new RpcError(-32000, `Local conversation history could not be saved: ${error.message}`); }
    // A background sync failure must not roll back an already durable native
    // checkpoint or cause a second provider/tool submission.
    try {
      const pending = this.onPersist?.(JSON.parse(serialized).threads);
      if (pending?.then) Promise.resolve(pending).catch(() => this.diagnostics.push({ type: 'local-history-capture-error' }));
    } catch { this.diagnostics.push({ type: 'local-history-capture-error' }); }
  }
  applyHistorySnapshot(records, { projectThread = null } = {}) {
    if (this.loadError) throw this.loadError;
    if (!Array.isArray(records) || records.length > 2000) throw new RpcError(-32602, 'Invalid account conversation snapshot');
    const next = new Map();
    for (const input of records) {
      if (!object(input) || typeof input.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.id) || next.has(input.id) || input.ephemeral || !Array.isArray(input.turns)) throw new RpcError(-32602, 'Invalid account conversation record');
      const thread = copy(input);
      const original = this.threads.get(thread.id);
      if (original && typeof projectThread === 'function' && !this.running.has(thread.id)) {
        const stable = value => Array.isArray(value) ? value.map(stable) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
        const localView = projectThread(original), incomingView = projectThread(thread);
        const oldViews = new Map((localView?.turns ?? []).map(turn => [turn.id, turn]));
        const newViews = new Map((incomingView?.turns ?? []).map(turn => [turn.id, turn]));
        const oldTurns = new Map(original.turns.map(turn => [turn.id, turn]));
        // Renaming/archiving a thread on another device cannot erase an
        // unchanged interrupted turn's private, same-device checkpoint.
        thread.turns = thread.turns.map(turn => oldTurns.has(turn.id) && oldViews.has(turn.id) && newViews.has(turn.id) && JSON.stringify(stable(oldViews.get(turn.id))) === JSON.stringify(stable(newViews.get(turn.id))) ? copy(oldTurns.get(turn.id)) : turn);
        thread.adapterMetadata = { ...copy(original.adapterMetadata ?? {}), ...thread.adapterMetadata };
        if (original.adapterMetadata?.clientMetadata || thread.adapterMetadata.clientMetadata) thread.adapterMetadata.clientMetadata = { ...copy(original.adapterMetadata?.clientMetadata ?? {}), ...thread.adapterMetadata.clientMetadata };
      }
      for (const turn of thread.turns) {
        if (!object(turn) || typeof turn.id !== 'string' || !Array.isArray(turn.items)) throw new RpcError(-32602, 'Invalid account conversation turn');
        if (turn.status === 'inProgress') {
          turn.status = 'interrupted';
          turn.adapterMetadata = { ...turn.adapterMetadata, resumable: false, resumePolicy: 'manual', interruption: 'account-history-restore' };
          delete turn.adapterMetadata.checkpoint;
        }
      }
      if (thread.adapterMetadata?.cloudHistorySync && thread.turns.some(turn => turn.adapterMetadata?.checkpoint)) thread.adapterMetadata.cloudHistorySync.executionCheckpointAvailable = true;
      thread.status = idle();
      next.set(thread.id, thread);
    }
    // The snapshot written to disk includes the exact active objects retained
    // in memory. Cloud polling never rewinds a live checkpoint to an older copy.
    for (const [id, thread] of this.threads) if (thread.ephemeral || this.running.has(id)) next.set(id, thread);
    const before = this.threads;
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify({ schemaVersion: 1, threads: [...next.values()].filter(thread => !thread.ephemeral) }));
    } catch (error) { throw new RpcError(-32000, `Account conversation history could not be applied: ${error.message}`); }
    this.threads = next;
    const changes = { added: [], updated: [], removed: [] };
    for (const [id, thread] of next) {
      if (this.running.has(id) || thread.ephemeral) continue;
      if (!before.has(id)) changes.added.push(id);
      else if (JSON.stringify(before.get(id)) !== JSON.stringify(thread)) changes.updated.push(id);
    }
    for (const [id, thread] of before) if (!next.has(id) && !thread.ephemeral) changes.removed.push(id);
    return changes;
  }
  /** Persist derived local resource URLs without replacing a newer/live turn.
   * The trusted rehydrator supplies full before/after pairs; the public history
   * projection must remain identical. This never acknowledges cloud state.
   */
  applyToolResultPresentation(pairs, { projectThread } = {}) {
    if (this.loadError) throw this.loadError;
    if (!Array.isArray(pairs) || pairs.length > 2000 || typeof projectThread !== 'function') throw new RpcError(-32602, 'Invalid local resource presentation update');
    const stable = value => Array.isArray(value) ? value.map(stable) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
    const next = new Map(this.threads), seen = new Set(), updated = [], skipped = [];
    for (const pair of pairs) {
      const before = pair?.before, after = pair?.after;
      if (!object(before) || !object(after) || typeof before.id !== 'string' || before.id !== after.id || seen.has(before.id) || before.ephemeral || after.ephemeral || !Array.isArray(before.turns) || !Array.isArray(after.turns)) throw new RpcError(-32602, 'Invalid local resource presentation pair');
      seen.add(before.id);
      const oldView = projectThread(before), newView = projectThread(after);
      if (!oldView || !newView || JSON.stringify(stable(oldView)) !== JSON.stringify(stable(newView))) throw new RpcError(-32602, 'Resource presentation cannot change conversation history');
      const current = this.threads.get(before.id);
      if (!current || current.ephemeral || this.running.has(before.id) || JSON.stringify(current) !== JSON.stringify(before)) { skipped.push(before.id); continue; }
      if (JSON.stringify(before) !== JSON.stringify(after)) { next.set(before.id, copy(after)); updated.push(before.id); }
    }
    if (updated.length) {
      try { this.storage?.setItem(this.storageKey, JSON.stringify({ schemaVersion: 1, threads: [...next.values()].filter(thread => !thread.ephemeral) })); }
      catch (error) { throw new RpcError(-32000, `Local resource presentation could not be saved: ${error.message}`); }
      this.threads = next;
    }
    // Public text history is unchanged: do not enqueue an upload, broadcast an
    // execution event, or change any private checkpoint/resume policy here.
    return { updated, skipped };
  }
  getThread(id) {
    if (typeof id !== 'string' || !this.threads.has(id)) throw new RpcError(-32001, 'thread_not_found');
    return this.threads.get(id);
  }
  executionPolicy() {
    let policy; try { policy = this.getExecutionPolicy(); } catch { throw new RpcError(-32003, 'The account execution policy could not be verified'); }
    return policy?.modelSelection === true ? { modelSelection: true } : { modelSelection: false, fixedModel: 'gpt-6-luna', chatModel: this.catalog.WORK_MODEL_IDS.includes(policy?.freeChatModel) ? policy.freeChatModel : 'gpt-5.6-luna', defaultEffort: 'low', allowedEfforts: ['low', 'medium'] };
  }
  assertExecutionAllowed(turn) {
    const policy = this.executionPolicy();
    if (!policy.modelSelection) {
      const surface = turn.executionSurface ?? turn.adapterMetadata?.executionSurface;
      const mode = turn.reasoningMode ?? turn.adapterMetadata?.reasoningMode ?? 'standard';
      const allowed = surface === 'chat'
        ? [policy.chatModel,'gpt-5.6-luna'].includes(turn.model) && ['none', 'medium'].includes(turn.reasoningEffort) && mode === 'standard'
        : !surface && turn.model === policy.fixedModel && policy.allowedEfforts.includes(turn.reasoningEffort) && mode === 'standard';
      if (!allowed) throw new RpcError(-32003, 'This saved turn requires model access unavailable to this account. Send a new message using the Free model instead.');
    }
    return policy;
  }
  selection(params, previous = {}) {
    const policy = this.executionPolicy();
    const surface = params.executionSurface ?? previous.executionSurface ?? previous.adapterMetadata?.executionSurface ?? null;
    if (surface != null && !['chat', 'work', 'codex'].includes(surface)) throw new RpcError(-32602, 'Unknown model execution surface');
    const supplied = params.effort ?? params.reasoningEffort ?? params.config?.model_reasoning_effort ?? params.collaborationMode?.settings?.reasoning_effort;
    let model, effort, reasoningMode = 'standard', frontendModelSlug = null, chatFamily = null;
    if (!policy.modelSelection) {
      if (surface === 'work' || surface === 'codex') throw new RpcError(-32003, 'Work and Codex require model-selection access');
      model = surface === 'chat' ? policy.chatModel : policy.fixedModel;
      effort = supplied === 'medium' || Array.isArray(params.systemHints) && params.systemHints.some(hint=>hint==='reason'||hint==='search') ? 'medium' : surface === 'chat' ? 'none' : policy.defaultEffort;
      frontendModelSlug = surface === 'chat' ? 'auto' : model;
    } else if (surface === 'chat') {
      const explicit = params.frontendModelSlug != null || params.model != null;
      const requested = params.frontendModelSlug ?? params.model ?? previous.adapterMetadata?.frontendModelSlug ?? previous.model ?? 'auto';
      let resolved;
      try { resolved = this.catalog.resolveChatSelection(requested, { effort: supplied ?? (!explicit ? previous.reasoningEffort : undefined), reasoningMode: params.reasoningMode ?? (!explicit ? previous.reasoningMode : undefined) }); }
      catch (error) { throw new RpcError(-32602, error.message); }
      ({ model, effort, reasoningMode, frontendModelSlug, chatFamily } = resolved);
      if (!this.catalog.CHAT_API_MODEL_IDS.includes(model)) throw new RpcError(-32602, 'This model is not offered in Chat');
    } else {
      model = params.model ?? params.collaborationMode?.settings?.model ?? previous.model ?? this.readSettings().model;
      if (params.reasoningMode != null && params.reasoningMode !== 'standard') throw new RpcError(-32602, 'Work/Codex Pro is not a separate picker execution mode');
    }
    const catalog = this.models.getRpcModelList().data.find(entry => entry.model === model);
    if (!catalog) throw new RpcError(-32602, `The local adapter does not offer model ${String(model)}`);
    effort ??= supplied ?? previous.reasoningEffort ?? catalog.defaultReasoningEffort;
    const apiEfforts = allowedReasoningEfforts(model), ultra = this.catalog.SITE_ULTRA_ORCHESTRATION;
    const siteUltra = effort === 'ultra' && ultra?.effort === 'ultra' && ultra.mode === 'parallel-agents' && ultra.providerReasoningEffort === false && ultra.baseReasoningEffort === 'max' && Array.isArray(ultra.models) && ultra.models.includes(model) && apiEfforts.includes(ultra.baseReasoningEffort);
    if (!apiEfforts.includes(effort) && !siteUltra) throw new RpcError(-32602, `The local adapter does not support effort ${String(effort)} for ${model}`);
    if (params.serviceTier != null && !['standard', 'default', 'fast', 'priority'].includes(params.serviceTier)) throw new RpcError(-32602, `The local text adapter does not implement service tier ${String(params.serviceTier)}`);
    const tier = params.serviceTier ?? previous.serviceTier ?? null;
    const explicitMode = params.selectionMode ?? params.modelSelection?.selectionMode ?? params.responsesapiClientMetadata?.selectionMode;
    return {
      model, reasoningEffort: effort, reasoningMode, executionSurface: surface, frontendModelSlug: frontendModelSlug ?? model, chatFamily,
      executionPolicy: policy.modelSelection ? 'verified-model-selection' : surface === 'chat' ? 'free-chat-5.6-luna-instant-or-think-medium' : 'free-luna-low-or-explicit-medium', serviceTier: ['fast', 'priority'].includes(tier) ? 'fast' : null,
      selectionMode: ['auto', 'pinned', 'manual', 'default'].includes(explicitMode) ? explicitMode : previous.adapterMetadata?.selectionMode ?? 'unspecified',
      curatedPresetMatch: this.catalog.WORK_PRESETS.some(choice => choice.model === model && choice.effort === effort),
    };
  }
  textInput(params) {
    if (!Array.isArray(params.input) || !params.input.length && !params.classicUserMessage?.metadata?.attachments?.length) throw new RpcError(-32602, 'A nonempty original input array is required');
    for (const item of params.input) {
      const supported = object(item) && (item.type === 'text' && typeof item.text === 'string' || item.type === 'image' && (typeof item.url === 'string' || typeof item.fileId === 'string') || item.type === 'localImage' && typeof item.path === 'string');
      if (!supported) throw new RpcError(-32601, 'This local adapter accepts original text, image and localImage inputs only');
      if (item.type !== 'text' && typeof this.prepareUserInput !== 'function') throw new RpcError(-32601, 'The real image resolver is not connected');
    }
    if (!params.input.some(item => item.type !== 'text' || item.text.trim()) && !params.classicUserMessage?.metadata?.attachments?.length) throw new RpcError(-32602, 'User input must not be empty');
    return copy(params.input);
  }
  snapshot(thread, includeTurns = true) { const result = copy(thread); if (!includeTurns) result.turns = []; return result; }
  startResponse(thread) {
    return {
      thread: this.snapshot(thread), model: thread.model, modelProvider: thread.modelProvider,
      serviceTier: thread.serviceTier ?? null, cwd: thread.cwd, approvalPolicy: thread.approvalPolicy, approvalsReviewer: 'user',
      sandbox: { type: 'readOnly', networkAccess: false },
      reasoningEffort: thread.reasoningEffort,
      collaborationMode: copy(thread.collaborationMode),
    };
  }
  pagination(rows, params, prefix) {
    let start = 0;
    if (params.cursor != null) {
      const match = new RegExp(`^${prefix}:(\\d+)$`).exec(params.cursor);
      if (!match || Number(match[1]) > rows.length) throw new RpcError(-32602, 'Invalid local history cursor');
      start = Number(match[1]);
    }
    if (params.limit != null && (!Number.isSafeInteger(params.limit) || params.limit < 1)) throw new RpcError(-32602, 'History limit must be a positive integer');
    const end = Math.min(rows.length, start + Math.min(params.limit ?? 100, 200));
    return { data: copy(rows.slice(start, end)), nextCursor: end < rows.length ? `${prefix}:${end}` : null };
  }
  dispatch(method, params = {}) {
    if (params == null) params = {};
    if (!object(params)) throw new RpcError(-32602, 'RPC params must be an object');
    if (this.loadError && method !== 'initialize' && method !== 'model/list') throw this.loadError;
    switch (method) {
      case 'initialize': return { result: { userAgent: 'local-original-client-agent-adapter', adapterCapabilities: { textGeneration: true, toolExecution: Boolean(this.toolExecutor?.execute), filesystem: Boolean(this.toolExecutor?.storage), cloudEnvironment: false, resumableCheckpoints: true } } };
      case 'initialized': return { result: {} };
      case 'model/list': return { result: this.models.getRpcModelList(params) };
      case 'thread/list': {
        let rows = [...this.threads.values()].filter(thread => !thread.ephemeral && !!thread.archived === !!params.archived);
        if (Array.isArray(params.modelProviders) && params.modelProviders.length) rows = rows.filter(thread => params.modelProviders.includes(thread.modelProvider));
        if (Array.isArray(params.originators) && params.originators.length) rows = rows.filter(thread => params.originators.includes(thread.originator));
        if (Array.isArray(params.sourceKinds) && params.sourceKinds.length) rows = rows.filter(thread => params.sourceKinds.includes(thread.source));
        if (params.parentThreadId != null) rows = rows.filter(thread => thread.parentThreadId === params.parentThreadId);
        if (params.ancestorThreadId != null) rows = rows.filter(thread => {
          const seen = new Set(); let parent = thread.parentThreadId;
          while (parent && !seen.has(parent)) { if (parent === params.ancestorThreadId) return true; seen.add(parent); parent = this.threads.get(parent)?.parentThreadId; }
          return false;
        });
        const query = String(params.searchTerm ?? params.query ?? '').toLowerCase();
        if (query) rows = rows.filter(thread => `${thread.name ?? ''}\n${thread.preview ?? ''}`.toLowerCase().includes(query));
        const sortField = params.sortKey === 'created_at' ? 'createdAt' : params.sortKey === 'updated_at' ? 'updatedAt' : 'recencyAt';
        rows.sort((a, b) => ((a[sortField] ?? a.updatedAt) - (b[sortField] ?? b.updatedAt)) * (params.sortDirection === 'asc' ? 1 : -1));
        return { result: this.pagination(rows.map(thread => this.snapshot(thread, false)), params, 'local-threads') };
      }
      case 'thread/loaded/list': return { result: { data: [...this.threads.keys()], nextCursor: null } };
      case 'thread/start': {
        if (params.dynamicTools?.length) throw new RpcError(-32601, 'Dynamic tool registration is not implemented by the local text adapter');
        const selected = this.selection(params), timestamp = Math.floor(this.now() / 1000), id = this.uuid();
        const thread = {
          id, sessionId: id, name: null, preview: '', ephemeral: params.ephemeral === true,
          model: selected.model, reasoningEffort: selected.reasoningEffort, reasoningMode: selected.reasoningMode, executionSurface: selected.executionSurface, serviceTier: selected.serviceTier, modelProvider: 'local-openai-compatible',
          createdAt: timestamp, updatedAt: timestamp, recencyAt: timestamp, status: idle(), archived: false,
          path: null, cwd: typeof params.cwd === 'string' ? params.cwd : '/', cliVersion: '0.0.0',
          source: 'appServer', originator: 'local-original-client-adapter', threadSource: params.threadSource ?? 'user',
          mode: params.mode ?? 'default', threadStartKind: params.threadStartKind ?? 'default', historyMode: null,
          parentThreadId: params.parentThreadId ?? null, forkedFromId: null, gitInfo: null, environments: [], turns: [],
          approvalPolicy: params.approvalPolicy ?? 'never',
          collaborationMode: copy(params.collaborationMode ?? defaultCollaboration(selected.model)),
          adapterMetadata: { source: 'local-original-client-adapter', conversationOrigin: params.conversationOrigin ?? 'tpp', executionSurface: selected.executionSurface, reasoningMode: selected.reasoningMode, frontendModelSlug: selected.frontendModelSlug, chatFamily: selected.chatFamily, selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch, instructions: this.instructions(params), clientMetadata: copy(params.responsesapiClientMetadata ?? null) },
        };
        thread.collaborationMode.settings = { ...thread.collaborationMode.settings, model: selected.model, reasoning_effort: selected.reasoningEffort };
        this.threads.set(id, thread);
        try { this.persist(); } catch (error) { this.threads.delete(id); throw error; }
        return { result: this.startResponse(thread), afterReply: () => this.notify('thread/started', { thread: this.snapshot(thread, false) }) };
      }
      case 'thread/read': return { result: { thread: this.snapshot(this.getThread(params.threadId), params.includeTurns === true) } };
      case 'thread/resume': {
        const thread = this.getThread(params.threadId), selected = this.selection(params, thread);
        this.updateSelection(thread, selected, params);
        this.persist();
        return { result: this.startResponse(thread) };
      }
      case 'thread/turns/list': {
        const thread = this.getThread(params.threadId), turns = [...thread.turns];
        if (params.sortDirection !== 'asc') turns.reverse();
        return { result: this.pagination(turns, params, 'local-turns') };
      }
      case 'thread/settings/update': {
        const thread = this.getThread(params.threadId), selected = this.selection(params, thread);
        this.updateSelection(thread, selected, params);
        this.persist();
        const threadSettings = this.settingsSnapshot(thread);
        return { result: {}, afterReply: () => this.notify('thread/settings/updated', { threadId: thread.id, threadSettings }) };
      }
      case 'turn/resume': return this.resumeTurn(params);
      case 'turn/start':
      case 'turn/addUserMessage': return this.startTurn(params, method === 'turn/addUserMessage');
      case 'turn/interrupt': {
        const thread = this.getThread(params.threadId), running = this.running.get(thread.id);
        if (running && params.turnId != null && running.turn.id !== params.turnId) throw new RpcError(-32602, 'The requested turn is not the active turn');
        if (!running && params.turnId != null && !thread.turns.some(turn => turn.id === params.turnId)) throw new RpcError(-32001, 'turn_not_found');
        return { result: {}, afterReply: () => { this.interrupt(thread.id, { turnId: params.turnId }); } };
      }
      case 'thread/stop': {
        this.getThread(params.threadId);
        return { result: {}, afterReply: () => this.interrupt(params.threadId) };
      }
      case 'thread/unsubscribe': this.getThread(params.threadId); return { result: {} };
      default: throw new RpcError(-32601, `Local adapter is not implemented for ${method}`);
    }
  }
  instructions(params) {
    return [...new Set([params.baseInstructions, params.developerInstructions, params.config?.developer_instructions, params.collaborationMode?.settings?.developer_instructions].filter(value => typeof value === 'string' && value.trim()))];
  }
  updateSelection(thread, selected, params) {
    thread.model = selected.model;
    thread.reasoningEffort = selected.reasoningEffort;
    thread.reasoningMode = selected.reasoningMode;
    thread.executionSurface = selected.executionSurface;
    thread.serviceTier = selected.serviceTier;
    thread.uiServiceTier = selected.serviceTier;
    if (params.cwd != null) thread.cwd = params.cwd;
    if (params.collaborationMode) thread.collaborationMode = copy(params.collaborationMode);
    thread.collaborationMode.settings = { ...thread.collaborationMode.settings, model: selected.model, reasoning_effort: selected.reasoningEffort };
    thread.adapterMetadata = { ...thread.adapterMetadata, executionPolicy: selected.executionPolicy, executionSurface: selected.executionSurface, reasoningMode: selected.reasoningMode, frontendModelSlug: selected.frontendModelSlug, chatFamily: selected.chatFamily, selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch };
  }
  settingsSnapshot(thread) {
    return { model: thread.model, modelProvider: thread.modelProvider, effort: thread.reasoningEffort, reasoningMode: thread.reasoningMode ?? 'standard', executionSurface: thread.executionSurface ?? null, serviceTier: thread.serviceTier ?? null, cwd: thread.cwd, approvalPolicy: thread.approvalPolicy, approvalsReviewer: 'user', sandboxPolicy: { type: 'readOnly', networkAccess: false }, personality: null, collaborationMode: copy(thread.collaborationMode), disabledPluginIds: [] };
  }
  classicInput(params) {
    if (params.classicInputMessages === undefined) return null;
    let parsed;
    try { parsed = parseClassicInputMessages(params.classicInputMessages); }
    catch (error) { throw new RpcError(-32602, error.message, { adapterCode: error.code ?? 'LOCAL_INPUT_UNSUPPORTED' }); }
    if (params.clientUserMessageId != null && params.clientUserMessageId !== parsed.incoming.id) throw new RpcError(-32602, 'The Classic user-message ID does not match its original input record');
    if (params.classicUserMessage != null && JSON.stringify(params.classicUserMessage) !== JSON.stringify(parsed.incoming)) throw new RpcError(-32602, 'The Classic user-message record does not match its original input records');
    const expected = parsed.incoming.content.parts.map(part => typeof part === 'string' ? { type: 'text', text: part } : { type: 'image', url: part.asset_pointer });
    if (!Array.isArray(params.input) || params.input.length !== expected.length || expected.some((part, index) => {
      const actual = params.input[index];
      return !object(actual) || actual.type !== part.type || (part.type === 'text' ? actual.text !== part.text : actual.url !== part.url);
    })) throw new RpcError(-32602, 'The RPC user input does not match its original Classic content');
    return parsed;
  }
  assertClassicMessageIdsAvailable(thread, messages) {
    const occupied = new Set();
    occupied.add(thread.adapterMetadata?.classicRootId ?? ('local-root-' + thread.id));
    for (const turn of thread.turns) {
      for (const record of turn.adapterMetadata?.classicInputMessages ?? []) if (typeof record?.id === 'string') occupied.add(record.id);
      for (const id of [turn.clientUserMessageId, turn.adapterMetadata?.classicUserMessage?.id]) if (typeof id === 'string') occupied.add(id);
      for (const item of turn.items ?? []) {
        for (const id of [item.id, item.clientId]) if (typeof id === 'string') occupied.add(id);
        if (item.type === 'mcpToolCall' && typeof item.id === 'string') { occupied.add(item.id + '-call'); occupied.add(item.id + '-result'); }
      }
    }
    if (messages.some(message => occupied.has(message.id))) throw new RpcError(-32602, 'An original Classic message ID is already used in this local conversation');
  }
  startTurn(params, admission) {
    const classicBranchMetadata = readClassicBranchRequest(params);
    const classic = this.classicInput(params);
    if (classic) params = { ...params, clientUserMessageId: classic.incoming.id, classicUserMessage: classic.incoming };
    const thread = this.getThread(params.threadId), input = this.textInput(params), selected = this.selection(params, thread);
    if (params.outputSchema != null) throw new RpcError(-32601, 'Structured-output schema execution is not implemented by this local text adapter');
    const webSearchIntent = readWebSearchIntent(params);
    const fingerprintParts = [input, selected.model, selected.reasoningEffort, selected.serviceTier];
    if (params.classicUserMessage?.metadata?.attachments?.length) fingerprintParts.push(params.classicUserMessage.metadata.attachments);
    const legacyFingerprint = JSON.stringify(fingerprintParts);
    if (classic) fingerprintParts.push({ classicInputMessages: classic.originalMessages });
    const legacyContextFingerprint = JSON.stringify(fingerprintParts);
    if (selected.executionSurface != null || selected.reasoningMode === 'pro') fingerprintParts.push({ executionSurface: selected.executionSurface, reasoningMode: selected.reasoningMode, frontendModelSlug: selected.frontendModelSlug });
    if (webSearchIntent) fingerprintParts.push({ webSearchIntent });
    const fingerprint = JSON.stringify(fingerprintParts);
    const duplicate = params.clientUserMessageId && thread.turns.find(turn => turn.clientUserMessageId === params.clientUserMessageId);
    if (duplicate) {
      const original = duplicate.adapterMetadata.classicUserMessage;
      const legacyUser = classic ? { content: classic.incoming.content, metadata: classic.incoming.metadata ?? {}, author: { role: 'user' } } : null;
      const legacyClassicRetry = !webSearchIntent && selected.reasoningMode === 'standard' && (duplicate.reasoningMode ?? 'standard') === 'standard' && classic && classic.hiddenCount === 0 && duplicate.adapterMetadata.classicInputMessages == null &&
        duplicate.adapterMetadata.fingerprint === legacyFingerprint && original &&
        (JSON.stringify(original) === JSON.stringify(classic.incoming) || JSON.stringify(original) === JSON.stringify(legacyUser));
      const legacySurfaceRetry = !webSearchIntent && selected.reasoningMode === 'standard' && (duplicate.reasoningMode ?? 'standard') === 'standard' && duplicate.adapterMetadata.executionSurface == null && duplicate.adapterMetadata.fingerprint === legacyContextFingerprint;
      if (duplicate.adapterMetadata.fingerprint !== fingerprint && !legacyClassicRetry && !legacySurfaceRetry) throw new RpcError(-32602, 'A client user-message ID cannot be reused with different input, Classic records or model settings');
      if (duplicate.status !== 'completed' && duplicate.adapterMetadata?.resumable && duplicate.adapterMetadata?.checkpoint) return this.resumeTurn({ threadId: thread.id, turnId: duplicate.id });
      return { result: { turn: copy(duplicate), ...(admission ? { clientUserMessageId: params.clientUserMessageId, admissionOutcome: 'duplicate', serverUserMessageId: duplicate.items[0].id } : {}) } };
    }
    if (classic) this.assertClassicMessageIdsAvailable(thread, classic.originalMessages);
    if (this.running.has(thread.id)) throw new RpcError(-32000, 'A turn is already running in this local thread; queueing and steering are not implemented');
    const startedAtMs = this.now(), id = this.uuid(), userItem = { type: 'userMessage', id: this.uuid(), content: input, ...(params.clientUserMessageId ? { clientId: params.clientUserMessageId } : {}) };
    const turn = {
      id, status: 'inProgress', items: [userItem], error: null,
      startedAt: Math.floor(startedAtMs / 1000), completedAt: null, durationMs: null,
      model: selected.model, reasoningEffort: selected.reasoningEffort, reasoningMode: selected.reasoningMode, executionSurface: selected.executionSurface, serviceTier: selected.serviceTier,
      clientUserMessageId: params.clientUserMessageId ?? null,
      adapterMetadata: { ...(classicBranchMetadata ? { classicResponseBranch: classicBranchMetadata } : {}), startedAtMs, fingerprint, ...(webSearchIntent ? { webSearchIntent } : {}), executionPolicy: selected.executionPolicy, executionSurface: selected.executionSurface, reasoningMode: selected.reasoningMode, frontendModelSlug: selected.frontendModelSlug, chatFamily: selected.chatFamily, selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch, clientMetadata: copy(params.responsesapiClientMetadata ?? null), instructions: this.instructions(params), ...(params.classicUserMessage ? { classicUserMessage: copy(params.classicUserMessage) } : {}), ...(classic ? { classicInputMessages: copy(classic.originalMessages) } : {}) },
    };
    const previous = copy(thread);
    this.updateSelection(thread, selected, params);
    thread.turns.push(turn);
    thread.status = active();
    thread.updatedAt = thread.recencyAt = turn.startedAt;
    const prompt = input.filter(item => item.type === 'text').map(item => item.text).join('\n');
    if (!thread.preview) thread.preview = prompt.slice(0, 240);
    const named = !thread.name;
    if (named) thread.name = prompt.trim().split('\n')[0].slice(0, 80) || (input.some(item => item.type !== 'text') ? 'Image conversation' : 'Attachment conversation');
    try { this.persist(); } catch (error) { this.threads.set(thread.id, previous); throw error; }
    const running = { thread, turn, controller: new AbortController(), terminal: false, assistant: null, reasoning: null, lastSavedAt: startedAtMs };
    this.running.set(thread.id, running);
    return {
      result: { turn: copy(turn), ...(admission ? { clientUserMessageId: params.clientUserMessageId ?? null, admissionOutcome: 'started', serverUserMessageId: userItem.id } : {}) },
      afterReply: () => {
        if (running.terminal) return;
        this.notify('thread/status/changed', { threadId: thread.id, status: thread.status });
        if (named) this.notify('thread/name/updated', { threadId: thread.id, threadName: thread.name });
        this.notify('turn/started', { threadId: thread.id, turn: copy(turn) });
        this.notify('item/started', { threadId: thread.id, turnId: id, item: userItem });
        this.notify('item/completed', { threadId: thread.id, turnId: id, item: userItem });
        this.runTurn(running).catch(error => this.diagnostics.push({ type: 'local-turn-finalization-error', message: String(error?.message ?? error) }));
      },
    };
  }
  messages(thread, turn, { omitCurrent = false } = {}) {
    thread = getClassicExecutionThread(thread, turn);
    const instructions = [...new Set([this.readSettings({ thread, turn }).customInstructions, ...thread.adapterMetadata.instructions, ...turn.adapterMetadata.instructions].filter(value => typeof value === 'string' && value.trim()))];
    const messages = instructions.length ? [{ role: 'system', content: instructions.join('\n\n') }] : [];
    for (const entry of thread.turns) {
      if (entry.id === turn.id && omitCurrent) break;
      const transcript = entry.adapterMetadata?.checkpoint?.transcript ?? entry.adapterMetadata?.apiTranscript;
      if (transcript?.length) { messages.push(...copy(transcript)); const partial = entry.adapterMetadata?.checkpoint?.partialResponse?.content; if (entry.id !== turn.id && partial) messages.push({ role: 'assistant', content: partial, ...(entry.adapterMetadata.checkpoint.partialResponse.phase ? { phase: entry.adapterMetadata.checkpoint.partialResponse.phase } : {}) }); if (entry.id === turn.id) break; continue; }
      for (const item of entry.items) {
        if (item.type === 'userMessage') messages.push({ role: 'user', content: item.content.map(part => part.text).join('\n') });
        if (item.type === 'agentMessage' && item.text) messages.push({ role: 'assistant', content: item.text, ...(entry.adapterMetadata.gatewayResponseItems ? { response_items: copy(entry.adapterMetadata.gatewayResponseItems) } : {}) });
      }
      if (entry.id === turn.id) break;
    }
    return messages;
  }
  /** Local wall-clock observations, never provider-internal chain-of-thought time. */
  beginReasoning(running, { force = false, startedAtMs = null } = {}) {
    if (running.terminal || !force && (!running.turn.reasoningEffort || running.turn.reasoningEffort === 'none')) return null;
    const { thread, turn } = running, at = this.now();
    const start = Number.isFinite(startedAtMs) && startedAtMs <= at ? startedAtMs : at;
    const lifecycle = turn.adapterMetadata.reasoningLifecycle ??= { startedAtMs: at, workStartedAtMs: turn.adapterMetadata.startedAtMs ?? at, completedAtMs: null, status: 'inProgress', attemptDurationMs: 0, timingBasis: 'local-observed-api-attempt-walltime' };
    lifecycle.status = 'inProgress'; lifecycle.completedAtMs = null;
    let item = running.reasoning;
    if (!item) {
      item = running.reasoning = { type: 'reasoning', id: this.uuid(), summary: [], content: [], status: 'inProgress', startedAtMs: start, completedAtMs: null, durationMs: null };
      turn.items.push(item);
    } else if (item.status !== 'inProgress') {
      // Reattaching an already accepted host stream is the same API attempt.
      item.status = 'inProgress'; item.completedAtMs = null; item.durationMs = null;
      turn.adapterMetadata.completedItemIds = (turn.adapterMetadata.completedItemIds ?? []).filter(id => id !== item.id);
    }
    item.startedAtMs ??= start;
    running.reasoningComplete = false;
    const frame = turn.adapterMetadata.checkpoint?.inFlight;
    if (frame) { frame.reasoningItemId = item.id; frame.reasoningComplete = false; }
    this.notify('item/started', { threadId: thread.id, turnId: turn.id, item });
    return item;
  }
  completeReasoning(running, status = 'completed', completedAtMs = this.now()) {
    const { thread, turn } = running, item = running.reasoning;
    if (!item || running.reasoningComplete) return;
    item.status = status;
    item.completedAtMs = Number.isFinite(item.startedAtMs) ? Math.max(item.startedAtMs, completedAtMs) : completedAtMs;
    item.durationMs = Number.isFinite(item.startedAtMs) ? item.completedAtMs - item.startedAtMs : null;
    running.reasoningComplete = true;
    const ids = turn.adapterMetadata.completedItemIds ??= [];
    if (!ids.includes(item.id)) ids.push(item.id);
    if (turn.adapterMetadata.checkpoint?.inFlight) turn.adapterMetadata.checkpoint.inFlight.reasoningComplete = true;
    const lifecycle = turn.adapterMetadata.reasoningLifecycle;
    if (lifecycle) lifecycle.attemptDurationMs = turn.items.filter(value => value.type === 'reasoning' && Number.isFinite(value.durationMs)).reduce((sum, value) => sum + value.durationMs, 0);
    this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item });
  }
  append(running, text, reasoning, phase = null) {
    if (running.terminal) return;
    const { thread, turn } = running;
    if (reasoning) {
      if (!running.reasoning) this.beginReasoning(running, { force: true });
      const old = running.reasoning.summary[0] ?? '';
      if (!reasoning.startsWith(old)) throw Error('Gateway replaced an already streamed reasoning summary');
      const delta = reasoning.slice(old.length);
      if (delta) {
        running.reasoning.summary[0] = reasoning;
        this.notify('item/reasoning/summaryTextDelta', { threadId: thread.id, turnId: turn.id, itemId: running.reasoning.id, summaryIndex: 0, delta });
      }
    }
    if (text) {
      if (!running.assistant) {
        running.assistant = { type: 'agentMessage', id: this.uuid(), text: '', phase: phase === 'commentary' ? 'commentary' : 'final_answer' };
        turn.items.push(running.assistant);
        if (turn.adapterMetadata.checkpoint?.inFlight) turn.adapterMetadata.checkpoint.inFlight.assistantItemId = running.assistant.id;
        this.notify('item/started', { threadId: thread.id, turnId: turn.id, item: running.assistant });
      }
      if (phase === 'commentary' || phase === 'final_answer') running.assistant.phase = phase;
      const old = running.assistant.text;
      if (!text.startsWith(old)) throw Error('Gateway replaced already streamed assistant text');
      const delta = text.slice(old.length);
      if (delta) {
        running.assistant.text = text;
        this.notify('item/agentMessage/delta', { threadId: thread.id, turnId: turn.id, itemId: running.assistant.id, delta });
      }
    }
    if (this.now() - running.lastSavedAt >= (this.agentOptions.persistIntervalMs ?? 1000)) { this.persist(); running.lastSavedAt = this.now(); }
  }
  async runTurn(running) { return runAgentTurn(this, running); }
  resumeTurn(params) {
    const thread = this.getThread(params.threadId), turn = params.turnId ? thread.turns.find(value => value.id === params.turnId) : thread.turns.at(-1);
    if (!turn) throw new RpcError(-32001, 'turn_not_found');
    if (this.running.has(thread.id)) return { result: { turn: copy(this.running.get(thread.id).turn) } };
    if (turn.status === 'completed') return { result: { turn: copy(turn) } };
    this.assertExecutionAllowed(turn);
    if (!turn.adapterMetadata?.checkpoint) throw new RpcError(-32602, 'No resumable execution checkpoint exists');
    if (params.model && params.model !== turn.model) throw new RpcError(-32602, 'Resume preserves the original turn model');
    turn.status = 'inProgress'; turn.error = null; turn.completedAt = null; turn.durationMs = null; thread.status = active();
    for (const call of turn.adapterMetadata.checkpoint.pendingCalls || []) if (call.state === 'running') call.state = 'uncertain';
    const running = { thread, turn, controller: new AbortController(), terminal: false, assistant: null, reasoning: null, lastSavedAt: this.now() };
    this.running.set(thread.id, running); this.persist();
    return { result: { turn: copy(turn) }, afterReply: () => { this.notify('thread/status/changed', { threadId: thread.id, status: thread.status }); this.notify('turn/started', { threadId: thread.id, turn: copy(turn) }); this.runTurn(running).catch(error => this.diagnostics.push({ type: 'local-turn-finalization-error', message: error.message })); } };
  }
  finish(running, status, error) {
    if (running.terminal) return;
    if (status !== 'completed') interruptHostedSearch(this, running);
    const { thread, turn } = running;
    turn.status = status;
    if (turn.adapterMetadata?.checkpoint && status !== 'completed') { turn.adapterMetadata.resumable = true; turn.adapterMetadata.resumePolicy ??= status === 'interrupted' && running.interruptReason === 'pagehide' ? 'automatic' : 'manual'; turn.adapterMetadata.checkpoint.state = status; for (const call of turn.adapterMetadata.checkpoint.pendingCalls || []) if (call.state === 'running') call.state = 'uncertain'; }
    for (const item of turn.items) if (item.type === 'mcpToolCall' && item.status === 'inProgress') { item.status = 'failed'; item.result = { content: [{ type: 'text', text: 'Execution was interrupted; tool completion is unknown. It has not been reported as successful.' }], isError: true }; item.error = null; this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item }); }
    const finishedAtMs = this.now();
    const lifecycle = turn.adapterMetadata.reasoningLifecycle;
    if (lifecycle) { lifecycle.status = status === 'completed' ? 'completed' : 'cancelled'; lifecycle.completedAtMs = finishedAtMs; lifecycle.workDurationMs = Math.max(0, finishedAtMs - lifecycle.workStartedAtMs); }
    turn.error = error;
    turn.completedAt = Math.floor(finishedAtMs / 1000);
    turn.durationMs = Math.max(0, finishedAtMs - turn.adapterMetadata.startedAtMs);
    this.completeReasoning(running, status === 'completed' ? 'completed' : 'cancelled', finishedAtMs);
    thread.updatedAt = thread.recencyAt = turn.completedAt;
    thread.status = idle();
    try { this.persist(); }
    catch (storageError) { turn.status = 'failed'; turn.error = errorShape(storageError.message); }
    running.terminal = true;
    this.running.delete(thread.id);
    if (running.assistant && !running.assistantComplete) this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item: running.assistant });
    if (turn.error) this.notify('error', { threadId: thread.id, turnId: turn.id, error: turn.error, willRetry: false });
    this.notify('turn/completed', { threadId: thread.id, turn: copy(turn) });
    this.notify('thread/status/changed', { threadId: thread.id, status: thread.status });
  }
  interrupt(threadId, { reason = 'user', turnId = null } = {}) {
    const running = this.running.get(threadId);
    if (!running) {
      const thread = this.threads.get(threadId), turn = turnId ? thread?.turns.find(value => value.id === turnId) : thread?.turns.at(-1);
      if (turn && this.onIdleTurnInterrupt) Promise.resolve(this.onIdleTurnInterrupt({ threadId, turn, reason })).catch(error => this.diagnostics.push({ type: 'local-idle-transport-stop-error', message: String(error?.message || error) }));
      return;
    }
    running.interruptReason = reason;
    running.turn.adapterMetadata.resumePolicy = reason === 'pagehide' ? 'automatic' : 'manual';
    running.controller.abort(new DOMException('Turn interrupted locally', 'AbortError'));
    this.finish(running, 'interrupted', null);
  }
  interruptAll({ reason = 'pagehide' } = {}) { for (const threadId of this.running.keys()) this.interrupt(threadId, { reason }); }
}

/** EAKz's existing protocol consumer remains unchanged. */
export class LocalProtocolSocket extends EventTarget {
  readyState = 0;
  authenticatedPrincipal = { accountId: 'local-prototype', userId: 'local-prototype' };
  onopen = null; onmessage = null; onclose = null; onerror = null;
  constructor(server, diagnostics = []) {
    super(); this.server = server; this.diagnostics = diagnostics;
    this.unsubscribe = server.subscribe(event => { if (this.readyState === 1) this.deliver('message', new MessageEvent('message', { data: JSON.stringify(event) })); });
    setTimeout(() => { if (this.readyState !== 0) return; this.readyState = 1; this.deliver('open', new Event('open')); }, 0);
  }
  deliver(type, event) {
    this.dispatchEvent(event);
    try { this[`on${type}`]?.(event); }
    catch (error) { this.diagnostics.push({ type: 'local-protocol-client-error', message: String(error?.message ?? error) }); }
  }
  send(serialized) {
    if (this.readyState !== 1) throw new DOMException('Local socket is not open', 'InvalidStateError');
    let message;
    try { message = JSON.parse(serialized); }
    catch { this.reply({ id: null, error: { code: -32700, message: 'Invalid JSON-RPC message' } }); return; }
    if (!object(message) || typeof message.method !== 'string') return;
    const params = object(message.params) ? message.params : {}, safeModel = typeof params.model === 'string' && /^[a-zA-Z0-9._:-]{1,80}$/.test(params.model) ? params.model : undefined;
    const effort = params.effort ?? params.reasoningEffort ?? params.reasoning_effort;
    this.diagnostics.push({ type: 'rpc', method: message.method, paramKeys: Object.keys(params), ...(safeModel ? { model: safeModel } : {}), ...(['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(effort) ? { effort } : {}) });
    queueMicrotask(() => {
      if (this.readyState !== 1) return;
      try {
        // The native RPC transport is the Work/Codex surface. Classic Chat
        // reaches the shared engine through its separately declared REST seam.
        const mutation = ['thread/start', 'thread/resume', 'thread/settings/update', 'turn/start', 'turn/addUserMessage'].includes(message.method);
        const dispatchParams = mutation ? { ...(message.params ?? {}), executionSurface: 'work' } : message.params;
        const transaction = this.server.dispatch(message.method, dispatchParams);
        if (message.id != null) this.reply({ id: message.id, result: transaction.result });
        if (transaction.afterReply) setTimeout(transaction.afterReply, 0);
      } catch (error) {
        if (message.id != null) this.reply({ id: message.id, error: { code: error.code ?? error.rpcCode ?? -32603, message: error.message, ...(error.data === undefined ? {} : { data: error.data }) } });
      }
    });
  }
  reply(message) { if (this.readyState === 1) this.deliver('message', new MessageEvent('message', { data: JSON.stringify(message) })); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.unsubscribe(); this.deliver('close', new Event('close')); }
}
