import { installBrowserCompatibility, installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=a288d45728a939a0';
import { installRestrictedBrowserStorage } from './restricted-browser-storage.mjs?v=a288d45728a939a0';
try {
const startup = globalThis.__TYC_PAGE_START__;
if (startup && !await startup.waitForStyles()) throw Error('The page stylesheet could not be loaded.');
const rootURL = new URL('../', import.meta.url);
document.documentElement.dataset.routerBasename = rootURL.pathname.replace(/\/$/, '') || '/';
await installBrowserCompatibility();
installRestrictedBrowserStorage();
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,siteAccountService:true,preferredHostEnabled:true,directAssetHost:true,release:"a288d45728a939a0",sourceBuild:"b6348792a294e8e04a67660959ba41914937938f"});
const workerURL = new URL('native-client-worker.js?v='+"a288d45728a939a0", rootURL);
installDirectAssetHost(rootURL);
const [siteAccount, signOut, {getSiteAuthEntryKind}] = await Promise.all([
 import('./site-account.mjs?v='+"a288d45728a939a0"),
 import('./site-signout.mjs?v='+"a288d45728a939a0"),
 import('./site-paths.mjs?v='+"a288d45728a939a0"),
]);
signOut.installSiteSignOutRestore({home:()=>rootURL});
const pagePath = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
const authEntry = getSiteAuthEntryKind(location.href, rootURL);
if (authEntry === 'logout') {
 await siteAccount.logoutSiteAccount({waitForRemote:true});
 siteAccount.startSiteGuestSession();
 location.replace(signOut.getSiteSignedOutUrl(rootURL));
} else if(authEntry === 'login' || authEntry === 'signup') {
 siteAccount.renderSiteLoginPage();
}
else {
 if (/\/(?:site-plans(?:\/index\.html)?|plans|pricing-plan|purchase\/[^/]+)$/.test(pagePath)) {
   const pricing = await import('./native-pricing-trials.mjs?v='+"a288d45728a939a0");
   pricing.normalizeLegacyPricingEntry();
 }
 await siteAccount.initializeSiteAccountForDisplay();
 await import('./boot-adapter.mjs?v='+"a288d45728a939a0");
 // The worker is only for private browser-created files. It does not load pages.
 void registerOptionalAssetWorker(workerURL, rootURL.pathname);
}
startup?.ready();
} catch (error) { showStartupError(error); }
