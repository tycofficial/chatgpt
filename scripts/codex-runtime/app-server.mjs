import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { isAbsolute } from 'node:path';
import { createInterface } from 'node:readline';

const timeoutMs = 30_000;

export async function openCodexAppServer({ binary = 'codex', workspace, env }) {
  if (!isAbsolute(workspace) || !env?.CODEX_HOME || !isAbsolute(env.CODEX_HOME)) {
    throw new TypeError('Codex App Server needs absolute workspace and private state directories');
  }
  const process = spawn(binary, ['app-server', '--listen', 'stdio://'], {
    cwd: workspace, env, stdio: ['pipe', 'pipe', 'ignore'],
  });
  const lines = createInterface({ input: process.stdout, crlfDelay: Infinity });
  const events = new EventEmitter();
  const pending = new Map();
  let nextId = 0;
  let disconnected;

  function disconnect(cause) {
    if (disconnected) return;
    disconnected = cause;
    for (const entry of pending.values()) entry.reject(cause);
    events.emit('disconnected', cause);
    lines.close();
  }
  process.once('error', disconnect);
  process.once('exit', (code, signal) => disconnect(Error('Codex App Server exited (' + (signal ?? code) + ')')));
  process.stdin.on('error', disconnect);

  function write(message) {
    if (disconnected) throw disconnected;
    process.stdin.write(JSON.stringify(message) + '\n');
  }
  lines.on('line', line => {
    let message;
    try { message = JSON.parse(line); }
    catch {
      disconnect(Error('Codex App Server emitted invalid JSON'));
      process.kill();
      return;
    }
    if (Object.hasOwn(message, 'id') && message.method) {
      // This pilot has no approval UI. Keep the configured sandbox policy in force.
      write({ id: message.id, error: { code: -32601, message: 'Client request handling is unavailable' } });
      return;
    }
    if (Object.hasOwn(message, 'id')) {
      const outstanding = pending.get(message.id);
      if (message.error) {
        const error = Object.assign(Error(message.error.message), { rpcCode: message.error.code });
        outstanding?.reject(error);
      } else outstanding?.resolve(message.result);
      return;
    }
    if (message.method) events.emit('notification', message);
  });

  async function request(method, params) {
    if (disconnected) throw disconnected;
    const id = ++nextId;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(Error('Codex App Server request timed out: ' + method)), timeoutMs);
        pending.set(id, { resolve, reject });
        write({ id, method, params });
      });
    } finally {
      clearTimeout(timer);
      pending.delete(id);
    }
  }

  function subscribe(listener) {
    events.on('notification', listener);
    return () => events.off('notification', listener);
  }

  async function close() {
    if (process.exitCode !== null || process.signalCode !== null || !process.pid) return;
    const stopped = once(process, 'exit').catch(() => {});
    process.stdin.end();
    const killTimer = setTimeout(() => process.kill('SIGKILL'), 3000);
    try { await stopped; }
    finally { clearTimeout(killTimer); }
  }

  try {
    const server = await request('initialize', {
      clientInfo: { name: 'tyc_chatgpt_site', title: 'ChatGPT site integration', version: '0.1.0' },
    });
    write({ method: 'initialized' });
    function onDisconnect(listener) {
      events.on('disconnected', listener);
      if (disconnected) listener(disconnected);
      return () => events.off('disconnected', listener);
    }
    return { server, request, subscribe, onDisconnect, close };
  } catch (cause) {
    await close();
    throw cause;
  }
}
