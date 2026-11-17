import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createLocalReadAloudSource, createBrowserReadAloudController, createNativeReadAloudBindings } from '../src/native-client/local-native-read-aloud.mjs';
const repo = process.env.READ_ALOUD_REPOSITORY_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ranges = JSON.parse(fs.readFileSync(new URL('./support/native-read-aloud-factories.json', import.meta.url), 'utf8'));
const context = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, performance, TextEncoder, TextDecoder, AbortController, AbortSignal, DOMException, crypto: globalThis.crypto });
const factories = new Map(), modules = new Map();
for (const row of ranges) { const text = fs.readFileSync(path.join(repo, 'original-client/public/chatgpt.com/cdn/assets', row.file), 'utf8').slice(row.start, row.end); assert.equal(crypto.createHash('sha256').update(text).digest('hex'), row.sha256, 'Original body changed: ' + row.id); factories.set(row.id, new vm.Script('(' + text + ')', { filename: row.file + '#' + row.id }).runInContext(context)); }
function define(exports, getters = {}, values = {}) { for (const [key, get] of Object.entries(getters)) Object.defineProperty(exports, key, { get, enumerable: true }); for (const [key, value] of Object.entries(values)) Object.defineProperty(exports, key, { value, enumerable: true }); }
function pure(id) { if (modules.has(id)) return modules.get(id).exports; assert(factories.has(id), 'Unexpected atom dependency ' + id); const module = { exports: {} }; modules.set(id, module); factories.get(id)(module, module.exports, pure); return module.exports; }
pure.d = define; pure.o = (x, k) => Object.hasOwn(x, k); pure.n = module => { const get = module?.__esModule ? () => module.default : () => module; Object.defineProperty(get, 'a', { get }); return get; }; pure.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
function nativeFixture() {
  const scopeAtom = pure('tyzk').a('NativeReadAloudServiceABI');
  const store = pure('ouEa').b(), node = { token: scopeAtom, parent: null, value: {}, store, cachedBindings: new WeakMap(), signalBindings: new WeakMap(), familyBindings: new Map(), familyKeysByOwner: new Map(), disposalLifecycles: new Set(), autoDisposeScheduler: new (pure('KoFQ').a)({ active: false }), imperativeReadAtoms: new WeakSet(), imperativeReadDepth: 0, retainedScopeEntries: new Map(), debugEntries: new Set(), contextVersionAtom: pure('ouEa').a(0) }, chain = new Map([[scopeAtom.id, node]]);
  const scope = pure('fbKo').g(scopeAtom, chain, node);
  const BolX = { u: pure('hffr').b, d: pure('jwtq').a };
  const dependencies = { BolX, OWtl: { a: scopeAtom }, VpTR: { a: class {} }, Cslg: {}, Kwur: { Request: { getResponse() { throw Error('Encoded synthesize must never be called by local speech.'); } } }, SGsN: {}, GDNt: {}, FAIl: { q: { CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_LOADING: 'loading', CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_PLAYING: 'playing', CHATGPT_VOICE_READ_ALOUD_PLAYBACK_STATE_FAILED: 'failed' } }, D015: { b: Math.round }, w5lF: { c: class extends Error {} }, yGJW: { a() {} }, R9Ov: { a: x => x }, eShZ: { FetchError: class extends Error {} }, wZyU: { a() {}, b() {} } };
  const req = id => { assert(Object.hasOwn(dependencies, id), 'Unexpected BJ43 dependency ' + id); return dependencies[id]; }; req.d = define;
  const original = { exports: {} }; factories.get('BJ43')(original, original.exports, req);
  return { scopeAtom, node, scope, original: original.exports, dependencies, BolX };
}

test('exact BJ43 status-family and BolX writable/derived ABI retain native idle/loading/playing on real speech events', () => {
  const n = nativeFixture(), spoken = [], id = { accountId: 'native-account', userId: 'native-user' }, thread = { id: 'native-thread', turns: [{ id: 'native-turn', status: 'completed', items: [{ type: 'agentMessage', phase: 'final_answer', id: 'native-message', text: 'Actual neutral native message.' }] }] };
  const source = createLocalReadAloudSource({ getIdentity: () => id, getThread: key => key === thread.id ? thread : null });
  const controller = createBrowserReadAloudController({ resolveSource: source.resolve, isSourceCurrent: source.isCurrent, getIdentity: () => id, getScopeKey: scope => scope.chain.get(n.scopeAtom.id) ?? scope.node, Utterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { speak: value => spoken.push(value), cancel() {}, pause() {}, resume() {} }, eventTarget: null });
  let stop;
  const binding = createNativeReadAloudBindings({ controller, mutableAtom: n.BolX.u, derivedAtom: n.BolX.d, scopeAtom: n.scopeAtom, stopNative: scope => stop(scope) });
  const status = binding.wrapStatus(n.original.a), play = binding.wrapPlay(n.original.e); stop = binding.wrapStop(n.original.b);
  const playbackId = 'conversation:native-thread:native-message';
  assert.equal(n.scope.get(status, playbackId), 'idle');
  play(n.scope, { conversationId: thread.id, playbackId, readAloud: { conversationId: thread.id, messageId: 'native-message', audioSource: 'CHATGPT_VOICE_READ_ALOUD_AUDIO_SOURCE_SYNTHESIZED' } });
  assert.equal(n.scope.get(status, playbackId), 'loading'); assert.equal(n.scope.get(status, 'unrelated'), 'idle');
  spoken[0].onstart(); assert.equal(n.scope.get(status, playbackId), 'playing');
  stop(n.scope, playbackId); assert.equal(n.scope.get(status, playbackId), 'idle'); binding.dispose();
});

test('unchanged JE6G.b invokes the wrapped actual BJ43 controller and speaks the owned original text without synthesize HTTP/audio URLs', async () => {
  const n = nativeFixture(), spoken = [], identity = { accountId: 'native-account', userId: 'native-user' };
  const thread = { id: 'native-thread', turns: [{ id: 'native-turn', status: 'completed', items: [{ type: 'agentMessage', phase: 'final_answer', id: 'native-message', text: 'Actual JE6G neutral response 中文.' }] }] };
  const source = createLocalReadAloudSource({ getIdentity: () => identity, getThread: id => id === thread.id ? thread : null });
  const controller = createBrowserReadAloudController({ resolveSource: source.resolve, isSourceCurrent: source.isCurrent, getIdentity: () => identity, getScopeKey: scope => scope.chain.get(n.scopeAtom.id) ?? scope.node, Utterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { speak: value => spoken.push(value), cancel() {}, pause() {}, resume() {} }, eventTarget: null });
  let stop; const binding = createNativeReadAloudBindings({ controller, mutableAtom: n.BolX.u, derivedAtom: n.BolX.d, scopeAtom: n.scopeAtom, stopNative: scope => stop(scope) });
  stop = binding.wrapStop(n.original.b); const status = binding.wrapStatus(n.original.a);
  const tokens = Object.fromEntries(['serverId', 'origin', 'formatter', 'account', 'voicePreference', 'voiceSetting', 'voices'].map(name => [name, Symbol(name)]));
  let synthesizeRequests = 0, preferenceReads = 0;
  const schema = {}; schema.nonempty = () => schema; schema.or = () => schema; schema.safeParse = () => ({ success: false });
  const deps = { ...n.dependencies,
    AuIy: {}, EGK5: {}, ASxG: Object.fromEntries(['array', 'object', 'literal', 'tuple'].map(name => [name, () => schema])),
    Cslg: { k: tokens.account }, svjy: { a: tokens.formatter }, ku2f: { chatGptVoicesQuery$: tokens.voices }, PLHV: { b: () => 'zh-CN' },
    BJ43: { ...n.original, a: status, b: stop, e: binding.wrapPlay(n.original.e) }, Ow2S: {}, ZhoB: { b: value => value ? 'WORK' : 'CHAT' },
    Kwur: { Request: { getResponse() { synthesizeRequests++; throw Error('Private synthesize is outside this original-factory service fixture.'); } } },
    dQRk: { j: tokens.serverId, y: tokens.origin }, g2p6: { p: tokens.voicePreference, n: tokens.voiceSetting },
  };
  const req = id => { assert(Object.hasOwn(deps, id), 'Unexpected JE6G dependency ' + id); return deps[id]; }; req.d = define;
  const module = { exports: {} }; factories.get('JE6G')(module, module.exports, req);
  const scope = Object.create(n.scope);
  Object.defineProperty(scope, 'get', { value(atom, ...args) {
    if (atom === tokens.serverId) return thread.id; if (atom === tokens.origin) return 'tpp'; if (atom === tokens.account) return identity.accountId; if (atom === tokens.voiceSetting) return null;
    if (atom === tokens.formatter) return { formatMessage: value => value.defaultMessage }; return n.scope.get(atom, ...args);
  } });
  Object.defineProperty(scope, 'query', { value: { snapshot(token) { assert.equal(token, tokens.voicePreference); preferenceReads++; return { getData: () => ({ voiceName: 'neutral-preference-unused-by-local-engine' }) }; } } });
  module.exports.b(scope, { conversationId: thread.id, messageId: 'native-message' });
  const playbackId = 'conversation:native-thread:native-message';
  assert.equal(scope.get(status, playbackId), 'loading'); assert.equal(spoken[0].text, thread.turns[0].items[0].text); assert.equal(synthesizeRequests, 0); assert.equal(preferenceReads, 1);
  spoken[0].onstart(); assert.equal(scope.get(status, playbackId), 'playing'); spoken[0].onend(); assert.equal(scope.get(status, playbackId), 'idle'); await Promise.resolve(); assert.equal(synthesizeRequests, 0); binding.dispose();
});
