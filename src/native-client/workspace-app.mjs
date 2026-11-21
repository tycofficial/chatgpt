import * as account from './site-account.mjs';
import { getSiteAuthEntryKind } from './site-paths.mjs';
import * as catalog from '../../model-catalog.js';

const home = new URL('../../', import.meta.url);
const root = document.querySelector('#workspace');
const relative = location.pathname.slice(home.pathname.length).replace(/\/index\.html$/, '').replace(/\/$/, '');
const deepConversation = /^c\/([^/]+)$/.exec(relative)?.[1] ?? null;
const shareId = /^share\/([^/]+)$/.exec(relative)?.[1] ?? new URL(location.href).searchParams.get('share');
const authEntry = getSiteAuthEntryKind(location.href, home);
const names = { chat: 'Chat', work: 'Work', codex: 'Codex', dot: 'Dot' };
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({ basePath: home.pathname, localIdentity: true, siteWorkspace: true });
const $ = selector => root.querySelector(selector);
const localPath = name => new URL(name, home);

function offlineCache() {
  if (!navigator.serviceWorker) return () => {};
  const cacheAssets = () => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    navigator.serviceWorker.controller?.postMessage({ type: 'cache-workspace-assets', resources });
  };
  navigator.serviceWorker.register(localPath('site-offline.js'), { scope: home.pathname }).then(cacheAssets).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', cacheAssets);
  addEventListener('load', cacheAssets, { once: true });
  return cacheAssets;
}

async function start() {
  const cacheAssets = offlineCache();
  if (authEntry === 'logout') {
    await account.logoutSiteAccount();
    location.replace(home.href);
    return;
  }
  if (authEntry === 'login' || authEntry === 'signup') {
    const { renderAuth } = await import('./workspace-panels.mjs');
    root.className = '';
    root.innerHTML = '<main class="share-page"><a href="/chatgpt/">TYC 工作台</a><section class="panel"><h2></h2><div class="panel-content"></div></section></main>';
    renderAuth(authEntry, $('.panel'), () => location.replace(account.safeSiteReturnUrl(new URL(location.href).searchParams.get('next')).href));
    cacheAssets();
    return;
  }
  await account.initializeSiteAccountForDisplay();
  // The conversation store binds its account namespace when imported.
  const [services, view, core, speech, panels] = await Promise.all([
    import('./service-boundary.mjs'), import('./workspace-turn-view.mjs'), import('./local-app-server.mjs'),
    import('./local-native-read-aloud.mjs'), import('./workspace-panels.mjs'),
  ]);
  cacheAssets();
  if (shareId) await panels.renderPublicShare(root, services, home, shareId);
  else mountWorkspace(services, view, core, speech, panels, cacheAssets);
}

function mountWorkspace(services, view, { storedConversationSurface }, speech, panels, cacheAssets) {
  const { localAppServer: server, localFilesService: files, readWorkspacePreferences: prefs, saveWorkspacePreferences: savePrefs } = services;
  const { element, action, createTranscriptView } = view;
  root.className = 'layout';
  root.innerHTML = `<aside class="rail" aria-label="工作台导航">
    <a class="brand" href="${home.pathname}">TYC 工作台</a>
    <nav class="rail-modes" aria-label="模式">
      <button type="button" data-mode="chat">Chat</button><button type="button" data-mode="work" hidden>Work</button>
      <button type="button" data-mode="codex" hidden>Codex</button><button type="button" data-mode="dot" hidden>Dot</button>
    </nav>
    <button type="button" id="new-conversation">新对话</button>
    <div class="rail-history"><h2 class="rail-label">最近的对话</h2><div class="rail-list" id="recent"></div></div>
    <nav class="rail-tools" aria-label="工具"><button type="button" id="history-search">搜索对话</button><button type="button" id="places">地图</button>
      <button type="button" id="settings">设置</button><button type="button" id="plans">套餐</button><button type="button" id="billing">账单与用量</button></nav>
    </aside><main class="main">
    <header class="topbar"><h1 id="conversation-title">Chat</h1><div class="account-bar">
      <button type="button" id="share" hidden>分享</button><span id="account-plan"></span><button type="button" id="account-action"></button></div></header>
    <div class="surface"><div class="dialogue" id="dialogue">
      <div class="transcript" id="transcript" tabindex="0" aria-label="对话"><div class="transcript-inner" id="messages"></div></div>
      <form class="compose" id="compose"><div class="compose-inner">
        <div class="compose-prefs">
          <label id="model-field" hidden>模型<select id="model"></select></label><label id="effort-field" hidden>思考等级<select id="effort"></select></label>
          <label id="project-field" hidden>项目<select id="project"><option value="/">无项目</option><option value="/mnt/data">浏览器工作区</option></select></label>
          <label class="inline" id="fast-field" hidden><input id="fast" type="checkbox"> 加速</label>
        </div>
        <label class="speaker" for="prompt">消息</label><textarea id="prompt" rows="2" placeholder="输入消息"></textarea>
        <div class="attachment-list" id="draft-files"></div><div class="compose-actions">
          <input id="file-input" type="file" multiple hidden><button type="button" id="upload">上传</button>
          <label><input id="web-search" type="checkbox"> 搜索网页</label><button type="button" id="stop" hidden>停止</button>
          <button type="submit" class="primary send" id="send">发送</button>
        </div><p class="status" id="compose-status" role="status"></p>
      </div></form>
    </div><section id="dot-surface" aria-label="Dot" hidden></section></div></main>
    <dialog id="panel" class="panel" aria-labelledby="panel-title"><div class="panel-header"><h2 id="panel-title"></h2><button type="button" id="panel-close">关闭</button></div><div class="panel-content"></div></dialog>`;

  const transcript = $('#transcript'), panel = $('#panel'), prompt = $('#prompt');
  const model = $('#model'), effort = $('#effort'), project = $('#project'), fast = $('#fast');
  const bootAccountId = account.getSiteAccount()?.id ?? null;
  const capabilities = () => account.getSitePlanCapabilities();
  let mode = 'chat', threadId = null, busy = false, uploading = false, signingOut = false, dotPanel, loadingDot, renderFrame;
  const attemptedRecovery = new Set();
  const readThread = () => server.threads.get(threadId) ?? null;
  const draftKey = () => threadId || `new:${mode}`;
  const permits = next => Object.hasOwn(names, next) && capabilities()[next] === true;
  const status = (message = '', error = false) => {
    $('#compose-status').textContent = message;
    $('#compose-status').classList.toggle('error', error);
  };
  const rpc = (method, params) => {
    const { result, afterReply } = server.dispatch(method, params);
    afterReply?.();
    return result;
  };
  const historyItems = () => [...server.threads.values()]
    .filter(thread => !thread.archived && !thread.ephemeral && thread.turns.length && permits(storedConversationSurface(thread) ?? 'chat') && storedConversationSurface(thread) !== 'dot')
    .sort((left, right) => (right.recencyAt ?? right.updatedAt) - (left.recencyAt ?? left.updatedAt));

  const colorPreference = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const chosen = prefs().theme || 'system';
    document.documentElement.dataset.theme = chosen === 'system' ? (colorPreference.matches ? 'dark' : 'light') : chosen;
  }
  colorPreference.addEventListener?.('change', applyTheme);
  applyTheme();
  const dialogs = panels.createWorkspacePanels({ panel, home, services, prefs, savePrefs, historyItems, openThread,
    currentThread: readThread, applyTheme, onPlanChange: () => { accountBar(); modelControls(); } });

  function accountBar() {
    const info = account.getSiteAccount();
    const plan = { free: 'Free', plus: 'Plus', pro: 'Pro' }[capabilities().planType];
    $('#account-plan').textContent = info?.username ? `${info.username} · ${plan}` : '访客 · Free';
    $('#account-action').textContent = info?.role && info.role !== 'guest' ? '退出' : '登录';
    for (const button of root.querySelectorAll('[data-mode]')) {
      button.hidden = !permits(button.dataset.mode);
      if (button.dataset.mode === mode) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }

  function readDraft(key = draftKey()) { return prefs().drafts?.[key] ?? { text: '', files: [], search: false }; }
  function saveDraft(key, value) {
    const drafts = { ...prefs().drafts };
    if (!value.text && !value.files.length && !value.search) delete drafts[key];
    else drafts[key] = value;
    savePrefs({ drafts });
  }
  function showDraftFiles() {
    $('#draft-files').replaceChildren(...readDraft().files.map(file => action(`${file.name} ×`, () => {
      const key = draftKey(), draft = readDraft(key);
      saveDraft(key, { ...draft, files: draft.files.filter(item => item.id !== file.id) });
      showDraftFiles();
    }, 'attachment')));
  }
  function syncDraft() {
    const draft = readDraft();
    prompt.value = draft.text;
    $('#web-search').checked = draft.search;
    showDraftFiles();
  }

  function writeSelection(value) { savePrefs({ selections: { ...prefs().selections, [mode]: value } }); }
  function selection() {
    const saved = prefs().selections?.[mode] ?? {}, thread = readThread();
    if (!capabilities().modelSelection) return { executionSurface: 'chat' };
    if (mode === 'chat') {
      const proAllowed = capabilities().planType === 'pro';
      const aliases = catalog.CHAT_FAMILIES.flatMap(row => proAllowed ? [row.standardAlias, row.proAlias] : [row.standardAlias]);
      const remembered = thread?.adapterMetadata?.frontendModelSlug ?? saved.model;
      const alias = aliases.includes(remembered) ? remembered : 'auto';
      const pro = catalog.CHAT_FAMILIES.some(row => row.proAlias === alias);
      const level = thread?.reasoningEffort ?? saved.effort;
      return { executionSurface: mode, frontendModelSlug: alias, effort: !pro && catalog.CHAT_EFFORTS.includes(level) ? level : 'medium' };
    }
    const source = thread ? { model: thread.model, effort: thread.reasoningEffort,
      selectionMode: thread.adapterMetadata?.selectionMode === 'auto' ? 'auto' : 'pinned' } : saved;
    const normalized = catalog.normalizeWorkSelection(source);
    const requestedFast = thread ? thread.serviceTier === 'fast' : saved.fast === true;
    const canFast = ['gpt-6.2-sol', 'gpt-6.2-astra'].includes(normalized.model);
    return { executionSurface: mode, model: normalized.model, effort: normalized.effort, selectionMode: normalized.selectionMode,
      serviceTier: requestedFast && canFast ? 'fast' : 'standard', cwd: thread?.cwd ?? saved.cwd ?? '/' };
  }

  function options(control, rows, selected) {
    control.replaceChildren(...rows.map(([value, text]) => new Option(text, value)));
    control.value = selected;
  }
  function modelControls() {
    const current = selection(), paid = capabilities().modelSelection;
    $('#model-field').hidden = !paid;
    $('#effort-field').hidden = !paid;
    $('#project-field').hidden = mode !== 'codex';
    $('#fast-field').hidden = !['gpt-6.2-sol', 'gpt-6.2-astra'].includes(current.model);
    if (!paid) return;
    if (mode === 'chat') {
      const families = catalog.CHAT_FAMILIES;
      const labels = families.flatMap(row => [[row.standardAlias, row.label], ...(capabilities().planType === 'pro' ? [[row.proAlias, `${row.label} Pro`]] : [])]);
      options(model, labels, current.frontendModelSlug);
      $('#effort-field').hidden = families.some(row => row.proAlias === current.frontendModelSlug);
      options(effort, catalog.CHAT_EFFORTS.map(value => [value, catalog.CHAT_EFFORT_LABELS[value]]), current.effort);
    } else {
      const pinned = current.selectionMode === 'pinned';
      options(model, [['auto', '默认精选集'], ...catalog.WORK_MODEL_IDS.map(id => [id, catalog.WORK_MODEL_LABELS[id]])], pinned ? current.model : 'auto');
      const rows = pinned ? catalog.WORK_PINNED_EFFORTS[current.model].map(id => [id, catalog.WORK_EFFORT_LABELS[id]]) : catalog.WORK_PRESETS.map(entry => [entry.id, entry.displayLabel]);
      options(effort, rows, pinned ? current.effort : `${current.model}:${current.effort}`);
      project.value = current.cwd === '/mnt/data' ? current.cwd : '/';
      fast.checked = current.serviceTier === 'fast';
    }
  }
  function applySelection(kind) {
    const previous = selection(), picked = { executionSurface: mode };
    if (mode === 'chat') {
      picked.frontendModelSlug = model.value;
      picked.effort = catalog.CHAT_FAMILIES.some(row => row.proAlias === model.value) ? 'medium' : effort.value;
    } else {
      const pinned = model.value !== 'auto';
      const choice = kind === 'model' ? catalog.normalizeWorkSelection(pinned ? { model: model.value, selectionMode: 'pinned', effort: previous.effort } : {}) :
        pinned ? { model: model.value, effort: effort.value, selectionMode: 'pinned' } : { ...catalog.WORK_PRESETS.find(row => row.id === effort.value), selectionMode: 'auto' };
      Object.assign(picked, { model: choice.model, effort: choice.effort, selectionMode: choice.selectionMode, cwd: project.value,
        serviceTier: fast.checked && ['gpt-6.2-sol', 'gpt-6.2-astra'].includes(choice.model) ? 'fast' : 'standard' });
    }
    try {
      if (readThread()) rpc('thread/settings/update', { threadId, ...picked });
      writeSelection({ ...picked, model: picked.frontendModelSlug ?? picked.model, fast: picked.serviceTier === 'fast' });
      modelControls();
    } catch (error) { status(error.message, true); }
  }

  function route(nextMode, nextThreadId, { updateURL = true } = {}) {
    mode = permits(nextMode) ? nextMode : 'chat';
    threadId = nextThreadId;
    savePrefs({ mode, lastThreadId: threadId });
    if (updateURL) {
      const url = new URL(home), hash = new URLSearchParams();
      if (threadId) hash.set('c', threadId);
      if (mode !== 'chat') hash.set('mode', mode);
      url.hash = hash.toString();
      if (url.href !== location.href) history.replaceState(null, '', url.href);
    }
    $('#dialogue').hidden = mode === 'dot';
    $('#dot-surface').hidden = mode !== 'dot';
    $('#new-conversation').hidden = mode === 'dot';
    accountBar();
    if (mode === 'dot') void openDot();
    else {
      modelControls();
      syncDraft();
      status(!navigator.onLine ? '离线 · 已保存的对话仍可查看。' : '');
    }
    render(true);
    tryRecovery();
  }

  function openThread(thread) {
    const surface = storedConversationSurface(thread) ?? 'chat';
    if (!permits(surface)) return;
    if (panel.open) panel.close();
    route(surface, thread.id);
  }
  async function openDot() {
    if (dotPanel || loadingDot) return;
    const dot = $('#dot-surface');
    dot.textContent = '正在打开 Dot…';
    loadingDot = import('./dot-panel.mjs').then(({ mountDotPanel }) => {
      dot.replaceChildren();
      dotPanel = mountDotPanel(dot, { adapter: services.localDotAdapter, appServer: server, files });
      return dotPanel.ready;
    }).then(cacheAssets).catch(error => {
      dot.replaceChildren(element('p', error.message || 'Dot 初始化失败。', 'error'), action('重试', openDot));
      dotPanel = null;
    }).finally(() => { loadingDot = null; });
    await loadingDot;
  }

  async function fileRequest(path, options) {
    const response = await files.handle(new Request(localPath(path.slice(1)), options), path);
    const data = await response.json();
    if (!response.ok) throw Error(data.detail?.message ?? data.error?.message ?? '文件操作失败。');
    return data;
  }
  async function upload(selected) {
    const key = draftKey();
    uploading = true;
    updateComposer();
    try {
      for (const file of selected) {
        status(`正在保存 ${file.name}…`);
        const reserved = await fileRequest('/files', { method: 'POST', body: JSON.stringify({ file_name: file.name, file_size: file.size, mime_type: file.type }) });
        try {
          const target = new URL(reserved.upload_url).searchParams.get('upload_url');
          await files.upload('PUT', target, { body: file });
          await fileRequest(`/files/${reserved.file_id}/uploaded`, { method: 'POST', body: '{}' });
          const draft = readDraft(key);
          saveDraft(key, { ...draft, files: [...draft.files, { id: reserved.file_id, name: file.name }] });
          if (key === draftKey()) showDraftFiles();
        } catch (error) {
          await files.cancelUpload(reserved.file_id).catch(() => {});
          throw error;
        }
      }
      status('附件已保存。');
    } catch (error) { status(error.message, true); }
    finally { uploading = false; updateComposer(); cacheAssets(); }
  }
  async function download(id) {
    try {
      const { bytes, record } = await files.readFile(id);
      const href = URL.createObjectURL(new Blob([bytes], { type: record.mimeType }));
      const link = element('a');
      link.href = href;
      link.download = record.fileName ?? '附件';
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 15000);
    } catch { status('此设备上没有这份附件的原件。', true); }
  }

  const speechScope = {};
  const playback = globalThis.speechSynthesis && speech.createBrowserReadAloudController({
    speechSynthesis: globalThis.speechSynthesis, Utterance: globalThis.SpeechSynthesisUtterance,
    getIdentity: services.localReadAloudHost.getIdentity, resolveSource: services.localReadAloudHost.source.resolve,
    isSourceCurrent: services.localReadAloudHost.source.isCurrent, getScopeKey: () => speechScope,
  });
  function speak(id, messageId) {
    const played = playback?.play(speechScope, { conversationId: id, playbackId: messageId, readAloud: { conversationId: id, messageId },
      onError: error => status(error?.message || '语音朗读失败。', true), onEnd: () => status('朗读结束。') });
    if (!played) status('朗读需要本站账户和浏览器语音支持。', true);
  }
  function resume(id, turnId) {
    if (!navigator.onLine) { status('联网后可以接回已保存的任务。', true); return; }
    try { rpc('turn/resume', { threadId: id, turnId }); render(); }
    catch (error) { status(error.message, true); }
  }
  function tryRecovery() {
    const current = readThread(), turn = current?.turns.at(-1);
    if (!navigator.onLine || !turn || !['interrupted', 'failed'].includes(turn.status) || !turn.adapterMetadata?.resumable ||
        turn.adapterMetadata.resumePolicy !== 'automatic' || attemptedRecovery.has(turn.id)) return;
    attemptedRecovery.add(turn.id);
    resume(current.id, turn.id);
  }

  const transcriptView = createTranscriptView({ container: $('#messages'), onResume: resume, onDownload: download, onSpeak: speak });
  function updateComposer() {
    const running = threadId != null && server.running.has(threadId);
    $('#send').disabled = busy || uploading || running;
    $('#stop').hidden = !running;
    $('#upload').disabled = uploading;
    $('#upload').textContent = uploading ? '正在上传…' : '上传';
  }
  let recentSignature;
  function showRecent() {
    const rows = historyItems().slice(0, 40);
    const signature = JSON.stringify([threadId, rows.map(row => [row.id, row.name])]);
    if (signature === recentSignature) return;
    recentSignature = signature;
    $('#recent').replaceChildren(...rows.map(thread => {
      const button = action(thread.name || '未命名对话', () => openThread(thread));
      if (thread.id === threadId) button.setAttribute('aria-current', 'page');
      return button;
    }));
  }
  function render(forceScroll = false) {
    const atEnd = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight < 120;
    const thread = readThread();
    $('#conversation-title').textContent = thread?.name || names[mode];
    $('#share').hidden = mode === 'dot' || !thread?.turns.some(turn => turn.status === 'completed');
    if (mode !== 'dot') transcriptView.update(thread, mode);
    updateComposer();
    if (forceScroll || atEnd) transcript.scrollTop = transcript.scrollHeight;
    showRecent();
  }
  function send(event) {
    event.preventDefault();
    if (busy || uploading || server.running.has(threadId)) return;
    const key = draftKey(), draft = readDraft(key), text = prompt.value.trim();
    if (!text && !draft.files.length) return;
    if (!account.getSiteAccount() || account.getSiteAccount()?.role === 'guest') { dialogs.login(); return; }
    if (!navigator.onLine) { status('现在离线。消息已保留为草稿，恢复网络后可发送。', true); return; }
    busy = true;
    updateComposer();
    status();
    try {
      const selected = selection(), messageId = crypto.randomUUID();
      if (!readThread()) {
        const { thread } = rpc('thread/start', selected);
        route(mode, thread.id);
      }
      const input = text ? [{ type: 'text', text }] : [];
      const classicUserMessage = draft.files.length ? { id: messageId, author: { role: 'user' }, content: { content_type: 'text', parts: [text] }, metadata: { attachments: draft.files } } : undefined;
      rpc('turn/start', { threadId, ...selected, input, clientUserMessageId: messageId, classicUserMessage, forceUseSearch: draft.search });
      saveDraft(key, { text: '', files: [], search: false });
      syncDraft();
      render(true);
    } catch (error) { status(error.message, true); }
    finally { busy = false; updateComposer(); }
  }

  $('#panel-close').onclick = () => panel.close();
  $('#settings').onclick = dialogs.settings;
  $('#plans').onclick = dialogs.plans;
  $('#billing').onclick = dialogs.usage;
  $('#places').onclick = dialogs.map;
  $('#history-search').onclick = dialogs.history;
  $('#share').onclick = dialogs.share;
  $('#account-action').onclick = async () => {
    if (!account.getSiteAccount() || account.getSiteAccount().role === 'guest') { dialogs.login(); return; }
    signingOut = true;
    $('#account-action').disabled = true;
    try { await services.siteSignOut.navigateAfterSignOut(); }
    catch (error) { signingOut = false; status(error.message, true); $('#account-action').disabled = false; }
  };
  $('#new-conversation').onclick = () => route(mode, null);
  for (const button of root.querySelectorAll('[data-mode]')) button.onclick = () => route(button.dataset.mode, null);
  model.onchange = () => applySelection('model');
  effort.onchange = () => applySelection('effort');
  project.onchange = () => applySelection('project');
  fast.onchange = () => applySelection('fast');
  prompt.oninput = () => saveDraft(draftKey(), { ...readDraft(), text: prompt.value });
  $('#web-search').onchange = event => saveDraft(draftKey(), { ...readDraft(), search: event.target.checked });
  $('#upload').onclick = () => {
    if (!account.getSiteAccount() || account.getSiteAccount()?.role === 'guest') dialogs.login();
    else $('#file-input').click();
  };
  $('#file-input').onchange = event => {
    const selected = [...event.target.files];
    event.target.value = '';
    if (selected.length) void upload(selected);
  };
  $('#compose').onsubmit = send;
  $('#stop').onclick = () => { if (threadId) server.interrupt(threadId); };
  prompt.onkeydown = event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229 && matchMedia('(pointer: fine)').matches) {
      event.preventDefault();
      $('#compose').requestSubmit();
    }
  };
  server.subscribe(event => {
    if (event.method === 'turn/completed') cacheAssets();
    if (event.params.threadId && event.params.threadId !== threadId && !event.method.startsWith('thread/')) return;
    if (renderFrame != null) return;
    renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); });
  });
  setInterval(transcriptView.tick, 500);
  addEventListener('online', () => {
    status('网络已恢复。');
    attemptedRecovery.clear();
    void account.refreshSiteAccount().then(tryRecovery);
  });
  addEventListener('offline', () => status('离线 · 消息和附件保存在此浏览器。'));
  addEventListener('pageshow', event => {
    if (event.persisted) { attemptedRecovery.clear(); tryRecovery(); }
  });
  addEventListener('codex-site-account-changed', () => {
    if (signingOut) return;
    const next = account.getSiteAccount()?.id ?? null;
    if (next !== bootAccountId && !panel.querySelector('input[type="password"]')) {
      if (location.pathname !== home.pathname) location.replace(home.href);
      else location.reload();
      return;
    }
    if (!permits(mode)) route('chat', null);
    else accountBar();
  });
  addEventListener('pagehide', () => server.interruptAll({ reason: 'pagehide' }));

  const hash = new URLSearchParams(location.hash.slice(1)), saved = prefs();
  const requestedId = deepConversation ?? hash.get('c') ?? saved.lastThreadId;
  const requestedMode = hash.get('mode') ?? (/^(work|codex|dot)\b/.exec(relative)?.[1] || saved.mode || 'chat');
  const stored = server.threads.get(requestedId);
  const restoredMode = (stored && storedConversationSurface(stored)) || requestedMode;
  route(restoredMode, permits(restoredMode) ? requestedId : null, { updateURL: false });
  if (/^(plans|pricing-plan|site-plans)$/.test(relative)) dialogs.plans();
  void services.initializeLocalAccountHistory({ threadOnEntry: requestedId }).then(() => {
    const thread = readThread();
    const next = thread && storedConversationSurface(thread);
    if (next && next !== mode) route(next, thread.id, { updateURL: false });
    else render();
  }).catch(() => status('云端聊天同步暂时不可用，可继续查看本机历史。', true));
}

start().catch(error => {
  const status = document.querySelector('#startup-status');
  if (status) status.textContent = '工作台启动失败。请检查网络后刷新。';
  console.error('Workspace startup failed:', error);
});
