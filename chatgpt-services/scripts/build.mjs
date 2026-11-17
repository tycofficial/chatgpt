import fs from 'node:fs/promises';
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('worker/service.mjs','dist/server/index.js');
await fs.copyFile('worker/chat-sync.mjs','dist/server/chat-sync.mjs');
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built account auth, relay and conversation sync backend');
