/** Local preview at the same basename as the GitHub Pages workspace. */
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prefix='/chatgpt/';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.avif':'image/avif','.webm':'video/webm','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4400');
 if(url.pathname==='/'){res.writeHead(307,{'Location':prefix+url.search}).end();return;}
 if(url.pathname===prefix.slice(0,-1)){res.writeHead(308,{'Location':prefix+url.search}).end();return;}
 if(!['GET','HEAD'].includes(req.method)||!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
 let relative;try{relative=decodeURIComponent(url.pathname.slice(prefix.length));}catch{res.writeHead(400).end();return;}
 if(relative===''||relative.endsWith('/'))relative+='index.html';
 if(relative.split('/').some(s=>s.startsWith('.'))||relative.startsWith('node_modules/')){res.writeHead(404).end();return;}
 const file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}catch{if(req.headers.accept?.includes('text/html')){res.writeHead(404,{'Content-Type':'text/html','Cache-Control':'no-store'}).end(await fs.readFile(path.join(root,'404.html')));}else res.writeHead(404).end();}
});
server.listen(4400,'127.0.0.1',()=>console.log('Workspace Pages-layout preview: http://127.0.0.1:4400/chatgpt/'));
