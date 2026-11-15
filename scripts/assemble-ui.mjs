/**
 * Offline assembly of the supplied saved first-party UI. This is a build step,
 * not a browser capture or a test. Never execute or distribute saved scripts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseHTML} from 'linkedom';

const base = process.cwd();
const sourceDir = path.join(base, '.test-output');
const outDir = path.join(base, 'ui');
const assetDir = path.join(outDir, 'assets');
await fs.mkdir(assetDir, {recursive: true});
const capturedFiles = {
  home: 'reference-signed-chat.html',
  account: 'reference-settings-account.html',
  appearance: 'reference-settings-appearance.html',
  'general-settings': 'reference-settings-general-settings.html',
  notifications: 'reference-settings-notifications.html',
  personalization: 'reference-settings-personalization.html',
  security: 'reference-settings-security.html',
  'parental-controls': 'reference-settings-parental-controls.html',
};
const availableSources = await fs.readdir(sourceDir);
const allowedSettingsSlugs = new Set(['security','account','parental-controls','trusted-contact','usage','billing','general-settings','appearance','notifications','voice','personalization','pets','keyboard-shortcuts','archived-chats','storage','data-controls','plugins-settings','passwords','browser-use','cloud-computer','codex-cloud','code-review']);
for (const name of availableSources) {
  const match = /^reference-settings-(.+)\.html$/.exec(name);
  if (match && allowedSettingsSlugs.has(match[1])) capturedFiles[match[1]] = name;
}
for (const name of availableSources.filter(n => /^reference-view-.+\.html$/.test(n))) capturedFiles[`view:${name.slice('reference-view-'.length, -'.html'.length)}`] = name;
const read = p => fs.readFile(p, 'utf8');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const escaped = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rawDocs = new Map();
const pendingCaptures = [];
for (const [slug, name] of Object.entries(capturedFiles)) {
  const raw = await read(path.join(sourceDir, name));
  // Remove scripts before DOM parsing. Bootstrap data never enters templates.
  const noScripts = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const document = parseHTML(noScripts).document;
  const surfaces = [...document.querySelectorAll('main[data-app-shell-main-surface]')].filter(e => !e.parentElement.closest('main[data-app-shell-main-surface]'));
  const active = surfaces.at(-1) || document.querySelector('main');
  const rendered = active && (active.textContent.trim().length > 0 || active.querySelector('canvas,[role="grid"],form,[contenteditable="true"]'));
  if (!/<!--\s*saved from url=/i.test(raw) || !rendered) {
    pendingCaptures.push({slug, file:name, reason:'Complete webpage capture with a rendered active DOM is required; server HTML/bootstrap is not a captured UI.'});
    continue;
  }
  // Earlier outer surfaces are cached routes, not part of the active page.
  // Keep the original active surface, navigation rail, and open public portals.
  for (const surface of surfaces) if (surface !== active) surface.remove();
  rawDocs.set(slug, {name, raw, document, prunedMains: Math.max(0, surfaces.length - 1)});
}
const evidence = {};
const messages = new Map();
function collectMessages(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.id === 'string' && typeof value.defaultMessage === 'string') messages.set(value.id, value.defaultMessage);
  for (const [key, v] of Object.entries(value)) if (!/^(?:rawSource|sourceModules|moduleSource|source)$/.test(key)) collectMessages(v);
}
for (const name of (await fs.readdir(sourceDir)).filter(n => /^capture-\d.*\.json$/.test(n))) {
  evidence[name] = JSON.parse(await read(path.join(sourceDir, name)));
  collectMessages(evidence[name]);
}
const message = (id, fallback = '') => messages.get(id) || fallback;

// Index only public asset types. Saved scripts, user avatars, and account media
// are deliberately ineligible for copying.
const assetCandidates = new Map();
for (const dir of (await fs.readdir(sourceDir, {withFileTypes: true})).filter(e => e.isDirectory() && (e.name.endsWith('_files') || e.name === 'reference-assets'))) {
  for (const name of await fs.readdir(path.join(sourceDir, dir.name))) {
    if (/\.(?:css|woff2?|ttf|otf|svg|png|webp|jpe?g|gif)$/i.test(name)) assetCandidates.set(name, path.join(sourceDir, dir.name, name));
  }
}
const publicAssetURLs = new Map();
const publicHTMLImages = new Set();
const publicFetchResults = [];
const publicAssetCache = path.join(sourceDir, 'reference-assets');
await fs.mkdir(publicAssetCache, {recursive: true});
function sourcePublicAsset(rawURL, baseURL = 'https://chatgpt.com') {
  if (!rawURL || /^(?:data:|blob:|#)/i.test(rawURL)) return null;
  let url; try { url = new URL(rawURL, baseURL); } catch { return null; }
  if (url.origin !== 'https://chatgpt.com' || !/^\/cdn\/assets\/(?:[\w@.-]+\/)*[\w@.-]+\.(?:css|woff2?|ttf|otf|svg|png)$/i.test(url.pathname) || url.search) return null;
  url.hash = '';
  const name = path.posix.basename(url.pathname);
  publicAssetURLs.set(name, url.href);
  return name;
}
for (const {document} of rawDocs.values()) {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) sourcePublicAsset(link.getAttribute('href'));
  for (const img of document.querySelectorAll('img')) {
    const name = sourcePublicAsset(img.getAttribute('src'));
    if (name && /\.(?:png|svg)$/i.test(name)) publicHTMLImages.add(name);
  }
}
async function downloadSourceAssets(entries) {
  // Public asset URLs must be literally referenced by captured HTML/CSS. No
  // endpoint guessing, credentials, original scripts, or user-content hosts.
  const pending = entries.filter(([name]) => !assetCandidates.has(name)).slice(0, 120 - publicFetchResults.length);
  for (let offset = 0; offset < pending.length; offset += 8) {
    const batch = pending.slice(offset, offset + 8);
    const results = await Promise.allSettled(batch.map(async ([name, url]) => {
      const response = await fetch(url, {credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 12 * 1024 * 1024) throw new Error('Asset exceeds build size bound');
      const file = path.join(publicAssetCache, name);
      await fs.writeFile(file, bytes); assetCandidates.set(name, file);
      return {name, bytes: bytes.length, status: 'cached'};
    }));
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      publicFetchResults.push(result.status === 'fulfilled' ? result.value : {name: batch[i][0], status: 'unavailable', reason: String(result.reason?.message || result.reason)});
    }
  }
}
await downloadSourceAssets([...publicAssetURLs].filter(([name]) => name.endsWith('.css')));
// Inspect original linked stylesheets before copying, so missing independent
// font/icon downloads can be fetched together rather than serially.
const linkedCSSFiles = new Map();
for (const {document} of rawDocs.values()) {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.getAttribute('href') || '';
    const name = path.posix.basename(href);
    const file = assetCandidates.get(name);
    if (file) linkedCSSFiles.set(name, file);
  }
}
for (const [name, file] of linkedCSSFiles) {
  const css = await read(file);
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) sourcePublicAsset(match[2], publicAssetURLs.get(name) || 'https://chatgpt.com');
}
await downloadSourceAssets([...publicAssetURLs].filter(([name]) => !name.endsWith('.css')));
const missingAssets = new Set();
const copiedAssets = new Set();
const stylesheets = new Set();
async function copyPublic(name, originalPath) {
  if (copiedAssets.has(name)) return true;
  const file = originalPath || assetCandidates.get(name);
  if (!file) { missingAssets.add(name); return false; }
  if (!/\.(?:css|woff2?|ttf|otf|svg|png|webp|jpe?g|gif)$/i.test(name)) return false;
  if (name.endsWith('.css')) {
    let css = await read(file);
    const replacements = new Map();
    for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      const url = match[2];
      if (/^(?:data:|#)/i.test(url)) continue;
      const assetName = path.posix.basename(url.split(/[?#]/)[0]);
      const available = await copyPublic(assetName);
      replacements.set(match[0], available ? `url("./${assetName}")` : 'url("data:,")');
    }
    for (const [from, to] of replacements) css = css.split(from).join(to);
    css = css.replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
    await fs.writeFile(path.join(assetDir, name), css);
  } else await fs.copyFile(file, path.join(assetDir, name));
  copiedAssets.add(name);
  return true;
}
await copyPublic('icons.svg', path.join(sourceDir, 'reference-icons.svg'));
for (const {document} of rawDocs.values()) {
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.getAttribute('href') || '';
    const name = path.posix.basename(href);
    if (!name.endsWith('.css')) continue;
    const exact = path.resolve(sourceDir, href);
    let file; try { await fs.stat(exact); file = exact; } catch { file = assetCandidates.get(name); }
    if (await copyPublic(name, file)) stylesheets.add(name);
  }
}
// The three first-party action illustrations are public composer icons.
const publicRasterIcons = new Set(['image-square@3x.png', 'pencil@3x.png', 'globe@3x.png']);
for (const name of publicRasterIcons) await copyPublic(name, path.join(sourceDir, 'reference-signed-chat_files', name));
for (const name of ['OpenAISans-Regular.b55d597a01.woff2', 'OpenAISans-Medium.bb7acdf308.woff2', 'OpenAISans-Semibold.ba1cdafb47.woff2']) await copyPublic(name);
for (const name of publicHTMLImages) await copyPublic(name);
const capturedPublicImages = new WeakMap();
for (const [slug, {document}] of rawDocs) {
  const activeMain = [...document.querySelectorAll('main[data-app-shell-main-surface]')].at(-1);
  if (slug === 'view:images') {
    for (const img of activeMain?.querySelectorAll('img') || []) {
      const src = img.getAttribute('src') || '';
      const name = path.posix.basename(src);
      // These sixteen literal source examples are public templates, not the
      // account's generated-image history. Other image records stay excluded.
      if (/^professional-[a-z-]+-[a-f0-9]{64}\.webp$/.test(name) && await copyPublic(name)) capturedPublicImages.set(img, name);
    }
  }
  if (slug === 'view:gpts' || slug === 'view:gpts-detail') {
    for (const img of document.querySelectorAll('img')) {
      if (!activeMain?.contains(img) && !img.closest('[role="dialog"]')) continue;
      const src = img.getAttribute('src') || '';
      const match = /^data:image\/(png|jpe?g|webp|gif);base64,([a-zA-Z0-9+/=]+)$/.exec(src);
      if (!match) continue;
      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.length > 12 * 1024 * 1024) continue;
      const extension = /^jpe?g$/.test(match[1]) ? 'jpg' : match[1];
      const name = `public-gpt-${hash(bytes).slice(0,24)}.${extension}`;
      await fs.writeFile(path.join(assetDir, name), bytes);
      copiedAssets.add(name); capturedPublicImages.set(img, name);
    }
  }
}

// Retain original layer declarations, theme palette, and first-party toast CSS.
// The other captured inline styles were added by a browser extension.
const originalInlineCSS = [...rawDocs.get('home').document.querySelectorAll('style')]
  .map(e => e.textContent).filter(s => /^\s*@layer\b/.test(s) || /^\s*\[data-sonner-toaster\]/.test(s));
await fs.writeFile(path.join(assetDir, 'source-layers.css'), originalInlineCSS.filter(s => /^\s*@layer\s+[^{}]+;\s*$/.test(s)).join('\n'));
await fs.writeFile(path.join(assetDir, 'source-inline.css'), originalInlineCSS.filter(s => !/^\s*@layer\s+[^{}]+;\s*$/.test(s)).join('\n'));

const identities = new Map();
const companionFiles = new Set(await fs.readdir(path.join(base, 'companion-assets')).catch(() => []));
const accountDocument = rawDocs.get('account').document;
for (const [id, neutral] of [['account-name', '用户'], ['account-username', '@user'], ['account-email', 'user@example.local'], ['account-builder-profile', '用户']]) {
  const value = accountDocument.getElementById(id)?.querySelector('span.select-text')?.textContent.trim();
  if (value) identities.set(value, neutral);
}
for (const {document} of rawDocs.values()) {
  for (const e of document.querySelectorAll('[aria-label^="Profile for "]')) {
    const value = e.getAttribute('aria-label').slice('Profile for '.length).trim();
    if (value) identities.set(value, '用户');
  }
  for (const e of document.querySelectorAll('[data-sidebar-destination^="builtin:orbit:"]')) {
    const value = e.textContent.trim();
    if (value) identities.set(value, 'ChatGPT');
  }
}
function neutralize(s) {
  for (const [value, replacement] of [...identities].sort((a,b) => b[0].length - a[0].length)) s = s.split(value).join(replacement);
  return s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'user@example.local')
    .replace(/\b(?:user|acct|org)-[a-zA-Z0-9]{16,}\b/g, 'local-user');
}
function attrs(e) { return Object.fromEntries([...e.attributes].map(a => [a.name, a.value])); }
function genericAvatar(document, img) {
  const {document: fragment} = parseHTML(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true" class="${escaped(img.getAttribute('class') || '')}"><use href="./ui/assets/icons.svg#codex-icon-circle-person-light-20" fill="currentColor"></use></svg>`);
  img.replaceWith(fragment.firstElementChild);
}
function sanitizeDocument(document, slug) {
  const body = document.querySelector('body'); // Saved extension styles precede <head>; document.body is unreliable here.
  const side = body.querySelector('aside.app-shell-left-panel');
  // Saved route transitions retain earlier sibling surfaces. Nested thread
  // <main> elements are not new routes; the last outer app surface is active.
  const surfaces = [...body.querySelectorAll('main[data-app-shell-main-surface]')].filter(e => !e.parentElement.closest('main[data-app-shell-main-surface]'));
  const main = surfaces.at(-1) || body.querySelector('main');
  if (slug === 'usage' || slug === 'storage') {
    const content = main?.querySelector('.group\\/settings');
    if (content) {
      const publicLabels = new Set([...messages.values(), '当前套餐','套餐限额','每周限额','最近的套餐用量','使用限额重置','已使用重置次数','已获得重置次数','额度','额度使用记录','用量历史记录','聊天用量排行','套餐用量历史','周期','管理存储空间','文件','图像','日期','模型','聊天','用量','名称','重试','Retry','Your plan','Plan limits','Credits']);
      content.setAttribute(`data-ui-${slug}-local`, '');
      for (const records of content.querySelectorAll('tbody,tfoot')) records.innerHTML = '';
      for (const node of [content,...content.querySelectorAll('*')]) {
        for (const child of node.childNodes) if (child.nodeType === 3 && !publicLabels.has(child.textContent.trim())) child.textContent = '';
        for (const attr of [...node.attributes]) if (!['class','id','role','tabindex'].includes(attr.name) && !attr.name.startsWith('data-ui-') && !attr.name.startsWith('data-settings-')) node.removeAttribute(attr.name);
        if (node.tagName.toLowerCase() === 'svg' && !node.classList.contains('Icon-X4VkKC')) node.innerHTML = '';
      }
    }
  }
  if (slug === 'plugins-settings') {
    for (const link of main?.querySelectorAll('a[href*="/settings/plugins-settings/"]') || []) (link.parentElement?.classList.contains('group') ? link.parentElement : link).remove();
  }
  if (slug === 'passwords' || slug === 'archived-chats') {
    for (const records of main?.querySelectorAll('tbody,[role="list"],[role="grid"]') || []) records.innerHTML = '';
  }
  // Remove all original chat titles/routes and the original personal assistant.
  const homeNav = body.querySelector('nav[role="navigation"]');
  homeNav?.setAttribute('data-ui-home-nav', '');
  for (const nav of body.querySelectorAll('nav')) {
    for (const e of nav.querySelectorAll('[data-sidebar-destination^="builtin:orbit:"]')) (e.closest('[role="listitem"],li') || e).remove();
    for (const section of nav.querySelectorAll('section')) {
      const label = section.querySelector('h1,h2,h3,button')?.textContent.trim() || section.textContent.trim();
      const list = section.querySelector('[role="list"],ul');
      if (list && /^最近/.test(label)) { list.innerHTML = ''; list.id = 'history-list'; }
      if (list && /^项目/.test(label)) { list.innerHTML = ''; list.id = 'project-list'; }
    }
    for (const e of nav.querySelectorAll('a[href]')) if (/\/(?:c|local|g|project)\//.test(e.getAttribute('href'))) (e.closest('[role="listitem"],li') || e).remove();
    for (const e of nav.querySelectorAll('[data-thread-title],[data-thread-title-trigger]')) (e.closest('[role="listitem"],li') || e).remove();
    // Space recent files/folders/pages are div-based interactive rows rather
    // than links or semantic list items; every such original record is private.
    for (const e of nav.querySelectorAll('[class]')) if (e.classList.contains('group/folder-row')) (e.closest('[role="listitem"],li') || e).remove();
    for (const e of nav.querySelectorAll('button[aria-label]')) {
      if (/页面[“"]|资料空间的操作|下添加子页面/.test(e.getAttribute('aria-label'))) {
        const row = e.closest('[role="listitem"],li') || e.closest('[data-sidebar-cycle-item][role="button"]');
        row?.remove();
      }
    }
  }
  for (const link of body.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href') || '';
    if (/\/(?:c|local)\/[a-zA-Z0-9_-]+/.test(href) || /\/(?:projects?|codex\/(?:tasks?|thread))\/[0-9a-f-]{20,}/i.test(href)) {
      (link.closest('[role="listitem"],li,tr,article') || link).remove();
    }
  }
  // Work task suggestions can contain prompts generated from this account's
  // private history, including hidden carousel cards. Retain only the captured
  // public writing-style suggestion; do not expose generated account prompts.
  for (const heading of body.querySelectorAll('main article h3')) {
    const wrapper = heading.closest('article').parentElement;
    if (wrapper.className.includes('work-tasks') && heading.textContent.trim() !== '了解我的写作风格') wrapper.remove();
  }
  // File/page grids contain account records and full document previews. Keep
  // the literal source column-header row and remove every original record,
  // including grids left in older route-transition surfaces.
  for (const grid of body.querySelectorAll('[role="grid"].group-Zlx1HD')) {
    for (const child of [...grid.children]) if (!child.querySelector('[role="columnheader"]')) child.remove();
    grid.setAttribute('data-local-records', 'library');
  }
  for (const table of body.querySelectorAll('[data-testid="sites-table"]')) {
    const grid = table.firstElementChild;
    grid?.setAttribute('data-local-records', 'sites');
    for (const row of table.querySelectorAll('[data-appgen-row]')) {
      const wrapper = row.parentElement;
      if (wrapper?.classList.contains('contents')) wrapper.remove(); else row.remove();
    }
  }
  // All captured Map POIs, markers, ratings, and regional suggestions derive
  // from the original account's location. Preserve only source map controls,
  // the empty canvas, headings, composer, and empty result/suggestion hosts.
  for (const marker of body.querySelectorAll('.mapboxgl-marker,.mapboxgl-popup,[data-map-marker-latitude],[data-map-marker-longitude]')) marker.remove();
  for (const results of body.querySelectorAll('.results-qLgUrv')) { results.innerHTML = ''; results.setAttribute('data-local-records', 'map-results'); }
  for (const card of body.querySelectorAll('button[data-card-id^="regional-"]')) (card.closest('[role="listitem"]') || card).remove();
  for (const canvas of body.querySelectorAll('canvas.mapboxgl-canvas')) canvas.setAttribute('data-ui-map-canvas', '');
  for (const map of body.querySelectorAll('.chatgpt-mapbox')) map.setAttribute('data-ui-map', '');
  // Captured task examples are public UI. Existing scheduled task names and
  // prompts are private, even when mixed into the same suggestion list.
  const publicTaskExamples = ['新闻动态','电子邮箱监控','寻找周末读物','价格提醒','查找音乐演出','帮我安排周末'];
  for (const card of body.querySelectorAll('[data-automation-card]')) {
    if (!publicTaskExamples.some(label => card.textContent.trim().startsWith(label))) card.remove();
    else card.parentElement.setAttribute('data-local-records', 'tasks');
  }
  for (const node of body.querySelectorAll('script,iframe,object,embed,noscript,template,link,meta')) node.remove();
  for (const node of body.querySelectorAll('style')) {
    // Authored first-party SVG color profiles are part of the original icons.
    // Other captured body styles are browser-extension injections.
    if (!/^\s*@supports\s*\(color:color\(display-p3\b/.test(node.textContent) || /url\(/i.test(node.textContent)) node.remove();
  }
  for (const node of body.querySelectorAll('[class],[id]')) {
    const cls = node.getAttribute('class') || '';
    const id = node.id || '';
    if (/(?:^|\s)(?:liner[^\s]*|L-[^\s]*|LImageHighlighter)(?:\s|$)/i.test(cls) || /^liner-/i.test(id)) node.remove();
  }
  for (const node of body.querySelectorAll('textarea,[contenteditable="true"]')) { node.textContent = ''; node.removeAttribute('value'); }
  for (const node of body.querySelectorAll('input')) {
    if (!['button', 'submit', 'reset', 'radio', 'checkbox'].includes(node.getAttribute('type'))) node.removeAttribute('value');
    node.removeAttribute('checked');
  }
  for (const node of body.querySelectorAll('img')) {
    const src = node.getAttribute('src') || '';
    const name = path.posix.basename(src);
    const capturedName = capturedPublicImages.get(node);
    if (capturedName || publicRasterIcons.has(name) || (publicHTMLImages.has(name) && copiedAssets.has(name))) { node.setAttribute('src', `./ui/assets/${capturedName || name}`); node.removeAttribute('srcset'); }
    else if (node.closest('[aria-label="打开个人资料菜单"],[aria-label^="Profile for "]')) genericAvatar(document, node);
    else if (slug === 'view:images' && main?.contains(node)) (node.closest('[role="listitem"],article,button') || node).remove();
    else node.remove();
  }
  // Account-specific counters do not establish a local account's state.
  for (const id of ['security-passkeys','security-active-sessions','security-linked-apps']) {
    const row = body.querySelector(`#${id}`);
    if (row) for (const n of row.querySelectorAll('span,div')) if (!n.children.length && /^\d+$/.test(n.textContent.trim())) n.textContent = '0';
  }
  for (const e of [document.documentElement, body, ...body.querySelectorAll('*')]) {
    for (const a of [...e.attributes]) {
      if (/^on/i.test(a.name) || /(?:theme-account-id|theme-user-id|page-load-id|liner|extension|data-react|data-liner|latitude|longitude|geolocation|coordinates|map-center)/i.test(a.name) || /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(a.value) || /(?:usercontent|blob:|chrome-extension:|builtin:orbit:|mapbox[^\s]*[/?].*(?:access_token|tiles)|[?&](?:lat|lng|lon)=)/i.test(a.value)) {
        e.removeAttribute(a.name); continue;
      }
      let v = neutralize(a.value);
      if (a.name === 'data-icon-sprite-url') v = './ui/assets/icons.svg';
      if ((a.name === 'href' || a.name === 'xlink:href') && e.tagName.toLowerCase() === 'use') v = `./ui/assets/icons.svg#${v.split('#').pop()}`;
      else if (a.name === 'href') {
        if (/^https:\/\/chatgpt\.com\/(?:settings\/)?/.test(v)) v = v.replace(/^https:\/\/chatgpt\.com/, '') || '/';
        if (/^(?:javascript|blob|data):/i.test(v)) { e.removeAttribute(a.name); continue; }
      }
      if (a.name === 'style') v = v.replace(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi, (_match,url) => {
        const name = path.posix.basename(url);
        return companionFiles.has(name) && /spritesheet.*\.webp$/.test(name) ? `url("./companion-assets/${name}")` : 'none';
      });
      if (/^data-/.test(a.name) && /(?:account|user|email|thread|session|conversation|member|device)[-_]?id$/i.test(a.name)) { e.removeAttribute(a.name); continue; }
      e.setAttribute(a.name, v);
    }
    for (const child of e.childNodes) if (child.nodeType === 3) child.textContent = neutralize(child.textContent);
  }
  // Memory/instruction contents are account data; the saved closed rows contain
  // only public labels. Open account-specific detail surfaces are excluded.
  for (const n of body.querySelectorAll('[data-memory-id],[data-memory-content],[data-custom-instructions-value],[data-user-instructions]')) n.remove();
  const accountPlan = body.querySelector('#account-plan span.text-secondary');
  if (accountPlan) accountPlan.textContent = '';
  main?.setAttribute('data-ui-main', '');
  side?.setAttribute('data-ui-sidebar', '');
  for (const button of body.querySelectorAll('[data-app-navigation-rail] button')) {
    const label = button.getAttribute('aria-label') || button.textContent.trim();
    button.setAttribute('data-nav', label);
  }
  const hooks = {'打开个人资料菜单':'profile-button','选择 ChatGPT 模型':'model-button','添加文件等内容':'attach-button','听写':'mic-button','开始语音':'voice-button','搜索':'search-chats','显示/隐藏侧边栏':'sidebar-toggle','关闭侧边栏':'sidebar-toggle'};
  for (const e of body.querySelectorAll('button')) {
    const label = e.getAttribute('aria-label');
    const globalHook = ['profile-button','search-chats','sidebar-toggle'].includes(hooks[label]);
    if (hooks[label] && (globalHook || main?.contains(e)) && !body.querySelector(`#${hooks[label]}`)) e.id = hooks[label];
    if (e.textContent.trim() === '新聊天' && !body.querySelector('#new-chat')) e.id = 'new-chat';
    if (e.textContent.trim() === '聊天' && !body.querySelector('#mode-chat')) e.id = 'mode-chat';
    if (e.textContent.trim() === '工作' && !body.querySelector('#mode-work')) e.id = 'mode-work';
  }
  if (!body.querySelector('#model-button')) {
    const model = [...(main?.querySelectorAll('button[id^="radix-"]') || [])].find(e => /GPT/i.test(e.textContent));
    if (model) model.id = 'model-button';
  }
  const editor = main?.querySelector('[contenteditable="true"]');
  if (editor) {
    editor.id = 'prompt';
    const composer = editor.closest('form') || editor.closest('.ComposerLayoutRoot-XCKS7O');
    composer?.setAttribute('id', 'composer-form'); composer?.setAttribute('data-ui-composer', '');
  }
  if (slug === 'home' || (slug.startsWith('view:') && editor)) {
    const headings = [...(main?.querySelectorAll('h1') || [])];
    const visibleHeading = headings.find(h => !h.classList.contains('invisible')) || main?.querySelector('.heading-xl span[class*="group/title"]') || headings[0];
    visibleHeading?.setAttribute('id', 'welcome-title');
    if (visibleHeading) visibleHeading.parentElement.setAttribute('id', 'welcome');
  }
  for (const nav of body.querySelectorAll('[data-settings-panel-slug]')) nav.setAttribute('data-ui-settings-nav', '');
  body.querySelector('[data-settings-panel]')?.setAttribute('data-ui-settings-panel', slug);
  return {body, htmlAttributes: attrs(document.documentElement), bodyAttributes: attrs(body)};
}
const sanitized = new Map();
for (const [slug, {document}] of rawDocs) sanitized.set(slug, sanitizeDocument(document, slug));
const account = sanitized.get('account');
const navigation = [...account.body.querySelectorAll('[data-settings-panel-slug]')].map(e => ({slug: e.getAttribute('data-settings-panel-slug'), label: e.textContent.trim()}));
const sourceSettingsNav = [...account.body.querySelectorAll('nav')].find(e => e.querySelector('[data-settings-panel-slug]'));
for (const [slug, safe] of sanitized) {
  if (!allowedSettingsSlugs.has(slug) || safe.body.querySelectorAll('[data-settings-panel-slug]').length >= navigation.length) continue;
  const incomplete = [...safe.body.querySelectorAll('nav')].find(e => e.querySelector('[data-settings-panel-slug]'));
  if (!incomplete || !sourceSettingsNav) continue;
  const fullNav = sourceSettingsNav.cloneNode(true);
  const selectedClass = account.body.querySelector('[data-settings-panel-slug="account"]').className;
  const normalClass = account.body.querySelector('[data-settings-panel-slug="appearance"]').className;
  for (const button of fullNav.querySelectorAll('[data-settings-panel-slug]')) {
    const active = button.getAttribute('data-settings-panel-slug') === slug;
    button.className = active ? selectedClass : normalClass;
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  }
  incomplete.replaceWith(fullNav);
  safe.navigationGraftedFrom = 'reference-settings-account.html';
}

// Source-derived pages use literal captured container/section/row DOM. Only
// headings, labels, descriptions, and control kinds evidenced in capture JSON
// are substituted; unknown service values and feature gates are not invented.
const prototypeRow = account.body.querySelector('#account-name');
const prototypeGroup = prototypeRow.parentElement;
const prototypeSection = prototypeRow.closest('section');
const prototypeButton = account.body.querySelector('#account-delete button');
const generalBody = sanitized.get('general-settings').body;
const selectButton = generalBody.querySelector('[data-settings-search-entry] button');
const switchButton = sanitized.get('notifications').body.querySelector('[role="switch"]') || sanitized.get('personalization').body.querySelector('[role="switch"]');
function rowHTML(item) {
  const row = prototypeRow.cloneNode(true);
  row.id = item.id;
  row.setAttribute('data-settings-search-entry', item.id);
  row.setAttribute('data-ui-source-derived', '');
  row.querySelector('.break-words.text-default').textContent = item.label;
  const description = row.querySelector('.text-wrap.break-words.text-secondary');
  if (description) { description.textContent = item.description || ''; if (!item.description) description.remove(); }
  const control = row.lastElementChild;
  control.innerHTML = '';
  if (item.type === 'switch' && switchButton) {
    const button = switchButton.cloneNode(true);
    button.setAttribute('aria-checked', 'false'); button.setAttribute('data-state', 'unchecked');
    button.setAttribute('aria-label', item.ariaLabel || item.label); button.removeAttribute('id');
    control.append(button);
  } else if (item.type === 'text') {
    const span = row.ownerDocument.createElement('span'); span.className = 'text-sm text-secondary'; span.textContent = item.value || ''; control.append(span);
  } else {
    const button = (item.type === 'menu' && selectButton ? selectButton : prototypeButton).cloneNode(true);
    button.textContent = item.action || item.value || '';
    button.className = button.className.replace(/bg-danger[^ ]*|text-danger[^ ]*/g, '').replace(/not-disabled:not-aria-disabled:hover:bg-danger[^ ]*/g, '');
    button.setAttribute('aria-label', item.ariaLabel || item.label);
    button.setAttribute('data-ui-setting-control', item.id);
    if (item.type === 'menu') button.setAttribute('aria-haspopup', 'menu');
    else if (item.type !== 'navigation') button.setAttribute('aria-haspopup', 'dialog');
    control.append(button);
  }
  return row.outerHTML;
}
function sectionHTML(label, rows) {
  const section = prototypeSection.cloneNode(true);
  const header = section.firstElementChild;
  if (label) header.querySelector('.font-medium.text-default').textContent = label; else header.remove();
  const group = prototypeGroup.cloneNode(false); group.innerHTML = rows.map(rowHTML).join('');
  const content = section.lastElementChild; content.innerHTML = ''; content.append(group);
  return section.outerHTML;
}
const j = prefix => Object.entries(evidence).find(([n]) => n.startsWith(`capture-${prefix}-`))?.[1];
const definition = new Map();
const define = (slug, heading, description, sections, sources, limitations = []) => definition.set(slug, {heading, description, sections, sources, limitations});
const voice = j('04');
define('voice', voice.title.label, voice.title.overview, [{rows: voice.controls.filter(c => ['voice-account-voice','voice-language','voice-account-dictation'].includes(c.id)).map(c => ({id:c.id,label:c.label,description:c.description,type:/switch/.test(c.type)?'switch':/menu/.test(c.type)?'menu':'button'}))}], ['capture-04-voice.json'], voice.limitations);
const pets = j('06');
define('pets', message(pets.webPanel.titleLabelId), message(pets.webPanel.overviewLabelId), [{label:message(pets.webPanel.fieldset.legendLabelId),rows:[{id:'pets-options',label:message(pets.webPanel.builtins.none.id),type:'text'}]}], ['capture-06-companions.json'], ['Custom pet names, IDs, artwork, current selection, and gated creation controls are excluded.']);
const keyboard = j('07');
define('keyboard-shortcuts', keyboard.title.section.defaultMessage, keyboard.title.overview.defaultMessage, keyboard.sections.map(s=>({label:s.label, rows:keyboard.rows.filter(r=>r.section===s.key && r.gateStatus!=='dormant_in_browser').map(r=>({id:r.searchEntryId,label:r.title.defaultMessage,description:r.description?.defaultMessage,type:'menu',value:(r.browserDefaults?.windows||[]).join(', ')}))})), ['capture-07-keyboard.json'], ['Bindings shown are public Windows defaults; active host command registry and eligibility were not observed.']);
const data = j('08');
define('data-controls', 'Data controls', message('settings.overview.data-controls'), [{rows:data.expectedControls.filter(c => ['data-controls-shared-links','data-controls-training','data-controls-archived-chats','data-controls-archive-all','data-controls-delete-all','data-controls-export'].includes(c.entry)).map(c=>({id:c.entry,label:c.label,type:c.type==='switch'?'switch':c.type==='navigation row'?'navigation':'button',action:c.action,ariaLabel:c.ariaLabel}))}], ['capture-08-data.json'], ['Feature-gated and registry-only rows are excluded; account-specific values are not inferred.']);
const storage = j('09');
define('storage', 'ChatGPT storage', storage.storage.overview, [{label:storage.storage.manage.heading,rows:storage.storage.manage.rows.map((r,i)=>({id:['storage-files','storage-images'][i],label:r.label,type:'navigation'}))}], ['capture-09-storage.json'], ['Usage, quotas, file counts, and image counts require account data and are omitted.']);
define('archived-chats', 'Archived chats', storage.archivedChats.overview, [], ['capture-09-storage.json'], ['No archived account conversations, counts, or service-dependent list state is supplied.']);
const usage = j('12');
define('usage', 'Usage & billing', usage.usage.overview.defaultMessage, [{label:'Your plan',rows:[]},{rows:usage.usage.rowAndGroupIds.map(r=>({id:r.id,label:message(r.titleMessage),description:message(r.descriptionMessage),type:'button'})).filter(r=>r.label)}], ['capture-12-usage-billing.json'], ['Plan identity, spend, credits, meter values, reset history, and eligibility require service data.']);
define('billing', 'Billing', usage.billing.overview.defaultMessage, [{rows:usage.billing.rowAndGroupIds.map(r=>({id:r.id,label:message(r.titleMessage),type:'button',action:message(r.optionsMessageIds?.[0])})).filter(r=>r.label)}], ['capture-12-usage-billing.json'], ['Payment methods, invoices, addresses, and subscription values are excluded.']);
const family = j('13');
define('trusted-contact', 'Trusted contact', message('settings.overview.trusted-contact'), [{rows:[{id:'trusted-contact-add',label:message('settings.trustedContact.add','Add a contact'),type:'button',action:message('settings.trustedContact.add','Add a contact')}]}], ['capture-13-family.json'], ['No contact, enrollment, country variant, or eligibility state is inferred.']);
define('plugins-settings', 'Plugins', 'Manage your plugins, connected accounts, and permissions', [], ['capture-14-plugins.json'], ['Installed plugins, connected accounts, permissions, and service-dependent list state are excluded.']);
const integrations = j('15');
const integration = slug => integrations.assets.find(a=>a.section===slug);
const intLabel = (slug,id) => integration(slug)?.labels.find(l=>l.id===id)?.defaultMessage || message(id);
define('browser-use', 'Browser', '', [{rows:[['browser-history-access','settings.browserUse.historyApproval.label','menu'],['browser-site-tools','settings.browserUse.webMcp.label','switch'],['browser-website-permissions','settings.browserUse.policy.agentPermissions.title','button'],['browser-full-cdp','settings.browserUse.fullCdp.label','switch'],['browser-solve-captchas','settings.browserUse.captcha.label','switch']].map(([id,k,type])=>({id,label:intLabel('browser-use',k),type})).filter(r=>r.label)}], ['capture-15-integrations.json'], ['Rows are shipped-code evidence; native browser availability, site rules, and permissions are unknown.']);
define('cloud-computer', 'Cloud computer', intLabel('cloud-computer','restricted.cloudComputer.description'), [{label:'General',rows:[['cloud-browser-site-permissions','settings.chatGpt.cloudBrowser.sitePermissions'],['cloud-browser-email-codes','settings.chatGpt.cloudBrowser.emailVerificationCodes'],['cloud-browser-passkeys','settings.chatGpt.cloudBrowser.passkeys.title']].map(([id,k])=>({id,label:intLabel('cloud-computer',k),description:intLabel('cloud-computer',k+'.description'),type:'button'})).filter(r=>r.label)}], ['capture-15-integrations.json'], ['No saved cookies, passkeys, credentials, or approval values are supplied.']);
define('passwords', 'Passwords', intLabel('passwords','settings.passwords.overview'), [{rows:[{id:'passwords-one-password',label:'1Password',description:intLabel('passwords','settings.chatGpt.cloudBrowser.credentials.setupDescription'),type:'button'},{id:'passwords-native-sync',label:intLabel('passwords','settings.passwordSync.title'),type:'switch'}]}], ['capture-15-integrations.json'], ['Saved credentials, sync state, and native provider availability are excluded.']);
// The supplied evidence establishes these navigation destinations, not a body.
// Keep the original page shell without manufacturing unsupported settings rows.
for (const slug of ['codex-cloud','code-review']) define(slug, navigation.find(n=>n.slug===slug)?.label || slug, '', [], ['reference-settings-account.html'], ['Only the original navigation destination was captured; no body schema is supplied.']);

const templates = {home:{html:sanitized.get('home').body.innerHTML},settings:{},views:{},navigation,provenance:{assembler:'scripts/assemble-ui.mjs',source:'Saved first-party HTML and public source evidence supplied in .test-output',privacy:'Scripts removed before parsing. Original account identities, assistant identity, chat history, private routes, input contents, user images, IDs, and browser-extension content excluded. No original JavaScript is distributed.',assets:{stylesheets:[...stylesheets],unavailableCSSAssets:[...missingAssets],publicFetchResults},pendingCaptures,pages:{}}};
for (const [slug, item] of rawDocs) {
  const safe = sanitized.get(slug);
  const entry = {html:safe.body.innerHTML,htmlAttributes:safe.htmlAttributes,bodyAttributes:safe.bodyAttributes};
  if(slug==='home') templates.home=entry; else if(slug.startsWith('view:')) templates.views[slug.slice(5)]=entry; else templates.settings[slug]=entry;
  templates.provenance.pages[slug]={kind:'captured',file:item.name,sourceSha256:hash(item.raw),inactiveMainSurfacesRemoved:item.prunedMains,...(safe.navigationGraftedFrom ? {navigationGraftedFrom:safe.navigationGraftedFrom}:{}),...(['usage','storage'].includes(slug)?{privateAccountMetricsRemoved:true}:{}),...(slug==='plugins-settings'?{originalInstalledAccountRowsRemoved:true}:{})};
}
const selectedNav = account.body.querySelector('[data-settings-panel-slug="account"]');
const normalNav = account.body.querySelector('[data-settings-panel-slug="appearance"]');
for (const {slug,label} of navigation) {
  if (templates.settings[slug]) continue;
  const spec = definition.get(slug);
  const body = account.body.cloneNode(true);
  const panel = body.querySelector('[data-settings-panel]');
  const heading = panel.querySelector('h1');
  heading.textContent = spec?.heading || label;
  const description = heading.nextElementSibling;
  if (description) { description.textContent=spec?.description||''; if(!spec?.description) description.remove(); }
  const content = panel.querySelector('.group\\/settings');
  content.innerHTML = spec?.sections.map(s=>sectionHTML(s.label,s.rows)).join('') || '';
  panel.setAttribute('data-ui-settings-panel',slug);
  panel.setAttribute('data-ui-provenance','source-derived');
  for(const button of body.querySelectorAll('[data-settings-panel-slug]')) {
    const active=button.getAttribute('data-settings-panel-slug')===slug;
    button.className=active?selectedNav.className:normalNav.className;
    if(active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  }
  templates.settings[slug]={html:body.innerHTML,htmlAttributes:account.htmlAttributes,bodyAttributes:account.bodyAttributes};
  templates.provenance.pages[slug]={kind:'source-derived',shell:'reference-settings-account.html',evidence:spec?.sources||[],limitations:spec?.limitations||[]};
}
const home = sanitized.get('home');
const attrHTML = o=>Object.entries(o).map(([k,v])=>` ${k}="${escaped(v)}"`).join('');
const links = [...stylesheets].map(n=>`<link rel="stylesheet" href="./ui/assets/${n}">`).join('\n');
const index = `<!doctype html>\n<html${attrHTML(home.htmlAttributes)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>ChatGPT</title>\n<link rel="stylesheet" href="./ui/assets/source-layers.css">\n${links}\n<link rel="stylesheet" href="./ui/assets/source-inline.css"><link rel="stylesheet" href="./bridge.css"><link rel="stylesheet" href="./power-picker.css"></head>\n<body${attrHTML(home.bodyAttributes)}><div id="app" style="display:contents"></div><div id="overlay-root"></div><script type="module" src="./app.js"></script></body></html>\n`;
await fs.writeFile(path.join(base,'index.html'),index);
await fs.writeFile(path.join(outDir,'templates.json'),JSON.stringify(templates,null,2)+'\n');
console.log(JSON.stringify({assembled:true,captured:rawDocs.size,pendingCaptures:pendingCaptures.length,settings:Object.keys(templates.settings).length,stylesheets:stylesheets.size,copiedPublicAssets:copiedAssets.size,output:'ui/templates.json',unavailableCSSAssetCount:missingAssets.size}));
