let csrf, current; const element = id => document.getElementById(id);
async function refresh() {
  const response = await fetch('/local/status', { cache: 'no-store' }); if (!response.ok) return; current = await response.json(); csrf = current.csrf;
  const selected = element('accounts').value; element('accounts').replaceChildren(new Option('添加新 ChatGPT 账号', ''), ...current.accounts.map(account => new Option(account.label + (account.active ? '（当前）' : ''), account.id))); if ([...element('accounts').options].some(option => option.value === selected)) element('accounts').value = selected;
  element('paired').textContent = current.bridge.paired ? '已配对本站：' + current.bridge.siteOrigin : '尚未配对。';
  const active = current.accounts.find(account => account.active); element('account-status').textContent = !active ? '尚未授权活动 ChatGPT 账号。' : active.planUseEnabled ? '已验证身份并获得计划使用授权；官方计划类型未核验。' : '已保存身份，但未获得有效的计划使用权限。';
  element('running').textContent = current.bridge.running ? '本机程序正在接收任务。' : '本机任务接收已停止。'; element('job').textContent = current.bridge.jobId ? '当前任务：' + current.bridge.jobId : '当前没有正在处理的任务。';
  element('signin').disabled = !current.bridge.paired; element('enable').disabled = !current.bridge.paired;
  if (current.bridge.lastError) element('status').textContent = current.bridge.lastError.code + '：' + current.bridge.lastError.message;
}
async function post(path, body = {}) { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bridge-CSRF': csrf }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw Error(data.error?.message || '本机操作失败'); return data; }
async function action(run) { try { element('status').textContent = '正在处理…'; const result = await run(); element('status').textContent = result?.remoteRevocationConfirmed === false ? '本机凭证已清除，但未确认远程撤销。可在 ChatGPT 设置中断开该应用。' : '操作已完成。'; await refresh(); } catch (error) { element('status').textContent = error.message; } }
element('pair').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget, username = form.elements.username.value, password = form.elements.password.value; form.elements.password.value = ''; action(() => post('/local/pair', { username, password })); });
async function signin(enablePlan) { const value = await post('/local/oauth/start', { selectedId: element('accounts').value || null, enablePlan }); location.assign(value.launchPath); }
element('signin').onclick = () => action(() => signin(false)); element('enable').onclick = () => action(() => signin(true));
element('select').onclick = () => action(() => post('/local/account/select', { id: element('accounts').value }));
element('signout').onclick = () => action(() => post('/local/account/signout', { id: element('accounts').value }));
element('start').onclick = () => action(() => post('/local/start')); element('stop').onclick = () => action(() => post('/local/stop')); element('quota').onclick = () => action(() => post('/local/usage/retry'));
await refresh(); setInterval(() => refresh().catch(() => { element('status').textContent = '本机程序未连接。'; }), 3000);
