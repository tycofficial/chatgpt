const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,release:"0afe1f6a931a198d",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"0afe1f6a931a198d", rootURL);
if (!navigator.serviceWorker) throw Error('This browser does not support the original-client asset host');
const withDeadline = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Error('Asset host timed out')), ms))]);
await withDeadline(navigator.serviceWorker.register(workerURL,{scope:rootURL.pathname,type:'module',updateViaCache:'none'}), 12000);
await withDeadline(navigator.serviceWorker.ready, 12000);
if (!navigator.serviceWorker.controller || !new URL(navigator.serviceWorker.controller.scriptURL).pathname.endsWith('/native-client-worker.js')) {
 await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};const timer=setTimeout(()=>reject(Error('Original asset host did not become ready')),12000);navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();});
}
const siteAccount = await import('./site-account.mjs?v='+"0afe1f6a931a198d");
let isBusy;
if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\/$/,''))) {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+"0afe1f6a931a198d");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"0afe1f6a931a198d");
 isBusy = () => localAppServer.running.size>0;
}
const {createReleaseUpdater} = await import('../release-updater.js?v='+"0afe1f6a931a198d");
const updater = createReleaseUpdater({currentRelease:"0afe1f6a931a198d",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
