import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mutation, nativeDocument, save, syncFixture } from './chat-sync-fixture.mjs';

const day = 24 * 60 * 60 * 1000;
const trialPath = '/auth/site-trial';
const claim = (fixture, token, tier, extra = {}) =>
  fixture.call(trialPath, { method: 'POST', token, body: { tier, ...extra } });
const login = fixture => fixture.call('/auth/login', {
  method: 'POST', body: { username: 'NeutralAlice', password: 'Neutral-Free-Only' },
});

test('manual renewal opens at most 30 days and login and sync survive expiration', async t => {
  let now = Date.UTC(2026, 10, 20);
  t.mock.method(Date, 'now', () => now);
  const fixture = await syncFixture();
  const { DB, call, alice } = fixture;
  t.after(() => DB.raw.close());
  assert.equal(alice.user.planType, 'free');
  assert.equal(alice.user.siteTrial, null);
  const document = nativeDocument();
  assert.equal((await save(fixture, alice, document.id, mutation(document))).status, 200);

  const first = await claim(fixture, alice.token, 'plus');
  assert.equal(first.status, 200);
  const started = await first.json();
  assert.equal(started.expiresAt, alice.expiresAt);
  assert.deepEqual(started.user, { ...alice.user, planType: 'plus', siteTrial: { tier: 'plus', expiresAt: now + 30 * day } });
  assert.deepEqual(await (await claim(fixture, alice.token, 'plus')).json(), started);

  now += 10 * day;
  const renewal = await (await claim(fixture, alice.token, 'plus')).json();
  assert.deepEqual(renewal.user.siteTrial, { tier: 'plus', expiresAt: now + 30 * day });
  assert.equal(renewal.expiresAt, alice.expiresAt);
  assert.deepEqual((await (await login(fixture)).json()).user, renewal.user);

  now = renewal.user.siteTrial.expiresAt - 1;
  const recentLogin = await (await login(fixture)).json();
  assert.deepEqual(recentLogin.user, renewal.user);
  now++;
  const expired = await (await call('/auth/session', { token: recentLogin.token })).json();
  assert.deepEqual(expired.user, alice.user);
  assert.equal((await (await login(fixture)).json()).user.planType, 'free');

  const restored = await (await call('/sync/conversations/' + document.id, { token: recentLogin.token })).json();
  assert.deepEqual(restored.document, document);
  const next = await (await claim(fixture, recentLogin.token, 'pro')).json();
  assert.deepEqual(next.user, { ...alice.user, planType: 'pro', siteTrial: { tier: 'pro', expiresAt: now + 30 * day } });
  assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM site_trials').get().n, 1);
});

test('switching and concurrent claims retain one server-authoritative trial for its account', async t => {
  const now = Date.UTC(2026, 10, 20);
  t.mock.method(Date, 'now', () => now);
  const fixture = await syncFixture();
  const { DB, call, alice, bob } = fixture;
  t.after(() => DB.raw.close());

  const tiers = [['plus', 'plus'], ['prolite', 'pro'], ['pro', 'pro'], ['promax', 'pro']];
  const requests = await Promise.all(tiers.map(([tier]) => claim(fixture, alice.token, tier, {
    accountId: bob.user.accountId, expiresAt: now + 365 * day, planType: 'administrator',
  })));
  for (const [index, response] of requests.entries()) {
    assert.equal(response.status, 200);
    const [tier, planType] = tiers[index];
    const { user, expiresAt } = await response.json();
    assert.deepEqual(user, { ...alice.user, planType, siteTrial: { tier, expiresAt: now + 30 * day } });
    assert.equal(expiresAt, alice.expiresAt);
  }
  const allTrials = DB.raw.prepare('SELECT user_id,tier,expires_at FROM site_trials').all();
  assert.equal(allTrials.length, 1);
  assert.equal(allTrials[0].user_id, alice.user.accountId);
  const aliceSession = await (await call('/auth/session', { token: alice.token })).json();
  assert.deepEqual(aliceSession.user.siteTrial, { tier: allTrials[0].tier, expiresAt: allTrials[0].expires_at });
  assert.deepEqual((await (await call('/auth/session', { token: bob.token })).json()).user, bob.user);
  assert.equal((await call('/bridge/pair', { method: 'POST', token: alice.token, body: {} })).status, 403);
  assert.equal((await call('/usage', { token: alice.token })).status, 403);
});

test('trial endpoint checks session role, method and exact tier', async t => {
  const { DB, call, alice, admin } = await syncFixture();
  t.after(() => DB.raw.close());
  const unauthenticated = await call(trialPath, { method: 'POST', body: { tier: 'plus' } });
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error.code, 'SITE_AUTH_REQUIRED');
  const forbidden = await call(trialPath, { method: 'POST', token: admin.token, body: { tier: 'plus' } });
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, 'SITE_TRIAL_USER_REQUIRED');
  const adminSession = await (await call('/auth/session', { token: admin.token })).json();
  assert.deepEqual(adminSession, { user: admin.user, expiresAt: admin.expiresAt });
  assert.equal(Object.hasOwn(adminSession.user, 'siteTrial'), false);

  const get = await call(trialPath, { token: alice.token });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  for (const body of [{}, { tier: 'free' }, { tier: 'Plus' }, { tier: ['plus'] }, { tier: '__proto__' }, null]) {
    const rejected = await call(trialPath, { method: 'POST', token: alice.token, body });
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).error.code, 'INVALID_SITE_TRIAL_TIER');
  }
  assert.equal((await call(trialPath, { method: 'POST', token: alice.token, rawBody: '{' })).status, 400);
  assert.equal((await call('/auth/logout', { method: 'POST', token: alice.token })).status, 200);
  assert.equal((await call(trialPath, { method: 'POST', token: alice.token, body: { tier: 'plus' } })).status, 401);
  assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM site_trials').get().n, 0);
});

test('trial migration preserves existing account, session, and synchronized history data', async t => {
  const fixture = await syncFixture();
  const { DB, call, alice } = fixture;
  t.after(() => DB.raw.close());
  const document = nativeDocument();
  assert.equal((await save(fixture, alice, document.id, mutation(document))).status, 200);
  DB.raw.exec('DROP TABLE site_trials');
  DB.raw.exec(fs.readFileSync(new URL('../drizzle/0004_site_trials.sql', import.meta.url), 'utf8'));
  const session = await (await call('/auth/session', { token: alice.token })).json();
  assert.deepEqual(session, { user: alice.user, expiresAt: alice.expiresAt });
  const restored = await (await call('/sync/conversations/' + document.id, { token: alice.token })).json();
  assert.deepEqual(restored.document, document);
  assert.equal((await claim(fixture, alice.token, 'promax')).status, 200);
});
