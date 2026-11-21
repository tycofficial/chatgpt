import { getSiteTrialAction, submitSiteTrial } from './local-pricing.mjs?v=91ed19db286dc9e0';
import { getSiteHomeUrl, getSiteLoginUrl, safeSiteReturnUrl } from './site-account.mjs?v=91ed19db286dc9e0';

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
  let pending = null;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const element = React.createElement;

  function TrialCard({ original, tier }) {
    const [, redraw] = React.useReducer(value => value + 1, 0);
    const [message, setMessage] = React.useState('');
    React.useEffect(() => {
      listeners.add(redraw);
      const events = ['codex-site-account-changed', 'online', 'offline'];
      for (const event of events) globalThis.addEventListener(event, redraw);
      return () => {
        listeners.delete(redraw);
        for (const event of events) globalThis.removeEventListener(event, redraw);
      };
    }, []);
    const action = getSiteTrialAction(tier);
    const submit = async event => {
      event?.preventDefault();
      if (pending || action.disabled) return;
      if (action.status === 'login') {
        const { url } = nativePricingDestination(location.href, location.href);
        location.assign(getSiteLoginUrl(url.href).href);
        return;
      }
      pending = tier;
      setMessage('');
      notify();
      try { await submitSiteTrial(tier); }
      catch (error) { setMessage(error.message || '暂时无法保存，请重试。'); }
      finally { pending = null; notify(); }
    };
    const expiry = action.expiresAt ? new Date(action.expiresAt).toLocaleDateString('zh-CN') : '';
    const caption = message || (expiry ? '本站试用至 ' + expiry : '本站试用 · 30 天，可续期');
    const existing = React.Children.toArray(original.actions?.props?.children)[0];
    const activeButton = existing?.type === Button;
    const icon = activeButton && Array.isArray(existing.props.children) ? existing.props.children[0] : null;
    const button = element(Button, {
      ...(activeButton ? existing.props : { className: 'w-full justify-center', color: 'secondary', size: 'beaconAction', radius: 'full' }),
      'aria-describedby': undefined, disabled: Boolean(pending) || action.disabled, loading: pending === tier,
      onClick: submit, type: 'button',
    }, icon, action.label);
    return element(Card, {
      ...original, actions: button,
      price: { ...original.price, content: element(React.Fragment, null,
        element(Amount, { amount: '免费试用', currency: '', screenReaderText: '本站免费试用 30 天' }),
        element(Frequency, null, element('span', { role: 'status', 'aria-live': 'polite' }, caption)),
      ) },
    });
  }
  return function PersonalPlanCard(props) {
    const tier = props.plan?.lookupType;
    return getSiteTrialAction(tier) ? element(TrialCard, { key: tier, original: props, tier }) : element(Card, props);
  };
}
