import { installDirectAssetHost, registerOptionalAssetWorker, showStartupError } from './startup-compatibility.mjs?v=9e6124f65633571c';
try {
const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,directAssetHost:true,release:"9e6124f65633571c",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"9e6124f65633571c", rootURL);
installDirectAssetHost(rootURL, { fetchImpl: releaseFetch });
// Storage-backed hosting is optional; import maps host the original modules.
void registerOptionalAssetWorker(workerURL, rootURL.pathname);
const siteAccount = await import('./site-account.mjs?v='+"9e6124f65633571c");
let isBusy;
if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\/$/,''))) {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+"9e6124f65633571c");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"9e6124f65633571c");
 isBusy = () => localAppServer.running.size>0;
}
const {createReleaseUpdater} = await import('../release-updater.js?v='+"9e6124f65633571c");
const updater = createReleaseUpdater({currentRelease:"9e6124f65633571c",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
} catch (error) { showStartupError(error); }
