import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, devices, webkit } from 'playwright-core';

const engine = process.env.QA_BROWSER;
const backend = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
const provider = 'https://model-qa.invalid/v1';
const password = 'browser-fixture-admin-password';
const credential = 'browser-fixture-model-key';
const salt = '00112233aabbccdd';
const digest = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 1000, 32, 'sha256').toString('hex');
const authFixture = JSON.stringify({ salt, iterations: 1000, hash: digest });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.wasm':'application/wasm' };
const workspace = process.cwd();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/chatgpt/')) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(url.pathname.slice('/chatgpt/'.length));
    if (relative.split('/').some(piece => piece.startsWith('.'))) { res.writeHead(404).end(); return; }
    const target=resolve(workspace, relative.endsWith('/') ? relative + 'index.html' : relative || 'index.html');
    if (!target.startsWith(workspace + sep)) { res.writeHead(404).end(); return; }
    let file=target, bytes=await readFile(target).catch(()=>null);
    if (!bytes && !extname(relative)) { file='index.html'; bytes=await readFile(file); }
    if (!bytes) { res.writeHead(404).end(); return; }
    if (relative === 'native-client/site-account.mjs') {
      bytes = Buffer.from(bytes.toString('utf8').replace(/^const offlineAdminVerifier\s*=.*$/m, 'const offlineAdminVerifier = ' + authFixture + ';'));
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
});
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin='http://127.0.0.1:' + server.address().port, home=origin+'/chatgpt/';
  const browser = engine === 'webkit-ipad' ? await webkit.launch() : await chromium.launch({ channel: engine==='edge' ? 'msedge' : 'chrome' });
  try {
    const context = await browser.newContext({
      ...(engine==='webkit-ipad' ? devices['iPad (gen 7)'] : {}), locale:'zh-CN', serviceWorkers:'block',
    });
    const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'content-type, authorization, x-chat-request-id'};
    let authPosts=0, modelPosts=0;
    await context.route(backend+'/**', async route => {
      if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
      if(new URL(route.request().url()).pathname==='/auth/login') authPosts++;
      return route.fulfill({status:503,headers:{...cors,'Content-Type':'application/json'},body:'{"error":{"code":"SERVICE_UNAVAILABLE"}}'});
    });
    await context.route(provider+'/**', async route => {
      const req=route.request();
      if(req.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
      assert.equal(req.method(),'POST');
      assert.equal(req.url(),provider+'/responses');
      assert.equal(req.headers().authorization,'Bearer '+credential);
      const body=req.postDataJSON();
      assert.match(JSON.stringify(body.input),/Direct fallback validation/);
      assert.equal(body.stream,true);
      modelPosts++;
      const text = 'ADMIN-DIRECT-QA-' + modelPosts;
      const response={model:body.model,reasoning:body.reasoning,status:'completed',
        output:[{type:'message',role:'assistant',id:'qa-direct-' + modelPosts,phase:'final_answer',content:[{type:'output_text',text}]}]};
      return route.fulfill({status:200,headers:{...cors,'Content-Type':'text/event-stream'},
        body:'data: '+JSON.stringify({type:'response.completed',response})+'\n\n'});
    });
    await context.route(url=>url.origin===origin&&/\/assets\/633146\.[a-f0-9]+\.js$/.test(url.pathname),async route=>{await delay(1200);await route.continue();});
    await context.addInitScript(()=>{
      globalThis.__qaProgress=[];
      new MutationObserver(()=>{
        const gauge=document.querySelector('#site-load-progress [role=progressbar]');
        if(gauge)globalThis.__qaProgress.push(Number(gauge.getAttribute('aria-valuenow')));
      }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-valuenow']});
    });
    const page=await context.newPage();
    const editor=()=>page.locator('#prompt-textarea[contenteditable="true"], .ProseMirror[contenteditable="true"]').filter({visible:true}).first();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.name+': '+error.message.slice(0,130)));
    try {
      const active=await fetch(home+'native-client/active.json').then(r=>r.json());
      await page.goto(home+'auth/login/?model_connection=1',{waitUntil:'domcontentloaded',timeout:40000});
      await page.locator('#site-username').fill('TYC');
      await page.locator('#site-password').fill(password);
      await page.getByRole('button',{name:'继续',exact:true}).click();
      await page.locator('#site-model-url').fill(provider);
      await page.locator('#site-model-key').fill(credential);
      await page.getByRole('button',{name:'保存连接并返回',exact:true}).click();
      await page.waitForURL(new URL(home).href,{timeout:45000});
      await editor().waitFor({state:'visible',timeout:45000});
      await page.locator('#site-load-progress').waitFor({state:'hidden',timeout:14000});
      const progress=await page.evaluate(()=>({release:window.__CHATGPT_REPLICA_ENV__?.release,steps:[...new Set(window.__qaProgress)]}));
      assert.equal(progress.release,active.release);
      assert.ok(progress.steps.some(value=>value>0&&value<100),'No measured intermediate progress');
      assert.ok(progress.steps.every((value,index,a)=>!index||value>=a[index-1]));
      await page.reload({waitUntil:'domcontentloaded',timeout:45000});
      await editor().waitFor({state:'visible',timeout:45000});
      const responseText = number => page.locator('main').getByText('ADMIN-DIRECT-QA-' + number, {exact: true}).first();
      async function sendMessage(text, expected) {
        const started = performance.now();
        await editor().fill(text);
        const send=page.locator('#composer-submit-button, button[data-testid="send-button"], button[aria-label="发送"], button[aria-label="发送消息"]').filter({visible:true}).first();
        if(await send.isVisible()&&await send.isEnabled()) await send.click();
        else await editor().press('Enter');
        await responseText(expected).waitFor({state:'visible',timeout:40000});
        return Math.round(performance.now() - started);
      }
      const firstReplyMs = await sendMessage('Direct fallback validation', 1);
      const conversationUrl = page.url();
      await page.reload({waitUntil:'domcontentloaded',timeout:45000});
      await responseText(1).waitFor({state:'visible',timeout:45000});
      await editor().waitFor({state:'visible',timeout:45000});
      const secondReplyMs = await sendMessage('Direct fallback validation second turn', 2);
      assert.equal(page.url(), conversationUrl);
      assert.equal(authPosts, 1);
      assert.equal(modelPosts, 2);
      console.log('Browser QA '+JSON.stringify({engine,release:active.release,progress,authPosts,modelPosts,reloadedReply:true,sameThread:true,firstReplyMs,secondReplyMs}));
      if (process.env.QA_INSPECT_ENTRIES === '1') {
        const surfaces = [];
        async function inspect(name, open, labels) {
          try {
            await open();
            const seen = {};
            for (const [key, pattern] of Object.entries(labels)) {
              const element = page.getByText(pattern).filter({visible:true}).first();
              await element.waitFor({state:'visible',timeout:4500}).catch(()=>{});
              seen[key] = await element.isVisible();
            }
            surfaces.push({name, documentPath:new URL(page.url()).pathname, seen});
          } catch (cause) { surfaces.push({name, failure:cause.name}); }
        }
        const goto = path => page.goto(home + path,{waitUntil:'domcontentloaded',timeout:20000});
        await inspect('usage', () => goto('settings/usage'), {adminPro: /Pro\s*\$?500/});
        await inspect('personal-pricing', () => goto('#pricing'), {go: /^Go$/, pro: /^Pro$/, dotBenefit: /含站内 Dot/});
        await inspect('codex', () => goto('codex'), {codex: /^Codex$/, project: /项目|project/i});
        await inspect('dot', async () => {
          await goto('');
          await page.getByText('Dot',{exact:true}).filter({visible:true}).first().click({timeout:10000});
        }, {dot: /^Dot$/, tools: /语音|日记|自动化|电脑|voice|journal|automation|computer/i});
        console.log('Native entry QA '+JSON.stringify({engine,release:active.release,surfaces}));
      }
    } finally {
      const diagnostic=await page.evaluate(()=>({path:location.pathname,startup:window.__CHATGPT_STARTUP_ERROR__,body:document.body.innerText.slice(0,190)})).catch(()=>null);
      console.log('Browser diagnostic '+JSON.stringify({engine,errors:errors.slice(-6),diagnostic}));
    }
  } finally { await browser.close(); }
} finally { server.close(); }
