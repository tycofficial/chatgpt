const baseKey = 'cg-original-app-server:v1';

export function conversationKey(account) {
  if (account?.role === 'administrator') return baseKey;
  if (account?.accountId) return `${baseKey}:account:${account.accountId}`;
  return `${baseKey}:guest`;
}

function openDatabase() {
  return new Promise(resolve => {
    let request;
    try { request = globalThis.indexedDB.open('tyc-desk-history', 1); }
    catch { resolve(null); return; }
    let timedOut = false;
    const deadline = setTimeout(() => { timedOut = true; resolve(null); }, 1200);
    request.onupgradeneeded = () => request.result.createObjectStore('conversations');
    request.onsuccess = () => {
      clearTimeout(deadline);
      if (timedOut) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => { clearTimeout(deadline); resolve(null); };
    request.onblocked = () => { clearTimeout(deadline); timedOut = true; resolve(null); };
  });
}

function readLatest(database, key) {
  if (!database) return Promise.resolve(null);
  return new Promise(resolve => {
    const deadline = setTimeout(() => resolve(null), 500);
    const request = database.transaction('conversations').objectStore('conversations').get(key);
    request.onsuccess = () => { clearTimeout(deadline); resolve(request.result ?? null); };
    request.onerror = () => { clearTimeout(deadline); resolve(null); };
  }).catch(() => null);
}

export async function openConversationStorage(account, reportTemporary) {
  const key = conversationKey(account);
  const fallbackKey = `tyc-desk:${key}`;
  let browserStorage;
  let previous;
  try {
    browserStorage = globalThis.localStorage;
    const fallback = browserStorage.getItem(fallbackKey);
    if (fallback) previous = JSON.parse(fallback);
  } catch { /* The active conversation remains usable in memory. */ }
  const database = await openDatabase();
  const saved = await readLatest(database, key);
  const latest = (saved?.at ?? 0) >= (previous?.at ?? 0) ? saved : previous;
  let raw = latest?.data;
  if (typeof raw !== 'string') {
    try { raw = browserStorage?.getItem(key); } catch { /* No old history is readable. */ }
  }
  function saveFallback(record) {
    try { browserStorage.setItem(fallbackKey, JSON.stringify(record)); }
    catch { reportTemporary(); }
  }
  return {
    getItem() { return raw ?? null; },
    setItem(_key, data) {
      raw = data;
      const record = { at: Date.now(), data };
      if (!database) { saveFallback(record); return; }
      try {
        const transaction = database.transaction('conversations', 'readwrite');
        transaction.objectStore('conversations').put(record, key);
        transaction.onabort = () => saveFallback(record);
      } catch { saveFallback(record); }
    },
  };
}
