import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createDotDesktopServer } from './index.mjs';
import { createLinuxDesktopRuntime } from './linux-desktop.mjs';

const exec = promisify(execFile);
const linux = process.platform === 'linux';

test('the trusted X11 helper captures live 1024x720 pixels, input state and UTF-8 clipboard', { skip: !linux }, async () => {
  const fixture = fileURLToPath(new URL('./x11-live-test.py', import.meta.url));
  const run = await exec('/usr/bin/python3', [fixture], { timeout: 20_000 });
  assert.match(run.stdout, /Frame 1024x720, visible pixel change, pointer and keys, UTF-8 clipboard/);
});

const newColor = "import ctypes as c\nx=c.CDLL(\"libX11.so.6\")\nd=c.c_void_p\nu=c.c_ulong\ni=c.c_int\nx.XOpenDisplay.restype=d\nx.XDefaultRootWindow.argtypes=[d]\nx.XDefaultRootWindow.restype=u\nx.XSetWindowBackground.argtypes=[d,u,u]\nx.XClearWindow.argtypes=[d,u]\nx.XSync.argtypes=[d,i]\np=x.XOpenDisplay(None)\nr=x.XDefaultRootWindow(p)\nx.XSetWindowBackground(p,r,0x2739ab)\nx.XClearWindow(p,r)\nx.XSync(p,0)\nprint(17*13)";

test('real Linux HTTP provider draws pixels with confined Python and preserves request identity', { skip: !linux }, async t => {
  const runtime = createLinuxDesktopRuntime();
  try { await runtime.probe(); }
  catch (error) {
    if (error.code !== 'SANDBOX_UNAVAILABLE' || process.env.QA_REQUIRE_DOT_SANDBOX === '1') throw error;
    t.skip('Hosted runner denied the strict Bubblewrap namespace setup');
    return;
  }

  const token = 'synthetic-integration-desktop-token-0000';
  const host = createDotDesktopServer({ token, runtime });
  const markerRoot = await mkdtemp(join(tmpdir(), 'outside-dot-task-test-'));
  const marker = join(markerRoot, 'isolation-marker');
  await writeFile(marker, 'fixture file outside the sandbox', { mode: 0o600 });
  t.after(async () => { await host.close(); await rm(markerRoot, { recursive: true, force: true }); });
  const origin = await host.listen(0);
  const request = (path, method = 'GET', body) => fetch(origin + path, {
    method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const id = randomUUID(), path = '/v1/desktops/' + id;
  const created = await request('/v1/desktops', 'POST', { id, ttlSeconds: 30 });
  assert.equal(created.status, 200, await created.clone().text());
  assert.deepEqual(await created.json(), { id });
  const grab = async () => {
    const png = await request(path + '/frame');
    assert.equal(png.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await png.arrayBuffer());
    assert.equal(bytes.readUInt32BE(16), 1024);
    assert.equal(bytes.readUInt32BE(20), 720);
    return bytes;
  };
  const before = await grab();
  const task = async (code, requestId = randomUUID()) => {
    const response = await request(path + '/task', 'POST', { code, requestId });
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  const requestId = randomUUID();
  const exact = { exitCode: 0, stdout: '221\n', stderr: '' };
  assert.deepEqual(await task(newColor, requestId), exact);
  assert.deepEqual(await task(newColor, requestId), exact);
  assert.notDeepEqual(await grab(), before);
  assert.equal((await request(path + '/input', 'POST', { type: 'move', x: 13, y: 78 })).status, 204);

  const hostEndpoint = JSON.stringify(['127.0.0.1', Number(new URL(origin).port)]);
  const confinement = [
    'import os,socket',
    'print(os.path.exists(' + JSON.stringify(marker) + '))',
    'print("DOT_DESKTOP_TOKEN" in os.environ)',
    'with socket.socket() as conn:',
    '    conn.settimeout(1)',
    '    print(conn.connect_ex(tuple(' + hostEndpoint + ')) == 0)',
  ].join('\n');
  assert.deepEqual(await task(confinement), { exitCode: 0, stdout: 'False\nFalse\nFalse\n', stderr: '' });
  const slow = await task('import time; time.sleep(30)');
  assert.equal(slow.exitCode, 124);
  assert.match(slow.stderr, /wall-clock limit/);
  assert.equal((await request(path, 'DELETE')).status, 204);
  assert.equal((await request(path + '/frame')).status, 410);
});
