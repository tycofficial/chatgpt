const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,release:"a0a40643d9533070",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"a0a40643d9533070", rootURL);
if (!navigator.serviceWorker) throw Error('This browser does not support the original-client asset host');
await navigator.serviceWorker.register(workerURL,{scope:rootURL.pathname,type:'module',updateViaCache:'none'});
await navigator.serviceWorker.ready;
if (!navigator.serviceWorker.controller || !new URL(navigator.serviceWorker.controller.scriptURL).pathname.endsWith('/native-client-worker.js')) {
 await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};const timer=setTimeout(()=>reject(Error('Original asset host did not become ready')),20000);navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();});
}
const siteAccount = await import('./site-account.mjs?v='+"a0a40643d9533070");
if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\/$/,''))) siteAccount.renderSiteLoginPage();
else {
 await siteAccount.initializeSiteAccount();
 await import('./boot-adapter.mjs?v='+"a0a40643d9533070");
 const [{createReleaseUpdater},{localAppServer}] = await Promise.all([import('../release-updater.js?v='+"a0a40643d9533070"),import('./service-boundary.mjs?v='+"a0a40643d9533070")]);
 const updater = createReleaseUpdater({currentRelease:"a0a40643d9533070",baseURL:rootURL,fetchImpl:releaseFetch,isBusy:()=>localAppServer.running.size>0});
 updater.start();
 globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
}
