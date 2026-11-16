/**
 * Native billing read contracts for the locally hosted original client.
 * Quotes are verified US-dollar public reference prices, never a checkout.
 * No DOM, payment SDK, subscription mutation, authentication or persistence.
 *
 * Original build ef0c3fb941611420d8683bf88f61acf1a8ac6b19:
 * rLiN/smwl, 396705.00162c6ea9.js:628930-655499 (requests/price book).
 * ra39, async/899311.9233e1594e.js:244862-247167 (price schema).
 * PXhB, async/508240.39cb6eb1b8.js:33329-34131 (major-unit formatter).
 * iTEc, async/195127.df927345ad.js:103021-103900 (null subscription valid).
 * p3vI, 396705.00162c6ea9.js:564237-564553 (payment methods).
 * wbWw/Bhuf/YoTg/JGV6, async/899311.9233e1594e.js (billing read shapes).
 */
export const LOCAL_PRICING_REFERENCE = Object.freeze({
  source: 'https://learn.chatgpt.com/docs/pricing',
  verified_at: '2026-11-16',
  currency: 'USD',
  amount_unit: 'major',
  country: 'US',
  payment_execution_available: false,
  localized_prices_verified: false,
  tax_verified: false,
});

const MONTHLY_USD = Object.freeze({
  free: 0, go: 8, plus: 20, prolite: 100, pro: 200, promax: 500,
});
const PRO_TIER_USD = Object.freeze({ prolite: 100, pro: 200, promax: 500 });
const PLANS = new Set(Object.keys(MONTHLY_USD));
const LOCAL_MARKER = 'local-billing-reference-not-an-openai-payment';
const PAYMENT_ERROR = '此本地版本仅提供公开价格参考和本地会员管理，尚未连接支付服务。未创建订单，也未执行扣款。';

function json(body, status = 200, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function unavailable(status = 501, code = 'LOCAL_PAYMENT_UNAVAILABLE', message = PAYMENT_ERROR) {
  return json({
    status,
    detail: { error_type: code.toLowerCase(), message },
    error: { code, message },
    adapter_source: LOCAL_MARKER,
    payment_executed: false,
  }, status);
}

/**
 * Original config amounts are already major currency units. The native
 * formatter receives amount directly; minor_unit_exponent only sets digits.
 * A Business year entry is its monthly equivalent when billed annually.
 * Plus/Pro annual amounts and all tax flags remain absent: unverified.
 * A country request may fall back to this explicit US reference; we never
 * manufacture a regional price or a currency conversion.
 */
export function getLocalReferencePricingConfig(scope = 'US') {
  const requested = String(scope).trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(requested)) return null;
  if (requested.length === 3 && requested !== 'USD') return null;
  const currency_config = {
    symbol_code: 'USD',
    minor_unit_exponent: 2,
    pricing_rollout_gate: null,
  };
  for (const [plan, amount] of Object.entries(MONTHLY_USD)) {
    currency_config[plan] = { month: { amount } };
  }
  currency_config.business = {
    month: { amount: 25 },
    year: { amount: 20 },
  };
  return {
    country_code: 'US',
    currency_config,
    adapter_source: LOCAL_MARKER,
    quote_only: true,
    quote_reference: {
      ...LOCAL_PRICING_REFERENCE,
      requested_scope: requested,
      regional_quote: false,
      business_annual_price_is_monthly_equivalent: true,
    },
  };
}

/**
 * readMembership is a trusted host callback, not client-owned storage.
 * Expected record: {planType, enabled?, expiresAt?}. Only the private host's
 * administrator service may change it. Unknown/expired/disabled records
 * resolve to Free and can never grant an OpenAI subscription or model access.
 */
export function normalizeLocalMembership(record, now = Date.now()) {
  const inputPlan = record?.planType;
  const requestedPlan = PLANS.has(inputPlan) ? inputPlan : 'free';
  const rawExpiry = record?.expiresAt;
  const expiryMs = rawExpiry == null ? null : Date.parse(rawExpiry);
  const validExpiry = expiryMs == null || Number.isFinite(expiryMs);
  const expired = validExpiry && expiryMs != null && expiryMs <= now;
  const enabled = record?.enabled !== false && validExpiry && !expired;
  const plan = enabled ? requestedPlan : 'free';
  return {
    plan_type: plan,
    status: !validExpiry || record?.enabled === false ? 'disabled' : expired ? 'expired' : plan === 'free' ? 'free' : 'active',
    local_only: true,
    managed_by: 'local-administrator',
    expires_at: validExpiry && expiryMs != null ? new Date(expiryMs).toISOString() : null,
    pro_tier: PRO_TIER_USD[plan] ?? null,
    reference_monthly_amount: MONTHLY_USD[plan],
    reference_currency: 'USD',
    has_openai_subscription: false,
    payment_execution_available: false,
    adapter_source: LOCAL_MARKER,
  };
}

const EMPTY_BILLING_READS = new Map([
  ['/payments/payment_methods', () => ({ payment_methods: [], adapter_source: LOCAL_MARKER })],
  ['/payments/billing_info', () => ({ name: null, email: null, address: null, tax_ids: [], adapter_source: LOCAL_MARKER })],
  ['/payments/transaction-history', () => ({ transactions: [], next_cursor: null, adapter_source: LOCAL_MARKER })],
  ['/payments/invoice-expensing', () => ({ eligible: false, destination: null, adapter_source: LOCAL_MARKER })],
  ['/subscriptions/credits/discount-offer', () => ({ offer: null, adapter_source: LOCAL_MARKER })],
  ['/subscriptions/auto_top_up/settings', () => ({
    is_enabled: false, payment_method: null, recharge_threshold: null,
    recharge_target: null, recharge_monthly_limit: null,
    auto_reload_credit_discount_policy: null, adapter_source: LOCAL_MARKER,
  })],
  // A missing score is deliberately not converted to an invented propensity.
  ['/user_segments', () => ({ segments: {}, adapter_source: LOCAL_MARKER })],
]);

/**
 * API: createLocalPricingAdapter({readMembership?, diagnostics?, now?})
 * -> {handle(Request, canonicalPath?), getMembershipView()}.
 *
 * handle returns Response|null. Canonical paths omit /backend-api or
 * /__codex-api. The native subscription read is null: this local account
 * has no Stripe/OpenAI subscription. Local grants are reported separately
 * through getMembershipView, for the host's authenticated account adapter.
 * No synthetic customer, invoice, mandate, checkout URL/client_secret or
 * payment-success response is ever issued.
 */
export function createLocalPricingAdapter({
  readMembership = () => null,
  diagnostics,
  now = Date.now,
} = {}) {
  const note = (method, path, capability) => {
    diagnostics?.push?.({
      type: 'local-adapter', service: 'billing', method, path,
      capability, source: LOCAL_MARKER,
    });
  };
  const getMembershipView = async () =>
    normalizeLocalMembership(await readMembership(), now());

  async function handle(request, canonicalPath) {
    const url = new URL(request.url, 'http://local.invalid');
    const path = (canonicalPath ?? url.pathname)
      .replace(/^\/(?:backend-api|__codex-api)(?=\/)/, '')
      .replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();
    const pricing = path.match(/^\/checkout_pricing_config\/configs\/([^/]+)$/);
    if (pricing) {
      note(method, path, 'public-reference-price');
      if (method !== 'GET') return json({ detail: 'Method Not Allowed' }, 405, { Allow: 'GET' });
      let scope;
      try { scope = decodeURIComponent(pricing[1]); } catch { scope = ''; }
      const config = getLocalReferencePricingConfig(scope);
      return config ? json(config) : json({ detail: 'Country config not found' }, 404);
    }
    if (path === '/subscriptions' && method === 'GET') {
      note(method, path, 'no-openai-subscription');
      return json(null);
    }
    const emptyRead = EMPTY_BILLING_READS.get(path);
    if (emptyRead && method === 'GET') {
      note(method, path, 'local-empty-billing-read');
      return json(emptyRead());
    }
    if (/^\/accounts\/[^/]+\/customer-balance$/.test(path) && method === 'GET') {
      note(method, path, 'site-billing-balance-unavailable');
      return json({ balance: null, currency: 'usd', has_redeemed_gift_card: false, adapter_scope: 'site-billing-only', capability_status: 'balance-not-connected', api_quota: null, adapter_source: LOCAL_MARKER });
    }
    // Includes previews: proration, real renewal dates, processor mandates,
    // discounts and paid checkout cannot be quoted as executed local events.
    if (/^\/(?:payments|subscriptions)(?:\/|$)/.test(path)) {
      note(method, path, 'payment-service-unavailable');
      return unavailable();
    }
    return null;
  }

  return Object.freeze({ handle, getMembershipView });
}
