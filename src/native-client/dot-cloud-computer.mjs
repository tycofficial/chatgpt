const idPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const basePath = '/dot-computer/v1/';
const states = new Set(['unconfigured', 'stopped', 'starting', 'ready', 'failed']);
const unavailable = { environmentId: null, status: 'unconfigured' };
const buttons = [null, 'left', 'middle', 'right'];
const maxFrameBytes = 4 * 1024 * 1024;
const maxCodeLength = 4000;
const linuxDesktop = 'linux-desktop';
const desktopWidth = 1024;
const desktopHeight = 720;
const cloudToolName = 'run_dot_cloud_python';
const cloudTool = { type: 'function', function: {
  name: cloudToolName,
  description: 'Run short Python 3 source inside the isolated remote Linux desktop for this Dot conversation. Use print() for output. The result includes actual stdout, stderr and process exit status. Browser and user-device files are outside the remote workspace.',
  parameters: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'], additionalProperties: false },
} };

function failure(message, status = 503, code = 'LOCAL_DOT_COMPUTER_REQUEST_FAILED') {
  return Object.assign(new Error(message), { status, code });
}

export function isDotCloudEnvironmentId(value) {
  return typeof value === 'string' && idPattern.test(value);
}

export function isSiteDotComputerRequest(path, method) {
  if (!path.startsWith(basePath)) return false;
  const [resource, id, action, ...rest] = path.slice(basePath.length).split('/');
  if (!idPattern.test(id) || rest.length) return false;
  if (resource === 'threads') return action === undefined && method === 'GET' || action === 'wake' && method === 'POST';
  return resource === 'environments' && (action === 'frame' && method === 'GET' || ['input', 'task'].includes(action) && method === 'POST' ||
    action === undefined && method === 'DELETE');
}

function waitForTask(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1200);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function createSiteDotComputer({ baseURL, getSessionToken, fetchImpl = (...args) => globalThis.fetch(...args) }) {
  const base = new URL(baseURL);
  if (base.protocol !== 'https:' || base.href !== base.origin + '/') throw TypeError('Expected the HTTPS site service origin');

  async function request(resource, id, action, method, { signal, assertCurrent, input } = {}) {
    const path = basePath + resource + '/' + id + (action ? '/' + action : '');
    if (!isSiteDotComputerRequest(path, method)) throw failure('无效的 Dot 云电脑会话。', 404, 'LOCAL_DOT_COMPUTER_NOT_FOUND');
    const deadline = AbortSignal.timeout(['wake', 'task'].includes(action) ? 60_000 : 8_000);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    requestSignal.throwIfAborted();
    assertCurrent?.();
    const token = await getSessionToken();
    requestSignal.throwIfAborted();
    assertCurrent?.();
    if (!token) throw failure('请联网验证本站账户后使用 Dot 云电脑。', 401, 'LOCAL_DOT_COMPUTER_SIGN_IN');
    const response = await fetchImpl(new URL(path, base), {
      method, signal: requestSignal, credentials: 'omit', redirect: 'error', cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token, ...(input && { 'Content-Type': 'application/json' }) },
      ...(input && { body: JSON.stringify(input) }),
    });
    try { assertCurrent?.(); } catch (error) { void response.body?.cancel().catch(() => {}); throw error; }
    return response;
  }

  async function assertResponse(response) {
    if (response.ok) return;
    const error = await response.json().catch(() => null);
    const details = error?.error ?? error;
    throw failure(typeof details?.message === 'string' ? details.message.slice(0, 400) : 'Dot 云电脑暂时不可用。',
      response.status, typeof details?.code === 'string' ? details.code : undefined);
  }

  async function readStatus(threadId, action, options) {
    if (!idPattern.test(threadId) && !action) return unavailable;
    const response = await request('threads', threadId, action, action ? 'POST' : 'GET', options);
    if ([404, 501].includes(response.status)) {
      void response.body?.cancel().catch(() => {});
      return unavailable;
    }
    await assertResponse(response);
    const status = await response.json().catch(() => null);
    options?.assertCurrent?.();
    if (!states.has(status?.status) || (status.environmentId !== null && !idPattern.test(status.environmentId)) ||
        status.status === 'ready' && (!status.environmentId || status.kind !== linuxDesktop ||
          status.width !== desktopWidth || status.height !== desktopHeight)) {
      throw failure('Dot 云电脑返回了无效的会话状态。', 502);
    }
    return status;
  }

  return {
    status: (threadId, options) => readStatus(threadId, null, options),
    wake: (threadId, options) => readStatus(threadId, 'wake', options),
    async stop(environmentId, options) {
      const response = await request('environments', environmentId, null, 'DELETE', options);
      await assertResponse(response);
      void response.body?.cancel().catch(() => {});
    },
    async frame(environmentId, options) {
      const response = await request('environments', environmentId, 'frame', 'GET', options);
      await assertResponse(response);
      if (!/^image\/png(?:;|$)/i.test(response.headers.get('Content-Type') ?? '') ||
          Number(response.headers.get('Content-Length')) > maxFrameBytes) {
        void response.body?.cancel().catch(() => {});
        throw failure('Dot 云电脑返回了无效的画面。', 502);
      }
      const image = await response.blob();
      options?.assertCurrent?.();
      if (!image.size || image.size > maxFrameBytes) throw failure('Dot 云电脑返回了无效的画面。', 502);
      return image;
    },
    async input(environmentId, input, options) {
      const response = await request('environments', environmentId, 'input', 'POST', { ...options, input });
      await assertResponse(response);
      void response.body?.cancel().catch(() => {});
    },
    async task(environmentId, input, { signal, ...options } = {}) {
      if (!idPattern.test(input?.requestId) || !validCloudCode(input?.code)) {
        throw failure('请提交不超过 4000 字符的有效 Python 源码。', 400, 'LOCAL_DOT_COMPUTER_INVALID_CODE');
      }
      const deadline = AbortSignal.timeout(95_000);
      const active = signal ? AbortSignal.any([signal, deadline]) : deadline;
      for (;;) {
        try {
          const response = await request('environments', environmentId, 'task', 'POST', { ...options, signal: active, input });
          await assertResponse(response);
          const result = await response.json().catch(() => null);
          options.assertCurrent?.();
          if (response.status === 202 && result?.status === 'running') {
            await waitForTask(active);
            continue;
          }
          if (!['complete', 'failed'].includes(result?.status) || typeof result.stdout !== 'string' || typeof result.stderr !== 'string' ||
              !(result.exitCode === null || Number.isInteger(result.exitCode)) || result.status === 'complete' && result.exitCode !== 0) {
            throw failure('Dot 云电脑没有返回有效的任务结果。', 502);
          }
          return { status: result.status, stdout: result.stdout.slice(0, 32768), stderr: result.stderr.slice(0, 32768), exitCode: result.exitCode };
        } catch (error) {
          active.throwIfAborted();
          if (error?.name !== 'TypeError' && error?.name !== 'TimeoutError') throw error;
          await waitForTask(active);
        }
      }
    },
  };
}

function validCloudCode(code) {
  return typeof code === 'string' && code.length <= maxCodeLength && code.trim().length > 0 && !code.includes('\0');
}

export function wantsDotCloudTask(turn) {
  const input = turn?.items?.find(item => item.type === 'userMessage')?.content?.find(part => part.type === 'text')?.text;
  if (typeof input !== 'string') return false;
  if (/^\s*\/cloud\s+\S/u.test(input)) return true;
  if (/^\s*(?:怎么|如何|请解释|(?:how (?:do|does|can|to)|what is|explain)\b)/iu.test(input)) return false;
  return /云(?:端)?电脑|雲(?:端)?電腦|远程桌面|遠端桌面|远端桌面|\b(?:cloud (?:computer|desktop)|dot(?:['’]s)? (?:computer|desktop))\b|\bdot\s*(?:的\s*)?(?:电脑|電腦)/iu.test(input) &&
    /(?:执行|執行|运行|運行|计算|計算|帮我算|跑|操作|测试|測試)|\b(?:run|execute|compute|calculate|test)\b/iu.test(input);
}

async function cloudTaskRequestId(threadId, turnId, callId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['dot-cloud-task', threadId, turnId, callId])));
  const bytes = new Uint8Array(digest, 0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export function createDotCloudTaskExecutor(baseExecutor, { computer, threadId, turnId, environmentId, assertCurrent }) {
  async function run(call, context) {
    if (context.threadId !== threadId || context.turnId !== turnId || typeof call.id !== 'string' || !call.id || call.id.length > 256) {
      throw failure('此 Dot 云电脑任务不属于当前对话。', 403, 'LOCAL_DOT_COMPUTER_NOT_OWNED');
    }
    assertCurrent();
    let input;
    try { input = JSON.parse(call.function.arguments ?? '{}'); } catch {}
    if (!input || !validCloudCode(input.code) || Object.keys(input).length !== 1) {
      throw failure('请提交不超过 4000 字符的有效 Python 源码。', 400, 'LOCAL_DOT_COMPUTER_INVALID_CODE');
    }
    const requestId = await cloudTaskRequestId(threadId, turnId, call.id);
    const result = await computer.task(environmentId, { requestId, code: input.code }, { assertCurrent, signal: context.signal });
    return { isError: result.status === 'failed', content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  }
  return {
    ...baseExecutor,
    tools: [cloudTool],
    systemInstruction: 'Use the remote Linux desktop Python tool for the explicit task the user requested. Submit Python 3 source, print useful results, and report the recorded stdout, stderr and exit status. Keep work within the provisioned workspace and describe actual failures or unsupported requests. The browser and user-device files are separate from this environment.',
    execute: (call, context) => call.function.name === cloudToolName ? run(call, context) : undefined,
    recoverCall: (call, context) => call.function.name === cloudToolName ? run(call, context) : baseExecutor?.recoverCall?.(call, context),
    serverForTool: name => name === cloudToolName ? 'dot_cloud_computer' : baseExecutor?.serverForTool?.(name),
  };
}

export function describeNativeDotComputer(workerStatus) {
  const state = workerStatus?.status;
  const status = state === 'stopped' ? 'offline' : ['ready', 'starting', 'failed'].includes(state) ? state : 'unknown';
  return { environmentId: status === 'unknown' ? null : workerStatus.environmentId, status,
    capabilities: ['ready', 'starting', 'failed'].includes(status) ? [{ type: 'remote_desktop', status }] : [] };
}

export function decodeNativeDotComputerInput(data, width, height) {
  if (typeof data === 'string') {
    if (data.length > 24_000) return null;
    let value;
    try { value = JSON.parse(data); } catch { return null; }
    return value?.event === 'control/clipboard' && typeof value.text === 'string' && !value.text.includes('\0') &&
      new TextEncoder().encode(value.text).length <= 8192 ? { type: 'text', text: value.text } : null;
  }
  if (!(data instanceof ArrayBuffer) || ![7, 11].includes(data.byteLength)) return null;
  const bytes = new DataView(data);
  const kind = bytes.getUint8(0);
  if (bytes.byteLength === 7 && bytes.getUint16(1, true) === 4) {
    if (kind === 1) return { type: 'move', x: Math.min(width - 1, bytes.getUint16(3, true)),
      y: Math.min(height - 1, bytes.getUint16(5, true)) };
    if (kind === 2) return { type: 'wheel', dx: Math.max(-10, Math.min(10, bytes.getInt16(3, true))),
      dy: Math.max(-10, Math.min(10, bytes.getInt16(5, true))) };
  }
  if (bytes.byteLength === 11 && bytes.getUint16(1, true) === 8 && (kind === 3 || kind === 4)) {
    const value = bytes.getBigUint64(3, true);
    if (value < 1n || value > 0x1fffffffn) return null;
    const key = Number(value), down = kind === 3;
    return buttons[key] ? { type: 'button', button: buttons[key], down } : { type: 'key', key, down };
  }
  return null;
}

function waitForIce(peer, signal) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    function finish(error) {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', ready);
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    }
    function ready() { if (peer.iceGatheringState === 'complete') finish(); }
    function abort() { finish(signal.reason); }
    const timer = setTimeout(() => finish(failure('Dot 云电脑画面连接超时。', 504)), 5_000);
    peer.addEventListener('icegatheringstatechange', ready);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

async function drawFrame(canvas, context, image) {
  if (typeof globalThis.createImageBitmap === 'function') {
    const pixels = await createImageBitmap(image);
    try { context.drawImage(pixels, 0, 0, canvas.width, canvas.height); }
    finally { pixels.close(); }
    return;
  }
  const url = URL.createObjectURL(image);
  try {
    const pixels = new Image();
    pixels.src = url;
    await pixels.decode();
    context.drawImage(pixels, 0, 0, canvas.width, canvas.height);
  } finally { URL.revokeObjectURL(url); }
}

/** The original observer receives real site-provider pixels and sends only typed input. */
export async function connectSiteDotComputer(offer, { computer, threadId, assertCurrent, signal }) {
  signal?.throwIfAborted();
  assertCurrent?.();
  if (typeof offer !== 'string' || offer.length > 65536) throw failure('Dot 云电脑协商请求无效。', 400);
  const { status, environmentId, width, height } = await computer.status(threadId, { assertCurrent, signal });
  signal?.throwIfAborted();
  if (status !== 'ready') throw failure('Dot 云电脑还未就绪。', 409, 'LOCAL_DOT_COMPUTER_NOT_READY');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || typeof canvas.captureStream !== 'function' || typeof RTCPeerConnection !== 'function') {
    throw failure('当前浏览器无法播放 Dot 云电脑画面。', 501);
  }

  const controller = new AbortController();
  const options = { assertCurrent, signal: controller.signal };
  const peer = new RTCPeerConnection();
  const stream = canvas.captureStream(6);
  const track = stream.getVideoTracks()[0];
  const sessionId = crypto.randomUUID();
  const queue = [];
  const held = new Map();
  let pointer = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  let timer, channel, ownsControl = false, draining = false, failedFrames = 0;

  const pointerInput = input => ['move', 'button', 'wheel'].includes(input.type) ? { ...input, ...pointer } : input;

  async function releaseHeld(releaseSignal) {
    const inputs = [...held.values()];
    held.clear();
    for (const input of inputs) {
      try { await computer.input(environmentId, pointerInput({ ...input, down: false }), { assertCurrent, signal: releaseSignal }); }
      catch { break; }
    }
  }
  function close() {
    if (controller.signal.aborted) return;
    controller.abort(new DOMException('Dot computer connection closed', 'AbortError'));
    signal?.removeEventListener('abort', close);
    clearTimeout(timer);
    queue.length = 0;
    channel?.close();
    track?.stop();
    peer.close();
    void releaseHeld(AbortSignal.timeout(2000));
  }
  signal?.addEventListener('abort', close, { once: true });
  peer.addEventListener('connectionstatechange', () => {
    if (['failed', 'closed'].includes(peer.connectionState)) close();
  });

  async function paint() {
    const image = await computer.frame(environmentId, options);
    controller.signal.throwIfAborted();
    await drawFrame(canvas, context, image);
  }
  async function nextFrame() {
    try { await paint(); failedFrames = 0; }
    catch (error) {
      if (controller.signal.aborted) return;
      if (++failedFrames >= 5 || [401, 403, 404, 409, 410].includes(error.status)) close();
    }
    if (!controller.signal.aborted) timer = setTimeout(nextFrame, failedFrames ? 500 * failedFrames : 200);
  }

  const send = message => {
    if (channel?.readyState === 'open') channel.send(JSON.stringify(message));
  };
  async function drainInput() {
    if (draining) return;
    draining = true;
    try {
      while (queue.length && !controller.signal.aborted) {
        const item = queue.shift();
        if (item.control === 'request') {
          const latest = await computer.status(threadId, options);
          if (latest.status !== 'ready' || latest.environmentId !== environmentId) { close(); return; }
          ownsControl = true;
          send({ event: 'control/locked', id: sessionId, request_id: item.requestId });
        } else if (item.control === 'release') {
          ownsControl = false;
          await releaseHeld(controller.signal);
          send({ event: 'control/release', id: sessionId });
        } else if (ownsControl) {
          if (item.type === 'move') pointer = { x: item.x, y: item.y };
          const key = item.type === 'button' ? 'button:' + item.button : item.type === 'key' ? 'key:' + item.key : null;
          if (key && item.down) held.set(key, item);
          await computer.input(environmentId, pointerInput(item), options);
          if (key && !item.down) held.delete(key);
        }
      }
    } catch { close(); }
    finally { draining = false; }
  }

  peer.addEventListener('datachannel', event => {
    if (channel) { event.channel.close(); return; }
    channel = event.channel;
    channel.binaryType = 'arraybuffer';
    channel.addEventListener('open', () => send({ event: 'system/init', session_id: sessionId, control_host: { has_host: false } }));
    channel.addEventListener('close', close);
    channel.addEventListener('message', ({ data }) => {
      if (controller.signal.aborted) return;
      let action = decodeNativeDotComputerInput(data, width, height);
      if (!action && typeof data === 'string' && data.length <= 512) {
        let message;
        try { message = JSON.parse(data); } catch { return; }
        if (message?.event === 'control/request' && idPattern.test(message.request_id)) action = { control: 'request', requestId: message.request_id };
        if (message?.event === 'control/release') action = { control: 'release' };
      }
      if (!action) return;
      if (action.type === 'move' && queue.at(-1)?.type === 'move') queue[queue.length - 1] = action;
      else if (queue.length >= 96) { close(); return; }
      else queue.push(action);
      void drainInput();
    });
  });

  try {
    await paint();
    await peer.setRemoteDescription({ type: 'offer', sdp: offer });
    const video = peer.getTransceivers().find(transceiver => transceiver.receiver.track.kind === 'video');
    if (!video || !track) throw failure('Dot 云电脑请求缺少画面通道。', 400);
    video.direction = 'sendonly';
    video.sender.setStreams(stream);
    await video.sender.replaceTrack(track);
    await peer.setLocalDescription(await peer.createAnswer());
    await waitForIce(peer, controller.signal);
    timer = setTimeout(nextFrame, 50);
    return new Response(peer.localDescription.sdp, { headers: { 'Content-Type': 'application/sdp' } });
  } catch (error) { close(); throw error; }
}

/** Keep the shared native viewer intact and only change an owned Dot's signaling function. */
export function wrapNativeDotComputerViewer(NativeViewer, { React, resolveContext, connect = connectSiteDotComputer }) {
  return function SiteDotComputerViewer(props) {
    const { createConnection, connectionKey } = props;
    const prepare = React.useCallback((...args) => {
      const connection = createConnection(...args);
      if (connection?.product !== 'orbit') return connection;
      const context = resolveContext(connectionKey);
      if (!context) return connection;
      return { ...connection, connect: (offer, signal) => connect(offer, { ...context, signal }) };
    }, [createConnection, connectionKey]);
    return React.createElement(NativeViewer, { ...props, createConnection: prepare });
  };
}
