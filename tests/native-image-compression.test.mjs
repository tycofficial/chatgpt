import test from 'node:test';
import assert from 'node:assert/strict';
import { fitImage720p, compressImageInput } from '../src/native-client/image-input-compression.mjs';
import { originalAssetURL, registerOptionalAssetWorker } from '../src/native-client/startup-compatibility.mjs';

test('720p bounds preserve landscape, portrait, square and already-small images without upscaling', () => {
  assert.deepEqual(fitImage720p(3840,2160),{width:1280,height:720});
  assert.deepEqual(fitImage720p(2160,3840),{width:720,height:1280});
  assert.deepEqual(fitImage720p(3000,3000),{width:720,height:720});
  assert.deepEqual(fitImage720p(400,300),{width:400,height:300});
});
test('small source bytes are preserved without a codec or quality loss', async () => {
  const bytes = new Uint8Array([1,2,3]);
  const result = await compressImageInput(bytes,{width:400,height:300,mimeType:'image/png'},{decode:()=>{throw Error('No decode needed');}});
  assert.equal(result.bytes,bytes); assert.equal(result.compressed,false);
});
test('large images are resized and encoded before history/API materialization, then resources close', async () => {
  const sizes=[],qualities=[];let closed=0;
  const result=await compressImageInput(new Uint8Array(500000),{width:3840,height:2160,mimeType:'image/png'},{decode:async()=>({width:3840,height:2160,close(){closed++;}}),createCanvas:(width,height)=>{sizes.push({width,height});return{getContext:()=>({fillRect(){},drawImage(){}}),convertToBlob:async options=>{qualities.push(options.quality);return new Blob([new Uint8Array(qualities.length===1?250000:100000)],{type:options.type});}};}});
  assert.deepEqual(sizes,[{width:1280,height:720},{width:1280,height:720}]);
  assert.deepEqual(qualities,[0.8,0.65]);assert.equal(result.mimeType,'image/jpeg');assert.equal(result.bytes.length,100000);assert.equal(result.compressed,true);assert.equal(closed,1);
});
test('Stop during image decode prevents encoding and closes the bitmap', async () => {
  const controller=new AbortController();let closed=0;
  await assert.rejects(compressImageInput(new Uint8Array(500000),{width:1920,height:1080,mimeType:'image/png'},{signal:controller.signal,decode:async()=>{controller.abort();return{width:1920,height:1080,close(){closed++;}};},createCanvas:()=>{throw Error('Cancelled image must never be encoded');}}),{name:'AbortError'});
  assert.equal(closed,1);
});
test('direct assets use the same saved original bytes without a service worker or unrelated URL changes',()=>{
  const root=new URL('https://site.test/chatgpt/');
  assert.equal(originalAssetURL('/cdn/assets/runtime.js',root),'https://site.test/chatgpt/original-client/public/chatgpt.com/cdn/assets/runtime.js');
  assert.equal(originalAssetURL('https://cdn.oaistatic.com/assets/icon.svg',root),'https://site.test/chatgpt/original-client/public/cdn.oaistatic.com/assets/icon.svg');
  assert.equal(originalAssetURL('https://example.com/image.png',root),'https://example.com/image.png');
  assert.equal(originalAssetURL('data:image/png;base64,AA==',root),'data:image/png;base64,AA==');
});
test('unavailable worker storage is handled both when reading the API and during registration', async () => {
  const root = new URL('https://site.test/chatgpt/');
  const worker = new URL('native-client-worker.js', root);
  const denied = new DOMException('Failed to access storage.', 'SecurityError');
  assert.equal(await registerOptionalAssetWorker(worker, root.pathname, () => { throw denied; }), false);
  assert.equal(await registerOptionalAssetWorker(worker, root.pathname, () => ({ register: () => Promise.reject(denied) })), false);
  assert.equal(await registerOptionalAssetWorker(worker, root.pathname, () => ({ register: (url, options) => {
    assert.equal(url, worker);
    assert.equal(options.scope, root.pathname);
    return Promise.resolve({});
  } })), true);
});
