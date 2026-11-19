const rootURL = new URL('../', import.meta.url);
const releaseFetch = globalThis.fetch.bind(globalThis);
globalThis.__CHATGPT_REPLICA_ENV__ = Object.freeze({basePath:rootURL.pathname,localIdentity:true,useOriginalAuth:true,preferredHostEnabled:true,release:"63a859e6c683b1b3",sourceBuild:"ef0c3fb941611420d8683bf88f61acf1a8ac6b19"});
const workerURL = new URL('native-client-worker.js?v='+"63a859e6c683b1b3", rootURL);
const STARTUP_TIMEOUT_MS = 12000;
const startupPanel = document.getElementById('native-startup');
const startupTitle = document.getElementById('native-startup-title');
const startupDetail = document.getElementById('native-startup-detail');
const retryButton = document.getElementById('native-startup-retry');
const reloadButton = document.getElementById('native-startup-reload');
function setStartupLoading() {
 startupPanel.hidden = false;
 startupPanel.setAttribute('role','status');
 startupTitle.textContent = 'Starting ChatGPT…';
 startupDetail.textContent = 'Preparing the offline asset host.';
 retryButton.hidden = true;
 retryButton.disabled = false;
 reloadButton.hidden = true;
}
function setStartupFailure(error) {
 startupPanel.hidden = false;
 startupPanel.setAttribute('role','alert');
 startupTitle.textContent = 'ChatGPT could not start';
 startupDetail.textContent = String(error?.message || error);
 retryButton.hidden = false;
 retryButton.disabled = false;
 reloadButton.hidden = false;
}
function waitForStartupOperation(promise, label) {
 let timer;
 return Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Service worker did not '+label+' within '+STARTUP_TIMEOUT_MS+' ms')),STARTUP_TIMEOUT_MS);})
 ]).finally(()=>clearTimeout(timer));
}
function controllerMatchesRelease(serviceWorker) {
 const controller = serviceWorker.controller;
 if (!controller) return false;
 const controllerURL = new URL(controller.scriptURL, location.href);
 return controllerURL.origin === workerURL.origin && controllerURL.pathname === workerURL.pathname && controllerURL.searchParams.get('v') === "63a859e6c683b1b3";
}
function waitForCurrentController(serviceWorker) {
 if (controllerMatchesRelease(serviceWorker)) return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const finish = error => {
   clearTimeout(timer);
   serviceWorker.removeEventListener('controllerchange', check);
   if (error) reject(error); else resolve();
  };
  const check = () => { if (controllerMatchesRelease(serviceWorker)) finish(); };
  const timer = setTimeout(()=>finish(Error('The current offline asset host did not activate within '+STARTUP_TIMEOUT_MS+' ms')),STARTUP_TIMEOUT_MS);
  serviceWorker.addEventListener('controllerchange',check);
  check();
 });
}
async function start() {
 setStartupLoading();
 try {
  const serviceWorker = navigator.serviceWorker;
  if (!serviceWorker) throw Error('This browser does not support the offline asset host.');
  try {
   await waitForStartupOperation(serviceWorker.register(workerURL,{scope:rootURL.pathname,type:'module',updateViaCache:'none'}),'register');
   await waitForStartupOperation(serviceWorker.ready,'activate');
   await waitForCurrentController(serviceWorker);
  } catch (error) {
   if (!controllerMatchesRelease(serviceWorker)) throw error;
  }
  const siteAccount = await import('./site-account.mjs?v='+"63a859e6c683b1b3");
  let isBusy;
  if(['login','auth/login','signup','auth/signup'].map(route=>rootURL.pathname+route).includes(location.pathname.replace(/\/$/,''))) {
   siteAccount.renderSiteLoginPage();
   isBusy = () => [...document.querySelectorAll('.site-login input')].some(input=>input===document.activeElement||input.value.length>0)||!!document.querySelector('.site-login button:disabled');
  }
  else {
   await siteAccount.initializeSiteAccount();
   await import('./boot-adapter.mjs?v='+"63a859e6c683b1b3");
   const {localAppServer} = await import('./service-boundary.mjs?v='+"63a859e6c683b1b3");
   isBusy = () => localAppServer.running.size>0;
  }
  const {createReleaseUpdater} = await import('../release-updater.js?v='+"63a859e6c683b1b3");
  const updater = createReleaseUpdater({currentRelease:"63a859e6c683b1b3",baseURL:rootURL,fetchImpl:releaseFetch,isBusy,interactionQuietMs:30000});
  updater.start();
  globalThis.addEventListener('pagehide',()=>updater.stop(),{once:true});
  startupPanel.remove();
 } catch (error) {
  setStartupFailure(error);
 }
}
retryButton.addEventListener('click',()=>void start());
reloadButton.addEventListener('click',()=>location.reload());
void start();
