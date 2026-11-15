import {build} from 'esbuild';
import {cp,mkdir,readFile,writeFile,readdir,unlink} from 'node:fs/promises';
await mkdir('vendor',{recursive:true});
for(const [name,entry] of Object.entries({marked:'marked',purify:'dompurify',highlight:'highlight.js/lib/common', 'auto-render':'katex/contrib/auto-render'})){
  await build({entryPoints:[entry],bundle:true,format:'esm',minify:true,outfile:`vendor/${name}.js`,legalComments:'eof'});
}
for(const [source,dest]of [['katex/dist/katex.min.css','katex.css'],['highlight.js/styles/github.css','highlight.css'],['pdfjs-dist/build/pdf.min.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.mjs'],['mammoth/mammoth.browser.min.js','mammoth.js']])await cp('node_modules/'+source,'vendor/'+dest,{recursive:true});
await mkdir('vendor/fonts',{recursive:true});
for(const name of await readdir('vendor/fonts'))if(/\.(ttf|woff)$/.test(name))await unlink('vendor/fonts/'+name);
for(const name of await readdir('node_modules/katex/dist/fonts'))if(name.endsWith('.woff2'))await cp('node_modules/katex/dist/fonts/'+name,'vendor/fonts/'+name);
const katexCSS=await readFile('vendor/katex.css','utf8');
await writeFile('vendor/katex.css',katexCSS.replace(/,url\(fonts\/[^)]+\.(woff|ttf)\) format\("[^"]+"\)/g,''));
for(const pkg of ['marked','dompurify','highlight.js','katex','pdfjs-dist','mammoth']){let license;for(const name of ['LICENSE','LICENSE.md','LICENSE.txt']){try{license=await readFile(`node_modules/${pkg}/${name}`,'utf8');break;}catch{}}if(license)await writeFile(`vendor/LICENSE-${pkg}.txt`,license);}
console.log('Browser dependencies bundled locally.');
