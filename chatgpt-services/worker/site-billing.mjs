const origin = 'https://tycofficial.github.io/chatgpt/';
const prefix = '/billing/v1/';
const planTypes = new Map([
  ['go', 'go'], ['plus', 'plus'], ['prolite', 'pro'], ['pro', 'pro'], ['promax', 'pro'],
]);
export const getPaidSitePlan = tier => planTypes.get(tier) ?? null;
const checkoutLifetime = 20 * 60 * 60;
const signatureTolerance = 300;
const maxBodyBytes = 256 * 1024;
const stripeVersion = '2024-06-20';
const encoder = new TextEncoder();
const validId = (value, prefix) => typeof value === 'string' && value.startsWith(prefix) && /^[A-Za-z0-9_]{7,160}$/.test(value);
const query = (env, sql, ...params) => env.DB.prepare(sql).bind(...params);
const respond = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const error = (status, code, message) => respond({ error: { code, message } }, status);
const conflict = message => error(409, 'SITE_BILLING_IN_PROGRESS', message);
const unavailable = () => error(503, 'SITE_BILLING_UNAVAILABLE', '本站支付服务暂时不可用，请稍后再试。');

export const paidSubscriptionColumns = 'b.tier AS paid_tier, b.paid_through, b.cancel_at_period_end';
export const paidSubscriptionJoin = `LEFT JOIN site_billing_subscriptions b ON b.rowid=(
  SELECT lease.rowid FROM site_billing_subscriptions lease
  WHERE lease.user_id=u.id AND lease.livemode=? AND lease.status IN ('active','past_due') AND lease.paid_through > ?
  ORDER BY CASE lease.tier WHEN 'promax' THEN 5 WHEN 'pro' THEN 4 WHEN 'prolite' THEN 3 WHEN 'plus' THEN 2 WHEN 'go' THEN 1 ELSE 0 END DESC,
           lease.paid_through DESC, lease.subscription_id LIMIT 1
)`;

export const siteBillingMode = env => /^(?:sk|rk)_test_/.test(env.SITE_STRIPE_SECRET_KEY ?? '') ? 0 : 1;

export function getPaidSiteSubscription(record) {
  return planTypes.has(record.paid_tier) && Number.isSafeInteger(record.paid_through) && record.paid_through > Date.now()
    ? { tier: record.paid_tier, expiresAt: record.paid_through, cancelAtPeriodEnd: record.cancel_at_period_end === 1 }
    : null;
}

function config(env) {
  const apiKey = env.SITE_STRIPE_SECRET_KEY, webhookSecret = env.SITE_STRIPE_WEBHOOK_SECRET;
  if (!/^(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+$/.test(apiKey ?? '') || !/^whsec_[A-Za-z0-9]+$/.test(webhookSecret ?? '')) return null;
  let entries;
  try { entries = Object.entries(JSON.parse(env.SITE_STRIPE_PRICES)); } catch { return null; }
  if (!entries.length || entries.some(([tier, price]) => !planTypes.has(tier) || !validId(price, 'price_')) ||
      new Set(entries.map(([, price]) => price)).size !== entries.length) return null;
  const mode = siteBillingMode(env);
  return { apiKey, webhookSecret, mode, live: mode === 1, prices: new Map(entries) };
}

async function boundedBody(request, limit) {
  if (!request.body || Number(request.headers.get('content-length')) > limit) return null;
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function stripe(settings, path, { input, idempotencyKey } = {}) {
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: input ? 'POST' : 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(9000),
    headers: {
      Authorization: 'Bearer ' + settings.apiKey,
      'Stripe-Version': stripeVersion,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    ...(input ? { body: new URLSearchParams(input) } : {}),
  });
  if (!response.ok) throw Error('Payment processor returned HTTP ' + response.status);
  const payload = await response.json();
  if (!payload || payload.livemode !== undefined && payload.livemode !== settings.live) throw Error('Payment processor mode mismatch');
  return payload;
}

function hostedUrl(value, hostname) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.host !== hostname || url.username || url.password) throw Error('Unexpected checkout destination');
  return url.href;
}

async function getCustomer(env, settings, userId) {
  const read = () => query(env, 'SELECT customer_id FROM site_billing_customers WHERE user_id=? AND livemode=?', userId, settings.mode).first();
  const stored = await read();
  if (stored) return stored.customer_id;
  const customer = await stripe(settings, 'customers', {
    input: { 'metadata[site_user_id]': userId }, idempotencyKey: 'site-billing-customer-' + userId,
  });
  if (!validId(customer.id, 'cus_') || customer.metadata?.site_user_id !== userId) throw Error('Unexpected billing customer');
  await query(env, 'INSERT OR IGNORE INTO site_billing_customers (user_id,livemode,customer_id) VALUES (?,?,?)', userId, settings.mode, customer.id).run();
  const saved = await read();
  if (!saved) throw Error('Could not save billing customer');
  return saved.customer_id;
}

async function checkout(request, env, settings, actor) {
  const payload = await boundedBody(request, 1024);
  let tier;
  try { tier = JSON.parse(new TextDecoder().decode(payload ?? new Uint8Array())).tier; } catch {}
  const price = settings.prices.get(tier);
  if (!price) return error(400, 'SITE_BILLING_INVALID_TIER', '请选择本站可订阅的套餐。');
  const hasSubscription = () => query(env, `SELECT 1 FROM site_billing_subscriptions WHERE user_id=? AND livemode=?
    AND status NOT IN ('canceled','incomplete_expired') LIMIT 1`, actor.id, settings.mode).first();
  if (await hasSubscription()) return conflict('账号已有订阅，请在管理订阅中更改套餐或支付方式。');

  const customer = await getCustomer(env, settings, actor.id);
  const now = Math.floor(Date.now() / 1000), expires = now + checkoutLifetime;
  async function reserve() {
    await query(env, `INSERT INTO site_billing_checkouts
      (user_id,livemode,attempt_id,tier,price_id,created_at,expires_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(user_id,livemode) DO UPDATE SET attempt_id=excluded.attempt_id,tier=excluded.tier,
        price_id=excluded.price_id,created_at=excluded.created_at,expires_at=excluded.expires_at,session_id=NULL,checkout_url=NULL
      WHERE expires_at <= excluded.created_at`, actor.id, settings.mode, crypto.randomUUID(), tier, price, now, expires).run();
    return query(env, 'SELECT * FROM site_billing_checkouts WHERE user_id=? AND livemode=?', actor.id, settings.mode).first();
  }
  let attempt = await reserve();
  if (attempt.tier !== tier || attempt.price_id !== price) {
    if (!validId(attempt.session_id, 'cs_')) return conflict('上一笔付款正在建立，请稍后重试。');
    const canceled = await stripe(settings, 'checkout/sessions/' + attempt.session_id + '/expire', {
      input: {}, idempotencyKey: 'site-billing-expire-' + attempt.attempt_id,
    }).catch(() => null);
    if (canceled?.status !== 'expired' || canceled.customer !== customer || canceled.client_reference_id !== attempt.attempt_id) {
      return conflict('上一笔付款尚未确认终止，请先检查该笔订单。');
    }
    await query(env, `UPDATE site_billing_checkouts SET expires_at=0,checkout_url=NULL
      WHERE user_id=? AND livemode=? AND attempt_id=?`, actor.id, settings.mode, attempt.attempt_id).run();
    attempt = await reserve();
  }
  if (attempt.tier !== tier || attempt.price_id !== price) return conflict('另一个套餐的付款正在建立，请稍后重试。');
  if (await hasSubscription()) return conflict('账号已有订阅，请在管理订阅中查看。');
  if (attempt.checkout_url) return respond({ url: hostedUrl(attempt.checkout_url, 'checkout.stripe.com') });

  // A completed payment can arrive just before its checkout expires. Check
  // Stripe before replacing an expired attempt when its webhook is delayed.
  const queryString = new URLSearchParams({ customer, status: 'all', limit: '100' });
  const subscriptions = await stripe(settings, 'subscriptions?' + queryString);
  if (!Array.isArray(subscriptions.data) || subscriptions.has_more !== false) throw Error('Incomplete subscription inventory');
  if (subscriptions.data.some(subscription => !['canceled', 'incomplete_expired'].includes(subscription.status))) {
    return conflict('账号在支付服务已有订阅，请在管理订阅中查看。');
  }
  const session = await stripe(settings, 'checkout/sessions', {
    input: {
      mode: 'subscription', customer,
      client_reference_id: attempt.attempt_id,
      'metadata[site_user_id]': actor.id,
      'subscription_data[metadata][site_user_id]': actor.id,
      'line_items[0][price]': price, 'line_items[0][quantity]': '1',
      success_url: origin + '?site_billing=return#pricing', cancel_url: origin + '#pricing',
      expires_at: String(attempt.expires_at),
    },
    idempotencyKey: 'site-billing-checkout-' + attempt.attempt_id,
  });
  if (!validId(session.id, 'cs_') || session.status !== 'open' || session.customer !== customer ||
      session.client_reference_id !== attempt.attempt_id) throw Error('Unexpected checkout session');
  const url = hostedUrl(session.url, 'checkout.stripe.com');
  const saved = await query(env, `UPDATE site_billing_checkouts SET session_id=?,checkout_url=?
    WHERE user_id=? AND livemode=? AND attempt_id=? AND expires_at>?`, session.id, url, actor.id, settings.mode, attempt.attempt_id, now).run();
  if (!(saved.meta?.changes ?? saved.changes)) return conflict('该付款订单已结束，请刷新套餐状态。');
  return respond({ url });
}

async function portal(env, settings, actor) {
  const customer = await query(env, 'SELECT customer_id FROM site_billing_customers WHERE user_id=? AND livemode=?', actor.id, settings.mode).first();
  if (!customer) return error(404, 'SITE_BILLING_CUSTOMER_MISSING', '这个账号还没有付款记录。');
  const session = await stripe(settings, 'billing_portal/sessions', {
    input: { customer: customer.customer_id, return_url: origin + '?site_billing=return#pricing' },
  });
  if (session.customer !== customer.customer_id) throw Error('Unexpected billing portal session');
  return respond({ url: hostedUrl(session.url, 'billing.stripe.com') });
}

async function signedEvent(request, settings) {
  const header = request.headers.get('stripe-signature');
  if (!header || header.length > 4096) return null;
  const parts = header.split(',').map(part => part.split('='));
  const stamp = parts.find(([name]) => name === 't')?.[1];
  if (!/^\d{10}$/.test(stamp ?? '') || Math.abs(Math.floor(Date.now() / 1000) - Number(stamp)) > signatureTolerance) return null;
  const bytes = await boundedBody(request, maxBodyBytes);
  if (!bytes) return null;
  const lead = encoder.encode(stamp + '.'), signed = new Uint8Array(lead.length + bytes.length);
  signed.set(lead); signed.set(bytes, lead.length);
  const key = await crypto.subtle.importKey('raw', encoder.encode(settings.webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const [name, value] of parts) {
    if (name !== 'v1' || !/^[a-f0-9]{64}$/.test(value ?? '')) continue;
    const signature = Uint8Array.from(value.match(/../g), hex => Number.parseInt(hex, 16));
    if (!await crypto.subtle.verify('HMAC', key, signature, signed)) continue;
    try {
      const event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      return validId(event.id, 'evt_') && event.livemode === settings.live && Number.isSafeInteger(event.created) &&
        event.created > 0 && typeof event.type === 'string' ? event : null;
    } catch { return null; }
  }
  return null;
}

function paidPeriod(subscription, item) {
  const invoice = subscription.latest_invoice;
  if (!invoice || invoice.status !== 'paid' || invoice.subscription !== subscription.id ||
      !Number.isSafeInteger(subscription.current_period_end)) return 0;
  const lines = invoice.lines?.data ?? [];
  const ends = lines.filter(line => line.subscription_item === item.id && line.price?.id === item.price.id &&
      Number.isSafeInteger(line.period?.end)).map(line => line.period.end);
  return ends.length ? Math.min(subscription.current_period_end, Math.max(...ends)) * 1000 : 0;
}

const subscriptionEvents = new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
  'customer.subscription.paused','customer.subscription.resumed']);
const checkoutEvents = new Set(['checkout.session.completed','checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed','checkout.session.expired']);

async function webhook(request, env, settings) {
  const event = await signedEvent(request, settings);
  if (!event) return error(400, 'SITE_BILLING_SIGNATURE_INVALID', '支付通知验证失败。');
  if (await query(env, 'SELECT 1 FROM site_billing_events WHERE event_id=? AND livemode=?', event.id, settings.mode).first()) return respond({ received: true });
  const object = event.data?.object;
  const checkoutEvent = checkoutEvents.has(event.type);
  const subscriptionId = subscriptionEvents.has(event.type) ? object?.id : checkoutEvent ? object?.subscription :
    event.type === 'invoice.paid' || event.type === 'invoice.payment_failed'
      ? object?.subscription ?? object?.parent?.subscription_details?.subscription : null;
  const writes = [];
  const reconciledAt = Date.now();
  if (validId(subscriptionId, 'sub_')) {
    const subscription = await stripe(settings, 'subscriptions/' + subscriptionId + '?expand%5B%5D=latest_invoice');
    if (subscription.id !== subscriptionId) throw Error('Unexpected subscription');
    const customer = await query(env, 'SELECT user_id FROM site_billing_customers WHERE customer_id=? AND livemode=?', subscription.customer, settings.mode).first();
    const item = subscription.items?.data?.length === 1 ? subscription.items.data[0] : null;
    const tier = item && [...settings.prices].find(([, price]) => price === item.price?.id)?.[0];
    if (customer && subscription.metadata?.site_user_id === customer.user_id) {
      const paidThrough = tier ? paidPeriod(subscription, item) : 0;
      const status = tier ? subscription.status : 'unsupported';
      const willCancel = subscription.cancel_at_period_end === true || subscription.cancel_at != null;
      writes.push(query(env, `INSERT INTO site_billing_subscriptions
        (subscription_id,livemode,user_id,tier,status,paid_through,cancel_at_period_end,event_created,reconciled_at)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(subscription_id,livemode) DO UPDATE SET
          tier=CASE WHEN excluded.paid_through>0 THEN excluded.tier ELSE tier END,
          status=excluded.status, paid_through=CASE WHEN excluded.paid_through>0 THEN excluded.paid_through ELSE paid_through END,
          cancel_at_period_end=excluded.cancel_at_period_end,event_created=excluded.event_created,reconciled_at=excluded.reconciled_at
        WHERE user_id=excluded.user_id AND (excluded.event_created>event_created OR
          (excluded.event_created=event_created AND excluded.reconciled_at>=reconciled_at))`,
      subscription.id, settings.mode, customer.user_id, tier ?? '', status, paidThrough, willCancel ? 1 : 0, event.created, reconciledAt));
    }
  }
  if (checkoutEvent && validId(object?.id, 'cs_') && validId(object.customer, 'cus_') && typeof object.client_reference_id === 'string' &&
      (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed' || validId(subscriptionId, 'sub_'))) {
    writes.push(query(env, `UPDATE site_billing_checkouts SET expires_at=0,checkout_url=NULL
      WHERE attempt_id=? AND (session_id IS NULL OR session_id=?) AND livemode=?
      AND user_id=(SELECT user_id FROM site_billing_customers WHERE customer_id=? AND livemode=?)`,
    object.client_reference_id, object.id, settings.mode, object.customer, settings.mode));
  }
  writes.push(query(env, 'INSERT OR IGNORE INTO site_billing_events(event_id,livemode,processed_at) VALUES (?,?,?)', event.id, settings.mode, Date.now()));
  await env.DB.batch(writes);
  return respond({ received: true });
}

export async function handleSiteBilling(request, env, actor) {
  const endpoint = new URL(request.url).pathname.slice(prefix.length);
  const methods = { options: 'GET', checkout: 'POST', portal: 'POST', webhook: 'POST' };
  if (!Object.hasOwn(methods, endpoint)) return error(404, 'SITE_BILLING_NOT_FOUND', '支付接口不存在。');
  if (request.method !== methods[endpoint]) {
    const response = error(405, 'METHOD_NOT_ALLOWED', '请求方法不正确。');
    response.headers.set('Allow', methods[endpoint]);
    return response;
  }
  const settings = config(env);
  if (endpoint === 'options') return respond({ tiers: settings ? [...settings.prices.keys()] : [], checkoutAvailable: Boolean(settings) });
  if (!settings) return unavailable();
  if (endpoint !== 'webhook' && actor?.role !== 'user') return error(401, 'SITE_BILLING_LOGIN_REQUIRED', '请先登录本站注册账号。');
  try {
    if (endpoint === 'webhook') return await webhook(request, env, settings);
    if (endpoint === 'checkout') return await checkout(request, env, settings, actor);
    return await portal(env, settings, actor);
  } catch { return unavailable(); }
}
