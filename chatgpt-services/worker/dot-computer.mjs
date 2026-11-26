import { desktopConfigured, desktopFrame, desktopInput, desktopSeconds, desktopSize, desktopTask, createDesktop, stopDesktop } from './linux-desktop.mjs';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const prefix = '/dot-computer/v1';
const encoder = new TextEncoder();
const active = "status IN ('starting', 'ready')";
const query = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (status, code, message) => json({ error: { code, message } }, status);
const ownerId = actor => actor.role === 'administrator' ? 'site-admin' : 'site-user:' + actor.id;
const changed = result => (result.meta?.changes ?? result.changes) > 0;
const unavailable = () => error(503, 'DOT_COMPUTER_PROVIDER_UNAVAILABLE', '云电脑暂时无法连接。');

function status(row, configured = true) {
  const state = !configured ? 'unconfigured' : row && row.expires_at > Date.now() ? row.status : 'stopped';
  return {
    environmentId: state === 'ready' || state === 'starting' ? row.id : null,
    status: state, kind: 'linux-desktop', ...desktopSize,
    expiresAt: row && ['ready', 'starting'].includes(state) ? row.expires_at : null,
  };
}

async function boot(env, id) {
  let ready = false;
  try {
    await createDesktop(env, id);
    const saved = await query(env, `UPDATE dot_computers
      SET status='ready', provider_id=?
      WHERE id=? AND status='starting' AND expires_at>?`, id, id, Date.now()).run();
    ready = changed(saved);
  } catch {
    await query(env, "UPDATE dot_computers SET status='failed' WHERE id=? AND status='starting'", id).run();
  } finally {
    // A simultaneous stop or a startup failure must not leave a desktop running.
    if (!ready) await stopDesktop(env, id).catch(() => {});
  }
}

async function threadDesktop(request, env, ctx, owner, thread, operation) {
  const current = () => query(env, 'SELECT id, status, expires_at FROM dot_computers WHERE owner_id=? AND thread_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1', owner, thread).first();
  const wake = operation === 'wake' && request.method === 'POST';
  if (!wake && (operation || request.method !== 'GET')) return error(405, 'DOT_COMPUTER_METHOD', '请求方式无效。');
  if (!desktopConfigured(env)) return json(status(null, false));
  const previous = status(await current());
  if (!wake || ['starting', 'ready'].includes(previous.status)) return json(previous);

  const now = Date.now();
  const id = crypto.randomUUID();
  const expires = now + desktopSeconds * 1000;
  // Admission is one D1 write so two requests from different tabs cannot provision twice.
  const inserted = await query(env, `INSERT INTO dot_computers (owner_id, thread_id, id, status, created_at, expires_at)
    SELECT ?,?,?,'starting',?,?
    WHERE NOT EXISTS (SELECT 1 FROM dot_computers WHERE owner_id=? AND ${active} AND expires_at>?)
      AND (SELECT COUNT(*) FROM dot_computers WHERE ${active} AND expires_at>?) < 2`, owner, thread, id, now, expires, owner, now, now).run();
  if (!changed(inserted)) {
    const attached = status(await current());
    if (['starting', 'ready'].includes(attached.status)) return json(attached);
    return error(409, 'DOT_COMPUTER_CAPACITY', '已有云电脑任务运行，请结束当前云电脑或稍后再试。');
  }
  const work = boot(env, id);
  if (ctx?.waitUntil) ctx.waitUntil(work);
  else await work;
  await query(env, 'DELETE FROM dot_computers WHERE expires_at<?', now - 86400000).run();
  return json(status(await current()));
}

async function requestBody(request, maximum) {
  if (Number(request.headers.get('Content-Length')) > maximum) return null;
  try {
    let length = 0;
    let raw = '';
    const stream = request.body?.pipeThrough(new TextDecoderStream());
    if (!stream) return null;
    for await (const part of stream) {
      length += part.length;
      if (length > maximum) return null;
      raw += part;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runTask(request, env, ctx, row) {
  const supplied = await requestBody(request, 20000);
  const { code, requestId } = supplied ?? {};
  if (typeof code !== 'string' || !code.trim() || code.length > 4000 || code.includes('\u0000') || !uuid.test(requestId ?? '')) {
    return error(400, 'DOT_COMPUTER_INVALID_TASK', '云电脑任务格式不正确。');
  }
  const codeHash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(code)))));
  const read = () => query(env, 'SELECT code_hash, status, result, created_at FROM dot_computer_tasks WHERE environment_id=? AND id=?', row.id, requestId).first();
  const receipt = task => {
    if (task.code_hash !== codeHash) return error(409, 'DOT_COMPUTER_TASK_CONFLICT', '该任务标识已经用于另一个云电脑任务。');
    if (task.result) return json(JSON.parse(task.result));
    if (task.created_at < Date.now() - 30000) return error(409, 'DOT_COMPUTER_TASK_INTERRUPTED', '云电脑任务结果暂时无法确认。');
    return json({ status: 'running' }, 202);
  };
  const existing = await read();
  if (existing) return receipt(existing);
  const now = Date.now();
  if (row.status !== 'ready' || row.expires_at <= now) return error(409, 'DOT_COMPUTER_NOT_READY', '请先启动当前会话的云电脑。');
  const started = await query(env, `INSERT OR IGNORE INTO dot_computer_tasks (environment_id, id, code_hash, status, created_at)
    SELECT ?,?,?,'running',?
    WHERE EXISTS (SELECT 1 FROM dot_computers WHERE id=? AND status='ready' AND expires_at>?)
      AND NOT EXISTS (SELECT 1 FROM dot_computer_tasks WHERE environment_id=? AND status='running' AND created_at>?)`,
  row.id, requestId, codeHash, now, row.id, now, row.id, now - 30000).run();
  if (!changed(started)) {
    const attached = await read();
    return attached ? receipt(attached) : error(409, 'DOT_COMPUTER_TASK_BUSY', '云电脑中已有任务运行，请稍后再试。');
  }
  const work = (async () => {
    let result;
    try {
      const run = await desktopTask(env, row.provider_id, code, requestId);
      result = { status: run.exitCode === 0 ? 'complete' : 'failed', ...run };
    } catch {
      result = { status: 'failed', stdout: '', stderr: '云电脑任务结果暂时无法确认。', exitCode: null };
    }
    await query(env, 'UPDATE dot_computer_tasks SET status=?, result=? WHERE environment_id=? AND id=?', result.status, JSON.stringify(result), row.id, requestId).run();
    return result;
  })();
  ctx?.waitUntil?.(work);
  return json(await work);
}

async function environmentDesktop(request, env, ctx, owner, id, operation) {
  if (!desktopConfigured(env)) return unavailable();
  const row = await query(env, 'SELECT * FROM dot_computers WHERE owner_id=? AND id=?', owner, id).first();
  if (!row) return error(404, 'DOT_COMPUTER_NOT_FOUND', '此云电脑不存在。');
  if (!operation && request.method === 'DELETE') {
    if (row.provider_id) {
      try { await stopDesktop(env, row.provider_id); } catch { return unavailable(); }
    }
    await query(env, "UPDATE dot_computers SET status='stopped', provider_id=NULL WHERE id=?", id).run();
    return json(status(null));
  }
  if (operation === 'task' && request.method === 'POST') return runTask(request, env, ctx, row);
  if (status(row).status !== 'ready') {
    if (row.status === 'ready' && row.provider_id) {
      const closing = stopDesktop(env, row.provider_id).catch(() => {});
      ctx?.waitUntil?.(closing);
    }
    return error(409, 'DOT_COMPUTER_NOT_READY', '云电脑已停止或尚未启动。');
  }
  try {
    if (operation === 'frame' && request.method === 'GET') {
      const png = await desktopFrame(env, row.provider_id);
      return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
    }
    if (operation === 'input' && request.method === 'POST') {
      const input = await requestBody(request, 24000);
      if (!input) return error(400, 'DOT_COMPUTER_INVALID_INPUT', '云电脑输入格式不正确。');
      await desktopInput(env, row.provider_id, input);
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (cause) {
    if (cause?.status === 400) return error(400, 'DOT_COMPUTER_INVALID_INPUT', '云电脑输入格式不正确。');
    if ([404, 410].includes(cause?.status)) {
      await query(env, "UPDATE dot_computers SET status='stopped', provider_id=NULL WHERE id=? AND status='ready'", id).run();
      return error(409, 'DOT_COMPUTER_NOT_READY', '云电脑已结束。请重新启动。');
    }
    return unavailable();
  }
  return error(405, 'DOT_COMPUTER_METHOD', '请求方式无效。');
}

export function handleDotComputer(request, env, ctx, actor, entitled) {
  if (!actor) return error(401, 'SITE_AUTH_REQUIRED', '请先登录本站账户。');
  if (!entitled) return error(403, 'DOT_COMPUTER_PLAN_REQUIRED', '此套餐不包含云电脑功能。');
  const path = new URL(request.url).pathname;
  if (!path.startsWith(prefix + '/')) return error(404, 'DOT_COMPUTER_NOT_FOUND', '云电脑接口不存在。');
  const parts = path.slice(prefix.length + 1).split('/');
  const [kind, id, operation] = parts;
  if ((parts.length === 2 || parts.length === 3 && operation) && uuid.test(id ?? '')) {
    if (typeof env.DB.withSession === 'function') env = { ...env, DB: env.DB.withSession('first-primary') };
    if (kind === 'threads') return threadDesktop(request, env, ctx, ownerId(actor), id, operation);
    if (kind === 'environments') return environmentDesktop(request, env, ctx, ownerId(actor), id, operation);
  }
  return error(404, 'DOT_COMPUTER_NOT_FOUND', '云电脑接口不存在。');
}
