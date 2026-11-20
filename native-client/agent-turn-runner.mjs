/** Resumable API/tool loop. Original frontend receives its existing item lifecycle. */
import { isHostCheckpoint } from './preferred-host-transport.mjs?v=3886dd09e0b0f238';
import { parseClassicInputMessages } from './classic-input-messages.mjs?v=3886dd09e0b0f238';
import { webSearchRequest, updateHostedSearch, interruptHostedSearch, webSearchReferences } from './local-web-search.mjs?v=3886dd09e0b0f238';
const clone = value => structuredClone(value);
const CONTINUE = 'Continue the unfinished response from the saved text, without repeating it. Preserve the requested task, model and reasoning effort. Do not claim any tool succeeded unless its recorded output confirms it.';
const compactUsage = usage => Object.fromEntries(['input_tokens', 'output_tokens', 'total_tokens', 'prompt_tokens', 'completion_tokens', 'input_tokens_details', 'output_tokens_details', 'prompt_tokens_details', 'completion_tokens_details'].filter(key => usage[key] !== undefined).map(key => [key, clone(usage[key])]));
const toolError = message => ({ isError: true, content: [{ type: 'text', text: message }], structuredContent: { error: message } });
function waitForRetry(ms, signal) { return new Promise((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(signal.reason); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort(); }); }
function responsePhase(result) {
  const lastMessage = result.output_messages?.at(-1);
  const value = lastMessage ? lastMessage.phase : result.response_items?.findLast(item => item.type === 'message' && item.role === 'assistant')?.phase ?? result.phase;
  return value === 'commentary' || value === 'final_answer' ? value : null;
}
function assistantMessage(result) {
  const phase = responsePhase(result);
  return { role: 'assistant', content: result.content || '', ...(phase ? { phase } : {}), ...(result.tool_calls?.length ? { tool_calls: clone(result.tool_calls) } : {}), ...(result.response_items?.length ? { response_items: clone(result.response_items) } : {}) };
}
export async function checkpoint(server, running) {
  server.persist();
  if (server.checkpointStore?.save) await server.checkpointStore.save({ schemaVersion: 1, threadId: running.thread.id, turnId: running.turn.id, checkpoint: clone(running.turn.adapterMetadata.checkpoint), turn: clone(running.turn) });
}
function completeItems(server, running, reasoningStatus = 'completed', completedAtMs = server.now()) {
  server.completeReasoning(running, reasoningStatus, completedAtMs);
  for (const item of server.assistantMessages(running)) server.completeAssistant(running, item);
}
export async function runAgentTurn(server, running) {
  const { thread, turn, controller } = running, signal = controller.signal;
  const meta = turn.adapterMetadata;
  const cp = meta.checkpoint ??= { schemaVersion: 1, state: 'model', rounds: 0, transcript: [], pendingCalls: [], completedCalls: {}, metrics: [], interruptedAttempts: [] };
  let executor = server.toolExecutor;
  const save = () => checkpoint(server, running);
  const errorText = error => String(error?.message || error).replaceAll(server.readSettings().apiKey || '\0NO_KEY\0', '[redacted]');
  const notify = (method, extra) => server.notify(method, { threadId: thread.id, turnId: turn.id, ...extra });
  const executionSettings = () => {
    server.assertExecutionAllowed(turn);
    const settings = { ...server.readSettings(), model: turn.model, reasoningEffort: turn.reasoningEffort === 'ultra' ? 'max' : turn.reasoningEffort, reasoningMode: turn.reasoningMode ?? 'standard', autoPython: false };
    if (executor?.tools?.length) settings.apiTransport = server.agentOptions.toolTransport ?? 'responses';
    if (meta.webSearchIntent?.enabled) settings.apiTransport = 'responses';
    const priority = turn.serviceTier === 'fast' && server.agentOptions.verifiedPriority === true;
    settings.fastMode = priority; settings.serviceTier = priority ? 'priority' : undefined;
    if (priority) settings.apiTransport = 'responses';
    meta.serviceTierExecution = { uiServiceTier: turn.serviceTier ?? null, apiServiceTier: priority ? 'priority' : null, verifiedPriority: priority };
    return settings;
  };
  try {
    // Validate bytes before creating a provider/host job; saved inputs replay verbatim.
    if (!cp.transcript.length) {
      const classic = meta.classicInputMessages === undefined ? null : parseClassicInputMessages(meta.classicInputMessages);
      if (classic && JSON.stringify(meta.classicUserMessage) !== JSON.stringify(classic.incoming)) throw Object.assign(Error('Saved Classic input records do not match the original user message'), { code: 'INVALID_CLASSIC_INPUT', retryable: false });
      const input = turn.items.find(item => item.type === 'userMessage').content;
      const prepared = typeof server.prepareUserInput === 'function'
        ? await server.prepareUserInput({ input: clone(input), threadId: thread.id, turnId: turn.id, thread, turn, signal })
        : { content: input.map(part => part.text).join('\n'), source: 'original-text-input', files: [], images: [] };
      signal.throwIfAborted(); server.assertExecutionAllowed(turn);
      if (typeof prepared?.content !== 'string' && !Array.isArray(prepared?.content)) throw Object.assign(Error('The local input resolver returned invalid provider content'), { code: 'INVALID_PREPARED_INPUT', retryable: false });
      const previousInput = { transcript: cp.transcript, preparedInput: cp.preparedInput, materializedFiles: meta.materializedFiles };
      cp.transcript = classic ? classic.originalMessages.map(message => message.author.role === 'user'
        ? { role: 'user', content: clone(prepared.content) }
        : { role: 'system', content: message.content.parts.join('\n') }) : [{ role: 'user', content: clone(prepared.content) }];
      cp.preparedInput = { source: prepared.source, files: clone(prepared.files ?? []), images: clone(prepared.images ?? []) };
      meta.materializedFiles = clone(prepared.files ?? []);
      try { await save(); delete meta.inputPreparationFailure; }
      catch (cause) {
        // A dataURL may fit OPFS but exceed the local history quota. Do not leave
        // its uncommitted large transcript in memory, poisoning every later save.
        cp.transcript = previousInput.transcript;
        if (previousInput.preparedInput === undefined) delete cp.preparedInput; else cp.preparedInput = previousInput.preparedInput;
        if (previousInput.materializedFiles === undefined) delete meta.materializedFiles; else meta.materializedFiles = previousInput.materializedFiles;
        meta.inputPreparationFailure = { code: 'LOCAL_INPUT_CHECKPOINT_STORAGE', files: clone(prepared.files ?? []), images: clone(prepared.images ?? []), at: server.now() };
        try { server.persist(); } catch { /* The normal failure path reports any remaining storage error. */ }
        throw Object.assign(Error('The prepared input could not be saved in browser history. Actual uploaded file bytes were preserved and no model request was submitted. Free browser storage or use a smaller image, then retry.'), { code: 'LOCAL_INPUT_CHECKPOINT_STORAGE', status: 507, retryable: false, cause });
      }
    }
    meta.requestedEffort = turn.reasoningEffort;
    meta.reasoningMode = turn.reasoningMode ?? 'standard';
    meta.productExecutionMode = turn.reasoningEffort === 'ultra' ? 'ultra' : 'standard';
    meta.underlyingApiEffort = turn.reasoningEffort === 'ultra' ? 'max' : turn.reasoningEffort;
    if (turn.reasoningEffort === 'ultra') {
      if (server.agentOptions.ultraOrchestration !== true) throw Object.assign(Error('Site Ultra orchestration is not enabled in this deployment. No provider request was submitted.'), { code: 'ULTRA_ORCHESTRATION_NOT_ENABLED', retryable: false });
      const { createUltraToolExecutor } = await import('./site-ultra-orchestrator.mjs?v=3886dd09e0b0f238');
      executor = createUltraToolExecutor({ baseExecutor: executor, streamCompletion: options => server.streamCompletion(options), turn, checkpoint: cp, save, getSettings: executionSettings, getContext: () => [...server.messages(thread, turn, { omitCurrent: true }), ...cp.transcript], getAbortMode: () => running.interruptReason === 'pagehide' ? 'pagehide' : signal.reason?.requiresTransportResume ? 'transport' : 'user', now: server.now, redact: errorText });
    }
    // A partial response is genuine saved output, not a completed tool call.
    const reattachFrame = cp.inFlight && (isHostCheckpoint(cp.inFlight.transport) || cp.inFlight.result);
    if (cp.partialResponse && !reattachFrame) {
      const partial = cp.partialResponse;
      if (partial.content) cp.transcript.push({ role: 'assistant', content: partial.content, ...(partial.phase ? { phase: partial.phase } : {}) });
      cp.transcript.push({ role: 'user', content: CONTINUE });
      cp.interruptedAttempts.push({ at: Date.now(), partialCharacters: partial.content?.length || 0 });
      cp.partialResponse = null;
    }
    if (cp.inFlight && !reattachFrame) { cp.abandonedApiAttempts ??= []; cp.abandonedApiAttempts.push({ metricIndex: cp.inFlight.metricIndex, transport: cp.inFlight.transport }); cp.inFlight = null; }
    if (cp.nextResumeAt > server.now()) await waitForRetry(Math.min(30000, cp.nextResumeAt - server.now()), signal);
    const maxRounds = server.agentOptions.maxApiRounds ?? 64;
    let roundsThisRun = 0, retries = 0;
    while (!running.terminal) {
      signal.throwIfAborted();
      server.assertExecutionAllowed(turn);
      for (const record of cp.pendingCalls) {
        signal.throwIfAborted();
        if (cp.completedCalls[record.call.id]) { record.state = 'completed'; record.output = cp.completedCalls[record.call.id].output; continue; }
        let item = turn.items.find(item => item.id === record.itemId);
        if (!item) {
          item = { type: 'mcpToolCall', id: record.itemId ?? server.uuid(), server: 'browser_workspace', tool: record.call.function.name, arguments: {}, status: 'inProgress', result: null, error: null, durationMs: null };
          record.itemId = item.id; try { item.arguments = JSON.parse(record.call.function.arguments || '{}'); } catch { item.arguments = { raw: record.call.function.arguments }; }
          turn.items.push(item); notify('item/started', { item });
        }
        let output, fatalToolError;
        if (record.state === 'uncertain' || record.state === 'running') {
          output = await executor?.recoverCall?.(record.call, { threadId: thread.id, turnId: turn.id, signal }) ?? toolError('The previous page closed while this tool was running. Completion is unknown; it has not been executed again. Inspect saved files before deciding whether a new call is necessary.');
        } else {
          record.state = 'running'; cp.state = 'tool'; await save(); const started = server.now();
          try {
            if (!executor?.execute || !executor.tools?.some(tool => tool.function?.name === record.call.function.name)) throw Error('Tool is not available: ' + record.call.function.name);
            output = await executor.execute(record.call, { threadId: thread.id, turnId: turn.id, signal, onStatus: status => { record.lastStatus = String(status); }, onTaskStatus: async state => { cp.taskState = state; await save(); } });
            if (!output || !Array.isArray(output.content)) throw Error('Tool executor returned an invalid MCP result');
          } catch (error) { if (signal.aborted) { record.state = 'uncertain'; throw error; } output = error.mcpResult ?? toolError(errorText(error)); if (error.providerFailure) fatalToolError = error; }
          item.durationMs = Math.max(0, server.now() - started);
        }
        record.output = clone(output); record.state = 'completed';
        item.status = output.isError ? 'failed' : 'completed'; item.result = clone(output); item.error = null;
        cp.completedCalls[record.call.id] = { name: record.call.function.name, arguments: record.call.function.arguments, output: clone(output) };
        await save(); notify('item/completed', { item });
        if (fatalToolError) throw fatalToolError;
      }
      if (cp.pendingCalls.length) {
        for (const record of cp.pendingCalls) cp.transcript.push({ role: 'tool', tool_call_id: record.call.id, content: JSON.stringify(record.output ?? cp.completedCalls[record.call.id].output) });
        cp.pendingCalls = []; cp.state = 'model'; await save();
      }
      if (++roundsThisRun > maxRounds) { cp.state = 'yielded'; meta.resumable = true; meta.resumePolicy = 'automatic'; await save(); server.finish(running, 'interrupted', { message: 'Execution checkpoint saved; continue this task to run the next batch.', codexErrorInfo: null, additionalDetails: null, misalignment: null }); return; }
      const settings = executionSettings();
      const searchRequest = webSearchRequest(meta.webSearchIntent, turn.items, executor?.tools || []);
      const tools = searchRequest.tools, instruction = (executor?.tools?.length || 0) ? [{ role: 'system', content: 'Execute requested work using the available real tools instead of only announcing a plan. For a multi-step job, persist running progress with task_status and mark complete only after the deliverables exist. Continue correcting actual tool errors. Python runs in a browser Pyodide environment, not a hosted shell; only workspace files persist after reload. Never claim unexecuted shell, network or file operations. Return real artifact download URLs supplied by tools.' }] : [];
      if (turn.reasoningEffort === 'ultra') instruction.push({ role: 'system', content: 'This is the site-provided Ultra execution mode. Use delegate_tasks for independent analysis when it benefits the task; it runs1–3 real parallel workers from the same selected family at API max effort. Inspect their actual results and reconcile differences. You own the real file/Python tools and final synthesis. This is application orchestration, not OpenAI private Ultra infrastructure. Never claim a worker or tool succeeded when its result reports failure.' });
      const messages = [...instruction, ...server.messages(thread, turn, { omitCurrent: true }), ...clone(cp.transcript)];
      let frame = cp.inFlight, metric;
      if (frame && (isHostCheckpoint(frame.transport) || frame.result)) {
        metric = cp.metrics[frame.metricIndex]; if (!metric) throw Error('The in-flight transport metric is missing; no replacement request was submitted');
        running.assistant = turn.items.find(item => item.id === frame.assistantItemId) ?? (cp.partialResponse?.content ? turn.items.findLast(item => item.type === 'agentMessage' && item.text === cp.partialResponse.content) : null);
        running.reasoning = turn.items.find(item => item.id === frame.reasoningItemId) ?? (cp.partialResponse?.reasoning ? turn.items.findLast(item => item.type === 'reasoning' && item.summary?.[0] === cp.partialResponse.reasoning) : null);
        running.legacyAssistantLayout = Boolean(running.assistant && !frame.assistantItemIds);
        running.reasoningComplete = frame.reasoningComplete === true;
        if (frame.result && running.reasoning?.status === 'cancelled') running.reasoningComplete = false;
        metric.resumeCount = (metric.resumeCount || 0) + 1; metric.lastResumeAt = server.now();
      } else {
        running.assistant = null; running.legacyAssistantLayout = false; running.reasoning = null; running.reasoningComplete = false;
        metric = { sequence: ++cp.rounds, model: turn.model, effort: turn.reasoningEffort, underlyingApiEffort: settings.reasoningEffort, productExecutionMode: meta.productExecutionMode, startedAt: server.now(), firstOutputAt: null, transport: settings.apiTransport || 'chat/completions' }; cp.metrics.push(metric);
        frame = cp.inFlight = { metricIndex: cp.metrics.length - 1, transport: {}, assistantItemId: null, reasoningItemId: null, reasoningComplete: false };
        metric.transportCheckpoint = frame.transport;
      }
      metric.requestedReasoningMode ??= settings.reasoningMode ?? 'standard';
      cp.state = 'model'; await save(); metric.requestSentAt ??= server.now();
      if (!frame.result) server.beginReasoning(running, { startedAtMs: metric.requestSentAt });
      let result;
      try {
        result = frame.result ? clone(frame.result) : await server.streamCompletion({ settings, messages, tools, toolChoice: searchRequest.toolChoice, signal,
          providerRoutingContext: { threadId: thread.id, conversationOrigin: thread.adapterMetadata?.conversationOrigin, isFreeChat: turn.executionSurface === 'chat' && !server.executionPolicy().modelSelection },
          transportContext: { checkpoint: frame.transport, requestId: turn.id + ':' + metric.sequence, onCheckpoint: save, reattach: isHostCheckpoint(frame.transport), savedPartial: cp.partialResponse, requiredConcurrency: turn.reasoningEffort === 'ultra' ? 3 : 1, getAbortMode: () => running.interruptReason === 'pagehide' ? 'pagehide' : signal.reason?.requiresTransportResume ? 'transport' : 'user' },
          onActivity: () => { if (metric.firstOutputAt == null) metric.firstOutputAt = server.now(); }, onDelta: (_delta, assembled) => {
          if (running.terminal) return;
          if (metric.firstOutputAt == null && (assembled.content || assembled.reasoning || assembled.tool_calls?.length)) metric.firstOutputAt = server.now();
          updateHostedSearch(server, running, assembled);
          cp.partialResponse = { content: assembled.content || '', reasoning: assembled.reasoning || '', ...(assembled.phase ? { phase: assembled.phase } : {}) };
          server.append(running, assembled.content || '', assembled.reasoning || '', assembled.phase, assembled.output_messages);
          frame.assistantItemId = running.assistant?.id ?? frame.assistantItemId; frame.reasoningItemId = running.reasoning?.id ?? frame.reasoningItemId; frame.reasoningComplete = running.reasoningComplete === true;
        } });
        metric.responseReceivedAt ??= server.now();
        if (!['stop', 'tool_calls', 'length'].includes(result.finish_reason)) throw Object.assign(Error('The provider stream did not confirm a complete or explicitly truncated response; no tool was executed and no commentary continuation was submitted.'), { code: 'INCOMPLETE_RESPONSE_STREAM', retryable: false });
        frame.result = clone(result); await save();
      } catch (error) {
        metric.endedAt = server.now(); metric.totalMs = metric.endedAt - metric.startedAt; metric.error = errorText(error);
        const hostPending = isHostCheckpoint(frame.transport) && !frame.transport.consumerFinished && !frame.transport.cancelRequested && frame.transport.state !== 'cancelled';
        if (hostPending && (error.requiresTransportResume || signal.aborted && running.interruptReason === 'pagehide')) {
          frame.needsReattach = true; error.requiresTransportResume = true; if (!signal.aborted) { cp.hostFailures = (cp.hostFailures || 0) + 1; error.hostFailureCounted = true; }
          metric.status = error.status ?? null; metric.code = error.code ?? null; metric.retryable = false; await save(); throw error;
        }
        const retryable = error.retryable === true || error.retryable !== false && ![400,401,402,403,404,422].includes(error.status) && /fetch|network|stream|connection|timeout|terminated|socket/i.test(metric.error);
        metric.status = error.status ?? null; metric.code = error.code ?? null; metric.retryable = retryable;
        if (retryable) cp.networkFailures = (cp.networkFailures || 0) + 1;
        if (!signal.aborted && retryable && retries++ < (server.agentOptions.streamRetries ?? 2)) {
          completeItems(server, running, 'cancelled');
          if (cp.partialResponse?.content) { cp.transcript.push({ role: 'assistant', content: cp.partialResponse.content, ...(cp.partialResponse.phase ? { phase: cp.partialResponse.phase } : {}) }); cp.transcript.push({ role: 'user', content: CONTINUE }); }
          cp.partialResponse = null; cp.inFlight = null; cp.state = 'retrying';
          const retryDelay = Math.min(30000, error.retryAfterMs ?? (server.agentOptions.retryDelayMs ?? 500) * 2 ** Math.min(cp.networkFailures - 1, 5)); cp.nextResumeAt = server.now() + retryDelay;
          await save(); await waitForRetry(retryDelay, signal); continue;
        }
        throw error;
      }
      if (running.terminal) return;
      cp.networkFailures = 0; cp.hostFailures = 0; cp.nextResumeAt = null;
      const phase = responsePhase(result);
      updateHostedSearch(server, running, result);
      if (meta.webSearchIntent?.required && !turn.items.some(item => item.type === 'webSearch' && item.responseItem?.status === 'completed')) throw Object.assign(Error('The provider did not perform the requested hosted web search. No search success or sourced answer was reported.'), { code: 'WEB_SEARCH_NOT_PERFORMED', retryable: false });
      server.append(running, result.content || '', result.reasoning || '', phase ?? (result.tool_calls?.length ? 'commentary' : 'final_answer'), result.output_messages);
      const responseItems = result.response_items ?? [];
      for (const item of server.assistantMessages(running)) {
        const message = result.output_messages?.find(value => frame.assistantItemIds?.[value.index] === item.id);
        item.webSearchReferences = webSearchReferences(item.text, message?.id ? responseItems.filter(value => value.id === message.id) : responseItems);
      }
      completeItems(server, running, 'completed', metric.responseReceivedAt);
      metric.endedAt = server.now(); metric.totalMs = metric.endedAt - metric.startedAt; metric.ttftMs = metric.firstOutputAt == null ? null : metric.firstOutputAt - metric.requestSentAt; metric.finishReason = result.finish_reason;
      if (result.usage) metric.usage = compactUsage(result.usage);
      if (result.adapter_execution) metric.adapterExecution = clone(result.adapter_execution);
      if (['standard', 'pro'].includes(result.actual_reasoning?.mode)) metric.actualReasoningMode = result.actual_reasoning.mode;
      cp.partialResponse = null; cp.inFlight = null;
      if (result.finish_reason === 'length' && result.tool_calls?.length) {
        if (result.content) cp.transcript.push({ role: 'assistant', content: result.content });
        cp.transcript.push({ role: 'user', content: 'The previous output was truncated during a function call. No incomplete call has been executed. Reissue complete tool calls with valid JSON, then continue the task.' }); cp.state = 'continuing'; await save(); continue;
      }
      cp.transcript.push(assistantMessage(result)); 
      if (result.usage) meta.gatewayUsage = compactUsage(result.usage);
      if (result.actual_reasoning) meta.actualReasoning = clone(result.actual_reasoning);
      if (result.response_items) meta.gatewayResponseItems = clone(result.response_items);
      if (result.tool_calls?.length) {
        cp.commentaryOnlyRounds = 0; cp.searchOnlyRounds = 0;
        if (!tools.length) throw Error('Gateway requested a tool that was not available');
        const seen = new Set();
        cp.pendingCalls = result.tool_calls.map(call => {
          if (!call.id || !call.function?.name || seen.has(call.id)) throw Error('Gateway returned an invalid or duplicate tool-call ID'); seen.add(call.id);
          const completed = cp.completedCalls[call.id];
          if (completed && (completed.name !== call.function.name || completed.arguments !== call.function.arguments)) throw Error('Gateway reused a tool-call ID with different arguments');
          return { call: clone(call), state: 'queued' };
        });
        cp.state = 'tool'; await save(); continue;
      }
      if (!result.content && result.response_items?.some(item => item.type === 'web_search_call' && item.status === 'completed')) {
        cp.searchOnlyRounds = (cp.searchOnlyRounds || 0) + 1;
        cp.state = 'continuing'; await save();
        if (cp.searchOnlyRounds >= 3) throw Object.assign(Error('Hosted web search completed but the provider did not return an answer after three consecutive search-only responses. Actual search records were saved; no final answer was fabricated.'), { code: 'WEB_SEARCH_WITHOUT_ANSWER', retryable: false });
        continue;
      }
      cp.searchOnlyRounds = 0;
      if (phase === 'commentary' && result.finish_reason === 'stop') {
        cp.commentaryOnlyRounds = (cp.commentaryOnlyRounds || 0) + 1;
        cp.state = 'continuing'; await save();
        if (cp.commentaryOnlyRounds >= (server.agentOptions.maxConsecutiveCommentaryRounds ?? 3)) throw Object.assign(Error('The model returned only intermediate commentary without completing the requested work. The unfinished execution checkpoint was saved; no tool or deliverable was reported as successful.'), { code: 'COMMENTARY_WITHOUT_COMPLETION', retryable: false });
        cp.transcript.push({ role: 'user', content: 'Your previous message was explicitly marked as intermediate commentary, not a final answer. Continue the actual user task, use the available real tools when needed, and provide a final_answer only after the requested work is completed or its actual limitation has been explained.' });
        await save(); continue;
      }
      cp.commentaryOnlyRounds = 0;
      if (result.finish_reason === 'length' || cp.taskState?.status === 'running') {
        cp.transcript.push({ role: 'user', content: result.finish_reason === 'length' ? CONTINUE : 'The recorded task is still running. Continue the remaining work using tools, then mark task_status complete when finished.' });
        cp.state = 'continuing'; await save(); continue;
      }
      if (result.finish_reason !== 'stop') throw Error('Gateway did not confirm completion: ' + (result.finish_reason || 'missing finish signal'));
      if (!result.content) throw Error('Gateway returned no final text');
      cp.state = 'completed'; meta.resumable = false; await save(); server.finish(running, 'completed', null, metric.responseReceivedAt); return;
    }
  } catch (error) {
    if (running.terminal) return;
    interruptHostedSearch(server, running);
    cp.state = signal.aborted ? 'interrupted' : 'failed'; meta.resumable = true;
    const retryable = error.retryable === true || error.retryable !== false && ![400, 401, 402, 403, 404, 422].includes(error.status) && /fetch|network|stream|connection|timeout|terminated|socket/i.test(errorText(error));
    if (error.requiresTransportResume && !error.hostFailureCounted && !signal.aborted) cp.hostFailures = (cp.hostFailures || 0) + 1;
    const transportRetry = error.requiresTransportResume === true && ![401,403].includes(error.status) && (cp.hostFailures || 0) < (server.agentOptions.maxConsecutiveFailures ?? 6);
    meta.resumePolicy = signal.aborted ? running.interruptReason === 'pagehide' ? 'automatic' : 'manual' : transportRetry ? 'automatic' : retryable && (cp.networkFailures || 0) < (server.agentOptions.maxConsecutiveFailures ?? 6) ? 'automatic' : 'manual';
    if (error.requiresTransportResume) cp.nextResumeAt = server.now() + Math.min(30000, (server.agentOptions.retryDelayMs ?? 500) * 2 ** Math.min(cp.hostFailures || 1, 5));
    if (retryable) cp.nextResumeAt = server.now() + Math.min(30000, (server.agentOptions.retryDelayMs ?? 500) * 2 ** Math.min(cp.networkFailures || 1, 5));
    meta.lastFailure = { code: error.code ?? null, status: error.status ?? null, providerCode: error.providerCode ?? null, requestId: error.requestId ?? null, param: error.param ?? null, retryable, requiresTransportResume: error.requiresTransportResume === true }; 
    try { await save(); } catch (saveError) { server.diagnostics.push({ type: 'checkpoint-error', message: errorText(saveError) }); }
    if (signal.aborted || error?.name === 'AbortError') server.finish(running, 'interrupted', null);
    else server.finish(running, 'failed', { message: errorText(error), codexErrorInfo: null, additionalDetails: null, misalignment: null });
  }
}
