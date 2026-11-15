import { DEFAULT_SETTINGS } from './config.js';
import {completeToolResponses} from './conversation.js';
import {WEB_TOOL,searchWeb} from './web.js';
import {getModels,streamCompletion,PythonRuntime,PYTHON_TOOL} from './runtime.js';
import * as db from './storage.js';
import {marked} from './vendor/marked.js';
import DOMPurify from './vendor/purify.js';
import hljs from './vendor/highlight.js';
import renderMathInElement from './vendor/auto-render.js';
import {mountPowerPicker} from './power-picker.js';
import {mountWorkPicker,OBSERVED_WORK_PRESETS} from './work-picker.js';
import {WORK_MODEL_IDS,normalizeWorkSelection} from './model-catalog.js';
import {getPowerRequestSettings,POWER_TIERS} from './power.js';
import {createSettingsEngine,personalInstructions} from './settings-engine.js';
import {mountGoogleLogin,getIdentity,signOut} from './google-auth.js';
import {mountCompanion} from './companion.js';
import {applyLocale} from './i18n.js';
import {installKeyboardShortcuts} from './keyboard-shortcuts.js';
import {mountSourceMotion} from './source-motion.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(n,cls='')=>`<svg class="feature-icon icon ${cls}" aria-hidden="true" viewBox="0 0 24 24"><use href="#i-${n}"></use></svg>`;
const uid=()=>crypto.randomUUID();
const readJSON=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
const settings={...DEFAULT_SETTINGS,...readJSON('cg-settings',{})};
let chats=[],active=null,mode='chat',busy=false,controller=null,pendingFiles=[],models=[],temporary=false,projectFilter=null;
let projects=readJSON('cg-projects',[]),currentView='chat',voiceSession=false,recognition=null,templates,picker,settingsEngine,identity=null;
let power={family:'gpt6',tier:4,...readJSON('cg-power',{})};
let workPower={model:'gpt-6.1-sol',effort:'low',fast:false,selectionMode:'auto',...readJSON('cg-work-power',{})};
const workEfforts=OBSERVED_WORK_PRESETS;
let pendingGpt=null,companion;
const enabledEfforts=()=>settings.enabledEfforts||settings.uiPreferences?.enabledEfforts||['none','low','medium','high','xhigh','max'];
const chatTierIndexes=()=>POWER_TIERS.map((p,i)=>i).filter(i=>enabledEfforts().includes(['none','medium','high','xhigh','max'][i]));
const allowedWorkPresets=()=>workEfforts.filter(p=>enabledEfforts().includes(p.effort));
const python=new PythonRuntime();
const motion=mountSourceMotion();
const modelLabel=id=>String(id||'').replace(/^gpt-/,'GPT-');
const modes={chat:{product:'ChatGPT'},work:{product:'ChatGPT'},codex:{product:'Codex'}};
function toast(message){let r=$('#toast-root');if(!r)return;const t=document.createElement('div');t.className='toast';t.role='status';t.textContent=message;r.replaceChildren(t);setTimeout(()=>t.remove(),4500);}
function closeMenus(){picker?.close();for(const node of document.querySelectorAll('.context-menu,.floating-menu')){if(node.dataset.motionSurface==='menu'){if(node.dataset.sourceLeaving==='true')continue;node.dataset.sourceLeaving='true';void motion.closeSurface(node);}else node.remove();}}
function persistSettings(){localStorage.setItem('cg-settings',JSON.stringify(settings));document.cookie='cg_preferences=1; Max-Age=31536000; Path=/; SameSite=Lax';settingsEngine?.applyAppearance();}
function toggleSidebar(){const collapsed=!document.body.classList.contains('sidebar-collapsed');const shell=$('[data-app-shell-frame]')||$('#app [style*="--app-shell-left-panel-width"]');motion.sidebar({collapsed,shell,commit:()=>document.body.classList.toggle('sidebar-collapsed',collapsed)});}
async function authorizeTool(name,args){const permission=settingsEngine.getState().toolPermissionMode||'review_important_actions';const writes=['python','python_execute','create_file'].includes(name);if(permission!=='always_ask'&&!(permission==='ask_before_writes'&&writes))return true;return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='settings-dialog';dialog.innerHTML=`<h2>请求批准</h2><p>${escape(name)}</p><pre style="max-height:240px;overflow:auto;white-space:pre-wrap">${escape(args.code||args.name||args.query||'')}</pre><footer><button data-permit="no">拒绝</button><button class="primary-button" data-permit="yes">允许本次操作</button></footer>`;let settled=false;const signal=controller?.signal;const finish=value=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.close();dialog.remove();resolve(value);};const abort=()=>finish(false);dialog.addEventListener('click',e=>{const b=e.target.closest('[data-permit]');if(b){e.stopPropagation();finish(b.dataset.permit==='yes');}});dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});signal?.addEventListener('abort',abort,{once:true});document.body.append(dialog);dialog.showModal();if(signal?.aborted)finish(false);});}
function isolatePreview(html){if(!settingsEngine.getState().enforceCsp&&(mode==='chat'||settings.workInternetAccess!==false))return html;const meta='<meta http-equiv="Content-Security-Policy" content="default-src '+"'none'"+'; script-src '+"'unsafe-inline' 'unsafe-eval'"+'; style-src '+"'unsafe-inline'"+'; img-src data: blob:; font-src data:; connect-src '+"'none'"+'; form-action '+"'none'"+'; base-uri '+"'none'"+'">';return /<head(?:\s[^>]*)?>/i.test(html)?html.replace(/<head(?:\s[^>]*)?>/i,match=>match+meta):'<!doctype html><head>'+meta+'</head>'+html;}
async function exportMetadata(){return{projects,navigation:await navigationViews?.exportState(),uiPreferences:settingsEngine.getState(),power,workPower};}
async function importMetadata(data){if(data.navigation)await navigationViews?.importState(data.navigation,{replace:false});if(data.uiPreferences)settingsEngine.save(data.uiPreferences);if(data.power){power={...power,...data.power};localStorage.setItem('cg-power',JSON.stringify(power));}if(data.workPower){workPower={...workPower,...data.workPower};localStorage.setItem('cg-work-power',JSON.stringify(workPower));}if(Array.isArray(data.projects)){for(const p of data.projects){if(!p||typeof p.id!=='string'||typeof p.name!=='string')continue;const clean={id:p.id,name:p.name,instructions:String(p.instructions||'')},i=projects.findIndex(x=>x.id===p.id);if(i<0)projects.push(clean);else projects[i]=clean;}localStorage.setItem('cg-projects',JSON.stringify(projects));}}
function applyTheme(){settingsEngine?.applyAppearance();}
function requestSettings(){if(mode!=='chat'){const effort=['none','low','medium','high','xhigh','max'].includes(workPower.effort)?workPower.effort:'low';return{...settings,model:workPower.model,reasoningEffort:effort,reasoningMode:'standard',apiTransport:'responses',serviceTier:workPower.fast?'priority':null};}return getPowerRequestSettings(settings,power.family==='gpt56'?'gpt-5.6-sol':'gpt-6',POWER_TIERS[power.tier]?.id||'pro');}
async function persistChat(chat=active){if(!chat||chat.temporary)return;chat.updatedAt=Date.now();try{await db.saveChat(chat);}catch(e){toast(e.message);}renderHistory();}
function applyAttributes(element,attrs={}){for(const[k,v]of Object.entries(attrs))if(!['style','class'].includes(k)||!element.hasAttribute(k))element.setAttribute(k,v);}
function renderTemplate(entry){picker?.destroy();picker=null;closeMenus();$$('[data-runtime-power-menu]').forEach(n=>n.remove());$('#app').innerHTML=entry.html;applyAttributes(document.documentElement,entry.htmlAttributes);applyAttributes(document.body,entry.bodyAttributes);document.body.classList.remove('has-messages');document.body.style.pointerEvents='';document.body.removeAttribute('data-scroll-locked');settingsEngine?.applyAppearance();applyPins();updateIdentity();companion?.refresh();}
function ensureInfrastructure(){
  if(!$('#overlay-root'))document.body.insertAdjacentHTML('beforeend','<div id="overlay-root"></div>');
  if(!$('#toast-root'))document.body.insertAdjacentHTML('beforeend','<div id="toast-root" class="toast-root"></div>');
  if(!$('#artifact-panel'))document.body.insertAdjacentHTML('beforeend',`<aside id="artifact-panel" class="artifact-panel" hidden><header class="artifact-header"><span>预览</span><button id="artifact-close" aria-label="关闭">${icon('close')}</button></header><div id="artifact-content" class="artifact-content"></div></aside>`);
  if(!$('#file-input'))document.body.insertAdjacentHTML('beforeend','<input hidden id="file-input" type="file" multiple>');
}
function renderHome(){
  renderTemplate(templates.views?.[mode]||templates.home);currentView='chat';document.body.dataset.view='chat';ensureInfrastructure();
  const p=$('#prompt');if(!p)throw new Error('首页输入框模板不完整');
  Object.defineProperty(p,'value',{configurable:true,get(){return this.innerText==='询问 ChatGPT'?'':this.innerText;},set(v){this.textContent=v||'';}});p.value='';p.dataset.placeholder='询问 ChatGPT';
  const form=$('#composer-form');form?.addEventListener('submit',e=>{e.preventDefault();send();});
  const voice=$('#voice-button');
  if(voice){const send=document.createElement('button');send.id='send-button';send.type='submit';send.className=voice.className;send.setAttribute('aria-label','发送提示词');send.innerHTML=icon('arrow');voice.after(send);const stop=send.cloneNode(true);stop.id='stop-button';stop.type='button';stop.setAttribute('aria-label','停止生成');stop.innerHTML='<span class="stop-square"></span>';stop.hidden=true;send.after(stop);}
  const attachments=document.createElement('div');attachments.id='attachments';attachments.className='attachments';form?.prepend(attachments);
  if(!voice){const originalSend=$('[data-ui-composer] button[aria-label="发送"], [data-ui-composer] button[aria-label="发送提示词"]');if(originalSend){originalSend.id='send-button';originalSend.disabled=false;const stop=originalSend.cloneNode(true);stop.id='stop-button';stop.setAttribute('aria-label','停止生成');stop.hidden=true;stop.innerHTML='<span class="stop-square"></span>';originalSend.after(stop);}}
  const main=$('[data-ui-main]');const messages=document.createElement('div');messages.id='messages';messages.className='messages';messages.setAttribute('role','log');messages.setAttribute('aria-live','polite');main?.append(messages);
  const hidden=document.createElement('div');hidden.hidden=true;hidden.innerHTML='<span id="status"></span><span id="chat-title"></span>';main?.append(hidden);
  mountComposerPicker(mode);
  setMode(mode);renderHistory();autoGrow();localize();
}
function mountComposerPicker(kind='chat'){
  const button=$('#model-button');if(!button)return;picker?.destroy();$$('[data-runtime-power-menu]').forEach(n=>n.remove());const menu=document.createElement('div');menu.hidden=true;menu.id='model-menu';menu.dataset.runtimePowerMenu='';document.body.append(menu);
  if(kind==='chat'){const indices=chatTierIndexes();if(!indices.includes(power.tier))power.tier=indices[0]??0;picker=mountPowerPicker({button,menu,getValue:()=>({...power,tier:Math.max(0,indices.indexOf(power.tier)),mode:'chat'}),onChange:v=>{power={family:v.family,tier:indices[v.tier]??0};localStorage.setItem('cg-power',JSON.stringify(power));if(active){active.power={...power};persistChat();}button.title=getPowerRequestSettings(settings,power.family==='gpt56'?'gpt-5.6-sol':'gpt-6',POWER_TIERS[power.tier].id).powerRoute.notice;}});if(indices.length)picker.setModeTiers('chat',indices.map(i=>POWER_TIERS[i].label));button.title=getPowerRequestSettings(settings,power.family==='gpt56'?'gpt-5.6-sol':'gpt-6',POWER_TIERS[power.tier].id).powerRoute.notice;
  }else{const presets=allowedWorkPresets();workPower=normalizeWorkSelection(workPower,{autoPresets:presets,models:WORK_MODEL_IDS,enabledEfforts:enabledEfforts()});picker=mountWorkPicker({button,menu,getValue:()=>workPower,efforts:presets,models:WORK_MODEL_IDS,enabledEfforts:enabledEfforts(),onChange:v=>{workPower={model:v.model,effort:v.effort,fast:v.fast,selectionMode:v.selectionMode};localStorage.setItem('cg-work-power',JSON.stringify(workPower));if(active){active.workPower={...workPower};persistChat();}}});}
}
function prepareNavigationComposer(){const p=$('#prompt');if(!p)return;Object.defineProperty(p,'value',{configurable:true,get(){return this.innerText;},set(v){this.textContent=v||'';}});p.dataset.placeholder=p.getAttribute('aria-label')||'';mountComposerPicker('chat');}
function setMode(next){
  mode=modes[next]?next:'chat';document.body.dataset.mode=mode;
  const indicator=$('.indicator-zrk55u');if(indicator)indicator.style.transform=`translateX(calc((${mode==='chat'?'0% - 0px':'100% - 17px'}) * var(--mode-toggle-direction)))`;
  for(const n of['chat','work']){const b=$('#mode-'+n);if(!b)continue;const selected=mode===n||mode==='codex'&&n==='work';b.setAttribute('aria-pressed',String(selected));b.classList.toggle('text-mode-toggle-primary',selected);b.classList.toggle('text-mode-toggle-inactive',!selected);}
  if($('#welcome-title'))$('#welcome-title').textContent=mode==='chat'?'今天想聊点什么？':mode==='codex'?'我们要构建什么？':'我们要做什么？';
  if($('#prompt'))$('#prompt').dataset.placeholder=mode==='chat'?'询问 ChatGPT':mode==='codex'?'随心输入':'使用 ChatGPT Work';
  picker?.refresh();
}
function localize(){if(settingsEngine&&$('#app'))applyLocale($('#app'),{locale:settingsEngine.getState().language,getSettings:()=>settings,templates,toast}).catch(e=>toast(e.message));}
function renderSuggestions(){} // Original source template owns the suggested actions.
function renderHistory(){
  const list=$('#history-list');if(list){list.innerHTML=chats.filter(c=>!c.locked&&!c.archived&&(!projectFilter||c.projectId===projectFilter)).sort((a,b)=>(b.pinned||0)-(a.pinned||0)||b.updatedAt-a.updatedAt).map(c=>`<li class="local-chat-row"><button data-chat="${c.id}" class="local-chat-link">${escape(c.title)}</button><button data-chat-menu="${c.id}" aria-label="聊天操作">${icon('more')}</button></li>`).join('');}
  renderProjects();
}
function renderProjects(){const target=$('#project-list');if(target)target.innerHTML=projects.map(p=>`<li><button data-project="${p.id}" class="local-project-link">${icon('folder')}<span>${escape(p.name)}</span></button></li>`).join('');}
function newChat(nextMode=mode){if(busy)return toast('请先停止当前回复');active=null;pendingGpt=null;localStorage.removeItem('cg-active-gpt');pendingFiles=[];temporary=false;currentView='chat';mode=nextMode;python.reset();renderHome();setMode(nextMode);motion.enterHeadline($('#welcome'));$('#artifact-panel').hidden=true;renderAttachments();localStorage.removeItem('cg-active');setHash('');$('#prompt').focus();}
async function openChat(id){if(busy)return toast('请先停止当前回复');const c=chats.find(c=>c.id===id);if(!c)return;if(c.locked&&!await settingsEngine.requestPin())return;active=c;temporary=!!c.temporary;pendingFiles=[];mode=c.mode;if(c.power)power={...c.power};if(c.workPower)workPower={...c.workPower};python.reset();renderHome();setMode(c.mode);picker?.refresh();renderMessages();renderHistory();localStorage.setItem('cg-active',id);setHash('c='+id);}
function autoGrow(){const p=$('#prompt');if(!p)return;const has=!!p.value.trim()||pendingFiles.length>0;$('#send-button')?.toggleAttribute('hidden',busy||!has);$('#voice-button')?.toggleAttribute('hidden',busy||has);$('#stop-button')?.toggleAttribute('hidden',!busy);const layout=p.closest('[data-composer-input-layout]');if(layout){layout.style.height='auto';layout.style.maxHeight='240px';}p.closest('[data-composer-body]')?.classList.toggle('local-composer-expanded',p.scrollHeight>45);}
function prepareConversation(){const toggle=$('#mode-chat')?.closest('[aria-label="撰写器模式"],.root-HUUPVC');if(toggle)toggle.hidden=true;if($('.conversation-surface'))return;const main=$('[data-ui-main]'),form=$('#composer-form'),area=$('#messages');if(!main||!form||!area)return;const surface=document.createElement('div');surface.className='conversation-surface';for(const child of[...main.children]){if(child.tagName!=='HEADER'&&child!==area){child.dataset.uiHomeContent='';child.hidden=true;}}surface.append(area,form);main.append(surface);form.hidden=false;}
function renderMessages(scroll=true){const has=!!active?.messages.length;document.body.classList.toggle('has-messages',has);const area=$('#messages');if(!area)return;if(has)prepareConversation();area.innerHTML=(active?.messages||[]).map(messageHTML).join('');enrich(area);if(scroll)area.scrollTop=area.scrollHeight;}
async function send(){if(busy)return;const p=$('#prompt');if(!p)return;const text=p.value.trim();if(!text&&!pendingFiles.length)return;if(currentView!=='chat'){const files=[...pendingFiles];renderHome();pendingFiles=files;currentView='chat';}if(!active){active={id:uid(),title:text.slice(0,40)||pendingFiles[0]?.name||'新聊天',mode,messages:[],power:{...power},createdAt:Date.now(),updatedAt:Date.now(),temporary,gpt:readJSON("cg-active-gpt",pendingGpt),workPower:{...workPower},projectId:projectFilter};if(!temporary)chats.unshift(active);localStorage.setItem('cg-active',active.id);setHash('c='+active.id);}active.messages.push({id:uid(),role:'user',content:text,attachments:[...pendingFiles],createdAt:Date.now()});$('#prompt').value='';pendingFiles=[];renderAttachments();renderMessages();busy=true;await persistChat();await generate();}
function setHash(hash){history.replaceState(null,'',location.pathname+(hash?'#'+hash:''));}
function settingsModal(slug='general-settings'){const aliases={general:'general-settings',personal:'personalization',data:'data-controls',about:'account',connection:'general-settings'};navigateSettings(aliases[slug]||slug);}
function navigateSettings(slug){if(busy)return toast('请先停止当前回复');const template=templates.settings[slug];if(!template)return toast('此设置页面尚未载入');closeModal();renderTemplate(template);currentView='settings';document.body.dataset.view='settings';ensureInfrastructure();settingsEngine.hydrate($('#app'),slug);localize();setHash('settings='+slug);}
function renderModelButton(){picker?.refresh();}
async function renderModels(){}
async function fetchModels(){try{models=(await getModels(settings)).filter(m=>['gpt-6','gpt-5.6-sol',...WORK_MODEL_IDS].includes(m));}catch(e){console.warn(e.message);}}
function updateIdentity(){if(identity){const b=$('#profile-button');if(b){b.title=identity.name||identity.email; if(identity.picture){const img=document.createElement('img');img.src=identity.picture;img.alt='';img.width=28;img.height=28;b.replaceChildren(img);}}}}
async function loginModal(){modal('登录',`<div id="google-login-container"></div>`);await mountGoogleLogin($('#google-login-container'),{onLogin:profile=>{identity=profile;updateIdentity();closeModal();toast('已登录');},onError:e=>toast(e.message)});}
function menuAt(anchor,items){closeMenus();const m=document.createElement('div');m.className='menu context-menu';m.setAttribute('role','menu');m.innerHTML=items;document.body.append(m);const r=anchor.getBoundingClientRect();m.style.position='fixed';m.style.left=Math.max(8,Math.min(r.right,innerWidth-m.offsetWidth-8))+'px';m.style.top=Math.max(8,Math.min(r.bottom+6,innerHeight-m.offsetHeight-8))+'px';m.dataset.motionSurface='menu';motion.openSurface(m,{origin:parseFloat(m.style.top)<r.top?'bottom left':'top left'});return m;}
function profileMenu(anchor){menuAt(anchor,`<button class="menu-item" data-action="login">${escape(identity?.name||'登录')}</button><div class="menu-separator"></div><button class="menu-item" data-settings-panel-slug="billing">${icon('bolt')}升级订阅套餐</button><button class="menu-item" data-settings-panel-slug="personalization">${icon('settings')}个性化</button><button class="menu-item" data-settings-panel-slug="account">${icon('user')}个人资料</button><button class="menu-item" data-action="settings">${icon('settings')}设置</button><div class="menu-separator"></div><a class="menu-item" href="https://help.openai.com/" target="_blank" rel="noopener">${icon('help')}帮助</a><button class="menu-item" data-action="logout">${icon('logout')}退出登录</button>`);}
function applyPins(){const pins=readJSON('cg-navigation-pins',{});for(const b of $$('[data-app-navigation-rail] [data-nav]'))if(['项目','图像','站点','地图','GPT','Codex'].includes(b.dataset.nav))b.hidden=pins[b.dataset.nav]===false;}
function exploreMenu(anchor){closeMenus();const t=document.createElement('template');t.innerHTML=templates.views?.explore?.html||'';const source=t.content.querySelector('[role="dialog"][aria-label="探索"]')||[...t.content.querySelectorAll('[role="dialog"]')].find(d=>d.textContent.includes('GPT')&&d.textContent.includes('Codex'));let popup;if(source){popup=source.cloneNode(true);for(const b of popup.querySelectorAll('button')){const label=b.textContent.trim();if(['项目','图像','站点','地图','GPT','Codex'].includes(label))b.dataset.nav=label;else if((b.getAttribute('aria-label')||'').includes('侧边栏')){const group=b.parentElement;const dest=group.querySelector('button')?.textContent.trim();if(dest)b.dataset.togglePin=dest;}}}else{popup=document.createElement('div');popup.className='menu';popup.innerHTML=['项目','图像','站点','地图','GPT','Codex'].map(n=>`<div class="explore-local-row"><button class="menu-item" data-nav="${n}">${n}</button><button data-toggle-pin="${n}" aria-label="从侧边栏取消置顶">⌖</button></div>`).join('');}popup.classList.add('floating-menu');popup.style.position='fixed';popup.style.zIndex='1000';popup.style.width='228px';popup.style.height='auto';popup.style.transform='none';document.body.append(popup);const r=anchor.getBoundingClientRect();popup.style.left=(r.right+8)+'px';popup.style.top=Math.min(r.top,innerHeight-popup.offsetHeight-8)+'px';}

function revealComposer(focus=false){requestAnimationFrame(()=>{const prompt=$('#prompt');if(!prompt)return;if(focus)prompt.focus({preventScroll:true});const box=$('[data-ui-composer]')||$('#composer-form')||prompt;const bounds=box.getBoundingClientRect(),height=window.visualViewport?.height||innerHeight;if(bounds.bottom>height||bounds.top<52)box.scrollIntoView({block:'nearest',inline:'nearest',behavior:document.documentElement.dataset.reducedMotion==='true'?'instant':'smooth'});});}
function handleShortcut(id,event){
  if(id==='focusMainChat'){revealComposer(true);return !!$('#prompt');}
  if(id==='composer.submit'||id==='composer.submitInBackground'){if(busy)return false;send();return true;}
  if(id==='composer.openModelPicker'){if(!picker)return false;picker.open();return true;}
  if(id==='composer.toggleDictation'){if(recognition)recognition.abort();else startListening();return true;}
  if(id==='composer.startVoiceMode'){voiceModal();return true;}
  if(id==='composer.addFiles'){$('#file-input')?.click();return true;}
  if(id==='deleteChat'){if(!active||busy)return false;chatAction('delete',active.id);return true;}
  if(id==='newTask'){if(busy)return false;newChat();return true;}
  if(id==='showKeyboardShortcuts'){if(busy)return false;navigateSettings('keyboard-shortcuts');return true;}
  if(id==='searchChats'){searchModal();return true;}
  if(id==='toggleSidebar'){toggleSidebar();return true;}
  if(id==='artifact.sendAnnotations'){const send=$('[data-send-annotations]');if(!send)return false;send.click();return true;}
  return false;
}

function download(name, data, type = "text/plain") {
  const url = typeof data === "string" && data.startsWith("data:") ? data : URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 1e3);
}

function fileHTML(f) {
  return `<button class="file-chip" data-artifact="${escape(f.id || f.name)}">${f.type?.startsWith("image/") || f.mime?.startsWith("image/") ? `<img alt="" src="${escape(f.dataUrl)}">` : icon("file")}<span><strong>${escape(f.name)}</strong><small>${escape(f.mime || f.type || "文件")}</small></span>${icon("download")}</button>`;
}

function markdown(source) {
  try {
    const linked = (source || "").replace(/\]\(sandbox:\/mnt\/data\/([^)]+)\)/g, (_, name) => `](#file=${encodeURIComponent(name)})`);
    return DOMPurify.sanitize(marked.parse(linked, { breaks: true, gfm: true }), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form", "input"], FORBID_ATTR: ["style"] });
  } catch {
    return escape(source);
  }
}

function enrich(container) {
  container.querySelectorAll("pre > code").forEach((code) => {
    if (code.parentElement.closest(".code-block")) return;
    const lang = ([...code.classList].find((x) => x.startsWith("language-")) || "language-text").slice(9);
    const block = document.createElement("div");
    block.className = "code-block";
    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `<span>${escape(lang)}</span><span><button data-code-action="copy">${icon("copy")}复制代码</button>${/^(python|py)$/.test(lang) ? `<button data-code-action="run">${icon("terminal")}运行</button>` : ""}${/^(html|htm)$/.test(lang) ? `<button data-code-action="preview">${icon("code")}预览</button>` : ""}<button data-code-action="download">${icon("download")}</button></span>`;
    const pre = code.parentElement;
    pre.before(block);
    block.append(header, pre);
    if (hljs.getLanguage(lang)) {
      code.classList.add("hljs");
      code.innerHTML = hljs.highlight(code.textContent, { language: lang }).value;
    }
  });
  try {
    renderMathInElement(container, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }], throwOnError: false });
  } catch {
  }
  container.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href")?.startsWith("#file=")) {
      a.dataset.artifact = decodeURIComponent(a.getAttribute("href").slice(6));
      a.removeAttribute("href");
      a.setAttribute("role", "button");
      a.tabIndex = 0;
      return;
    }
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });
}

function toolHTML(t) {
  return `<details class="tool-card" ${t.running ? "open" : ""}><summary>${icon(t.name === "python" ? "terminal" : "file")}<span>${escape(t.label || t.name)}</span>${t.running ? '<span class="spinner"></span>' : icon(t.error ? "close" : "check")}</summary><div class="tool-body">${t.code ? `<pre><code>${escape(t.code)}</code></pre>` : ""}${t.stdout ? `<pre>${escape(t.stdout)}</pre>` : ""}${t.stderr ? `<pre class="error-text">${escape(t.stderr)}</pre>` : ""}${t.result ? `<pre>${escape(t.result)}</pre>` : ""}${(t.images || []).map((src) => `<img class="tool-image" src="${escape(src)}" alt="Python 生成的图表">`).join("")}</div></details>`;
}

function messageHTML(m) {
  if (m.role === "tool") return "";
  const content = m.role === "user" ? `<div class="message-content">${escape(m.content).replace(/\n/g, "<br>")}</div>` : `${(m.executions || []).map(toolHTML).join("")}<div class="message-content prose">${markdown(m.content)}${m.streaming && !m.content ? '<span class="thinking-dot"></span>' : ""}</div>`;
  return `<article class="message ${m.role}" data-message="${m.id}">${m.role === "assistant" ? `<div class="assistant-avatar">${icon(mode === "codex" ? "code" : "logo")}</div>` : ""}<div class="message-inner">${(m.attachments || []).length ? `<div class="message-files">${m.attachments.map(fileHTML).join("")}</div>` : ""}${content}${(m.artifacts || []).length ? `<div class="message-files">${m.artifacts.map(fileHTML).join("")}</div>` : ""}${m.error ? `<div class="inline-error">${escape(m.error)}<button data-msg-action="retry" data-mid="${m.id}">重试</button></div>` : ""}${!m.streaming ? `<div class="message-actions"><button aria-label="复制" title="复制" data-msg-action="copy" data-mid="${m.id}">${icon("copy")}</button>${m.role === "assistant" ? `<button aria-label="朗读" title="朗读" data-msg-action="speak" data-mid="${m.id}">${icon("volume")}</button><button aria-label="好评" title="好评" data-msg-action="like" data-mid="${m.id}" class="${m.feedback === "like" ? "active" : ""}">${icon("thumbup")}</button><button aria-label="差评" title="差评" data-msg-action="dislike" data-mid="${m.id}" class="${m.feedback === "dislike" ? "active" : ""}">${icon("thumbdown")}</button><button aria-label="重新生成" title="重新生成" data-msg-action="retry" data-mid="${m.id}">${icon("retry")}</button>` : `<button aria-label="编辑消息" title="编辑消息" data-msg-action="edit" data-mid="${m.id}">${icon("edit")}</button>`}</div>` : ""}</div></article>`;
}

function nearBottom() {
  const area = $("#messages");
  return area.scrollHeight - area.scrollTop - area.clientHeight < 160;
}

function renderStreaming(m) {
  const row = $(`[data-message="${m.id}"]`);
  if (!row) {
    renderMessages();
    return;
  }
  const stick = nearBottom();
  const content = row.querySelector(".message-content");
  content.innerHTML = markdown(m.content || "") || '<span class="thinking-dot"></span>';
  if (stick) $("#messages").scrollTop = $("#messages").scrollHeight;
}

function renderAttachments() {
  $("#attachments").innerHTML = pendingFiles.map((f, i) => `<div class="attachment-preview">${f.type?.startsWith("image/") ? `<img alt="${escape(f.name)}" src="${escape(f.dataUrl)}">` : icon("file")}<span>${escape(f.name)}<small>${(f.size / 1024).toFixed(0)} KB</small></span><button aria-label="移除 ${escape(f.name)}" data-remove-file="${i}">${icon("close")}</button></div>`).join("");
  autoGrow();
}
const CREATE_FILE = { type: "function", function: { name: "create_file", description: "Create a downloadable UTF-8 file. Use for HTML apps, markdown reports, CSV, JSON, code, SVG or text. HTML files can be previewed.", parameters: { type: "object", properties: { name: { type: "string" }, content: { type: "string" }, mime: { type: "string" } }, required: ["name", "content"], additionalProperties: false } } };
const READ_FILE = { type: "function", function: { name: "read_file", description: "Read a text file uploaded by the user or generated in this conversation. For binary spreadsheets use Python.", parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } } };

function allFiles() {
  const byName = /* @__PURE__ */ new Map();
  for (const m of active?.messages || []) for (const f of [...m.attachments || [], ...m.artifacts || []]) byName.set(f.name, f);
  return [...byName.values()];
}

function systemPrompt() {
  const project = projects.find((p) => p.id === active?.projectId);
  return `You are a helpful AI assistant in an independent ChatGPT-style web workspace. Current date: ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}. Respond in the user's language. Be accurate, clear, and useful. Never claim you ran a tool when you did not. You do not have OpenAI's private services, local OS shell, or access to user's machine. You can use the tools actually provided, including live search_web when enabled. Cite source URLs from search results. Python is real CPython via Pyodide in an isolated browser worker. Variables persist until switching chats or reloading; uploaded and generated files are restored. Supports numpy, pandas, matplotlib and Pyodide packages. Uploaded files are in /mnt/data. Save binary files and charts under /mnt/data for download. Use print() for outputs. Avoid interactive input, subprocess and system commands. Prefer create_file for HTML/SVG/text deliverables. Actually create files instead of only writing sandbox links. ${mode === "work" ? "Work mode: carry tasks through to reviewable results. Briefly plan complex tasks, use tools, verify results and create useful deliverables." : mode === "codex" ? "Codex mode: implement, debug and explain software. Inspect uploaded files, use Python to test logic, create runnable files and describe validation. HTML previews are available. Never pretend to have git or terminal access." : "Chat mode: answer naturally; use tools when they improve accuracy."} ${personalInstructions(mode)} ${active?.gpt?.instructions || ""} ${project ? "Project: " + project.name + "\nInstructions: " + (project.instructions || "") : ""} Available files: ${allFiles().map((f) => "/mnt/data/" + f.name).join(", ") || "none"}.`;
}

function apiMessages() {
  const result = [{ role: "system", content: systemPrompt() }];
  for (const m of active.messages) {
    if (m.error && !m.content && !m.tool_calls) continue;
    if (m.role === "tool") {
      result.push({ role: "tool", tool_call_id: m.tool_call_id, content: m.content });
      continue;
    }
    if (m.role === "user") {
      let text = m.content || "";
      const images = [];
      for (const f of m.attachments || []) {
        if (f.type?.startsWith("image/")) images.push({ type: "image_url", image_url: { url: f.dataUrl } });
        else text += `

[Uploaded file: /mnt/data/${f.name}]${f.content ? "\n" + f.content.slice(0, 1e5) : " (binary file; read with Python)"}`;
      }
      result.push({ role: "user", content: images.length ? [{ type: "text", text: text || "Please analyze the attached image." }, ...images] : text });
    } else if (m.content || m.tool_calls) result.push({ role: "assistant", content: m.content || null, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}), ...(m.response_items ? {response_items:m.response_items} : {}) });
  }
  return result;
}

async function createArtifact(name, content, mime) {
  name = String(name || "untitled.txt").split(/[\\/]/).pop();
  const type = mime || ({ "html": "text/html", "svg": "image/svg+xml", "md": "text/markdown", "json": "application/json", "csv": "text/csv", "py": "text/x-python", "js": "text/javascript", "css": "text/css" }[name.split(".").pop()] || "text/plain");
  const dataUrl = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(new Blob([content], { type }));
  });
  const file = { id: uid(), name, content, type, mime: type, dataUrl, createdAt: Date.now() };
  if (!temporary) await db.saveAsset(file);
  return file;
}

async function executeTool(call, message) {
  let args;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return JSON.stringify({ error: "工具参数不是有效 JSON，请修正参数后重试。" });
  }
  const name = call.function.name;
  if(!await authorizeTool(name,args))return JSON.stringify({error:"用户拒绝了本次工具操作。"});
  const execution = { name: name === "python" || name === "python_execute" ? "python" : name, label: name === "python" || name === "python_execute" ? "正在运行 Python…" : name === "create_file" ? "正在创建文件…" : "正在读取文件…", running: true, code: args.code || "" };
  message.executions ??= [];
  message.executions.push(execution);
  renderMessages(false);
  try {
    let result;
    if (["python", "python_execute"].includes(name)) {
      const output = await python.run(args.code, allFiles(), (s) => {
        execution.label = s;
        const summary = $(`[data-message="${message.id}"] .tool-card:last-of-type summary span`);
        if (summary) summary.textContent = s;
      });
      Object.assign(execution, output, { label: output.stderr ? "Python 已运行 · 请查看输出" : "已运行 Python", running: false });
      const files = [];
      for (const f of output.files || []) {
        const asset = { ...f, id: uid(), type: f.mime, createdAt: Date.now() };
        if (!temporary) await db.saveAsset(asset);
        files.push(asset);
      }
      message.artifacts = [...message.artifacts || [], ...files];
      result = { stdout: output.stdout, stderr: output.stderr, result: output.result, files: files.map((f) => ({ name: f.name, path: "/mnt/data/" + f.name })) };
    } else if (name === "create_file") {
      const file = await createArtifact(args.name, args.content, args.mime);
      message.artifacts ??= [];
      message.artifacts.push(file);
      execution.label = "已创建 " + file.name;
      execution.running = false;
      result = { created: true, name: file.name, downloadAvailable: true };
    } else if (name === "read_file") {
      const requestedName = String(args.name || "").replace(/^\/mnt\/data\//, "");
      const file = allFiles().find((f) => f.name === requestedName);
      if (!file) throw new Error("找不到文件：" + args.name);
      const content = file.content || ((file.type || file.mime || "").startsWith("text/") ? await (await fetch(file.dataUrl)).text() : null);
      result = { name: file.name, content: content ?? "Binary file. Use Python to read /mnt/data/" + file.name };
      execution.label = "已读取 " + file.name;
      execution.running = false;
    } else if (name === "search_web") {
      if(mode!=="chat"&&settings.workInternetAccess===false)throw new Error("Work 的互联网访问已关闭");
      execution.label = "正在搜索网页…";
      const found = await searchWeb(requestSettings(), args.query, controller?.signal);
      execution.label = found.searched ? "已搜索网页" : "服务商返回的检索回答";
      execution.stdout = found.text;
      execution.sources = found.sources;
      execution.running = false;
      result = found;
    } else throw new Error("当前环境没有此工具：" + name);
    renderMessages(false);
    return JSON.stringify(result);
  } catch (e) {
    execution.running = false;
    execution.error = true;
    execution.stderr = e.message;
    execution.label = "执行失败";
    renderMessages(false);
    return JSON.stringify({ error: e.message });
  }
}

async function generate() {
  busy = true;
  autoGrow();
  controller = new AbortController();
  $("#send-button").hidden = true;
  $("#stop-button").hidden = false;
  $("#status").textContent = "正在思考";
  let lastMessage = null;
  try {
    for (let round = 0; round < 12; round++) {
      if (controller.signal.aborted) break;
      const m = { id: uid(), role: "assistant", content: "", streaming: true, createdAt: Date.now() };
      lastMessage = m;
      const requestMessages = apiMessages();
      active.messages.push(m);
      renderMessages();
      const tools = settings.autoPython ? [PYTHON_TOOL, CREATE_FILE, READ_FILE] : [CREATE_FILE, READ_FILE];
      if (settings.webEnabled !== false && (mode === "chat" || settings.workInternetAccess !== false)) tools.push(WEB_TOOL);
      let scheduled = false;
      const response = await streamCompletion({ settings: requestSettings(), messages: requestMessages, tools, signal: controller.signal, onDelta: (delta, assembled) => {
        m.content = assembled?.content ?? m.content + delta;
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(() => {
            renderStreaming(m);
            scheduled = false;
          });
        }
      } });
      m.content = response.content || "";
      if(response.usage)m.usage=response.usage;
      if(response.response_items)m.response_items=response.response_items;
      if (response.tool_calls?.length) m.tool_calls = response.tool_calls;
      m.streaming = false;
      if (!m.tool_calls?.length) {
        if (!m.content) m.content = "模型未返回文本。请重试，或在模型菜单中切换模型。";
        renderMessages();
        break;
      }
      for (const call of m.tool_calls) {
        if (controller.signal.aborted) throw new DOMException("Stopped", "AbortError");
        $("#status").textContent = "正在使用工具";
        const output = await executeTool(call, m);
        active.messages.push({ id: uid(), role: "tool", tool_call_id: call.id, content: output });
      }
      await persistChat();
      if (round === 11) {
        const stop = { id: uid(), role: "assistant", content: "本轮已完成 12 次模型调用。你可以继续发送消息，让我接着处理。" };
        active.messages.push(stop);
        renderMessages();
      }
    }
  } catch (e) {
    if (lastMessage) lastMessage.streaming = false;
    if (e.name === "AbortError") {
      if (lastMessage && !lastMessage.content && !lastMessage.tool_calls) active.messages = active.messages.filter((m) => m !== lastMessage);
      toast("已停止生成");
    } else {
      if (lastMessage) lastMessage.error = e.message;
      toast("请求失败：" + e.message);
    }
    renderMessages();
  } finally {
    active.messages = completeToolResponses(active.messages);
    busy = false;
    controller = null;
    $("#send-button").hidden = false;
    $("#stop-button").hidden = true;
    $("#status").textContent = temporary ? "临时聊天" : "";
    autoGrow();
    await persistChat();
    if (voiceSession) {
      const last = [...active.messages].reverse().find((m) => m.role === "assistant" && m.content);
      if (last) speak(last.content, true);
    }
  }
}

async function addFiles(files) {
  for (const file of files) {
    if (file.size > 25 * 1024 * 1024) {
      toast(file.name + " 超过 25 MB");
      continue;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      let content = "";
      if (file.type.startsWith("text/") || /\.(md|csv|tsv|json|js|ts|tsx|jsx|py|html|css|xml|yaml|yml|log|sql|sh|txt)$/i.test(file.name)) content = await file.text();
      else if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("./vendor/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const pages = [];
        for (let p = 1; p <= Math.min(pdf.numPages, 150); p++) pages.push((await (await pdf.getPage(p)).getTextContent()).items.map((i) => i.str).join(" "));
        content = pages.join("\n\n");
        await pdf.destroy();
      } else if (/\.docx$/i.test(file.name)) {
        await loadScript("./vendor/mammoth.js");
        content = (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      }
      const asset = { id: uid(), name: file.name.replace(/[\\/]/g, "_"), type: file.type || "application/octet-stream", size: file.size, dataUrl, content };
      if (!temporary) await db.saveAsset(asset);
      pendingFiles.push(asset);
    } catch (e) {
      toast("无法读取 " + file.name + "：" + e.message);
    }
  }
  renderAttachments();
  $("#file-input").value = "";
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

function modal(title, body, footer = "") {
  closeMenus();
  $("#overlay-root").innerHTML = `<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="${escape(title)}" class="modal"><header class="modal-header"><h2>${escape(title)}</h2><button class="icon-button" data-close-modal aria-label="关闭">${icon("close")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`;
  $("#overlay-root input, #overlay-root textarea, #overlay-root button")?.focus();
}

function closeModal() {
  $("#overlay-root").innerHTML = "";
}

function searchModal() {
  modal("搜索聊天", `<div class="search-field">${icon("search")}<input id="chat-search-input" placeholder="搜索聊天标题或内容" autofocus></div><div id="search-results"></div>`);
  const input = $("#chat-search-input");
  const update = () => {
    const q = input.value.toLowerCase();
    $("#search-results").innerHTML = chats.filter((c) => !c.archived && !c.locked && (c.title + " " + c.messages.map((m) => m.content || "").join(" ")).toLowerCase().includes(q)).sort((a, b) => b.updatedAt - a.updatedAt).map((c) => `<button class="search-result" data-chat="${c.id}">${icon(c.mode === "codex" ? "code" : "edit")}<span>${escape(c.title)}<small>${new Date(c.updatedAt).toLocaleDateString()}</small></span></button>`).join("") || '<p class="empty-state">没有找到相关聊天</p>';
  };
  input.addEventListener("input", update);
  update();
  input.focus();
}

function chatMenu(id, anchor) {
  closeMenus();
  const chat = chats.find((c) => c.id === id);
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "menu context-menu";
  menu.style.position = "fixed";
  menu.style.left = Math.min(rect.right, innerWidth - 220) + "px";
  menu.style.top = Math.min(rect.top, innerHeight - 240) + "px";
  menu.innerHTML = `<button class="menu-item" data-chat-action="rename" data-cid="${id}">${icon("edit")}重命名</button><button class="menu-item" data-chat-action="pin" data-cid="${id}">${icon("check")}${chat.pinned ? "取消置顶" : "置顶聊天"}</button><button class="menu-item" data-chat-action="project" data-cid="${id}">${icon("folder")}移动到项目</button><button class="menu-item" data-chat-action="archive" data-cid="${id}">${icon("archive")}归档</button><button class="menu-item" data-chat-action="lock" data-cid="${id}">锁定聊天</button><button class="menu-item danger-text" data-chat-action="delete" data-cid="${id}">${icon("trash")}删除</button>`;
  document.body.append(menu);
}

function inputModal(title, label, value, onSave) {
  modal(title, `<label class="field-label">${escape(label)}<input id="modal-value" value="${escape(value)}" autocomplete="off"></label>`, `<button class="secondary-button" data-close-modal>取消</button><button class="primary-button" id="modal-save">保存</button>`);
  $("#modal-save").onclick = () => {
    const value2 = $("#modal-value").value.trim();
    if (value2) {
      onSave(value2);
      closeModal();
    }
  };
  $("#modal-value").onkeydown = (e) => {
    if (e.key === "Enter") $("#modal-save").click();
  };
  $("#modal-value").select();
}

function confirmModal(title, text, action2) {
  modal(title, `<p>${escape(text)}</p>`, `<button class="secondary-button" data-close-modal>取消</button><button class="danger-button" id="confirm-action">删除</button>`);
  $("#confirm-action").onclick = async () => {
    await action2();
    closeModal();
  };
}

async function chatAction(action2, id) {
  if(action2==="lock"){const c=chats.find(c=>c.id===id);if(c&&await settingsEngine.requestPin({create:true})){c.locked=true;await persistChat(c);if(active===c)newChat();toast("聊天已锁定");}return;}
  closeMenus();
  const c = chats.find((c2) => c2.id === id);
  if (!c) return;
  if (busy && c === active) {
    toast("请先停止当前回复");
    return;
  }
  if (action2 === "rename") inputModal("重命名聊天", "标题", c.title, async (name) => {
    c.title = name;
    await persistChat(c);
    if (c === active) $("#chat-title").textContent = name;
  });
  if (action2 === "pin") {
    c.pinned = !c.pinned;
    await persistChat(c);
  }
  if (action2 === "archive") {
    c.archived = true;
    await persistChat(c);
    if (active === c) newChat();
    toast("已归档，可在设置中恢复");
  }
  if (action2 === "delete") confirmModal("删除聊天？", "此聊天将从当前浏览器中删除。", async () => {
    await db.deleteChat(c.id);
    chats = chats.filter((x) => x !== c);
    if (active === c) newChat();
    renderHistory();
  });
  if (action2 === "project") {
    modal("移动到项目", projects.map((p) => `<button class="search-result" data-move-project="${p.id}" data-cid="${id}">${icon("folder")}${escape(p.name)}</button>`).join("") + '<button class="search-result" data-move-project="" data-cid="' + id + '">从项目中移出</button>');
  }
}

function showLibrary(imagesOnly = false) {
  if (busy) return toast("请先停止当前回复");
  prepareConversation();
  if(!$("#prompt"))renderHome();
  currentView = imagesOnly ? "images" : "library";
  document.body.classList.add("has-messages");
  $("#welcome").hidden = true;
  $("#composer-form").hidden = true;
  $("#chat-title").textContent = imagesOnly ? "图片" : "资料库";
  const files = chats.flatMap((c) => c.messages.flatMap((m) => [...m.artifacts || [], ...imagesOnly ? m.attachments || [] : []]));
  const unique = [...new Map(files.map((f) => [f.id || f.dataUrl, f])).values()].filter((f) => !imagesOnly || (f.mime || f.type || "").startsWith("image/"));
  $("#messages").innerHTML = `<section class="library-view"><h1>${imagesOnly ? "图片" : "资料库"}</h1><p class="muted">${imagesOnly ? "你上传和生成的图片" : "在聊天中生成的文件与成果"}</p><div class="artifact-grid">${unique.map((f) => `<div class="artifact-card">${(f.mime || f.type || "").startsWith("image/") ? `<img src="${escape(f.dataUrl)}" alt="${escape(f.name)}">` : icon("file")}${fileHTML(f)}</div>`).join("") || `<div class="empty-state">${icon(imagesOnly ? "image" : "book")}<h3>这里还没有${imagesOnly ? "图片" : "文件"}</h3><p>开始聊天，上传图片或让 AI 创建文件。</p><button class="secondary-button" data-action="new">开始新聊天</button></div>`}</div></section>`;
}

async function openArtifact(id) {
  const f = allFiles().find((x) => x.id === id || x.name === id) || chats.flatMap((c) => c.messages.flatMap((m) => [...m.artifacts || [], ...m.attachments || []])).find((x) => x.id === id || x.name === id) || await db.getAsset(id);
  if (!f) return toast("文件不可用");
  if (!f.content && /^(text\/|application\/json)/.test(f.type || f.mime || "")) f.content = await (await fetch(f.dataUrl)).text();
  previewFile(f);
}

function previewFile(f) {
  $("#artifact-panel").hidden = false;
  $("#artifact-content").innerHTML = `<div class="artifact-toolbar"><strong>${escape(f.name)}</strong><button class="secondary-button" id="download-artifact">${icon("download")}下载</button></div><div class="artifact-preview"></div>`;
  $("#download-artifact").onclick = () => download(f.name, f.dataUrl || f.content, f.mime || f.type);
  const view = $(".artifact-preview");
  const type = f.mime || f.type || "";
  if (type.startsWith("image/")) view.innerHTML = `<img alt="${escape(f.name)}" src="${escape(f.dataUrl)}">`;
  else if (/\.html?$/i.test(f.name)) {
    const frame = document.createElement("iframe");
    frame.title = f.name;
    frame.sandbox = "allow-scripts allow-forms allow-modals";
    if (f.content) frame.srcdoc = isolatePreview(f.content);
    else if(settingsEngine.getState().enforceCsp||(mode!=="chat"&&settings.workInternetAccess===false))fetch(f.dataUrl).then(r=>r.text()).then(html=>frame.srcdoc=isolatePreview(html));
    else frame.src = f.dataUrl;
    view.append(frame);
  } else if (type === "application/pdf") {
    const frame = document.createElement("iframe");
    frame.title = f.name;
    frame.src = f.dataUrl;
    view.append(frame);
  } else if (/\.md$/i.test(f.name) && f.content) {
    view.innerHTML = `<div class="prose">${markdown(f.content)}</div>`;
    enrich(view);
  } else if (f.content) {
    view.innerHTML = `<pre><code>${escape(f.content)}</code></pre>`;
  } else view.innerHTML = '<div class="empty-state">此文件可以下载后打开。</div>';
}

function pythonConsole() {
  modal("Python 工作区", `<p class="settings-description">真实 Python · 独立 Worker · 当前聊天内保留变量 · 文件目录 /mnt/data</p><textarea class="python-editor" id="python-code" spellcheck="false" rows="10">import sys
print(sys.version)
print(sum(range(1, 101)))</textarea><div id="python-output" class="console-output"></div>`, `<button class="secondary-button" id="reset-python">重置环境</button><button class="primary-button" id="run-python">${icon("terminal")}运行 Python</button>`);
  $("#reset-python").onclick = () => {
    python.reset();
    $("#python-output").textContent = "环境已重置";
  };
  $("#run-python").onclick = async () => {
    const button = $("#run-python"), output = $("#python-output");
    button.disabled = true;
    try {
      const result = await python.run($("#python-code").value, allFiles(), (s) => output.textContent = s);
      output.innerHTML = `<pre>${escape(result.stdout || "")}${escape(result.stderr || "")}${escape(result.result || "")}</pre>${(result.images || []).map((src) => `<img src="${escape(src)}" alt="Python 图表">`).join("")}`;
      for (const f of result.files || []) {
        const a = document.createElement("a");
        a.href = f.dataUrl;
        a.download = f.name;
        a.textContent = "下载 " + f.name;
        a.className = "console-download";
        output.append(a);
      }
    } catch (e) {
      output.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
}

function speak(text, resume = false) {
  if (!("speechSynthesis" in window)) return toast("当前浏览器不支持朗读");
  speechSynthesis.cancel();
  const plain = text.replace(/```[\s\S]*?```/g, "代码已显示在对话中。").replace(/[#*_`]/g, "");
  const u = new SpeechSynthesisUtterance(plain);
  if(settings.voiceName)u.voice=speechSynthesis.getVoices().find(v=>v.name===settings.voiceName)||null;
  u.lang = settings.voiceLanguage && settings.voiceLanguage!=="auto" ? settings.voiceLanguage : /[\u4e00-\u9fa5]/.test(plain) ? "zh-CN" : "en-US";
  if (resume) u.onend = () => {
    if (voiceSession) startListening();
  };
  speechSynthesis.speak(u);
}

function startListening() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    toast("当前浏览器不支持语音输入，请使用 Chrome 或键盘输入");
    voiceSession = false;
    return;
  }
  recognition?.abort();
  recognition = new Recognition();
  recognition.lang = settings.voiceLanguage && settings.voiceLanguage !== "auto" ? settings.voiceLanguage : "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;
  const initial = $("#prompt").value;
  recognition.onresult = (e) => {
    const text = [...e.results].map((r) => r[0].transcript).join("");
    $("#prompt").value = initial + text;
    autoGrow();
    if ($("#voice-transcript")) $("#voice-transcript").textContent = text;
  };
  recognition.onerror = (e) => {
    toast("语音输入未完成：" + (e.error === "not-allowed" ? "请允许麦克风权限" : e.error));
    $("#mic-button").classList.remove("listening");
  };
  recognition.onend = () => {
    $("#mic-button").classList.remove("listening");
    if (voiceSession && $("#prompt").value.trim()) send();
  };
  recognition.start();
  $("#mic-button").classList.add("listening");
}

function voiceModal() {
  voiceSession = true;
  modal("语音对话", `<div class="voice-orb"></div><p id="voice-transcript" class="voice-transcript">点击麦克风开始说话</p><p class="settings-description">使用浏览器语音识别和朗读服务。可随时关闭，继续文字聊天。</p>`, `<button class="secondary-button" id="voice-end">结束对话</button><button class="primary-button" id="voice-start">${icon("mic")}开始说话</button>`);
  $("#voice-start").onclick = startListening;
  $("#voice-end").onclick = () => {
    voiceSession = false;
    recognition?.abort();
    window.speechSynthesis?.cancel();
    closeModal();
  };
}

function projectModal() {
  modal("新建项目", `<label class="field-label">项目名称<input id="project-name" placeholder="例如：我的研究项目"></label><label class="field-label">项目指令<textarea id="project-instructions" rows="4" placeholder="告诉 ChatGPT 这个项目的背景与要求"></textarea></label>`, `<button class="primary-button" id="create-project">创建项目</button>`);
  $("#create-project").onclick = () => {
    const name = $("#project-name").value.trim();
    if (!name) return;
    const p = { id: uid(), name, instructions: $("#project-instructions").value };
    projects.push(p);
    localStorage.setItem("cg-projects", JSON.stringify(projects));
    projectFilter = p.id;
    renderHistory();
    closeModal();
    newChat("work");
    toast("已创建项目 " + name);
  };
}

function canvasModal() {
  modal("画布", `<label class="field-label">文件名<input id="canvas-name" value="index.html"></label><textarea id="canvas-source" class="python-editor" rows="12" spellcheck="false" placeholder="在这里编写 HTML、Markdown 或代码"></textarea>`, `<button class="secondary-button" id="canvas-preview">预览</button><button class="primary-button" id="canvas-save">保存到资料库</button>`);
  $("#canvas-preview").onclick = () => previewFile({ name: $("#canvas-name").value || "index.html", content: $("#canvas-source").value, mime: "text/html" });
  $("#canvas-save").onclick = async () => {
    if (busy) return toast("请先停止当前任务");
    const name = $("#canvas-name").value || "index.html", content = $("#canvas-source").value;
    const file = await createArtifact(name, content);
    if (!active) {
      active = { id: uid(), title: name, mode: "work", messages: [], createdAt: Date.now(), updatedAt: Date.now(),temporary };
      if(!temporary)chats.unshift(active);
    }
    active.messages.push({ id: uid(), role: "assistant", content: "已保存画布文件。", artifacts: [file] });
    currentView = "chat";
    $("#composer-form").hidden = false;
    setMode(active.mode);
    await persistChat();
    closeModal();
    renderMessages();
    previewFile(file);
  };
}

function webModal() {
  modal("搜索网页", `<p class="settings-description">使用已配置 API 的原生 web_search 工具检索网页，保留来源链接。</p><label class="settings-row">允许 AI 自动联网搜索<input type="checkbox" id="web-enabled" ${settings.webEnabled !== false ? "checked" : ""}></label><label class="field-label">搜索内容<input id="web-query" placeholder="你想了解什么？"></label><div id="web-result" class="prose"></div>`, `<button class="secondary-button" id="web-add">添加到对话</button><button class="primary-button" id="web-search">${icon("globe")}搜索</button>`);
  let found = null;
  $("#web-enabled").onchange = (e) => {
    settings.webEnabled = e.target.checked;
    persistSettings();
  };
  $("#web-search").onclick = async () => {
    const query = $("#web-query").value.trim();
    if (!query) return;
    const result = $("#web-result"), button = $("#web-search");
    button.disabled = true;
    result.textContent = "正在搜索网页…";
    try {
      found = await searchWeb(settings, query);
      result.innerHTML = markdown(found.text) + (found.sources.length ? "<h3>来源</h3>" + found.sources.map((s) => `<p><a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.title)}</a></p>`).join("") : "");
      enrich(result);
    } catch (e) {
      result.textContent = e.message;
    } finally {
      button.disabled = false;
    }
  };
  $("#web-query").onkeydown = (e) => {
    if (e.key === "Enter") $("#web-search").click();
  };
  $("#web-add").onclick = async () => {
    if (!found) return toast("请先搜索");
    if (busy) return toast("请先停止当前任务");
    const text = found.text + "\n\n来源：\n" + found.sources.map((s) => s.url).join("\n");
    const file = await createArtifact("web-research-" + Date.now() + ".md", text, "text/markdown");
    pendingFiles.push(file);
    closeModal();
    if (currentView !== "chat") {
      newChat(mode);
      pendingFiles.push(file);
    }
    renderAttachments();
    $("#prompt").focus();
  };
}

async function shareChat() {
  if (!active) return toast("请先开始聊天");
  const markdownText = "# " + active.title + "\n\n" + active.messages.filter((m) => m.role !== "tool").map((m) => `## ${m.role === "user" ? "你" : "ChatGPT"}

${m.content}`).join("\n\n");
  modal("分享聊天", `<p>导出当前对话，或复制为 Markdown。对话保存在当前浏览器，没有公开的云端分享链接。</p><textarea id="share-content" rows="7" readonly>${escape(markdownText)}</textarea>`, `<button class="secondary-button" id="share-download">${icon("download")}下载</button><button class="primary-button" id="share-copy">${icon("copy")}复制对话</button>`);
  $("#share-copy").onclick = () => copyText(markdownText);
  $("#share-download").onclick = () => download(active.title + ".md", markdownText, "text/markdown");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("已复制");
  } catch {
    modal("复制文本", `<textarea rows="8" readonly>${escape(text)}</textarea>`);
  }
}

async function action(name, payload = {}) {
  if(name==="plugins")return navigateApp("插件");
  if(name==="open-project"){projectFilter=typeof payload==="string"?payload:payload.id;newChat("work");return;}
  if(name==="locked-chats"){if(!await settingsEngine.requestPin())return;modal("已锁定的聊天",chats.filter(c=>c.locked).map(c=>`<button class="search-result" data-chat="${c.id}">${escape(c.title)}</button>`).join("")||"暂无已锁定的聊天");return;}
  if(name==="image-generate"&&payload.prompt){imageModal();$("#image-prompt").value=payload.prompt;if(payload.submit)$("#generate-image").click();return;}
  closeMenus();
  if (busy && ["clear-data", "import", "image-generate"].includes(name)) return toast("请先停止当前任务");
  if (name === "new" || name === "new-chat") newChat();
  else if (name === "toggle-sidebar") toggleSidebar();
  else if (name === "close-sidebar") document.body.classList.remove("sidebar-open");
  else if (name === "chat-menu") {
    if (active) chatMenu(active.id, $('[data-action="chat-menu"]'));
  } else if (name === "canvas") canvasModal();
  else if (name === "web") webModal();
  else if (name === "search") searchModal();
  else if (name === "settings") settingsModal();
  else if (name === "images") showLibrary(true);
  else if (name === "library") showLibrary();
  else if (name === "codex") newChat("codex");
  else if (name === "chatgpt") newChat("chat");
  else if (name === "work") newChat("work");
  else if (name === "python") pythonConsole();
  else if (name === "temporary") {
    if(busy)return toast('请先停止当前任务');
    newChat(mode);
    temporary = true;
    $("#status").textContent = "临时聊天 · 关闭后不保存";
    toast("临时聊天已开启");
  } else if (name === "projects" || name === "new-project") projectModal();
  else if (name === "apps") modal("应用与工具", `<div class="app-tools"><button data-action="python">${icon("terminal")}<span>Python<small>运行代码、分析数据、绘制图表</small></span></button><button data-action="attach">${icon("paperclip")}<span>文件分析<small>读取 PDF、Word、CSV、文本和图片</small></span></button><button data-action="library">${icon("book")}<span>资料库<small>预览和下载生成的文件</small></span></button></div><p class="settings-description">此独立应用提供以上可用工具。外部账户连接与原版插件市场未接入。</p>`);
  else if (name === "attach") {
    closeModal();
    $("#file-input").click();
  } else if (name === "share") shareChat();
  else if (name === "export") {
    try {
      download("chatgpt-export-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", JSON.stringify({ ...await db.exportData(), ...await exportMetadata() }, null, 2), "application/json");
    } catch (e) {
      toast(e.message);
    }
  } else if (name === "import") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      try {
        if (busy) return toast("请先停止当前任务");
        const imported = JSON.parse(await input.files[0].text());
        await db.importData(imported);
        await importMetadata(imported);
        if (Array.isArray(imported.projects)) {
          for (const p of imported.projects) if (p && /^[a-zA-Z0-9_-]{1,128}$/.test(p.id) && typeof p.name === "string") {
            const i = projects.findIndex((x) => x.id === p.id);
            const clean = { id: p.id, name: p.name, instructions: String(p.instructions || "") };
            if (i < 0) projects.push(clean);
            else projects[i] = clean;
          }
          localStorage.setItem("cg-projects", JSON.stringify(projects));
        }
        chats = await db.loadChats();
        if(active){active=chats.find(c=>c.id===active.id)||null;if(active){setMode(active.mode);$('#chat-title').textContent=active.title;renderMessages();}else newChat(mode);}
        renderHistory();
        closeModal();
        toast("数据已导入");
      } catch (e) {
        toast(e.message);
      }
    };
    input.click();
  } else if (name === "clear-data") confirmModal("删除所有聊天？", "所有聊天与附件将从当前浏览器中删除。建议先导出备份。", async () => {
    if (busy) return toast("请先停止当前任务");
    await db.clearChats();
    await navigationViews?.clearState();
    chats = [];
    projects = [];
    projectFilter = null;
    localStorage.setItem("cg-projects", "[]");
    newChat();
  });
  else if (name === "test-connection") {
    const button = $('[data-action="test-connection"]');
    button.disabled = true;
    $("#connection-result").textContent = "正在测试…";
    try {
      const form = new FormData($("#settings-form"));
      const data = await getModels({ ...settings, ...Object.fromEntries(form) });
      $("#connection-result").textContent = "已连接 · " + data.length + " 个模型";
    } catch (e) {
      $("#connection-result").textContent = e.message;
    } finally {
      button.disabled = false;
    }
  } else if (name === "help") settingsModal("about");
  else if (name === "image-generate") imageModal();
}

function imageModal() {
  if(!$("#prompt"))renderHome();
  modal("创建图片", `<p class="settings-description">通过当前 API 的图像生成接口创建图片。是否可用由服务商决定。</p><label class="field-label">画面描述<textarea id="image-prompt" rows="4" placeholder="描述你想创建的图片"></textarea></label><label class="field-label">图像模型<select id="image-model">${(models.filter((x) => x.includes("image")).length ? models.filter((x) => x.includes("image")) : ["gpt-image-2"]).map((x) => `<option>${escape(x)}</option>`).join("")}</select></label><div id="image-result"></div>`, `<button class="primary-button" id="generate-image">生成图片</button>`);
  $("#generate-image").onclick = async () => {
    const prompt = $("#image-prompt").value.trim();
    if (!prompt) return;
    const button = $("#generate-image"), result = $("#image-result");
    if (busy) return toast("请先停止当前任务");
    busy = true;
    button.disabled = true;
    result.textContent = "正在生成图片…";
    try {
      const res = await fetch(settings.apiBase.replace(/\/$/, "").replace(/\/v1$/, "") + "/v1/images/generations", { method: "POST", headers: { Authorization: "Bearer " + settings.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ model: $("#image-model").value, prompt, n: 1, size: "1024x1024" }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || "图像接口请求失败");
      const item = data.data?.[0];
      if (!item) throw new Error("服务商没有返回图片");
      let src = item.b64_json ? "data:image/png;base64," + item.b64_json : item.url;
      if (src && !src.startsWith("data:")) {
        const imageResponse = await fetch(src);
        if (!imageResponse.ok) throw new Error("无法下载生成的图片");
        const blob = await imageResponse.blob();
        src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (!src) throw new Error("服务商没有返回图片地址");
      const file = { id: uid(), name: "image-" + Date.now() + ".png", mime: "image/png", type: "image/png", dataUrl: src, createdAt: Date.now() };
      if (!temporary) await db.saveAsset(file);
      if (!active) {
        active = { id: uid(), title: prompt.slice(0, 40), mode: "chat", messages: [], createdAt: Date.now(), updatedAt: Date.now(),temporary };
        if (!temporary) chats.unshift(active);
      }
      active.messages.push({ id: uid(), role: "user", content: prompt }, { id: uid(), role: "assistant", content: "", artifacts: [file] });
      await persistChat();
      closeModal();
      renderMessages();
    } catch (e) {
      result.textContent = e.message;
    } finally {
      busy = false;
      autoGrow();
      button.disabled = false;
    }
  };
}

let navigationViews;
const navSlugs={'资料空间':'spaces','定时任务':'tasks','插件':'plugins','探索':'explore','站点':'sites','地图':'maps','图像':'images','GPT':'gpts','项目':'projects'};
async function navigateApp(label){
  if(busy)return toast('请先停止当前回复');
  if(label==='首页')return newChat('chat');if(label==='Codex')return newChat('codex');if(label==='用量')return navigateSettings('usage');if(label==='打开个人资料菜单')return profileMenu($('#profile-button'));
  const slug=navSlugs[label]||label;const entry=templates.views?.[slug];
  if(entry)renderTemplate(entry);else{renderTemplate(templates.home);const main=$('[data-ui-main]');if(main)main.replaceChildren();}
  ensureInfrastructure();currentView=slug;document.body.dataset.view=slug;setHash('view='+slug);
  await navigationViews.show(slug,$('[data-ui-main]'),{captured:!!entry});prepareNavigationComposer();renderHistory();localize();
}
async function handleButton(t,e){
  if(currentView==='settings'&&await settingsEngine.handleClick(e,t))return;
  if(t.dataset.settingsPanelSlug)return navigateSettings(t.dataset.settingsPanelSlug);
  if(t.dataset.togglePin){const pins=readJSON('cg-navigation-pins',{});pins[t.dataset.togglePin]=pins[t.dataset.togglePin]===false;localStorage.setItem('cg-navigation-pins',JSON.stringify(pins));applyPins();t.setAttribute('aria-label',pins[t.dataset.togglePin]?'从侧边栏取消置顶':'固定到侧边栏');return;}
  if(t.dataset.nav==='探索')return exploreMenu(t);
  if(t.dataset.nav)return navigateApp(t.dataset.nav);
  if(t.id==='profile-button')return profileMenu(t);
  if(t.dataset.action==='login')return loginModal();
  if(t.dataset.action==='logout'){await signOut();identity=null;updateIdentity();closeMenus();toast('已退出登录');return;}
  if(t.dataset.action)return action(t.dataset.action);
  if(t.dataset.chat){closeModal();return openChat(t.dataset.chat);}
  if(t.dataset.chatMenu)return chatMenu(t.dataset.chatMenu,t);
  if(t.dataset.chatAction)return chatAction(t.dataset.chatAction,t.dataset.cid);
  if(t.dataset.project){closeModal();projectFilter=t.dataset.project;newChat('work');return;}
  if('moveProject'in t.dataset){const c=chats.find(c=>c.id===t.dataset.cid);if(c){c.projectId=t.dataset.moveProject||null;await persistChat(c);}closeModal();return;}
  if('removeFile'in t.dataset){pendingFiles.splice(Number(t.dataset.removeFile),1);renderAttachments();return;}
  if(t.dataset.artifact)return openArtifact(t.dataset.artifact);
  if(t.dataset.prompt){$('#prompt').value=t.dataset.prompt;autoGrow();$('#prompt').focus();return;}
  if(t.dataset.codeAction){const block=t.closest('.code-block'),code=block.querySelector('code').textContent,lang=block.querySelector('.code-header>span').textContent;const a=t.dataset.codeAction;if(a==='copy')copyText(code);if(a==='download')download('code.'+({python:'py',javascript:'js',typescript:'ts',html:'html'}[lang]||lang||'txt'),code);if(a==='preview')previewFile({name:'preview.html',content:code,mime:'text/html'});if(a==='run'){pythonConsole();$('#python-code').value=code;$('#run-python').click();}return;}
  if(t.dataset.msgAction){const m=active?.messages.find(m=>m.id===t.dataset.mid);if(!m)return;const a=t.dataset.msgAction;if(a==='copy')copyText(m.content);if(a==='speak')speak(m.content);if(a==='like'||a==='dislike'){m.feedback=m.feedback===a?null:a;await persistChat();renderMessages(false);}if(a==='retry'&&!busy){const idx=active.messages.indexOf(m);active.messages=active.messages.slice(0,m.role==='user'?idx+1:idx);while(active.messages.length&&active.messages.at(-1).role!=='user')active.messages.pop();await generate();}if(a==='edit'&&!busy){modal('编辑消息',`<textarea id="edit-message" rows="6">${escape(m.content)}</textarea>`,'<button class="primary-button" id="save-edit">发送</button>');$('#save-edit').onclick=async()=>{m.content=$('#edit-message').value;active.messages=active.messages.slice(0,active.messages.indexOf(m)+1);closeModal();renderMessages();await generate();};}return;}
  const id=t.id, label=t.dataset.runtimeLabel||t.getAttribute('aria-label')||t.textContent.trim();
  if(id==='model-button')return; // Original power picker owns this event.
  if(id==='sidebar-toggle'||label==='显示/隐藏侧边栏'){toggleSidebar();return;}
  if(id==='new-chat'||label==='新聊天')return newChat();
  if(id==='search-chats'||label==='搜索')return searchModal();
  if(id==='mode-chat'||id==='mode-work'){if(busy)return toast('请先停止当前回复');const next=id==='mode-work'?'work':'chat';if(active?.messages.length)return newChat(next);return switchEmptyMode(next);}
  if(id==='attach-button'){menuAt(t,`<button class="menu-item" data-action="attach">${icon('paperclip')}添加照片和文件</button><button class="menu-item" data-action="web">${icon('globe')}搜索网页</button><button class="menu-item" data-action="image-generate">${icon('image')}创建图像</button><button class="menu-item" data-action="canvas">${icon('file')}画布</button><button class="menu-item" data-action="python">${icon('terminal')}Python</button>`);return;}
  if(id==='send-button'||label==='发送'||label==='发送提示词'){e.preventDefault();return send();}
  if(id==='stop-button'){controller?.abort();python.terminate();return;}
  if(id==='mic-button'){if(settingsEngine.getState().dictationEnabled)return startListening();return toast('听写已在语音设置中关闭');}
  if(id==='voice-button'){if(settingsEngine.getState().voiceEnabled)return voiceModal();return toast('语音已在个性化设置中关闭');}
  if(id==='artifact-close'){$('#artifact-panel').hidden=true;return;}
  if(label==='临时聊天')return action('temporary');
  if(label==='添加新项目')return projectModal();
  if(label==='选择项目'){modal('选择项目',projects.map(p=>`<button class="search-result" data-project="${escape(p.id)}">${escape(p.name)}</button>`).join('')+'<button class="secondary-button" data-action="new-project">创建项目</button>');return;}
  if(label==='选择要添加的文件'||label==='文件')return action('attach');
  if(label==='插件')return navigateApp('插件');
  if(label==='创建图像或贴纸')return imageModal();
  if(label==='撰写或编辑'){$('#prompt').value='帮我撰写或编辑一段文字。';autoGrow();$('#prompt').focus();return;}
  if(label==='搜索网页')return webModal();
  if(label==='关闭工作建议'){t.closest('[role="region"]')?.remove();return;}
  if(label==='上一组任务'||label==='下一组任务'){const area=t.closest('[role="region"]');const row=area?.querySelector('[class*="overflow-x"], [class*="snap-x"]');row?.scrollBy({left:(label==='上一组任务'?-1:1)*row.clientWidth,behavior:'smooth'});return;}
  if(label==='试一试'){const card=t.closest('article');$('#prompt').value=card?.querySelector('h1,h2,h3')?.textContent||card?.textContent.replace('试一试','').trim()||'';autoGrow();return;}
  if(label==='关闭 ChatGPT 信标横幅'){t.closest('[role="status"],aside,[data-beacon-banner]')?.remove();t.parentElement?.remove();return;}
  if(/位置|更改权限|默认环境/.test(label))return environmentDialog(label);
  if(label==='打开桌面应用'){location.href='https://chatgpt.com/download/';return;}
  if(label==='项目侧边栏选项'||label==='聊天侧边栏选项')return menuAt(t,'<button class="menu-item" data-action="new-project">新建项目</button><button class="menu-item" data-action="export">导出数据</button><button class="menu-item" data-action="settings">设置</button>');
}
async function switchEmptyMode(next){if(next===mode)return;const text=$('#prompt')?.value||'';await motion.swapHome(()=>{mode=next;renderHome();$('#prompt').value=text;autoGrow();},{focus:true});revealComposer(true);}
function environmentDialog(label){modal(label,`<div class="settings-row"><span>默认环境</span><span>Python · WebAssembly</span></div><p>此网站的执行环境位于当前浏览器。上传的文件可由 AI 读取，Python 可实际运行并生成文件。</p><button class="secondary-button" data-action="python">打开 Python 工作区</button>`);}
document.addEventListener('click',async e=>{try{if(e.target.closest('[data-close-modal]')||e.target.classList.contains('modal-backdrop')){voiceSession=false;recognition?.abort();speechSynthesis?.cancel();closeModal();return;}if(currentView!=='settings'&&await navigationViews?.handleClick(e,e.target))return;const t=e.target.closest('button,[data-action],[data-chat],[data-artifact],[data-settings-panel-slug],[data-nav],[data-nav-action],[role=button],a');if(!t){if(!e.target.closest('.menu,[data-power-picker]'))closeMenus();return;}if(t.tagName==='A'){const href=t.getAttribute('href')||'';if(href==='/'||href==='https://chatgpt.com/'){e.preventDefault();newChat();return;}if(href.startsWith('/settings/')){e.preventDefault();navigateSettings(href.split('/')[2]);return;}if(href.startsWith('/')&&!href.startsWith('//')){e.preventDefault();return;}}await handleButton(t,e);}catch(error){console.error(error);toast(error.message);}});
document.addEventListener('input',e=>{if(e.target.id==='prompt'&&currentView==='chat')autoGrow();else if(currentView==='settings')settingsEngine.handleChange(e);else navigationViews?.handleChange(e);});
document.addEventListener('change',async e=>{if(e.target.id==='file-input')return addFiles(e.target.files);if(currentView==='settings'&&await settingsEngine.handleChange(e))return;await navigationViews?.handleChange(e);});
document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.target.closest('.settings-dialog,.nav-local-dialog'))return;if(e.key==='Escape'){closeMenus();closeModal();if($('#artifact-panel'))$('#artifact-panel').hidden=true;}});
document.addEventListener('paste',e=>{if(e.target.id==='prompt'&&e.clipboardData.files.length){e.preventDefault();addFiles(e.clipboardData.files);}});
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
document.addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();if(!$('#prompt'))renderHome();addFiles(e.dataTransfer.files);}});
window.addEventListener('hashchange',()=>routeFromHash());
window.addEventListener('unhandledrejection',e=>toast(e.reason?.message||'操作未完成'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
function routeFromHash(){const p=new URLSearchParams(location.hash.slice(1));if(p.has('settings'))navigateSettings(p.get('settings'));else if(p.has('view'))navigateApp(p.get('view'));else if(p.has('c'))openChat(p.get('c'));}
async function init(){
  const r=await fetch('./ui/templates.json?v='+(document.documentElement.dataset.appBuild||'current'));if(!r.ok)throw new Error('页面模板加载失败');templates=await r.json();
  const icons=await(await fetch('./feature-icons.svg')).text();const defs=document.createElement('div');defs.hidden=true;defs.innerHTML=icons;document.body.append(defs);
  ensureInfrastructure();settingsEngine=createSettingsEngine({getSettings:()=>settings,onSettingsChange:patch=>{Object.assign(settings,patch);if(patch.webSearch!==undefined)settings.webEnabled=patch.webSearch;localStorage.setItem('cg-settings',JSON.stringify(settings));if(picker&&$('#model-button'))mountComposerPicker(currentView==='chat'?mode:'chat');companion?.refresh();localize();},toast,download,db,getChats:()=>chats,onChatsChanged:async()=>{chats=await db.loadChats();if(active)active=chats.find(c=>c.id===active.id)||null;renderHistory();},onNavigate:navigateSettings,onLogin:loginModal,onLogout:async()=>{await signOut();identity=null;},getIdentity:()=>identity,onOpenChat:openChat,getExportMetadata:exportMetadata,onImportMetadata:importMetadata,onResetWork:()=>{python.reset();pendingFiles=[];},onClearData:async()=>{await navigationViews?.clearState();projects=[];projectFilter=null;active=null;pendingFiles=[];localStorage.setItem('cg-projects','[]');localStorage.removeItem('cg-active');}});
  companion=mountCompanion({getPreferences:()=>settingsEngine.getState(),getMode:()=>currentView==='chat'?mode:'chat',onOpenSettings:navigateSettings});
  const{createNavigationViews}=await import('./navigation-views.js');navigationViews=createNavigationViews({getChats:()=>chats,getProjects:()=>projects,onOpenChat:openChat,onNewChat:nextMode=>{const g=readJSON('cg-active-gpt',null);newChat(nextMode);pendingGpt=g;},onCreateProject:projectModal,onSettings:navigateSettings,onAction:action,toast,dialog:modal,openMenu:menuAt,download,db});
  chats=await db.loadChats();for(const c of chats){c.messages=completeToolResponses(c.messages);c.messages.forEach(m=>delete m.streaming);}
  try{identity=await getIdentity();}catch{identity=null;}
  installKeyboardShortcuts({getPreferences:()=>settingsEngine.getState(),onCommand:handleShortcut,getContext:()=>({view:currentView,busy,hasActiveChat:!!active,canSubmit:!busy,artifactOpen:!!$('#artifact-panel')&&!$('#artifact-panel').hidden})});
  renderHome();motion.enterHeadline($('#welcome'));const hash=location.hash;if(hash)routeFromHash();else{const id=localStorage.getItem('cg-active');if(chats.some(c=>c.id===id))openChat(id);}fetchModels();
}
init().catch(e=>{console.error(e);ensureInfrastructure();toast(e.message);});
