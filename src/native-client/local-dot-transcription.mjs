const SAMPLE_RATE = 16000;
const QUIET_MS = 900;
const WAIT_FOR_SPEECH_MS = 9000;
const MAX_CLIP_MS = 24000;
const TRANSCRIPTION_TIMEOUT_MS = 120000;

export function hasLocalDotTranscription(browser = globalThis) {
  return ['Worker', 'MediaRecorder', 'AudioContext', 'OfflineAudioContext'].every(name => typeof browser[name] === 'function') &&
    typeof browser.navigator?.mediaDevices?.getUserMedia === 'function';
}

function stopMedia(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

function closeAudio(context) {
  if (context.state !== 'closed') void context.close().catch(() => {});
}

async function getMonoSamples(browser, context, clip) {
  const decoded = await context.decodeAudioData(await clip.arrayBuffer());
  const mono = new browser.OfflineAudioContext(1, Math.ceil(decoded.duration * SAMPLE_RATE), SAMPLE_RATE);
  const source = mono.createBufferSource();
  source.buffer = decoded;
  source.connect(mono.destination);
  source.start();
  return (await mono.startRendering()).getChannelData(0);
}

function rms(buffer) {
  let energy = 0;
  for (const sample of buffer) energy += sample * sample;
  return Math.sqrt(energy / buffer.length);
}

/** Keep the original voice-call controller's SpeechRecognition event contract. */
export function createLocalDotRecognition(browser = globalThis) {
  let worker = null;
  let pending = null;
  let nextId = 0;

  function settle(error, text) {
    const job = pending;
    pending = null;
    if (!job) return;
    clearTimeout(job.timer);
    if (error) job.reject(error);
    else job.resolve(text);
  }

  function stopWorker(error = new DOMException('Dot voice stopped', 'AbortError')) {
    worker?.terminate();
    worker = null;
    settle(error);
  }

  function startWorker() {
    if (worker) return worker;
    worker = new browser.Worker(new URL('./dot-assets/voice/transcriber.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (!pending || data?.id !== pending.id) return;
      settle(data.error ? new Error('Unable to transcribe this clip') : null, data.text);
    };
    worker.onerror = () => stopWorker(new Error('Unable to load the local transcription engine'));
    return worker;
  }

  function transcribe(samples, language) {
    const engine = startWorker();
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => stopWorker(new Error('Local transcription timed out')), TRANSCRIPTION_TIMEOUT_MS);
      pending = { id, resolve, reject, timer };
      try { engine.postMessage({ id, samples, language }, [samples.buffer]); }
      catch (error) { stopWorker(error); }
    });
  }

  class LocalDotRecognition {
    #capture = null;

    start() {
      if (this.#capture) return;
      const context = new browser.AudioContext();
      const capture = { context, stream: null, recorder: null, tick: null, decoding: false };
      this.#capture = capture;
      // Resume inside the original Start call button's user gesture.
      let resumed;
      try {
        resumed = context.resume().catch(() => this.#fail(capture, 'audio-context-unavailable'));
      } catch {
        this.#fail(capture, 'audio-context-unavailable');
        return;
      }
      void this.#record(capture, resumed);
    }

    abort() {
      const capture = this.#capture;
      if (!capture) return;
      this.#capture = null;
      clearInterval(capture.tick);
      if (capture.recorder) {
        capture.recorder.ondataavailable = capture.recorder.onstop = capture.recorder.onerror = null;
        if (capture.recorder.state !== 'inactive') {
          try { capture.recorder.stop(); } catch (error) { if (error.name !== 'InvalidStateError') throw error; }
        }
      }
      stopMedia(capture.stream);
      closeAudio(capture.context);
      if (capture.decoding && pending) stopWorker();
    }

    async #record(capture, resumed) {
      try {
        const stream = await browser.navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
        if (this.#capture !== capture) { stopMedia(stream); return; }
        capture.stream = stream;
        await resumed;
        if (this.#capture !== capture) return;
        if (capture.context.state !== 'running') {
          this.#fail(capture, 'audio-context-unavailable');
          return;
        }
        const recorder = new browser.MediaRecorder(stream);
        capture.recorder = recorder;
        const analyser = capture.context.createAnalyser();
        analyser.fftSize = 1024;
        capture.context.createMediaStreamSource(stream).connect(analyser);
        const meter = new Float32Array(analyser.fftSize);
        const chunks = [];
        const started = browser.performance.now();
        let loudFrames = 0;
        let lastSpeech = null;
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => this.#fail(capture, 'audio-capture');
        recorder.onstop = () => {
          clearInterval(capture.tick);
          stopMedia(stream);
          void this.#decode(capture, lastSpeech !== null, chunks, recorder.mimeType);
        };
        recorder.start();
        this.onstart?.();
        if (this.#capture !== capture) return;
        try { startWorker(); }
        catch {
          this.#fail(capture, 'local-transcription-failed');
          return;
        }
        capture.tick = setInterval(() => {
          analyser.getFloatTimeDomainData(meter);
          const now = browser.performance.now();
          loudFrames = rms(meter) >= 0.018 ? loudFrames + 1 : 0;
          if (loudFrames >= 3) lastSpeech = now;
          const finished = lastSpeech === null ? now - started >= WAIT_FOR_SPEECH_MS : now - lastSpeech >= QUIET_MS;
          if ((finished || now - started >= MAX_CLIP_MS) && recorder.state === 'recording') recorder.stop();
        }, 60);
      } catch (error) {
        const name = error?.name;
        const code = name === 'NotAllowedError' ? 'not-allowed' : name === 'NotFoundError' ? 'audio-device-not-found' : 'audio-capture';
        this.#fail(capture, code);
      }
    }

    async #decode(capture, hasSpeech, chunks, type) {
      if (this.#capture !== capture) return;
      let text = '';
      try {
        if (hasSpeech && chunks.length) {
          const clip = new Blob(chunks, { type });
          const samples = await getMonoSamples(browser, capture.context, clip);
          if (this.#capture !== capture) return;
          capture.decoding = true;
          text = (await transcribe(samples, this.lang)).trim();
        }
      } catch {
        this.#fail(capture, 'local-transcription-failed');
        return;
      }
      if (this.#capture !== capture) return;
      this.#capture = null;
      closeAudio(capture.context);
      if (text) this.onresult?.({ results: [{ 0: { transcript: text }, isFinal: true }] });
      this.onend?.();
    }

    #fail(capture, error) {
      if (this.#capture !== capture) return;
      this.abort();
      this.onerror?.({ error });
    }
  }

  return { Recognition: LocalDotRecognition, dispose: () => stopWorker() };
}
