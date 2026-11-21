/**
 * Native billing read contracts for the locally hosted original client.
 * Quotes are verified US-dollar public reference prices, never a checkout.
 * The existing upgrade controls use the separate site trial action.
 *
 * Original build ef0c3fb941611420d8683bf88f61acf1a8ac6b19:
 * rLiN/smwl, 396705.00162c6ea9.js:628930-655499 (requests/price book).
 * ra39, async/899311.9233e1594e.js:244862-247167 (price schema).
 * PXhB, async/508240.39cb6eb1b8.js:33329-34131 (major-unit formatter).
 * iTEc, async/195127.df927345ad.js:103021-103900 (null subscription valid).
 * p3vI, 396705.00162c6ea9.js:564237-564553 (payment methods).
 * wbWw/Bhuf/YoTg/JGV6, async/899311.9233e1594e.js (billing read shapes).
 */
import { claimSiteTrial, getSiteAccount, getSiteSessionToken, getSiteTrialPlan, refreshSiteAccount } from './site-account.mjs';

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
 * The host supplies verified membership. Site trials and administrator
 * grants share the billing read shape with their source and expiry intact.
 */
export function normalizeLocalMembership(record, now = Date.now()) {
  const requestedPlan = PLANS.has(record?.planType) ? record.planType : 'free';
  const trial = record?.siteTrial;
  const trialPlan = getSiteTrialPlan(trial?.tier);
  const validTrial = trial == null ? record?.membershipSource !== 'site-registration' || requestedPlan === 'free' :
    trialPlan !== null && trialPlan === requestedPlan && Number.isSafeInteger(trial.expiresAt) && trial.expiresAt > 0;
  const rawExpiry = trial ? trial.expiresAt : record?.expiresAt;
  const expiryMs = rawExpiry == null ? null : typeof rawExpiry === 'number' ? rawExpiry : Date.parse(rawExpiry);
  const validExpiry = expiryMs == null || Number.isFinite(expiryMs) && Math.abs(expiryMs) <= 8640000000000000;
  const expired = validExpiry && expiryMs != null && expiryMs <= now;
  const enabled = record?.enabled !== false && validTrial && validExpiry && !expired;
  const plan = enabled ? requestedPlan : 'free';
  const pricePlan = enabled && trial ? trial.tier : plan;
  return {
    plan_type: plan,
    status: !validTrial || !validExpiry || record?.enabled === false ? 'disabled' : expired ? 'expired' : plan === 'free' ? 'free' : 'active',
    local_only: true,
    managed_by: trial && validTrial ? 'site-trial' : 'local-administrator',
    site_trial_tier: enabled && trial ? trial.tier : null,
    expires_at: validExpiry && expiryMs != null ? new Date(expiryMs).toISOString() : null,
    pro_tier: PRO_TIER_USD[pricePlan] ?? null,
    reference_monthly_amount: MONTHLY_USD[pricePlan],
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
  ['/wham/rate-limit-reset-credits', () => ({ credits: [], available_count: 0, history_enabled: false, adapter_source: LOCAL_MARKER })],
  ['/wham/usage/credit-usage-events', () => ({ data: [], adapter_source: LOCAL_MARKER })],
  ['/subscriptions/credits/discount-offer', () => ({ offer: null, adapter_source: LOCAL_MARKER })],
  ['/subscriptions/auto_top_up/settings', () => ({
    is_enabled: false, payment_method: null, recharge_threshold: null,
    recharge_target: null, recharge_monthly_limit: null,
    auto_reload_credit_discount_policy: null, adapter_source: LOCAL_MARKER,
  })],
  // A missing score is deliberately not converted to an invented propensity.
  ['/user_segments', () => ({ segments: {}, adapter_source: LOCAL_MARKER })],
]);

const siteUsageSource = 'site-docode';
const secondsPerDay = 86_400;
const usageNumber = new Intl.NumberFormat();
const requestCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

function dailyRequestLimit(daily, currentTime) {
  const used = requestCount(daily?.requests);
  const limit = requestCount(daily?.limit);
  const resetsAt = requestCount(daily?.resetsAt);
  if (used === null || !limit || resetsAt === null || resetsAt <= currentTime) return null;
  const resetAt = Math.floor(resetsAt / 1_000);
  return {
    allowed: used < limit,
    limit_reached: used >= limit,
    primary_window: {
      used_percent: Math.min(100, used / limit * 100),
      limit_window_seconds: secondsPerDay,
      reset_after_seconds: Math.max(0, resetAt - Math.floor(currentTime / 1_000)),
      reset_at: resetAt,
    },
    secondary_window: null,
  };
}

function nativeUsage(receipt, membership, identity, currentTime) {
  if (receipt?.plan?.id !== membership.id || !identity?.userId || !identity?.accountId) return null;
  const source = Array.isArray(receipt.sources) && receipt.sources.find(row => row?.source === siteUsageSource);
  const requested = requestCount(source?.requests);
  if (requested === null) return null;
  const completed = requestCount(source.completed);
  const reports = requestCount(source.token_reports);
  if (completed === null || reports === null || completed > requested || reports > requested) return null;
  const input = requestCount(source.input_tokens);
  const output = requestCount(source.output_tokens);
  const plan = normalizeLocalMembership(receipt.plan, currentTime).plan_type;
  const rateLimit = plan === 'free' ? dailyRequestLimit(source.freeDaily, currentTime) : null;
  const rows = [
    ['本站请求', requested],
    ['已完成', completed],
    ['有用量回执的请求', reports],
    ['输入令牌（已回报）', input],
    ['输出令牌（已回报）', output],
  ].filter(([, value]) => value !== null).map(([label, value]) => ({
    label, value: { text: usageNumber.format(value), tone: 'neutral' },
  }));
  return {
    user_id: identity.userId,
    account_id: identity.accountId,
    plan_type: plan,
    rate_limit: rateLimit,
    code_review_rate_limit: null,
    credits: null,
    ambient_usage: {
      default: {
        profile_subtext: usageNumber.format(requested) + ' 次本站请求',
        source: { kind: 'included', heading: '本站已记录用量' },
        menu: { rows },
      },
    },
    adapter_source: siteUsageSource,
    site_usage: { requests: requested, completed, token_reports: reports, input_tokens: input, output_tokens: output },
  };
}

/** Present the verified site receipt in the original settings layout. */
export function createNativeSiteUsageLayout(Layout, { React, Section, Group, Row, useUsage, getIdentity, isUsageRoute }) {
  const { createElement } = React;
  function SiteUsageSummary() {
    const { data } = useUsage();
    const identity = getIdentity();
    if (!identity || data?.adapter_source !== siteUsageSource ||
        data.user_id !== identity.userId || data.account_id !== identity.accountId) return null;
    const usage = data.ambient_usage?.default;
    const rows = usage?.menu?.rows;
    if (!usage?.source?.heading || !rows?.length) return null;
    return createElement(Section, { id: 'site-usage-summary' },
      createElement(Section.Header, { title: usage.source.heading }),
      createElement(Section.Content, null, createElement(Group, null, rows.map(({ label, value }) =>
        createElement(Row, { key: label, label, control: createElement('span', { className: 'tabular-nums' }, value.text) }),
      ))),
    );
  }
  return function SiteUsageLayout(props) {
    if (props.scrollResetKey !== 'usage' || !isUsageRoute()) return createElement(Layout, props);
    return createElement(Layout, props, createElement(SiteUsageSummary), props.children);
  };
}

/**
 * API: createLocalPricingAdapter({readMembership?, readUsage?, readUsageIdentity?, diagnostics?, now?})
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
  readUsage = () => null,
  readUsageIdentity = () => null,
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
    if (path === '/wham/usage') {
      if (method !== 'GET') return json({ detail: 'Method Not Allowed' }, 405, { Allow: 'GET' });
      const owner = await readMembership();
      if (!owner?.id) return json({ error: { code: 'SITE_AUTH_REQUIRED', message: '请先登录本站账户。' } }, 401);
      try {
        const receipt = await readUsage({ signal: request.signal });
        request.signal.throwIfAborted();
        const current = await readMembership();
        const view = current?.id === owner.id ? nativeUsage(receipt, current, await readUsageIdentity(), now()) : null;
        if (view) {
          note(method, path, 'site-inference-usage');
          return json(view);
        }
        return json({ error: { code: 'SITE_USAGE_UNAVAILABLE', message: '当前账户暂无本站用量记录。' } }, 404);
      } catch {
        request.signal.throwIfAborted();
        return json({ error: { code: 'SITE_USAGE_CONNECTION_FAILED', message: '暂时无法读取本站用量。' } }, 503);
      }
    }
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

export const SITE_TRIAL_TERMS = '免费试用 30 天，权益仅在本站有效，无需付款。';

export function getSiteTrialAction(tier) {
  if (!getSiteTrialPlan(tier)) return null;
  const account = getSiteAccount();
  const trial = account?.siteTrial;
  const expiresAt = trial?.tier === tier ? trial.expiresAt : null;
  if (!account) return { status: 'login', label: '登录后试用', disabled: false, expiresAt };
  if (account.role === 'administrator') return { status: 'administrator', label: '管理员已开通', disabled: true, expiresAt };
  if (!getSiteSessionToken()) {
    const offline = globalThis.navigator?.onLine === false;
    return { status: 'offline', label: offline ? '联网后试用' : '重试验证', disabled: offline, expiresAt };
  }
  if (expiresAt !== null) return { status: 'renew', label: '续期 30 天', disabled: false, expiresAt };
  if (trial) return { status: 'switch', label: '切换试用', disabled: false, expiresAt };
  return { status: 'start', label: '免费试用', disabled: false, expiresAt };
}

export async function submitSiteTrial(tier) {
  const action = getSiteTrialAction(tier);
  if (action?.status === 'offline' && !action.disabled) {
    const owner = getSiteAccount();
    const verified = await refreshSiteAccount();
    if (verified?.id !== owner?.id) throw Error('本站账户已变更，请重新验证后重试。');
  }
  return claimSiteTrial(tier);
}
