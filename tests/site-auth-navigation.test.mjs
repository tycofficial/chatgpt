
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getLocalSignedOutUrl } from '../src/native-client/local-identity.mjs';
const boot=fs.readFileSync(new URL('../src/native-client/boot-adapter.mjs',import.meta.url),'utf8');
const start=boot.indexOf('let siteLoginRedirecting = false;'),end=boot.indexOf("overrideExports('QdUF', {",start);
assert(start>=0&&end>start);
const code=boot.slice(start,end)+'\nglobalThis.navigationFixture={redirectToSiteLogin,maybeRedirectToSiteLogin,getSiteAuthPageUrl};';
function fixture({signedIn=false,path='/chatgpt/c/fixture',search='?draft=1',hash='#tail'}={}){
 const assigned=[],location={origin:'https://tycofficial.github.io',pathname:path,search,hash,href:'https://tycofficial.github.io'+path+search+hash,assign:url=>assigned.push(new URL(url))};
 const context=vm.createContext({URL,location,isPrototypeLocalSession:()=>signedIn,getSiteLoginUrl:()=>new URL('/chatgpt/login',location.origin)});
 new vm.Script(code,{filename:'boot-adapter.mjs (owned navigation fixture)'}).runInContext(context);
 return{...context.navigationFixture,assigned};
}
test('signed-out login navigation stays under the repository and preserves path, query and hash',()=>{const f=fixture();assert.equal(f.maybeRedirectToSiteLogin(),true);assert.equal(f.assigned[0].pathname,'/chatgpt/login');assert.equal(f.assigned[0].searchParams.get('next'),'/chatgpt/c/fixture?draft=1#tail');assert.equal(f.maybeRedirectToSiteLogin(),false);assert.equal(f.assigned.length,1);});
test('a local signed-in session does not auto-redirect but can explicitly add an account',()=>{const f=fixture({signedIn:true});assert.equal(f.maybeRedirectToSiteLogin(),false);assert.equal(f.redirectToSiteLogin.length,0);assert.equal(f.redirectToSiteLogin(),undefined);assert.equal(f.assigned.length,1);});
test('both normal and repository auth/login pages avoid redirect loops',()=>{for(const path of ['/chatgpt/login','/chatgpt/login/','/chatgpt/auth/login','/chatgpt/auth/login/']){const f=fixture({path});assert.equal(f.maybeRedirectToSiteLogin(),false);f.redirectToSiteLogin();assert.equal(f.assigned.length,0);}});
test('original sign-up navigation resolves to the working registration route inside this repository',()=>{const f=fixture();assert.equal(f.getSiteAuthPageUrl('signup').href,'https://tycofficial.github.io/chatgpt/signup');assert.equal(f.getSiteAuthPageUrl('login').href,'https://tycofficial.github.io/chatgpt/login');});
test('signed-out destination keeps the GitHub Pages repository base when the router basename is root',()=>{
 const names=['__CHATGPT_REPLICA_ENV__','location','document'],previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 try{
  Object.defineProperty(globalThis,'__CHATGPT_REPLICA_ENV__',{configurable:true,writable:true,value:{basePath:'/chatgpt/'}});
  Object.defineProperty(globalThis,'location',{configurable:true,writable:true,value:{origin:'https://tycofficial.github.io'}});
  Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{documentElement:{dataset:{routerBasename:'/'}}}});
  const target=new URL(getLocalSignedOutUrl());
  assert.equal(target.pathname,'/chatgpt/');
  assert.equal(target.searchParams.get('localSession'),'0');
 }finally{
  for(const[name,descriptor]of previous)descriptor?Object.defineProperty(globalThis,name,descriptor):delete globalThis[name];
 }
});

test('native sign-out clears the site account and returns to the repository path', async()=>{
 const begin=boot.indexOf("overrideExports('jEww', {"), end=boot.indexOf('let siteLoginRedirecting = false;',begin);
 let signOut, cleared=0, loggedOut=0, cleaned=0;const requests=[];
 const context=vm.createContext({overrideExports:(_id,exports)=>{signOut=exports.signOutOfBrowserSession;},getLocalSignedOutUrl:()=> 'https://tycofficial.github.io/chatgpt/?localSession=0',clearPrototypeLocalSession:()=>cleared++,logoutSiteAccount:async()=>{loggedOut++;},fetch:async(url,options)=>{requests.push([url,options]);return {json:async()=>({csrfToken:'fixture'})};},URLSearchParams,Promise,setTimeout});
 new vm.Script(boot.slice(begin,end)).runInContext(context);
 const result=await signOut(()=>{cleaned++;});
 assert.equal(result.ok,true);assert.equal(new URL(result.url).pathname,'/chatgpt/');assert.deepEqual(requests.map(entry=>entry[0]),['/api/auth/csrf','/api/auth/signout']);assert.equal(requests[1][1].body.get('csrfToken'),'fixture');assert.equal(cleared,1);assert.equal(loggedOut,1);assert.equal(cleaned,1);
});
