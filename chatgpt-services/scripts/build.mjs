import fs from 'node:fs/promises';
await fs.mkdir('dist/server',{recursive:true});
await fs.mkdir('dist/.openai',{recursive:true});
await fs.copyFile('worker/service.mjs','dist/server/index.js');
await fs.copyFile('worker/chat-sync.mjs','dist/server/chat-sync.mjs');
await fs.copyFile('worker/site-inference.mjs','dist/server/site-inference.mjs');
await fs.copyFile('worker/inference-recovery.mjs','dist/server/inference-recovery.mjs');
await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built account, inference, relay and conversation sync backend');
