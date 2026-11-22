const volatileStorage = new WeakSet();
const isStorageRestriction = error => ['SecurityError', 'NotAllowedError'].includes(error?.name);

export function isVolatileBrowserStorage(storage) {
  return volatileStorage.has(storage);
}

function createVolatileStorage() {
  const values = new Map();
  const storage = Object.freeze({
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); },
  });
  volatileStorage.add(storage);
  return storage;
}

export function installRestrictedBrowserStorage(scope = globalThis) {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const storage = scope[name];
      if (storage) {
        storage.getItem('tyc-site-storage-probe');
        continue;
      }
    } catch (error) {
      if (!isStorageRestriction(error)) throw error;
    }
    Object.defineProperty(scope, name, { configurable: true, enumerable: true, value: createVolatileStorage() });
  }

  for (const name of ['indexedDB', 'caches']) {
    try { void scope[name]; }
    catch (error) {
      if (!isStorageRestriction(error)) throw error;
      Object.defineProperty(scope, name, { configurable: true, enumerable: true, value: undefined });
    }
  }
}
