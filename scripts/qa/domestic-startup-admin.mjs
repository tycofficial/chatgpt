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
    const codexPrompts = [
      'Codex browser regression first turn CDX-ENTRY-01',
      'Codex browser regression follow-up CDX-ENTRY-02',
    ];
    const codexRequests = [];
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
      const turn = modelPosts + 1;
      if (turn <= 2) {
        assert.match(JSON.stringify(body.input), /Direct fallback validation/);
      } else {
        const prompt = codexPrompts[turn - 3];
        assert.ok(process.env.QA_NATIVE_CODEX_ENTRY === '1' && prompt, 'Unexpected or duplicate inference POST');
        const currentUser = body.input?.findLast?.(item => item.role === 'user');
        assert.ok(currentUser && JSON.stringify(currentUser).includes(prompt), 'Wrong Codex turn or duplicate prompt');
        assert.equal(body.model, 'gpt-6.2-sol');
        assert.equal(body.reasoning?.effort, 'low');
        const hasPreviousTurn = JSON.stringify(body.input).includes(codexPrompts[0]) &&
          JSON.stringify(body.input).includes('ADMIN-DIRECT-QA-3');
        if (turn === 4) assert.equal(hasPreviousTurn, true, 'The same Codex thread omitted its prior turn');
        codexRequests.push({ turn: turn - 2, model: body.model, effort: body.reasoning.effort, hasPreviousTurn });
      }
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
      if (process.env.QA_NATIVE_DOT_JOURNAL === '1') {
        const controls = () => page.evaluate(() => [...document.querySelectorAll('button, a, [role="menuitem"], [contenteditable="true"], textarea')]
          .filter(node => node.getClientRects().length && getComputedStyle(node).visibility === 'visible')
          .map(node => ({
            tag: node.tagName, role: node.getAttribute('role'), aria: node.getAttribute('aria-label'), title: node.getAttribute('title'),
            testId: node.getAttribute('data-testid'), placeholder: node.getAttribute('data-placeholder') ?? node.getAttribute('placeholder'),
            name: (node.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 62), href: node.getAttribute('href'),
          })).slice(0, 75));
        const report = async stage => console.log('Native Dot ' + stage + ' ' + JSON.stringify({
          path: new URL(page.url()).pathname, controls: await controls(),
        }));
        const clickDot = page.getByRole('button', { name: 'Dot', exact: true }).filter({ visible: true }).first();
        await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await clickDot.click({ timeout: 30000 });
        await page.waitForURL(url => /^\/chatgpt\/dots\/local-dot-[a-f0-9-]+\/?$/.test(url.pathname), { timeout: 30000 });
        const room = page.url();
        await report('entry');
        const composer = page.getByRole('textbox', { name: '消息', exact: true }).filter({ visible: true }).first();
        await composer.waitFor({ state: 'visible', timeout: 30000 });
        await report('room-ready');
        const newNote = 'DOT-JOURNAL-CREATE-0237';
        const editedNote = 'DOT-JOURNAL-EDITED-0237';
        const findText = value => page.getByText(value, { exact: true }).filter({ visible: true }).last();
        async function submitDot(text, receipt) {
          await composer.fill(text);
          const send = page.getByRole('button', { name: /^(?:发送|发送消息|Send|Send message)$/i }).filter({ visible: true }).last();
          if (await send.isVisible() && await send.isEnabled()) await send.click();
          else await composer.press('Enter');
          const result = findText(receipt);
          await result.waitFor({ state: 'visible', timeout: 20000 });
          assert.equal(page.url(), room);
          return (await result.innerText()).trim();
        }
        async function reloadRoom() {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
          await composer.waitFor({ state: 'visible', timeout: 30000 });
          assert.equal(page.url(), room);
        }

        const add = await submitDot('/journal add ' + newNote, /^已保存日记 · [0-9a-f-]+$/);
        const id = add.match(/^已保存日记 · ([0-9a-f-]{36})$/)?.[1];
        assert.ok(id, 'No saved journal entry ID');
        await report('journal-added');
        const button = name => page.getByRole('button', { name }).filter({ visible: true }).first();
        const panelControl = name => button(name).or(page.getByRole('link', { name }).filter({ visible: true }).first())
          .or(page.getByRole('menuitem', { name }).filter({ visible: true }).first()).first();
        const journal = () => panelControl(/日记|日志|Journal/i);
        async function findDotPanel(label, stage) {
          if (await label().isVisible()) return label();
          const actions = button(/^你的 dot 操作$/i);
          await actions.click({ timeout: 9500 });
          await label().waitFor({ state: 'visible', timeout: 1900 }).catch(() => {});
          await report(stage + '-actions-menu');
          if (await label().isVisible()) return label();
          await page.keyboard.press('Escape');
          const profile = button(/打开\s*你的 dot 的个人资料/i);
          await profile.click({ timeout: 9500 });
          await label().waitFor({ state: 'visible', timeout: 2400 }).catch(() => {});
          await report(stage + '-profile');
          return await label().isVisible() ? label() : null;
        }
        const journalButton = await findDotPanel(journal, 'journal');
        let nativeJournalPanel = false;
        if (journalButton) {
          const triggerLabel = await journalButton.getAttribute('aria-label') ?? (await journalButton.innerText()).trim();
          await journalButton.click();
          await findText(newNote).waitFor({ state: 'visible', timeout: 6500 }).catch(() => {});
          nativeJournalPanel = await findText(newNote).isVisible();
          console.log('Native Dot journal panel ' + JSON.stringify({ triggerLabel, listedEntry: nativeJournalPanel }));
          await report('journal-panel');
        }
        if (page.url() !== room) await page.goto(room, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await reloadRoom();
        await submitDot('/journal list', id + ' · ' + newNote);
        await submitDot('/journal edit ' + id + ' ' + editedNote, '已修改日记 · ' + id);
        await reloadRoom();
        await submitDot('/journal list', id + ' · ' + editedNote);
        await submitDot('/journal delete ' + id, '已删除日记 · ' + id);
        await reloadRoom();
        await submitDot('/journal list', '日记里还没有条目。');
        assert.equal(modelPosts, 2, 'A local journal command unexpectedly triggered model inference');
        console.log('Native Dot journal CRUD QA ' + JSON.stringify({ release: active.release, room: new URL(room).pathname,
          composerCommands: true, created: true, edited: true, deleted: true, reloads: 3, sameRoom: true,
          nativeJournalPanel, dotModelPosts: 0 }));

        const task = 'Dot manual browser QA 0237';
        const schedule = await submitDot('/automation add ' + task + ' | 0 | Reply with the automation test marker.',
          /已创建自动化 · [a-f0-9-]{36}/);
        const scheduleId = schedule.match(/已创建自动化 · ([a-f0-9-]{36})/)?.[1];
        assert.ok(scheduleId, 'No saved native Dot automation ID');
        await reloadRoom();
        await submitDot('/automation list', scheduleId + ' · ' + task + ' · 启用');
        const nativeAutomation = () => panelControl(/自动化|定时任务|计划任务|Schedule|Automations/i);
        const scheduleButton = await findDotPanel(nativeAutomation, 'automation');
        let schedulePanelListed = false;
        if (scheduleButton) {
          const triggerLabel = await scheduleButton.getAttribute('aria-label') ?? (await scheduleButton.innerText()).trim();
          await scheduleButton.click();
          await findText(task).waitFor({ state: 'visible', timeout: 6500 }).catch(() => {});
          schedulePanelListed = await findText(task).isVisible();
          console.log('Native Dot automation panel ' + JSON.stringify({ triggerLabel, listedEntry: schedulePanelListed }));
          await report('automation-panel');
        }
        if (page.url() !== room) await page.goto(room, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await reloadRoom();
        await submitDot('/automation off ' + scheduleId, '已停用自动化。');
        await reloadRoom();
        await submitDot('/automation list', scheduleId + ' · ' + task + ' · 停用');
        assert.equal(modelPosts, 2, 'Automation setup or disable unexpectedly invoked a model');
        console.log('Native Dot automation persistence QA ' + JSON.stringify({ release: active.release, created: true,
          browserManual: true, reloads: 3, enabledAfterCreate: true, disabledAfterReload: true, schedulePanelListed }));
      }
      if (process.env.QA_NATIVE_CODEX_ENTRY === '1') {
        const modeLabel = /切换.*模式|切換.*模式|Switch mode/i;
        const switcher = () => page.getByRole('button', { name: modeLabel }).filter({ visible: true }).first();
        const selectedMode = () => page.evaluate(() => history.state?.usr?.sidebarProductMode ?? history.state?.sidebarProductMode ?? null);
        const report = async stage => {
          const data = await page.evaluate(async () => {
            const isVisible = node => !!node.getClientRects().length && getComputedStyle(node).visibility === 'visible';
            const labels = [...document.querySelectorAll('button, a, [role="menuitem"], [role="button"]')]
              .filter(isVisible).map(node => ({
                role: node.getAttribute('role') ?? node.tagName.toLowerCase(),
                aria: node.getAttribute('aria-label'), title: node.getAttribute('title'),
                testId: node.getAttribute('data-testid'), expanded: node.getAttribute('aria-expanded'),
                text: (node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50),
                href: node.getAttribute('href'),
              })).filter(node => node.aria || node.text || node.title);
            let flags;
            try {
              const script = document.getElementById('client-bootstrap');
              flags = JSON.parse(JSON.parse(script.textContent).statsigPayload);
            } catch {}
            const gates = Object.fromEntries(['3999836663', '4019944087', '515412992', '3085093835']
              .map(key => [key, flags?.feature_gates?.[key]?.value ?? null]));
            const state = history.state?.usr ?? history.state;
            return { path: location.pathname, mode: state?.sidebarProductMode ?? null,
              gates, controls: labels.slice(0, 65) };
          });
          console.log('Native mode ' + stage + ' ' + JSON.stringify(data));
        };
        await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await editor().waitFor({ state: 'visible', timeout: 35000 });
        await report('homepage');
        if (!await switcher().isVisible()) {
          const openSidebar = page.locator('[data-slate-sidebar-toggle][aria-expanded="false"]').filter({ visible: true }).first();
          const labeledSidebar = page.getByRole('button', { name: /(?:打开|展开|開啟).*侧[边欄栏]|Open sidebar|Show sidebar/i }).filter({ visible: true }).first();
          if (await openSidebar.isVisible()) await openSidebar.click();
          else if (await labeledSidebar.isVisible()) await labeledSidebar.click();
        }
        await report('sidebar');
        const explore = page.getByRole('button', { name: /^(?:探索|Explore)(?:\s|$)/i }).filter({ visible: true }).first();
        const hasRail = await explore.isVisible();
        let triggerLabel;
        let codex;
        if (hasRail) {
          triggerLabel = (await explore.getAttribute('aria-label') ?? (await explore.innerText()).trim()) || 'Explore';
          await explore.click();
          await report('explore');
          const row = page.locator('[data-explore-row]').filter({ has: page.getByText('Codex', { exact: true }), visible: true }).first();
          const menu = page.getByRole('menuitem').filter({ hasText: /(?:^|\s)Codex(?:$|\s)/i, visible: true }).first();
          const label = page.getByText('Codex', { exact: true }).filter({ visible: true }).first();
          await row.or(menu).or(label).first().waitFor({ state: 'visible', timeout: 11000 });
          codex = await row.isVisible() ? row.getByText('Codex', { exact: true }).first() : await menu.isVisible() ? menu : label;
        } else {
          await switcher().waitFor({ state: 'visible', timeout: 9500 });
          triggerLabel = await switcher().getAttribute('aria-label');
          await switcher().click();
          await report('mode-menu');
          codex = page.getByRole('menuitem').filter({ hasText: /(?:^|\s)Codex(?:$|\s)/i, visible: true }).first();
        }
        await codex.waitFor({ state: 'visible', timeout: 9500 });
        const codexItem = (await codex.innerText()).replace(/\s+/g, ' ').trim();
        await codex.click();
        await page.waitForFunction(() => {
          const state = history.state?.usr ?? history.state;
          return state?.sidebarProductMode === 'codex';
        }, undefined, { timeout: 15000 });
        await editor().waitFor({ state: 'visible', timeout: 15000 });
        const codexMode = await selectedMode();
        assert.equal(codexMode, 'codex');
        await report('codex');
        const homePath = new URL(page.url()).pathname.replace(/\/+$/, '');
        const firstCodexReplyMs = await sendMessage(codexPrompts[0], 3);
        const codexThread = new URL(page.url());
        assert.equal(codexThread.origin, origin);
        assert.ok(codexThread.pathname.startsWith('/chatgpt/'));
        assert.notEqual(codexThread.pathname.replace(/\/+$/, ''), homePath, 'Codex never opened the saved thread');
        assert.equal(modelPosts, 3);
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
        await responseText(3).waitFor({ state: 'visible', timeout: 40000 });
        await editor().waitFor({ state: 'visible', timeout: 30000 });
        assert.equal(page.url(), codexThread.href, 'Reload reopened a different Codex thread');
        assert.equal(await selectedMode(), 'codex', 'Reload selected a different product mode');
        assert.equal(modelPosts, 3, 'Reload replayed the first Codex response request');
        const secondCodexReplyMs = await sendMessage(codexPrompts[1], 4);
        assert.equal(page.url(), codexThread.href, 'Codex follow-up opened another thread');
        assert.equal(modelPosts, 4);
        assert.equal(codexRequests.length, 2);
        for (const [role, texts] of [['user', codexPrompts], ['assistant', ['ADMIN-DIRECT-QA-3', 'ADMIN-DIRECT-QA-4']]]) {
          for (const expected of texts) {
            const copies = page.locator('main').getByText(expected, { exact: true }).filter({ visible: true });
            const messageRoles = await copies.evaluateAll(nodes => nodes.flatMap(node => {
              const headings = [...node.closest('main').querySelectorAll('h4[data-conversation-role]')];
              const speaker = headings.findLast(heading => heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
              return speaker ? [speaker.dataset.conversationRole] : [];
            }));
            assert.deepEqual(messageRoles, [role], 'Missing or duplicate visible Codex message: ' + expected);
          }
        }
        console.log('Native Codex two-turn QA ' + JSON.stringify({ release: active.release,
          threadPath: codexThread.pathname, nativeMain: true, preservedMode: await selectedMode(),
          firstCodexReplyMs, secondCodexReplyMs, codexRequests, modelPosts, reloadedReply: true, sameThread: true,
          visibleUserMessages: 2, visibleAssistantReplies: 2 }));
        let workItem = null;
        if (await switcher().isVisible()) {
          await switcher().click();
          const work = page.getByRole('menuitem').filter({ hasText: /ChatGPT(?: Work)?|工作/i, visible: true }).first();
          await work.waitFor({ state: 'visible', timeout: 9500 });
          workItem = (await work.innerText()).replace(/\s+/g, ' ').trim();
          await work.click();
          await editor().waitFor({ state: 'visible', timeout: 15000 });
          await report('work');
        }
        console.log('Native Codex click QA ' + JSON.stringify({ release: active.release, rail: hasRail,
          triggerLabel, codexItem, codexMode, workItem, currentMode: await selectedMode(), path: new URL(page.url()).pathname }));
      }
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
        const personal = surfaces.at(-1);
        const beforeControls = await page.getByRole('button').filter({visible:true}).allTextContents();
        const plans = beforeControls.map(t=>t.trim()).filter(t=>/套餐|plan|compare|更多|更少/i.test(t)).slice(-20);
        console.log('Native Go initial '+JSON.stringify({seen:personal.seen,plans}));
        let expandedInTest=false;
        if(!personal.seen.go){
          const more=page.getByRole('button',{name:/^(?:查看(?:所有|全部|更多|其他).*(?:套餐|方案|计划)|(?:查看)?全部套餐|(?:See|View|Show) (?:all|more).*plans)$/i}).filter({visible:true}).first();
          if(await more.isVisible()){await more.click();expandedInTest=true;}
        }
        await page.getByText('Go',{exact:true}).filter({visible:true}).first().waitFor({state:'visible',timeout:10000});
        assert.equal(personal.seen.pro,true);
        assert.equal(personal.seen.dotBenefit,true);
        const goAction = page.getByRole('button',{name:'查看官方 Go 套餐',exact:true}).filter({visible:true}).first();
        await goAction.waitFor({state:'visible',timeout:10000});
        const referenceCard = await goAction.evaluate(button=>{
          for(let node=button.parentElement;node&&node!==document.body;node=node.parentElement){
            const text=node.innerText??'';
            if(text.split('\n').some(line=>line.trim()==='Go')&&text.includes('美元参考价'))return text;
          }
          return '';
        });
        assert.match(referenceCard, /(?:US\$|\$)\s*8(?:[.,]00)?\b|8(?:[.,]00)?\s*(?:USD|美元)/);
        const offeredPlans = await page.evaluate(()=>['Free','Go','Plus','Pro'].filter(plan=>
          [...document.querySelectorAll('h2,h3,h4,[role=heading]')].some(node=>node.textContent.trim()===plan&&node.getClientRects().length)));
        console.log('Native Go QA '+JSON.stringify({release:active.release,openedWithoutExpanding:!expandedInTest,goReference:true,hasOfficialPriceAction:true,offeredPlans}));
        await inspect('dot', async () => {
          await goto('');
          await page.getByText('Dot',{exact:true}).filter({visible:true}).first().click({timeout:10000});
        }, {dot: /^Dot$/, tools: /语音|日记|自动化|电脑|voice|journal|automation|computer/i});
        console.log('Native entry QA '+JSON.stringify({engine,release:active.release,surfaces}));
      }
    } finally {
      const diagnostic=await page.evaluate(()=>({path:location.pathname,startup:window.__CHATGPT_STARTUP_ERROR__,body:document.body.innerText.slice(0,190),main:document.querySelector('main')?.innerText.slice(-650)})).catch(()=>null);
      console.log('Browser diagnostic '+JSON.stringify({engine,errors:errors.slice(-6),diagnostic}));
    }
  } finally { await browser.close(); }
} finally { server.close(); }
