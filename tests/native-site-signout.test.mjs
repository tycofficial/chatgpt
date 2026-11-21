import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getSiteAuthEntryKind } from '../src/native-client/site-paths.mjs';
import {
  createNativeSiteSignOut, createSiteSignOutController, getSiteSignOutPageUrl,
  getSiteSignedOutUrl, installSiteSignOutRestore, isNativeSignOutLink, isSiteSignOutPage,
} from '../src/native-client/site-signout.mjs';

const home = 'https://tycofficial.github.io/chatgpt/';
const signedOut = home;
const conversation = home + 'c/neutral-fixture';
const origin = new URL(home).origin;

function nativeExports(file, id, nextId, dependencies = {}) {
  const asset = new URL('../original-client/public/chatgpt.com/cdn/assets/' + file, import.meta.url);
  const source = fs.readFileSync(asset, 'utf8');
  const marker = id + ':(function';
  const at = source.indexOf(marker);
  assert.ok(at >= 0, 'Original factory is available: ' + id);
  const start = at + id.length + 1;
  const end = source.indexOf(',' + nextId + ':(function', start);
  assert.ok(end > start, 'Original factory boundary is available: ' + nextId);
  const factory = vm.runInNewContext(source.slice(start, end), {}, { filename: file + '#' + id, timeout: 1000 });
  const module = { exports: {} };
  const require = name => dependencies[name] ?? {};
  require.d = (exports, getters, values) => {
    for (const [name, get] of Object.entries(getters ?? {})) Object.defineProperty(exports, name, { get });
    Object.assign(exports, values);
  };
  factory(module, module.exports, require);
  return module.exports;
}

function nativeConfirmationAdapter(siteSignOut, markBrowserSignedOut) {
  const source = fs.readFileSync(new URL('../src/native-client/boot-adapter.mjs', import.meta.url), 'utf8');
  const beginning = source.indexOf("overrideExports('AqQr',");
  const end = source.indexOf('\n});', beginning);
  assert.ok(beginning >= 0 && end > beginning, 'Native logout export override is installed');
  let confirm;
  vm.runInNewContext(source.slice(beginning, end + 4), {
    createNativeSiteSignOut,
    siteSignOut,
    requireOriginal(id) {
      assert.equal(id, 'QdUF');
      return { markBrowserChatGptSignedOut: markBrowserSignedOut };
    },
    overrideExports(id, _overrides, _options, wrappers) {
      assert.equal(id, 'AqQr');
      confirm = wrappers.b();
    },
  }, { timeout: 1000 });
  return confirm;
}

test('the original profile logout command enters the native confirmation route and completes inside the application', async () => {
  const commands = nativeExports('200429.7cb44b876c.js', 'q3HK', 'vnLQ');
  const navigations = [];
  const profileLocation = 'fixture-profile-dropdown';
  const nativeHandler = nativeExports('767086.390bf6c64e.js', 'QtaM', 'zskm', {
    QosV: { c: length => Array(length).fill(Symbol.for('react.memo_cache_sentinel')) },
    c2QW: { o: { ACCESS_LOGOUT_ACTION_LOCATION_PROFILE_DROP_DOWN: profileLocation } },
    Q840: { y: () => ({}) },
    rEML: { ab: () => (path, options) => navigations.push({ path, state: options.state }) },
    h6fL: { a: () => ({ authMethod: 'chatgpt', email: 'fixture@example.invalid', requiresAuth: true }) },
    xm2W: { b: () => false },
    EFj1: { a: (id, handler, options) => commands.c(id, handler, { isActive: () => options.enabled }) },
    Lhm2: { c: path => path },
  });
  nativeHandler.a();
  assert.equal(commands.d('logOut', 'profile_dropdown'), true);
  const [opening] = navigations;
  assert.equal(opening.path, '/auth/logout');
  assert.equal(opening.state.intent, 'confirm-browser-logout');
  assert.equal(opening.state.location, profileLocation);
  assert.equal(getSiteSignOutPageUrl(home).href, home + 'auth/logout');

  const order = [];
  const signOut = createSiteSignOutController({
    home: () => home,
    prepare: async () => { order.push('sync and stop active work'); },
    clearSiteAccount: () => order.push('clear site account'),
    clearNativeSession: () => order.push('clear native session'),
  });
  const confirm = nativeConfirmationAdapter(signOut, () => order.push('mark original browser signed out'));
  const result = await confirm(() => order.push('original logout cleanup'), origin + '/logout');
  assert.deepEqual(result, { ok: true, url: signedOut });
  assert.deepEqual(order, [
    'sync and stop active work', 'clear site account', 'clear native session',
    'mark original browser signed out', 'original logout cleanup',
  ]);
});

test('direct saved logout URLs and in-app root links are scoped to this application', () => {
  for (const path of ['logout', 'auth/logout/', 'signout', 'auth/signout', 'api/auth/signout']) {
    assert.equal(isSiteSignOutPage(home + path + '?next=https://untrusted.invalid/', home), true);
    assert.equal(isNativeSignOutLink('/' + path, conversation, home), true);
    assert.equal(isNativeSignOutLink(home + path, conversation, home), true);
    assert.equal(isSiteSignOutPage(origin + '/' + path, home), true);
  }
  assert.equal(isNativeSignOutLink('https://chatgpt.com/auth/logout', conversation, home), true);
  for (const url of [
    origin + '/other-project/logout', origin + '/chatgpt-sibling/logout',
    origin + '/chatgpt/c/logout', 'https://untrusted.invalid/logout',
    'https://user:pass@tycofficial.github.io/chatgpt/logout',
  ]) {
    assert.equal(isNativeSignOutLink(url, conversation, home), false);
    assert.equal(isSiteSignOutPage(url, home), false);
  }
  assert.equal(isNativeSignOutLink('/logout', origin + '/some-other-project/', home), false);
  const baseWithoutSlash = home.slice(0, -1);
  assert.equal(getSiteSignOutPageUrl(baseWithoutSlash).href, home + 'auth/logout');
  assert.equal(getSiteSignedOutUrl(baseWithoutSlash + '?next=/logout#old'), signedOut);
});

test('historical pages and cached auth aliases recover when the router supplies the origin root', async () => {
  const uninitialized = origin + '/?legacy=1#router';
  assert.equal(getSiteSignOutPageUrl(uninitialized).href, home + 'auth/logout');
  assert.equal(getSiteSignedOutUrl(uninitialized), signedOut);
  for (const path of ['c/neutral-fixture', 'work/neutral-fixture', 'dots/neutral-fixture']) {
    const current = origin + '/' + path;
    assert.equal(isNativeSignOutLink('/auth/logout', current, uninitialized), true);
    assert.equal(isNativeSignOutLink('auth/logout/index.html?legacy=1', current, uninitialized), true);
  }
  assert.equal(isSiteSignOutPage(origin + '/auth/logout/index.html', uninitialized), true);
  assert.equal(isSiteSignOutPage(origin + '/other-project/auth/logout/index.html', uninitialized), false);
  assert.equal(getSiteAuthEntryKind('/auth/signup/index.html', home), 'signup');
  assert.equal(getSiteAuthEntryKind('/other-project/signup', home), null);

  const destinations = [];
  const controller = createSiteSignOutController({
    home: () => uninitialized,
    clearSiteAccount() {},
    clearNativeSession() {},
    navigate: url => destinations.push(url),
  });
  await controller.navigateAfterSignOut();
  assert.deepEqual(destinations, [signedOut]);
});

test('only persisted legacy account-switch logout pages suppress the archived origin-root redirect', () => {
  const scope = new EventTarget();
  const redirects = [];
  let nativeEvents = 0;
  scope.location = { href: '', replace: url => redirects.push(url) };
  scope.history = { state: null };
  const dispose = installSiteSignOutRestore({ home: () => home, scope });
  scope.addEventListener('pageshow', () => nativeEvents++);
  const show = (href, persisted, state = null) => {
    scope.location.href = href;
    scope.history.state = state;
    scope.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }));
  };

  show(home + 'auth/logout?account_switch_action=resume', false);
  show(home + 'c/neutral-fixture?account_switch_action=logout', true);
  show(home + 'auth/logout', true, { usr: { intent: 'confirm-browser-logout' } });
  show(home + 'auth/logout?account_switch_action=logout', true, { usr: 'complete-browser-logout' });
  show(origin + '/other-project/auth/logout?account_switch_action=resume', true);
  assert.equal(nativeEvents, 5);
  assert.deepEqual(redirects, []);

  show(home + 'auth/logout?account_switch_action=resume', true);
  show(home + 'auth/logout?account_switch_action=logout', true);
  assert.equal(nativeEvents, 5);
  assert.deepEqual(redirects, [home, home]);
  dispose();
  show(home + 'auth/logout?account_switch_action=resume', true);
  assert.equal(nativeEvents, 6);
});

test('the native cancel action replaces only an origin-root navigation on the legacy account-switch logout route', async () => {
  const scope = new EventTarget();
  scope.navigation = new EventTarget();
  const redirects = [];
  scope.location = { href: home + 'auth/logout?account_switch_action=resume', replace: url => redirects.push(url) };
  const dispose = installSiteSignOutRestore({ home: () => home, scope });
  const navigate = (url, navigationType = 'replace', cancelable = true) => scope.navigation.dispatchEvent(Object.assign(
    new Event('navigate', { cancelable }), { destination: { url }, navigationType },
  ));

  assert.equal(navigate(origin + '/', 'traverse'), true);
  assert.equal(navigate(origin + '/', 'replace', false), true);
  assert.equal(navigate(origin + '/another-project/'), true);
  assert.equal(navigate(signedOut), true);
  assert.equal(navigate(origin + '/'), false);
  await Promise.resolve();
  assert.deepEqual(redirects, [home]);

  scope.location.href = home + 'auth/logout';
  assert.equal(navigate(origin + '/'), true);
  scope.location.href = home + 'work/neutral-fixture?account_switch_action=resume';
  assert.equal(navigate(origin + '/'), true);
  dispose();
  scope.location.href = home + 'auth/logout?account_switch_action=resume';
  assert.equal(navigate(origin + '/'), true);
  await Promise.resolve();
  assert.deepEqual(redirects, [home]);
});

test('failed sync cannot retain an account or follow the supplied native callback URL', async () => {
  const events = [];
  let localAccount = { role: 'administrator', authenticationMode: 'offline-administrator' };
  let nativeSession = true;
  const signOut = createSiteSignOutController({
    home: () => home,
    prepare: () => { events.push('attempt prepare'); throw Error('Fixture offline'); },
    clearSiteAccount: () => { localAccount = null; events.push('cleared offline account'); },
    clearNativeSession: () => { nativeSession = false; events.push('cleared native session'); },
    navigate: url => events.push(url),
  });
  const confirm = createNativeSiteSignOut({
    complete: signOut.complete,
    markBrowserSignedOut: () => { throw Error('Fixture storage blocked'); },
  });
  const [result] = await Promise.all([
    confirm(() => { throw Error('Fixture native cleanup rejected'); }, 'https://untrusted.invalid/logout'),
    signOut.navigateAfterSignOut(),
    signOut.navigateAfterSignOut(),
  ]);
  assert.deepEqual(result, { ok: true, url: signedOut });
  assert.equal(localAccount, null);
  assert.equal(nativeSession, false);
  assert.deepEqual(events, ['attempt prepare', 'cleared offline account', 'cleared native session', signedOut]);
});

test('the logout deadline aborts pending work and a canceled confirmation never clears the account', async () => {
  let prepareSignal;
  let clears = 0;
  const signOut = createSiteSignOutController({
    home: () => home,
    prepare: signal => { prepareSignal = signal; return new Promise(() => {}); },
    clearSiteAccount: () => { clears++; },
    clearNativeSession: () => {},
    timeoutMs: 10,
  });
  const confirm = createNativeSiteSignOut({ complete: signOut.complete });
  assert.deepEqual(await confirm(null, null, AbortSignal.abort()), { ok: false });
  assert.equal(clears, 0);
  assert.equal(prepareSignal, undefined);
  assert.equal(await signOut.complete(), signedOut);
  assert.equal(prepareSignal.aborted, true);
  assert.equal(clears, 1);
});

test('losing the local identity during native logout confirmation preserves that route', () => {
  const source = fs.readFileSync(new URL('../src/native-client/boot-adapter.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('let siteLoginRedirecting = false;');
  const end = source.indexOf("\noverrideExports('QdUF',", start);
  assert.ok(start >= 0 && end > start);
  let localIdentity = true;
  let currentUrl = new URL('auth/logout?logout_navigation=fixture', home);
  const navigations = [];
  const { redirectToSiteLogin, maybeRedirectToSiteLogin } = vm.runInNewContext(
    source.slice(start, end) + '\n;({ redirectToSiteLogin, maybeRedirectToSiteLogin })', {
      location: {
        get href() { return currentUrl.href; },
        get origin() { return currentUrl.origin; },
        get pathname() { return currentUrl.pathname; },
        get search() { return currentUrl.search; },
        get hash() { return currentUrl.hash; },
        assign: href => navigations.push(new URL(href)),
      },
      getSiteLoginUrl: () => new URL('login', home),
      getSiteHomeUrl: () => new URL(home),
      isPrototypeLocalSession: () => localIdentity,
      isSiteSignOutPage,
      URL,
    },
  );
  assert.equal(maybeRedirectToSiteLogin(), false);
  localIdentity = false;
  assert.equal(maybeRedirectToSiteLogin(), false);
  redirectToSiteLogin();
  assert.deepEqual(navigations, []);

  currentUrl = new URL('codex?project=fixture#tools', home);
  assert.equal(maybeRedirectToSiteLogin(), true);
  assert.equal(navigations[0].pathname, '/chatgpt/login');
  assert.equal(navigations[0].searchParams.get('next'), '/chatgpt/codex?project=fixture#tools');
});

test('the root retains its trailing slash when the native router replaces history', () => {
  const scope = new EventTarget();
  const calls = [];
  const original = function (state, title, url) { calls.push({ receiver: this, state, title, url }); };
  scope.history = { replaceState: original };
  scope.location = { href: home };
  const dispose = installSiteSignOutRestore({ home: () => home, scope });
  const state = { idx: 1, usr: 'fixture' };
  scope.history.replaceState(state, '', '/chatgpt?test=1#fixture');
  assert.deepEqual(calls.pop(), { receiver: scope.history, state, title: '', url: home + '?test=1#fixture' });
  for (const url of [null, '/chatgpt/c/fixture', '/chatgpt-sibling', 'https://example.invalid/chatgpt']) {
    scope.history.replaceState(state, '', url);
    assert.equal(calls.pop().url, url);
  }
  scope.location.href = home + 'codex';
  scope.history.replaceState(state, '', '/chatgpt');
  assert.equal(calls.pop().url, '/chatgpt');
  dispose();
  assert.equal(scope.history.replaceState, original);
});
