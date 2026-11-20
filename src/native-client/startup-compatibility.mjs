/** Asset hosting only: original components can start without disk-backed workers. */
export function originalAssetURL(value, rootURL) {
  if (typeof value !== 'string' || !value) return value;
  let url; try { url = new URL(value, rootURL); } catch { return value; }
  if ((url.origin === rootURL.origin || url.origin === 'https://chatgpt.com') && url.pathname.startsWith('/cdn/')) return new URL('original-client/public/chatgpt.com' + url.pathname + url.search + url.hash, rootURL).href;
  if (url.origin === 'https://cdn.oaistatic.com') return new URL('original-client/public/cdn.oaistatic.com' + url.pathname + url.search + url.hash, rootURL).href;
  return value;
}

export async function registerOptionalAssetWorker(workerURL, scope, getContainer = () => globalThis.navigator?.serviceWorker) {
  try {
    const container = getContainer();
    if (!container) return false;
    await container.register(workerURL, { scope, type: 'module', updateViaCache: 'none' });
    return true;
  } catch {
    return false;
  }
}

export function installDirectAssetHost(rootURL, { document = globalThis.document, fetchImpl = globalThis.fetch, MutationObserver = globalThis.MutationObserver } = {}) {
  const rewrite = node => {
    if (node?.nodeType !== 1) return;
    for (const attr of ['src', 'href', 'data-icon-sprite-url']) {
      const value = node.getAttribute(attr); if (!value) continue;
      const mapped = originalAssetURL(value, rootURL);
      if (mapped !== value) node.setAttribute(attr, mapped);
    }
  };
  rewrite(document.documentElement);
  for (const node of document.querySelectorAll('[src], [href], [data-icon-sprite-url]')) rewrite(node);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') rewrite(record.target);
      for (const node of record.addedNodes ?? []) {
        rewrite(node);
        for (const child of node.querySelectorAll?.('[src], [href]') ?? []) rewrite(child);
      }
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'href', 'data-icon-sprite-url'] });
  const sheet = document.querySelector('link[rel="stylesheet"]');
  if (sheet) void (async () => {
    try {
      const sheetURL = new URL(sheet.href, rootURL);
      const result = await fetchImpl(sheetURL, { signal: AbortSignal.timeout(15000) });
      if (!result.ok) return;
      const css = (await result.text()).replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (whole, quote, value) => {
        if (value.startsWith('#')) return whole;
        const assetURL = new URL(value, sheetURL).href;
        const mapped = originalAssetURL(assetURL, rootURL);
        return mapped === value ? whole : 'url(' + JSON.stringify(mapped) + ')';
      });
      const style = document.createElement('style'); style.dataset.nativeAssetRebase = 'true'; style.textContent = css;
      sheet.after(style); sheet.disabled = true;
    } catch { /* Keep the original linked stylesheet. */ }
  })();
  return observer;
}
export function showStartupError(error, document = globalThis.document) {
  console.error('ChatGPT site startup failed', error);
  globalThis.__CHATGPT_STARTUP_ERROR__ = { name: error?.name, message: String(error?.message ?? error) };
  const panel = document.createElement('main');
  panel.style.cssText = 'max-width:36rem;margin:20vh auto;padding:24px;font:16px/1.6 system-ui;color:#eee;background:#212121;border-radius:16px';
  const title = document.createElement('h1'); title.textContent = '页面未能完成加载'; title.style.fontSize = '22px';
  const detail = document.createElement('p'); detail.textContent = '请重试加载。聊天记录不会被清除；浏览器存储不可用时，附件和记录保存可能仍受限制。';
  const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.onclick = () => globalThis.location.reload();
  retry.style.cssText = 'padding:10px 18px;border:0;border-radius:24px;background:#fff;color:#111;cursor:pointer';
  panel.append(title, detail, retry); document.body.replaceChildren(panel);
}
