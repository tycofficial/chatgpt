
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as wait } from 'node:timers/promises';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { createDotDesktopServer } from '../../dot-desktop-provider/index.mjs';
import { createLinuxDesktopRuntime } from '../../dot-desktop-provider/linux-desktop.mjs';
import { createSqliteD1 } from '../../chatgpt-services/tests/chat-sync-fixture.mjs';
import worker from '../../chatgpt-services/worker/service.mjs';

const run = promisify(execFile);
const root = process.cwd();
const temp = await mkdtemp(join(tmpdir(), 'native-dot-video-'));
const token = randomBytes(32).toString('hex');
const log = (stage, value) => console.log(JSON.stringify({stage, ...value}));
const mime = new Map(Object.entries({
  '.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.wasm':'application/wasm','.woff2':'font/woff2',
}));
const displayEvents = [];
const inputs = [];
const receipts = [];
const publisher = String.raw`
import json
import tkinter as tk

root = tk.Tk()
root.overrideredirect(True)
root.geometry("1024x720+0+0")
canvas = tk.Canvas(root, width=1024, height=720, highlightthickness=0)
canvas.pack(fill="both", expand=True)
panel = canvas.create_rectangle(0, 0, 1024, 720, fill="#d72a57", outline="")
canvas.create_text(512, 100, text="Isolated Dot native viewer QA", font=("TkDefaultFont", 30), fill="white")
frame = 0
def draw():
    global frame
    frame += 1
    canvas.itemconfigure(panel, fill="#d72a57" if frame % 2 else "#2049c9")
    root.after(350, draw)
def report(event, name):
    print(json.dumps({"kind": name, "x": event.x_root, "y": event.y_root, "key": event.keysym}), flush=True)
canvas.bind("<ButtonPress-1>", lambda event: report(event, "button"))
root.bind("<KeyPress>", lambda event: report(event, "key"))
root.update()
root.focus_force()
canvas.focus_set()
print(json.dumps({"kind": "ready"}), flush=True)
draw()
root.mainloop()
`;

function readyProcess(binary, args, output) {
  const child = spawn(binary, args, { stdio: ['pipe','pipe','pipe'] });
  const lines = createInterface({ input: child.stdout });
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stderr.resume();
  lines.on('line', line => output(line));
  return { child, async close() { lines.close(); child.kill(); await closed; } };
}

async function openGraphicsFixture() {
  if (!process.env.DISPLAY || !process.env.XAUTHORITY) throw Error('An isolated xvfb-run display is required');
  const painted = Promise.withResolvers();
  const surface = readyProcess('/usr/bin/python3', ['-u','-c',publisher], line => {
    const data = JSON.parse(line);
    if (data.kind === 'ready') painted.resolve();
    else if (displayEvents.length < 48) displayEvents.push(data);
  });
  const ready = Promise.withResolvers();
  let pending, tail = Promise.resolve();
  const control = readyProcess('/usr/bin/python3', ['-u',resolve(root,'dot-desktop-provider/x11.py')], line => {
    const reply = JSON.parse(line);
    if (reply.ready === true) ready.resolve();
    else if (reply.ok) pending?.resolve(reply);
    else pending?.reject(Error('X11 returned ' + (reply.error ?? 'an invalid acknowledgement')));
  });
  const deadline = (promise, label) => Promise.race([promise,wait(7000, undefined, { ref: false }).then(() => { throw Error(label); })]);
  const close = () => Promise.allSettled([surface.close(),control.close()]);
  try {
    await deadline(Promise.all([painted.promise, ready.promise]), 'X11 graphics fixture startup timed out');
  } catch (error) {
    await close();
    throw error;
  }
  function send(action) {
    const result = tail.then(async () => {
      pending = Promise.withResolvers();
      try {
        control.child.stdin.write(JSON.stringify(action) + '\n');
        return await deadline(pending.promise, 'X11 control timed out');
      } finally { pending = null; }
    });
    tail = result.catch(() => {});
    return result;
  }
  return {
    frame: async () => Buffer.from((await send({type:'frame'})).png, 'base64'),
    async input(input) {
      await send(input);
      if (inputs.length < 80) inputs.push(input);
    },
    async task() { throw Object.assign(Error('This graphics fixture declines all remote task code.'), {status:503,code:'QA_GRAPHICS_ONLY'}); },
    close,
  };
}

let provider, site, browser, database;
let origin;
const jobs = new Set();
const background = {waitUntil(promise) {
  jobs.add(promise);
  void promise.catch(() => {}).finally(() => jobs.delete(promise));
}};
try {
  let strictRuntime;
  try { await createLinuxDesktopRuntime().probe(); strictRuntime = {sandboxReady:true}; }
  catch (cause) { strictRuntime = {sandboxReady:false,code:cause.code ?? cause.name}; }
  log('linux-runtime-probe',strictRuntime);
  provider = createDotDesktopServer({token,maxDesktops:1,runtime:{start:openGraphicsFixture}});
  const providerOrigin = await provider.listen(0);
  database = createSqliteD1();
  const env = {DB:database,DOT_COMPUTER_PROVIDER_ORIGIN:providerOrigin,DOT_COMPUTER_PROVIDER_TOKEN:token};
  const key = join(temp,'loopback-key.pem'), cert = join(temp,'loopback-cert.pem');
  await run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=127.0.0.1',
    '-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert]);
  site = createServer({key:await readFile(key),cert:await readFile(cert)},async (request, reply) => {
    try {
      const url = new URL(request.url,origin);
      if (url.pathname.startsWith('/chatgpt/')) {
        const relative = decodeURIComponent(url.pathname.slice('/chatgpt/'.length));
        if (relative.split('/').some(part=>part.startsWith('.'))) return reply.writeHead(404).end();
        let file = resolve(root,relative===''||relative.endsWith('/') ? relative+'index.html' : relative);
        if (!file.startsWith(root+sep)) return reply.writeHead(404).end();
        let bytes = await readFile(file).catch(()=>null);
        if (!bytes && !extname(relative)) { file = resolve(root,'index.html'); bytes = await readFile(file); }
        if (!bytes) return reply.writeHead(404).end();
        reply.writeHead(200,{'Content-Type':mime.get(extname(file))??'application/octet-stream','Cache-Control':'no-store'});
        return reply.end(request.method==='HEAD' ? undefined : bytes);
      }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const response = await worker.fetch(new Request(url,{method:request.method,headers:request.headers,body}),env,background);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (url.pathname.startsWith('/dot-computer/v1/')) {
        if (request.method==='GET' && url.pathname.endsWith('/frame') && response.ok) {
          assert.equal(bytes.readUInt32BE(16),1024);
          assert.equal(bytes.readUInt32BE(20),720);
        }
        receipts.push({method:request.method,route:url.pathname.replace(/[a-f0-9-]{36}/gi,'<id>'),status:response.status,
          ...(url.pathname.endsWith('/frame')&&response.ok&&{width:1024,height:720})});
      }
      reply.writeHead(response.status,Object.fromEntries(response.headers));
      reply.end(bytes);
    } catch (cause) {
      log('qa-http-error',{error:cause.message.slice(0,120)});
      if (!reply.headersSent) reply.writeHead(500);
      reply.end();
    }
  });
  await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));
  origin = 'https://127.0.0.1:' + site.address().port;
  const home = origin + '/chatgpt/';
  await run(process.execPath,['scripts/build-native-client.mjs','--activate'],{
    env:{...process.env,CHATGPT_SITE_API_ORIGIN:origin},maxBuffer:8000000,
  });
  const checked = await run(process.execPath,['scripts/check-native-client.mjs'],{maxBuffer:8000000});
  const release = JSON.parse(checked.stdout.trim());
  assert.equal(release.canonicalHashesVerified,true);
  browser = await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context = await browser.newContext({ignoreHTTPSErrors:true,locale:'zh-CN',viewport:{width:1400,height:1000},serviceWorkers:'block'});

  // Force a real encoded downscale so the coordinate regression is reproducible.
  await context.addInitScript(() => {
    const setLocalDescription = RTCPeerConnection.prototype.setLocalDescription;
    RTCPeerConnection.prototype.setLocalDescription = async function (...args) {
      const result = await setLocalDescription.apply(this,args);
      for (const sender of this.getSenders()) {
        if (sender.track?.kind !== 'video' || !sender.track.canvas) continue;
        const params = sender.getParameters();
        if (!params.encodings.length) continue;
        params.encodings[0].scaleResolutionDownBy = 4;
        try { await sender.setParameters(params); window.__qaDownscaleApplied = true; }
        catch (cause) { window.__qaDownscaleError = cause.name; }
      }
      return result;
    };
  });
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',cause=>errors.push(cause.message.split('\n')[0].slice(0,120)));
  const button = name => page.getByRole('button',{name}).filter({visible:true}).first();
  const responseFor = route => page.waitForResponse(response=>new URL(response.url()).pathname===route&&response.request().method()==='POST',{timeout:26000});
  await page.goto(home+'auth/signup/',{waitUntil:'domcontentloaded'});
  await page.locator('#site-username').fill('dot_graphics_qa');
  await page.locator('#site-password').fill(randomBytes(12).toString('hex'));
  const created = responseFor('/auth/register');
  await button('继续').click();
  assert.equal((await created).status(),200);
  await page.waitForURL(home,{timeout:45000});
  await page.goto(home+'site-plans/',{waitUntil:'domcontentloaded'});
  const plans = button(/查看所有套餐|所有套餐|See all plans/i);
  if (await plans.isVisible()) await plans.click();
  const trial = responseFor('/auth/site-trial');
  await page.getByRole('button',{name:'免费试用',exact:true}).filter({visible:true}).last().click({timeout:25000});
  const trialReceipt = await trial;
  assert.equal(trialReceipt.status(),200);
  assert.equal((await trialReceipt.json()).user.planType,'pro');
  await page.goto(home,{waitUntil:'domcontentloaded'});
  await button(/^Dot$/).click({timeout:35000});
  await page.waitForURL(url=>/^\/chatgpt\/dots\/local-dot-[a-f0-9-]+\/?$/.test(url.pathname),{timeout:26000});
  await page.locator('[data-thread-summary-panel-toggle][data-orbit-profile-trigger]').filter({visible:true}).first().click({timeout:18000});
  await button(/你的 dot 的电脑|Your dot.s computer/i).click({timeout:18000});
  const video = page.locator('video').filter({visible:true}).first();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('video')).some(media=>media.getClientRects().length&&media.readyState>=2&&media.videoWidth>0),undefined,{timeout:55000});
  const sample = await video.evaluate(async media=>{
    const started = performance.now();
    const colors = new Set(), widths=new Set();
    const canvas=document.createElement('canvas');
    canvas.width=1; canvas.height=1;
    const pixels=canvas.getContext('2d',{willReadFrequently:true});
    let frames=0, activeTrack=false, id;
    await new Promise(resolve=>{
      const timer=setTimeout(()=>{if(id!==undefined) media.cancelVideoFrameCallback(id); resolve();},5500);
      function frame() {
        if(media.readyState>=2&&media.videoWidth>0&&media.videoHeight>0) {
          frames++;
          activeTrack=media.srcObject?.getVideoTracks()[0]?.readyState==='live';
          widths.add(media.videoWidth+'x'+media.videoHeight);
          pixels.drawImage(media,0,0,media.videoWidth,media.videoHeight,0,0,1,1);
          const [red,,blue]=pixels.getImageData(0,0,1,1).data;
          if(Math.abs(red-blue)>25) colors.add(red>blue?'warm':'cool');
        }
        id=media.requestVideoFrameCallback(frame);
      }
      id=media.requestVideoFrameCallback(frame);
    });
    return {frames,colors:[...colors],dimensions:[...widths],activeTrack,elapsedMs:Math.round(performance.now()-started)};
  },undefined,{timeout:28000});
  log('native-video-presented',{release:release.release,engine:browser.version(),...sample,providerFrames:receipts.filter(row=>row.width).length});
  assert(sample.frames>=10&&sample.elapsedMs>=5000&&sample.activeTrack&&sample.colors.length===2,'No sustained live changing native video');
  const connecting = page.getByText(/正在连接.*电脑|Connecting to your dot.*computer/i).filter({visible:true}).first();
  await connecting.waitFor({state:'hidden',timeout:12000});
  const options = await page.getByRole('button').filter({visible:true}).evaluateAll(nodes=>nodes.map(b=>b.getAttribute('aria-label')||b.textContent.trim()).slice(-24));
  log('native-video-controls',{options});
  const takeover = button(/接管|接手|Take over/i);
  await takeover.click({timeout:12000});
  await button(/归还|释放|交还|Return control/i).waitFor({state:'visible',timeout:12000});
  const target=await video.evaluate(media=>{
    const box=media.getBoundingClientRect();
    const scale=getComputedStyle(media).objectFit==='contain'
      ? Math.min(box.width/media.videoWidth,box.height/media.videoHeight) : null;
    const width=scale===null?box.width:media.videoWidth*scale;
    const height=scale===null?box.height:media.videoHeight*scale;
    return {x:box.left+(box.width-width)/2+width*0.52,y:box.top+(box.height-height)/2+height*0.60,decoded:[media.videoWidth,media.videoHeight]};
  });
  assert.deepEqual(target.decoded,[256,180],'Expected a real 4x encoded desktop downscale');
  await page.mouse.click(target.x,target.y);
  await page.keyboard.press('x');
  for(let i=0;i<30&&!displayEvents.some(event=>event.kind==='key'&&event.key==='x');i++)await wait(200);
  const sentButton=inputs.findLast(input=>input.type==='button'&&input.button==='left'&&input.down===true);
  const click=displayEvents.findLast(event=>event.kind==='button');
  assert(sentButton&&click,'No native click reached the real Linux display');
  const expected={x:Math.round(1024*0.52),y:Math.round(720*0.60)};
  log('native-click-coordinate',{decoded:target.decoded,desktop:{x:click.x,y:click.y},expected,normalized:inputs.filter(row=>row.type==='move').at(-1)});
  assert(Math.abs(expected.x-click.x)<=4&&Math.abs(expected.y-click.y)<=4,'The click reached the wrong X11 desktop coordinates');
  assert(inputs.some(input=>input.type==='key'&&input.down===true)&&displayEvents.some(event=>event.kind==='key'&&event.key==='x'),'No native key reached the real Linux display');
  const wake=receipts.filter(row=>row.route.endsWith('/wake')&&row.status===200).length;
  assert.equal(wake,1);
  log('native-dot-live-controls-passed',{release:release.release,renderingAndInput:'real Xvfb through live Worker and provider HTTP',
    productionPythonSandboxReady:strictRuntime.sandboxReady,wake,displayClick:{x:click.x,y:click.y},typedKey:'x',
    inputRequests:receipts.filter(row=>row.route.endsWith('/input')&&row.status===204).length,errors:errors.slice(-4)});
} catch (cause) {
  log('native-dot-live-controls-failed',{error:String(cause.stack??cause).split('\n').slice(0,11).join('\n'),
    receipts:receipts.slice(-20),inputCount:inputs.length,events:displayEvents.slice(-10)});
  process.exitCode=1;
} finally {
  await browser?.close();
  if (site) { site.closeAllConnections(); await new Promise(resolve=>site.close(resolve)); }
  await provider?.close();
  await Promise.allSettled([...jobs]);
  database?.raw.close();
  await rm(temp,{recursive:true,force:true});
}
