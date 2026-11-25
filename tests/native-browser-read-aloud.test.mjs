import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalReadAloudSource, createBrowserReadAloudController, createNativeReadAloudBindings } from '../src/native-client/local-native-read-aloud.mjs';
import { createLocalDotBrowserVoice } from '../src/native-client/local-dot-browser-voice.mjs';
import { createLocalDotRecognition } from '../src/native-client/local-dot-transcription.mjs';
const identity = () => ({ accountId: 'neutral-account', userId: 'neutral-user', accountUserId: 'neutral-member' });
const copy = value => structuredClone(value);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function speechFixture() {
  const spoken = []; let cancels = 0, pauses = 0, resumes = 0;
  class Utterance { constructor(text) { this.text = text; this.lang = ''; } }
  return { spoken, Utterance, engine: { speak(value) { spoken.push(value); }, cancel() { cancels++; }, pause() { pauses++; spoken.at(-1)?.onpause?.({ type: 'pause' }); }, resume() { resumes++; spoken.at(-1)?.onresume?.({ type: 'resume' }); } }, counts: () => ({ cancels, pauses, resumes }) };
}
function fixture(extra = {}) {
  let who = identity(); const thread = { id: 'neutral-thread', turns: [{ id: 'neutral-turn', status: 'completed', items: [{ type: 'agentMessage', id: 'neutral-response', phase: 'final_answer', text: 'Actual neutral response 中文 😀.' }] }] }, threads = new Map([[thread.id, thread]]);
  const source = createLocalReadAloudSource({ getIdentity: () => who, getThread: id => threads.get(id), maxCharacters: extra.maxCharacters ?? 200000 });
  const engine = speechFixture(), reports = [], events = [], states = [], target = new EventTarget(), key = {}, scope = { key };
  const controller = createBrowserReadAloudController({ resolveSource: spec => source.resolve(spec), isSourceCurrent: proof => source.isCurrent(proof), getIdentity: () => who, getScopeKey: value => value.key, speechSynthesis: engine.engine, Utterance: engine.Utterance, getLanguage: () => 'zh-CN', reportError: (...args) => reports.push(args), eventTarget: target, ...extra });
  const options = { conversationId: thread.id, playbackId: 'conversation:' + thread.id + ':neutral-response', errorMessage: 'Native read-aloud error', readAloud: { conversationId: thread.id, messageId: 'neutral-response', audioSource: 'CHATGPT_VOICE_READ_ALOUD_AUDIO_SOURCE_SYNTHESIZED' }, onStatusChange: state => states.push(state), onError: (error, stage) => events.push({ error, stage }), synthesizeAudio() { throw Error('No encoded/fake audio request is allowed in this local speech fixture.'); } };
  return { source, controller, engine, thread, threads, reports, events, states, target, scope, options, setOwner: value => who = value };
}

test('source uses only the unique real terminal final assistant text and brands its exact owner/version', () => {
  const f = fixture(); const proof = f.source.resolve({ conversationId: 'neutral-thread', messageId: 'neutral-response' });
  assert.equal(proof.text, f.thread.turns[0].items[0].text); assert(Object.isFrozen(proof)); assert.equal(f.source.isCurrent(proof), true); assert.equal(f.source.isCurrent({ ...proof }), false);
  f.thread.turns[0].items[0].text += ' Actual edit.'; assert.equal(f.source.isCurrent(proof), false);
  assert.equal(f.source.resolve({ conversationId: 'unknown-thread', messageId: 'neutral-response' }), null);
  f.controller.dispose();
});

test('commentary, pending, duplicate IDs, missing/foreign messages and oversized source fail without speaking', () => {
  const mutations = [
    f => f.thread.turns[0].items[0].phase = 'commentary',
    f => f.thread.turns[0].status = 'inProgress',
    f => f.thread.turns[0].items.push(copy(f.thread.turns[0].items[0])),
    f => f.thread.turns[0].items[0].type = 'userMessage',
    f => f.thread.turns[0].items[0].text = 'x'.repeat(200001),
    f => f.setOwner({ ...identity(), accountId: 'another-account' }),
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); assert.equal(f.controller.play(f.scope, f.options), true); assert.equal(f.engine.spoken.length, 0); assert.equal(f.events.length, 1); assert.equal(f.events[0].stage, 'request'); f.controller.dispose(); }
});

test('real speech events drive loading → playing → idle; synthesis/audio URL callback is never used', () => {
  const f = fixture(); let before = 0; assert.equal(f.controller.play(f.scope, f.options, { beforeStart() { before++; } }), true);
  assert.equal(before, 1); assert.deepEqual(f.states, ['loading']); assert.equal(f.controller.snapshot().status, 'loading'); assert.equal(f.engine.spoken.length, 1); assert.equal(f.engine.spoken[0].lang, 'zh-CN'); assert.equal(f.engine.spoken[0].text, f.thread.turns[0].items[0].text);
  f.engine.spoken[0].onstart(); assert.deepEqual(f.states, ['loading', 'playing']); f.engine.spoken[0].onend(); assert.deepEqual(f.states, ['loading', 'playing', 'idle']); assert.equal(f.controller.snapshot(), null); assert.equal(f.events.length, 0); f.controller.dispose();
});

test('pause/resume obey actual engine events while the original three-state Stop control remains valid', () => {
  const f = fixture(); f.controller.play(f.scope, f.options); f.engine.spoken[0].onstart(); assert.equal(f.controller.pause(f.scope), true);
  assert.equal(f.controller.snapshot().paused, true); assert.equal(f.controller.snapshot().status, 'playing'); assert.equal(f.controller.resume(f.scope), true); assert.equal(f.controller.snapshot().paused, false); assert.deepEqual(f.engine.counts(), { cancels: 0, pauses: 1, resumes: 1 });
  assert.deepEqual(f.states, ['loading', 'playing']); f.controller.stop(f.scope); assert.deepEqual(f.states, ['loading', 'playing', 'idle']); f.controller.dispose();
});

test('same playback toggles real cancellation and late start/end/error callbacks cannot restart it', () => {
  const f = fixture(); f.controller.play(f.scope, f.options); const utterance = f.engine.spoken[0], lateStart = utterance.onstart, lateEnd = utterance.onend, lateError = utterance.onerror;
  f.controller.play(f.scope, f.options); assert.equal(f.engine.counts().cancels, 1); assert.equal(f.controller.snapshot(), null); lateStart(); lateEnd(); lateError({ error: 'canceled' });
  assert.deepEqual(f.states, ['loading', 'idle']); assert.equal(f.events.length, 0); assert.equal(f.engine.spoken.length, 1); f.controller.dispose();
});

test('different message replaces playback and native conversation-scoped Stop cancels only the matching scope/id', () => {
  const f = fixture(); f.thread.turns[0].items.push({ type: 'agentMessage', id: 'other-message', phase: 'final_answer', text: 'Another genuine response.' });
  f.controller.play(f.scope, f.options); const next = { ...f.options, playbackId: 'different-playback', readAloud: { ...f.options.readAloud, messageId: 'other-message' } }; f.controller.play(f.scope, next);
  assert.equal(f.engine.counts().cancels, 1); assert.equal(f.engine.spoken.length, 2); assert.equal(f.controller.stop({ key: {} }), false); assert.equal(f.controller.stopConversation(f.scope, 'other-thread'), false); assert.equal(f.controller.stopConversation({ key: f.scope.key }, 'neutral-thread'), true); assert.equal(f.engine.counts().cancels, 2); f.controller.dispose();
});

test('source deletion/version/owner changes at real speech boundary stop without reading further chunks', () => {
  for (const mutate of [f => f.threads.delete('neutral-thread'), f => f.thread.turns[0].items[0].text += ' changed', f => f.setOwner({ ...identity(), userId: 'foreign-user' })]) {
    const f = fixture({ chunkCodepoints: 2 }); f.controller.play(f.scope, f.options); const utterance = f.engine.spoken[0]; utterance.onstart(); mutate(f); utterance.onboundary();
    assert.equal(f.controller.snapshot(), null); assert.equal(f.engine.spoken.length, 1); assert.equal(f.events.at(-1).error.code, 'LOCAL_READ_ALOUD_SOURCE_CHANGED'); assert.equal(f.events.at(-1).stage, 'play'); f.controller.dispose();
  }
});

test('bounded chunks preserve every Unicode character and keep one continuous original playback state', () => {
  const f = fixture({ chunkCodepoints: 3 }); f.thread.turns[0].items[0].text = '😀a 中文\nsecond'; f.controller.play(f.scope, f.options);
  for (let index = 0; index < f.engine.spoken.length; index++) { const utterance = f.engine.spoken[index]; assert(!/^[\udc00-\udfff]|[\ud800-\udbff]$/u.test(utterance.text)); utterance.onstart(); utterance.onend(); }
  assert.equal(f.engine.spoken.map(utterance => utterance.text).join(''), f.thread.turns[0].items[0].text); assert.deepEqual(f.states, ['loading', 'playing', 'idle']); f.controller.dispose();
});

test('actual engine error and synchronous speak failure close native state and report the original error message', () => {
  for (const sync of [false, true]) {
    const f = fixture(); if (sync) f.engine.engine.speak = () => { throw Error('Neutral engine failure'); };
    f.controller.play(f.scope, f.options); if (!sync) { f.engine.spoken[0].onstart(); f.engine.spoken[0].onerror({ error: 'voice-unavailable' }); }
    assert.equal(f.controller.snapshot(), null); assert.equal(f.states.at(-1), 'idle'); assert.equal(f.events.length, 1); assert.equal(f.events[0].error.code, 'LOCAL_READ_ALOUD_ENGINE_FAILED'); assert.equal(f.reports[0][1], 'Native read-aloud error'); assert.equal(f.events[0].stage, sync ? 'request' : 'play'); f.controller.dispose();
  }
});

test('non-starting real engine has a bounded startup failure and ignores its late callback', async () => {
  const f = fixture({ startupTimeoutMs: 5 }); f.controller.play(f.scope, f.options); const late = f.engine.spoken[0].onstart; await delay(15);
  assert.equal(f.controller.snapshot(), null); assert.equal(f.events[0].error.code, 'LOCAL_READ_ALOUD_START_TIMEOUT'); late(); assert.deepEqual(f.states, ['loading', 'idle']); f.controller.dispose();
});

test('pagehide and dispose cancel queued speech with no implicit replay on return', () => {
  for (const pagehide of [true, false]) { const f = fixture(); f.controller.play(f.scope, f.options); const late = f.engine.spoken[0].onstart; if (pagehide) f.target.dispatchEvent(new Event('pagehide')); else f.controller.dispose(); late(); assert.equal(f.controller.snapshot(), null); assert.equal(f.engine.counts().cancels, 1); assert.equal(f.engine.spoken.length, 1); f.controller.dispose(); }
});

test('bindings preserve original method receiver/arguments/return for unrelated sources and both Stop methods', () => {
  const f = fixture(), slot = {}, mutable = (_scope, initial) => ({ initial }), derived = (_scope, read) => ({ read }); f.scope.set = (atom, value) => slot[atom.id ??= Symbol()] = value;
  const nativeStops = [], calls = [], binding = createNativeReadAloudBindings({ controller: f.controller, mutableAtom: mutable, derivedAtom: derived, scopeAtom: {}, stopNative: scope => nativeStops.push(scope) });
  const receiver = {}, original = function(...args) { calls.push({ receiver: this, args }); return 'native-return'; };
  const play = binding.wrapPlay(original), stop = binding.wrapStop(original), stopConversation = binding.wrapConversationStop(original);
  const unknown = { ...f.options, readAloud: { ...f.options.readAloud, audioSource: 'OTHER_REAL_NATIVE_SOURCE' } }; assert.equal(play.call(receiver, f.scope, unknown, 'third'), 'native-return'); assert.equal(calls[0].receiver, receiver); assert.deepEqual(calls[0].args, [f.scope, unknown, 'third']);
  assert.equal(play(f.scope, f.options), undefined); assert.equal(nativeStops.length, 1); assert.equal(stop.call(receiver, f.scope, 'different-id', 'fourth'), 'native-return'); assert(f.controller.snapshot()); assert.equal(stopConversation.call(receiver, f.scope, 'neutral-thread', 'fifth'), 'native-return'); assert.equal(f.controller.snapshot(), null); assert.deepEqual(calls.at(-1).args, [f.scope, 'neutral-thread', 'fifth']); binding.dispose();
});

test('unavailable speech APIs/guest preserve the original provider path instead of returning fake audio success', () => {
  for (const extra of [{ speechSynthesis: null }, { Utterance: undefined, speechSynthesis: {} }, { getIdentity: () => null }]) {
    const f = fixture(extra); assert.equal(f.controller.available(), false); assert.equal(f.controller.play(f.scope, f.options), false); assert.equal(f.engine.spoken.length, 0); f.controller.dispose();
  }
});

test('a synchronous native state listener can Stop during loading without stale pending state or speech submission', () => {
  const f = fixture(); const values = []; f.controller.subscribe(({ snapshot }) => values.push(snapshot.status));
  f.options.onStatusChange = status => { if (status === 'loading') f.controller.stop(f.scope); }; f.controller.play(f.scope, f.options);
  assert.deepEqual(values, ['loading', 'idle']); assert.equal(f.engine.spoken.length, 0); assert.equal(f.controller.snapshot(), null); f.controller.dispose();
});

test('the existing real auth-context change event immediately cancels speech and retires the old owner controller', () => {
  const f = fixture(); f.controller.play(f.scope, f.options); f.engine.spoken[0].onstart(); f.setOwner(null); f.target.dispatchEvent(new Event('codex-browser-auth-context-changed'));
  assert.equal(f.controller.snapshot(), null); assert.equal(f.controller.available(), false); assert.equal(f.engine.counts().cancels, 1); assert.equal(f.events.length, 0); f.controller.dispose();
});

test('actual local voice catalog prefers exact language, then same language, local default, and first local without selecting cloud voices', () => {
  const cloud = { name: 'Neutral cloud voice', lang: 'zh-CN', localService: false, default: true };
  const english = { name: 'Actual local default', lang: 'en-US', localService: true, default: true };
  const regional = { name: 'Actual local Chinese', lang: 'zh-TW', localService: true, default: false };
  const exact = { name: 'Actual local Chinese region', lang: 'zh-CN', localService: true, default: false };
  const french = { name: 'Actual local alternative', lang: 'fr-FR', localService: true, default: false };
  for (const [catalog, expected] of [[[cloud, english, regional, exact], exact], [[cloud, english, regional], regional], [[cloud, french, english], english], [[cloud, french], french]]) {
    const f = fixture(); let catalogReads = 0;
    f.engine.engine.getVoices = function() { assert.equal(this, f.engine.engine); catalogReads++; return catalog; };
    f.controller.play(f.scope, f.options); const utterance = f.engine.spoken[0]; assert.equal(utterance.voice, expected, 'Assign the exact real SpeechSynthesisVoice object'); assert.equal(utterance.voice.localService, true); assert.equal(catalogReads, 1);
    assert.equal(utterance.lang, 'zh-CN'); utterance.onstart(); utterance.onend(); assert.deepEqual(f.states, ['loading', 'playing', 'idle']); f.controller.dispose();
  }
});

test('empty, throwing, cloud-only or unavailable voice catalog still uses real browser default speak/events without a fake audio path', () => {
  for (const mode of ['empty', 'throws', 'cloud-only', 'missing']) {
    const f = fixture();
    if (mode !== 'missing') f.engine.engine.getVoices = () => { if (mode === 'throws') throw Error('Neutral unavailable browser voice catalog'); return mode === 'empty' ? [] : [{ lang: 'zh-CN', name: 'Unselected remote voice', localService: false, default: true }]; };
    assert.equal(f.controller.play(f.scope, f.options), true); assert.equal(f.engine.spoken.length, 1); const utterance = f.engine.spoken[0];
    assert.equal(utterance.voice, undefined, 'Leave browser default untouched; do not select a cloud voice'); assert.equal(utterance.text, f.thread.turns[0].items[0].text); assert.deepEqual(f.states, ['loading']);
    utterance.onstart(); utterance.onend(); assert.deepEqual(f.states, ['loading', 'playing', 'idle']); assert.equal(f.events.length, 0); f.controller.dispose();
  }
});

test('Dot voice releases the owned recorder or speech immediately when site eligibility changes', async t => {
  for (const stage of ['recording', 'speaking']) await t.test(stage, async t => {
    const target = new EventTarget();
    const owner = { ...identity(), profileId: 'neutral-dot', threadId: 'neutral-thread' };
    let authorized = owner, recorder, recorderAborts = 0;
    const synthesis = speechFixture(), states = [];
    const voice = createLocalDotBrowserVoice({
      adapter: { browserVoiceContext: () => authorized, submitBrowserVoice: async () => 'Saved neutral answer' },
      browser: target, secureContext: true, synthesis: synthesis.engine, Utterance: synthesis.Utterance,
      Recognition: class {
        start() { recorder = this; this.onstart(); }
        abort() { recorderAborts++; }
      },
    });
    t.after(() => target.dispatchEvent(new Event('pagehide')));
    assert(voice.start(owner, { onChange: state => states.push(state?.phase ?? null) }));
    if (stage === 'speaking') {
      recorder.onresult({ results: [{ 0: { transcript: 'Neutral synthetic input' }, isFinal: true }] });
      recorder.onend();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(synthesis.spoken.length, 1);
    }

    authorized = { ...owner };
    target.dispatchEvent(new Event('codex-site-account-changed'));
    assert.deepEqual(states, ['starting', 'active']);
    assert.equal(recorderAborts, 0);
    assert.equal(synthesis.counts().cancels, 0);

    authorized = null;
    target.dispatchEvent(new Event('codex-site-account-changed'));
    assert.deepEqual(states, ['starting', 'active', null]);
    assert.equal(recorderAborts, stage === 'recording' ? 1 : 0);
    assert.equal(synthesis.counts().cancels, stage === 'speaking' ? 1 : 0);
    target.dispatchEvent(new Event('codex-site-account-changed'));
    assert.equal(states.length, 3);
  });
});

function dotCaptureFixture(t, { resume = async () => {}, permission, failWorker = false } = {}) {
  const counters = { mediaRequests: 0, trackStops: 0, contextsClosed: 0, workers: 0, meters: 0 };
  t.mock.method(globalThis, 'setInterval', () => { counters.meters++; });
  const browser = {
    navigator: { mediaDevices: { async getUserMedia() {
      counters.mediaRequests++;
      await permission;
      return { getTracks: () => [{ stop() { counters.trackStops++; } }] };
    } } },
    AudioContext: class {
      state = 'suspended';
      async resume() { await resume(); this.state = 'running'; }
      async close() { this.state = 'closed'; counters.contextsClosed++; }
      createAnalyser() { return { fftSize: 0 }; }
      createMediaStreamSource() { return { connect() {} }; }
    },
    MediaRecorder: class {
      state = 'inactive';
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; }
    },
    Worker: class {
      constructor() {
        counters.workers++;
        if (failWorker) throw new DOMException('Fixture module Worker blocked', 'SecurityError');
      }
      terminate() {}
    },
    performance: { now: () => 0 },
  };
  const local = createLocalDotRecognition(browser);
  const recorder = new local.Recognition(), events = [];
  recorder.onstart = () => events.push('started');
  recorder.onerror = event => events.push(event.error);
  t.after(() => { recorder.abort(); local.dispose(); });
  return { recorder, events, counters };
}

test('Dot voice waits for audio readiness and releases a late microphone on failed AudioContext resume', async t => {
  const permission = Promise.withResolvers();
  const blocked = dotCaptureFixture(t, {
    permission: permission.promise,
    resume: async () => { throw new DOMException('Fixture audio context blocked', 'NotAllowedError'); },
  });
  blocked.recorder.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(blocked.events, ['audio-context-unavailable']);
  assert.equal(blocked.counters.contextsClosed, 1);
  permission.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blocked.counters.mediaRequests, 1);
  assert.equal(blocked.counters.trackStops, 1);
  assert.equal(blocked.counters.workers, 0);
  assert.equal(blocked.counters.meters, 0);
});

test('Dot voice does not warm a worker or meter after an immediate stop in the started callback', async t => {
  const ready = Promise.withResolvers();
  const f = dotCaptureFixture(t, { resume: () => ready.promise });
  f.recorder.onstart = () => { f.events.push('started'); f.recorder.abort(); };
  f.recorder.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.events, []);
  ready.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.events, ['started']);
  assert.deepEqual(f.counters, { mediaRequests: 1, trackStops: 1, contextsClosed: 1, workers: 0, meters: 0 });
});

test('Dot voice reports a blocked local worker as transcription failure and releases capture', async t => {
  const f = dotCaptureFixture(t, { failWorker: true });
  f.recorder.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.events, ['started', 'local-transcription-failed']);
  assert.deepEqual(f.counters, { mediaRequests: 1, trackStops: 1, contextsClosed: 1, workers: 1, meters: 0 });
});
