import * as account from './site-account.mjs';
import { element, action, renderAnswer } from './workspace-turn-view.mjs';

const planLabels = { free: 'Free', plus: 'Plus', pro: 'Pro' };
const date = value => new Date(value).toLocaleString('zh-CN');

export function renderAuth(kind, panel, onSuccess) {
  const signup = kind === 'signup';
  panel.querySelector('h2').textContent = signup ? '注册本站账户' : '登录本站账户';
  const content = panel.querySelector('.panel-content');
  content.innerHTML = `<form><label>用户名<input name="username" required autocomplete="username" autocapitalize="off" spellcheck="false"></label>
    <label>密码<input name="password" required type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'minlength="8" maxlength="128"' : ''}></label>
    <button type="submit" class="primary">${signup ? '注册' : '登录'}</button><p class="status" role="status"></p></form>`;
  const link = element('a', signup ? '已有账户，登录' : '创建免费账户');
  link.href = (signup ? account.getSiteLoginUrl : account.getSiteRegistrationUrl)(location.href).href;
  content.append(link);
  const form = content.querySelector('form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button'), message = form.querySelector('[role="status"]');
    button.disabled = true;
    message.classList.remove('error');
    message.textContent = signup ? '正在注册…' : '正在验证…';
    try {
      const send = signup ? account.registerSiteAccount : account.loginSiteAccount;
      const session = await send(form.elements.username.value, form.elements.password.value);
      form.elements.password.value = '';
      if (!session || session.role === 'guest') throw Error('账户验证未完成。');
      onSuccess();
    } catch (error) {
      message.classList.add('error');
      message.textContent = error.message || '账户验证失败。';
    } finally { button.disabled = false; }
  });
}

export async function renderPublicShare(root, services, home, id) {
  root.className = 'share-page';
  const back = element('a', '返回 TYC 工作台');
  back.href = home.href;
  root.replaceChildren(back);
  try {
    const snapshot = await services.localConversationShare.read(id);
    root.append(element('h1', snapshot.title));
    for (const { message } of snapshot.linear_conversation) {
      if (!['user', 'assistant'].includes(message?.author?.role)) continue;
      const entry = element('section', null, 'turn'), body = element('div', null, 'answer-markdown');
      const text = (message.content.parts ?? []).filter(value => typeof value === 'string').join('\n');
      entry.append(element('p', message.author.role === 'user' ? '提问' : '助手', 'speaker'), body);
      renderAnswer(body, text);
      root.append(entry);
    }
  } catch (error) { root.append(element('p', error.message, 'error')); }
}

export function createWorkspacePanels({ panel, home, services, prefs, savePrefs, historyItems, openThread, currentThread, applyTheme, onPlanChange }) {
  const title = panel.querySelector('h2');
  const content = panel.querySelector('.panel-content');
  function show(heading) {
    title.textContent = heading;
    content.replaceChildren();
    if (!panel.open) panel.showModal();
  }
  function login() {
    show('本站账户');
    renderAuth('login', panel, () => location.reload());
  }
  function history() {
    show('搜索对话');
    const input = element('input');
    input.type = 'search';
    input.placeholder = '输入标题或消息中的文字';
    input.setAttribute('aria-label', '搜索词');
    const rows = element('div', null, 'panel-list');
    const update = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const matches = historyItems().filter(thread => {
        const text = [thread.name, ...thread.turns.flatMap(turn => turn.items.flatMap(item => item.type === 'agentMessage' ? [item.text] : item.type === 'userMessage' ? item.content.map(part => part.text) : []))];
        return text.some(value => typeof value === 'string' && value.toLocaleLowerCase().includes(query));
      });
      rows.replaceChildren(...matches.slice(0, 100).map(thread => action(thread.name || '未命名对话', () => openThread(thread))));
      if (!matches.length) rows.append(element('p', '没有匹配的对话。', 'muted'));
    };
    input.addEventListener('input', update);
    content.append(input, rows);
    input.focus();
    update();
  }
  function settings() {
    show('设置');
    content.innerHTML = '<form><label>外观<select name="theme"><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label><label>回复偏好<textarea name="instructions" maxlength="1500" rows="4" placeholder="例如：默认用中文回答"></textarea></label><button type="submit" class="primary">保存</button><p class="status" role="status"></p></form>';
    const form = content.querySelector('form');
    form.elements.theme.value = prefs().theme ?? 'system';
    form.elements.instructions.value = prefs().instructions ?? '';
    form.addEventListener('submit', event => {
      event.preventDefault();
      savePrefs({ theme: form.elements.theme.value, instructions: form.elements.instructions.value });
      applyTheme();
      form.querySelector('[role="status"]').textContent = '已保存设置。';
    });
  }
  function plans() {
    show('本站套餐');
    const info = account.getSiteAccount(), plan = planLabels[account.getSitePlanCapabilities().planType];
    content.append(element('p', `当前套餐 ${plan}${info?.siteTrial ? ` · 试用到 ${date(info.siteTrial.expiresAt)}` : ''}`));
    const rows = element('div', null, 'panel-list'), status = element('p', '', 'status');
    status.setAttribute('role', 'status');
    rows.append(element('p', 'Free · 标准 Chat'), element('p', 'Plus · Chat、Work、Codex'), element('p', 'Pro · Chat、Work、Codex、Dot'));
    if (info?.role === 'user') for (const [tier, name] of [['plus', 'Plus'], ['prolite', 'Pro Lite'], ['pro', 'Pro'], ['promax', 'Pro Max']]) {
      rows.append(action(`开启 ${name} 30 天试用`, async () => {
        for (const button of rows.querySelectorAll('button')) button.disabled = true;
        try { await account.claimSiteTrial(tier); onPlanChange(); if (panel.open && rows.isConnected) plans(); }
        catch (error) { status.textContent = error.message; status.classList.add('error'); }
        finally { for (const button of rows.querySelectorAll('button')) button.disabled = false; }
      }));
    }
    if (!info || info.role === 'guest') rows.append(action('登录以查看可用试用', login));
    content.append(rows, status);
  }
  async function usage() {
    show('账单与用量');
    const loading = element('p', '正在读取本站用量…', 'status');
    content.append(loading);
    try {
      if (!account.getSiteSessionToken() && account.getSiteAccount()) await account.refreshSiteAccount();
      const token = account.getSiteSessionToken();
      if (!token) throw Error('请联网登录后查看该账户的本站用量。');
      const response = await fetch(account.SITE_ACCOUNT_SERVICE + '/inference/v1/usage', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error(`用量服务暂时不可用（HTTP ${response.status}）。`);
      const result = await response.json();
      if (!panel.open || !loading.isConnected) return;
      const data = element('dl');
      for (const values of result.sources ?? []) {
        const fields = [['已提交的模型请求', values.requests], ['已完成的模型请求', values.completed], ['可核对的 token 回执', values.token_reports], ['输入 token', values.input_tokens], ['输出 token', values.output_tokens]];
        for (const [name, value] of fields) if (Number.isFinite(value)) data.append(element('dt', name), element('dd', String(value)));
        if (values.freeDaily) data.append(element('dt', '今日免费请求'), element('dd', `${values.freeDaily.requests} / ${values.freeDaily.limit}`));
      }
      const trial = account.getSiteAccount()?.siteTrial;
      content.replaceChildren(element('p', trial ? `本站试用到 ${date(trial.expiresAt)}。` : '当前账户没有正在进行的试用。'), data);
    } catch (error) { loading.textContent = error.message; loading.classList.add('error'); }
  }
  function map() {
    show('地图');
    content.innerHTML = '<form><label>地点<input type="search" name="query" required placeholder="输入地点名称"></label><button type="submit" class="primary">搜索地点</button><p class="status" role="status"></p></form><div class="panel-list"></div>';
    const form = content.querySelector('form'), rows = content.querySelector('.panel-list');
    let frame;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const query = form.elements.query.value.trim();
      if (!query) return;
      const message = form.querySelector('[role="status"]'), button = form.querySelector('button');
      button.disabled = true;
      rows.replaceChildren();
      frame?.remove();
      message.textContent = '正在查询地点…';
      const fallback = element('a', '在 OpenStreetMap 搜索');
      fallback.href = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(query);
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      try {
        const uri = new URL('https://photon.komoot.io/api/');
        uri.search = new URLSearchParams({ q: query, limit: '6' });
        const response = await fetch(uri, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Error(`地图搜索返回 HTTP ${response.status}。`);
        const result = await response.json();
        for (const row of result.features ?? []) {
          const [lon, lat] = row.geometry?.coordinates ?? [];
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
          const name = [row.properties?.name, row.properties?.city, row.properties?.country].filter(Boolean).join(' · ') || query;
          rows.append(action(name, () => {
            frame?.remove();
            frame = element('iframe');
            frame.title = name;
            const embed = new URL('https://www.openstreetmap.org/export/embed.html');
            embed.search = new URLSearchParams({ bbox: [lon - .025, lat - .018, lon + .025, lat + .018].join(','), layer: 'mapnik', marker: [lat, lon].join(',') });
            frame.src = embed;
            rows.after(frame);
          }));
        }
        message.textContent = rows.childElementCount ? '地点数据来自 OpenStreetMap。' : '没有查到匹配地点。';
      } catch { message.textContent = '地图搜索服务暂时不可达。'; }
      finally { rows.append(fallback); button.disabled = false; }
    });
  }
  async function share() {
    const thread = currentThread();
    if (!thread) return;
    show('分享对话');
    const message = element('p', '此链接包含对话文字快照。请确认内容适合分享。', 'muted');
    content.append(message);
    const field = element('input');
    field.readOnly = true;
    field.setAttribute('aria-label', '分享链接');
    try {
      const conversation = services.localClassicChatAdapter.detail(thread);
      const result = await services.localConversationShare.create({ conversation_id: thread.id, current_node_id: conversation.current_node, is_anonymous: true });
      if (!message.isConnected) return;
      const url = new URL(home);
      url.searchParams.set('share', result.share_id);
      url.hash = new URL(result.share_url).hash;
      field.value = url.href;
      const copy = action('复制链接', async () => {
        try { await navigator.clipboard.writeText(field.value); message.textContent = '已复制链接。'; }
        catch { field.select(); message.textContent = '已选中链接。'; }
      });
      content.append(field, copy);
    } catch (error) { message.textContent = error.message; message.classList.add('error'); }
  }
  return { login, history, settings, plans, usage, map, share };
}
