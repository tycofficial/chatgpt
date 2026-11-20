/** Asset hosting only: original components can start without disk-backed workers. */
export async function installBrowserCompatibility(scope = globalThis) {
  if (!Array.prototype.toSorted || !Array.prototype.findLast || !Array.prototype.at || !Array.prototype.with ||
      !Object.hasOwn || !Promise.withResolvers || !scope.structuredClone) {
    await import('./compat-assets/standards.mjs?v=3b6d1479ff957dc6');
  }
  const define = (object, key, value) => {
    if (object && !(key in object)) Object.defineProperty(object, key, { configurable: true, writable: true, value });
  };
  if (scope.crypto?.getRandomValues) define(scope.crypto, 'randomUUID', () => {
    const bytes = scope.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  });
  const Signal = scope.AbortSignal, Controller = scope.AbortController;
  if (Signal && Controller) {
    const abortReason = signal => signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
    define(Signal.prototype, 'throwIfAborted', function() { if (this.aborted) throw abortReason(this); });
    define(Signal, 'timeout', ms => {
      if (!Number.isSafeInteger(ms) || ms < 0) throw new RangeError('Expected a non-negative timeout in milliseconds.');
      const controller = new Controller(), deadline = Date.now() + ms;
      const elapsed = () => {
        const remaining = deadline - Date.now();
        if (remaining > 0) setTimeout(elapsed, Math.min(remaining, 2147483647));
        else controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
      };
      setTimeout(elapsed, Math.min(ms, 2147483647));
      return controller.signal;
    });
    define(Signal, 'any', signals => {
      const inputs = Array.from(signals), controller = new Controller();
      for (const input of inputs) if (!(input instanceof Signal)) throw new TypeError('Expected an AbortSignal.');
      const onAbort = event => {
        for (const input of inputs) input.removeEventListener('abort', onAbort);
        controller.abort(abortReason(event.target));
      };
      const first = inputs.find(input => input.aborted);
      if (first) controller.abort(abortReason(first));
      else for (const input of inputs) input.addEventListener('abort', onAbort, { once: true });
      return controller.signal;
    });
  }
  define(scope.Response, 'json', (value, init = {}) => {
    const body = JSON.stringify(value);
    if (body === undefined) throw new TypeError('The value cannot be serialized as JSON.');
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return new scope.Response(body, { ...init, headers });
  });
}

export function originalAssetURL(value, rootURL) {
  if (typeof value !== 'string' || !value) return value;
  let url; try { url = new URL(value, rootURL); } catch { return value; }
  if ((url.origin === rootURL.origin || url.origin === 'https://chatgpt.com') && url.pathname.startsWith('/cdn/')) return new URL('original-client/public/chatgpt.com' + url.pathname + url.search + url.hash, rootURL).href;
  if (url.origin === 'https://cdn.oaistatic.com') return new URL('original-client/public/cdn.oaistatic.com' + url.pathname + url.search + url.hash, rootURL).href;
  return value;
}

export function localizeRouterAssets(manifest, rootURL, registrationURL) {
  if (!manifest?.entry || !manifest.routes) return;
  const mapped = new Map();
  const resource = value => {
    if (typeof value !== 'string') return value;
    if (!mapped.has(value)) mapped.set(value, originalAssetURL(value, rootURL));
    return mapped.get(value);
  };
  manifest.url = resource(manifest.url);
  for (const record of [manifest.entry, ...Object.values(manifest.routes)]) {
    for (const key of Object.keys(record)) {
      if (key === 'module' || key.endsWith('Module')) record[key] = resource(record[key]);
      else if (key === 'imports' || key === 'css') record[key] = record[key]?.map(resource);
    }
  }
  // The host already starts this entry. React's modulepreload should share its module instance.
  manifest.entry.module = registrationURL;
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
  const rebaseStyle = document.querySelector('style[data-native-asset-rebase]');
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') rewrite(record.target);
      for (const node of record.addedNodes ?? []) {
        if (node.nodeType !== 1) continue;
        rewrite(node);
        for (const child of node.querySelectorAll?.('[src], [href]') ?? []) rewrite(child);
      }
    }
    if (rebaseStyle && !rebaseStyle.isConnected && document.head) document.head.append(rebaseStyle);
  });
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'href', 'data-icon-sprite-url'] });
  const sheet = document.querySelector('style[data-native-asset-rebase]') ? null : document.querySelector('link[rel="stylesheet"]');
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
