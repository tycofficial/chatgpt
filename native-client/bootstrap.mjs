const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,release:"f9ae2fd5ed7aa130",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"f9ae2fd5ed7aa130", rootURL);
if (!navigator.serviceWorker) throw Error('This browser does not support the original-client asset host');
await navigator.serviceWorker.register(workerURL,{scope:rootURL.pathname,type:'module',updateViaCache:'none'});
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller || !new URL(navigator.serviceWorker.controller.scriptURL).pathname.endsWith('/native-client-worker.js')) {
 await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};const timer=setTimeout(()=>reject(Error('Original asset host did not become ready')),20000);navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();});
}
const siteAccount = await import('./site-account.mjs?v='+"f9ae2fd5ed7aa130");
let isBusy;
if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\/$/,''))) {
 siteAccount.renderSiteLoginPage();
 isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
}
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+"f9ae2fd5ed7aa130");
 const {localAppServer} = await import('./service-boundary.mjs?v='+"f9ae2fd5ed7aa130");
 isBusy = () => localAppServer.running.size>0;
}
const {createReleaseUpdater} = await import('../release-updater.js?v='+"f9ae2fd5ed7aa130");
const updater = createReleaseUpdater({currentRelease:"f9ae2fd5ed7aa130",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
updater.start();
globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
