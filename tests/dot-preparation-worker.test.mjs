import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/native-client/dot-assets/preparation-worker.mjs', import.meta.url), 'utf8')
  .replace("import createOrbitModule from './orbit-characters.mjs';", '');
const files = {
  'orbit-characters.wasm': 'https://dot.test/runtime/orbit-characters.wasm',
  'orbit-characters.data': 'https://dot.test/runtime/orbit-characters.data',
};

function connect(createOrbitModule) {
  const messages = [];
  let receive;
  runInNewContext(source, {
    createOrbitModule,
    Error,
    Uint8Array,
    self: {
      addEventListener(type, handler) {
        assert.equal(type, 'message');
        receive = handler;
      },
      postMessage(message, transfer = []) {
        messages.push({ body: structuredClone(message, { transfer }), transfers: transfer.length });
      },
    },
  });
  return { send: data => receive({ data }), messages };
}

test('Dot preparation reuses initialization for overlapping requests and transfers native assembly copies', async () => {
  const calls = [];
  const nativeBytes = new Uint8Array([23, 34]);
  let resolveEngine;
  let runtimeLoads = 0;
  const { send, messages } = connect(({ locateFile }) => {
    runtimeLoads++;
    assert.equal(locateFile('orbit-characters.wasm'), files['orbit-characters.wasm']);
    assert.equal(locateFile('orbit-characters.data'), files['orbit-characters.data']);
    return new Promise(resolve => { resolveEngine = resolve; });
  });
  const appearance = new Uint8Array([17, 19]);
  const request = { type: 'prepare', appearance, quality: 0, activities: true };
  const initializing = send({ type: 'initialize', files });
  const first = send({ ...request, id: 7, key: 'blue_beret:ready', readyOnly: true });
  const second = send({ ...request, id: 8, key: 'blue_beret', readyOnly: false });
  resolveEngine({
    orbitPrepareAssembly(...params) {
      calls.push(params);
      return { bytes: nativeBytes, milliseconds: 31 };
    },
  });
  await Promise.all([initializing, first, second]);

  assert.equal(runtimeLoads, 1);
  assert.deepEqual(calls, [
    [appearance, 0, 'blue_beret:ready', true, true],
    [appearance, 0, 'blue_beret', true, false],
  ]);
  assert.deepEqual(messages, [
    { body: { type: 'ready' }, transfers: 0 },
    { body: { type: 'complete', id: 7, bytes: nativeBytes, milliseconds: 31 }, transfers: 1 },
    { body: { type: 'complete', id: 8, bytes: nativeBytes, milliseconds: 31 }, transfers: 1 },
  ]);
  assert.equal(nativeBytes.byteLength, 2);
});

test('Dot preparation can retry initialization and reports native assembly failures', async () => {
  let attempts = 0;
  const { send, messages } = connect(async () => {
    if (++attempts === 1) throw new Error('Native runtime unavailable');
    return {
      orbitPrepareAssembly: () => ({ bytes: new Uint8Array(0), error: 'Native fit failed' }),
    };
  });
  await send({ type: 'initialize', files });
  assert.deepEqual(messages, [
    { body: { type: 'failed', error: 'Native runtime unavailable' }, transfers: 0 },
  ]);

  await send({ type: 'initialize', files });
  await send({ type: 'prepare', id: 10, appearance: new Uint8Array([42]), quality: 0 });
  assert.equal(attempts, 2);
  assert.deepEqual(messages, [
    { body: { type: 'failed', error: 'Native runtime unavailable' }, transfers: 0 },
    { body: { type: 'ready' }, transfers: 0 },
    { body: { type: 'complete', id: 10, bytes: null, error: 'Native fit failed', milliseconds: 0 }, transfers: 0 },
  ]);
});
