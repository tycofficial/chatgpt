import test from 'node:test';
import assert from 'node:assert/strict';

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
let sequence = 0;

async function fallbackStorage(t) {
  const memory = new Map();
  for (const [name, value] of Object.entries({
    indexedDB: undefined,
    localStorage: {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: key => memory.delete(key),
    },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else delete globalThis[name];
    });
  }
  return { storage: await import(`../storage.js?storage-test=${++sequence}`), memory };
}

function chat(id, updatedAt = 2, extra = {}) {
  return { id, title: `Chat ${id}`, mode: 'chat', createdAt: 1, updatedAt,
    messages: [{ id: `message_${id}`, role: 'user', content: 'hello' }], ...extra };
}

function asset(id = 'asset', extra = {}) {
  return { id, name: 'subdir/example.txt', type: 'text/plain', dataUrl: 'data:text/plain;base64,aGVsbG8=', content: 'hello', ...extra };
}

test('fallback conversation and attachment CRUD returns independent data and sorts recency', async t => {
  const { storage: db } = await fallbackStorage(t);
  assert.deepEqual(await db.loadChats(), []);
  const first = chat('first', 2, { mode: 'Work' });
  await db.saveChat(first);
  await db.saveChat(chat('newer', 3));
  first.title = 'Mutated outside storage';
  const list = await db.loadChats();
  assert.deepEqual(list.map(item => item.id), ['newer', 'first']);
  assert.equal(list[1].mode, 'work');
  assert.equal(list[1].title, 'Chat first');
  list[0].messages[0].content = 'Another outside mutation';
  assert.equal((await db.loadChats())[0].messages[0].content, 'hello');
  await db.saveAsset(asset());
  const found = await db.getAsset('asset');
  assert.equal(found.name, 'subdir/example.txt');
  found.content = 'changed';
  assert.equal((await db.getAsset('asset')).content, 'hello');
  await db.deleteChat('first');
  assert.deepEqual((await db.loadChats()).map(item => item.id), ['newer']);
  await db.deleteAsset('asset');
  assert.equal(await db.getAsset('asset'), undefined);
});

test('fallback serializes concurrent saves and imports without losing unrelated IDs', async t => {
  const { storage: db } = await fallbackStorage(t);
  await Promise.all(Array.from({ length: 20 }, (_, i) => db.saveChat(chat(`saved_${i}`))));
  await Promise.all(Array.from({ length: 12 }, (_, i) => db.importData({ version: 1, chats: [chat(`imported_${i}`)], assets: [asset(`asset_${i}`)] })));
  const exported = await db.exportData();
  assert.equal(exported.chats.length, 32);
  assert.equal(exported.assets.length, 12);
  assert.equal(exported.version, 1);
  assert.ok(Number.isFinite(Date.parse(exported.exportedAt)));
});

test('import keeps newer chats and deduplicates duplicate IDs by timestamp', async t => {
  const { storage: db } = await fallbackStorage(t);
  await db.saveChat(chat('existing', 20, { title: 'Keep this' }));
  const counts = await db.importData(JSON.stringify({ version: 1, chats: [
    chat('existing', 10, { title: 'Stale' }),
    chat('duplicate', 9, { title: 'Newest' }),
    chat('duplicate', 3, { title: 'Older' }),
  ], assets: [asset('same'), asset('same', { content: 'latest' })] }));
  assert.deepEqual(counts, { chats: 1, assets: 1 });
  assert.deepEqual((await db.loadChats()).map(item => item.title), ['Keep this', 'Newest']);
  assert.equal((await db.getAsset('same')).content, 'latest');
});

test('complete import validation prevents partial writes and rejects unsafe chat IDs', async t => {
  const { storage: db } = await fallbackStorage(t);
  await db.saveChat(chat('original'));
  const before = await db.exportData();
  await assert.rejects(db.importData({ version: 1, chats: [chat('valid'), chat('bad', 3, { title: 7 })] }), /标题/);
  await assert.rejects(db.importData({ version: 1, chats: [chat('valid')], assets: [asset('bad', { dataUrl: 'https://example.com/file' })] }), /data URL/);
  await assert.rejects(db.importData({ version: 1, chats: [chat('unsafe"id')] }), /对话 ID/);
  await assert.rejects(db.saveChat(chat('x'.repeat(129))), /对话 ID/);
  await assert.rejects(db.importData('{broken'), /JSON/);
  await assert.rejects(db.importData({ version: 2, chats: [] }), /格式/);
  const after = await db.exportData();
  assert.deepEqual(after.chats, before.chats);
  assert.deepEqual(after.assets, before.assets);
});

test('import assigns unique selector-safe message IDs while preserving valid IDs', async t => {
  const { storage: db } = await fallbackStorage(t);
  await db.importData({ version: 1, chats: [chat('legacy', 2, { messages: [
    { role: 'user', content: 'missing ID' },
    { id: 'bad"id', role: 'assistant', content: 'unsafe ID' },
    { id: 'valid_message', role: 'user', content: 'valid ID' },
    { id: 'valid_message', role: 'assistant', content: 'duplicate ID' },
  ] })] });
  const messages = (await db.loadChats())[0].messages;
  assert.equal(messages[2].id, 'valid_message');
  assert.equal(new Set(messages.map(message => message.id)).size, 4);
  assert.ok(messages.every(message => SAFE_ID.test(message.id)));
  const backup = await db.exportData();
  await db.importData(backup);
  assert.deepEqual((await db.loadChats())[0].messages.map(message => message.id), messages.map(message => message.id));
});

test('fallback quota rejection preserves existing data and remains usable afterward', async t => {
  const { storage: db } = await fallbackStorage(t);
  await db.saveChat(chat('kept'));
  await db.saveAsset(asset('kept_asset'));
  await assert.rejects(db.saveAsset(asset('oversized', { dataUrl: 'data:,' + 'x'.repeat(2100000) })), /4 MiB/);
  assert.equal(await db.getAsset('oversized'), undefined);
  assert.equal((await db.getAsset('kept_asset')).content, 'hello');
  assert.equal((await db.loadChats())[0].id, 'kept');
  await db.saveChat(chat('after_failure'));
  assert.equal((await db.loadChats()).length, 2);
});

test('clearChats removes all conversations and attachments including unattached uploads', async t => {
  const { storage: db } = await fallbackStorage(t);
  await db.saveChat(chat('to_delete'));
  await db.saveAsset(asset('orphaned_upload'));
  await db.clearChats();
  assert.deepEqual(await db.loadChats(), []);
  assert.equal(await db.getAsset('orphaned_upload'), undefined);
  const data = await db.exportData();
  assert.deepEqual(data.chats, []);
  assert.deepEqual(data.assets, []);
  await db.saveChat(chat('fresh'));
  assert.equal((await db.loadChats()).length, 1);
});
