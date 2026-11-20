/**
 * Native billing read contracts for the locally hosted original client.
 * Quotes are verified US-dollar public reference prices, never a checkout.
 * Site trial enrollment lives on the dedicated site plans page below.
 *
 * Original build ef0c3fb941611420d8683bf88f61acf1a8ac6b19:
 * rLiN/smwl, 396705.00162c6ea9.js:628930-655499 (requests/price book).
 * ra39, async/899311.9233e1594e.js:244862-247167 (price schema).
 * PXhB, async/508240.39cb6eb1b8.js:33329-34131 (major-unit formatter).
 * iTEc, async/195127.df927345ad.js:103021-103900 (null subscription valid).
 * p3vI, 396705.00162c6ea9.js:564237-564553 (payment methods).
 * wbWw/Bhuf/YoTg/JGV6, async/899311.9233e1594e.js (billing read shapes).
 */
import { claimSiteTrial, getSiteAccount, getSiteHomeUrl, getSiteLoginUrl, getSitePlansUrl, getSiteSessionToken, getSiteTrialPlan, safeSiteReturnUrl } from './site-account.mjs?v=c992a0f3a1b8df1e';

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


const siteTrialTiers = [
  { key: 'plus', name: 'Plus', description: '选择可用模型，并使用本站 Work 和 Codex。' },
  { key: 'prolite', name: 'Pro Lite', description: '使用本站模型选择、Work、Codex 和 Dot。' },
  { key: 'pro', name: 'Pro', description: '使用本站模型选择、Work、Codex 和 Dot。' },
  { key: 'promax', name: 'Pro Max', description: '使用本站模型选择、Work、Codex 和 Dot。' },
];
const trialDateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' });

const sitePlansStyle = [
  'html[data-site-plans],body[data-site-plans]{display:block;margin:0;height:auto;min-height:100%;overflow:auto}',
  'body[data-site-plans]{--page:#f0f5f8;--card:#fcfefe;--text:#162c3b;--muted:#49606e;--border:#c5d5de;--accent:#124f60;--button:#096276;--button-ink:#fff;background:var(--page);color:var(--text);font:16px/1.6 system-ui,sans-serif}',
  '.site-plans,.site-plans *{box-sizing:border-box}',
  '.site-plans{max-width:1060px;margin:auto;padding:28px clamp(20px,5vw,56px) 64px}',
  '.site-plans header{display:flex;justify-content:space-between;align-items:center;gap:12px}',
  '.site-plans a{color:var(--accent);text-underline-offset:4px}',
  '.site-plans :focus-visible{outline:2px solid var(--accent);outline-offset:4px}',
  '.site-plans h1{font-size:clamp(2rem,6vw,3.25rem);font-weight:700;line-height:1.15;margin:56px 0 14px}',
  '.site-plans p{color:var(--muted);margin:0}',
  '.site-plans .site-plans-account{display:grid;gap:4px;margin:26px 0 18px;padding:16px 18px;background:var(--card);border:1px solid var(--border);border-radius:12px}',
  '.site-plans-account [hidden]{display:none}',
  '.site-plans-auth-links:not([hidden]){display:flex;flex-wrap:wrap;gap:16px}',
  '.site-plans-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
  '.site-plans article{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:14px}',
  '.site-plans article[data-current]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}',
  '.site-plans h2{margin:0;font-size:1.125rem;font-weight:700}',
  '.site-plans article p{flex:1;font-size:.9rem}',
  '.site-plans button{display:block;margin-top:8px;width:100%;padding:10px 8px;border:1px solid transparent;border-radius:8px;background:var(--button);color:var(--button-ink);font:inherit;font-size:.9rem;font-weight:600;cursor:pointer}',
  '.site-plans button:hover:not(:disabled){filter:brightness(.92)}',
  '.site-plans button:disabled{opacity:.58;cursor:default}',
  '.site-plans [role=status]{min-height:2rem;margin:16px 0 0;color:var(--accent)}',
  '@media (max-width:800px){.site-plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media (max-width:420px){.site-plans-grid{grid-template-columns:minmax(0,1fr)}.site-plans h1{margin-top:36px}}',
  '@media (prefers-color-scheme:dark){body[data-site-plans]{--page:#111e27;--card:#172a35;--text:#edf8fa;--muted:#b0c7ce;--border:#42616e;--accent:#93e6ea;--button:#93e6ea;--button-ink:#10232b}}',
].join('');

export function renderSitePlansPage() {
  const currentUrl = new URL(globalThis.location.href);
  const returnUrl = safeSiteReturnUrl(currentUrl.searchParams.get('next'));
  const loginReturn = getSitePlansUrl(returnUrl.href);
  const signupUrl = new URL('signup', getSiteHomeUrl());
  signupUrl.searchParams.set('next', loginReturn.href);

  const style = document.createElement('style');
  style.textContent = sitePlansStyle;
  document.head.append(style);
  document.documentElement.dataset.sitePlans = 'true';
  document.body.dataset.sitePlans = 'true';
  document.title = '本站会员试用';
  const main = document.createElement('main');
  main.className = 'site-plans';
  main.innerHTML = [
    '<header><a class="site-plans-back">返回</a></header>',
    '<h1>本站会员试用</h1>',
    '<p>各方案均可免费试用 30 天，支持手动续期和切换。权益仅在本站有效，无需付款信息。</p>',
    '<section class="site-plans-account" aria-label="当前会员状态"><strong></strong><p></p>',
    '<nav class="site-plans-auth-links" aria-label="本站账户"><a class="site-plans-login">登录本站账户</a>',
    '<a class="site-plans-signup">创建本站账户</a></nav></section>',
    '<section class="site-plans-grid" aria-label="本站试用方案"></section>',
    '<p role="status"></p>',
  ].join('');
  main.querySelector('.site-plans-back').href = returnUrl.href;
  main.querySelector('.site-plans-login').href = getSiteLoginUrl(loginReturn.href).href;
  main.querySelector('.site-plans-signup').href = signupUrl.href;

  const accountStatus = main.querySelector('.site-plans-account strong');
  const accountHint = main.querySelector('.site-plans-account p');
  const authLinks = main.querySelector('.site-plans-auth-links');
  const grid = main.querySelector('.site-plans-grid');
  const result = main.querySelector('[role=status]');
  let pending = false;

  const tiles = siteTrialTiers.map(tier => {
    const article = document.createElement('article');
    const title = document.createElement('h2');
    title.textContent = '本站 ' + tier.name;
    const description = document.createElement('p');
    description.textContent = tier.description;
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => void submit(tier));
    article.append(title, description, button);
    grid.append(article);
    return { tier, article, button };
  });

  function update() {
    const account = getSiteAccount();
    const isRegistered = account?.role === 'user';
    const eligible = isRegistered && Boolean(getSiteSessionToken());
    const activeTier = siteTrialTiers.find(tier => tier.key === account?.siteTrial?.tier);
    authLinks.hidden = Boolean(account);
    if (activeTier) {
      accountStatus.textContent = '正在试用本站 ' + activeTier.name;
      accountHint.textContent = '有效期至 ' + trialDateFormat.format(account.siteTrial.expiresAt) +
        (eligible ? '。' : '。联网验证后可续期或切换。');
    } else if (account?.role === 'administrator') {
      accountStatus.textContent = '本站管理员';
      accountHint.textContent = '此账户已拥有本站 Pro 权益。';
    } else {
      accountStatus.textContent = '本站免费版';
      accountHint.textContent = eligible ? '请选择一个方案开始试用。' :
        isRegistered ? '联网验证后可开启试用。' : '使用本站注册账户开启试用。';
    }
    for (const { tier, article, button } of tiles) {
      const current = tier.key === activeTier?.key;
      article.toggleAttribute('data-current', current);
      button.disabled = pending || !eligible;
      button.textContent = current ? '续期 30 天' : activeTier ? '切换到此方案' : '开启 30 天试用';
      button.setAttribute('aria-label', button.textContent + ' · 本站 ' + tier.name);
    }
  }

  async function submit(tier) {
    if (pending) return;
    pending = true;
    main.setAttribute('aria-busy', 'true');
    result.textContent = '正在保存试用方案…';
    update();
    try {
      const account = await claimSiteTrial(tier.key);
      result.textContent = '已启用本站 ' + tier.name + '，有效期至 ' + trialDateFormat.format(account.siteTrial.expiresAt) + '。';
    } catch (error) {
      result.textContent = error.message || '暂时无法开启试用，请重试。';
    } finally {
      pending = false;
      main.removeAttribute('aria-busy');
      update();
    }
  }
  update();
  document.body.replaceChildren(main);
  globalThis.addEventListener('codex-site-account-changed', update);
  globalThis.addEventListener('focus', update);
  globalThis.addEventListener('pageshow', update);
}
