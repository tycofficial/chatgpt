/** Local, per-browser storage. No conversation or attachment is sent to a server. */
const DB_NAME = 'chatgpt-workspace';
const DB_VERSION = 1;
const FALLBACK_KEY = 'chatgpt-workspace:fallback:v1';
const FALLBACK_LIMIT = 4 * 1024 * 1024;
const MODES = new Set(['chat', 'work', 'codex']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
let databasePromise;
let fallbackQueue = Promise.resolve();

function storageError(error) {
  if (error?.name === 'QuotaExceededError') {
    return new Error('浏览器存储空间不足。请先导出并删除部分对话或附件，再重试。', { cause: error });
  }
  if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') {
    return new Error('浏览器禁止了本地存储。请允许此网站保存数据，或退出无痕模式后重试。', { cause: error });
  }
  return error instanceof Error ? error : new Error('无法读取或保存浏览器中的数据。');
}

function copyJSON(value, label) {
  try {
    const text = JSON.stringify(value);
    if (text === undefined) throw new Error();
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}包含无法保存的数据。`, { cause: error });
  }
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function identifier(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new Error(`${label}的 ID 无效。`);
  }
  return value;
}

function validDate(value) {
  return (typeof value === 'number' && Number.isFinite(value) && value >= 0)
    || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value)));
}

function time(value) {
  return typeof value === 'number' ? value : Date.parse(value);
}

function normalizeChat(value) {
  if (!record(value)) throw new Error('对话数据格式无效。');
  const chat = copyJSON(value, '对话');
  identifier(chat.id, '对话');
  if (!SAFE_ID.test(chat.id)) throw new Error('对话 ID 只能包含 1–128 个字母、数字、下划线或连字符。');
  if (typeof chat.title !== 'string' || chat.title.length > 10000) throw new Error('对话标题无效。');
  chat.mode = typeof chat.mode === 'string' ? chat.mode.toLowerCase() : 'chat';
  if (!MODES.has(chat.mode)) throw new Error('对话模式必须是 Chat、Work 或 Codex。');
  if (!Array.isArray(chat.messages) || chat.messages.some(message => !record(message))) {
    throw new Error('对话消息必须是对象数组。');
  }
  const messageIds = new Set();
  for (const message of chat.messages) {
    if (typeof message.id !== 'string' || !SAFE_ID.test(message.id) || messageIds.has(message.id)) {
      message.id = crypto.randomUUID();
    }
    messageIds.add(message.id);
  }
  const now = Date.now();
  chat.createdAt ??= now;
  chat.updatedAt ??= chat.createdAt;
  if (!validDate(chat.createdAt) || !validDate(chat.updatedAt)) throw new Error('对话时间无效。');
  chat.createdAt=time(chat.createdAt);
  chat.updatedAt=time(chat.updatedAt);
  if (chat.projectId !== undefined && chat.projectId !== null) identifier(chat.projectId, '项目');
  if (chat.archived !== undefined && typeof chat.archived !== 'boolean') throw new Error('对话归档状态无效。');
  return chat;
}

function normalizeAsset(value) {
  if (!record(value)) throw new Error('附件数据格式无效。');
  const asset = copyJSON(value, '附件');
  identifier(asset.id, '附件');
  if (typeof asset.name !== 'string' || !asset.name || typeof asset.type !== 'string') {
    throw new Error('附件名称或类型无效。');
  }
  if (typeof asset.dataUrl !== 'string' || (asset.dataUrl && !asset.dataUrl.startsWith('data:'))) {
    throw new Error('附件必须包含有效的本地 data URL。');
  }
  if (asset.content !== undefined && typeof asset.content !== 'string') throw new Error('附件文本内容无效。');
  return asset;
}

async function database() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise(resolve => {
    if (!globalThis.indexedDB) return resolve(null);
    let settled = false;
    let request;
    const finish = db => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(db);
    };
    // A blocked upgrade must not leave the application waiting indefinitely.
    const timer = setTimeout(() => finish(null), 4000);
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = undefined;
        };
        finish(db);
      };
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
  return databasePromise;
}

function transaction(db, names, mode, operation) {
  return new Promise((resolve, reject) => {
    let tx;
    let result;
    let failure;
    try {
      tx = db.transaction(names, mode);
      tx.oncomplete = () => resolve(result);
      tx.onerror = event => { failure = event.target?.error || tx.error; };
      tx.onabort = () => reject(storageError(failure || tx.error));
      operation(name => tx.objectStore(name), value => { result = value; });
    } catch (error) {
      if (tx) {
        failure = error;
        try { tx.abort(); } catch { reject(storageError(error)); }
      } else reject(storageError(error));
    }
  });
}

function readFallback() {
  let raw;
  try { raw = globalThis.localStorage?.getItem(FALLBACK_KEY); } catch (error) { throw storageError(error); }
  if (!globalThis.localStorage) throw new Error('当前浏览器不支持本地存储，无法保存对话。');
  if (!raw) return { chats: [], assets: [] };
  try {
    const data = JSON.parse(raw);
    if (!record(data) || !Array.isArray(data.chats) || !Array.isArray(data.assets)) throw new Error();
    return data;
  } catch (error) {
    throw new Error('浏览器中的本地数据已损坏。请先备份此网站的存储数据，再清除网站数据。', { cause: error });
  }
}

function writeFallback(data) {
  const raw = JSON.stringify(data);
  if (raw.length * 2 > FALLBACK_LIMIT) {
    throw new Error('IndexedDB 不可用，当前使用容量有限的备用存储。数据超过 4 MiB，请减少附件大小或启用浏览器的网站存储。');
  }
  try { globalThis.localStorage.setItem(FALLBACK_KEY, raw); } catch (error) { throw storageError(error); }
}

function fallback(operation, write = false) {
  // Serialize read/modify/write operations in this tab to avoid lost updates.
  const task = fallbackQueue.then(() => {
    const data = readFallback();
    const result = operation(data);
    if (write) writeFallback(data);
    return result;
  });
  fallbackQueue = task.catch(() => {});
  return task;
}

function sortChats(chats) {
  return chats.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
}

export async function loadChats() {
  const db = await database();
  if (!db) return fallback(data => sortChats(copyJSON(data.chats, '对话')));
  const chats = await transaction(db, ['chats'], 'readonly', (store, done) => {
    store('chats').getAll().onsuccess = event => done(event.target.result);
  });
  return sortChats(chats);
}

export async function saveChat(value) {
  const chat = normalizeChat(value);
  const db = await database();
  if (!db) return fallback(data => {
    const index = data.chats.findIndex(item => item.id === chat.id);
    if (index < 0) data.chats.push(chat); else data.chats[index] = chat;
    return copyJSON(chat, '对话');
  }, true);
  await transaction(db, ['chats'], 'readwrite', store => store('chats').put(chat));
  return chat;
}

export async function deleteChat(id) {
  identifier(id, '对话');
  const db = await database();
  if (!db) return fallback(data => { data.chats = data.chats.filter(chat => chat.id !== id); }, true);
  return transaction(db, ['chats'], 'readwrite', store => store('chats').delete(id));
}

/** Clears all conversation data and attachments, including orphaned uploads. */
export async function clearChats() {
  const db = await database();
  if (!db) return fallback(data => { data.chats = []; data.assets = []; }, true);
  return transaction(db, ['chats', 'assets'], 'readwrite', store => {
    store('chats').clear();
    store('assets').clear();
  });
}

export async function saveAsset(value) {
  const asset = normalizeAsset(value);
  const db = await database();
  if (!db) return fallback(data => {
    const index = data.assets.findIndex(item => item.id === asset.id);
    if (index < 0) data.assets.push(asset); else data.assets[index] = asset;
    return copyJSON(asset, '附件');
  }, true);
  await transaction(db, ['assets'], 'readwrite', store => store('assets').put(asset));
  return asset;
}

export async function getAsset(id) {
  identifier(id, '附件');
  const db = await database();
  if (!db) return fallback(data => {
    const asset = data.assets.find(item => item.id === id);
    return asset ? copyJSON(asset, '附件') : undefined;
  });
  return transaction(db, ['assets'], 'readonly', (store, done) => {
    store('assets').get(id).onsuccess = event => done(event.target.result);
  });
}

export async function deleteAsset(id) {
  identifier(id, '附件');
  const db = await database();
  if (!db) return fallback(data => { data.assets = data.assets.filter(asset => asset.id !== id); }, true);
  return transaction(db, ['assets'], 'readwrite', store => store('assets').delete(id));
}

export async function exportData() {
  const db = await database();
  let data;
  if (!db) data = await fallback(value => copyJSON(value, '导出数据'));
  else data = await transaction(db, ['chats', 'assets'], 'readonly', (store, done) => {
    const result = { chats: [], assets: [] };
    store('chats').getAll().onsuccess = event => { result.chats = event.target.result; };
    store('assets').getAll().onsuccess = event => { result.assets = event.target.result; };
    done(result);
  });
  return { version: 1, exportedAt: new Date().toISOString(), chats: sortChats(data.chats), assets: data.assets };
}

/** Validates the complete import first; merges IDs and keeps newer conversations. */
export async function importData(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (error) { throw new Error('导入文件不是有效的 JSON。', { cause: error }); }
  }
  if (!record(value) || (value.version !== undefined && value.version !== 1)
    || !Array.isArray(value.chats) || (value.assets !== undefined && !Array.isArray(value.assets))) {
    throw new Error('导入文件格式不受支持。请选择此应用导出的 JSON 文件。');
  }
  const chats = new Map();
  for (const valueChat of value.chats) {
    const chat = normalizeChat(valueChat);
    const duplicate = chats.get(chat.id);
    if (!duplicate || time(chat.updatedAt) >= time(duplicate.updatedAt)) chats.set(chat.id, chat);
  }
  const assets = new Map((value.assets || []).map(asset => { const item = normalizeAsset(asset); return [item.id, item]; }));
  const counts = { chats: 0, assets: assets.size };
  const db = await database();
  if (!db) return fallback(data => {
    const existingChats = new Map(data.chats.map(chat => [chat.id, chat]));
    for (const [id, chat] of chats) {
      const existing = existingChats.get(id);
      if (!existing || time(chat.updatedAt) >= time(existing.updatedAt)) {
        existingChats.set(id, chat);
        counts.chats++;
      }
    }
    const existingAssets = new Map(data.assets.map(asset => [asset.id, asset]));
    for (const [id, asset] of assets) existingAssets.set(id, asset);
    data.chats = [...existingChats.values()];
    data.assets = [...existingAssets.values()];
    return counts;
  }, true);
  return transaction(db, ['chats', 'assets'], 'readwrite', (store, done) => {
    const chatStore = store('chats');
    for (const [id, chat] of chats) {
      chatStore.get(id).onsuccess = event => {
        const existing = event.target.result;
        if (!existing || time(chat.updatedAt) >= time(existing.updatedAt)) {
          chatStore.put(chat);
          counts.chats++;
        }
      };
    }
    for (const asset of assets.values()) store('assets').put(asset);
    done(counts);
  });
}
