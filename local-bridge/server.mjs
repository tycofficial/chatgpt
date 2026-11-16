import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ProtectedStore } from './secure-store.mjs';
import { OpenAiSessions } from './oauth.mjs';
import { BridgeClient, OfficialResponses } from './bridge-client.mjs';
import { loadJose } from './dependencies.mjs';
import { STATE_DIRECTORY, BridgeError, diagnostic } from './constants.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
async function jsonBody(request) { let bytes = 0, value = ''; for await (const chunk of request) { bytes += chunk.length; if (bytes > 32768) throw new BridgeError('BODY_TOO_LARGE', 'Local setup request exceeds its size limit'); value += chunk; } return value ? JSON.parse(value) : {}; }
export function createLocalUi({ store, sessions, official, bridge, port = 1455 }) {
  const launch = crypto.randomBytes(32).toString('base64url'), cookie = crypto.randomBytes(32).toString('base64url'), csrf = crypto.randomBytes(32).toString('base64url');
  let origin, server;
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" };
  const authenticated = request => same((request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('bridge_ui='))?.slice(10), cookie);
  const uiCookie = () => `bridge_ui=${cookie}; HttpOnly; SameSite=Strict; Path=/`;
  const send = (response, data, status = 200) => { response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(data)); };
  const redirect = (response, location, authenticate = false) => { response.writeHead(303, { ...headers, Location: location, ...(authenticate ? { 'Set-Cookie': uiCookie() } : {}) }); response.end(); };
  const handler = async (request, response) => {
    try {
      if (request.headers.host !== new URL(origin).host) return send(response, { error: { code: 'INVALID_HOST', message: 'This management UI accepts only its exact 127.0.0.1 host' } }, 403);
      const url = new URL(request.url, origin); if (url.origin !== origin) throw new BridgeError('INVALID_ORIGIN', 'Unexpected local origin');
      if (url.pathname === '/auth/callback' && request.method === 'GET') {
        try { await sessions.callback(url); redirect(response, '/', true); }
        catch (error) { response.writeHead(400, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }); response.end('<!doctype html><meta charset="utf-8"><title>授权未完成</title><p>' + escape(diagnostic(error).message) + '</p><a href="/">返回本机界面</a>'); }
        return;
      }
      if (url.pathname === '/' && request.method === 'GET' && same(url.searchParams.get('launch'), launch)) { redirect(response, '/', true); return; }
      if (!authenticated(request)) return send(response, { error: { code: 'LOCAL_UI_AUTH_REQUIRED', message: '请运行 Open-UI.ps1，从本机受保护的启动文件打开管理界面。' } }, 403);
      if (request.method === 'GET' && ['/', '/client.js', '/style.css'].includes(url.pathname)) {
        const file = url.pathname === '/' ? 'ui.html' : url.pathname.slice(1); response.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8' }); response.end(await fs.readFile(path.join(here, file))); return;
      }
      if (request.method === 'GET' && url.pathname === '/local/status') {
        const accounts = await sessions.accounts(), registrations = [];
        for (const account of accounts.registrations) { const credential = account.verified ? await sessions.credential(account.id) : null; registrations.push({ id: account.id, label: account.label + ' · ' + account.clientId.slice(-6), email: account.email || null, verified: account.verified, active: accounts.activeId === account.id, planUseEnabled: Boolean(credential?.planUseEnabled && credential?.access_token), renewable: Boolean(credential?.refresh_token), expiresAt: credential?.expiresAt || null }); }
        send(response, { csrf, bridge: await bridge.status(), accounts: registrations, activeId: accounts.activeId, official: { planType: null, usageUrl: 'https://chatgpt.com/settings/usage' } }); return;
      }
      if (request.method === 'GET' && /^\/local\/oauth\/launch\//.test(url.pathname)) { redirect(response, sessions.launch(url.pathname.split('/').at(-1))); return; }
      if (request.method !== 'POST') return send(response, { error: { code: 'NOT_FOUND', message: 'Local endpoint not found' } }, 404);
      if (request.headers.origin !== origin || !same(request.headers['x-bridge-csrf'], csrf) || !String(request.headers['content-type']).startsWith('application/json')) return send(response, { error: { code: 'CSRF_REJECTED', message: 'Local setup request could not be verified' } }, 403);
      const body = await jsonBody(request);
      if (url.pathname === '/local/pair') { const result = await bridge.pair(body.username, body.password); body.password = null; send(response, result); }
      else if (url.pathname === '/local/oauth/start') { if (!(await bridge.status()).paired) throw new BridgeError('PAIR_FIRST', '先使用本站管理员账号配对本机桥接程序'); const attempt = await sessions.start({ redirectUri: origin + '/auth/callback', selectedId: body.selectedId || null, enablePlan: body.enablePlan === true }); send(response, { launchPath: '/local/oauth/launch/' + attempt.launchId, expiresAt: attempt.expiresAt }); }
      else if (url.pathname === '/local/account/select') { await bridge.stop(); await sessions.select(body.id); bridge.start(); send(response, { ok: true }); }
      else if (url.pathname === '/local/account/signout') { await bridge.stop(); send(response, await sessions.signOut(body.id)); }
      else if (url.pathname === '/local/start') { bridge.start(); send(response, { running: true }); }
      else if (url.pathname === '/local/stop') { await bridge.stop(); send(response, { running: false }); }
      else if (url.pathname === '/local/usage/retry') { await official.clearUsagePause(); send(response, { ok: true }); }
      else send(response, { error: { code: 'NOT_FOUND', message: 'Local endpoint not found' } }, 404);
    } catch (error) { send(response, { error: diagnostic(error) }, 400); }
  };
  return {
    async start() {
      server = http.createServer((request, response) => handler(request, response).catch(() => { if (!response.headersSent) send(response, { error: { code: 'LOCAL_SERVER_ERROR', message: 'Local bridge operation failed' } }, 500); else response.destroy(); }));
      const listen = selected => new Promise((resolve, reject) => { const error = value => { server.off('listening', ready); reject(value); }; const ready = () => { server.off('error', error); resolve(); }; server.once('error', error); server.once('listening', ready); server.listen(selected, '127.0.0.1'); });
      try { await listen(port); } catch (error) { if (error.code !== 'EADDRINUSE' || port === 0) throw error; await listen(0); }
      origin = 'http://127.0.0.1:' + server.address().port;
      await store.write('ui.json', { pid: process.pid, origin, launchUrl: origin + '/?launch=' + launch, startedAt: Date.now() });
      return { origin };
    },
    async close() { await bridge.stop(); if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}
export async function main() {
  const store = await new ProtectedStore(STATE_DIRECTORY).initialize();
  await store.withLock('program-instance', async () => {
    const jose = await loadJose(), sessions = new OpenAiSessions({ store, jose }), official = new OfficialResponses({ sessions, store }), bridge = new BridgeClient({ store, sessions, official });
    const ui = createLocalUi({ store, sessions, official, bridge }); await ui.start();
    // Existing, explicitly paired sessions can serve work; no OAuth starts here.
    bridge.start(); console.log('本机桥接界面已准备。运行 local-bridge/Open-UI.ps1 打开；OAuth 尚未自动启动。');
    await new Promise(resolve => { let closing = false; const close = () => { if (closing) return; closing = true; ui.close().finally(resolve); }; process.once('SIGINT', close); process.once('SIGTERM', close); });
  }, { timeoutMs: 1500 });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(diagnostic(error).message); process.exitCode = 1; });
