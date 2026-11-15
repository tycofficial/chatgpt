import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), port=Number(process.env.PORT||5173);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm','.map':'application/json'};
http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');let p=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}if((await stat(p)).isDirectory())p=path.join(p,'index.html');const content=await readFile(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-cache'}).end(content);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
