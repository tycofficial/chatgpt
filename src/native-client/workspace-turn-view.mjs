import { marked } from '../../vendor/marked.js';
import DOMPurify from '../../vendor/purify.js';

export function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text != null) result.textContent = text;
  if (className) result.className = className;
  return result;
}

export function action(text, callback, className) {
  const button = element('button', text, className);
  button.type = 'button';
  button.addEventListener('click', callback);
  return button;
}

export function renderAnswer(container, text) {
  container.innerHTML = DOMPurify.sanitize(marked.parse(text), { FORBID_TAGS: ['img', 'video', 'audio', 'style', 'form', 'input', 'button'] });
  for (const link of container.querySelectorAll('a[href]')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}

const duration = ms => `${(Math.max(0, ms) / 1000).toFixed(ms < 10000 ? 1 : 0)} 秒`;
const toolNames = { python: 'Python', list_files: '列出文件', read_file: '读取文件', write_file: '写入文件', create_file: '创建文件', publish_file: '保存成品', delegate_tasks: '分配任务' };
const stepStatus = { inProgress: '运行中', running: '运行中', queued: '等待中', completed: '完成', failed: '失败', interrupted: '已中断', cancelled: '已停止' };

function detail(label, open, rows) {
  const details = element('details');
  details.dataset.section = label;
  details.open = open;
  const list = element('ul', null, 'activity');
  list.append(...rows);
  details.append(element('summary', label), list);
  return details;
}

function currentAttachments(turn) {
  const metadata = turn.adapterMetadata?.classicUserMessage?.metadata?.attachments ?? [];
  const prepared = turn.adapterMetadata?.checkpoint?.preparedInput?.files ?? [];
  const rows = new Map([...prepared, ...metadata].map(file => [file.id, file]));
  for (const part of turn.items.flatMap(item => item.type === 'userMessage' ? item.content ?? [] : [])) {
    if (part.type === 'image' && part.fileId && !rows.has(part.fileId)) rows.set(part.fileId, { id: part.fileId, name: '图片' });
  }
  return [...rows.values()].filter(file => file?.id);
}

export function createTranscriptView({ container, onResume, onDownload, onSpeak }) {
  let threadId = null;
  const rendered = new Map();

  function turnNode(turn, thread, open) {
    const node = element('article', null, 'turn');
    node.dataset.turnId = turn.id;
    const user = turn.items.find(item => item.type === 'userMessage');
    if (user) {
      const bubble = element('section', null, 'user-block');
      bubble.append(element('p', '你', 'speaker'));
      const prompt = (user.content ?? []).filter(part => part.type === 'text').map(part => part.text).join('\n');
      if (prompt.trim()) bubble.append(element('p', prompt, 'message-text'));
      const attachments = currentAttachments(turn);
      if (attachments.length) {
        const files = element('div', null, 'attachment-list');
        for (const file of attachments) files.append(action(file.name ?? file.fileName ?? '附件', () => onDownload(file.id), 'attachment'));
        bubble.append(files);
      }
      node.append(bubble);
    }

    for (const item of turn.items.filter(item => item.type === 'agentMessage' && item.text?.trim())) {
      const bubble = element('section', null, 'assistant-block');
      const text = element('div', null, 'answer-markdown');
      bubble.append(element('p', '助手', 'speaker'), text);
      if (turn.status === 'inProgress') text.append(element('p', item.text, 'message-text'));
      else {
        renderAnswer(text, item.text);
        const buttons = element('div', null, 'turn-actions');
        buttons.append(action('朗读 / 停止', () => onSpeak(thread.id, item.id)));
        bubble.append(buttons);
      }
      node.append(bubble);
    }

    const live = turn.status === 'inProgress';
    const failed = ['failed', 'interrupted'].includes(turn.status);
    const chat = (turn.executionSurface ?? thread.executionSurface) === 'chat';
    const progress = element('div', null, 'progress');
    progress.setAttribute('aria-busy', String(live));
    const start = turn.adapterMetadata?.startedAtMs;
    if (live) {
      const label = element('span', chat ? '正在思考' : '正在工作', 'progress-label');
      label.setAttribute('role', 'status');
      progress.append(label);
      if (Number.isFinite(start)) {
        const clock = element('span', ` · ${duration(Date.now() - start)}`, 'progress-label running-time');
        clock.dataset.startedAt = start;
        progress.append(clock);
      }
    } else {
      const label = turn.status === 'completed' ? '已完成' : turn.status === 'interrupted' ? '运行中断' : '请求失败';
      progress.append(element('span', label + (Number.isFinite(turn.durationMs) ? ` · ${duration(turn.durationMs)}` : ''), 'progress-label'));
    }
    if (failed && turn.error?.message) progress.append(element('p', turn.error.message, 'status error'));
    if (failed && turn.adapterMetadata?.resumable) {
      const actions = element('div', null, 'turn-actions');
      actions.append(action('接回 / 继续', () => onResume(thread.id, turn.id)));
      progress.append(actions);
    }
    node.append(progress);

    const steps = [];
    const tasks = [];
    const summaries = [];
    for (const call of turn.adapterMetadata?.checkpoint?.ultra?.calls ?? []) {
      for (const worker of call.workers) tasks.push(element('li', `${worker.title} · ${stepStatus[worker.status] ?? '状态未知'}`));
    }
    for (const item of turn.items) {
      if (item.type === 'reasoning') {
        for (const text of item.summary ?? []) if (typeof text === 'string' && text.trim()) summaries.push(element('li', text, 'message-text'));
      }
      if (item.type === 'plan' || item.type === 'task') {
        for (const entry of item.steps ?? [item]) {
          const description = entry.step ?? entry.description ?? entry.text;
          if (typeof description === 'string' && description.trim()) tasks.push(element('li', description));
        }
      }
      if (item.type === 'mcpToolCall' || item.type === 'webSearch') {
        const title = item.type === 'webSearch' ? '搜索网页' : toolNames[item.tool] ?? item.tool;
        const line = element('li', title + (stepStatus[item.status] ? ` · ${stepStatus[item.status]}` : ''));
        if (item.type === 'mcpToolCall' && item.tool !== 'delegate_tasks') {
          for (const part of item.result?.content ?? []) if (part.type === 'text' && part.text) line.append(element('pre', part.text));
        }
        steps.push(line);
      }
    }
    if (!chat && tasks.length) node.append(detail('Tasks', open.has('Tasks'), tasks));
    if (!chat && steps.length) node.append(detail('Steps', open.has('Steps'), steps));
    if (chat && steps.length) node.append(detail('工具活动', open.has('工具活动'), steps));
    if (summaries.length) node.append(detail('思考摘要', open.has('思考摘要'), summaries));

    const timing = turn.adapterMetadata;
    const tier = timing?.serviceTierExecution;
    const observed = tier?.observedServiceTier ?? tier?.actualServiceTier ?? tier?.providerServiceTier;
    const receipts = [];
    if (Number.isFinite(timing?.firstTextAtMs) && Number.isFinite(start)) receipts.push(`首段文字 ${duration(timing.firstTextAtMs - start)}`);
    if (turn.model && !live) receipts.push(turn.model);
    if (turn.serviceTier === 'fast' && !live) receipts.push(`请求加速 · 服务返回 ${observed || '未知档位'}`);
    if (receipts.length) node.append(element('p', receipts.join(' · '), 'work-receipt'));
    return node;
  }

  function update(thread, mode) {
    const nextId = thread?.id ?? `empty:${mode}`;
    if (threadId !== nextId) {
      threadId = nextId;
      rendered.clear();
      container.replaceChildren();
    }
    if (!thread?.turns.length) {
      if (!container.childNodes.length) {
        const empty = element('section', null, 'empty');
        const heading = { chat: '开始对话', work: '开始工作', codex: '开始 Codex 对话' }[mode];
        const message = { chat: '发送问题，或上传文件一起讨论。', work: '描述任务和你需要的结果。', codex: '输入编码任务。没有选项目也可以开始。' }[mode];
        empty.append(element('h2', heading), element('p', message));
        container.append(empty);
      }
      return;
    }
    container.querySelector('.empty')?.remove();
    for (const [id, { node }] of rendered) if (!thread.turns.some(turn => turn.id === id)) {
      node.remove();
      rendered.delete(id);
    }
    for (const turn of thread.turns) {
      const workers = turn.adapterMetadata?.checkpoint?.ultra?.calls.flatMap(call => call.workers.map(worker => worker.status));
      const signature = JSON.stringify([turn.status, turn.items, turn.error, turn.durationMs, turn.adapterMetadata?.resumable, turn.adapterMetadata?.serviceTierExecution, workers]);
      const last = rendered.get(turn.id);
      if (last?.signature === signature) continue;
      const open = new Set([...last?.node.querySelectorAll('details[open]') ?? []].map(node => node.dataset.section));
      const node = turnNode(turn, thread, open);
      if (last) last.node.replaceWith(node);
      else container.append(node);
      rendered.set(turn.id, { node, signature });
    }
  }

  function tick() {
    for (const clock of container.querySelectorAll('.running-time')) clock.textContent = ` · ${duration(Date.now() - Number(clock.dataset.startedAt))}`;
  }

  return { update, tick };
}
