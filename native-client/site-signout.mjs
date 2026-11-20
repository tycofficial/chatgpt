const signOutPaths = new Set(['/logout', '/auth/logout', '/signout', '/auth/signout', '/api/auth/signout']);
const originalOrigin = 'https://chatgpt.com';

function resolveUrl(value, base) {
  try {
    const url = new URL(value, base);
    return !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

const withoutTrailingSlash = path => path.replace(/\/+$/, '') || '/';

function appHome(value) {
  const home = new URL(value);
  home.pathname = home.pathname.replace(/\/+$/, '') + '/';
  home.search = '';
  home.hash = '';
  return home;
}

function appPath(url, home) {
  if (!url || url.origin !== home.origin) return null;
  const basename = home.pathname.replace(/\/+$/, '');
  if (url.pathname === basename) return '/';
  if (!url.pathname.startsWith(basename + '/')) return null;
  return withoutTrailingSlash(url.pathname.slice(basename.length).replace(/\/index\.html$/, '/'));
}

export function getSiteSignOutPageUrl(home) {
  return new URL('auth/logout', appHome(home));
}

export function getSiteSignedOutUrl(home) {
  const url = appHome(home);
  url.searchParams.set('localSession', '0');
  return url.href;
}

export function isSiteSignOutPage(value, homeUrl) {
  const home = appHome(homeUrl);
  return signOutPaths.has(appPath(resolveUrl(value, home), home));
}

export function isNativeSignOutLink(href, currentUrl, homeUrl) {
  const home = appHome(homeUrl);
  const current = resolveUrl(currentUrl, home);
  if (!appPath(current, home)) return false;
  const target = resolveUrl(href, current);
  if (!target || (target.origin !== home.origin && target.origin !== originalOrigin)) return false;
  return signOutPaths.has(appPath(target, home)) || signOutPaths.has(withoutTrailingSlash(target.pathname));
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
      try { clearSiteAccount(); } catch {}
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
