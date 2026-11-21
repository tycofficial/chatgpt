function hasPythonCode(item) {
  return item?.type === 'mcpToolCall' && item.server === 'browser_workspace' && item.tool === 'python' &&
    typeof item.arguments?.code === 'string';
}

function textField(value) {
  return typeof value === 'string' ? value : '';
}

/** Format console lines at the native viewer after it materializes the MCP receipt. */
export function projectNativeCodexPythonResult(item, observed) {
  if (item?.type !== 'mcp-tool-call' || item.invocation?.server !== 'browser_workspace' || item.invocation.tool !== 'python') return item;
  const { structuredContent, content, ...result } = item.result ?? {};
  const receipt = structuredContent ?? result.raw?.structuredContent;
  const executed = receipt?.executionEnvironment === 'browser-pyodide';
  const output = executed ? receipt : observed;
  if (!output || !item.result) return item;
  const lines = [output.stdout, output.stderr, output.result].map(textField).filter(Boolean);
  const error = textField(executed ? output.error : result.error);
  if (error && !lines.some(line => line.includes(error))) lines.push(error);
  if (result.type === 'error') return lines.length ? { ...item, result: { ...result, error: lines.join('\n') } } : item;
  return { ...item, result: { ...result, content: [
    ...lines.map(text => ({ type: 'text', text })),
    ...(Array.isArray(content) ? content.filter(part => part?.type !== 'text') : []),
  ] } };
}

function executionException(result, output, item) {
  const trace = textField(output.error);
  if (output.executionEnvironment === 'browser-pyodide' && /^Traceback \(most recent call last\):/m.test(trace)) {
    const name = trace.trimEnd().split('\n').at(-1)?.match(/^[\w.]+(?=:|$)/)?.[0] ?? 'PythonError';
    // The native formatter joins traceback entries without a separator.
    const traceback = trace.match(/[^\n]*\n|[^\n]+$/g);
    return { in_kernel_exception: { name, traceback } };
  }
  const message = trace || textField(result?.content?.find(part => part.type === 'text')?.text) || textField(item.error?.message);
  return message ? { system_exception: { name: 'Error', traceback: [message] } } : {};
}

/** Translate actual Pyodide observations to the original Classic Python activity contract. */
export function projectNativePythonActivity(base, item, reasoningGroupId) {
  if (!hasPythonCode(item)) return null;
  const code = item.arguments.code;
  const running = item.status === 'inProgress';
  const result = item.result;
  const success = item.status === 'completed' && result != null && result.isError !== true;
  const cancelled = item.pythonCancelled === true;
  const output = running ? {} : result?.structuredContent ?? {};
  const readStream = name => typeof output[name] === 'string' ? output[name] : textField(item.livePythonOutput?.[name]);
  const stdout = readStream('stdout');
  const rawStderr = readStream('stderr');
  const trace = textField(output.error);
  const suffix = output.executionEnvironment === 'browser-pyodide' && trace ? `${trace}\n` : '';
  const stderr = suffix && rawStderr.endsWith(suffix) ? rawStderr.slice(0, -suffix.length) : rawStderr;
  const expression = textField(output.result);
  const status = running ? 'running' : success ? 'success' : cancelled ? 'cancelled' : 'failed';
  const streams = [];
  if (stdout) streams.push({ message_type: 'stream', stream_name: 'stdout', text: stdout });
  if (stderr) streams.push({ message_type: 'stream', stream_name: 'stderr', text: stderr });
  const fileLinks = (Array.isArray(output.files) ? output.files : []).filter(file =>
    typeof file?.name === 'string' && typeof file?.url === 'string').map(file => `[${file.name}](${file.url})`);
  const exception = !running && !success && !cancelled ? executionException(result, output, item) : {};
  const systemMessage = exception.system_exception?.traceback[0];
  const fallback = [stdout, rawStderr, expression, ...fileLinks, systemMessage && !rawStderr.includes(systemMessage) ? systemMessage : ''].filter(Boolean).join('\n');
  const aggregate = {
    code, status, messages: streams,
    ...(expression ? { final_expression_output: expression } : {}),
    ...exception,
  };
  const metadata = { ...base.metadata, reasoning_group_id: reasoningGroupId };
  return [{
    ...base, id: item.id + '-call', author: { role: 'assistant', name: null, metadata: {} },
    recipient: 'python', channel: 'commentary', status: running ? 'in_progress' : 'finished_successfully', end_turn: false,
    content: { content_type: 'code', language: 'python', text: code },
    metadata,
  }, {
    ...base, id: item.id + '-result', author: { role: 'tool', name: 'python', metadata: {} },
    recipient: 'all', channel: null, status: running ? 'in_progress' : success ? 'finished_successfully' : 'finished_partial_completion', end_turn: false,
    content: { content_type: 'execution_output', text: fallback },
    metadata: { ...metadata, aggregate_result: aggregate },
  }];
}
