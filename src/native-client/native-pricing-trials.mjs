import { getSiteBillingAction, getSiteTrialAction, submitSiteTrial } from './local-pricing.mjs';
import { createSiteBillingPortal, createSiteCheckout, getSiteAccount, getSiteHomeUrl, getSiteLoginUrl, readSiteBillingOptions, safeSiteReturnUrl } from './site-account.mjs';

const oldPlanPath = /^\/(?:site-plans(?:\/index\.html)?|plans|pricing-plan|(?:codex\/)?purchase\/(?:plus|pro5x|prolite|pro|promax))\/?$/;

export function isSitePricingPath(path, base) {
  const relative = path.startsWith(base) ? '/' + path.slice(base.length) : path;
  return oldPlanPath.test(relative.replace(/\/index\.html$/, '/'));
}

/** React Router stores returnPath without the Pages project basename. */
export function nativePricingDestination(requested, from) {
  const home = getSiteHomeUrl();
  const source = new URL(requested, home);
  let target = safeSiteReturnUrl(source.searchParams.get('next') || from || home.href);
  if (isSitePricingPath(target.pathname, home.pathname)) target = new URL(home.href);
  if (target.hash === '#pricing') target.hash = '';
  const returnPath = '/' + target.pathname.slice(home.pathname.length) + target.search + target.hash;
  const tier = source.pathname.replace(/\/index\.html$/, '/').match(/\/purchase\/(plus|pro5x|prolite|pro|promax)\/?$/)?.[1];
  for (const key of ['cta_tab', 'default_tab', 'highlight_plan', 'pro_variant']) {
    if (source.searchParams.has(key)) target.searchParams.set(key, source.searchParams.get(key));
  }
  if (tier) {
    target.searchParams.set('cta_tab', 'personal');
    target.searchParams.set('highlight_plan', tier === 'plus' ? 'plus' : 'pro');
    if (tier === 'pro') target.searchParams.set('pro_variant', '2x');
  }
  target.hash = 'pricing';
  return { url: target, returnPath };
}

export function normalizeLegacyPricingEntry() {
  const home = getSiteHomeUrl();
  if (!isSitePricingPath(location.pathname, home.pathname)) return false;
  const { url, returnPath } = nativePricingDestination(location.href, home.href);
  history.replaceState({ ...history.state, usr: { ...history.state?.usr, returnPath } }, '', url.href);
  return true;
}

/** The existing pricing card owns its plan details, Pro selector, animation and responsive layout. */
export function createNativeSiteTrialCard(Card, { React, Button, Amount, Frequency }) {
  let pending = null, options = null, readingOptions;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const element = React.createElement;

  function refreshBillingOptions() {
    if (globalThis.navigator?.onLine === false) return;
    if (!readingOptions) {
      readingOptions = readSiteBillingOptions().then(value => { options = value; }, () => { options = null; })
        .finally(() => { readingOptions = null; notify(); });
    }
    return readingOptions;
  }

  function SitePlanCard({ original, tier }) {
    const [, redraw] = React.useReducer(value => value + 1, 0);
    const [feedback, setFeedback] = React.useState(null);
    React.useEffect(() => {
      listeners.add(redraw);
      const events = ['codex-site-account-changed', 'offline'];
      const reconnect = () => { redraw(); refreshBillingOptions(); };
      for (const event of events) globalThis.addEventListener(event, redraw);
      globalThis.addEventListener('online', reconnect);
      refreshBillingOptions();
      return () => {
        listeners.delete(redraw);
        globalThis.removeEventListener('online', reconnect);
        for (const event of events) globalThis.removeEventListener(event, redraw);
      };
    }, []);
    const account = getSiteAccount();
    const administrator = account?.role === 'administrator';
    const trial = getSiteTrialAction(tier);
    const billing = getSiteBillingAction(tier, options);
    const action = billing ?? trial ?? { status: 'administrator', label: '管理员已开通', disabled: true };
    const outdatedAvailability = feedback?.kind === 'availability' && (action.kind !== 'availability' || options !== null);
    const message = outdatedAvailability ? null : feedback?.message;
    const submit = async (event, selected) => {
      event?.preventDefault();
      if (pending || selected.disabled) return;
      if (selected.status === 'login') {
        const { url } = nativePricingDestination(location.href, location.href);
        location.assign(getSiteLoginUrl(url.href).href);
        return;
      }
      pending = tier;
      setFeedback(null);
      notify();
      try {
        if (selected.kind === 'checkout') location.assign(await createSiteCheckout(tier));
        else if (selected.kind === 'portal') location.assign(await createSiteBillingPortal());
        else if (selected.kind === 'availability') {
          await refreshBillingOptions();
          if (!options) setFeedback({ kind: selected.kind, message: '暂时无法核实本站 Go 订阅状态。' });
        } else await submitSiteTrial(tier);
      } catch (error) { setFeedback({ kind: selected.kind, message: error.message || '暂时无法完成套餐操作，请重试。' }); }
      finally { pending = null; notify(); }
    };

    const subscription = account?.siteSubscription;
    const subscriptionExpiry = subscription?.tier === tier ? subscription.expiresAt : null;
    const includesDot = ['prolite', 'pro', 'promax'].includes(tier);
    const date = expiration => new Date(expiration).toLocaleDateString('zh-CN');
    let caption = '本站试用 · 30 天，可续期';
    if (administrator) caption = tier === 'promax' ? '管理员当前套餐' : '已包含在管理员套餐中';
    else if (subscriptionExpiry) caption = '本站订阅至 ' + date(subscriptionExpiry);
    else if (billing?.kind === 'checkout') caption = '美元参考价 · 实付金额以支付页为准';
    else if (billing?.kind === 'portal') caption = '通过本站账单管理套餐';
    else if (billing?.kind === 'availability') caption = options ? '本站 Go 订阅暂未开放' : '美元参考价';
    else if (trial?.expiresAt) caption = '本站试用至 ' + date(trial.expiresAt);
    const existing = React.Children.toArray(original.actions?.props?.children)[0];
    const activeButton = existing?.type === Button;
    const icon = activeButton && Array.isArray(existing.props.children) ? existing.props.children[0] : null;
    const fallback = { className: 'w-full justify-center', color: 'secondary', size: 'beaconAction', radius: 'full' };
    const button = element(Button, {
      ...(activeButton ? existing.props : fallback),
      'aria-describedby': undefined, disabled: Boolean(pending) || action.disabled, loading: pending === tier,
      onClick: event => submit(event, action), type: 'button',
    }, icon, action.label);
    const trialButton = billing?.kind === 'checkout' && trial ? element(Button, {
      ...fallback, disabled: Boolean(pending) || trial.disabled, onClick: event => submit(event, trial), type: 'button',
    }, trial.label) : null;
    const quotedPrice = subscriptionExpiry ? element(Amount, { amount: '本站订阅', currency: '' }) :
      billing || administrator ? original.price?.content :
        element(Amount, { amount: '免费试用', currency: '', screenReaderText: '本站免费试用 30 天' });
    return element(Card, {
      ...original, actions: trialButton ? element(React.Fragment, null, button, trialButton) : button,
      price: { ...original.price, content: element(React.Fragment, null, quotedPrice,
        element(Frequency, null, element('span', { role: 'status', 'aria-live': 'polite' }, message || caption),
          includesDot ? element('span', { className: 'block' }, '含站内 Dot') : null),
      ) },
    });
  }
  return function PersonalPlanCard(props) {
    const tier = props.plan?.lookupType;
    return tier === 'go' || getSiteTrialAction(tier) ?
      element(SitePlanCard, { key: tier, original: props, tier }) : element(Card, props);
  };
}
