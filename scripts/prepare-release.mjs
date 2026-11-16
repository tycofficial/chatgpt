import fs from 'node:fs';
if (fs.existsSync('native-client/active.json')) {
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['scripts/build-native-client.mjs', '--activate'], { stdio: 'inherit' });
  process.exit(0);
}
const build=new Date().toISOString().replace(/\D/g,'').slice(0,14);
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/\sdata-app-build="[^"]*"/,'').replace('<html ','<html data-app-build="'+build+'" ');
html=html.replace(/<script type="importmap" data-release-imports>[\s\S]*?<\/script>/g,'');
const imports=Object.fromEntries(fs.readdirSync('.').filter(n=>n.endsWith('.js')).map(n=>['./'+n,'./'+n+'?v='+build]));
html=html.replace(/<script type="module" src="\.\/app\.js(?:\?[^\"]*)?"><\/script>/,`<script type="importmap" data-release-imports>${JSON.stringify({imports})}</script><script type="module" src="./app.js?v=${build}"></script>`);
html=html.replace(/(href="\.\/[^"?]+\.css)(?:\?[^\"]*)?"/g,`$1?v=${build}"`);
fs.writeFileSync('index.html',html);
let css=fs.readFileSync('bridge.css','utf8').replace(/(@import url\(')([^'?]+\.css)(?:\?[^']*)?('\);)/g,`$1$2?v=${build}$3`);
fs.writeFileSync('bridge.css',css);
console.log('Prepared browser resource version '+build);
