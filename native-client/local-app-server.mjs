/** Original app-server protocol over real, resumable local execution. */
import { runAgentTurn } from './agent-turn-runner.mjs?v=b88858afb5156217';
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
  constructor({ storage, streamCompletion, readSettings, models, catalog, diagnostics = [], now = Date.now, uuid = () => crypto.randomUUID(), toolExecutor = null, checkpointStore = null, agentOptions = {}, getExecutionPolicy = null, onIdleTurnInterrupt = null, prepareUserInput = null }) {
    this.storage = storage;
    this.toolExecutor = toolExecutor;
    this.prepareUserInput = prepareUserInput;
    this.checkpointStore = checkpointStore;
    this.agentOptions = agentOptions;
    this.onIdleTurnInterrupt = onIdleTurnInterrupt;
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
    try {
      this.storage.setItem(this.storageKey, JSON.stringify({ schemaVersion: 1, threads: [...this.threads.values()].filter(thread => !thread.ephemeral) }));
    } catch (error) { throw new RpcError(-32000, `Local conversation history could not be saved: ${error.message}`); }
  }
  getThread(id) {
    if (typeof id !== 'string' || !this.threads.has(id)) throw new RpcError(-32001, 'thread_not_found');
    return this.threads.get(id);
  }
  executionPolicy() {
    let policy; try { policy = this.getExecutionPolicy(); } catch { throw new RpcError(-32003, 'The account execution policy could not be verified'); }
    return policy?.modelSelection === true ? { modelSelection: true } : { modelSelection: false, fixedModel: 'gpt-6-luna', defaultEffort: 'low', allowedEfforts: ['low', 'medium'] };
  }
  assertExecutionAllowed(turn) {
    const policy = this.executionPolicy();
    if (!policy.modelSelection && (turn.model !== policy.fixedModel || !policy.allowedEfforts.includes(turn.reasoningEffort))) throw new RpcError(-32003, 'This saved turn requires model access unavailable to this account. Send a new message using the Free model instead.');
    return policy;
  }
  selection(params, previous = {}) {
    const policy = this.executionPolicy();
    const model = policy.modelSelection ? params.model ?? params.collaborationMode?.settings?.model ?? previous.model ?? this.readSettings().model : policy.fixedModel;
    const catalog = this.models.getRpcModelList().data.find(entry => entry.model === model);
    if (!catalog) throw new RpcError(-32602, `The local adapter does not offer model ${String(model)}`);
    const supplied = params.effort ?? params.reasoningEffort ?? params.config?.model_reasoning_effort ?? params.collaborationMode?.settings?.reasoning_effort;
    const effort = policy.modelSelection ? supplied ?? previous.reasoningEffort ?? catalog.defaultReasoningEffort : supplied === 'medium' || Array.isArray(params.systemHints) && params.systemHints.includes('reason') ? 'medium' : policy.defaultEffort;
    if (!catalog.supportedReasoningEfforts.some(choice => choice.reasoningEffort === effort)) throw new RpcError(-32602, `The local adapter does not support effort ${String(effort)} for ${model}`);
    if (params.serviceTier != null && !['standard', 'default', 'fast', 'priority'].includes(params.serviceTier)) throw new RpcError(-32602, `The local text adapter does not implement service tier ${String(params.serviceTier)}`);
    const tier = params.serviceTier ?? previous.serviceTier ?? null;
    const explicitMode = params.selectionMode ?? params.modelSelection?.selectionMode ?? params.responsesapiClientMetadata?.selectionMode;
    return {
      model, reasoningEffort: effort, executionPolicy: policy.modelSelection ? 'verified-model-selection' : 'free-luna-low-or-explicit-medium', serviceTier: ['fast', 'priority'].includes(tier) ? 'fast' : null,
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
          model: selected.model, reasoningEffort: selected.reasoningEffort, serviceTier: selected.serviceTier, modelProvider: 'local-openai-compatible',
          createdAt: timestamp, updatedAt: timestamp, recencyAt: timestamp, status: idle(), archived: false,
          path: null, cwd: typeof params.cwd === 'string' ? params.cwd : '/', cliVersion: '0.0.0',
          source: 'appServer', originator: 'local-original-client-adapter', threadSource: params.threadSource ?? 'user',
          mode: params.mode ?? 'default', threadStartKind: params.threadStartKind ?? 'default', historyMode: null,
          parentThreadId: params.parentThreadId ?? null, forkedFromId: null, gitInfo: null, environments: [], turns: [],
          approvalPolicy: params.approvalPolicy ?? 'never',
          collaborationMode: copy(params.collaborationMode ?? defaultCollaboration(selected.model)),
          adapterMetadata: { source: 'local-original-client-adapter', conversationOrigin: params.conversationOrigin ?? 'tpp', selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch, instructions: this.instructions(params), clientMetadata: copy(params.responsesapiClientMetadata ?? null) },
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
    thread.serviceTier = selected.serviceTier;
    thread.uiServiceTier = selected.serviceTier;
    if (params.cwd != null) thread.cwd = params.cwd;
    if (params.collaborationMode) thread.collaborationMode = copy(params.collaborationMode);
    thread.collaborationMode.settings = { ...thread.collaborationMode.settings, model: selected.model, reasoning_effort: selected.reasoningEffort };
    thread.adapterMetadata = { ...thread.adapterMetadata, executionPolicy: selected.executionPolicy, selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch };
  }
  settingsSnapshot(thread) {
    return { model: thread.model, modelProvider: thread.modelProvider, effort: thread.reasoningEffort, serviceTier: thread.serviceTier ?? null, cwd: thread.cwd, approvalPolicy: thread.approvalPolicy, approvalsReviewer: 'user', sandboxPolicy: { type: 'readOnly', networkAccess: false }, personality: null, collaborationMode: copy(thread.collaborationMode), disabledPluginIds: [] };
  }
  startTurn(params, admission) {
    const thread = this.getThread(params.threadId), input = this.textInput(params), selected = this.selection(params, thread);
    if (params.outputSchema != null) throw new RpcError(-32601, 'Structured-output schema execution is not implemented by this local text adapter');
    const fingerprintParts = [input, selected.model, selected.reasoningEffort, selected.serviceTier];
    if (params.classicUserMessage?.metadata?.attachments?.length) fingerprintParts.push(params.classicUserMessage.metadata.attachments);
    const fingerprint = JSON.stringify(fingerprintParts);
    const duplicate = params.clientUserMessageId && thread.turns.find(turn => turn.clientUserMessageId === params.clientUserMessageId);
    if (duplicate) {
      if (duplicate.adapterMetadata.fingerprint !== fingerprint) throw new RpcError(-32602, 'A client user-message ID cannot be reused with different input or model settings');
      if (duplicate.status !== 'completed' && duplicate.adapterMetadata?.resumable && duplicate.adapterMetadata?.checkpoint) return this.resumeTurn({ threadId: thread.id, turnId: duplicate.id });
      return { result: { turn: copy(duplicate), ...(admission ? { clientUserMessageId: params.clientUserMessageId, admissionOutcome: 'duplicate', serverUserMessageId: duplicate.items[0].id } : {}) } };
    }
    if (this.running.has(thread.id)) throw new RpcError(-32000, 'A turn is already running in this local thread; queueing and steering are not implemented');
    const startedAtMs = this.now(), id = this.uuid(), userItem = { type: 'userMessage', id: this.uuid(), content: input, ...(params.clientUserMessageId ? { clientId: params.clientUserMessageId } : {}) };
    const turn = {
      id, status: 'inProgress', items: [userItem], error: null,
      startedAt: Math.floor(startedAtMs / 1000), completedAt: null, durationMs: null,
      model: selected.model, reasoningEffort: selected.reasoningEffort, serviceTier: selected.serviceTier,
      clientUserMessageId: params.clientUserMessageId ?? null,
      adapterMetadata: { startedAtMs, fingerprint, executionPolicy: selected.executionPolicy, selectionMode: selected.selectionMode, curatedPresetMatch: selected.curatedPresetMatch, clientMetadata: copy(params.responsesapiClientMetadata ?? null), instructions: this.instructions(params), ...(params.classicUserMessage ? { classicUserMessage: copy(params.classicUserMessage) } : {}) },
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
    const instructions = [...new Set([this.readSettings().customInstructions, ...thread.adapterMetadata.instructions, ...turn.adapterMetadata.instructions].filter(value => typeof value === 'string' && value.trim()))];
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
  append(running, text, reasoning, phase = null) {
    if (running.terminal) return;
    const { thread, turn } = running;
    if (reasoning) {
      if (!running.reasoning) {
        running.reasoning = { type: 'reasoning', id: this.uuid(), summary: [''], content: [] };
        turn.items.push(running.reasoning);
        if (turn.adapterMetadata.checkpoint?.inFlight) turn.adapterMetadata.checkpoint.inFlight.reasoningItemId = running.reasoning.id;
        this.notify('item/started', { threadId: thread.id, turnId: turn.id, item: running.reasoning });
      }
      const old = running.reasoning.summary[0];
      if (!reasoning.startsWith(old)) throw Error('Gateway replaced an already streamed reasoning summary');
      const delta = reasoning.slice(old.length);
      if (delta) {
        running.reasoning.summary[0] = reasoning;
        this.notify('item/reasoning/summaryTextDelta', { threadId: thread.id, turnId: turn.id, itemId: running.reasoning.id, summaryIndex: 0, delta });
      }
    }
    if (text) {
      if (!running.assistant) {
        if (running.reasoning && !running.reasoningComplete) { this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item: running.reasoning }); running.reasoningComplete = true; }
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
    const { thread, turn } = running;
    turn.status = status;
    if (turn.adapterMetadata?.checkpoint && status !== 'completed') { turn.adapterMetadata.resumable = true; turn.adapterMetadata.resumePolicy ??= status === 'interrupted' && running.interruptReason === 'pagehide' ? 'automatic' : 'manual'; turn.adapterMetadata.checkpoint.state = status; for (const call of turn.adapterMetadata.checkpoint.pendingCalls || []) if (call.state === 'running') call.state = 'uncertain'; }
    for (const item of turn.items) if (item.type === 'mcpToolCall' && item.status === 'inProgress') { item.status = 'failed'; item.result = { content: [{ type: 'text', text: 'Execution was interrupted; tool completion is unknown. It has not been reported as successful.' }], isError: true }; item.error = null; this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item }); }
    turn.error = error;
    turn.completedAt = Math.floor(this.now() / 1000);
    turn.durationMs = Math.max(0, this.now() - turn.adapterMetadata.startedAtMs);
    thread.updatedAt = thread.recencyAt = turn.completedAt;
    thread.status = idle();
    try { this.persist(); }
    catch (storageError) { turn.status = 'failed'; turn.error = errorShape(storageError.message); }
    running.terminal = true;
    this.running.delete(thread.id);
    if (running.reasoning && !running.reasoningComplete) this.notify('item/completed', { threadId: thread.id, turnId: turn.id, item: running.reasoning });
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
        const transaction = this.server.dispatch(message.method, message.params);
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
