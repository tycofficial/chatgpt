import { getSiteAuthEntryKind, isHistoricalSitePath, resolveSiteHomeUrl, siteRelativePath } from './site-paths.mjs?v=b12212a94966c6ff';

const originalOrigin = 'https://chatgpt.com';

function resolveUrl(value, base) {
  try {
    const url = new URL(value, base);
    return !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function appHome(value) {
  const home = new URL(value);
  return resolveSiteHomeUrl(home.origin, home.pathname);
}

export function getSiteSignOutPageUrl(home) {
  return new URL('auth/logout', appHome(home));
}

export function getSiteSignedOutUrl(home) {
  return appHome(home).href;
}

export function isSiteSignOutPage(value, homeUrl) {
  return getSiteAuthEntryKind(value, appHome(homeUrl)) === 'logout';
}

export function isNativeSignOutLink(href, currentUrl, homeUrl) {
  const home = appHome(homeUrl);
  const current = resolveUrl(currentUrl, home);
  if (!current || current.origin !== home.origin ||
      !(siteRelativePath(current.pathname, home.pathname) || isHistoricalSitePath(current.pathname) || getSiteAuthEntryKind(current, home))) return false;
  const target = resolveUrl(href, current);
  if (!target || (target.origin !== home.origin && target.origin !== originalOrigin)) return false;
  if (target.origin === originalOrigin && target.origin !== home.origin) {
    return getSiteAuthEntryKind(target, new URL('/', originalOrigin)) === 'logout';
  }
  return getSiteAuthEntryKind(target, home) === 'logout' || getSiteAuthEntryKind(href, home) === 'logout';
}

/** Keep the archived logout account-switch return on the repository's home. */
export function installSiteSignOutRestore({ home, scope = globalThis.window }) {
  const history = scope.history;
  const originalReplaceState = history?.replaceState;
  function replaceState(state, title, url) {
    if (url != null) {
      const base = appHome(home());
      const current = resolveUrl(scope.location.href, base);
      if (current?.origin === base.origin && current.pathname === base.pathname) {
        const target = resolveUrl(url, current);
        if (target?.origin === base.origin && target.pathname === base.pathname.slice(0, -1)) {
          target.pathname = base.pathname;
          return originalReplaceState.call(this, state, title, target.href);
        }
      }
    }
    return Reflect.apply(originalReplaceState, this, arguments);
  }
  if (typeof originalReplaceState === 'function') history.replaceState = replaceState;
  function legacyLogoutHome() {
    const base = appHome(home());
    const current = resolveUrl(scope.location.href, base);
    if (current?.origin !== base.origin || siteRelativePath(current.pathname, base.pathname) !== '/auth/logout') return null;
    const action = current.searchParams.get('account_switch_action');
    return action === 'logout' || action === 'resume' ? base : null;
  }
  const restore = event => {
    if (!event.persisted || scope.history?.state?.usr === 'complete-browser-logout') return;
    const base = legacyLogoutHome();
    if (!base) return;
    event.stopImmediatePropagation();
    scope.location.replace(base.href);
  };
  const replaceOriginRoot = event => {
    if (!event.cancelable || event.defaultPrevented || event.navigationType !== 'replace') return;
    const base = legacyLogoutHome();
    if (!base || event.destination.url !== new URL('/', base).href) return;
    event.preventDefault();
    queueMicrotask(() => scope.location.replace(base.href));
  };
  const options = { capture: true };
  scope.addEventListener('pageshow', restore, options);
  scope.navigation?.addEventListener('navigate', replaceOriginRoot);
  return () => {
    scope.removeEventListener('pageshow', restore, options);
    scope.navigation?.removeEventListener('navigate', replaceOriginRoot);
    if (history?.replaceState === replaceState) history.replaceState = originalReplaceState;
  };
}

async function runBounded(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise(resolve => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } catch {
    // A rejected sync or cleanup must not prevent the local sign-out.
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Share one local sign-out across native confirmation, legacy links, and the compatibility endpoint. */
export function createSiteSignOutController({
  home,
  prepare,
  clearSiteAccount,
  clearNativeSession,
  navigate = url => globalThis.location.replace(url),
  timeoutMs = 1500,
}) {
  let completion;
  let navigation;
  function complete() {
    return completion ??= Promise.resolve().then(async () => {
      const target = getSiteSignedOutUrl(home());
      if (prepare) await runBounded(prepare, timeoutMs);
      try { await clearSiteAccount(); } catch {}
      try { clearNativeSession(); } catch {}
      return target;
    });
  }
  function navigateAfterSignOut() {
    return navigation ??= complete().then(url => {
      navigate(url);
      return url;
    });
  }
  return { complete, navigateAfterSignOut };
}

/** Retain the native confirmation page's cleanup callback and result contract. */
export function createNativeSiteSignOut({ complete, markBrowserSignedOut, timeoutMs = 1000 }) {
  let completion;
  return async function signOut(onCleanup, _callbackUrl, signal) {
    if (signal?.aborted) return { ok: false };
    return completion ??= (async () => {
      const url = await complete();
      try { markBrowserSignedOut?.(); } catch {}
      if (typeof onCleanup === 'function') await runBounded(() => onCleanup(), timeoutMs);
      return { ok: true, url };
    })();
  };
}
