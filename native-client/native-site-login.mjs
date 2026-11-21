import { getSiteLoginUrl } from './site-account.mjs?v=bfb322d68717147e';

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
