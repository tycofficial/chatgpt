import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalReadAloudSource, createBrowserReadAloudController, createNativeReadAloudBindings } from '../src/native-client/local-native-read-aloud.mjs';
import { openNativeAtomFixture } from './support/native-atom-fixture.mjs';

const { Q840, createScope, instantiate } = openNativeAtomFixture({
  repositoryRoot: process.env.READ_ALOUD_REPOSITORY_ROOT, readAloud: true,
});

function nativeFixture() {
  const { scopeAtom, scope } = createScope('NativeReadAloudServiceABI');
  const dependencies = {
    Q840, OWtl: { a: scopeAtom }, VpTR: { a: class {} }, Cslg: {},
    Kwur: { Request: { getResponse() { throw Error('Encoded synthesize must never be called by local speech.'); } } },
    SGsN: {}, GDNt: {}, FAIl: { q: {
      CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_LOADING: 'loading',
      CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_PLAYING: 'playing',
      CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_FAILED: 'failed',
    } },
    D015: { b: Math.round }, w5lF: { c: class extends Error {} }, yGJW: { a() {} },
    R9Ov: { a: value => value }, eShZ: { FetchError: class extends Error {} }, wZyU: { a() {}, b() {} },
  };
  const original = instantiate('WNfO', dependencies);
  return { scopeAtom, scope, original, dependencies, Q840 };
}

test('exact WNfO status-family and Q840 writable/derived ABI retain native idle/loading/playing on real speech events', () => {
  const n = nativeFixture(), spoken = [], id = { accountId: 'native-account', userId: 'native-user' }, thread = { id: 'native-thread', turns: [{ id: 'native-turn', status: 'completed', items: [{ type: 'agentMessage', phase: 'final_answer', id: 'native-message', text: 'Actual neutral native message.' }] }] };
  const source = createLocalReadAloudSource({ getIdentity: () => id, getThread: key => key === thread.id ? thread : null });
  const controller = createBrowserReadAloudController({ resolveSource: source.resolve, isSourceCurrent: source.isCurrent, getIdentity: () => id, getScopeKey: scope => scope.chain.get(n.scopeAtom.id) ?? scope.node, Utterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { speak: value => spoken.push(value), cancel() {}, pause() {}, resume() {} }, eventTarget: null });
  let stop;
  const binding = createNativeReadAloudBindings({ controller, mutableAtom: n.Q840.u, derivedAtom: n.Q840.d, scopeAtom: n.scopeAtom, stopNative: scope => stop(scope) });
  const status = binding.wrapStatus(n.original.a), play = binding.wrapPlay(n.original.e); stop = binding.wrapStop(n.original.b);
  const playbackId = 'conversation:native-thread:native-message';
  assert.equal(n.scope.get(status, playbackId), 'idle');
  play(n.scope, { conversationId: thread.id, playbackId, readAloud: { conversationId: thread.id, messageId: 'native-message', audioSource: 'CHATGPT_VOICE_READ_ALOUD_AUDIO_SOURCE_SYNTHESIZED' } });
  assert.equal(n.scope.get(status, playbackId), 'loading'); assert.equal(n.scope.get(status, 'unrelated'), 'idle');
  spoken[0].onstart(); assert.equal(n.scope.get(status, playbackId), 'playing');
  stop(n.scope, playbackId); assert.equal(n.scope.get(status, playbackId), 'idle'); binding.dispose();
});

test('unchanged JE6G.b invokes the wrapped WNfO controller and speaks the owned original text without synthesize HTTP/audio URLs', async () => {
  const n = nativeFixture(), spoken = [], identity = { accountId: 'native-account', userId: 'native-user' };
  const thread = { id: 'native-thread', turns: [{ id: 'native-turn', status: 'completed', items: [{ type: 'agentMessage', phase: 'final_answer', id: 'native-message', text: 'Actual JE6G neutral response 中文.' }] }] };
  const source = createLocalReadAloudSource({ getIdentity: () => identity, getThread: id => id === thread.id ? thread : null });
  const controller = createBrowserReadAloudController({ resolveSource: source.resolve, isSourceCurrent: source.isCurrent, getIdentity: () => identity, getScopeKey: scope => scope.chain.get(n.scopeAtom.id) ?? scope.node, Utterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { speak: value => spoken.push(value), cancel() {}, pause() {}, resume() {} }, eventTarget: null });
  let stop; const binding = createNativeReadAloudBindings({ controller, mutableAtom: n.Q840.u, derivedAtom: n.Q840.d, scopeAtom: n.scopeAtom, stopNative: scope => stop(scope) });
  stop = binding.wrapStop(n.original.b); const status = binding.wrapStatus(n.original.a);
  const tokens = Object.fromEntries(['serverId', 'origin', 'formatter', 'account', 'voicePreference', 'voiceSetting', 'voices'].map(name => [name, Symbol(name)]));
  let synthesizeRequests = 0, preferenceReads = 0;
  const schema = {}; schema.nonempty = () => schema; schema.or = () => schema; schema.safeParse = () => ({ success: false });
  const deps = { ...n.dependencies,
    AuIy: {}, EGK5: {}, lAQI: Object.fromEntries(['g', 'F', 'z', 'N'].map(name => [name, () => schema])),
    Cslg: { k: tokens.account }, svjy: { a: tokens.formatter }, ku2f: { chatGptVoicesQuery$: tokens.voices }, PLHV: { b: () => 'zh-CN' },
    WNfO: { ...n.original, a: status, b: stop, e: binding.wrapPlay(n.original.e) }, Ow2S: {}, ZhoB: { b: value => value ? 'WORK' : 'CHAT' },
    Kwur: { Request: { getResponse() { synthesizeRequests++; throw Error('Private synthesize is outside this original-factory service fixture.'); } } },
    dQRk: { j: tokens.serverId, y: tokens.origin }, g2p6: { p: tokens.voicePreference, n: tokens.voiceSetting },
  };
  const actions = instantiate('JE6G', deps);
  const scope = Object.create(n.scope);
  Object.defineProperty(scope, 'get', { value(atom, ...args) {
    if (atom === tokens.serverId) return thread.id; if (atom === tokens.origin) return 'tpp'; if (atom === tokens.account) return identity.accountId; if (atom === tokens.voiceSetting) return null;
    if (atom === tokens.formatter) return { formatMessage: value => value.defaultMessage }; return n.scope.get(atom, ...args);
  } });
  Object.defineProperty(scope, 'query', { value: { snapshot(token) { assert.equal(token, tokens.voicePreference); preferenceReads++; return { getData: () => ({ voiceName: 'neutral-preference-unused-by-local-engine' }) }; } } });
  actions.b(scope, { conversationId: thread.id, messageId: 'native-message' });
  const playbackId = 'conversation:native-thread:native-message';
  assert.equal(scope.get(status, playbackId), 'loading'); assert.equal(spoken[0].text, thread.turns[0].items[0].text); assert.equal(synthesizeRequests, 0); assert.equal(preferenceReads, 1);
  spoken[0].onstart(); assert.equal(scope.get(status, playbackId), 'playing'); spoken[0].onend(); assert.equal(scope.get(status, playbackId), 'idle'); await Promise.resolve(); assert.equal(synthesizeRequests, 0); binding.dispose();
});
