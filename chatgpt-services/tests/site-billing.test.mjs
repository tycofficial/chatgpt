import assert from 'node:assert/strict';
import test from 'node:test';
import {createHmac} from 'node:crypto';
import worker from '../worker/service.mjs';
import {sqliteD1} from './fixture-db.mjs';

const apiKey = 'sk_test_LocalFixtureOnly';
const secret = 'whsec_LocalFixtureOnly';
const site = 'https://tycofficial.github.io';
const firstPrice = 'price_fixture_plus';
const proPrice = 'price_fixture_pro';
const subscriptionId = 'sub_fixture_first';
const itemId = 'si_fixture_main';
const nowSeconds = () => Math.floor(Date.now() / 1000);

function testSite({ enabled = true } = {}) {
  const DB = sqliteD1();
  const env = {
    DB,
    ...(enabled && {
      SITE_STRIPE_SECRET_KEY: apiKey,
      SITE_STRIPE_WEBHOOK_SECRET: secret,
      SITE_STRIPE_PRICES: JSON.stringify({ plus: firstPrice, pro: proPrice }),
    }),
  };
  const call = (path, { method = 'GET', token, body, headers } = {}) => worker.fetch(new Request('https://fixture.test' + path, {
    method,
    headers: {
      Origin: site,
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  }), env);
  const register = async username => {
    const response = await call('/auth/register', { method: 'POST', body: { username, password: 'Fixture-only-password' } });
    assert.equal(response.status, 200);
    return response.json();
  };
  const sendEvent = (event, { key = secret, timestamp = nowSeconds() } = {}) => {
    const body = JSON.stringify(event);
    const signature = createHmac('sha256', key).update(timestamp + '.' + body).digest('hex');
    return call('/billing/v1/webhook', {
      method: 'POST', body, headers: { 'stripe-signature': 't=' + timestamp + ',v1=' + signature },
    });
  };
  return { DB, env, call, register, sendEvent };
}

test('unconfigured payments preserve account and trial paths without accepting checkout', async () => {
  const { call, register, DB } = testSite({ enabled: false });
  const options = await call('/billing/v1/options');
  assert.equal(options.headers.get('access-control-allow-origin'), site);
  assert.deepEqual(await options.json(), { tiers: [], checkoutAvailable: false });
  const { token } = await register('bill_disabled');
  assert.equal((await call('/billing/v1/checkout', { method: 'POST', token, body: { tier: 'plus' } })).status, 503);
  const trial = await call('/auth/site-trial', { method: 'POST', token, body: { tier: 'plus' } });
  assert.equal((await trial.json()).user.planType, 'plus');
  assert.equal(DB.raw.prepare('SELECT COUNT(*) AS count FROM site_billing_checkouts').get().count, 0);
});

test('checkout is tied to the account and durable paid receipts survive login, retries, renewal and cancellation', async t => {
  const { call, register, sendEvent, DB, env } = testSite();
  const { token, user } = await register('bill_primary');
  const second = await register('bill_secondary');
  const customerId = 'cus_fixture_primary';
  const sessionId = 'cs_test_fixture_first';
  const vendorCalls = [];
  let snapshot, attempt;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const destination = new URL(url);
    assert.equal(destination.origin, 'https://api.stripe.com');
    assert.equal(options.headers.Authorization, 'Bearer ' + apiKey);
    assert.equal(options.headers['Stripe-Version'], '2024-06-20');
    const path = destination.pathname, args = options.body;
    vendorCalls.push({ path, key: options.headers['Idempotency-Key'] });
    if (path === '/v1/customers') {
      assert.equal(args.get('metadata[site_user_id]'), user.accountId);
      return Response.json({ id: customerId, metadata: { site_user_id: user.accountId }, livemode: false });
    }
    if (path === '/v1/subscriptions') {
      assert.equal(destination.searchParams.get('customer'), customerId);
      return Response.json({ data: [], has_more: false });
    }
    if (path === '/v1/checkout/sessions/' + sessionId + '/expire') {
      return Response.json({ error: 'Fixture prior payment is settling' }, { status: 400 });
    }
    if (path === '/v1/checkout/sessions') {
      assert.equal(args.get('mode'), 'subscription');
      assert.equal(args.get('customer'), customerId);
      assert.equal(args.get('line_items[0][price]'), firstPrice);
      assert.equal(args.get('subscription_data[metadata][site_user_id]'), user.accountId);
      assert.equal(args.get('success_url'), site + '/chatgpt/?site_billing=return#pricing');
      assert.ok(+args.get('expires_at') > nowSeconds());
      attempt = args.get('client_reference_id');
      return Response.json({ id: sessionId, status: 'open', customer: customerId, client_reference_id: attempt,
        url: 'https://checkout.stripe.com/c/pay/cs_test_fixture_first', livemode: false });
    }
    if (path === '/v1/billing_portal/sessions') {
      assert.equal(args.get('customer'), customerId);
      assert.equal(args.get('return_url'), site + '/chatgpt/?site_billing=return#pricing');
      return Response.json({ customer: customerId, url: 'https://billing.stripe.com/p/session/fixture', livemode: false });
    }
    if (path === '/v1/subscriptions/' + subscriptionId) {
      assert.deepEqual(destination.searchParams.getAll('expand[]'), ['latest_invoice']);
      return Response.json(snapshot);
    }
    assert.fail('Unexpected fixture Stripe path ' + path);
  });
  const options = await call('/billing/v1/options');
  assert.deepEqual(await options.json(), { tiers: ['plus', 'pro'], checkoutAvailable: true });
  assert.equal((await call('/billing/v1/checkout', { method: 'POST', body: { tier: 'plus' } })).status, 401);
  assert.equal((await call('/billing/v1/checkout', { method: 'POST', token, body: { tier: 'bad' } })).status, 400);
  assert.equal(vendorCalls.length, 0);

  const portalReq = token => call('/billing/v1/portal', { method: 'POST', token });
  const purchase = tier => call('/billing/v1/checkout', { method: 'POST', token, body: { tier } });
  const account = token => call('/auth/session', { token }).then(response => response.json()).then(result => result.user);
  const t0 = nowSeconds();
  const events = (id, type, object, created = t0) => ({ id: 'evt_fixture_' + id, type, data: { object }, created, livemode: false });
  assert.equal((await portalReq(second.token)).status, 404);
  const [first, retry] = await Promise.all([purchase('plus'), purchase('plus')]);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), await retry.json());
  const checkoutCalls = vendorCalls.filter(({ path }) => path === '/v1/checkout/sessions');
  assert.equal(new Set(checkoutCalls.map(({ key }) => key)).size, 1);
  assert.ok(checkoutCalls[0].key.endsWith(attempt));
  assert.equal(DB.raw.prepare('SELECT COUNT(*) AS count FROM site_billing_checkouts').get().count, 1);
  assert.equal((await purchase('pro')).status, 409);
  assert.equal((await account(token)).planType, 'free');

  const completion = events('completed', 'checkout.session.completed', { id: sessionId, customer: customerId, subscription: subscriptionId, client_reference_id: attempt });
  const nextPeriod = t0 + 31 * 86400;
  function stripeSnapshot(status, invoiceStatus, end = nextPeriod, price = firstPrice, cancel = false) {
    return {
      id: subscriptionId, customer: customerId, metadata: { site_user_id: user.accountId }, status, livemode: false,
      current_period_end: end, cancel_at_period_end: cancel,
      items: { data: [{ id: itemId, price: { id: price } }] },
      latest_invoice: { status: invoiceStatus, subscription: subscriptionId,
        lines: { data: [{ subscription_item: itemId, price: { id: price }, period: { end } }] } },
    };
  }
  snapshot = stripeSnapshot('active', 'paid');
  assert.equal((await sendEvent(completion, { key: 'wrong' })).status, 400);
  assert.equal((await sendEvent(completion, { timestamp: t0 - 600 })).status, 400);
  assert.equal((await sendEvent({ ...completion, livemode: true })).status, 400);
  assert.equal((await account(token)).planType, 'free');
  assert.equal((await sendEvent(completion)).status, 200);
  assert.equal((await sendEvent(completion)).status, 200);
  assert.equal(vendorCalls.filter(({ path }) => path.includes('/v1/subscriptions/')).length, 1);

  const login = await call('/auth/login', { method: 'POST', body: { username: 'bill_primary', password: 'Fixture-only-password' } });
  assert.equal(login.status, 200);
  assert.deepEqual((await login.json()).user.siteSubscription, {
    tier: 'plus', expiresAt: nextPeriod * 1000, cancelAtPeriodEnd: false,
  });
  assert.equal((await account(second.token)).planType, 'free');
  env.SITE_STRIPE_SECRET_KEY = 'sk_live_NotUsedInFixture';
  assert.equal((await account(token)).planType, 'free');
  assert.equal((await sendEvent(completion)).status, 400);
  env.SITE_STRIPE_SECRET_KEY = apiKey;
  assert.equal((await purchase('plus')).status, 409);
  assert.equal((await call('/auth/site-trial', { method: 'POST', token, body: { tier: 'pro' } })).status, 409);
  assert.equal((await portalReq(token)).status, 200);
  assert.equal((await portalReq(second.token)).status, 404);
  const inference = await call('/inference/v1/responses', { method: 'POST', token, body: {} });
  assert.equal((await inference.json()).error.code, 'DOCODE_NOT_CONFIGURED');

  const renewed = nextPeriod + 31 * 86400;
  snapshot = stripeSnapshot('past_due', 'open', renewed);
  assert.equal((await sendEvent(events('unpaid', 'invoice.payment_failed', { subscription: subscriptionId }, t0 + 1))).status, 200);
  assert.equal((await account(token)).siteSubscription.expiresAt, nextPeriod * 1000);

  snapshot = stripeSnapshot('active', 'paid', renewed, proPrice, true);
  assert.equal((await sendEvent(events('renewal', 'invoice.paid', {
    parent: { subscription_details: { subscription: subscriptionId } },
  }, t0 + 2))).status, 200);
  assert.equal((await account(token)).planType, 'pro');
  assert.deepEqual((await account(token)).siteSubscription, { tier: 'pro', expiresAt: renewed * 1000, cancelAtPeriodEnd: true });

  snapshot = stripeSnapshot('past_due', 'open', nextPeriod);
  assert.equal((await sendEvent(events('old', 'customer.subscription.updated', { id: subscriptionId }, t0 + 1))).status, 200);
  assert.equal((await account(token)).siteSubscription.tier, 'pro');

  snapshot = stripeSnapshot('canceled', 'paid', renewed, proPrice);
  assert.equal((await sendEvent(events('canceled', 'customer.subscription.deleted', { id: subscriptionId }, t0 + 3))).status, 200);
  assert.equal((await account(token)).siteSubscription, null);
  assert.equal((await account(token)).planType, 'free');
});

test('plan changes expire the old unpaid Checkout and a delayed paid webhook cannot create a second subscription', async t => {
  const { register, call, sendEvent, DB } = testSite();
  const owner = await register('bill_plan_change');
  const customer = 'cus_fixture_switch';
  const sessions = new Map();
  let knownSubscriptions = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const target = new URL(url), path = target.pathname;
    assert.equal(target.origin, 'https://api.stripe.com');
    if (path === '/v1/customers') {
      return Response.json({ id: customer, metadata: { site_user_id: owner.user.accountId } });
    }
    if (path === '/v1/subscriptions') {
      assert.equal(target.searchParams.get('customer'), customer);
      return Response.json({ data: knownSubscriptions, has_more: false });
    }
    if (path === '/v1/checkout/sessions') {
      const args = options.body;
      const id = 'cs_test_switch_' + String(sessions.size + 1);
      const record = {
        id, status: 'open', customer, client_reference_id: args.get('client_reference_id'),
        url: 'https://checkout.stripe.com/c/pay/' + id,
      };
      sessions.set(id, record);
      return Response.json(record);
    }
    const expire = /^\/v1\/checkout\/sessions\/(cs_test_switch_\d+)\/expire$/.exec(path);
    if (expire) {
      const record = sessions.get(expire[1]);
      assert.equal(record.status, 'open');
      record.status = 'expired';
      return Response.json(record);
    }
    assert.fail('Unexpected fixture Stripe path ' + path);
  });
  const choose = tier => call('/billing/v1/checkout', { method: 'POST', token: owner.token, body: { tier } });
  const plus = await choose('plus');
  assert.equal(plus.status, 200);
  const pro = await choose('pro');
  assert.equal(pro.status, 200);
  const [closed, open] = [...sessions.values()];
  assert.equal(closed.status, 'expired');
  assert.equal(open.status, 'open');
  assert.deepEqual(await pro.json(), { url: open.url });
  const event = await sendEvent({
    id: 'evt_fixture_late_expiry', created: nowSeconds(), livemode: false,
    type: 'checkout.session.expired', data: { object: closed },
  });
  assert.equal(event.status, 200);
  assert.equal(DB.raw.prepare('SELECT checkout_url FROM site_billing_checkouts').get().checkout_url, open.url);

  DB.raw.exec('UPDATE site_billing_checkouts SET expires_at=0');
  knownSubscriptions = [{ id: subscriptionId, status: 'active' }];
  assert.equal((await choose('plus')).status, 409);
  assert.equal(sessions.size, 2);
});

test('a signed paid Go checkout projects the correct ongoing account without creating a Go trial', async t => {
  const { DB, env, call, register, sendEvent } = testSite();
  t.after(() => DB.raw.close());
  const goPrice = 'price_fixture_go';
  env.SITE_STRIPE_PRICES = JSON.stringify({ go: goPrice, plus: firstPrice, pro: proPrice });
  const owner = await register('bill_go_owner');
  const other = await register('bill_go_other');
  const account = async token => (await (await call('/auth/session', { token })).json()).user;
  const options = await call('/billing/v1/options');
  assert.deepEqual(await options.json(), { tiers: ['go', 'plus', 'pro'], checkoutAvailable: true });
  const trial = await call('/auth/site-trial', { method: 'POST', token: owner.token, body: { tier: 'go' } });
  assert.equal(trial.status, 400);
  assert.equal((await trial.json()).error.code, 'INVALID_SITE_TRIAL_TIER');
  assert.equal(DB.raw.prepare('SELECT COUNT(*) AS count FROM site_trials').get().count, 0);

  const customer = 'cus_fixture_go_owner';
  const session = 'cs_test_fixture_go';
  const subscription = 'sub_fixture_go';
  const price = { id: goPrice };
  const expires = nowSeconds() + 30 * 86400;
  let attempt;
  const stripe = t.mock.method(globalThis, 'fetch', async (url, request) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://api.stripe.com');
    assert.equal(request.headers.Authorization, 'Bearer ' + apiKey);
    if (target.pathname === '/v1/customers') {
      assert.equal(request.body.get('metadata[site_user_id]'), owner.user.accountId);
      return Response.json({ id: customer, livemode: false, metadata: { site_user_id: owner.user.accountId } });
    }
    if (target.pathname === '/v1/subscriptions') return Response.json({ data: [], has_more: false });
    if (target.pathname === '/v1/checkout/sessions') {
      assert.equal(request.body.get('mode'), 'subscription');
      assert.equal(request.body.get('line_items[0][price]'), goPrice);
      assert.equal(request.body.get('customer'), customer);
      attempt = request.body.get('client_reference_id');
      return Response.json({ id: session, customer, client_reference_id: attempt, status: 'open', livemode: false,
        url: 'https://checkout.stripe.com/c/pay/' + session });
    }
    assert.equal(target.pathname, '/v1/subscriptions/' + subscription);
    return Response.json({ id: subscription, customer, livemode: false, status: 'active', current_period_end: expires,
      metadata: { site_user_id: owner.user.accountId }, cancel_at_period_end: true, items: { data: [{ id: itemId, price }] },
      latest_invoice: { status: 'paid', subscription, lines: { data: [{ subscription_item: itemId, price, period: { end: expires } }] } } });
  });
  const checkout = await call('/billing/v1/checkout', { method: 'POST', token: owner.token, body: { tier: 'go' } });
  assert.equal(checkout.status, 200);
  assert.equal((await checkout.json()).url, 'https://checkout.stripe.com/c/pay/' + session);
  assert.equal((await account(owner.token)).planType, 'free');
  const event = { id: 'evt_fixture_go_paid', type: 'checkout.session.completed', created: nowSeconds(), livemode: false,
    data: { object: { id: session, customer, subscription, client_reference_id: attempt } } };
  assert.equal((await sendEvent(event, { key: 'wrong' })).status, 400);
  assert.equal((await account(owner.token)).planType, 'free');
  assert.equal((await sendEvent(event)).status, 200);
  assert.equal((await sendEvent(event)).status, 200);
  assert.equal(stripe.mock.calls.filter(({ arguments: [url] }) => new URL(url).pathname === '/v1/subscriptions/' + subscription).length, 1);

  const login = await call('/auth/login', { method: 'POST', body: { username: owner.user.username, password: 'Fixture-only-password' } });
  assert.equal(login.status, 200);
  const fresh = await login.json();
  assert.notEqual(fresh.token, owner.token);
  assert.equal(fresh.user.id, owner.user.id);
  assert.equal(fresh.user.planType, 'go');
  assert.equal(fresh.user.siteTrial, null);
  assert.deepEqual(fresh.user.siteSubscription, { tier: 'go', expiresAt: expires * 1000, cancelAtPeriodEnd: true });
  assert.equal((await account(other.token)).planType, 'free');
  assert.equal((await call('/auth/site-trial', { method: 'POST', token: fresh.token, body: { tier: 'plus' } })).status, 409);

  const addTier = DB.raw.prepare("INSERT INTO site_billing_subscriptions VALUES (?,?,?,?,'active',?,0,?,?)");
  addTier.run(subscription, 1, other.user.accountId, 'promax', (expires + 60) * 1000, nowSeconds(), Date.now());
  assert.deepEqual(await account(fresh.token), fresh.user);
  addTier.run('sub_fixture_go_plus', 0, owner.user.accountId, 'plus', (expires - 60) * 1000, nowSeconds(), Date.now());
  assert.equal((await account(fresh.token)).siteSubscription.tier, 'plus');
  addTier.run('sub_fixture_go_pro', 0, owner.user.accountId, 'pro', (expires - 120) * 1000, nowSeconds(), Date.now());
  assert.equal((await account(fresh.token)).siteSubscription.tier, 'pro');
  DB.raw.prepare("UPDATE site_billing_subscriptions SET paid_through=0 WHERE user_id=? AND tier IN ('plus','pro')").run(owner.user.accountId);
  assert.deepEqual(await account(fresh.token), fresh.user);
});
