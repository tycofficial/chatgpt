import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeSiteLoginRoute } from '../src/native-client/native-site-login.mjs';

const origin = 'https://fixture.example';
const home = origin + '/chatgpt/';

function renderRoute(t, next) {
  const previousLocation = globalThis.location;
  const previousEnvironment = globalThis.__CHATGPT_REPLICA_ENV__;
  const parameters = new URLSearchParams(next === undefined ? {} : { next, provider: 'fixture', screen_hint: 'fixture' });
  const search = parameters.size ? '?' + parameters : '';
  const navigations = [];
  globalThis.location = { origin, replace: value => navigations.push(value) };
  globalThis.__CHATGPT_REPLICA_ENV__ = { basePath: '/chatgpt/' };
  t.after(() => {
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousEnvironment === undefined) delete globalThis.__CHATGPT_REPLICA_ENV__;
    else globalThis.__CHATGPT_REPLICA_ENV__ = previousEnvironment;
  });
  let effect;
  const Login = createNativeSiteLoginRoute({
    useLocation: () => ({ pathname: '/auth/login', search }),
    useEffect: callback => { effect = callback; },
  });
  assert.equal(Login(), null);
  assert.equal(navigations.length, 0);
  effect();
  assert.equal(navigations.length, 1);
  return new URL(navigations[0]);
}

test('native login redirects to the site login document and keeps its safe pricing return', t => {
  const target = renderRoute(t, '/chatgpt?locale=zh-CN&localSession=0#pricing');
  assert.equal(target.pathname, '/chatgpt/login');
  assert.equal(target.searchParams.get('next'), home + '?locale=zh-CN#pricing');
  assert.deepEqual([...target.searchParams.keys()], ['next']);
});

test('native login uses the application home for an external or neighboring project return', async t => {
  for (const next of ['https://third-party.invalid/#pricing', '/other-site/#pricing', '/logout']) {
    await t.test(next, context => {
      const target = renderRoute(context, next);
      assert.equal(target.origin + target.pathname, home + 'login');
      assert.equal(target.searchParams.get('next'), home);
    });
  }
});

test('native login without a return parameter uses the clean site login URL', t => {
  assert.equal(renderRoute(t).href, home + 'login');
});
