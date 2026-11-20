import { DEFAULT_SETTINGS } from '../config.js?v=77599d3a62544f6e';
import * as catalog from '../model-catalog.js?v=77599d3a62544f6e';
import { PYTHON_TOOL, PythonRuntime, streamCompletion } from '../runtime.js?v=77599d3a62544f6e';
import { LocalAppServer } from '../native-client/local-app-server.mjs?v=77599d3a62544f6e';
import { createModelCatalogAdapter } from '../native-client/model-catalog-adapter.mjs?v=77599d3a62544f6e';
import { createProviderCompletionRouter } from '../native-client/provider-routing.mjs?v=77599d3a62544f6e';
import { createBrowserToolExecutor } from '../native-client/browser-tool-executor.mjs?v=77599d3a62544f6e';
import { createLocalFilesService } from '../native-client/local-files-service.mjs?v=77599d3a62544f6e';
import { createLocalInputPreparer } from '../native-client/local-input-preparation.mjs?v=77599d3a62544f6e';
import { getSiteAccount, initializeSiteAccount, loginSiteAccount, logoutSiteAccount, registerSiteAccount } from '../native-client/site-account.mjs?v=77599d3a62544f6e';
import { compressImageFile, imageDataURL } from './image.mjs?v=1';
import { openConversationStorage } from './history.mjs?v=1';

const byId = id => document.getElementById(id);
const elements = Object.fromEntries([
  'account-action', 'account-name', 'connection', 'composer', 'compose-status', 'storage-status', 'prompt',
  'model-options', 'mode', 'model', 'effort', 'free-thinking', 'think', 'web-search', 'image-picker',
  'attachments', 'attach', 'send', 'stop', 'history', 'new-chat', 'messages', 'sign-in', 'account-form',
  'username', 'password', 'account-error', 'close-account', 'register', 'login',
].map(id => [id, byId(id)]));
const el = (name, className, text) => {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const root = new URL(document.baseURI);
const models = createModelCatalogAdapter(catalog);
const allowedImageData = /^data:image\/(?:png|jpeg|webp);base64,/i;
const drafts = [];
let account, server, executor, currentId, unsubscribe, ready = false, preparing = false, frame = 0;
const paid = () => account?.planType === 'plus' || account?.planType === 'pro';
const active = () => Boolean(currentId && server?.running.has(currentId));
const status = (text = '', failed = false) => {
  elements['compose-status'].textContent = text;
  elements['compose-status'].classList.toggle('is-error', failed);
};

function requestedThread() {
  const url = new URL(location.href);
  return url.searchParams.get('c') ?? url.pathname.match(/\/c\/([^/]+)\/?$/)?.[1] ?? null;
}

function selectThread(id, updateURL = true) {
  currentId = server.threads.has(id) ? id : null;
  if (updateURL) {
    const url = new URL(root);
    if (currentId) url.searchParams.set('c', currentId);
    history.replaceState(null, '', url);
  }
  renderHistory();
  renderMessages(true);
  updateControls();
}

function updateControls() {
  const running = active(), locked = !ready || running || preparing;
  for (const key of ['prompt', 'attach', 'history', 'new-chat', 'account-action', 'mode', 'model', 'effort', 'think', 'web-search']) {
    elements[key].disabled = locked;
  }
  elements.send.disabled = locked || (!elements.prompt.value.trim() && !drafts.length);
  elements.stop.hidden = !running;
  elements['model-options'].hidden = !paid();
  elements['free-thinking'].hidden = paid();
}

function options(node, choices, preferred) {
  node.replaceChildren(...choices.map(([value, label]) => new Option(label, value)));
  if (choices.some(([value]) => value === preferred)) node.value = preferred;
}

function updateEffort() {
  const chat = elements.mode.value === 'chat';
  const choices = chat ? [...catalog.CHAT_EFFORTS, 'pro'] : catalog.WORK_PINNED_EFFORTS[elements.model.value];
  const labels = chat ? { ...catalog.CHAT_EFFORT_LABELS, pro: 'Pro' } : catalog.WORK_EFFORT_LABELS;
  options(elements.effort, choices.map(value => [value, labels[value]]), elements.effort.value || 'medium');
}

function updateModels() {
  const chat = elements.mode.value === 'chat';
  const choices = chat ? catalog.CHAT_FAMILIES.map(family => [family.standardAlias, family.label]) : catalog.WORK_MODEL_IDS.map(id => [id, catalog.WORK_MODEL_LABELS[id]]);
  options(elements.model, choices, elements.model.value || (chat ? 'auto' : DEFAULT_SETTINGS.model));
  updateEffort();
}

function selection() {
  if (!paid()) return { executionSurface: 'chat', effort: elements.think.checked ? 'medium' : 'none' };
  const executionSurface = elements.mode.value, effort = elements.effort.value;
  if (executionSurface === 'chat' && effort === 'pro') {
    const family = catalog.CHAT_FAMILIES.find(item => item.standardAlias === elements.model.value);
    return { executionSurface, model: family.proAlias, effort: 'medium', reasoningMode: 'pro' };
  }
  return { executionSurface, model: elements.model.value, effort, reasoningMode: 'standard' };
}

function renderHistory() {
  const rows = [...server.threads.values()].filter(thread => !thread.archived && !thread.ephemeral && thread.turns.length);
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  options(elements.history, [['', '选择历史对话'], ...rows.map(thread => [thread.id, thread.name ?? '对话'])], currentId);
}

function renderAttachments() {
  elements.attachments.replaceChildren(...drafts.map(entry => {
    const item = el('li', 'attachment'), image = el('img'), description = el('div');
    image.src = entry.url;
    image.alt = '';
    description.append(el('strong', null, entry.name), el('small', null, `${entry.width} × ${entry.height} · ${Math.ceil(entry.blob.size / 1024)} KB`));
    const remove = el('button', null, '移除');
    remove.type = 'button';
    remove.setAttribute('aria-label', `移除 ${entry.name}`);
    remove.addEventListener('click', () => {
      const index = drafts.indexOf(entry);
      if (index < 0) return;
      drafts.splice(index, 1);
      URL.revokeObjectURL(entry.url);
      renderAttachments();
      updateControls();
    });
    item.append(image, description, remove);
    return item;
  }));
}

function clearDrafts() {
  for (const entry of drafts.splice(0)) URL.revokeObjectURL(entry.url);
  renderAttachments();
}

async function addImages(files) {
  if (!ready || preparing || active() || !files.length) return;
  preparing = true;
  updateControls();
  status('正在压缩图片…');
  let problem = '';
  try {
    for (const file of files) {
      if (drafts.length >= 4) { problem = '每条消息最多添加 4 张图片。'; break; }
      try {
        const compressed = await compressImageFile(file);
        drafts.push({ ...compressed, name: file.name || '粘贴的图片', url: URL.createObjectURL(compressed.blob) });
      } catch (error) { problem = error.message; }
    }
    renderAttachments();
    status(problem, Boolean(problem));
  } finally {
    preparing = false;
    updateControls();
  }
}

function bubble(kind, label, text) {
  const node = el('article', `message ${kind}`);
  node.append(el('p', 'message-label', label));
  if (text) node.append(el('p', 'message-body', text));
  return node;
}

function addSourceLinks(node, references = []) {
  for (const reference of references) {
    if (typeof reference.url !== 'string' || !/^https?:\/\//i.test(reference.url)) continue;
    const link = el('a', null, reference.title || reference.url);
    link.href = reference.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    node.append(el('br'), link);
  }
}

function renderUser(item) {
  const node = bubble('user', '你', item.content.filter(part => part.type === 'text').map(part => part.text).join('\n'));
  for (const image of item.content.filter(part => part.type !== 'text')) {
    if (image.url && allowedImageData.test(image.url)) {
      const preview = el('img', 'message-image');
      preview.src = image.url;
      preview.alt = '已发送的图片';
      node.append(preview);
    } else node.append(el('p', 'activity', '图片附件'));
  }
  return node;
}

function activityLabel(turn) {
  if (turn.status === 'inProgress') return turn.executionSurface === 'chat' ? '正在思考' : '处理中';
  if (turn.status === 'completed') {
    if (!Number.isFinite(turn.durationMs)) return '已完成';
    return turn.durationMs < 1000 ? `用时 ${turn.durationMs} 毫秒` : `用时 ${Math.round(turn.durationMs / 1000)} 秒`;
  }
  if (turn.error?.message) return turn.error.message;
  return turn.adapterMetadata?.resumePolicy === 'automatic' ? '等待恢复' : '已停止';
}

function renderMessages(scroll = false) {
  const panel = elements.messages, thread = server?.threads.get(currentId);
  const nearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 70;
  if (!thread?.turns.length) {
    panel.replaceChildren(el('p', 'empty', '发送一条消息开始对话。'));
    return;
  }
  const sections = thread.turns.map(turn => {
    const box = el('section', 'turn');
    for (const item of turn.items) {
      if (item.type === 'userMessage') box.append(renderUser(item));
      if (item.type === 'agentMessage' && item.text) {
        const node = bubble('assistant', item.phase === 'commentary' ? '进度' : '回答', item.text);
        addSourceLinks(node, item.webSearchReferences);
        box.append(node);
      }
    }
    const summary = turn.items.filter(item => item.type === 'reasoning').flatMap(item => item.summary ?? []);
    if (summary.length && turn.status !== 'inProgress') {
      const details = el('details', 'activity');
      details.append(el('summary', null, '思考摘要'), el('p', 'message-body', summary.join('\n')));
      box.append(details);
    }
    const label = activityLabel(turn);
    box.append(el('p', `activity${turn.status === 'inProgress' ? ' running' : ''}${turn.error ? ' is-error' : ''}`, label));
    return box;
  });
  panel.replaceChildren(...sections);
  if (scroll || nearBottom) panel.scrollTop = panel.scrollHeight;
}

function observe(event) {
  if (event.params.threadId !== currentId) return;
  if (['turn/completed', 'turn/started'].includes(event.method)) {
    updateControls();
    renderHistory();
  }
  if (!frame) frame = requestAnimationFrame(() => { frame = 0; renderMessages(); });
}

async function bindAccount() {
  ready = false;
  updateControls();
  unsubscribe?.();
  account = getSiteAccount();
  const accountId = account?.id ?? null;
  const storage = await openConversationStorage(account, () => {
    elements['storage-status'].hidden = false;
    elements['storage-status'].textContent = '浏览器暂时无法保存记录。请保留此标签页以继续当前对话。';
  });
  const api = createProviderCompletionRouter({
    complete: streamCompletion,
    getProviders: () => DEFAULT_SETTINGS.apiProviders,
    isCurrent: () => (getSiteAccount()?.id ?? null) === accountId,
  });
  executor = createBrowserToolExecutor({ PythonRuntime, PYTHON_TOOL, getWorkspaceNamespace: () => paid() ? null : account?.accountId ?? 'guest' });
  const files = createLocalFilesService({
    storage: executor.storage,
    metadataStorage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
    getAccountId: () => account?.accountId ?? (paid() ? '00000000-0000-4000-8000-000000000001' : null),
    getWorkspacePrefix: executor.getWorkspacePrefix,
  });
  const prepare = createLocalInputPreparer({ files });
  server = new LocalAppServer({
    storage, models, catalog,
    readSettings: () => ({ ...DEFAULT_SETTINGS, apiTransport: 'responses' }),
    streamCompletion: api.complete,
    toolExecutor: paid() ? executor : null,
    prepareUserInput: async context => {
      if (context.input.every(item => item.type === 'text' || item.type === 'image' && allowedImageData.test(item.url ?? ''))) {
        return {
          content: context.input.every(item => item.type === 'text') ? context.input.map(item => item.text).join('\n') : context.input.map(item => item.type === 'image' ? { type: 'image_url', image_url: { url: item.url } } : { type: 'text', text: item.text }),
          source: 'tyc-desk', files: [], images: [],
        };
      }
      return prepare(context);
    },
    getExecutionPolicy: () => ({ modelSelection: paid(), freeChatModel: DEFAULT_SETTINGS.freeChatModel }),
    agentOptions: { ultraOrchestration: true },
  });
  if (server.loadError) {
    elements['storage-status'].hidden = false;
    elements['storage-status'].textContent = '旧记录无法读取。本次对话将在临时会话中运行。';
    server.storage = null;
    server.loadError = null;
  }
  unsubscribe = server.subscribe(observe);
  elements['account-name'].textContent = account?.username ?? '访客';
  elements['account-action'].textContent = account ? '退出本站' : '本站登录';
  elements.connection.textContent = '可以开始对话';
  ready = true;
  updateModels();
  selectThread(requestedThread(), false);
  const last = server.threads.get(currentId)?.turns.at(-1);
  if (last?.adapterMetadata?.resumable && last.adapterMetadata.resumePolicy === 'automatic' && last.status !== 'completed') {
    try { server.dispatch('turn/resume', { threadId: currentId, turnId: last.id }).afterReply?.(); }
    catch (error) { status(error.message, true); }
    updateControls();
  }
}

function finishPreparing() {
  preparing = false;
  updateControls();
}

async function sendMessage(event) {
  event.preventDefault();
  if (elements.send.disabled) return;
  const message = elements.prompt.value.trim();
  const photos = [...drafts];
  preparing = true;
  updateControls();
  status();
  try {
    const input = message ? [{ type: 'text', text: message }] : [];
    for (const photo of photos) input.push({ type: 'image', url: await imageDataURL(photo.blob) });
    const choice = selection();
    if (!currentId) {
      const started = server.dispatch('thread/start', { ...choice, conversationOrigin: choice.executionSurface });
      selectThread(started.result.thread.id);
      started.afterReply?.();
    }
    const turn = server.dispatch('turn/start', {
      ...choice, threadId: currentId, input, clientUserMessageId: crypto.randomUUID(),
      forceUseSearch: elements['web-search'].checked,
    });
    elements.prompt.value = '';
    clearDrafts();
    renderMessages(true);
    turn.afterReply?.();
  } catch (error) { status(error.message, true); }
  finally { finishPreparing(); }
}

async function authenticate(register) {
  const form = elements['account-form'];
  if (elements.login.disabled || !form.reportValidity()) return;
  elements.login.disabled = elements.register.disabled = true;
  elements['account-error'].textContent = '';
  try {
    await (register ? registerSiteAccount : loginSiteAccount)(elements.username.value, elements.password.value);
    elements['sign-in'].close();
    form.reset();
    await bindAccount();
  } catch (error) { elements['account-error'].textContent = error.message; }
  finally { elements.login.disabled = elements.register.disabled = false; }
}

elements.composer.addEventListener('submit', sendMessage);
elements.prompt.addEventListener('input', updateControls);
elements.prompt.addEventListener('keydown', event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) elements.composer.requestSubmit();
});
elements.prompt.addEventListener('paste', event => {
  const images = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'));
  if (images.length) { event.preventDefault(); void addImages(images); }
});
elements.attach.addEventListener('click', () => elements['image-picker'].click());
elements['image-picker'].addEventListener('change', event => {
  const files = Array.from(event.target.files);
  event.target.value = '';
  void addImages(files);
});
elements.mode.addEventListener('change', updateModels);
elements.model.addEventListener('change', updateEffort);
elements.stop.addEventListener('click', () => server.interrupt(currentId));
elements.history.addEventListener('change', () => selectThread(elements.history.value));
elements['new-chat'].addEventListener('click', () => { selectThread(null); elements.prompt.focus(); });
elements['account-action'].addEventListener('click', async () => {
  if (!account) { elements['sign-in'].showModal(); return; }
  ready = false;
  updateControls();
  void logoutSiteAccount();
  clearDrafts();
  elements.prompt.value = '';
  await bindAccount();
});
elements['close-account'].addEventListener('click', () => elements['sign-in'].close());
elements['account-form'].addEventListener('submit', event => { event.preventDefault(); void authenticate(false); });
elements.register.addEventListener('click', () => void authenticate(true));
window.addEventListener('pagehide', () => server?.interruptAll({ reason: 'pagehide' }));

// Update only this site's old worker, without delaying the page or touching data.
void Promise.resolve().then(async () => {
  const registration = await navigator.serviceWorker?.getRegistration(root);
  if (registration?.scope === root.href && registration.active?.scriptURL.startsWith(new URL('native-client-worker.js', root).href)) {
    await registration.update();
  }
}).catch(() => {});

await initializeSiteAccount();
await bindAccount();
