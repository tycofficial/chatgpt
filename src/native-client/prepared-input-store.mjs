/** Private, resumable provider input, separate from synchronous chat history. */
export function createPreparedInputStore({ namespace, indexedDB, uuid = () => crypto.randomUUID() } = {}) {
  if (typeof namespace !== 'string' || !namespace) throw new TypeError('A local history namespace is required');
  try { indexedDB ??= globalThis.indexedDB; } catch { return null; }
  if (!indexedDB) return null;
  let database;
  function open() {
    if (database) return database;
    const pending = new Promise((resolve, reject) => {
      const request = indexedDB.open('chatgpt-native-prepared-inputs', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('inputs');
      request.onblocked = () => reject(Error('Prepared input database upgrade is blocked'));
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const connection = request.result;
        if (database !== pending) { connection.close(); return; }
        connection.onversionchange = () => { connection.close(); if (database === pending) database = null; };
        resolve(connection);
      };
    });
    database = pending;
    void pending.catch(() => { if (database === pending) database = null; });
    return pending;
  }
  async function transaction(mode, operation) {
    const connection = await open();
    return new Promise((resolve, reject) => {
      const tx = connection.transaction('inputs', mode);
      const request = operation(tx.objectStore('inputs'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? request.error ?? Error('Prepared input storage failed'));
    });
  }
  const key = ({ threadId, turnId }, reference) => [namespace, threadId, turnId, reference];
  return {
    async save(location, content) {
      const reference = uuid();
      await transaction('readwrite', store => store.add(content, key(location, reference)));
      return reference;
    },
    async load(location, reference) {
      const value = await transaction('readonly', store => store.get(key(location, reference)));
      if (!isProviderContent(value)) throw Error('Saved prepared input is missing or invalid');
      return value;
    },
    async remove(location, reference) {
      await transaction('readwrite', store => store.delete(key(location, reference)));
    },
    async removeThread(threadId) {
      const range = IDBKeyRange.bound([namespace, threadId], [namespace, threadId, []], false, true);
      await transaction('readwrite', store => store.delete(range));
    },
  };
}

export const isProviderContent = content => typeof content === 'string' || Array.isArray(content);

export function needsPreparedInputStorage(content, metadata) {
  return Boolean(metadata?.files?.length || metadata?.images?.length ||
    Array.isArray(content) && content.some(part => part?.type === 'image_url'));
}

export function compactPreparedUserContent(turn, files) {
  const input = turn.items.find(item => item.type === 'userMessage')?.content ?? [];
  const text = input.filter(part => part.type === 'text').map(part => part.text).join('\n');
  const paths = [...new Set((files ?? []).map(file => file.textPath ?? file.path).filter(path => typeof path === 'string' && path.startsWith('/mnt/data/')))];
  if (paths.length) return [text, 'Files from this message in the local workspace: ' + JSON.stringify(paths)].filter(Boolean).join('\n\n');
  if (input.some(part => part.type === 'image' || part.type === 'localImage')) return [text, 'Image attached to this message.'].filter(Boolean).join('\n\n');
  return text;
}

/** Keep the newest occurrence of identical image bytes in one provider payload. */
export function deduplicateProviderImages(messages) {
  const seen = new Set();
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!Array.isArray(message.content)) continue;
    const unique = message.content.slice().reverse().filter(part => {
      if (part?.type !== 'image_url' && part?.type !== 'input_image') return true;
      const url = typeof part.image_url === 'string' ? part.image_url : part.image_url?.url;
      if (!url) return true;
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    }).reverse();
    if (unique.length !== message.content.length) messages[index] = { ...message, content: unique.length ? unique : 'Image also attached in another message.' };
  }
  return messages;
}
