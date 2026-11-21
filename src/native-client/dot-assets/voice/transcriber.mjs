import { env, pipeline } from './vendor/transformers.min.js';

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = new URL('./models/', import.meta.url).href;
// Use a single ONNX thread for the GitHub Pages hosting environment.
env.backends.onnx.wasm.wasmPaths = new URL('./vendor/', import.meta.url).href;
env.backends.onnx.wasm.numThreads = 1;

const model = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { device: 'wasm', dtype: 'q8' });
void model.catch(() => {});

self.onmessage = async ({ data: { id, samples, language } }) => {
  try {
    const transcribe = await model;
    const locale = typeof language === 'string' ? language.toLowerCase().split('-')[0] : '';
    const reply = await transcribe(samples, {
      task: 'transcribe', max_new_tokens: 128,
      ...(locale === 'zh' ? { language: 'chinese' } : {}),
    });
    self.postMessage({ id, text: reply.text });
  } catch {
    self.postMessage({ id, error: true });
  }
};
