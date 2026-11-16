import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { attemptKey } from './protocol.mjs';
import { BridgeError } from './constants.mjs';
export class JobJournal {
  constructor(store) { this.store = store; }
  key(id) { return 'jobs/' + crypto.createHash('sha256').update(String(id)).digest('hex'); }
  async load(id) {
    const key = this.key(id), state = await this.store.read(key + '.json', { jobId: id, nextSeq: 0, ackedSeq: -1, attempts: [] });
    let text; try { text = await fs.readFile(this.store.resolve(key + '.jsonl'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; text = ''; }
    const complete = text.lastIndexOf('\n') + 1, events = text.slice(0, complete).split('\n').filter(Boolean).map(line => JSON.parse(line));
    if (complete !== text.length) await fs.truncate(this.store.resolve(key + '.jsonl'), Buffer.byteLength(text.slice(0, complete)));
    state.nextSeq = Math.max(state.nextSeq, (events.at(-1)?.seq ?? -1) + 1);
    return { state, events: events.filter(event => event.seq > state.ackedSeq) };
  }
  async save(state) { await this.store.write(this.key(state.jobId) + '.json', state); }
  async append(state, data) {
    const events = data.map(item => ({ seq: state.nextSeq++, data: item }));
    const handle = await fs.open(this.store.resolve(this.key(state.jobId) + '.jsonl'), 'a', 0o600);
    try { await handle.writeFile(events.map(event => JSON.stringify(event)).join('\n') + '\n'); await handle.sync(); } finally { await handle.close(); }
    await this.save(state); return events;
  }
  async claim(job) {
    if (typeof job.id !== 'string' || !job.id) throw new BridgeError('INVALID_JOB', 'Bridge poll returned a job without an ID');
    const loaded = await this.load(job.id), attempt = attemptKey(job), previous = loaded.state.attempts.find(value => value.key === attempt);
    if (previous) return { ...loaded, attempt: previous, fresh: false };
    const entry = { key: attempt, phase: 'admitted', startedAt: Date.now() }; loaded.state.attempts.push(entry); loaded.state.activeAttempt = attempt; await this.save(loaded.state);
    return { ...loaded, attempt: entry, fresh: true };
  }
}
