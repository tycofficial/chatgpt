const colors = { pink: ['珊瑚', '#df7290'], blue: ['海蓝', '#5e9ad9'], lime: ['青柠', '#84a95d'], violet: ['丁香', '#aa82d9'] };
const faces = { sunglasses: ['墨镜', '◒'], headphones: ['耳机', '♫'], 'bow-tie': ['领结', '⋈'], beanie: ['便帽', '⌂'] };
const runStatuses = { queued: '等待运行', inProgress: '正在运行', completed: '已完成', failed: '失败', interrupted: '已断开' };
const timestamp = value => value ? new Date(value).toLocaleString() : '';
const textOf = message => message?.content?.text ?? message?.raw_messages?.flatMap(item => item.content.parts).join('\n') ?? '';

function make(tag, text = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function action(label, handler) {
  const button = make('button', label);
  button.type = 'button';
  button.addEventListener('click', handler);
  return button;
}

function localRequest(path, method, data, signal, baseURL) {
  const options = { method, signal };
  if (data !== undefined) Object.assign(options, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return new Request(new URL(path, baseURL), options);
}

async function readResponse(response) {
  if (response?.status === 204) return null;
  const data = await response?.json().catch(() => null);
  if (!response?.ok) throw new Error(data?.error?.message || data?.detail?.message || (typeof data?.detail === 'string' ? data.detail : '') || '无法完成 Dot 操作。');
  return data;
}

// Use the existing owned file service, with the same upload/processing stages as Chat.
export async function storeDotFile(files, file, { signal, baseURL = globalThis.location?.origin } = {}) {
  const handle = async (path, data) => readResponse(await files.handle(localRequest(path, 'POST', data, signal, baseURL), path));
  const allocation = await handle('/files', { file_name: file.name, file_size: file.size, mime_type: file.type });
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('upload_url', new URL(allocation.upload_url).searchParams.get('upload_url'));
    await files.upload('POST', allocation.upload_url, { body: form, signal });
    await handle(`/files/${allocation.file_id}/uploaded`, {});
    return { id: allocation.file_id, name: file.name };
  } catch (cause) {
    await files.cancelUpload(allocation.file_id).catch(() => {});
    throw cause;
  }
}

export function mountDotPanel(container, { adapter, appServer, files } = {}) {
  const stylesheet = new URL('./dot-panel.css', import.meta.url).href;
  if (![...document.styleSheets].some(sheet => sheet.href === stylesheet) && !document.querySelector('link[data-dot-styles]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.dataset.dotStyles = '';
    document.head.append(link);
  }
  const panel = make('section');
  panel.className = 'dot-panel';
  panel.setAttribute('aria-label', 'Dot');
  panel.innerHTML = `
    <header class="dot-panel-header"><div class="dot-panel-avatar" aria-hidden="true"></div><div><h1>Dot</h1><div class="dot-panel-terse">对话、日记与自动化</div></div></header>
    <nav class="dot-panel-tabs" aria-label="Dot 功能">
      <button type="button" data-open="chat" aria-pressed="true">对话</button>
      <button type="button" data-open="journal" aria-pressed="false">日记</button>
      <button type="button" data-open="automations" aria-pressed="false">自动化</button>
      <button type="button" data-open="computer" aria-pressed="false">云电脑</button>
      <button type="button" data-open="appearance" aria-pressed="false">皮肤</button>
    </nav>
    <div class="dot-panel-feedback" role="status"></div>
    <section data-view="chat">
      <div class="dot-panel-messages"></div>
      <div class="dot-panel-turn" role="status"></div>
      <form class="dot-panel-compose">
        <div class="dot-panel-quote" hidden></div><div class="dot-panel-attachments"></div>
        <label>给 Dot 发消息<textarea name="text" rows="3" maxlength="100000" placeholder="输入消息或添加文件"></textarea></label>
        <div class="dot-panel-actions">
          <label class="dot-panel-upload">添加附件<input type="file" multiple accept="image/png,image/jpeg,image/webp,text/*,.txt,.md,.csv,.json,.pdf,.docx,.xlsx,.pptx"></label>
          <button name="voice" type="button">语音对话</button><button name="send" type="submit" class="dot-panel-primary">发送</button>
        </div><div class="dot-panel-voice" role="status"></div>
      </form>
    </section>
    <section data-view="journal" hidden>
      <h2>日记</h2><form class="dot-panel-journal-form">
        <label>内容<textarea name="entry" required rows="4" maxlength="12000"></textarea></label>
        <div class="dot-panel-actions"><button name="save" class="dot-panel-primary" type="submit">保存日记</button><button name="cancel" type="button" hidden>取消编辑</button></div>
      </form><div class="dot-panel-journal"></div>
    </section>
    <section data-view="automations" hidden>
      <h2>自动化</h2><p>每次运行都会向 Dot 发送任务，结果保存在本站。定时任务在此页面打开且联网时执行。</p>
      <form class="dot-panel-automation-form">
        <label>任务名称<input name="taskName" required maxlength="120"></label>
        <label>提示词<textarea name="prompt" required rows="3" maxlength="12000"></textarea></label>
        <label>间隔（分钟，填 0 为手动）<input name="interval" required type="number" value="0" min="0" max="10080"></label>
        <button type="submit" class="dot-panel-primary">创建自动化</button>
      </form><div class="dot-panel-automations"></div>
    </section>
    <section data-view="computer" hidden>
      <h2>云电脑</h2><p>本站还缺少已授权的云电脑执行服务，无法启动远程环境。</p>
    </section>
    <section data-view="appearance" hidden>
      <h2>皮肤</h2><form class="dot-panel-appearance-form">
        <label>配饰<select name="avatar"></select></label><label>配色<select name="color"></select></label>
        <button type="submit" class="dot-panel-primary">保存皮肤</button>
      </form>
    </section>`;
  container.replaceChildren(panel);
  const find = selector => panel.querySelector(selector);
  const feedback = find('.dot-panel-feedback');
  const compose = find('.dot-panel-compose');
  const input = compose.elements.namedItem('text');
  const voiceButton = compose.elements.namedItem('voice');
  const attachments = [];
  const controller = new AbortController();
  const speakOnComplete = new Set();
  const SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let profile, roomPath, editEntry, reply, recognition, utterance, recording = false, uploading = false, sending = false;
  const messageViews = new Map();
  let activeTurn, scheduleTicking = false, queuePumping = false, refreshTimer, reconnectTimer, lastRoomResponse = 0, roomResponse = 0;
  let currentView = 'chat';
  const live = () => !controller.signal.aborted;
  const setFeedback = (text, danger = false) => { if (live()) { feedback.textContent = text; feedback.dataset.danger = String(danger); } };
  const report = cause => { if (cause?.name !== 'AbortError') setFeedback(cause?.message || 'Dot 操作失败。', true); };
  const api = async (path, method = 'GET', data) => {
    controller.signal.throwIfAborted();
    const result = await readResponse(await adapter.handle(localRequest(path, method, data, controller.signal, location.origin), path.split('?')[0]));
    controller.signal.throwIfAborted();
    return result;
  };
  function task(handler) {
    return async event => {
      try { await handler(event); }
      catch (cause) { report(cause); }
    };
  }
  function switchView(view) {
    currentView = view;
    for (const button of panel.querySelectorAll('[data-open]')) button.setAttribute('aria-pressed', String(button.dataset.open === view));
    for (const section of panel.querySelectorAll('section[data-view]')) section.hidden = section.dataset.view !== view;
    if (!profile) return;
    if (view === 'journal') void refreshJournal().catch(report);
    if (view === 'automations') void refreshAutomations().catch(report);
  }
  for (const button of panel.querySelectorAll('[data-open]')) button.addEventListener('click', () => switchView(button.dataset.open));

  function paintAvatar() {
    const avatar = find('.dot-panel-avatar');
    const manifest = profile.avatar_manifest;
    avatar.textContent = (faces[profile.avatar_id] ?? faces.sunglasses)[1];
    avatar.style.setProperty('--dot-tint', (colors[manifest?.tint] ?? colors.pink)[1]);
    find('.dot-panel-header h1').textContent = profile.display_name || 'Dot';
  }
  function paintReply() {
    const quote = find('.dot-panel-quote');
    quote.hidden = reply == null;
    if (reply) quote.replaceChildren(make('span', '回复 · ' + textOf(reply).slice(0, 160)), action('取消引用', () => { reply = null; paintReply(); }));
    else quote.replaceChildren();
  }
  function paintAttachments() {
    const list = find('.dot-panel-attachments');
    list.replaceChildren(...attachments.map(file => action('移除 ' + file.name, () => { attachments.splice(attachments.indexOf(file), 1); paintAttachments(); })));
    if (uploading) list.append(make('span', '正在保存附件…'));
    compose.elements.namedItem('send').disabled = !roomPath || uploading || sending;
  }
  function speak(text) {
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance || !text.trim()) return;
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = /[\u3400-\u9fff]/u.test(text) ? 'zh-CN' : 'en-US';
    if (utterance) speechSynthesis.cancel();
    utterance = voice;
    voice.onend = () => { if (utterance === voice) utterance = null; };
    voice.onerror = event => { if (utterance === voice) utterance = null; if (!['canceled','interrupted'].includes(event.error)) report(new Error('当前浏览器无法播放这段语音。')); };
    speechSynthesis.speak(voice);
  }
  function drawMessage(message) {
    const article = make('article');
    article.className = 'dot-panel-message';
    article.dataset.role = message.role;
    const title = message.role === 'assistant' ? profile.display_name : message.role === 'system' ? '运行状态' : '你';
    const header = make('div', [title, message.queued ? '等待发送' : null, message.execution?.model].filter(Boolean).join(' · '));
    header.className = 'dot-panel-terse';
    article.append(header);
    if (message.reply_to?.message) article.append(make('blockquote', textOf(message.reply_to.message).slice(0, 280)));
    const text = textOf(message);
    if (text) article.append(make('p', text));
    const files = message.content?.attachments ?? [];
    if (files.length) article.append(make('div', '附件 · ' + files.map(file => file.name).join('、')));
    if (message.queued || message.role === 'system' || message.status === 'inProgress') return article;
    const buttons = make('div');
    buttons.className = 'dot-panel-actions';
    buttons.append(action('引用回复', () => { reply = message; paintReply(); input.focus(); }));
    if (message.role === 'assistant' && globalThis.speechSynthesis) buttons.append(action('朗读', () => speak(text)));
    const savedReaction = Object.values(message.reactions ?? {})[0];
    for (const emoji of ['👍', '❤️', '😊']) {
      const button = action(emoji, task(async () => {
        await api(`${roomPath}/messages/${encodeURIComponent(message.id)}/reactions`, savedReaction === emoji ? 'DELETE' : 'POST', savedReaction === emoji ? undefined : { reaction: emoji });
        await refreshRoom();
      }));
      button.setAttribute('aria-label', `${savedReaction === emoji ? '移除' : '添加'}表情 ${emoji}`);
      button.setAttribute('aria-pressed', String(savedReaction === emoji));
      buttons.append(button);
    }
    article.append(buttons);
    return article;
  }
  function drawActiveTurn(queuedCount = 0) {
    const area = find('.dot-panel-turn');
    if (activeTurn?.status === 'inProgress') {
      const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(activeTurn.started_at)) / 1000));
      area.textContent = `正在思考 · ${elapsed} 秒`;
    } else if (activeTurn) {
      area.replaceChildren(make('span', '上一条回复已断开，已保存可见内容。'));
      if (activeTurn.resumable && appServer) area.append(action('继续此回复', task(async () => {
        reconnect();
        await refreshRoom();
      })));
      if (queuedCount) area.append(action('继续发送队列', task(async () => {
        await pumpQueue(true);
        await refreshRoom();
      })));
    } else area.textContent = queuedCount ? `等待发送 ${queuedCount} 条${navigator.onLine === false ? ' · 当前离线' : ''}` : '';
  }
  function reconnect() {
    const result = adapter.createRpcFacade().dispatch('turn/resume', { threadId: profile.messaging_room_id, turnId: activeTurn.id });
    result.afterReply?.();
  }
  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    if (!activeTurn?.resumable || activeTurn.status === 'inProgress' || activeTurn.resume_policy !== 'automatic' || navigator.onLine === false || !appServer) return;
    reconnectTimer = setTimeout(() => {
      if (!live() || navigator.onLine === false) return;
      try { reconnect(); }
      catch (cause) { report(cause); }
    }, Math.max(0, (activeTurn.resume_at ?? 0) - Date.now()));
  }
  function paintMessages(messages) {
    const list = find('.dot-panel-messages');
    const newIds = new Set();
    messages.forEach((message, index) => {
      newIds.add(message.id);
      const key = JSON.stringify(message);
      const old = messageViews.get(message.id);
      const node = old?.key === key ? old.node : drawMessage(message);
      if (old && old.node !== node) old.node.replaceWith(node);
      if (list.children[index] !== node) list.insertBefore(node, list.children[index] ?? null);
      messageViews.set(message.id, { key, node });
    });
    for (const [id, view] of messageViews) if (!newIds.has(id)) { view.node.remove(); messageViews.delete(id); }
  }
  async function refreshRoom() {
    const started = ++roomResponse;
    const data = await api(`${roomPath}/messages?limit=200&live=1`);
    if (started < lastRoomResponse) return;
    lastRoomResponse = started;
    activeTurn = data.active_turn;
    paintMessages([...data.items, ...data.queued]);
    drawActiveTurn(data.queued.length);
    scheduleReconnect();
  }
  function requestRefresh() {
    if (!live() || !roomPath || refreshTimer != null) return;
    refreshTimer = setTimeout(() => { refreshTimer = null; void refreshRoom().catch(report); }, 80);
  }
  async function pumpQueue(allowInterrupted = false) {
    if (!roomPath || queuePumping || navigator.onLine === false) return;
    queuePumping = true;
    try { await api(`${roomPath}/queue`, 'POST', { continueAfterInterruption: allowInterrupted }); }
    finally { queuePumping = false; }
  }
  async function send(text, withVoice) {
    if (!roomPath || sending || uploading || (!text.trim() && !attachments.length)) return;
    sending = true;
    paintAttachments();
    const requestId = crypto.randomUUID();
    if (withVoice) speakOnComplete.add(requestId);
    try {
      const payload = { request_id: requestId, content: { text, attachments: attachments.map(({ id }) => ({ id })) } };
      if (reply) payload.reply_to = { message_id: reply.id };
      await api(`${roomPath}/messages`, 'POST', payload);
      if (input.value === text) input.value = '';
      attachments.length = 0;
      reply = null;
      paintReply();
      setFeedback('');
      await refreshRoom();
    } catch (cause) { speakOnComplete.delete(requestId); throw cause; }
    finally { sending = false; paintAttachments(); }
  }
  compose.addEventListener('submit', task(async event => { event.preventDefault(); await send(input.value, false); }));
  const fileInput = compose.querySelector('input[type=file]');
  fileInput.disabled = !files;
  fileInput.addEventListener('change', task(async () => {
    if (!files || uploading) return;
    const selected = [...fileInput.files];
    fileInput.value = '';
    if (selected.length + attachments.length > 10) throw new Error('每条消息最多可附加 10 个文件。');
    uploading = true;
    fileInput.disabled = true;
    paintAttachments();
    try {
      for (const file of selected) attachments.push(await storeDotFile(files, file, { signal: controller.signal }));
      setFeedback('');
    } finally { uploading = false; fileInput.disabled = false; paintAttachments(); }
  }));

  const voiceStatus = find('.dot-panel-voice');
  voiceButton.addEventListener('click', task(async () => {
    if (recording) { recognition.stop(); return; }
    if (!SpeechRecognition || !globalThis.speechSynthesis) throw new Error('此浏览器缺少语音识别或语音播放能力。');
    let transcript = '', failure = false;
    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang || 'zh-CN';
    recognition.interimResults = true;
    recognition.onstart = () => { voiceButton.disabled = false; recording = true; voiceButton.textContent = '结束录音'; voiceStatus.textContent = '正在听…'; };
    recognition.onresult = event => {
      transcript = Array.from(event.results, result => result[0].transcript).join(' ').trim();
      voiceStatus.textContent = transcript;
    };
    recognition.onerror = event => { failure = true; voiceStatus.textContent = `语音识别失败（${event.error}）`; };
    recognition.onend = () => {
      recording = false;
      voiceButton.disabled = false;
      voiceButton.textContent = '语音对话';
      if (!live() || failure) return;
      if (!transcript) { voiceStatus.textContent = '未识别到语音。'; return; }
      input.value = transcript;
      if (sending || uploading) { voiceStatus.textContent = '已识别，请点发送。'; return; }
      void send(transcript, true).catch(report);
    };
    voiceButton.disabled = true;
    try { recognition.start(); }
    catch (cause) { voiceButton.disabled = false; throw cause; }
  }));
  if (!SpeechRecognition || !globalThis.speechSynthesis) voiceStatus.textContent = '语音对话需要浏览器支持麦克风识别和语音播放。';

  const journalForm = find('.dot-panel-journal-form');
  function editJournal(entry) {
    editEntry = entry;
    journalForm.elements.namedItem('entry').value = entry?.content ?? '';
    journalForm.elements.namedItem('save').textContent = entry ? '更新日记' : '保存日记';
    journalForm.elements.namedItem('cancel').hidden = !entry;
    if (entry) journalForm.elements.namedItem('entry').focus();
  }
  async function refreshJournal() {
    const { items } = await api(`${roomPath}/journal`);
    const list = find('.dot-panel-journal');
    list.replaceChildren(...items.map(entry => {
      const article = make('article');
      article.append(make('time', timestamp(entry.updated_at)), make('p', entry.content));
      const buttons = make('div'); buttons.className = 'dot-panel-actions';
      buttons.append(action('编辑日记', () => editJournal(entry)), action('删除日记', event => {
        event.currentTarget.replaceWith(action('确认删除日记', task(async () => {
          await api(`${roomPath}/journal/${encodeURIComponent(entry.id)}`, 'DELETE', { revision: entry.revision });
          if (editEntry?.id === entry.id) editJournal(null);
          await refreshJournal();
        })));
      }));
      article.append(buttons);
      return article;
    }));
  }
  journalForm.elements.namedItem('cancel').addEventListener('click', () => editJournal(null));
  journalForm.addEventListener('submit', task(async event => {
    event.preventDefault();
    if (!roomPath) return;
    const path = `${roomPath}/journal${editEntry ? '/' + encodeURIComponent(editEntry.id) : ''}`;
    const content = journalForm.elements.namedItem('entry').value;
    await api(path, editEntry ? 'PATCH' : 'POST', { content, revision: editEntry?.revision });
    editJournal(null);
    setFeedback('日记已保存。');
    await refreshJournal();
  }));

  const automationPath = () => `/tbo/${encodeURIComponent(profile.id)}/automations`;
  async function refreshAutomations() {
    const { items } = await api(`${automationPath()}?limit=30`);
    if (currentView !== 'automations') return items;
    find('.dot-panel-automations').replaceChildren(...items.map(schedule => {
      const article = make('article');
      article.append(make('h3', schedule.name));
      const run = schedule.last_run;
      const status = schedule.enabled ? (schedule.next_at ? '下次 · ' + timestamp(schedule.next_at) : '手动执行') : '已停用';
      article.append(make('div', status));
      if (run) {
        article.append(make('div', [runStatuses[run.status] ?? run.status, run.model, run.duration_ms == null ? null : Math.round(run.duration_ms / 1000) + ' 秒'].filter(Boolean).join(' · ')));
        if (run.error || run.output) article.append(make('p', run.error ?? run.output));
      }
      const buttons = make('div'); buttons.className = 'dot-panel-actions';
      const execute = action('立即运行', task(async event => {
        event.currentTarget.disabled = true;
        try { await api(`${automationPath()}/${schedule.id}/run`, 'POST', { request_id: crypto.randomUUID() }); }
        finally { await refreshAutomations(); }
      }));
      execute.disabled = !schedule.enabled || ['queued','inProgress'].includes(run?.status);
      buttons.append(execute, action(schedule.enabled ? '停用' : '启用', task(async () => {
        await api(`${automationPath()}/${schedule.id}`, 'PATCH', { enabled: !schedule.enabled });
        await refreshAutomations();
      })));
      article.append(buttons);
      return article;
    }));
    return items;
  }
  const automationForm = find('.dot-panel-automation-form');
  automationForm.addEventListener('submit', task(async event => {
    event.preventDefault();
    if (!profile) return;
    await api(automationPath(), 'POST', { name: automationForm.elements.namedItem('taskName').value, prompt: automationForm.elements.namedItem('prompt').value, interval_minutes: Number(automationForm.elements.namedItem('interval').value) });
    automationForm.reset();
    await refreshAutomations();
  }));
  async function tickAutomations() {
    if (!roomPath || scheduleTicking || navigator.onLine === false) return;
    scheduleTicking = true;
    try {
      const items = await refreshAutomations();
      for (const item of items) if (item.enabled && item.next_at != null && item.next_at <= Date.now()) {
        await api(`${automationPath()}/${item.id}/run`, 'POST', { scheduled_for: item.next_at, request_id: crypto.randomUUID() });
      }
    } finally { scheduleTicking = false; }
  }

  const skins = find('.dot-panel-appearance-form');
  for (const [name, options] of Object.entries({ avatar: faces, color: colors })) {
    const select = skins.elements.namedItem(name);
    for (const [key, [label]] of Object.entries(options)) { const option = make('option', label); option.value = key; select.append(option); }
  }
  skins.addEventListener('submit', task(async event => {
    event.preventDefault();
    if (!profile) return;
    profile = await api(`/tbo/${encodeURIComponent(profile.id)}`, 'PATCH', {
      avatar_id: skins.elements.namedItem('avatar').value, avatar_type: 'default',
      avatar_manifest: { schema_version: 1, tint: skins.elements.namedItem('color').value },
    });
    paintAvatar();
    setFeedback('皮肤已保存。');
  }));

  const disposeTurns = appServer?.subscribe(event => {
    const { method, params } = event;
    if (!profile || params.threadId !== profile.messaging_room_id) return;
    requestRefresh();
    if (method !== 'turn/completed') return;
    const turn = params.turn;
    if (speakOnComplete.delete(turn.clientUserMessageId) && turn.status === 'completed') {
      const text = turn.items.filter(item => item.type === 'agentMessage' && item.phase !== 'commentary').map(item => item.text).join('\n');
      speak(text);
    }
    void pumpQueue().then(() => requestRefresh()).catch(report);
    if (currentView === 'automations') void refreshAutomations().catch(report);
  }) ?? (() => {});
  const resumeQueue = () => { void pumpQueue().then(requestRefresh).catch(report); void tickAutomations().catch(report); };
  globalThis.addEventListener('online', resumeQueue);
  const timer = setInterval(() => { if (activeTurn?.status === 'inProgress') drawActiveTurn(); }, 1000);
  const scheduler = setInterval(() => { void tickAutomations().catch(report); }, 15000);
  compose.elements.namedItem('send').disabled = true;
  const ready = (async () => {
    const { items } = await api('/tbo');
    const selected = items.find(item => item.is_primary) ?? items[0];
    if (!selected) throw new Error('这个账号没有可用的 Dot。');
    profile = await api(`/tbo/${encodeURIComponent(selected.id)}/messaging-room`, 'POST', {});
    roomPath = `/messaging/rooms/${encodeURIComponent(profile.messaging_room_id)}`;
    paintAvatar();
    skins.elements.namedItem('avatar').value = faces[profile.avatar_id] ? profile.avatar_id : 'sunglasses';
    skins.elements.namedItem('color').value = colors[profile.avatar_manifest?.tint] ? profile.avatar_manifest.tint : 'pink';
    paintAttachments();
    switchView(currentView);
    await refreshRoom();
    resumeQueue();
  })().catch(report);
  return {
    ready,
    dispose() {
      controller.abort();
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
      clearInterval(timer);
      clearInterval(scheduler);
      globalThis.removeEventListener('online', resumeQueue);
      disposeTurns();
      recognition?.abort();
      if (utterance) speechSynthesis.cancel();
      panel.remove();
    },
  };
}
