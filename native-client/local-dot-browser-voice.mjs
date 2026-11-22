import { createLocalDotRecognition, hasLocalDotTranscription } from './local-dot-transcription.mjs?v=771721901c169502';

/** Browser speech input and output for a real, account-owned Dot conversation. */
const sameContext = (a, b) => a != null && b != null && a.threadId === b.threadId && a.accountId === b.accountId && a.userId === b.userId && a.profileId === b.profileId;
const sameLocator = (a, b) => a != null && b != null && a.conversationId === b.conversationId && a.hostId === b.hostId;

export function hasLocalDotBrowserVoice({
  Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition,
  synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
  secureContext = globalThis.isSecureContext,
  localTranscription = hasLocalDotTranscription(),
} = {}) {
  return secureContext === true && (localTranscription || typeof Recognition === 'function') && typeof Utterance === 'function' &&
    typeof synthesis?.speak === 'function' && typeof synthesis?.cancel === 'function';
}

export function createLocalDotBrowserVoice({
  adapter, Recognition,
  synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
  secureContext = globalThis.isSecureContext, browser = globalThis,
  language = () => globalThis.document?.documentElement.lang || globalThis.navigator?.language || 'zh-CN',
  startupTimeoutMs = 20000, responseTimeoutMs = 180000, now = Date.now,
} = {}) {
  const transcriber = Recognition === undefined && hasLocalDotTranscription(browser) ? createLocalDotRecognition(browser) : null;
  const Recorder = Recognition ?? transcriber?.Recognition ?? browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  let active = null;
  const available = () => hasLocalDotBrowserVoice({ Recognition: Recorder, synthesis, Utterance, secureContext, localTranscription: Boolean(transcriber) });
  const current = session => active === session && sameContext(session.context, adapter.browserVoiceContext(session.context.threadId));
  const publish = session => session.onChange({ phase: session.connectedAtMs == null ? 'starting' : 'active',
    connectedAtMs: session.connectedAtMs, microphoneMuted: session.microphoneMuted });
  function releaseRecorder(session) {
    const recorder = session.recorder;
    session.recorder = null;
    if (!recorder) return;
    recorder.onstart = recorder.onresult = recorder.onend = recorder.onerror = null;
    try { recorder.abort(); } catch { /* An ended recorder no longer owns the microphone. */ }
  }
  function finish(session, cause) {
    if (active !== session) return;
    active = null;
    clearTimeout(session.timer);
    browser.removeEventListener?.('pagehide', session.pagehide);
    session.controller.abort(new DOMException('Dot voice ended', 'AbortError'));
    releaseRecorder(session);
    transcriber?.dispose();
    if (session.utterance) {
      session.utterance.onend = session.utterance.onerror = null;
      try { synthesis.cancel(); } catch { /* The audio engine is unavailable after teardown. */ }
      session.utterance = null;
    }
    session.onChange(null);
    if (cause) session.onError(cause);
  }
  function playback(session, text) {
    if (!current(session)) { finish(session); return; }
    const utterance = new Utterance(text);
    const lang = /[\u3400-\u9fff]/u.test(text) ? 'zh-CN' : language();
    utterance.lang = lang;
    const voices = synthesis.getVoices?.() ?? [];
    const local = voices.filter(voice => voice.localService === true);
    const selected = local.find(voice => voice.lang.toLowerCase() === lang.toLowerCase()) ??
      local.find(voice => voice.lang.split('-')[0].toLowerCase() === lang.split('-')[0].toLowerCase());
    if (selected) utterance.voice = selected;
    session.utterance = utterance;
    session.timer = setTimeout(() => finish(session, new Error('浏览器未能完成语音播放。')), responseTimeoutMs);
    utterance.onend = () => {
      if (!current(session)) { finish(session); return; }
      if (session.utterance !== utterance) return;
      clearTimeout(session.timer);
      session.utterance = null;
      session.answering = false;
      listen(session);
    };
    utterance.onerror = () => finish(session, new Error('浏览器无法朗读 Dot 的回复。回复已保存在原对话中。'));
    synthesis.speak(utterance);
  }
  async function answer(session, text) {
    if (!current(session)) { finish(session); return; }
    session.answering = true;
    try {
      const signal = AbortSignal.any([session.controller.signal, AbortSignal.timeout(responseTimeoutMs)]);
      const reply = await adapter.submitBrowserVoice(session.context, text, { signal });
      if (signal.aborted || !current(session)) { finish(session); return; }
      playback(session, reply);
    } catch (cause) {
      if (current(session)) finish(session, cause?.name === 'TimeoutError'
        ? new Error('语音回复连接超时。请在 Dot 对话查看这条消息。') : cause);
      else finish(session);
    }
  }
  function listen(session) {
    if (!current(session)) { finish(session); return; }
    if (session.microphoneMuted || session.answering || session.recorder) return;
    clearTimeout(session.timer);
    try {
      const recorder = new Recorder();
      session.recorder = recorder;
      recorder.lang = language();
      recorder.interimResults = false;
      recorder.continuous = false;
      let transcript = '';
      let microphoneStarted = false;
      const recording = () => current(session) && session.recorder === recorder;
      recorder.onstart = () => {
        if (!recording()) { if (active === session && session.recorder === recorder) finish(session); return; }
        clearTimeout(session.timer);
        microphoneStarted = true;
        if (session.connectedAtMs == null) { session.connectedAtMs = now(); publish(session); }
      };
      recorder.onresult = event => {
        if (!recording()) return;
        transcript = Array.from(event.results).filter(result => result.isFinal).map(result => result[0]?.transcript ?? '').join(' ').trim();
      };
      recorder.onerror = event => {
        if (!recording() || event.error === 'no-speech') return;
        const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
        const message = denied ? '浏览器未允许 Dot 使用语音识别。' :
          event.error === 'audio-capture' ? '浏览器没有找到可用的麦克风。' :
          event.error === 'local-transcription-failed' ? '浏览器未能转录这段语音。' :
          '浏览器语音识别暂不可用（' + String(event.error ?? 'unknown').slice(0, 40) + '）。';
        finish(session, Object.assign(new Error(message), { permissionDenied: denied }));
      };
      recorder.onend = () => {
        if (!recording()) { if (active === session && session.recorder === recorder) finish(session); return; }
        session.recorder = null;
        clearTimeout(session.timer);
        if (transcript) void answer(session, transcript);
        else if (!microphoneStarted) finish(session, new Error('浏览器未能启动麦克风识别。'));
        else session.timer = setTimeout(() => listen(session), 300);
      };
      session.timer = setTimeout(() => finish(session, new Error('等待浏览器麦克风启动超时。')), startupTimeoutMs);
      // The first start stays in the original button's user-gesture call stack.
      recorder.start();
    } catch {
      finish(session, new Error('无法在当前浏览器启动麦克风识别。'));
    }
  }
  function start(context, { onChange = () => {}, onError = () => {} } = {}) {
    if (!available() || !context || !sameContext(context, adapter.browserVoiceContext(context.threadId))) return false;
    if (active) return false;
    const session = { context, onChange, onError, controller: new AbortController(), microphoneMuted: false,
      connectedAtMs: null, answering: false, recorder: null, utterance: null, timer: null };
    session.pagehide = () => finish(session);
    browser.addEventListener?.('pagehide', session.pagehide, { once: true });
    active = session;
    publish(session);
    listen(session);
    return active === session;
  }
  function control(context, action) {
    const session = active;
    if (!session || !sameContext(context, session.context)) return false;
    if (action.type === 'stop' || !current(session)) { finish(session); return true; }
    if (action.type !== 'set-microphone-muted' || typeof action.muted !== 'boolean') return false;
    if (session.microphoneMuted === action.muted) return true;
    session.microphoneMuted = action.muted;
    if (action.muted && !session.answering) { clearTimeout(session.timer); releaseRecorder(session); }
    else if (!action.muted) listen(session);
    publish(session);
    return true;
  }
  return { available, start, control };
}

/** Match the pinned lfLX control and room atoms without replacing its view components. */
export function createLocalDotVoiceWrappers({ adapter, requireOriginal, voice = createLocalDotBrowserVoice({ adapter }) }) {
  let binding;
  const bind = () => {
    if (binding) return binding;
    const graph = requireOriginal('Q840');
    const domain = requireOriginal('OWtl').a;
    const identity = requireOriginal('Cslg');
    const state = graph.u(domain, null), failure = graph.u(domain, null);
    function context(get, locator) {
      if (!locator?.conversationId) return null;
      const selected = adapter.browserVoiceContext(locator.conversationId);
      return selected && selected.accountId === get(identity.f) && selected.userId === get(identity.j) ? selected : null;
    }
    const snapshot = (get, locator) => {
      const current = get(state);
      return sameLocator(current?.locator, locator) && sameContext(current.context, context(get, locator)) ? current : null;
    };
    const failed = (get, locator) => sameLocator(get(failure)?.locator, locator) && sameContext(get(failure).context, context(get, locator));
    return binding = { graph, domain, state, failure, context, snapshot, failed };
  };
  const selector = fn => original => {
    const b = bind();
    return b.graph.d(b.domain, (locator, { get }) => b.context(get, locator) ? fn(b, get, locator) : get(original, locator));
  };
  return {
    b: selector((b, get) => voice.available() && get(b.state) == null),
    i: selector((b, get, locator) => b.snapshot(get, locator) != null),
    j: selector((b, get, locator) => b.snapshot(get, locator) != null || b.failed(get, locator)),
    l: original => {
      const b = bind();
      return b.graph.d(b.domain, (threadId, { get }) => b.context(get, { conversationId: threadId }) ? voice.available() : get(original, threadId));
    },
    m: selector((b, get, locator) => b.snapshot(get, locator)),
    o: selector((b, get, locator) => b.snapshot(get, locator)?.phase ?? 'inactive'),
    q: selector((b, get, locator) => b.failed(get, locator)),
    r: selector((b, get) => !voice.available() ? 'CAPABILITY_NOT_READY' : get(b.state) ? 'CALL_PRESENT' : undefined),
    k: original => scope => adapter.getLocalDotPolicy().isCapable ? 'UNSPECIFIED' : original(scope),
    d: original => async (scope, locator, action, claimId) => {
      const b = bind(), context = b.context(scope.get.bind(scope), locator);
      if (!context) return original(scope, locator, action, claimId);
      voice.control(context, action);
    },
    g: original => scope => {
      const b = bind();
      if (scope.get(b.failure)) scope.set(b.failure, null);
      else original(scope);
    },
    v: original => async (scope, locator, source, options) => {
      const b = bind(), get = scope.get.bind(scope), context = b.context(get, locator);
      if (!context || source != null) return original(scope, locator, source, options);
      if (!voice.available() || options?.isEligible?.(get) === false || get(b.state)) return;
      scope.set(b.failure, null);
      let unsubscribe;
      const stop = () => voice.control(context, { type: 'stop' });
      const started = voice.start(context, {
        onChange: state => {
          if (!state) { unsubscribe?.(); scope.set(b.state, null); return; }
          scope.set(b.state, { ...state, locator, context });
        },
        onError: cause => {
          if (!sameContext(context, b.context(get, locator))) return;
          if (cause.permissionDenied) scope.set(b.failure, { locator, context });
          scope.get(requireOriginal('SGsN').f)?.danger?.(cause.message);
        },
      });
      if (started && typeof scope.watch === 'function') unsubscribe = scope.watch(({ get }) => {
        if (!sameContext(context, b.context(get, locator)) || options?.isEligible?.(get) === false) stop();
      });
    },
  };
}

/** AXK1 handles voice-capable remote targets. A verified browser Dot owns its own local target. */
export function createLocalDotVoiceTargetWrapper({ adapter, requireOriginal, available = hasLocalDotBrowserVoice }) {
  return original => {
    const graph = requireOriginal('Q840'), domain = requireOriginal('OWtl').a, identity = requireOriginal('Cslg');
    return graph.d(domain, (target, { get }) => {
      const context = target?.threadId && adapter.browserVoiceContext(target.threadId);
      if (!context) return get(original, target);
      return available() && context.accountId === get(identity.f) && context.userId === get(identity.j);
    });
  };
}
