/** A real Web Speech host service for the existing BJ43 playback controller.
 * No encoded audio, synthetic URL, ChatGPT voice identity or backend is invented.
 */
const object = value => value !== null && typeof value === 'object';
const ownerOf = value => object(value) && typeof value.accountId === 'string' && value.accountId.trim()
  && typeof value.userId === 'string' && value.userId.trim() && (value.accountUserId == null || typeof value.accountUserId === 'string')
  ? JSON.stringify([value.accountId, value.userId, value.accountUserId ?? null]) : null;
const fail = (code, message) => Object.assign(Error(message), { code: 'LOCAL_READ_ALOUD_' + code });
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);
const AUDIO_SOURCE = 'CHATGPT_VOICE_READ_ALOUD_AUDIO_SOURCE_SYNTHESIZED';

/** Authority is the verified account's actual in-memory app-server map. */
export function createLocalReadAloudSource({ getIdentity, getThread, maxCharacters = 200000 } = {}) {
  if (typeof getIdentity !== 'function' || typeof getThread !== 'function' || !Number.isSafeInteger(maxCharacters) || maxCharacters < 1 || maxCharacters > 1000000) throw TypeError('A verified identity, owned thread reader and bounded text limit are required.');
  const bootOwner = ownerOf(getIdentity()), issued = new WeakMap();
  function guardOwner() {
    if (!bootOwner) throw fail('AUTH_REQUIRED', 'Sign in before reading a response aloud.');
    if (ownerOf(getIdentity()) !== bootOwner) throw fail('ACCOUNT_CHANGED', 'The read-aloud account changed.');
  }
  function capture(spec) {
    guardOwner();
    if (!validId(spec?.conversationId) || !validId(spec?.messageId)) throw fail('INVALID_CONTEXT', 'An actual conversation and assistant message are required.');
    const thread = getThread(spec.conversationId);
    if (thread == null) return null; // Another native audio source keeps its original controller.
    if (!object(thread) || thread.id !== spec.conversationId || !Array.isArray(thread.turns)) throw fail('SOURCE_UNAVAILABLE', 'The response is unavailable for read aloud.');
    const found = [];
    for (const turn of thread.turns) for (const item of turn.items ?? []) if (item.id === spec.messageId) found.push({ turn, item });
    if (found.length !== 1) throw fail('SOURCE_UNAVAILABLE', 'The unique original response is unavailable for read aloud.');
    const { turn, item } = found[0];
    if (!['completed', 'failed', 'interrupted'].includes(turn.status) || item.type !== 'agentMessage' || ![undefined, null, 'final_answer'].includes(item.phase)
      || typeof item.text !== 'string' || !item.text.trim()) throw fail('SOURCE_UNAVAILABLE', 'Only an existing final assistant response can be read aloud.');
    if (item.text.length > maxCharacters) throw fail('TEXT_TOO_LARGE', 'This response exceeds the browser read-aloud text limit.');
    guardOwner();
    return { ownerKey: bootOwner, conversationId: thread.id, messageId: item.id, turnId: turn.id, text: item.text, phase: item.phase ?? null, turnStatus: turn.status };
  }
  return {
    resolve(spec) {
      const saved = capture(spec); if (!saved) return null;
      const proof = Object.freeze({ ownerKey: saved.ownerKey, conversationId: saved.conversationId, messageId: saved.messageId, turnId: saved.turnId, text: saved.text });
      issued.set(proof, saved); return proof;
    },
    isCurrent(proof) {
      const saved = issued.get(proof); if (!saved) return false;
      try { const next = capture(saved); return next != null && Object.keys(saved).every(key => next[key] === saved[key]); } catch { return false; }
    },
  };
}

export function createBrowserReadAloudController({
  resolveSource, isSourceCurrent, getIdentity, getScopeKey = scope => scope,
  speechSynthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
  getLanguage = () => globalThis.navigator?.language ?? '', reportError = () => {}, onDiagnostic = () => {},
  eventTarget = globalThis.window, startupTimeoutMs = 10000, chunkCodepoints = 2048,
} = {}) {
  if (![resolveSource, isSourceCurrent, getIdentity, getScopeKey, getLanguage, reportError, onDiagnostic].every(value => typeof value === 'function')
    || !Number.isFinite(startupTimeoutMs) || startupTimeoutMs < 1 || startupTimeoutMs > 15000
    || !Number.isSafeInteger(chunkCodepoints) || chunkCodepoints < 1 || chunkCodepoints > 4096) throw TypeError('Real speech/source services and bounded speech limits are required.');
  const bootOwner = ownerOf(getIdentity()), listeners = new Set(); let active = null, disposed = false, serial = 0;
  const available = () => !disposed && bootOwner !== null && typeof Utterance === 'function' && speechSynthesis != null && ['speak', 'cancel', 'pause', 'resume'].every(key => typeof speechSynthesis[key] === 'function');
  const diagnostic = code => { try { onDiagnostic({ type: 'local-read-aloud', code }); } catch {} };
  const callback = (fn, ...args) => { try { fn?.(...args); } catch { diagnostic('CALLBACK_FAILED'); } };
  function state(record, status, paused = false) {
    const changed = record.nativeStatus !== status;
    record.nativeStatus = status; record.paused = paused;
    const snapshot = Object.freeze({ playbackId: record.options.playbackId, conversationId: record.proof.conversationId, messageId: record.proof.messageId, status, paused });
    for (const listener of listeners) {
      if (status !== 'idle' && active !== record || status === 'idle' && active?.scopeKey === record.scopeKey && active.serial > record.serial) break;
      callback(listener, { scope: record.scope, snapshot });
    }
    if (changed && (status === 'idle' || active === record)) callback(record.options.onStatusChange, status);
  }
  function valid(record) { try { return !disposed && active === record && ownerOf(getIdentity()) === bootOwner && isSourceCurrent(record.proof) === true; } catch { return false; } }
  function clear(record, error = null) {
    if (!record || active !== record) return;
    active = null; clearTimeout(record.timer); record.timer = null;
    const utterance = record.utterance;
    if (utterance) for (const name of ['onstart', 'onend', 'onerror', 'onpause', 'onresume', 'onboundary']) utterance[name] = null;
    try { speechSynthesis.cancel(); } catch { diagnostic('CANCEL_FAILED'); }
    state(record, 'idle');
    if (error) {
      diagnostic(error.code ?? 'SPEECH_FAILED');
      callback(reportError, record.scope, record.options.errorMessage, error);
      callback(record.options.onError, error, record.started ? 'play' : 'request');
    }
  }
  function guard(record) {
    if (valid(record)) return true;
    if (active === record) clear(record, fail('SOURCE_CHANGED', 'The original response or its account changed during read aloud.'));
    return false;
  }
  function localVoice(language) {
    if (typeof speechSynthesis.getVoices !== 'function') return null;
    try {
      const voices = speechSynthesis.getVoices();
      if (!Array.isArray(voices)) return null;
      const local = voices.filter(voice => voice != null && voice.localService === true);
      const locale = value => typeof value === 'string' ? value.trim().replaceAll('_', '-').toLowerCase() : '';
      const target = locale(language), primary = target.split('-')[0];
      return (target ? local.find(voice => locale(voice.lang) === target) : null)
        ?? (primary ? local.find(voice => locale(voice.lang).split('-')[0] === primary) : null)
        ?? local.find(voice => voice.default === true) ?? local[0] ?? null;
    } catch { diagnostic('LOCAL_VOICES_UNAVAILABLE'); return null; }
  }
  function speakChunk(record) {
    if (!guard(record)) return;
    let utterance;
    try { utterance = new Utterance(record.chunks[record.index]); } catch { clear(record, fail('ENGINE_FAILED', 'The browser could not create a speech utterance.')); return; }
    record.utterance = utterance;
    let language; try { language = getLanguage(); } catch { diagnostic('LANGUAGE_UNAVAILABLE'); }
    if (typeof language === 'string' && /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(language)) utterance.lang = language;
    const voice = localVoice(language);
    if (voice) { try { utterance.voice = voice; } catch { diagnostic('LOCAL_VOICE_UNAVAILABLE'); } }
    utterance.onstart = () => { if (!guard(record) || record.utterance !== utterance) return; clearTimeout(record.timer); record.timer = null; record.started = true; state(record, 'playing'); };
    utterance.onpause = () => { if (guard(record) && record.utterance === utterance) state(record, record.nativeStatus, true); };
    utterance.onresume = () => { if (guard(record) && record.utterance === utterance) state(record, 'playing', false); };
    utterance.onboundary = () => { guard(record); };
    utterance.onerror = event => {
      if (active !== record || record.utterance !== utterance) return;
      const code = typeof event?.error === 'string' && /^[a-z-]{1,64}$/.test(event.error) ? event.error : 'unknown';
      clear(record, fail('ENGINE_FAILED', 'The browser speech engine failed (' + code + ').'));
    };
    utterance.onend = () => {
      if (!guard(record) || record.utterance !== utterance) return;
      clearTimeout(record.timer); record.timer = null;
      if (++record.index < record.chunks.length) speakChunk(record); else clear(record);
    };
    record.timer = setTimeout(() => { if (active === record && record.utterance === utterance) clear(record, fail('START_TIMEOUT', 'The browser speech engine did not start playback.')); }, startupTimeoutMs);
    try { speechSynthesis.speak(utterance); } catch { clear(record, fail('ENGINE_FAILED', 'The browser could not start read aloud.')); }
  }
  function play(scope, options, { beforeStart = () => {} } = {}) {
    if (!available() || !object(options) || options.readAloud?.audioSource !== AUDIO_SOURCE || !validId(options.readAloud?.messageId)
      || !validId(options.conversationId) || options.readAloud.conversationId !== options.conversationId || typeof options.playbackId !== 'string' || !options.playbackId || options.playbackId.length > 1024) return false;
    let proof, key;
    try { proof = resolveSource({ conversationId: options.conversationId, messageId: options.readAloud.messageId }); if (!proof) return false; key = getScopeKey(scope); if (!object(key) && typeof key !== 'function') throw fail('INVALID_SCOPE', 'The original playback scope is unavailable.'); }
    catch (error) { callback(reportError, scope, options.errorMessage, error); callback(options.onError, error, 'request'); return true; }
    if (active?.scopeKey === key && active.options.playbackId === options.playbackId) { clear(active); return true; }
    if (active) clear(active);
    try { beforeStart(); } catch (error) { callback(reportError, scope, options.errorMessage, error); callback(options.onError, error, 'request'); return true; }
    const text = proof.text;
    if (proof.ownerKey !== bootOwner || typeof text !== 'string' || !text.trim() || !isSourceCurrent(proof)) { const error = fail('SOURCE_CHANGED', 'The original response changed before read aloud.'); callback(reportError, scope, options.errorMessage, error); callback(options.onError, error, 'request'); return true; }
    const points = Array.from(text), chunks = []; for (let at = 0; at < points.length; at += chunkCodepoints) chunks.push(points.slice(at, at + chunkCodepoints).join(''));
    const record = active = { serial: ++serial, scope, scopeKey: key, options, proof, chunks, index: 0, nativeStatus: null, paused: false, started: false, utterance: null, timer: null };
    state(record, 'loading'); speakChunk(record); return true;
  }
  function stop(scope, playbackId = null) { if (active && active.scopeKey === getScopeKey(scope) && (playbackId == null || playbackId === active.options.playbackId)) { clear(active); return true; } return false; }
  function stopConversation(scope, conversationId) { if (active && active.scopeKey === getScopeKey(scope) && active.proof.conversationId === conversationId) { clear(active); return true; } return false; }
  function pause(scope, playbackId = null) { const record = active; if (!record || record.scopeKey !== getScopeKey(scope) || playbackId != null && record.options.playbackId !== playbackId || !guard(record)) return false; try { speechSynthesis.pause(); return true; } catch (error) { clear(record, error); return false; } }
  function resume(scope, playbackId = null) { const record = active; if (!record || record.scopeKey !== getScopeKey(scope) || playbackId != null && record.options.playbackId !== playbackId || !guard(record)) return false; try { speechSynthesis.resume(); return true; } catch (error) { clear(record, error); return false; } }
  const pagehide = () => { if (active) clear(active); };
  const authChanged = () => { let same = false; try { same = ownerOf(getIdentity()) === bootOwner; } catch {} if (!same) dispose(); };
  function dispose() { if (disposed) return; if (active) clear(active); disposed = true; eventTarget?.removeEventListener?.('pagehide', pagehide); eventTarget?.removeEventListener?.('codex-browser-auth-changed', authChanged); eventTarget?.removeEventListener?.('codex-browser-auth-context-changed', authChanged); listeners.clear(); }
  eventTarget?.addEventListener?.('pagehide', pagehide);
  eventTarget?.addEventListener?.('codex-browser-auth-changed', authChanged);
  eventTarget?.addEventListener?.('codex-browser-auth-context-changed', authChanged);
  return {
    available, play, stop, stopConversation, pause, resume,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot() { return active ? Object.freeze({ playbackId: active.options.playbackId, status: active.nativeStatus, paused: active.paused, chunkIndex: active.index, chunkCount: active.chunks.length }) : null; },
    dispose,
  };
}

/** The original BJ43.a is a parameterized read atom; retain its ABI and all
 * original playback functions for unrelated sources/unknown messages. */
export function createNativeReadAloudBindings({ controller, mutableAtom, derivedAtom, scopeAtom, stopNative } = {}) {
  if (!controller || ![mutableAtom, derivedAtom, stopNative].every(value => typeof value === 'function')) throw TypeError('The original scoped atom and native stop services are required.');
  const status = mutableAtom(scopeAtom, null);
  const off = controller.subscribe(({ scope, snapshot }) => scope.set(status, snapshot.status === 'idle' ? null : { playbackId: snapshot.playbackId, status: snapshot.status }));
  return {
    wrapStatus(originalAtom) { return derivedAtom(scopeAtom, (playbackId, { get }) => { const value = get(status); return value?.playbackId === playbackId ? value.status : get(originalAtom, playbackId); }); },
    wrapPlay(original) { return function(scope, options, ...rest) { if (controller.play(scope, options, { beforeStart: () => stopNative(scope) })) return; controller.stop(scope); return Reflect.apply(original, this, [scope, options, ...rest]); }; },
    wrapStop(original) { return function(scope, playbackId, ...rest) { controller.stop(scope, playbackId); return Reflect.apply(original, this, [scope, playbackId, ...rest]); }; },
    wrapConversationStop(original) { return function(scope, conversationId, ...rest) { controller.stopConversation(scope, conversationId); return Reflect.apply(original, this, [scope, conversationId, ...rest]); }; },
    dispose() { controller.dispose(); off(); },
  };
}
