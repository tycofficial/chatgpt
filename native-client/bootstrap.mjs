import { installBrowserCompatibility, installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=5065100f733d20a5';
try {
const rootURL = new URL('../', import.meta.url);
document.documentElement.dataset.routerBasename = rootURL.pathname.replace(/\/$/, '') || '/';
await installBrowserCompatibility();
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,siteAccountService:true,preferredHostEnabled:true,directAssetHost:true,release:"5065100f733d20a5",sourceBuild:"b6348792a294e8e04a67660959ba41914937938f"});
const workerURL = new URL('native-client-worker.js?v='+"5065100f733d20a5", rootURL);
installDirectAssetHost(rootURL, { fetchImpl: releaseFetch });
// Storage-backed hosting is optional; import maps host the original modules.
void registerOptionalAssetWorker(workerURL, rootURL.pathname);
const [siteAccount, signOut, {getSiteAuthEntryKind}] = await Promise.all([
 import('./site-account.mjs?v='+"5065100f733d20a5"),
 import('./site-signout.mjs?v='+"5065100f733d20a5"),
 import('./site-paths.mjs?v='+"5065100f733d20a5"),
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
   const pricing = await import('./native-pricing-trials.mjs?v='+"5065100f733d20a5");
   pricing.normalizeLegacyPricingEntry();
 }
 await siteAccount.initializeSiteAccountForDisplay();
 await import('./boot-adapter.mjs?v='+"5065100f733d20a5");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"5065100f733d20a5");
 isBusy = () => localAppServer.running.size>0 || Boolean(document.querySelector('[aria-busy="true"]'));
}
if (isBusy) {
const {createReleaseUpdater} = await import('../release-updater.js?v='+"5065100f733d20a5");
const updater = createReleaseUpdater({currentRelease:"5065100f733d20a5",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
}
} catch (error) { showStartupError(error); }
