/** Resumable API/tool loop. Original frontend receives its existing item lifecycle. */
const clone = value => structuredClone(value);
const CONTINUE = 'Continue the unfinished response from the saved text, without repeating it. Preserve the requested task, model and reasoning effort. Do not claim any tool succeeded unless its recorded output confirms it.';
const compactUsage = usage => Object.fromEntries(['input_tokens', 'output_tokens', 'total_tokens', 'prompt_tokens', 'completion_tokens', 'input_tokens_details', 'output_tokens_details', 'prompt_tokens_details', 'completion_tokens_details'].filter(key => usage[key] !== undefined).map(key => [key, clone(usage[key])]));
const toolError = message => ({ isError: true, content: [{ type: 'text', text: message }], structuredContent: { error: message } });
function waitForRetry(ms, signal) { return new Promise((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(signal.reason); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort(); }); }
function assistantMessage(result) {
  return { role: 'assistant', content: result.content || '', ...(result.tool_calls?.length ? { tool_calls: clone(result.tool_calls) } : {}), ...(result.response_items?.length ? { response_items: clone(result.response_items) } : {}) };
}
export async function checkpoint(server, running) {
  server.persist();
  if (server.checkpointStore?.save) await server.checkpointStore.save({ schemaVersion: 1, threadId: running.thread.id, turnId: running.turn.id, checkpoint: clone(running.turn.adapterMetadata.checkpoint), turn: clone(running.turn) });
}
function completeItems(server, running) {
  const completed = running.turn.adapterMetadata.completedItemIds ??= [];
  for (const item of [running.reasoning, running.assistant]) if (item && !completed.includes(item.id)) completed.push(item.id);
  if (running.reasoning && !running.reasoningComplete) { server.notify('item/completed', { threadId: running.thread.id, turnId: running.turn.id, item: running.reasoning }); running.reasoningComplete = true; }
  if (running.assistant && !running.assistantComplete) { server.notify('item/completed', { threadId: running.thread.id, turnId: running.turn.id, item: running.assistant }); running.assistantComplete = true; }
}
export async function runAgentTurn(server, running) {
  const { thread, turn, controller } = running, signal = controller.signal;
  const meta = turn.adapterMetadata;
  const cp = meta.checkpoint ??= { schemaVersion: 1, state: 'model', rounds: 0, transcript: [{ role: 'user', content: turn.items.find(item => item.type === 'userMessage').content.map(part => part.text).join('\n') }], pendingCalls: [], completedCalls: {}, metrics: [], interruptedAttempts: [] };
  let executor = server.toolExecutor;
  const save = () => checkpoint(server, running);
  const errorText = error => String(error?.message || error).replaceAll(server.readSettings().apiKey || '\0NO_KEY\0', '[redacted]');
  const notify = (method, extra) => server.notify(method, { threadId: thread.id, turnId: turn.id, ...extra });
  const executionSettings = () => {
    server.assertExecutionAllowed(turn);
    const settings = { ...server.readSettings(), model: turn.model, reasoningEffort: turn.reasoningEffort === 'ultra' ? 'max' : turn.reasoningEffort, autoPython: false };
    if (executor?.tools?.length) settings.apiTransport = server.agentOptions.toolTransport ?? 'responses';
    const priority = turn.serviceTier === 'fast' && server.agentOptions.verifiedPriority === true;
    settings.fastMode = priority; settings.serviceTier = priority ? 'priority' : undefined;
    if (priority) settings.apiTransport = 'responses';
    meta.serviceTierExecution = { uiServiceTier: turn.serviceTier ?? null, apiServiceTier: priority ? 'priority' : null, verifiedPriority: priority };
    return settings;
  };
  try {
    meta.requestedEffort = turn.reasoningEffort;
    meta.productExecutionMode = turn.reasoningEffort === 'ultra' ? 'ultra' : 'standard';
    meta.underlyingApiEffort = turn.reasoningEffort === 'ultra' ? 'max' : turn.reasoningEffort;
    if (turn.reasoningEffort === 'ultra') {
      if (server.agentOptions.ultraOrchestration !== true) throw Object.assign(Error('Site Ultra orchestration is not enabled in this deployment. No provider request was submitted.'), { code: 'ULTRA_ORCHESTRATION_NOT_ENABLED', retryable: false });
      const { createUltraToolExecutor } = await import('./site-ultra-orchestrator.mjs?v=7a172eaaf0f3c282');
      executor = createUltraToolExecutor({ baseExecutor: executor, streamCompletion: options => server.streamCompletion(options), turn, checkpoint: cp, save, getSettings: executionSettings, getContext: () => [...server.messages(thread, turn, { omitCurrent: true }), ...cp.transcript], now: server.now, redact: errorText });
    }
    // A partial response is genuine saved output, not a completed tool call.
    if (cp.partialResponse) {
      const partial = cp.partialResponse;
      if (partial.content) cp.transcript.push({ role: 'assistant', content: partial.content });
      cp.transcript.push({ role: 'user', content: CONTINUE });
      cp.interruptedAttempts.push({ at: Date.now(), partialCharacters: partial.content?.length || 0 });
      cp.partialResponse = null;
    }
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
          output = await executor?.recoverCall?.(record.call) ?? toolError('The previous page closed while this tool was running. Completion is unknown; it has not been executed again. Inspect saved files before deciding whether a new call is necessary.');
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
      const tools = executor?.tools || [], instruction = tools.length ? [{ role: 'system', content: 'Execute requested work using the available real tools instead of only announcing a plan. For a multi-step job, persist running progress with task_status and mark complete only after the deliverables exist. Continue correcting actual tool errors. Python runs in a browser Pyodide environment, not a hosted shell; only workspace files persist after reload. Never claim unexecuted shell, network or file operations. Return real artifact download URLs supplied by tools.' }] : [];
      if (turn.reasoningEffort === 'ultra') instruction.push({ role: 'system', content: 'This is the site-provided Ultra execution mode. Use delegate_tasks for independent analysis when it benefits the task; it runs1–3 real parallel workers from the same selected family at API max effort. Inspect their actual results and reconcile differences. You own the real file/Python tools and final synthesis. This is application orchestration, not OpenAI private Ultra infrastructure. Never claim a worker or tool succeeded when its result reports failure.' });
      const messages = [...instruction, ...server.messages(thread, turn, { omitCurrent: true }), ...clone(cp.transcript)];
      running.assistant = null; running.assistantComplete = false; running.reasoning = null; running.reasoningComplete = false;
      const metric = { sequence: ++cp.rounds, model: turn.model, effort: turn.reasoningEffort, underlyingApiEffort: settings.reasoningEffort, productExecutionMode: meta.productExecutionMode, startedAt: server.now(), firstOutputAt: null, transport: settings.apiTransport || 'chat/completions' }; cp.metrics.push(metric); cp.state = 'model';
      await save();
      metric.requestSentAt = server.now();
      let result;
      try {
        result = await server.streamCompletion({ settings, messages, tools, signal, onActivity: () => { if (metric.firstOutputAt == null) metric.firstOutputAt = server.now(); }, onDelta: (_delta, assembled) => {
          if (metric.firstOutputAt == null && (assembled.content || assembled.reasoning || assembled.tool_calls?.length)) metric.firstOutputAt = server.now();
          cp.partialResponse = { content: assembled.content || '', reasoning: assembled.reasoning || '' };
          server.append(running, assembled.content || '', assembled.reasoning || '');
        } });
      } catch (error) {
        metric.endedAt = server.now(); metric.totalMs = metric.endedAt - metric.startedAt; metric.error = errorText(error);
        const retryable = error.retryable === true || error.retryable !== false && ![400, 401, 402, 403, 404, 422].includes(error.status) && /fetch|network|stream|connection|timeout|terminated|socket/i.test(metric.error);
        metric.status = error.status ?? null; metric.code = error.code ?? null; metric.retryable = retryable;
        if (retryable) cp.networkFailures = (cp.networkFailures || 0) + 1;
        if (!signal.aborted && retryable && retries++ < (server.agentOptions.streamRetries ?? 2)) {
          completeItems(server, running);
          if (cp.partialResponse?.content) { cp.transcript.push({ role: 'assistant', content: cp.partialResponse.content }); cp.transcript.push({ role: 'user', content: CONTINUE }); }
          cp.partialResponse = null; cp.state = 'retrying';
          const retryDelay = Math.min(30000, error.retryAfterMs ?? (server.agentOptions.retryDelayMs ?? 500) * 2 ** Math.min(cp.networkFailures - 1, 5)); cp.nextResumeAt = server.now() + retryDelay;
          await save(); await waitForRetry(retryDelay, signal); continue;
        }
        throw error;
      }
      if (running.terminal) return;
      cp.networkFailures = 0; cp.nextResumeAt = null;
      server.append(running, result.content || '', result.reasoning || '');
      if (running.assistant && result.tool_calls?.length) running.assistant.phase = 'commentary';
      completeItems(server, running);
      metric.endedAt = server.now(); metric.totalMs = metric.endedAt - metric.startedAt; metric.ttftMs = metric.firstOutputAt == null ? null : metric.firstOutputAt - metric.requestSentAt; metric.finishReason = result.finish_reason;
      if (result.usage) metric.usage = compactUsage(result.usage);
      cp.partialResponse = null;
      if (result.finish_reason === 'length' && result.tool_calls?.length) {
        if (result.content) cp.transcript.push({ role: 'assistant', content: result.content });
        cp.transcript.push({ role: 'user', content: 'The previous output was truncated during a function call. No incomplete call has been executed. Reissue complete tool calls with valid JSON, then continue the task.' }); cp.state = 'continuing'; await save(); continue;
      }
      cp.transcript.push(assistantMessage(result)); 
      if (result.usage) meta.gatewayUsage = compactUsage(result.usage);
      if (result.actual_reasoning) meta.actualReasoning = clone(result.actual_reasoning);
      if (result.response_items) meta.gatewayResponseItems = clone(result.response_items);
      if (result.tool_calls?.length) {
        if (!tools.length) throw Error('Gateway requested a tool that was not available');
        const seen = new Set();
        cp.pendingCalls = result.tool_calls.map(call => {
          if (!call.id || !call.function?.name || seen.has(call.id)) throw Error('Gateway returned an invalid or duplicate tool-call ID'); seen.add(call.id);
          const completed = cp.completedCalls[call.id];
          if (completed && (completed.name !== call.function.name || completed.arguments !== call.function.arguments)) throw Error('Gateway reused a tool-call ID with different arguments');
          return { call: clone(call), state: 'queued' };
        });
        if (running.assistant) running.assistant.phase = 'commentary'; cp.state = 'tool'; await save(); continue;
      }
      if (result.finish_reason === 'length' || cp.taskState?.status === 'running') {
        cp.transcript.push({ role: 'user', content: result.finish_reason === 'length' ? CONTINUE : 'The recorded task is still running. Continue the remaining work using tools, then mark task_status complete when finished.' });
        cp.state = 'continuing'; await save(); continue;
      }
      if (result.finish_reason !== 'stop') throw Error('Gateway did not confirm completion: ' + (result.finish_reason || 'missing finish signal'));
      if (!result.content) throw Error('Gateway returned no final text');
      cp.state = 'completed'; meta.resumable = false; await save(); server.finish(running, 'completed', null); return;
    }
  } catch (error) {
    if (running.terminal) return;
    cp.state = signal.aborted ? 'interrupted' : 'failed'; meta.resumable = true;
    const retryable = error.retryable === true || error.retryable !== false && ![400, 401, 402, 403, 404, 422].includes(error.status) && /fetch|network|stream|connection|timeout|terminated|socket/i.test(errorText(error));
    meta.resumePolicy = signal.aborted ? running.interruptReason === 'pagehide' ? 'automatic' : 'manual' : retryable && (cp.networkFailures || 0) < (server.agentOptions.maxConsecutiveFailures ?? 6) ? 'automatic' : 'manual';
    if (retryable) cp.nextResumeAt = server.now() + Math.min(30000, (server.agentOptions.retryDelayMs ?? 500) * 2 ** Math.min(cp.networkFailures || 1, 5));
    meta.lastFailure = { code: error.code ?? null, status: error.status ?? null, retryable }; 
    try { await save(); } catch (saveError) { server.diagnostics.push({ type: 'checkpoint-error', message: errorText(saveError) }); }
    if (signal.aborted || error?.name === 'AbortError') server.finish(running, 'interrupted', null);
    else server.finish(running, 'failed', { message: errorText(error), codexErrorInfo: null, additionalDetails: null, misalignment: null });
  }
}
