const repositoryBase = '/chatgpt/';

const authEntries = new Map([
  ['/login', 'login'], ['/auth/login', 'login'],
  ['/signup', 'signup'], ['/auth/signup', 'signup'],
  ['/logout', 'logout'], ['/auth/logout', 'logout'],
  ['/signout', 'logout'], ['/auth/signout', 'logout'], ['/api/auth/signout', 'logout'],
]);

const documentPath = path => path.replace(/\/index\.html\/?$/i, '/').replace(/\/+$/, '') || '/';

export function resolveSiteHomeUrl(origin, ...basePaths) {
  for (const path of basePaths) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\?#]/.test(path)) continue;
    const base = new URL(path, origin);
    if (base.origin !== origin || base.pathname === '/') continue;
    base.pathname = base.pathname.replace(/\/+$/, '') + '/';
    return base;
  }
  return new URL(repositoryBase, origin);
}

export function siteRelativePath(path, homePath) {
  const basename = homePath.replace(/\/+$/, '');
  if (path === basename) return '/';
  return path.startsWith(basename + '/') ? documentPath(path.slice(basename.length)) : null;
}

export function isHistoricalSitePath(path) {
  return path === '/' || /^\/(?:c\/[^/]+|(?:codex|work|dots|share|gpts)(?:\/|$))/.test(path);
}

/** Recognize both current repository routes and saved same-origin authentication aliases. */
export function getSiteAuthEntryKind(value, home) {
  try {
    const target = new URL(value, home);
    const base = new URL(home);
    if (target.origin !== base.origin || target.username || target.password) return null;
    return authEntries.get(siteRelativePath(target.pathname, base.pathname) ?? documentPath(target.pathname)) ?? null;
  } catch {
    return null;
  }
}
