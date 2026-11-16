import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'native-client');
const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.mjs'));
let ownImports=0;
for(const name of files){
 const file=path.join(directory,name),text=await fs.readFile(file,'utf8');
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 if(/(?:from|import)\s*['"][^'"]*(?:app\.js|ui\/templates|source-motion|power-picker|work-picker)/.test(text))throw Error('Legacy UI dependency in '+name);
 for(const match of text.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)){
  const importFile=path.resolve(directory,match[1].split('?')[0]);
  if(!importFile.startsWith(root+path.sep))throw Error('Import outside workspace');
  await fs.access(importFile);ownImports++;
 }
}
const plan=JSON.parse(await fs.readFile(path.join(directory,'entry-plan.json'),'utf8'));
const urls=[plan.runtime,plan.manifest,...plan.registrationChunks,...Object.values(plan.initialRoutes)];
for(const url of urls){if(!url.startsWith('/cdn/assets/'))throw Error('Unexpected original entry URL');await fs.access(path.join(root,'original-client/public/chatgpt.com',url));}
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
if(!html.includes('/chatgpt/native-client/bootstrap.mjs')||html.includes('src="./app.js'))throw Error('Native client is not the main entry');
execFileSync(process.execPath,['--check',path.join(root,'native-client-worker.js')],{stdio:'pipe'});
console.log(JSON.stringify({nativeMain:true,helperModules:files.length,ownImports,originalEntryResources:urls.length,legacyUiImported:false}));
