import { installBrowserCompatibility, installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=1e91c1a3ce5a11ff';
import { installRestrictedBrowserStorage } from './restricted-browser-storage.mjs?v=1e91c1a3ce5a11ff';
try {
if (globalThis.__TYC_PAGE_START__?.styleFailed) throw Error('The page stylesheet could not be loaded.');
const rootURL = new URL('../', import.meta.url);
document.documentElement.dataset.routerBasename = rootURL.pathname.replace(/\/$/, '') || '/';
await installBrowserCompatibility();
installRestrictedBrowserStorage();
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,siteAccountService:true,preferredHostEnabled:true,directAssetHost:true,release:"1e91c1a3ce5a11ff",sourceBuild:"b6348792a294e8e04a67660959ba41914937938f"});
const workerURL = new URL('native-client-worker.js?v='+"1e91c1a3ce5a11ff", rootURL);
installDirectAssetHost(rootURL);
const [siteAccount, signOut, {getSiteAuthEntryKind}] = await Promise.all([
 import('./site-account.mjs?v='+"1e91c1a3ce5a11ff"),
 import('./site-signout.mjs?v='+"1e91c1a3ce5a11ff"),
 import('./site-paths.mjs?v='+"1e91c1a3ce5a11ff"),
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
   const pricing = await import('./native-pricing-trials.mjs?v='+"1e91c1a3ce5a11ff");
   pricing.normalizeLegacyPricingEntry();
 }
 await siteAccount.initializeSiteAccountForDisplay();
 await import('./boot-adapter.mjs?v='+"1e91c1a3ce5a11ff");
 // The worker is only for private browser-created files. It does not load pages.
 void registerOptionalAssetWorker(workerURL, rootURL.pathname);
}
globalThis.__TYC_PAGE_START__?.ready();
} catch (error) { showStartupError(error); }
