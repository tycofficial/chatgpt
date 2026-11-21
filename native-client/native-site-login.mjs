import { getSiteLoginUrl } from './site-account.mjs?v=5c7eb02b441bce39';

/** Hand off the native router's login path to the site's document entry. */
export function createNativeSiteLoginRoute({ useLocation, useEffect }) {
  return function NativeSiteLoginRoute() {
    const { search } = useLocation();
    const next = new URLSearchParams(search).get('next');
    const target = getSiteLoginUrl(next ?? undefined).href;
    useEffect(() => { globalThis.location.replace(target); }, [target]);
    return null;
  };
}
