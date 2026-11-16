/** Apply a coherent deployed release when the current conversation is idle. */
export function composerHasDraft(document = globalThis.document) {
  return [...(document?.querySelectorAll?.('textarea,[contenteditable="true"]') || [])].some(element => {
    if (element.closest?.('[hidden],[aria-hidden="true"]')) return false;
    if (element.getClientRects && !element.getClientRects().length) return false;
    return String(element.value ?? element.innerText ?? element.textContent ?? '').trim().length > 0;
  });
}

export function createReleaseUpdater({
  currentRelease, baseURL, fetchImpl = globalThis.fetch.bind(globalThis),
  isBusy = () => false, hasDraft = () => composerHasDraft(),
  currentURL = () => globalThis.location.href,
  navigate = url => globalThis.location.replace(url),
  storage = globalThis.sessionStorage, now = Date.now,
  eventTarget = globalThis.window, document = globalThis.document,
  intervalMs = 60000, requestTimeoutMs = 8000,
} = {}) {
  const base = new URL(baseURL), state = { currentRelease, pendingRelease: null, checkedAt: null, status: 'idle', error: null };
  let stopped = false, applied = false, inFlight = null, timer = null, controller = null;
  const ownURL = path => new URL(path, base);
  const request = async path => {
    const url = ownURL(path); if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw Error('Release URL outside this application');
    const response = await fetchImpl(url, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
    if (!response.ok) throw Error('Release resource unavailable: ' + response.status);
    return response;
  };
  function applyIfSafe() {
    if (stopped || applied || !state.pendingRelease) return false;
    if (isBusy() || hasDraft()) { state.status = 'deferred'; return false; }
    const key = 'chatgpt-release-application:' + state.pendingRelease;
    let previous;
    try { previous = JSON.parse(storage?.getItem(key) || 'null'); } catch {}
    if (previous?.attempts >= 2 && now() - previous.at < 120000) { state.status = 'waiting-for-fresh-page'; return false; }
    const target = new URL(currentURL());
    if (target.origin !== base.origin) return false;
    if (target.pathname === base.pathname.replace(/\/$/, '')) target.pathname = base.pathname;
    if (!target.pathname.startsWith(base.pathname)) return false;
    target.searchParams.set('__native_release', state.pendingRelease);
    try { storage?.setItem(key, JSON.stringify({ attempts: (previous?.attempts || 0) + 1, at: now() })); } catch {}
    applied = true; state.status = 'applying'; navigate(target.href); return true;
  }
  async function check() {
    if (stopped || applied) return false;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const active = await (await request('native-client/active.json?check=' + now())).json();
        state.checkedAt = now(); state.error = null;
        if (active.active !== true || !/^[a-f0-9]{16}$/.test(active.release || '')) throw Error('Invalid deployment release record');
        if (active.release === currentRelease) { state.pendingRelease = null; state.status = 'current'; return false; }
        const html = await (await request('index.html?check_release=' + active.release + '&t=' + now())).text();
        if (!html.includes('data-native-client-release="' + active.release + '"') || !html.includes('native-client/bootstrap.mjs?v=' + active.release)) throw Error('Deployment HTML and release record are not coherent yet');
        const bootstrap = await (await request('native-client/bootstrap.mjs?v=' + active.release + '&check=' + now())).text();
        if (!bootstrap.includes(JSON.stringify(active.release))) throw Error('Deployment bootstrap has not updated yet');
        if (stopped) return false;
        state.pendingRelease = active.release; return applyIfSafe();
      } catch (error) { state.status = 'retry-later'; state.error = String(error.message || error); return false; }
      finally { clearTimeout(timeout); controller = null; }
    })();
    try { return await inFlight; } finally { inFlight = null; }
  }
  const schedule = () => { if (stopped) return; clearTimeout(timer); timer = setTimeout(() => { if (document?.visibilityState !== 'hidden') void check(); schedule(); }, intervalMs); };
  const wake = () => { if (!stopped && document?.visibilityState !== 'hidden') void check(); };
  return {
    check, applyIfSafe, getState: () => ({ ...state }),
    start() { eventTarget?.addEventListener?.('focus', wake); eventTarget?.addEventListener?.('pageshow', wake); document?.addEventListener?.('visibilitychange', wake); schedule(); void check(); return this; },
    stop() { stopped = true; clearTimeout(timer); controller?.abort(); eventTarget?.removeEventListener?.('focus', wake); eventTarget?.removeEventListener?.('pageshow', wake); document?.removeEventListener?.('visibilitychange', wake); },
  };
}
