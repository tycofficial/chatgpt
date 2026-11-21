import { getSiteLoginUrl } from './site-account.mjs?v=5065100f733d20a5';

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
