import { installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=c992a0f3a1b8df1e';
try {
const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,directAssetHost:true,release:"c992a0f3a1b8df1e",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"c992a0f3a1b8df1e", rootURL);
installDirectAssetHost(rootURL, { fetchImpl: releaseFetch });
// Storage-backed hosting is optional; import maps host the original modules.
void registerOptionalAssetWorker(workerURL, rootURL.pathname);
const siteAccount = await import('./site-account.mjs?v='+"c992a0f3a1b8df1e");
let isBusy;
const pagePath = location.pathname.replace(/\/$/, '');
if(pagePath === rootURL.pathname + 'site-plans') {
 await siteAccount.initializeSiteAccount();
 const {renderSitePlansPage} = await import('./local-pricing.mjs?v='+"c992a0f3a1b8df1e");
 renderSitePlansPage();
 isBusy = () => Boolean(document.querySelector('.site-plans[aria-busy="true"]'));
}
else if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(pagePath)) {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+"c992a0f3a1b8df1e");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"c992a0f3a1b8df1e");
 isBusy = () => localAppServer.running.size>0;
}
const {createReleaseUpdater} = await import('../release-updater.js?v='+"c992a0f3a1b8df1e");
const updater = createReleaseUpdater({currentRelease:"c992a0f3a1b8df1e",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
} catch (error) { showStartupError(error); }
