import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker, { passwordHash } from '../worker/service.mjs';

export function createSqliteD1({ includeSyncMigration = true } = {}) {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys=ON');
  for (const file of fs.readdirSync(new URL('../drizzle/', import.meta.url)).filter(name => name.endsWith('.sql') && (includeSyncMigration || name !== '0003_chat_sync.sql')).sort()) raw.exec(fs.readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  const state = { failOnce: null, failAfterCommit: false, sessions: [] };
  const DB = {
    raw, state,
    withSession(constraint) { state.sessions.push(constraint); return this; },
    prepare(sql) {
      let args = [];
      return {
        sql,
        bind(...values) { args = values; return this; },
        execute() {
          if (state.failOnce?.(sql)) { state.failOnce = null; throw Error('Neutral injected database failure'); }
          const statement = raw.prepare(sql);
          if (statement.columns().length) return { results: statement.all(...args), meta: { changes: 0 } };
          const changed = statement.run(...args);
          return { results: [], meta: { changes: Number(changed.changes) } };
        },
        async run() { return this.execute(); },
        async first() { return this.execute().results[0] ?? null; },
        async all() { return this.execute(); },
      };
    },
    async batch(statements) {
      raw.exec('BEGIN IMMEDIATE'); let committed = false;
      try {
        const values = statements.map(statement => statement.execute());
        raw.exec('COMMIT'); committed = true;
        if (state.failAfterCommit) { state.failAfterCommit = false; throw Error('Neutral lost acknowledgement'); }
        return values;
      } catch (error) { if (!committed) raw.exec('ROLLBACK'); throw error; }
    },
  };
  return DB;
}

export async function syncFixture(options) {
  const salt = '0123456789abcdef0123456789abcdef', DB = createSqliteD1(options);
  const env = { DB, ADMIN_USERNAME: 'TYC', ADMIN_PASSWORD_SALT: salt, ADMIN_PASSWORD_HASH: await passwordHash('Neutral-Admin-Only', salt) };
  const call = (path, { method = 'GET', token, body, origin = 'https://tycofficial.github.io', headers = {}, rawBody, context } = {}) => worker.fetch(new Request('https://neutral-sync.test' + path, {
    method,
    headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  }), env, context);
  const admin = await (await call('/auth/login', { method: 'POST', body: { username: 'TYC', password: 'Neutral-Admin-Only' } })).json();
  const alice = await (await call('/auth/register', { method: 'POST', body: { username: 'NeutralAlice', password: 'Neutral-Free-Only' } })).json();
  const bob = await (await call('/auth/register', { method: 'POST', body: { username: 'NeutralBob', password: 'Neutral-Free-Only' } })).json();
  if (!admin.token || !alice.token || !bob.token) throw Error('Neutral authenticated fixture could not be created');
  return { DB, env, call, admin, alice, bob };
}

export const nativeDocument = (id = 'conversation-neutral-1') => ({
  id, sessionId: id, name: '中性跨设备对话', preview: 'Neutral fixture', ephemeral: false,
  createdAt: 1794870000, updatedAt: 1794870010, recencyAt: 1794870010,
  model: 'gpt-6.1-sol', reasoningEffort: 'low', status: { type: 'idle' }, archived: false,
  cwd: '/mnt/data', path: null, mode: 'default', threadSource: 'user',
  adapterMetadata: { conversationOrigin: 'tpp', classicRootId: 'neutral-root-id', selectionMode: 'auto', clientMetadata: null },
  turns: [{ id: 'neutral-turn', status: 'completed', model: 'gpt-6.1-sol', reasoningEffort: 'low',
    input: [{ type: 'text', text: '只保存这条中性历史。' }], items: [{ id: 'neutral-answer', type: 'agentMessage', text: '已完成。' }],
    adapterMetadata: { classicUserMessage: { author: { role: 'user' }, content: { content_type: 'text', parts: ['只保存这条中性历史。'] } } },
  }],
});

export const mutation = (document = nativeDocument(), baseRevision = 0, mutationId = crypto.randomUUID()) => ({ baseRevision, mutationId, document });
export const save = (fixture, actor, id, body) => fixture.call('/sync/conversations/' + encodeURIComponent(id), { method: 'PUT', token: actor.token, body });
