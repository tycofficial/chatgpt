const pyodideVersion = '314.0.8';
const pyodideCore = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

export const sharedNativeAssets = [
  { file: 'config.js' },
  { file: 'model-catalog.js', inputFile: 'src/native-client/model-catalog.js' },
  { file: 'runtime.js' },
  { file: 'python-worker.js', inputFile: 'src/native-client/python-worker.js' },
  { file: 'release-updater.js' },
  { file: 'vendor/LICENSE-pyodide.txt' },
  { file: 'vendor/LICENSE-cpython.txt' },
  { file: 'vendor/LICENSE-emscripten.txt' },
  ...pyodideCore.map(name => ({
    file: `vendor/pyodide/${pyodideVersion}/${name}`,
    inputFile: `node_modules/pyodide/${name}`,
  })),
];
