import { spawn } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { access, lstat, mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const screenWidth = 1024;
export const screenHeight = 720;
const helper = fileURLToPath(new URL('./x11.py', import.meta.url));
const cleanEnv = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' });
const failure = (status, code, message) => Object.assign(Error(message), { status, code });
const sandboxError = () => failure(503, 'SANDBOX_UNAVAILABLE', 'The configured Linux task sandbox is unavailable.');
const displayError = () => failure(503, 'DISPLAY_UNAVAILABLE', 'The isolated X11 desktop is unavailable.');
const readyMarker = 'TYC_DOT_PYTHON_READY\n';
const launchCode = [
  'import resource, sys',
  'for name, value in (("CPU", 3), ("AS", 268435456), ("FSIZE", 1048576), ("NOFILE", 32), ("NPROC", 12), ("CORE", 0)):',
  '    resource.setrlimit(getattr(resource, "RLIMIT_" + name), (value, value))',
  'sys.stderr.write("TYC_DOT_PYTHON_READY\\n")',
  'sys.stderr.flush()',
  'exec(compile(sys.stdin.read(), "<dot-task>", "exec"), {"__name__": "__main__"})',
].join('\n');

async function exists(path) { return stat(path).then(() => true, () => false); }
function launch(binary, args, options = {}) {
  const child = spawn(binary, args, { env: cleanEnv, stdio: ['pipe', 'pipe', 'pipe'], ...options });
  // The close promise also resolves when a program was unavailable.
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  child.on('error', () => {});
  child.stdin?.on('error', () => {});
  return { child, closed, stop: async () => { child.kill('SIGKILL'); await closed; } };
}

async function collect(binary, args, { signal, input = '', timeout = 8000, outputLimit = 32_768 } = {}) {
  signal?.throwIfAborted();
  const process = launch(binary, args);
  let timedOut = false, oversized = false;
  const outputs = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 };
  for (const name of ['stdout', 'stderr']) process.child[name].on('data', chunk => {
    const left = outputLimit - sizes[name];
    if (left > 0) outputs[name].push(chunk.subarray(0, left));
    sizes[name] += chunk.length;
    if (sizes[name] > outputLimit) { oversized = true; process.child.kill('SIGKILL'); }
  });
  const abort = () => process.child.kill('SIGKILL');
  const timer = setTimeout(() => { timedOut = true; abort(); }, timeout);
  signal?.addEventListener('abort', abort, { once: true });
  process.child.stdin.end(input);
  const status = await process.closed;
  clearTimeout(timer);
  signal?.removeEventListener('abort', abort);
  signal?.throwIfAborted();
  return { ...status, timedOut, oversized, stdout: Buffer.concat(outputs.stdout).toString('utf8'), stderr: Buffer.concat(outputs.stderr).toString('utf8') };
}

function makeAuthority(display) {
  // FamilyWild scopes this credential to the explicit display number. The
  // private file is shared only with that X server and its own sandbox/client.
  const family = Buffer.alloc(2);
  family.writeUInt16BE(65535);
  const pair = value => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const length = Buffer.alloc(2);
    length.writeUInt16BE(bytes.length);
    return [length, bytes];
  };
  return Buffer.concat([family, ...pair(''), ...pair(String(display)), ...pair('MIT-MAGIC-COOKIE-1'), ...pair(randomBytes(16))]);
}

function connectX11(python, session) {
  const process = launch(python, [helper], { env: { ...cleanEnv, ...session.env } });
  process.child.stderr.resume();
  const lines = createInterface({ input: process.child.stdout, crlfDelay: Infinity });
  let reply, disposed = false, queued = 0, chain = Promise.resolve();
  let accept, reject;
  const ready = new Promise((resolve, deny) => { accept = resolve; reject = deny; });
  const die = () => {
    if (disposed) return;
    disposed = true;
    reject(displayError());
    reply?.reject(displayError());
    lines.close();
    process.child.kill('SIGKILL');
  };
  const timer = setTimeout(die, 4000);
  lines.on('line', line => {
    try {
      if (line.length > 4_100_000) return die();
      const result = JSON.parse(line);
      if (result.ready === true) { clearTimeout(timer); accept(); return; }
      if (!reply) return die();
      if (result.error) {
        reply.reject(result.error === 'input' ? failure(400, 'UNSUPPORTED_DESKTOP_INPUT', 'The X11 key is unavailable.') : displayError());
      } else if (result.ok) reply.resolve(result);
      else die();
    } catch { die(); }
  });
  void process.closed.then(() => { clearTimeout(timer); die(); });

  async function request(command) {
    if (queued >= 24) throw failure(429, 'DESKTOP_INPUT_BUSY', 'The desktop has too many pending controls.');
    queued++;
    const operation = chain.then(async () => {
      await ready;
      if (disposed) throw displayError();
      let deadline;
      try {
        return await new Promise((resolve, reject) => {
          reply = { resolve, reject };
          deadline = setTimeout(die, 5000);
          process.child.stdin.write(JSON.stringify(command) + '\n');
        });
      } finally { clearTimeout(deadline); reply = null; }
    });
    chain = operation.catch(() => {});
    try { return await operation; }
    finally { queued--; }
  }
  return { ready, request, close: async () => { clearTimeout(timer); die(); await process.closed; } };
}

export function createLinuxDesktopRuntime({ python = '/usr/bin/python3', xvfb = '/usr/bin/Xvfb', bwrap = '/usr/bin/bwrap' } = {}) {
  if (process.platform !== 'linux') throw TypeError('The desktop provider requires Linux.');
  const slots = new Set();
  let checked;

  async function runSandbox(config, workspace, session, code, signal) {
    const args = [
      '--unshare-all', '--disable-userns', '--as-pid-1', '--die-with-parent', '--new-session', '--cap-drop', 'ALL', '--clearenv',
      '--setenv', 'PATH', '/usr/bin', '--setenv', 'HOME', '/workspace', '--setenv', 'LANG', 'C.UTF-8',
      ...config.binds, '--proc', '/proc', '--dev', '/dev', '--size', '16777216', '--tmpfs', '/tmp',
      '--ro-bind', workspace, '/workspace', '--chdir', '/workspace',
    ];
    if (session) args.push(
      '--dir', '/tmp/.X11-unix', '--ro-bind', session.socket, session.socket,
      '--ro-bind', session.authority, '/run/dot/Xauthority',
      '--setenv', 'DISPLAY', session.env.DISPLAY, '--setenv', 'XAUTHORITY', '/run/dot/Xauthority',
    );
    args.push(config.python, '-I', '-B', '-S', '-X', 'utf8', '-c', launchCode);
    const result = await collect(bwrap, args, { signal, input: code });
    const start = result.stderr.indexOf(readyMarker);
    if (start < 0) throw sandboxError();
    const stderr = result.stderr.slice(start + readyMarker.length);
    if (result.timedOut) return { exitCode: 124, stdout: result.stdout, stderr: stderr + '\nTask exceeded its wall-clock limit.' };
    if (result.oversized) return { exitCode: 125, stdout: result.stdout, stderr: stderr + '\nTask exceeded its output limit.' };
    return { exitCode: result.code ?? 137, stdout: result.stdout, stderr };
  }

  function probe() {
    if (checked) return checked;
    checked = (async () => {
      try { await Promise.all([access(xvfb), access(bwrap), access(python), access(helper)]); }
      catch { throw failure(503, 'LINUX_DEPENDENCY_UNAVAILABLE', 'Xvfb, Bubblewrap or Python is unavailable.'); }
      const realPython = await realpath(python);
      const runtime = await collect(python, ['-I', '-B', '-S', '-c',
        'import ctypes, sysconfig; ctypes.CDLL("libX11.so.6"); ctypes.CDLL("libXtst.so.6"); print(sysconfig.get_path("stdlib"))']);
      if (runtime.code !== 0) throw failure(503, 'X11_DEPENDENCY_UNAVAILABLE', 'Python requires libX11 and libXtst.');
      const stdlib = runtime.stdout.trim();
      if (!/^\/usr\/(?:local\/)?lib\/python[0-9.]+$/.test(stdlib) || !/^\/usr\/(?:local\/)?bin\/python[0-9.]+$/.test(realPython)) {
        throw sandboxError();
      }
      const libraries = ['/usr/lib', '/usr/lib64', '/lib', '/lib64'];
      if (!stdlib.startsWith('/usr/lib/')) libraries.push(stdlib);
      const mounts = (await Promise.all(libraries.map(async path => await exists(path) ? ['--ro-bind', path, path] : []))).flat();
      const config = { python: realPython, binds: [...mounts, '--ro-bind', realPython, realPython] };
      const workspace = await mkdtemp(join(tmpdir(), 'tyc-dot-probe-'));
      try {
        if ((await runSandbox(config, workspace, null, 'pass')).exitCode !== 0) throw sandboxError();
      } finally { await rm(workspace, { recursive: true, force: true }); }
      return config;
    })();
    void checked.catch(() => { checked = null; });
    return checked;
  }

  async function allocate() {
    for (let tries = 0; tries < 30; tries++) {
      const number = randomInt(200, 20_000);
      if (slots.has(number)) continue;
      slots.add(number);
      const socket = '/tmp/.X11-unix/X' + number;
      if (!(await exists(socket)) && !(await exists('/tmp/.X' + number + '-lock'))) return { number, socket };
      slots.delete(number);
    }
    throw displayError();
  }

  async function start({ signal }) {
    const config = await probe();
    signal?.throwIfAborted();
    const { number, socket } = await allocate();
    let root, x, control, closed;
    const close = () => closed ??= (async () => {
      await Promise.allSettled([control?.close(), x?.stop()]);
      slots.delete(number);
      if (root) await rm(root, { recursive: true, force: true });
    })();
    try {
      root = await mkdtemp(join(tmpdir(), 'tyc-dot-desktop-'));
      const authority = join(root, 'Xauthority'), workspace = join(root, 'workspace');
      await mkdir(workspace, { mode: 0o700 });
      await writeFile(authority, makeAuthority(number), { mode: 0o600, flag: 'wx' });
      const env = { DISPLAY: ':' + number, XAUTHORITY: authority, HOME: workspace };
      const session = { socket, authority, env };
      x = launch(xvfb, [env.DISPLAY, '-screen', '0', screenWidth + 'x' + screenHeight + 'x24',
        '-nolisten', 'tcp', '-auth', authority, '-noreset', '-dpi', '96'], { env: { ...cleanEnv, ...env }, stdio: ['ignore', 'ignore', 'ignore'] });
      const started = Date.now();
      while (!(await lstat(socket).then(entry => entry.isSocket(), () => false))) {
        signal?.throwIfAborted();
        if (Date.now() - started >= 3000 || x.child.exitCode !== null || !x.child.pid) throw displayError();
        await wait(40);
      }
      control = connectX11(python, session);
      await control.ready;
      const probeDisplay = [
        'import ctypes',
        'x11 = ctypes.CDLL("libX11.so.6")',
        'x11.XOpenDisplay.argtypes = [ctypes.c_char_p]',
        'x11.XOpenDisplay.restype = ctypes.c_void_p',
        'if not x11.XOpenDisplay(None): raise RuntimeError("Cannot open isolated display")',
      ].join('\n');
      if ((await runSandbox(config, workspace, session, probeDisplay, signal)).exitCode !== 0) throw displayError();
      return {
        async frame() {
          const value = await control.request({ type: 'frame' });
          const png = Buffer.from(value.png ?? '', 'base64');
          if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== screenWidth || png.readUInt32BE(20) !== screenHeight) throw displayError();
          return png;
        },
        input: value => control.request(value),
        task: (code, taskSignal) => runSandbox(config, workspace, session, code, taskSignal),
        close,
      };
    } catch (cause) {
      await close();
      throw cause;
    }
  }

  return { start, probe };
}
