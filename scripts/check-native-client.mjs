import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import { sharedNativeAssets } from './shared-native-assets.mjs';
import { checkPackagedSiteAccountOrigin, requestedSiteAccountOrigin } from './site-account-origin.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'native-client');
const source=path.join(root,'src/native-client');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const provenance=JSON.parse(await fs.readFile(path.join(directory,'adapter-provenance.json'),'utf8'));
const active=JSON.parse(await fs.readFile(path.join(directory,'active.json'),'utf8'));
if(!active.active||!provenance.sharedAssets?.length||!provenance.resources)throw Error('Native release has not been packaged with complete provenance');
const sharedInputs = new Map(sharedNativeAssets.map(asset => [asset.file, asset.inputFile]));
if (provenance.sharedAssets.length !== sharedInputs.size ||
    new Set(provenance.sharedAssets.map(asset => asset.file)).size !== sharedInputs.size ||
    provenance.sharedAssets.some(asset => !sharedInputs.has(asset.file))) {
 throw Error('Native release must retain the declared shared assets');
}
const builderBytes=await fs.readFile(path.join(root,'scripts/build-native-client.mjs'));
const planInput=await fs.readFile(path.join(source,'entry-plan.json'),'utf8');
if(sha256(builderBytes)!==provenance.builderSha256||sha256(planInput)!==provenance.entryPlanInputSha256)throw Error('Build inputs changed after packaging');
const helperInputs=[];
for(const helper of provenance.helpers){
 const original=await fs.readFile(path.join(source,helper.file),'utf8');
 const published=await fs.readFile(path.join(directory,helper.file));
 if(sha256(original)!==helper.inputSha256)throw Error('Unpackaged canonical source: '+helper.file);
 if(sha256(published)!==helper.publishedSha256)throw Error('Published helper changed without rebuilding: '+helper.file);
 helperInputs.push(original);
}
const releaseHash=crypto.createHash('sha256').update(helperInputs.join('\n')).update(builderBytes).update(planInput).update(provenance.deploymentBase);
const siteAccountOrigin = checkPackagedSiteAccountOrigin({
 canonicalModule: await fs.readFile(path.join(source,'site-account.mjs'),'utf8'),
 publishedModule: await fs.readFile(path.join(directory,'site-account.mjs'),'utf8'),
 recordedOrigin: provenance.siteAccountOrigin,
 expectedOrigin: requestedSiteAccountOrigin(process.env.CHATGPT_SITE_API_ORIGIN),
});
if (provenance.siteAccountOrigin !== undefined) releaseHash.update('\0site-account-origin:').update(siteAccountOrigin);
if (provenance.preservedRegistrationEntry) {
 if (!/^\.\/entry-library\.mjs\?v=[a-f0-9]{16}$/.test(provenance.preservedRegistrationEntry)) throw Error('Invalid retained module entry');
 releaseHash.update('\0preserved-registration:').update(provenance.preservedRegistrationEntry);
}
for(const asset of provenance.sharedAssets){
 const expectedInput=sharedInputs.get(asset.file);
 if(expectedInput){
  if(asset.inputFile!==expectedInput||asset.inputSha256!==asset.sha256)throw Error('Shared asset must be packaged from its canonical source');
  const inputBytes=await fs.readFile(path.join(root,expectedInput));
  if(sha256(inputBytes)!==asset.inputSha256)throw Error('Unpackaged canonical shared source: '+asset.file);
 }else if(asset.inputFile!==undefined||asset.inputSha256!==undefined)throw Error('Unexpected shared asset input migration: '+asset.file);
 const bytes=await fs.readFile(path.join(root,asset.file));
 if(sha256(bytes)!==asset.sha256)throw Error('Unversioned root dependency: '+asset.file);
 releaseHash.update(asset.file).update(bytes);
}
for(const resource of provenance.resources){
 if(resource.file.startsWith('/')||resource.file.split('/').includes('..'))throw Error('Resource outside canonical assets');
 const bytes=await fs.readFile(path.join(source,resource.file));
 if(sha256(bytes)!==resource.sha256||sha256(await fs.readFile(path.join(directory,resource.file)))!==resource.sha256)throw Error('Unpackaged resource: '+resource.file);
 releaseHash.update(resource.file).update(bytes);
}
const supplementalManifest=await fs.readFile(path.join(root,provenance.supplementalManifest.file));
if(sha256(supplementalManifest)!==provenance.supplementalManifest.sha256)throw Error('Unpackaged original renderer manifest');
releaseHash.update(provenance.supplementalManifest.file).update(supplementalManifest);
for(const resource of provenance.supplementalResources){
 if(!resource.file.startsWith('_orbit-renderer/')||resource.file.split('/').includes('..'))throw Error('Invalid supplemental resource path');
 const bytes=await fs.readFile(path.join(root,resource.file));
 if(sha256(bytes)!==resource.sha256)throw Error('Original renderer resource changed: '+resource.file);
 releaseHash.update(resource.file).update(bytes);
}
const release=releaseHash.digest('hex').slice(0,16);
for (const alias of provenance.siteResourceAliases ?? []) {
 const resource = provenance.resources.find(item => item.file === alias.source);
 if (!alias.file.startsWith('_orbit-renderer/') || alias.file.split('/').includes('..') ||
     !resource || resource.sha256 !== alias.sha256 || sha256(await fs.readFile(path.join(root, alias.file))) !== alias.sha256) {
  throw Error('Invalid site renderer compatibility file: ' + alias.file);
 }
}
if(release!==active.release||release!==provenance.release||active.sourceBuild!==provenance.sourceBuild)throw Error('Active release does not match actual canonical inputs');
const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.mjs'));
let ownImports=0;
for(const name of files){
 const file=path.join(directory,name),text=await fs.readFile(file,'utf8');
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 if(/(?:from|import)\s*['"][^'"]*(?:app\.js|ui\/templates|source-motion|power-picker|work-picker)/.test(text))throw Error('Legacy UI dependency in '+name);
 for(const match of text.matchAll(/\b(?:from\s*|import\s*\(\s*|import\s*)(['"])(\.[^'"]+)\1/g)){
  const importFile=path.resolve(directory,match[2].split('?')[0]);
  if(!importFile.startsWith(root+path.sep))throw Error('Import outside workspace');
  await fs.access(importFile);ownImports++;
 }
}
const plan=JSON.parse(await fs.readFile(path.join(directory,'entry-plan.json'),'utf8'));
if (provenance.preservedRegistrationEntry && plan.registrationEntry !== provenance.preservedRegistrationEntry) throw Error('Retained module entry changed');
const urls=[plan.runtime,plan.manifest,...plan.registrationChunks,...Object.values(plan.initialRoutes)];
for(const url of urls){if(!url.startsWith('/cdn/assets/'))throw Error('Unexpected original entry URL');await fs.access(path.join(root,'original-client/public/chatgpt.com',url));}
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
if(!html.includes('/chatgpt/native-client/bootstrap.mjs')||html.includes('src="./app.js'))throw Error('Native client is not the main entry');
if(!html.includes('data-native-client-release="'+release+'"')||!html.includes('bootstrap.mjs?v='+release))throw Error('Main HTML serves an obsolete release');
const authAliases = ['login', 'signup', 'auth/login', 'auth/signup', 'auth/logout', 'logout'];
const planAliases = ['site-plans', 'plans', 'pricing-plan', ...['plus', 'pro5x', 'prolite', 'pro', 'promax'].flatMap(tier => [
  'purchase/' + tier, 'codex/purchase/' + tier,
])];
const authHtml = await fs.readFile(path.join(root, 'auth/login/index.html'), 'utf8');
const entryShells = ['404.html', 'native-client-shell.html', ...planAliases.map(alias => alias + '/index.html')];
for (const file of entryShells) {
  if (await fs.readFile(path.join(root, file), 'utf8') !== html) throw Error('Stale entry shell: ' + file);
}
for (const alias of authAliases) {
  if (await fs.readFile(path.join(root, alias, 'index.html'), 'utf8') !== authHtml) throw Error('Stale account shell: ' + alias);
}
if (!authHtml.includes('bootstrap.mjs?v=' + release) || authHtml.includes('rel="stylesheet"') ||
    html.includes('site-start-status') || authHtml.includes('site-start-status')) throw Error('Invalid browser entry shells');
const bootstrap=await fs.readFile(path.join(directory,'bootstrap.mjs'),'utf8');
if(!bootstrap.includes('release:'+JSON.stringify(release))||bootstrap.includes('release-updater.js')||
   !bootstrap.includes('startup?.ready()'))throw Error('Invalid browser bootstrap');
execFileSync(process.execPath,['--check',path.join(root,'native-client-worker.js')],{stdio:'pipe'});
console.log(JSON.stringify({nativeMain:true,release,canonicalHashesVerified:true,helperModules:files.length,sharedAssets:provenance.sharedAssets.length,resources:provenance.resources.length,supplementalResources:provenance.supplementalResources.length,ownImports,originalEntryResources:urls.length,legacyUiImported:false}));
