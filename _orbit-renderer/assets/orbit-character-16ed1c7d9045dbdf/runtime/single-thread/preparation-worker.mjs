import createOrbitModule from './orbit-characters.mjs';

// The site packages this worker beside the archived single-thread runtime.
// The runtime owns preparation; this worker transports its input and result.
let initialization;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

self.addEventListener('message', async ({ data }) => {
  if (data?.type === 'initialize') {
    try {
      initialization ??= createOrbitModule({ locateFile: file => data.files[file] }).catch(error => {
        initialization = undefined;
        throw error;
      });
      await initialization;
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'failed', error: errorMessage(error) });
    }
    return;
  }

  if (data?.type !== 'prepare') return;

  const { id, appearance, quality, key, activities, readyOnly } = data;
  try {
    if (!initialization) throw new Error('Dot preparation runtime has not been initialized');
    const engine = await initialization;
    const result = engine.orbitPrepareAssembly(appearance, quality, key, activities, readyOnly);
    if (!(result?.bytes instanceof Uint8Array) || result.bytes.byteLength === 0) {
      throw new Error(result?.error || 'Dot preparation did not return an assembly');
    }

    const bytes = result.bytes.slice();
    self.postMessage({ type: 'complete', id, bytes, milliseconds: result.milliseconds }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ type: 'complete', id, bytes: null, error: errorMessage(error), milliseconds: 0 });
  }
});
