import { DEFAULT_SETTINGS } from "./config.js";
import { completeToolResponses } from "./conversation.js";
import { WEB_TOOL, searchWeb } from "./web.js";
import { getModels, streamCompletion, PythonRuntime, PYTHON_TOOL } from "./runtime.js";
import * as db from "./storage.js";
import { marked } from "./vendor/marked.js";
import DOMPurify from "./vendor/purify.js";
import hljs from "./vendor/highlight.js";
import renderMathInElement from "./vendor/auto-render.js";
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const escape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const uid = () => crypto.randomUUID();
const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const settings = { ...DEFAULT_SETTINGS, ...readJSON("cg-settings", {}) };
let chats = [], active = null, mode = "chat", busy = false, controller = null, pendingFiles = [], models = [], temporary = false, projectFilter = null;
let projects = readJSON("cg-projects", []), currentView = "chat", voiceSession = false, recognition = null;
const python = new PythonRuntime();
const modelLabel = (id) => id === "auto" ? "Auto" : id.replace(/^gpt-/, "GPT-").replace(/-codex/, " Codex").replace(/-xhigh/, " · Extended");
const modes = { chat: { product: "ChatGPT", title: "你想做点什么？", placeholder: "向 ChatGPT 发送消息", hint: "ChatGPT 也可能会犯错。请核查重要信息。" }, work: { product: "ChatGPT", title: "我们今天要完成什么？", placeholder: "描述你的任务，让 ChatGPT 帮你完成", hint: "Work 可以分析文件、运行 Python，并生成可下载的成果。" }, codex: { product: "Codex", title: "我们来构建点什么？", placeholder: "描述一个任务，或添加项目文件", hint: "Codex 使用浏览器工作区与 Python。可以查看代码、预览和下载文件。" } };
function toast(message) {
  let t = $(".toast");
  if (t) t.remove();
  t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = message;
  $("#toast-root").append(t);
  setTimeout(() => t.remove(), 4e3);
}
function closeMenus() {
  ["product-menu", "model-menu", "profile-menu", "tools-menu"].forEach((id) => {
    if ($("#" + id)) $("#" + id).hidden = true;
  });
  $$(".context-menu").forEach((x) => x.remove());
}
function toggleMenu(id) {
  const hidden = $("#" + id).hidden;
  closeMenus();
  $("#" + id).hidden = !hidden;
  const button = $(`[aria-controls="${id}"]`) || $("#" + id.replace("-menu", "-button"));
  button?.setAttribute("aria-expanded", String(hidden));
}
function applyTheme() {
  const dark = settings.theme === "dark" || settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
function persistSettings() {
  localStorage.setItem("cg-settings", JSON.stringify(settings));
  applyTheme();
}
async function persistChat(chat = active) {
  if (!chat || chat.temporary) return;
  chat.updatedAt = Date.now();
  try {
    await db.saveChat(chat);
  } catch (e) {
    toast(e.message);
  }
  renderHistory();
}
function setMode(next) {
  mode = modes[next] ? next : "chat";
  document.body.dataset.mode = mode;
  const m = modes[mode];
  $("#product-button").innerHTML = m.product + icon("chevron");
  $("#welcome h1, #welcome h2")?.replaceChildren(document.createTextNode(m.title));
  $("#prompt").placeholder = m.placeholder;
  $("#prompt").setAttribute("aria-label", m.placeholder);
  $("#disclaimer").textContent = m.hint;
  $("#mode-chat").classList.toggle("active", mode === "chat");
  $("#mode-work").classList.toggle("active", mode === "work");
  $("#mode-chat").setAttribute("aria-pressed", String(mode === "chat"));
  $("#mode-work").setAttribute("aria-pressed", String(mode === "work"));
  renderSuggestions();
}
function renderSuggestions() {
  const options = mode === "codex" ? [["code", "构建一个网页", "帮我创建一个简洁好看的个人主页，生成完整 HTML 文件。"], ["search", "解释一段代码", "我想理解一段代码，请告诉我可以上传哪些文件。"], ["terminal", "运行 Python", "请运行 Python，计算前 20 个斐波那契数。"], ["file", "处理项目文件", "帮我梳理一个项目的结构，我会上传项目文件。"]] : mode === "work" ? [["file", "撰写一份报告", "帮我制定一份完整、可执行的项目计划，并生成 Markdown 文件。"], ["grid", "分析数据", "我想分析数据并绘制图表，请先告诉我需要提供什么。"], ["code", "创建一个网站", "创建一个介绍太阳系的交互式 HTML 网页，供我下载并预览。"], ["terminal", "用 Python 计算", "用 Python 模拟抛硬币 10000 次，绘制频率图并生成结果文件。"]] : [["image", "创建图片", "帮我构思一张风景图。"], ["book", "帮我学习", "教我一个有趣的科学知识，并用一个简单例子解释。"], ["edit", "一起写作", "帮我写一段有画面感的故事开头。"], ["bolt", "激发灵感", "给我 5 个周末创意项目的点子。"]];
  $("#suggestions").innerHTML = options.map(([i, t, p]) => `<button class="suggestion-chip" ${i === "image" ? 'data-action="image-generate"' : `data-prompt="${escape(p)}"`}>${icon(i)}${t}</button>`).join("");
}
function renderHistory() {
  const container = $("#history-list");
  if (!container) return;
  const list = chats.filter((c) => !c.archived && (!projectFilter || c.projectId === projectFilter)).sort((a, b) => (b.pinned || 0) - (a.pinned || 0) || b.updatedAt - a.updatedAt);
  let group = "";
  container.innerHTML = list.map((c) => {
    const diff = (Date.now() - c.updatedAt) / 864e5;
    const g = c.pinned ? "已置顶" : diff < 1 ? "今天" : diff < 2 ? "昨天" : diff < 7 ? "过去 7 天" : "更早";
    const label = g !== group ? `<div class="history-heading">${group = g}</div>` : "";
    return `${label}<div class="history-row ${c.id === active?.id ? "selected" : ""}"><button class="history-chat" data-chat="${c.id}" title="${escape(c.title)}">${escape(c.title || "新聊天")}</button><button class="history-more icon-button" aria-label="聊天选项" data-chat-menu="${c.id}">${icon("more")}</button></div>`;
  }).join("") || '<p class="history-empty">你的聊天会显示在这里</p>';
  renderProjects();
}
function renderProjects() {
  let target = $("#project-list");
  if (!target) {
    target = document.createElement("div");
    target.id = "project-list";
    const nav = $('[data-action="new-project"]');
    nav?.after(target);
  }
  target.innerHTML = projects.map((p) => `<button class="nav-item ${projectFilter === p.id ? "active" : ""}" data-project="${p.id}">${icon("folder")}<span>${escape(p.name)}</span></button>`).join("");
}
function newChat(nextMode = mode) {
  if (busy) {
    toast("请先停止当前回复");
    return;
  }
  active = null;
  pendingFiles = [];
  temporary = false;
  currentView = "chat";
  python.reset();
  setMode(nextMode);
  $("#chat-title").textContent = "";
  document.body.classList.remove("has-messages", "sidebar-open");
  $("#messages").innerHTML = "";
  $("#welcome").hidden = false;
  $("#composer-form").hidden = false;
  $("#artifact-panel").hidden = true;
  $("#prompt").value = "";
  autoGrow();
  renderAttachments();
  renderHistory();
  history.replaceState(null, "", location.pathname);
  localStorage.removeItem("cg-active");
  $("#prompt").focus();
}
function openChat(id) {
  if (busy) {
    toast("请先停止当前回复");
    return;
  }
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  active = chat;
  currentView = "chat";
  temporary = !!chat.temporary;
  pendingFiles = [];
  python.reset();
  setMode(chat.mode);
  $("#chat-title").textContent = chat.title;
  $("#composer-form").hidden = false;
  $("#artifact-panel").hidden = true;
  renderMessages();
  renderHistory();
  renderAttachments();
  document.body.classList.remove("sidebar-open");
  localStorage.setItem("cg-active", id);
  history.replaceState(null, "", location.pathname + "#c=" + id);
}
function autoGrow() {
  const p = $("#prompt");
  p.style.height = "auto";
  p.style.height = Math.min(p.scrollHeight, 240) + "px";
  const hasInput = !!p.value.trim() || pendingFiles.length > 0;
  $("#send-button").disabled = busy || !hasInput;
  $("#send-button").hidden = busy || !hasInput;
  $("#voice-button").hidden = busy || hasInput;
}
function download(name, data, type = "text/plain") {
  const url = typeof data === "string" && data.startsWith("data:") ? data : URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function fileHTML(f) {
  return `<button class="file-chip" data-artifact="${escape(f.id || f.name)}">${f.type?.startsWith("image/") || f.mime?.startsWith("image/") ? `<img alt="" src="${escape(f.dataUrl)}">` : icon("file")}<span><strong>${escape(f.name)}</strong><small>${escape(f.mime || f.type || "文件")}</small></span>${icon("download")}</button>`;
}
function markdown(source) {
  try {
    const linked = (source || "").replace(/\]\(sandbox:\/mnt\/data\/([^)]+)\)/g, (_, name) => `](#file=${encodeURIComponent(name)})`);
    return DOMPurify.sanitize(marked.parse(linked, { breaks: true, gfm: true }), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form", "input"], FORBID_ATTR: ["style"] });
  } catch {
    return escape(source);
  }
}
function enrich(container) {
  container.querySelectorAll("pre > code").forEach((code) => {
    if (code.parentElement.closest(".code-block")) return;
    const lang = ([...code.classList].find((x) => x.startsWith("language-")) || "language-text").slice(9);
    const block = document.createElement("div");
    block.className = "code-block";
    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `<span>${escape(lang)}</span><span><button data-code-action="copy">${icon("copy")}复制代码</button>${/^(python|py)$/.test(lang) ? `<button data-code-action="run">${icon("terminal")}运行</button>` : ""}${/^(html|htm)$/.test(lang) ? `<button data-code-action="preview">${icon("code")}预览</button>` : ""}<button data-code-action="download">${icon("download")}</button></span>`;
    const pre = code.parentElement;
    pre.before(block);
    block.append(header, pre);
    if (hljs.getLanguage(lang)) {
      code.classList.add("hljs");
      code.innerHTML = hljs.highlight(code.textContent, { language: lang }).value;
    }
  });
  try {
    renderMathInElement(container, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }], throwOnError: false });
  } catch {
  }
  container.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href")?.startsWith("#file=")) {
      a.dataset.artifact = decodeURIComponent(a.getAttribute("href").slice(6));
      a.removeAttribute("href");
      a.setAttribute("role", "button");
      a.tabIndex = 0;
      return;
    }
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}
function toolHTML(t) {
  return `<details class="tool-card" ${t.running ? "open" : ""}><summary>${icon(t.name === "python" ? "terminal" : "file")}<span>${escape(t.label || t.name)}</span>${t.running ? '<span class="spinner"></span>' : icon(t.error ? "close" : "check")}</summary><div class="tool-body">${t.code ? `<pre><code>${escape(t.code)}</code></pre>` : ""}${t.stdout ? `<pre>${escape(t.stdout)}</pre>` : ""}${t.stderr ? `<pre class="error-text">${escape(t.stderr)}</pre>` : ""}${t.result ? `<pre>${escape(t.result)}</pre>` : ""}${(t.images || []).map((src) => `<img class="tool-image" src="${escape(src)}" alt="Python 生成的图表">`).join("")}</div></details>`;
}
function messageHTML(m) {
  if (m.role === "tool") return "";
  const content = m.role === "user" ? `<div class="message-content">${escape(m.content).replace(/\n/g, "<br>")}</div>` : `${(m.executions || []).map(toolHTML).join("")}<div class="message-content prose">${markdown(m.content)}${m.streaming && !m.content ? '<span class="thinking-dot"></span>' : ""}</div>`;
  return `<article class="message ${m.role}" data-message="${m.id}">${m.role === "assistant" ? `<div class="assistant-avatar">${icon(mode === "codex" ? "code" : "logo")}</div>` : ""}<div class="message-inner">${(m.attachments || []).length ? `<div class="message-files">${m.attachments.map(fileHTML).join("")}</div>` : ""}${content}${(m.artifacts || []).length ? `<div class="message-files">${m.artifacts.map(fileHTML).join("")}</div>` : ""}${m.error ? `<div class="inline-error">${escape(m.error)}<button data-msg-action="retry" data-mid="${m.id}">重试</button></div>` : ""}${!m.streaming ? `<div class="message-actions"><button aria-label="复制" title="复制" data-msg-action="copy" data-mid="${m.id}">${icon("copy")}</button>${m.role === "assistant" ? `<button aria-label="朗读" title="朗读" data-msg-action="speak" data-mid="${m.id}">${icon("volume")}</button><button aria-label="好评" title="好评" data-msg-action="like" data-mid="${m.id}" class="${m.feedback === "like" ? "active" : ""}">${icon("thumbup")}</button><button aria-label="差评" title="差评" data-msg-action="dislike" data-mid="${m.id}" class="${m.feedback === "dislike" ? "active" : ""}">${icon("thumbdown")}</button><button aria-label="重新生成" title="重新生成" data-msg-action="retry" data-mid="${m.id}">${icon("retry")}</button>` : `<button aria-label="编辑消息" title="编辑消息" data-msg-action="edit" data-mid="${m.id}">${icon("edit")}</button>`}</div>` : ""}</div></article>`;
}
function nearBottom() {
  const area = $("#messages");
  return area.scrollHeight - area.scrollTop - area.clientHeight < 160;
}
function renderMessages(scroll = true) {
  const has = !!active?.messages.length;
  document.body.classList.toggle("has-messages", has);
  $("#welcome").hidden = has;
  const stick = nearBottom();
  $("#messages").innerHTML = (active?.messages || []).map(messageHTML).join("");
  enrich($("#messages"));
  if (scroll || stick) $("#messages").scrollTop = $("#messages").scrollHeight;
}
function renderStreaming(m) {
  const row = $(`[data-message="${m.id}"]`);
  if (!row) {
    renderMessages();
    return;
  }
  const stick = nearBottom();
  const content = row.querySelector(".message-content");
  content.innerHTML = markdown(m.content || "") || '<span class="thinking-dot"></span>';
  if (stick) $("#messages").scrollTop = $("#messages").scrollHeight;
}
function renderAttachments() {
  $("#attachments").innerHTML = pendingFiles.map((f, i) => `<div class="attachment-preview">${f.type?.startsWith("image/") ? `<img alt="${escape(f.name)}" src="${escape(f.dataUrl)}">` : icon("file")}<span>${escape(f.name)}<small>${(f.size / 1024).toFixed(0)} KB</small></span><button aria-label="移除 ${escape(f.name)}" data-remove-file="${i}">${icon("close")}</button></div>`).join("");
  autoGrow();
}
const CREATE_FILE = { type: "function", function: { name: "create_file", description: "Create a downloadable UTF-8 file. Use for HTML apps, markdown reports, CSV, JSON, code, SVG or text. HTML files can be previewed.", parameters: { type: "object", properties: { name: { type: "string" }, content: { type: "string" }, mime: { type: "string" } }, required: ["name", "content"], additionalProperties: false } } };
const READ_FILE = { type: "function", function: { name: "read_file", description: "Read a text file uploaded by the user or generated in this conversation. For binary spreadsheets use Python.", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } } };
function allFiles() {
  const byName = /* @__PURE__ */ new Map();
  for (const m of active?.messages || []) for (const f of [...m.attachments || [], ...m.artifacts || []]) byName.set(f.name, f);
  return [...byName.values()];
}
function systemPrompt() {
  const project = projects.find((p) => p.id === active?.projectId);
  return `You are a helpful AI assistant in an independent ChatGPT-style web workspace. Current date: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}. Respond in the user's language. Be accurate, clear, and useful. Never claim you ran a tool when you did not. You do not have OpenAI's private services, local OS shell, or access to user's machine. You can use the tools actually provided, including live search_web when enabled. Cite source URLs from search results. Python is real CPython via Pyodide in an isolated browser worker. Variables persist until switching chats or reloading; uploaded and generated files are restored. Supports numpy, pandas, matplotlib and Pyodide packages. Uploaded files are in /mnt/data. Save binary files and charts under /mnt/data for download. Use print() for outputs. Avoid interactive input, subprocess and system commands. Prefer create_file for HTML/SVG/text deliverables. Actually create files instead of only writing sandbox links. ${mode === "work" ? "Work mode: carry tasks through to reviewable results. Briefly plan complex tasks, use tools, verify results and create useful deliverables." : mode === "codex" ? "Codex mode: implement, debug and explain software. Inspect uploaded files, use Python to test logic, create runnable files and describe validation. HTML previews are available. Never pretend to have git or terminal access." : "Chat mode: answer naturally; use tools when they improve accuracy."} ${settings.customInstructions || ""} ${project ? "Project: " + project.name + "\nInstructions: " + (project.instructions || "") : ""} Available files: ${allFiles().map((f) => "/mnt/data/" + f.name).join(", ") || "none"}.`;
}
function apiMessages() {
  const result = [{ role: "system", content: systemPrompt() }];
  for (const m of active.messages) {
    if (m.error && !m.content && !m.tool_calls) continue;
    if (m.role === "tool") {
      result.push({ role: "tool", tool_call_id: m.tool_call_id, content: m.content });
      continue;
    }
    if (m.role === "user") {
      let text = m.content || "";
      const images = [];
      for (const f of m.attachments || []) {
        if (f.type?.startsWith("image/")) images.push({ type: "image_url", image_url: { url: f.dataUrl } });
        else text += `

[Uploaded file: /mnt/data/${f.name}]${f.content ? "\n" + f.content.slice(0, 1e5) : " (binary file; read with Python)"}`;
      }
      result.push({ role: "user", content: images.length ? [{ type: "text", text: text || "Please analyze the attached image." }, ...images] : text });
    } else if (m.content || m.tool_calls) result.push({ role: "assistant", content: m.content || null, ...m.tool_calls ? { tool_calls: m.tool_calls } : {} });
  }
  return result;
}
async function createArtifact(name, content, mime) {
  name = String(name || "untitled.txt").split(/[\\/]/).pop();
  const type = mime || ({ "html": "text/html", "svg": "image/svg+xml", "md": "text/markdown", "json": "application/json", "csv": "text/csv", "py": "text/x-python", "js": "text/javascript", "css": "text/css" }[name.split(".").pop()] || "text/plain");
  const dataUrl = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(new Blob([content], { type }));
  });
  const file = { id: uid(), name, content, type, mime: type, dataUrl, createdAt: Date.now() };
  if (!temporary) await db.saveAsset(file);
  return file;
}
async function executeTool(call, message) {
  let args;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return JSON.stringify({ error: "工具参数不是有效 JSON，请修正参数后重试。" });
  }
  const name = call.function.name;
  const execution = { name: name === "python" || name === "python_execute" ? "python" : name, label: name === "python" || name === "python_execute" ? "正在运行 Python…" : name === "create_file" ? "正在创建文件…" : "正在读取文件…", running: true, code: args.code || "" };
  message.executions ??= [];
  message.executions.push(execution);
  renderMessages(false);
  try {
    let result;
    if (["python", "python_execute"].includes(name)) {
      const output = await python.run(args.code, allFiles(), (s) => {
        execution.label = s;
        const summary = $(`[data-message="${message.id}"] .tool-card:last-of-type summary span`);
        if (summary) summary.textContent = s;
      });
      Object.assign(execution, output, { label: output.stderr ? "Python 已运行 · 请查看输出" : "已运行 Python", running: false });
      const files = [];
      for (const f of output.files || []) {
        const asset = { ...f, id: uid(), type: f.mime, createdAt: Date.now() };
        if (!temporary) await db.saveAsset(asset);
        files.push(asset);
      }
      message.artifacts = [...message.artifacts || [], ...files];
      result = { stdout: output.stdout, stderr: output.stderr, result: output.result, files: files.map((f) => ({ name: f.name, path: "/mnt/data/" + f.name })) };
    } else if (name === "create_file") {
      const file = await createArtifact(args.name, args.content, args.mime);
      message.artifacts ??= [];
      message.artifacts.push(file);
      execution.label = "已创建 " + file.name;
      execution.running = false;
      result = { created: true, name: file.name, downloadAvailable: true };
    } else if (name === "read_file") {
      const requestedName = String(args.name || "").replace(/^\/mnt\/data\//, "");
      const file = allFiles().find((f) => f.name === requestedName);
      if (!file) throw new Error("找不到文件：" + args.name);
      const content = file.content || ((file.type || file.mime || "").startsWith("text/") ? await (await fetch(file.dataUrl)).text() : null);
      result = { name: file.name, content: content ?? "Binary file. Use Python to read /mnt/data/" + file.name };
      execution.label = "已读取 " + file.name;
      execution.running = false;
    } else if (name === "search_web") {
      execution.label = "正在搜索网页…";
      const found = await searchWeb(settings, args.query, controller?.signal);
      execution.label = found.searched ? "已搜索网页" : "服务商返回的检索回答";
      execution.stdout = found.text;
      execution.sources = found.sources;
      execution.running = false;
      result = found;
    } else throw new Error("当前环境没有此工具：" + name);
    renderMessages(false);
    return JSON.stringify(result);
  } catch (e) {
    execution.running = false;
    execution.error = true;
    execution.stderr = e.message;
    execution.label = "执行失败";
    renderMessages(false);
    return JSON.stringify({ error: e.message });
  }
}
async function generate() {
  busy = true;
  controller = new AbortController();
  $("#send-button").hidden = true;
  $("#stop-button").hidden = false;
  $("#status").textContent = "正在思考";
  let lastMessage = null;
  try {
    for (let round = 0; round < 12; round++) {
      if (controller.signal.aborted) break;
      const m = { id: uid(), role: "assistant", content: "", streaming: true, createdAt: Date.now() };
      lastMessage = m;
      const requestMessages = apiMessages();
      active.messages.push(m);
      renderMessages();
      const tools = settings.autoPython ? [PYTHON_TOOL, CREATE_FILE, READ_FILE] : [CREATE_FILE, READ_FILE];
      if (settings.webEnabled !== false) tools.push(WEB_TOOL);
      let scheduled = false;
      const response = await streamCompletion({ settings, messages: requestMessages, tools, signal: controller.signal, onDelta: (delta, assembled) => {
        m.content = assembled?.content ?? m.content + delta;
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(() => {
            renderStreaming(m);
            scheduled = false;
          });
        }
      } });
      m.content = response.content || "";
      if (response.tool_calls?.length) m.tool_calls = response.tool_calls;
      m.streaming = false;
      if (!m.tool_calls?.length) {
        if (!m.content) m.content = "模型未返回文本。请重试，或在模型菜单中切换模型。";
        renderMessages();
        break;
      }
      for (const call of m.tool_calls) {
        if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
        $("#status").textContent = "正在使用工具";
        const output = await executeTool(call, m);
        active.messages.push({ id: uid(), role: "tool", tool_call_id: call.id, content: output });
      }
      await persistChat();
      if (round === 11) {
        const stop = { id: uid(), role: "assistant", content: "本轮已完成 12 次模型调用。你可以继续发送消息，让我接着处理。" };
        active.messages.push(stop);
        renderMessages();
      }
    }
  } catch (e) {
    if (lastMessage) lastMessage.streaming = false;
    if (e.name === "AbortError") {
      if (lastMessage && !lastMessage.content && !lastMessage.tool_calls) active.messages = active.messages.filter((m) => m !== lastMessage);
      toast("已停止生成");
    } else {
      if (lastMessage) lastMessage.error = e.message;
      toast("请求失败：" + e.message);
    }
    renderMessages();
  } finally {
    active.messages = completeToolResponses(active.messages);
    busy = false;
    controller = null;
    $("#send-button").hidden = false;
    $("#stop-button").hidden = true;
    $("#status").textContent = temporary ? "临时聊天" : "";
    autoGrow();
    await persistChat();
    if (voiceSession) {
      const last = [...active.messages].reverse().find((m) => m.role === "assistant" && m.content);
      if (last) speak(last.content, true);
    }
  }
}
async function send() {
  if (busy) return;
  let text = $("#prompt").value.trim();
  if (!text && !pendingFiles.length) return;
  if (currentView !== "chat") {
    const savedFiles = [...pendingFiles];
    newChat(mode);
    pendingFiles = savedFiles;
    $("#prompt").value = text;
  }
  if (!active) {
    active = { id: uid(), title: text.slice(0, 40) || pendingFiles[0]?.name || "新聊天", mode, messages: [], createdAt: Date.now(), updatedAt: Date.now(), temporary, projectId: projectFilter };
    if (!temporary) chats.unshift(active);
    $("#chat-title").textContent = active.title;
    localStorage.setItem("cg-active", active.id);
    history.replaceState(null, "", location.pathname + "#c=" + active.id);
  }
  const user = { id: uid(), role: "user", content: text, attachments: [...pendingFiles], createdAt: Date.now() };
  active.messages.push(user);
  $("#prompt").value = "";
  pendingFiles = [];
  renderAttachments();
  renderMessages();
  busy = true;
  await persistChat();
  await generate();
}
async function addFiles(files) {
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) {
      toast(file.name + " 超过 25 MB");
      continue;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      let content = "";
      if (file.type.startsWith("text/") || /\.(md|csv|tsv|json|js|ts|tsx|jsx|py|html|css|xml|yaml|yml|log|sql|sh|txt)$/i.test(file.name)) content = await file.text();
      else if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("./vendor/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages = [];
        for (let p = 1; p <= Math.min(pdf.numPages, 150); p++) pages.push((await (await pdf.getPage(p)).getTextContent()).items.map((i) => i.str).join(" "));
        content = pages.join("\n\n");
        await pdf.destroy();
      } else if (/\.docx$/i.test(file.name)) {
        await loadScript("./vendor/mammoth.js");
        content = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      }
      const asset = { id: uid(), name: file.name.replace(/[\\/]/g, "_"), type: file.type || "application/octet-stream", size: file.size, dataUrl, content };
      if (!temporary) await db.saveAsset(asset);
      pendingFiles.push(asset);
    } catch (e) {
      toast("无法读取 " + file.name + "：" + e.message);
    }
  }
  renderAttachments();
  $("#file-input").value = "";
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}
function modal(title, body, footer = "") {
  closeMenus();
  $("#overlay-root").innerHTML = `<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="${escape(title)}" class="modal"><header class="modal-header"><h2>${escape(title)}</h2><button class="icon-button" data-close-modal aria-label="关闭">${icon("close")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`;
  $("#overlay-root input, #overlay-root textarea, #overlay-root button")?.focus();
}
function closeModal() {
  $("#overlay-root").innerHTML = "";
}
function searchModal() {
  modal("搜索聊天", `<div class="search-field">${icon("search")}<input id="chat-search-input" placeholder="搜索聊天标题或内容" autofocus></div><div id="search-results"></div>`);
  const input = $("#chat-search-input");
  const update = () => {
    const q = input.value.toLowerCase();
    $("#search-results").innerHTML = chats.filter((c) => !c.archived && (c.title + " " + c.messages.map((m) => m.content || "").join(" ")).toLowerCase().includes(q)).sort((a, b) => b.updatedAt - a.updatedAt).map((c) => `<button class="search-result" data-chat="${c.id}">${icon(c.mode === "codex" ? "code" : "edit")}<span>${escape(c.title)}<small>${new Date(c.updatedAt).toLocaleDateString()}</small></span></button>`).join("") || '<p class="empty-state">没有找到相关聊天</p>';
  };
  input.addEventListener("input", update);
  update();
  input.focus();
}
function settingsModal(tab = "general") {
  const archived = chats.filter((c) => c.archived);
  modal("设置", `<div class="settings-tabs"><button data-settings-tab="general" class="${tab === "general" ? "active" : ""}">常规</button><button data-settings-tab="personal" class="${tab === "personal" ? "active" : ""}">个性化</button><button data-settings-tab="connection" class="${tab === "connection" ? "active" : ""}">模型连接</button><button data-settings-tab="data" class="${tab === "data" ? "active" : ""}">数据管理</button><button data-settings-tab="about" class="${tab === "about" ? "active" : ""}">关于</button></div><form id="settings-form">${tab === "general" ? `<label class="settings-row">外观<select name="theme"><option value="system" ${settings.theme === "system" ? "selected" : ""}>跟随系统</option><option value="light" ${settings.theme === "light" ? "selected" : ""}>浅色</option><option value="dark" ${settings.theme === "dark" ? "selected" : ""}>深色</option></select></label><label class="settings-row">自动运行 Python<input name="autoPython" type="checkbox" ${settings.autoPython ? "checked" : ""}></label><p class="settings-description">计算和数据分析时，AI 可以实际执行 Python，输出图表和文件。首次运行会下载 Python 运行时。</p>` : tab === "personal" ? `<label class="field-label">你希望 ChatGPT 如何回复？<textarea name="customInstructions" rows="7" placeholder="例如：用中文回答，提供具体例子。">${escape(settings.customInstructions)}</textarea></label><p class="settings-description">自定义指令会应用到后续请求。</p>` : tab === "connection" ? `<p class="settings-description">已预置连接，可直接开始使用。也可以在当前浏览器覆盖配置。</p><label class="field-label">API 地址<input name="apiBase" type="url" value="${escape(settings.apiBase)}" required></label><label class="field-label">API 密钥<input name="apiKey" type="password" autocomplete="off" value="${escape(settings.apiKey)}" required></label><label class="field-label">默认模型<input name="model" value="${escape(settings.model)}" required></label><button type="button" class="secondary-button" data-action="test-connection">测试连接</button><span id="connection-result"></span>` : tab === "data" ? `<div class="settings-row"><span>导出聊天和文件</span><button type="button" data-action="export" class="secondary-button">导出数据</button></div><div class="settings-row"><span>导入聊天</span><button type="button" data-action="import" class="secondary-button">导入 JSON</button></div><h3>已归档聊天</h3>${archived.map((c) => `<div class="settings-row"><span>${escape(c.title)}</span><button type="button" data-unarchive="${c.id}">取消归档</button></div>`).join("") || '<p class="settings-description">暂无已归档聊天。</p>'}<div class="settings-row"><span>删除所有聊天</span><button type="button" data-action="clear-data" class="danger-button">删除</button></div>` : `<div class="about-logo">${icon("logo")}</div><h3>ChatGPT Web Workspace</h3><p>独立实现的 ChatGPT 风格应用，包含 Chat、Work 和 Codex 工作界面。</p><p class="settings-description">非 OpenAI 官方网站。模型由你配置的 API 提供；对话与文件保存在当前浏览器。Python 使用 Pyodide / WebAssembly，支持真实计算、数据分析、图表和文件生成。它与原版的私有服务、Linux 容器、联网工具和账户系统不同。语音使用浏览器语音服务。</p><a href="https://github.com/tycofficial/chatgpt" target="_blank" rel="noopener">在 GitHub 查看源码 ↗</a>`}</form>`, tab === "about" || tab === "data" ? "" : `<button class="primary-button" id="save-settings">保存</button>`);
  $("#save-settings")?.addEventListener("click", () => {
    const form = new FormData($("#settings-form"));
    for (const [key, value] of form) settings[key] = String(value);
    if (tab === "general") settings.autoPython = form.has("autoPython");
    persistSettings();
    renderModelButton();
    closeModal();
    toast("设置已保存");
  });
  $('#settings-form')?.addEventListener('submit',e=>{e.preventDefault();$('#save-settings')?.click();});
}
async function renderModels() {
  const menu = $("#model-menu");
  menu.innerHTML = `<div class="menu-heading">模型</div><input class="model-search" placeholder="搜索模型" aria-label="搜索模型"><div class="model-options"></div>`;
  const draw = (q = "") => {
    $(".model-options").innerHTML = (models.length ? models : [settings.model, "auto", "gpt-6-astra", "gpt-5.3-codex"]).filter((id) => id.toLowerCase().includes(q.toLowerCase())).map((id) => `<button class="menu-item model-option" data-model="${escape(id)}"><span><strong>${escape(modelLabel(id))}</strong><small>${id === "auto" ? "由服务商自动选择" : id.includes("codex") ? "代码与软件开发" : id.includes("image") ? "图像生成模型" : "API 提供的模型"}</small></span>${settings.model === id ? icon("check") : ""}</button>`).join("") || '<p class="empty-state">没有匹配的模型</p>';
  };
  draw();
  $(".model-search").addEventListener("input", (e) => draw(e.target.value));
}
function renderModelButton() {
  $("#model-button").innerHTML = escape(modelLabel(settings.model)) + icon("chevron");
}
async function fetchModels() {
  try {
    const data = await getModels(settings);
    models = data.map((m) => typeof m === "string" ? m : m.id).filter(Boolean);
    models.sort((a, b) => Number(b.startsWith("gpt-")) - Number(a.startsWith("gpt-")) || a.localeCompare(b));
    await renderModels();
  } catch (e) {
    await renderModels();
    console.warn("Model list unavailable:", e.message);
  }
}
function chatMenu(id, anchor) {
  closeMenus();
  const chat = chats.find((c) => c.id === id);
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "menu context-menu";
  menu.style.position = "fixed";
  menu.style.left = Math.min(rect.right, innerWidth - 220) + "px";
  menu.style.top = Math.min(rect.top, innerHeight - 240) + "px";
  menu.innerHTML = `<button class="menu-item" data-chat-action="rename" data-cid="${id}">${icon("edit")}重命名</button><button class="menu-item" data-chat-action="pin" data-cid="${id}">${icon("check")}${chat.pinned ? "取消置顶" : "置顶聊天"}</button><button class="menu-item" data-chat-action="project" data-cid="${id}">${icon("folder")}移动到项目</button><button class="menu-item" data-chat-action="archive" data-cid="${id}">${icon("archive")}归档</button><button class="menu-item danger-text" data-chat-action="delete" data-cid="${id}">${icon("trash")}删除</button>`;
  document.body.append(menu);
}
function inputModal(title, label, value, onSave) {
  modal(title, `<label class="field-label">${escape(label)}<input id="modal-value" value="${escape(value)}" autocomplete="off"></label>`, `<button class="secondary-button" data-close-modal>取消</button><button class="primary-button" id="modal-save">保存</button>`);
  $("#modal-save").onclick = () => {
    const value2 = $("#modal-value").value.trim();
    if (value2) {
      onSave(value2);
      closeModal();
    }
  };
  $("#modal-value").onkeydown = (e) => {
    if (e.key === "Enter") $("#modal-save").click();
  };
  $("#modal-value").select();
}
function confirmModal(title, text, action2) {
  modal(title, `<p>${escape(text)}</p>`, `<button class="secondary-button" data-close-modal>取消</button><button class="danger-button" id="confirm-action">删除</button>`);
  $("#confirm-action").onclick = async () => {
    await action2();
    closeModal();
  };
}
async function chatAction(action2, id) {
  closeMenus();
  const c = chats.find((c2) => c2.id === id);
  if (!c) return;
  if (busy && c === active) {
    toast("请先停止当前回复");
    return;
  }
  if (action2 === "rename") inputModal("重命名聊天", "标题", c.title, async (name) => {
    c.title = name;
    await persistChat(c);
    if (c === active) $("#chat-title").textContent = name;
  });
  if (action2 === "pin") {
    c.pinned = !c.pinned;
    await persistChat(c);
  }
  if (action2 === "archive") {
    c.archived = true;
    await persistChat(c);
    if (active === c) newChat();
    toast("已归档，可在设置中恢复");
  }
  if (action2 === "delete") confirmModal("删除聊天？", "此聊天将从当前浏览器中删除。", async () => {
    await db.deleteChat(c.id);
    chats = chats.filter((x) => x !== c);
    if (active === c) newChat();
    renderHistory();
  });
  if (action2 === "project") {
    modal("移动到项目", projects.map((p) => `<button class="search-result" data-move-project="${p.id}" data-cid="${id}">${icon("folder")}${escape(p.name)}</button>`).join("") + '<button class="search-result" data-move-project="" data-cid="' + id + '">从项目中移出</button>');
  }
}
function showLibrary(imagesOnly = false) {
  if (busy) return toast("请先停止当前回复");
  currentView = imagesOnly ? "images" : "library";
  document.body.classList.add("has-messages");
  $("#welcome").hidden = true;
  $("#composer-form").hidden = true;
  $("#chat-title").textContent = imagesOnly ? "图片" : "资料库";
  const files = chats.flatMap((c) => c.messages.flatMap((m) => [...m.artifacts || [], ...imagesOnly ? m.attachments || [] : []]));
  const unique = [...new Map(files.map((f) => [f.id || f.dataUrl, f])).values()].filter((f) => !imagesOnly || (f.mime || f.type || "").startsWith("image/"));
  $("#messages").innerHTML = `<section class="library-view"><h1>${imagesOnly ? "图片" : "资料库"}</h1><p class="muted">${imagesOnly ? "你上传和生成的图片" : "在聊天中生成的文件与成果"}</p><div class="artifact-grid">${unique.map((f) => `<div class="artifact-card">${(f.mime || f.type || "").startsWith("image/") ? `<img src="${escape(f.dataUrl)}" alt="${escape(f.name)}">` : icon("file")}${fileHTML(f)}</div>`).join("") || `<div class="empty-state">${icon(imagesOnly ? "image" : "book")}<h3>这里还没有${imagesOnly ? "图片" : "文件"}</h3><p>开始聊天，上传图片或让 AI 创建文件。</p><button class="secondary-button" data-action="new">开始新聊天</button></div>`}</div></section>`;
}
async function openArtifact(id) {
  const f = allFiles().find((x) => x.id === id || x.name === id) || chats.flatMap((c) => c.messages.flatMap((m) => [...m.artifacts || [], ...m.attachments || []])).find((x) => x.id === id || x.name === id) || await db.getAsset(id);
  if (!f) return toast("文件不可用");
  if (!f.content && /^(text\/|application\/json)/.test(f.type || f.mime || "")) f.content = await (await fetch(f.dataUrl)).text();
  previewFile(f);
}
function previewFile(f) {
  $("#artifact-panel").hidden = false;
  $("#artifact-content").innerHTML = `<div class="artifact-toolbar"><strong>${escape(f.name)}</strong><button class="secondary-button" id="download-artifact">${icon("download")}下载</button></div><div class="artifact-preview"></div>`;
  $("#download-artifact").onclick = () => download(f.name, f.dataUrl || f.content, f.mime || f.type);
  const view = $(".artifact-preview");
  const type = f.mime || f.type || "";
  if (type.startsWith("image/")) view.innerHTML = `<img alt="${escape(f.name)}" src="${escape(f.dataUrl)}">`;
  else if (/\.html?$/i.test(f.name)) {
    const frame = document.createElement("iframe");
    frame.title = f.name;
    frame.sandbox = "allow-scripts allow-forms allow-modals";
    if (f.content) frame.srcdoc = f.content;
    else frame.src = f.dataUrl;
    view.append(frame);
  } else if (type === "application/pdf") {
    const frame = document.createElement("iframe");
    frame.title = f.name;
    frame.src = f.dataUrl;
    view.append(frame);
  } else if (/\.md$/i.test(f.name) && f.content) {
    view.innerHTML = `<div class="prose">${markdown(f.content)}</div>`;
    enrich(view);
  } else if (f.content) {
    view.innerHTML = `<pre><code>${escape(f.content)}</code></pre>`;
  } else view.innerHTML = '<div class="empty-state">此文件可以下载后打开。</div>';
}
function pythonConsole() {
  modal("Python 工作区", `<p class="settings-description">真实 Python · 独立 Worker · 当前聊天内保留变量 · 文件目录 /mnt/data</p><textarea class="python-editor" id="python-code" spellcheck="false" rows="10">import sys
print(sys.version)
print(sum(range(1, 101)))</textarea><div id="python-output" class="console-output"></div>`, `<button class="secondary-button" id="reset-python">重置环境</button><button class="primary-button" id="run-python">${icon("terminal")}运行 Python</button>`);
  $("#reset-python").onclick = () => {
    python.reset();
    $("#python-output").textContent = "环境已重置";
  };
  $("#run-python").onclick = async () => {
    const button = $("#run-python"), output = $("#python-output");
    button.disabled = true;
    try {
      const result = await python.run($("#python-code").value, allFiles(), (s) => output.textContent = s);
      output.innerHTML = `<pre>${escape(result.stdout || "")}${escape(result.stderr || "")}${escape(result.result || "")}</pre>${(result.images || []).map((src) => `<img src="${escape(src)}" alt="Python 图表">`).join("")}`;
      for (const f of result.files || []) {
        const a = document.createElement("a");
        a.href = f.dataUrl;
        a.download = f.name;
        a.textContent = "下载 " + f.name;
        a.className = "console-download";
        output.append(a);
      }
    } catch (e) {
      output.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
}
function speak(text, resume = false) {
  if (!("speechSynthesis" in window)) return toast("当前浏览器不支持朗读");
  speechSynthesis.cancel();
  const plain = text.replace(/```[\s\S]*?```/g, "代码已显示在对话中。").replace(/[#*_`]/g, "");
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = /[\u4e00-\u9fa5]/.test(plain) ? "zh-CN" : "en-US";
  if (resume) u.onend = () => {
    if (voiceSession) startListening();
  };
  speechSynthesis.speak(u);
}
function startListening() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    toast("当前浏览器不支持语音输入，请使用 Chrome 或键盘输入");
    voiceSession = false;
    return;
  }
  recognition?.abort();
  recognition = new Recognition();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;
  const initial = $("#prompt").value;
  recognition.onresult = (e) => {
    const text = [...e.results].map((r) => r[0].transcript).join("");
    $("#prompt").value = initial + text;
    autoGrow();
    if ($("#voice-transcript")) $("#voice-transcript").textContent = text;
  };
  recognition.onerror = (e) => {
    toast("语音输入未完成：" + (e.error === "not-allowed" ? "请允许麦克风权限" : e.error));
    $("#mic-button").classList.remove("listening");
  };
  recognition.onend = () => {
    $("#mic-button").classList.remove("listening");
    if (voiceSession && $("#prompt").value.trim()) send();
  };
  recognition.start();
  $("#mic-button").classList.add("listening");
}
function voiceModal() {
  voiceSession = true;
  modal("语音对话", `<div class="voice-orb"></div><p id="voice-transcript" class="voice-transcript">点击麦克风开始说话</p><p class="settings-description">使用浏览器语音识别和朗读服务。可随时关闭，继续文字聊天。</p>`, `<button class="secondary-button" id="voice-end">结束对话</button><button class="primary-button" id="voice-start">${icon("mic")}开始说话</button>`);
  $("#voice-start").onclick = startListening;
  $("#voice-end").onclick = () => {
    voiceSession = false;
    recognition?.abort();
    window.speechSynthesis?.cancel();
    closeModal();
  };
}
function projectModal() {
  modal("新建项目", `<label class="field-label">项目名称<input id="project-name" placeholder="例如：我的研究项目"></label><label class="field-label">项目指令<textarea id="project-instructions" rows="4" placeholder="告诉 ChatGPT 这个项目的背景与要求"></textarea></label>`, `<button class="primary-button" id="create-project">创建项目</button>`);
  $("#create-project").onclick = () => {
    const name = $("#project-name").value.trim();
    if (!name) return;
    const p = { id: uid(), name, instructions: $("#project-instructions").value };
    projects.push(p);
    localStorage.setItem("cg-projects", JSON.stringify(projects));
    projectFilter = p.id;
    renderHistory();
    closeModal();
    newChat("work");
    toast("已创建项目 " + name);
  };
}
function canvasModal() {
  modal("画布", `<label class="field-label">文件名<input id="canvas-name" value="index.html"></label><textarea id="canvas-source" class="python-editor" rows="12" spellcheck="false" placeholder="在这里编写 HTML、Markdown 或代码"></textarea>`, `<button class="secondary-button" id="canvas-preview">预览</button><button class="primary-button" id="canvas-save">保存到资料库</button>`);
  $("#canvas-preview").onclick = () => previewFile({ name: $("#canvas-name").value || "index.html", content: $("#canvas-source").value, mime: "text/html" });
  $("#canvas-save").onclick = async () => {
    if (busy) return toast("请先停止当前任务");
    const name = $("#canvas-name").value || "index.html", content = $("#canvas-source").value;
    const file = await createArtifact(name, content);
    if (!active) {
      active = { id: uid(), title: name, mode: "work", messages: [], createdAt: Date.now(), updatedAt: Date.now(),temporary };
      if(!temporary)chats.unshift(active);
    }
    active.messages.push({ id: uid(), role: "assistant", content: "已保存画布文件。", artifacts: [file] });
    currentView = "chat";
    $("#composer-form").hidden = false;
    setMode(active.mode);
    await persistChat();
    closeModal();
    renderMessages();
    previewFile(file);
  };
}
function webModal() {
  modal("搜索网页", `<p class="settings-description">使用已配置 API 的原生 web_search 工具检索网页，保留来源链接。</p><label class="settings-row">允许 AI 自动联网搜索<input type="checkbox" id="web-enabled" ${settings.webEnabled !== false ? "checked" : ""}></label><label class="field-label">搜索内容<input id="web-query" placeholder="你想了解什么？"></label><div id="web-result" class="prose"></div>`, `<button class="secondary-button" id="web-add">添加到对话</button><button class="primary-button" id="web-search">${icon("globe")}搜索</button>`);
  let found = null;
  $("#web-enabled").onchange = (e) => {
    settings.webEnabled = e.target.checked;
    persistSettings();
  };
  $("#web-search").onclick = async () => {
    const query = $("#web-query").value.trim();
    if (!query) return;
    const result = $("#web-result"), button = $("#web-search");
    button.disabled = true;
    result.textContent = "正在搜索网页…";
    try {
      found = await searchWeb(settings, query);
      result.innerHTML = markdown(found.text) + (found.sources.length ? "<h3>来源</h3>" + found.sources.map((s) => `<p><a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.title)}</a></p>`).join("") : "");
      enrich(result);
    } catch (e) {
      result.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
  $("#web-query").onkeydown = (e) => {
    if (e.key === "Enter") $("#web-search").click();
  };
  $("#web-add").onclick = async () => {
    if (!found) return toast("请先搜索");
    if (busy) return toast("请先停止当前任务");
    const text = found.text + "\n\n来源：\n" + found.sources.map((s) => s.url).join("\n");
    const file = await createArtifact("web-research-" + Date.now() + ".md", text, "text/markdown");
    pendingFiles.push(file);
    closeModal();
    if (currentView !== "chat") {
      newChat(mode);
      pendingFiles.push(file);
    }
    renderAttachments();
    $("#prompt").focus();
  };
}
async function shareChat() {
  if (!active) return toast("请先开始聊天");
  const markdownText = "# " + active.title + "\n\n" + active.messages.filter((m) => m.role !== "tool").map((m) => `## ${m.role === "user" ? "你" : "ChatGPT"}

${m.content}`).join("\n\n");
  modal("分享聊天", `<p>导出当前对话，或复制为 Markdown。对话保存在当前浏览器，没有公开的云端分享链接。</p><textarea id="share-content" rows="7" readonly>${escape(markdownText)}</textarea>`, `<button class="secondary-button" id="share-download">${icon("download")}下载</button><button class="primary-button" id="share-copy">${icon("copy")}复制对话</button>`);
  $("#share-copy").onclick = () => copyText(markdownText);
  $("#share-download").onclick = () => download(active.title + ".md", markdownText, "text/markdown");
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制");
  } catch {
    modal("复制文本", `<textarea rows="8" readonly>${escape(text)}</textarea>`);
  }
}
async function action(name) {
  closeMenus();
  if (busy && ["clear-data", "import", "image-generate"].includes(name)) return toast("请先停止当前任务");
  if (name === "new" || name === "new-chat") newChat();
  else if (name === "toggle-sidebar") document.body.classList.toggle(innerWidth <= 760 ? "sidebar-open" : "sidebar-collapsed");
  else if (name === "close-sidebar") document.body.classList.remove("sidebar-open");
  else if (name === "chat-menu") {
    if (active) chatMenu(active.id, $('[data-action="chat-menu"]'));
  } else if (name === "canvas") canvasModal();
  else if (name === "web") webModal();
  else if (name === "search") searchModal();
  else if (name === "settings") settingsModal();
  else if (name === "images") showLibrary(true);
  else if (name === "library") showLibrary();
  else if (name === "codex") newChat("codex");
  else if (name === "chatgpt") newChat("chat");
  else if (name === "work") newChat("work");
  else if (name === "python") pythonConsole();
  else if (name === "temporary") {
    if(busy)return toast('请先停止当前任务');
    newChat(mode);
    temporary = true;
    $("#status").textContent = "临时聊天 · 关闭后不保存";
    toast("临时聊天已开启");
  } else if (name === "projects" || name === "new-project") projectModal();
  else if (name === "apps") modal("应用与工具", `<div class="app-tools"><button data-action="python">${icon("terminal")}<span>Python<small>运行代码、分析数据、绘制图表</small></span></button><button data-action="attach">${icon("paperclip")}<span>文件分析<small>读取 PDF、Word、CSV、文本和图片</small></span></button><button data-action="library">${icon("book")}<span>资料库<small>预览和下载生成的文件</small></span></button></div><p class="settings-description">此独立应用提供以上可用工具。外部账户连接与原版插件市场未接入。</p>`);
  else if (name === "attach") {
    closeModal();
    $("#file-input").click();
  } else if (name === "share") shareChat();
  else if (name === "export") {
    try {
      download("chatgpt-export-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", JSON.stringify({ ...await db.exportData(), projects }, null, 2), "application/json");
    } catch (e) {
      toast(e.message);
    }
  } else if (name === "import") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      try {
        if (busy) return toast("请先停止当前任务");
        const imported = JSON.parse(await input.files[0].text());
        await db.importData(imported);
        if (Array.isArray(imported.projects)) {
          for (const p of imported.projects) if (p && /^[a-zA-Z0-9_-]{1,128}$/.test(p.id) && typeof p.name === "string") {
            const i = projects.findIndex((x) => x.id === p.id);
            const clean = { id: p.id, name: p.name, instructions: String(p.instructions || "") };
            if (i < 0) projects.push(clean);
            else projects[i] = clean;
          }
          localStorage.setItem("cg-projects", JSON.stringify(projects));
        }
        chats = await db.loadChats();
        if(active){active=chats.find(c=>c.id===active.id)||null;if(active){setMode(active.mode);$('#chat-title').textContent=active.title;renderMessages();}else newChat(mode);}
        renderHistory();
        closeModal();
        toast("数据已导入");
      } catch (e) {
        toast(e.message);
      }
    };
    input.click();
  } else if (name === "clear-data") confirmModal("删除所有聊天？", "所有聊天与附件将从当前浏览器中删除。建议先导出备份。", async () => {
    if (busy) return toast("请先停止当前任务");
    await db.clearChats();
    chats = [];
    projects = [];
    projectFilter = null;
    localStorage.setItem("cg-projects", "[]");
    newChat();
  });
  else if (name === "test-connection") {
    const button = $('[data-action="test-connection"]');
    button.disabled = true;
    $("#connection-result").textContent = "正在测试…";
    try {
      const form = new FormData($("#settings-form"));
      const data = await getModels({ ...settings, ...Object.fromEntries(form) });
      $("#connection-result").textContent = "已连接 · " + data.length + " 个模型";
    } catch (e) {
      $("#connection-result").textContent = e.message;
    } finally {
      button.disabled = false;
    }
  } else if (name === "help") settingsModal("about");
  else if (name === "image-generate") imageModal();
}
function imageModal() {
  modal("创建图片", `<p class="settings-description">通过当前 API 的图像生成接口创建图片。是否可用由服务商决定。</p><label class="field-label">画面描述<textarea id="image-prompt" rows="4" placeholder="描述你想创建的图片"></textarea></label><label class="field-label">图像模型<select id="image-model">${(models.filter((x) => x.includes("image")).length ? models.filter((x) => x.includes("image")) : ["gpt-image-2"]).map((x) => `<option>${escape(x)}</option>`).join("")}</select></label><div id="image-result"></div>`, `<button class="primary-button" id="generate-image">生成图片</button>`);
  $("#generate-image").onclick = async () => {
    const prompt = $("#image-prompt").value.trim();
    if (!prompt) return;
    const button = $("#generate-image"), result = $("#image-result");
    if (busy) return toast("请先停止当前任务");
    busy = true;
    button.disabled = true;
    result.textContent = "正在生成图片…";
    try {
      const res = await fetch(settings.apiBase.replace(/\/$/, "").replace(/\/v1$/, "") + "/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + settings.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ model: $("#image-model").value, prompt, n: 1, size: "1024x1024" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || "图像接口请求失败");
      const item = data.data?.[0];
      if (!item) throw new Error("服务商没有返回图片");
      let src = item.b64_json ? "data:image/png;base64," + item.b64_json : item.url;
      if (src && !src.startsWith("data:")) {
        const imageResponse = await fetch(src);
        if (!imageResponse.ok) throw new Error("无法下载生成的图片");
        const blob = await imageResponse.blob();
        src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (!src) throw new Error("服务商没有返回图片地址");
      const file = { id: uid(), name: "image-" + Date.now() + ".png", mime: "image/png", type: "image/png", dataUrl: src, createdAt: Date.now() };
      if (!temporary) await db.saveAsset(file);
      if (!active) {
        active = { id: uid(), title: prompt.slice(0, 40), mode: "chat", messages: [], createdAt: Date.now(), updatedAt: Date.now(),temporary };
        if (!temporary) chats.unshift(active);
      }
      active.messages.push({ id: uid(), role: "user", content: prompt }, { id: uid(), role: "assistant", content: "", artifacts: [file] });
      await persistChat();
      closeModal();
      renderMessages();
    } catch (e) {
      result.textContent = e.message;
    } finally {
      busy = false;
      autoGrow();
      button.disabled = false;
    }
  };
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest("button,[data-action],[data-chat],[data-artifact]");
  if (e.target.classList.contains("modal-backdrop") || e.target.closest("[data-close-modal]")) {
    if (voiceSession) {
      voiceSession = false;
      recognition?.abort();
      window.speechSynthesis?.cancel();
    }
    closeModal();
    return;
  }
  if (!t) {
    if (!e.target.closest(".menu")) closeMenus();
    return;
  }
  if (t.dataset.action) return action(t.dataset.action);
  if (t.dataset.product) return action(t.dataset.product);
  if (t.dataset.chat) {
    closeModal();
    openChat(t.dataset.chat);
    return;
  }
  if (t.dataset.chatMenu) return chatMenu(t.dataset.chatMenu, t);
  if (t.dataset.chatAction) return chatAction(t.dataset.chatAction, t.dataset.cid);
  if (t.dataset.settingsTab) return settingsModal(t.dataset.settingsTab);
  if (t.dataset.project) {
    projectFilter = projectFilter === t.dataset.project ? null : t.dataset.project;
    newChat("work");
    renderHistory();
    return;
  }
  if ("moveProject" in t.dataset) {
    const c = chats.find((c2) => c2.id === t.dataset.cid);
    c.projectId = t.dataset.moveProject || null;
    await persistChat(c);
    closeModal();
    return;
  }
  if (t.dataset.unarchive) {
    const c = chats.find((c2) => c2.id === t.dataset.unarchive);
    c.archived = false;
    await persistChat(c);
    settingsModal("data");
    return;
  }
  if (t.dataset.model) {
    settings.model = t.dataset.model;
    persistSettings();
    renderModelButton();
    renderModels();
    closeMenus();
    return;
  }
  if (t.dataset.prompt) {
    $("#prompt").value = t.dataset.prompt;
    autoGrow();
    $("#prompt").focus();
    return;
  }
  if ("removeFile" in t.dataset) {
    pendingFiles.splice(Number(t.dataset.removeFile), 1);
    renderAttachments();
    return;
  }
  if (t.dataset.artifact) return openArtifact(t.dataset.artifact);
  if (t.dataset.codeAction) {
    const code = t.closest(".code-block").querySelector("code").textContent;
    const lang = t.closest(".code-block").querySelector(".code-header>span").textContent;
    if (t.dataset.codeAction === "copy") copyText(code);
    if (t.dataset.codeAction === "download") download("code." + ({ python: "py", javascript: "js", typescript: "ts", html: "html" }[lang] || lang || "txt"), code);
    if (t.dataset.codeAction === "preview") previewFile({ name: "preview.html", content: code, mime: "text/html" });
    if (t.dataset.codeAction === "run") {
      pythonConsole();
      $("#python-code").value = code;
      $("#run-python").click();
    }
    return;
  }
  if (t.dataset.msgAction) {
    const m = active.messages.find((m2) => m2.id === t.dataset.mid);
    if (!m) return;
    const a = t.dataset.msgAction;
    if (a === "copy") copyText(m.content);
    if (a === "speak") speak(m.content);
    if (a === "like" || a === "dislike") {
      m.feedback = m.feedback === a ? null : a;
      await persistChat();
      renderMessages(false);
    }
    if (a === "retry") {
      if (busy) return;
      const idx = active.messages.indexOf(m);
      active.messages = active.messages.slice(0, m.role === "user" ? idx + 1 : idx);
      while (active.messages.length && active.messages.at(-1).role !== "user") active.messages.pop();
      await generate();
    }
    if (a === "edit") {
      if (busy) return;
      modal("编辑消息", `<textarea id="edit-message" rows="6">${escape(m.content)}</textarea>`, `<button class="primary-button" id="save-edit">发送</button>`);
      $("#save-edit").onclick = async () => {
        m.content = $("#edit-message").value;
        active.messages = active.messages.slice(0, active.messages.indexOf(m) + 1);
        closeModal();
        renderMessages();
        await generate();
      };
    }
    return;
  }
  const id = t.id;
  if (id === "sidebar-toggle") document.body.classList.toggle(innerWidth <= 760 ? "sidebar-open" : "sidebar-collapsed");
  else if (id === "new-chat") newChat();
  else if (id === "search-chats") searchModal();
  else if (id === "product-button") toggleMenu("product-menu");
  else if (id === "model-button") toggleMenu("model-menu");
  else if (id === "profile-button") toggleMenu("profile-menu");
  else if (id === "tools-button") toggleMenu("tools-menu");
  else if (id === "mode-chat") {
    if (active?.messages.length) newChat("chat");
    else setMode("chat");
  } else if (id === "mode-work") {
    if (active?.messages.length) newChat("work");
    else setMode("work");
  } else if (id === "attach-button") $("#file-input").click();
  else if (id === "stop-button") {
    controller?.abort();
    python.terminate();
  } else if (id === "mic-button") startListening();
  else if (id === "voice-button") voiceModal();
  else if (id === "settings-button") settingsModal();
  else if (id === "theme-button") {
    settings.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    persistSettings();
  } else if (id === "artifact-close") $("#artifact-panel").hidden = true;
  else if (!t.closest(".menu")) closeMenus();
});
$("#composer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  send();
});
$("#prompt").addEventListener("input", autoGrow);
$("#prompt").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send();
  }
});
$("#prompt").addEventListener("paste", (e) => {
  const files = [...e.clipboardData.files];
  if (files.length) {
    e.preventDefault();
    addFiles(files);
  }
});
$("#file-input").addEventListener("change", (e) => addFiles(e.target.files));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenus();
    closeModal();
    $("#artifact-panel").hidden = true;
    document.body.classList.remove("sidebar-open");
    if (voiceSession) {
      voiceSession = false;
      recognition?.abort();
      window.speechSynthesis?.cancel();
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
    e.preventDefault();
    newChat();
  }
});
let dragDepth = 0;
document.addEventListener("dragenter", (e) => {
  if (e.dataTransfer.types.includes("Files")) {
    e.preventDefault();
    dragDepth++;
    document.body.classList.add("dragging-files");
  }
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) document.body.classList.remove("dragging-files");
});
document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove("dragging-files");
  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
window.addEventListener("resize", autoGrow);
window.addEventListener("unhandledrejection", (e) => {
  toast(e.reason?.message || "操作未完成，请重试");
});
window.addEventListener("error", (e) => {
  console.error(e.error);
});
async function init() {
  applyTheme();
  renderModelButton();
  setMode("chat");
  autoGrow();
  try {
    chats = await db.loadChats();
    chats.forEach((c) => {
      c.messages = completeToolResponses(c.messages);
      c.messages.forEach((m) => {
        delete m.streaming;
      });
    });
    renderHistory();
    const id = new URLSearchParams(location.hash.slice(1)).get("c") || localStorage.getItem("cg-active");
    if (id && chats.some((c) => c.id === id)) openChat(id);
  } catch (e) {
    toast(e.message);
  }
  fetchModels();
}
init();
