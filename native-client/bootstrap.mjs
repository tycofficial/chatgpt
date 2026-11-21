import { installBrowserCompatibility, installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=3627b234b2f18cbf';
try {
const rootURL = new URL('../', import.meta.url);
document.documentElement.dataset.routerBasename = rootURL.pathname.replace(/\/$/, '') || '/';
await installBrowserCompatibility();
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,siteAccountService:true,preferredHostEnabled:true,directAssetHost:true,release:"3627b234b2f18cbf",sourceBuild:"b6348792a294e8e04a67660959ba41914937938f"});
const workerURL = new URL('native-client-worker.js?v='+"3627b234b2f18cbf", rootURL);
installDirectAssetHost(rootURL, { fetchImpl: releaseFetch });
// Storage-backed hosting is optional; import maps host the original modules.
void registerOptionalAssetWorker(workerURL, rootURL.pathname);
const [siteAccount, signOut, {getSiteAuthEntryKind}] = await Promise.all([
 import('./site-account.mjs?v='+"3627b234b2f18cbf"),
 import('./site-signout.mjs?v='+"3627b234b2f18cbf"),
 import('./site-paths.mjs?v='+"3627b234b2f18cbf"),
]);
signOut.installSiteSignOutRestore({home:()=>rootURL});
let isBusy;
const pagePath = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
const authEntry = getSiteAuthEntryKind(location.href, rootURL);
if (authEntry === 'logout') {
 await siteAccount.logoutSiteAccount({waitForRemote:true});
 siteAccount.startSiteGuestSession();
 location.replace(signOut.getSiteSignedOutUrl(rootURL));
} else if(authEntry === 'login' || authEntry === 'signup') {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 if (/\/(?:site-plans(?:\/index\.html)?|plans|pricing-plan|purchase\/[^/]+)$/.test(pagePath)) {
   const pricing = await import('./native-pricing-trials.mjs?v='+"3627b234b2f18cbf");
   pricing.normalizeLegacyPricingEntry();
 }
 await siteAccount.initializeSiteAccountForDisplay();
 await import('./boot-adapter.mjs?v='+"3627b234b2f18cbf");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"3627b234b2f18cbf");
 isBusy = () => localAppServer.running.size>0 || Boolean(document.querySelector('[aria-busy="true"]'));
}
if (isBusy) {
const {createReleaseUpdater} = await import('../release-updater.js?v='+"3627b234b2f18cbf");
const updater = createReleaseUpdater({currentRelease:"3627b234b2f18cbf",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
}
} catch (error) { showStartupError(error); }
