# Dot voice dependencies

This browser worker runs speech recognition in the current tab. The voice call loads the packages below when it starts.

- Transformers.js browser distribution 3.8.1 is from the [Hugging Face npm package](https://registry.npmjs.org/@huggingface/transformers/-/transformers-3.8.1.tgz) under Apache 2.0. See `vendor/LICENSE-transformers.txt`.
- The bundled ONNX Runtime and accompanying JavaScript/WASM in that same distribution are from ONNX Runtime Web `1.22.0-dev.20250409-89f8206ba4`. See `vendor/LICENSE-onnxruntime.txt` and `vendor/ThirdPartyNotices-onnxruntime.txt`, supplied by the [ONNX Runtime 1.22.0 distribution](https://pypi.org/project/onnxruntime/1.22.0/).
- The [Xenova/whisper-tiny ONNX conversion](https://huggingface.co/Xenova/whisper-tiny/tree/5332fcc35e32a33b86612b9a57a89be7906102b1) uses Apache 2.0. See `vendor/LICENSE-transformers.txt` for the license text. The [original OpenAI Whisper model](https://github.com/openai/whisper) is MIT licensed. See `vendor/LICENSE-whisper.txt`.
