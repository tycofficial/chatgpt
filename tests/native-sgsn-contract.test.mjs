import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { capturedFactory } from './support/captured-original.mjs';
import { createNativeCloudSyncFeedback } from '../src/native-client/native-cloud-sync-feedback.mjs';

function originalNativeServiceFixture() {
  const source = capturedFactory('SGsN', 698524);
  const active = new Map(), submitted = [], dismissed = [];
  const dependencies = {
    QosV: { c() { throw Error('React component render is outside this service ABI test'); } },
    Q840: { u: (scope, value) => ({ scope, value }) },
    OWtl: { a: Symbol('neutral-own-scope') },
    zd8w: { createElement: (type, props, ...children) => ({ type, props, children }) },
    P6QS: { b: { custom(render, options) { const value = { render, options }; active.set(options.id, value); submitted.push(value); }, dismiss(id) { dismissed.push(id); active.delete(id); } } },
  };
  const require = name => { assert.ok(Object.prototype.hasOwnProperty.call(dependencies, name)); return dependencies[name]; };
  require.d = (exports, getters, values) => {
    for (const [key, get] of Object.entries(getters)) Object.defineProperty(exports, key, { get, enumerable: true });
    for (const [key, value] of Object.entries(values ?? {})) Object.defineProperty(exports, key, { value, enumerable: true });
  };
  const module = { exports: {} };
  const context = vm.createContext({ document: { activeElement: null }, HTMLElement: class {},
    requestAnimationFrame: callback => { queueMicrotask(callback); return 1; }, queueMicrotask, setTimeout, clearTimeout });
  const factory = vm.runInContext('(' + source + ')', context, { timeout: 1000 });
  factory(module, module.exports, require);
  return { original: module.exports, active, submitted, dismissed };
}

test('exact original SGsN has a no-op initial global; registration and viewport are distinct readiness contracts', () => {
  const f = originalNativeServiceFixture(), initial = f.original.b();
  initial.danger('Neutral before registration', { duration: 0 }); assert.equal(f.submitted.length, 0);
  const service = f.original.a('neutral-viewport', 'OriginalToastComponent');
  const unregister = f.original.c(service); assert.equal(f.original.b(), service);
  service.warning('Neutral queued before viewport', { id: 'native-queued', duration: 0 }); assert.equal(f.submitted.length, 0);
  const unmountViewport = service.registerViewport(); assert.equal(f.submitted.length, 1);
  assert.equal(f.submitted[0].options.duration, Infinity);
  service.closeAll(); unmountViewport(); unregister(); assert.equal(f.original.b(), initial);
});

test('helper uses exact native SGsN primary/secondary options and closes only its owned service handles', async () => {
  const f = originalNativeServiceFixture(), noop = f.original.b();
  const service = f.original.a('neutral-native', 'OriginalToastComponent');
  const unregister = f.original.c(service); let ready = false, calls = [];
  const feedback = createNativeCloudSyncFeedback({ ownerId: 'neutral-owner', getOwnerId: () => 'neutral-owner',
    getToaster: () => ready && f.original.b() !== noop ? f.original.b() : null,
    onRetry: async () => {}, onResolveConflict: async (id, choice) => { calls.push([id, choice]); },
    setTimer: () => 1, clearTimer() {}, eventTarget: null,
  });
  feedback.report({ ownerId: 'neutral-owner', kind: 'conflict', conversationId: 'neutral-history' });
  assert.equal(f.submitted.length, 0);
  service.registerViewport(); ready = true; assert.equal(feedback.flush(), 1);
  service.info('Unrelated original notification', { id: 'unrelated-original', duration: 0 });
  assert.equal(f.active.size, 2);
  const wrapper = f.submitted[0].render();
  const nativeToast = wrapper.props.content;
  assert.equal(nativeToast.type, 'OriginalToastComponent'); assert.equal(nativeToast.props.level, 'warning');
  assert.equal(nativeToast.props.primaryAction.label, '保留此设备版本');
  assert.equal(nativeToast.props.secondaryAction.label, '使用云端版本');
  assert.equal(nativeToast.props.onClose, undefined);
  assert.equal(f.submitted[0].options.dismissible, false);
  await nativeToast.props.primaryAction.onClick(); assert.deepEqual(calls, [['neutral-history', 'local']]);
  assert.equal(f.active.size, 2); // No fabricated close after callback resolution.
  feedback.dispose(); assert.equal(f.active.size, 1); assert.equal(f.dismissed.length, 1);
  service.closeAll(); unregister();
});
