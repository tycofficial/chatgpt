import { randomUUID } from 'node:crypto';
import { isAbsolute as absolutePath } from 'node:path';
import { BridgeError } from './constants.mjs';

const permissionProfile = 'site-browser-codex';
const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;
const requestIdPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const modelPattern = /^[a-zA-Z0-9._-]{1,80}$/;
const efforts = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
const publicEvents = new Set([
  'thread/status/changed', 'thread/tokenUsage/updated', 'turn/started', 'turn/completed',
  'item/started', 'item/completed', 'item/agentMessage/delta', 'item/reasoning/summaryTextDelta',
  'item/reasoning/summaryPartAdded', 'item/commandExecution/outputDelta', 'error',
]);
const methodFields = new Map([
  ['model/list', []],
  ['thread/start', ['model']],
  ['thread/resume', ['threadId']],
  ['thread/read', ['threadId']],
  ['turn/start', ['threadId', 'input', 'model', 'effort']],
  ['turn/interrupt', ['threadId', 'turnId']],
]);
const admissionMethods = new Set(['thread/start', 'turn/start', 'turn/interrupt']);
const badRequest = () => new BridgeError('CODEX_INVALID_REQUEST', 'Invalid Codex browser request.', { status: 400 });
const expiredConnection = () => new BridgeError('CODEX_CONNECTION_CHANGED', 'The Codex host restarted. Reopen the saved thread to check its history before continuing.', { status: 409 });
const validId = id => typeof id === 'string' && idPattern.test(id);

function publicProjection(value) {
  if (Array.isArray(value)) return value.map(publicProjection);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !(value.type === 'reasoning' && (key === 'content' || key === 'encryptedContent')) && key !== 'additionalDetails')
    .map(([key, field]) => [key, publicProjection(field)]));
}

export function createCodexBrowserSession({ appServer, workspace }) {
  if (typeof workspace !== 'string' || !absolutePath(workspace)) throw new TypeError('An isolated absolute Codex workspace is required');
  const instanceId = randomUUID();
  const threads = new Set();
  const admissions = new Map();
  const events = [];
  let live = true, sequence = 0, eventBytes = 0;
  const unsubscribe = appServer.subscribe(event => {
    if (!publicEvents.has(event.method) || !threads.has(event.params?.threadId)) return;
    const message = publicProjection(event);
    const size = Buffer.byteLength(JSON.stringify(message));
    events.push({ seq: ++sequence, message, size });
    eventBytes += size;
    while (events.length > 1 && eventBytes > 8 * 1024 * 1024) eventBytes -= events.shift().size;
  });
  const stopListening = appServer.onDisconnect?.(() => { live = false; });
  const status = () => ({ protocolVersion: 1, instanceId, online: live });

  function checkInstance(value) {
    if (value !== instanceId) throw expiredConnection();
  }

  function scopedParams(method, params) {
    const fields = methodFields.get(method);
    if (!fields || !params || typeof params !== 'object' || Array.isArray(params) ||
        Object.keys(params).some(key => !fields.includes(key))) throw badRequest();
    const { threadId, turnId, model, effort, input } = params;
    if (fields.includes('threadId') && !validId(threadId) ||
        fields.includes('turnId') && !validId(turnId) ||
        model !== undefined && (typeof model !== 'string' || !modelPattern.test(model)) ||
        effort !== undefined && !efforts.has(effort)) throw badRequest();
    if (method === 'model/list') return { includeHidden: false, limit: 100 };
    const workspacePolicy = { cwd: workspace, runtimeWorkspaceRoots: [workspace], permissions: permissionProfile, approvalPolicy: 'never' };
    if (method === 'thread/start') return { ...workspacePolicy, ...(model ? { model } : {}) };
    if (method === 'thread/resume') return { ...workspacePolicy, threadId, excludeTurns: false };
    if (!threads.has(threadId)) throw new BridgeError('CODEX_THREAD_NOT_OPEN', 'Reopen this Codex thread before continuing.', { status: 404 });
    if (method === 'thread/read') return { threadId, includeTurns: true };
    if (method === 'turn/interrupt') return { threadId, turnId };
    if (!Array.isArray(input) || input.length !== 1 || input[0]?.type !== 'text' ||
        typeof input[0]?.text !== 'string' || !input[0].text.trim() || input[0].text.length > 24_000) throw badRequest();
    return {
      threadId, input: [{ type: 'text', text: input[0].text, textElements: [] }],
      ...workspacePolicy,
      ...(model ? { model } : {}), ...(effort ? { effort } : {}),
    };
  }

  async function invoke(method, params) {
    if (!live) throw new BridgeError('CODEX_HOST_OFFLINE', 'The saved Codex connection is offline.', { status: 503 });
    let result;
    try { result = await appServer.request(method, params); }
    catch (cause) {
      if (!Number.isInteger(cause.rpcCode)) {
        throw new BridgeError('CODEX_OUTCOME_UNKNOWN', 'Codex did not confirm this request. Check the saved thread before continuing.', { status: 503 });
      }
      throw new BridgeError('CODEX_RPC_REJECTED', 'Codex rejected this request. Check the configured model or reopen its thread.', { status: 422 });
    }
    if (method === 'thread/start' || method === 'thread/resume') {
      const threadId = result?.thread?.id;
      if (!validId(threadId) || method === 'thread/resume' && threadId !== params.threadId) throw new BridgeError('CODEX_INVALID_REPLY', 'Codex did not return the expected thread.', { status: 502 });
      if (result.activePermissionProfile?.id !== permissionProfile || result.approvalPolicy !== 'never' ||
          result.runtimeWorkspaceRoots?.length !== 1 || result.runtimeWorkspaceRoots[0] !== workspace) {
        throw new BridgeError('CODEX_SANDBOX_UNCONFIRMED', 'Codex did not confirm the configured restricted workspace.', { status: 502 });
      }
      threads.add(threadId);
    }
    return publicProjection(result);
  }

  function request(envelope) {
    checkInstance(envelope?.instanceId);
    const { method, params = {}, requestId } = envelope;
    const scoped = scopedParams(method, params);
    if (!admissionMethods.has(method)) return invoke(method, scoped);
    if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) throw badRequest();
    const fingerprint = JSON.stringify([method, scoped]);
    const saved = admissions.get(requestId.toLowerCase());
    if (saved) {
      if (saved.fingerprint !== fingerprint) throw new BridgeError('CODEX_REQUEST_ID_CONFLICT', 'This request ID belongs to a different Codex operation.', { status: 409 });
      return saved.operation;
    }
    if (admissions.size >= 1000) throw new BridgeError('CODEX_RECEIPTS_FULL', 'The current Codex host session has reached its request limit.', { status: 429 });
    // Admit synchronously before forwarding to stdio. Disconnecting an HTTP reader never removes a receipt.
    const savedRequest = { fingerprint, admittedAt: Date.now(), state: 'pending' };
    admissions.set(requestId.toLowerCase(), savedRequest);
    savedRequest.operation = Promise.resolve().then(() => invoke(method, scoped)).then(result => {
      Object.assign(savedRequest, { state: 'acknowledged', result });
      return result;
    }, error => {
      Object.assign(savedRequest, { state: error.code === 'CODEX_OUTCOME_UNKNOWN' ? 'unknown' : 'rejected', error: { code: error.code, message: error.message } });
      throw error;
    });
    return savedRequest.operation;
  }

  function readReceipt({ instanceId: expected, requestId }) {
    checkInstance(expected);
    if (typeof requestId !== 'string' || !requestIdPattern.test(requestId)) throw badRequest();
    const receipt = admissions.get(requestId.toLowerCase());
    if (!receipt) throw new BridgeError('CODEX_RECEIPT_NOT_FOUND', 'Codex has no receipt for this request.', { status: 404 });
    const { admittedAt, state, result, error } = receipt;
    return { requestId, admittedAt, state, result, error };
  }

  function readEvents({ instanceId: expected, threadId, after }) {
    checkInstance(expected);
    if (!validId(threadId) || !Number.isSafeInteger(after) || after < 0 || after > sequence) throw badRequest();
    if (!threads.has(threadId)) throw new BridgeError('CODEX_THREAD_NOT_OPEN', 'Reopen this Codex thread before continuing.', { status: 404 });
    if (events.length && after < events[0].seq - 1) {
      throw new BridgeError('CODEX_EVENTS_EXPIRED', 'Earlier live events expired. Reopen the saved thread to read its history.', { status: 410 });
    }
    const page = events.filter(event => event.seq > after && event.message.params.threadId === threadId).slice(0, 64);
    return { events: page.map(({ seq, message }) => ({ seq, message })), next: page.length === 64 ? page.at(-1).seq : sequence, online: live };
  }

  async function close() {
    live = false;
    unsubscribe();
    stopListening?.();
    await appServer.close();
  }
  return { status, request, readReceipt, readEvents, close };
}
