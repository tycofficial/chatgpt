/* Browser-local counterparts of the settings controls captured from chatgpt.com.
 * Account services (billing, MFA, remote sessions) are never represented as active
 * OpenAI services. Preferences and data actions below operate on this website. */
const KEY = 'cg-ui-settings';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEFAULTS = { appearanceTheme:'system', preset:'codex', accent:'default', surface:null, ink:null, sansFontSize:16, codeFontSize:12, reducedMotion:'system', separateModes:false, language:'auto', enterBehavior:'enter', enabledEfforts:['none','low','medium','high','xhigh','max'], customInstructions:'', codexInstructions:'', memoryEnabled:true, memories:[], voiceLanguage:'auto', dictationEnabled:true, workInternetAccess:true, voiceEnabled:true, webSearch:true, librarySearch:true, connectors:true, notifications:{}, shortcuts:{}, localProfile:{name:'',username:'',email:''}, family:[], trustedContact:null, dictionary:[], permissions:{}, securityHistory:[], archived:false, referencePhoto:null, fullBodyPhoto:null, pet:'default' };
const COLORS = {default:'#3a83f7',blue:'#3a83f7',green:'#22a06b',yellow:'#e6b828',pink:'#e261a6',orange:'#ed8447',purple:'#9b72df',black:'#111111'};
const COLOR_LABELS = {default:'默认',blue:'蓝色',green:'绿色',yellow:'黄色',pink:'粉色',orange:'橙色',purple:'紫色',black:'黑色',custom:'自定义'};
const PRESETS = [['codex','ChatGPT','both'],['absolutely','Absolutely','both'],['ayu','Ayu','dark'],['catppuccin','Catppuccin','both'],['dracula','Dracula','dark'],['everforest','Everforest','both'],['github','GitHub','both'],['gruvbox','Gruvbox','both'],['linear','Linear','both'],['lobster','Lobster','dark'],['material','Material','dark'],['matrix','Matrix','dark'],['monokai','Monokai','dark'],['night-owl','Night Owl','dark'],['nord','Nord','dark'],['notion','Notion','both'],['og','OG','dark'],['oscurange','Oscurange','dark'],['one','One','both'],['proof','Proof','light'],['raycast','Raycast','both'],['rose-pine','Rose Pine','both'],['sentry','Sentry','dark'],['solarized','Solarized','both'],['temple','Temple','dark'],['tokyo-night','Tokyo Night','dark'],['vercel','Vercel','both'],['vscode-plus','VS Code Plus','both'],['xcode','Xcode','both']];
const THEME_PALETTES = {"absolutely":{"light":{"accent":"#cc7d5e","ink":"#2d2d2b","semanticColors":{"diffAdded":"#00c853","diffRemoved":"#ff5f38"},"surface":"#f9f9f7"},"dark":{"accent":"#cc7d5e","ink":"#f9f9f7","semanticColors":{"diffAdded":"#00c853","diffRemoved":"#ff5f38"},"surface":"#2d2d2b"}},"ayu":{"dark":{"accent":"#e6b450","ink":"#bfbdb6","semanticColors":{"diffAdded":"#70bf56","diffRemoved":"#f26d78"},"surface":"#10141c"}},"catppuccin":{"light":{"accent":"#8839ef","ink":"#4c4f69","semanticColors":{"diffAdded":"#40a02b","diffRemoved":"#d20f39"},"surface":"#eff1f5","palette":{"blue":"#1e66f5","green":"#40a02b","orange":"#fe640b","purple":"#8839ef","red":"#d20f39","yellow":"#df8e1d"}},"dark":{"accent":"#cba6f7","ink":"#cdd6f4","semanticColors":{"diffAdded":"#a6e3a1","diffRemoved":"#f38ba8"},"surface":"#1e1e2e","palette":{"blue":"#89b4fa","green":"#a6e3a1","orange":"#fab387","purple":"#cba6f7","red":"#f38ba8","yellow":"#f9e2af"}}},"codex":{},"dracula":{"dark":{"accent":"#ff79c6","ink":"#f8f8f2","semanticColors":{"diffAdded":"#50fa7b","diffRemoved":"#ff5555"},"surface":"#282a36"}},"everforest":{"light":{"accent":"#93b259","ink":"#5c6a72","semanticColors":{"diffAdded":"#8da101","diffRemoved":"#f85552"},"surface":"#fdf6e3","palette":{"blue":"#3a94c5","green":"#8da101","orange":"#f57d26","purple":"#df69ba","red":"#f85552","yellow":"#dfa000"}},"dark":{"accent":"#a7c080","ink":"#d3c6aa","semanticColors":{"diffAdded":"#a7c080","diffRemoved":"#e67e80"},"surface":"#2d353b","palette":{"blue":"#7fbbb3","green":"#a7c080","orange":"#e69875","purple":"#d699b6","red":"#e67e80","yellow":"#dbbc7f"}}},"github":{"light":{"accent":"#0969da","ink":"#1f2328","semanticColors":{"diffAdded":"#1a7f37","diffRemoved":"#cf222e"},"surface":"#ffffff"},"dark":{"accent":"#1f6feb","ink":"#e6edf3","semanticColors":{"diffAdded":"#3fb950","diffRemoved":"#f85149"},"surface":"#0d1117"}},"gruvbox":{"light":{"accent":"#458588","ink":"#3c3836","semanticColors":{"diffAdded":"#3c3836","diffRemoved":"#cc241d"},"surface":"#fbf1c7"},"dark":{"accent":"#458588","ink":"#ebdbb2","semanticColors":{"diffAdded":"#ebdbb2","diffRemoved":"#cc241d"},"surface":"#282828"}},"linear":{"light":{"accent":"#5e6ad2","ink":"#1b1b1b","semanticColors":{"diffAdded":"#52a450","diffRemoved":"#c94446"},"surface":"#fcfcfd","fonts":{"ui":"Inter"},"opaqueWindows":true},"dark":{"accent":"#606acc","ink":"#e3e4e6","semanticColors":{"diffAdded":"#69c967","diffRemoved":"#ff7e78"},"surface":"#0f0f11","fonts":{"ui":"Inter"},"opaqueWindows":true}},"lobster":{"dark":{"accent":"#ff5c5c","ink":"#e4e4e7","semanticColors":{"diffAdded":"#22c55e","diffRemoved":"#ff5c5c"},"surface":"#111827","fonts":{"ui":"Satoshi"}}},"material":{"dark":{"accent":"#80cbc4","ink":"#eeffff","semanticColors":{"diffAdded":"#c3e88d","diffRemoved":"#f07178"},"surface":"#212121"}},"matrix":{"dark":{"accent":"#1eff5a","ink":"#b8ffca","semanticColors":{"diffAdded":"#1eff5a"},"surface":"#040805","fonts":{"code":null,"ui":"ui-monospace, \"SFMono-Regular\", \"SF Mono\", Menlo, Consolas, \"Liberation Mono\", monospace"},"opaqueWindows":true}},"monokai":{"dark":{"accent":"#99947c","ink":"#f8f8f2","semanticColors":{"diffAdded":"#86b42b","diffRemoved":"#c4265e"},"surface":"#272822"}},"night-owl":{"dark":{"accent":"#44596b","ink":"#d6deeb","semanticColors":{"diffAdded":"#c5e478","diffRemoved":"#ef5350"},"surface":"#011627"}},"nord":{"dark":{"accent":"#88c0d0","ink":"#d8dee9","semanticColors":{"diffAdded":"#a3be8c","diffRemoved":"#bf616a"},"surface":"#2e3440","palette":{"blue":"#81a1c1","green":"#a3be8c","orange":"#d08770","purple":"#b48ead","red":"#bf616a","yellow":"#ebcb8b"}}},"notion":{"light":{"accent":"#3183d8","ink":"#37352f","semanticColors":{"diffAdded":"#008000","diffRemoved":"#a31515"},"surface":"#ffffff","fonts":{"code":null,"ui":null},"opaqueWindows":true},"dark":{"accent":"#3183d8","ink":"#d9d9d8","semanticColors":{"diffAdded":"#4ec9b0"},"surface":"#191919","fonts":{"code":null,"ui":null},"opaqueWindows":true}},"og":{"dark":{"accent":"#10a37f","ink":"#d1d5db","semanticColors":{"diffAdded":"#65c99a","diffRemoved":"#f28b82"},"surface":"#343541","fonts":{"code":null,"content":"Arial, sans-serif","ui":"Arial, sans-serif"},"opaqueWindows":true}},"one":{"light":{"accent":"#526fff","ink":"#383a42","semanticColors":{"diffAdded":"#3bba54","diffRemoved":"#e45649"},"surface":"#fafafa"},"dark":{"accent":"#4d78cc","ink":"#abb2bf","semanticColors":{"diffAdded":"#8cc265","diffRemoved":"#e05561"},"surface":"#282c34"}},"oscurange":{"dark":{"accent":"#f9b98c","ink":"#e6e6e6","surface":"#0b0b0f"}},"proof":{"light":{"accent":"#3d755d","ink":"#2f312d","semanticColors":{"diffAdded":"#3d755d"},"surface":"#f5f3ed","fonts":{"code":null,"ui":null},"opaqueWindows":false}},"raycast":{"light":{"accent":"#ff6363","ink":"#030303","semanticColors":{"diffAdded":"#006b4f","diffRemoved":"#b12424"},"surface":"#ffffff","fonts":{"code":"\"Jetbrains Mono\"","ui":"Inter"},"opaqueWindows":false},"dark":{"accent":"#ff6363","ink":"#fefefe","semanticColors":{"diffAdded":"#59d499","diffRemoved":"#ff6363"},"surface":"#101010","fonts":{"code":"\"Jetbrains Mono\"","ui":"Inter"},"opaqueWindows":false}},"rose-pine":{"light":{"accent":"#d7827e","ink":"#575279","semanticColors":{"diffAdded":"#56949f","diffRemoved":"#797593"},"surface":"#faf4ed","palette":{"blue":"#56949f","green":"#286983","orange":"#d7827e","purple":"#907aa9","red":"#b4637a","yellow":"#ea9d34"}},"dark":{"accent":"#ea9a97","ink":"#e0def4","semanticColors":{"diffAdded":"#9ccfd8","diffRemoved":"#908caa"},"surface":"#232136","palette":{"blue":"#9ccfd8","green":"#3e8fb0","orange":"#ea9a97","purple":"#c4a7e7","red":"#eb6f92","yellow":"#f6c177"}}},"sentry":{"dark":{"accent":"#7055f6","ink":"#e6dff9","semanticColors":{"diffAdded":"#8ee6d7"},"surface":"#2d2935","fonts":{"code":null,"ui":null}}},"solarized":{"light":{"accent":"#b58900","ink":"#657b83","semanticColors":{"diffAdded":"#859900","diffRemoved":"#dc322f"},"surface":"#fdf6e3"},"dark":{"accent":"#d30102","ink":"#839496","semanticColors":{"diffAdded":"#859900","diffRemoved":"#dc322f"},"surface":"#002b36"}},"temple":{"dark":{"accent":"#e4f222","ink":"#c7e6da","surface":"#02120c"}},"tokyo-night":{"dark":{"accent":"#3d59a1","ink":"#a9b1d6","semanticColors":{"diffAdded":"#449dab","diffRemoved":"#914c54"},"surface":"#1a1b26","palette":{"blue":"#7aa2f7","green":"#41a6b5","orange":"#ff9e64","purple":"#9d7cd8","red":"#f7768e","yellow":"#e0af68"}}},"vercel":{"light":{"accent":"#006aff","ink":"#171717","semanticColors":{"diffAdded":"#28A948","diffRemoved":"#EB001D"},"surface":"#ffffff","contrast":40,"fonts":{"code":"\"Geist Mono\", ui-monospace, \"SFMono-Regular\"","ui":"Geist, Inter"},"opaqueWindows":true},"dark":{"accent":"#006efe","ink":"#ededed","semanticColors":{"diffAdded":"#00AD3A","diffRemoved":"#F13342"},"surface":"#000000","contrast":50,"fonts":{"code":"\"Geist Mono\", ui-monospace, \"SFMono-Regular\"","ui":"Geist, Inter"},"opaqueWindows":true}},"vscode-plus":{"light":{"accent":"#007acc","ink":"#000000","semanticColors":{"diffAdded":"#008000","diffRemoved":"#ee0000"},"surface":"#ffffff"},"dark":{"accent":"#007acc","ink":"#d4d4d4","semanticColors":{"diffAdded":"#369432","diffRemoved":"#f44747"},"surface":"#1e1e1e"}},"xcode":{"light":{"accent":"#0e0eff","ink":"#000000","semanticColors":{"diffRemoved":"#c41a16"},"surface":"#ffffff","fonts":{"code":"\"SFMono-Regular\""}},"dark":{"accent":"#5482ff","ink":"#ffffff","semanticColors":{"diffAdded":"#67b7a4","diffRemoved":"#fc6a5d"},"surface":"#1f1f24","fonts":{"code":"\"SFMono-Medium\""}}}};
const PETS = ['Codex','Dewey','Fireball','Hoots','Rocky','Seedy','Stacky','BSOD','Null Signal'];
const LANGUAGES = ['ar','bn','cs','da','de','el','en','es','fa','fi','fr','he','hi','hu','id','it','ja','ko','ms','nl','no','pl','pt','ro','ru','sk','sv','ta','th','tr','uk','ur','vi','zh-CN','zh-TW'];
const ROW_KEYS = { 'personalization-unified-memory':'memoryEnabled','personalization-writing-style':'writingStyle','personalization-fast-answers':'fastAnswers','personalization-suggested-prompts':'suggestedPrompts','personalization-record-history':'recordHistory','personalization-web-search':'webSearch','personalization-voice':'voiceEnabled','personalization-library-search':'librarySearch','personalization-connectors':'connectors','voice-account-dictation':'dictationEnabled','voice-live-transcription':'liveTranscription','security-csp-for-custom-apps':'enforceCsp','security-device-code-sign-in':'deviceCodeSignIn','appearance-separate-modes':'separateModes','data-controls-work-network':'workInternetAccess' };

export function getLocalPreferences() {
  const s={ ...DEFAULTS, ...read(KEY,{}) };
  s.enabledEfforts=[...new Set((Array.isArray(s.enabledEfforts)?s.enabledEfforts:DEFAULTS.enabledEfforts).map(v=>v==='instant'?'none':v==='pro'?'max':v).filter(v=>['none','low','medium','high','xhigh','max'].includes(v)))];
  if(!s.enabledEfforts.length)s.enabledEfforts=[...DEFAULTS.enabledEfforts];
  s.memories=Array.isArray(s.memories)?s.memories.filter(m=>m&&typeof m.text==='string'):[];
  s.dictionary=Array.isArray(s.dictionary)?s.dictionary.filter(v=>typeof v==='string'):[];
  s.localProfile=s.localProfile&&typeof s.localProfile==='object'?s.localProfile:{...DEFAULTS.localProfile};
  s.permissions=s.permissions&&typeof s.permissions==='object'?s.permissions:{};
  s.shortcuts=s.shortcuts&&typeof s.shortcuts==='object'?s.shortcuts:{};
  s.family=Array.isArray(s.family)?s.family:[];
  s.securityHistory=Array.isArray(s.securityHistory)?s.securityHistory:[];
  return s;
}
export function personalInstructions(mode='chat') {
  const s=getLocalPreferences();
  const pieces=[mode==='codex'?s.codexInstructions:s.customInstructions];
  if(s.memoryEnabled&&s.memories.length)pieces.push('用户保存的记忆：\n'+s.memories.map(x=>x.text).join('\n'));
  if(s.baseStyle&&s.baseStyle!=='default')pieces.push('回复风格：'+s.baseStyle);
  for(const [key,label] of [['warm','亲切程度'],['enthusiastic','热情程度'],['emoji','表情符号'],['scannable','标题和列表']])if(s[key]&&s[key]!=='default')pieces.push(label+'：'+s[key]);
  if(s.language&&s.language!=='auto')pieces.push('优先使用此语言回复：'+s.language);
  return pieces.filter(Boolean).join('\n\n');
}

export function createSettingsEngine(options={}) {
  const {getSettings=()=>({}),onSettingsChange=()=>{},toast=()=>{},download,db={},getChats=()=>[],onChatsChanged=()=>{},onNavigate=()=>{},onOpenChat,onClearData=async()=>{},getExportMetadata=()=>({}),onImportMetadata=async()=>{},onResetWork, onLogin=()=>{},onLogout=()=>{},getIdentity=()=>null}=options;
  let state=getLocalPreferences(),root=document,slug='',modal=null,lastFocus=null,archiveQuery='',storageQuery='',storageImages=false,storageSort='date',usageDays=7,usageTab='overview',usageGroup='mode';
  const mq=matchMedia('(prefers-color-scheme: dark)');
  const currentMode=()=>state.appearanceTheme==='system'?(mq.matches?'dark':'light'):state.appearanceTheme;
  function notifySettings(){
    onSettingsChange({theme:state.appearanceTheme,language:state.language,customInstructions:state.customInstructions,enterBehavior:state.enterBehavior,enabledEfforts:state.enabledEfforts,workInternetAccess:state.workInternetAccess,toolPermissionMode:state.toolPermissionMode||'review_important_actions',webSearch:state.webSearch,voiceEnabled:state.voiceEnabled,voiceLanguage:state.voiceLanguage,voiceName:state.voiceName,uiPreferences:state});
  }
  function save(patch={},notify=true){
    state={...state,...patch};localStorage.setItem(KEY,JSON.stringify(state));
    document.cookie='codex_appearance_theme='+encodeURIComponent(state.appearanceTheme)+'; Max-Age=31536000; Path=/; SameSite=Lax';
    document.cookie='cg_preferences=1; Max-Age=31536000; Path=/; SameSite=Lax';
    notifySettings();
    applyAppearance();if(notify)sync(root);return state;
  }
  function applyAppearance(){
    const el=document.documentElement,dark=currentMode()==='dark';
    el.dataset.theme=dark?'dark':'light';el.dataset.appearancePreset=state.preset||'codex';el.style.colorScheme=dark?'dark':'light';
    el.classList.toggle('dark',dark);el.lang=state.language==='auto'?(navigator.language||'zh-CN'):state.language;
    el.dataset.reducedMotion=String(state.reducedMotion==='on'||state.reducedMotion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
    const font=Math.max(11,Math.min(16,Number(state.sansFontSize)||16)),code=Math.max(8,Math.min(24,Number(state.codeFontSize)||12));
    const vars={'--font-ui-size':font+'px','--font-code-size':code+'px','--codex-chat-code-font-size':code+'px','--codex-chat-font-size':font+'px','--text-base':font+'px','--text-sm':(font-2)+'px','--text-xs':(font-4)+'px','--text-lg':(font+2)+'px','--text-xl':(font+4)+'px','--text-2xl':(font+8)+'px'};
    for(const [key,value]of Object.entries(vars))el.style.setProperty(key,value);
    const palette=THEME_PALETTES[state.preset]?.[dark?'dark':'light']||{};
    const accent=state.accent==='custom'&&/^#[\da-f]{6}$/i.test(state.customAccent)?state.customAccent:state.accent==='default'?(palette.accent||COLORS.default):COLORS[state.accent]||COLORS.default;
    const surface=state.surface||palette.surface||null,ink=state.ink||palette.ink||null;
    // Default mode preserves the original captured theme variables exactly.
    // Custom colors override the same variables used by the original components.
    const colorVars={'--codex-base-accent':accent,'--app-color-border-focus':accent,'--color-text-mode-toggle-accent':accent,'--color-text-composer-reference':accent};
    if(state.accent!=='default'||palette.accent)Object.assign(colorVars,{'--color-background-composer-primary':accent,'--app-color-icon-accent':accent,'--app-color-text-accent':accent,'--color-accent':accent,'--color-text-accent':accent,'--app-color-background-accent':`color-mix(in srgb, ${accent} 15%, ${dark?'#111':'#fff'})`,'--color-background-user-message':`color-mix(in srgb, ${accent} 13%, ${dark?'#111':'#fff'})`});
    const managed=['--color-background-composer-primary','--app-color-icon-accent','--app-color-text-accent','--color-accent','--color-text-accent','--app-color-background-accent','--color-background-user-message','--codex-base-surface','--app-color-background-surface','--app-color-background-surface-under','--color-background-panel','--app-color-background-primary-inverse','--app-color-background-elevated-primary-opaque','--color-background-composer-surface','--codex-base-ink','--app-color-text-foreground','--app-color-icon-primary','--color-text','--color-text-primary','--app-color-text-button-secondary'];
    for(const k of managed)el.style.removeProperty(k);
    if(surface)Object.assign(colorVars,{'--codex-base-surface':surface,'--app-color-background-surface':surface,'--app-color-background-surface-under':surface,'--color-background-panel':surface,'--app-color-background-primary-inverse':surface,'--app-color-background-elevated-primary-opaque':surface,'--color-background-composer-surface':surface});
    if(ink)Object.assign(colorVars,{'--codex-base-ink':ink,'--app-color-text-foreground':ink,'--app-color-icon-primary':ink,'--color-text':ink,'--color-text-primary':ink,'--app-color-text-button-secondary':ink});
    for(const k of ['--font-ui-family','--font-code-family','--app-color-text-foreground-secondary','--app-color-text-foreground-tertiary','--app-color-icon-secondary','--app-color-icon-tertiary','--app-color-border','--codex-base-contrast'])el.style.removeProperty(k);
    if(surface&&ink)Object.assign(colorVars,{'--app-color-text-foreground-secondary':`color-mix(in srgb, ${ink} 70%, ${surface})`,'--app-color-text-foreground-tertiary':`color-mix(in srgb, ${ink} 48%, ${surface})`,'--app-color-icon-secondary':`color-mix(in srgb, ${ink} 70%, ${surface})`,'--app-color-icon-tertiary':`color-mix(in srgb, ${ink} 48%, ${surface})`,'--app-color-border':`color-mix(in srgb, ${ink} ${state.contrast??(dark?18:13)}%, transparent)`});
    if(palette.fonts?.ui)colorVars['--font-ui-family']=palette.fonts.ui;
    if(palette.fonts?.code)colorVars['--font-code-family']=palette.fonts.code;
    if(state.contrast!==undefined)colorVars['--codex-base-contrast']=String(state.contrast);
    for(const [k,v]of Object.entries(colorVars))el.style.setProperty(k,v);
  }
  mq.addEventListener?.('change',applyAppearance);
  function close(){if(!modal)return;modal.close?.();modal.remove();modal=null;lastFocus?.focus?.();}
  function show(title,content,actions=[]){
    close();lastFocus=document.activeElement;modal=document.createElement('dialog');modal.className='settings-dialog';
    modal.innerHTML=`<form method="dialog"><header><h2>${esc(title)}</h2><button type="button" data-se-close aria-label="关闭">×</button></header><div class="settings-dialog-body">${content}</div><footer><button type="button" data-se-close>取消</button>${actions.map((a,i)=>`<button type="button" data-se-action="${i}" class="${a.danger?'danger':a.primary?'primary':''}">${esc(a.label)}</button>`).join('')}</footer></form>`;
    document.body.append(modal);modal.querySelectorAll('[data-se-close]').forEach(b=>b.onclick=close);
    modal.querySelectorAll('[data-se-action]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const result=await actions[Number(b.dataset.seAction)].run(modal);if(result!==false)close();else b.disabled=false;}catch(e){toast(e.message||String(e));b.disabled=false;}});
    modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
    modal.addEventListener('cancel',e=>{e.preventDefault();close();});modal.showModal();return modal;
  }
  function edit(title,key,{multiline=false,value=state[key]??'',type='text',description='',validate}={}){
    const control=multiline?`<textarea name="value" rows="9" autofocus>${esc(value)}</textarea>`:`<input name="value" type="${type}" value="${esc(value)}" autofocus>`;
    show(title,`${description?`<p>${esc(description)}</p>`:''}<label class="settings-field">${esc(title)}${control}</label>`,[{label:'保存',primary:true,run:d=>{let v=d.querySelector('[name=value]').value.trim();if(validate&&!validate(v))throw new Error('输入的值无效，请检查后重试。');save(key==='dictionaryText'?{dictionaryText:v,dictionary:v.split('\n').map(x=>x.trim()).filter(Boolean)}:{[key]:v});}}]);
  }
  function choose(title,key,choices,{multiple=false,value=state[key],onSelect}={}){
    const normalized=choices.map(x=>typeof x==='string'?{value:x,label:x}:x);
    const body=`<div class="settings-choices">${normalized.map((x,i)=>`<label><input type="${multiple?'checkbox':'radio'}" name="choice" value="${esc(x.value)}" ${(multiple?(value||[]).includes(x.value):value===x.value)?'checked':''}><span>${x.swatch?`<i style="background:${esc(x.swatch)}"></i>`:''}${esc(x.label)}</span></label>`).join('')}</div>`;
    const d=show(title,body,multiple?[{label:'恢复默认',run:()=>save({[key]:DEFAULTS[key]})},{label:'完成',primary:true,run:box=>{const selected=[...box.querySelectorAll('[name=choice]:checked')].map(x=>x.value);if(key==='enabledEfforts'&&!selected.length)throw Error('请至少选择一个推理强度');save({[key]:selected});}}]:[]);
    if(!multiple){d.querySelector('footer [data-se-close]').textContent='关闭';d.querySelectorAll('[name=choice]').forEach(input=>input.onchange=async()=>{const value=input.value;close();if(onSelect)await onSelect(value);else save({[key]:value});});}
  }
  function inform(title,text){show(title,`<p>${esc(text)}</p>`,[{label:'确定',primary:true,run:()=>{}}]);}
  function confirm(title,text,run){show(title,`<p>${esc(text)}</p>`,[{label:'确认',danger:true,run}]);}
  function titleOf(row){return row?.querySelector('.font-medium,label')?.textContent.trim()||row?.getAttribute('aria-label')||row?.textContent.trim().slice(0,40)||'设置';}
  function setButtonText(id,text){
    const button=root.querySelector(`#${CSS.escape(id)} button[aria-haspopup]`)||root.querySelector(`#${CSS.escape(id)} button`);if(!button)return;
    const trailing=button.querySelector('div.col-start-3');
    if(trailing){for(const n of [...trailing.childNodes])if(n.nodeType===Node.TEXT_NODE)n.remove();trailing.prepend(document.createTextNode(text));return;}
    const span=button.querySelector('span.flex');
    if(span){
      const textNodes=[...span.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(textNodes.length){textNodes[0].textContent=text;for(const n of textNodes.slice(1))n.remove();}
      else if(!span.children.length)span.textContent=text;
      else {const label=[...span.children].find(x=>x.getAttribute('aria-hidden')!=='true'&&x.tagName!=='SVG'&&x.textContent.trim());if(label)label.textContent=text;else span.append(document.createTextNode(text));}
    }else if(!button.querySelector('svg'))button.textContent=text;
  }
  function setSwitch(control,value){
    const checked=!!value;control.setAttribute('aria-checked',String(checked));control.dataset.state=checked?'checked':'unchecked';if(control.tagName==='INPUT')control.checked=checked;
    for(const child of control.querySelectorAll('[data-state]'))child.dataset.state=checked?'checked':'unchecked';
    const track=control.querySelector('span[aria-hidden=true]');if(track)track.style.backgroundColor=checked?'var(--switch-track-color-checked)':'var(--switch-track-color, var(--app-color-border-heavy))';
  }
  function sync(container){
    if(!container?.querySelectorAll)return;
    for(const [id,key]of Object.entries(ROW_KEYS)){
      const row=container.querySelector('#'+CSS.escape(id));if(!row)continue;const control=row.querySelector('[role=switch],input[type=checkbox]');if(!control)continue;
      control.disabled=false;control.removeAttribute('aria-disabled');
      const v=state[key]??(key==='memoryEnabled'||key==='webSearch'||key==='voiceEnabled'||key==='dictationEnabled'||key==='workInternetAccess');setSwitch(control,v);
    }
    for(const control of container.querySelectorAll('[data-settings-search-entry] [role=switch]')){
      const id=control.closest('[data-settings-search-entry]').id;
      if(id.startsWith('keyboard-shortcut-'))setSwitch(control,state.shortcuts[id]!==false);
      else if(!ROW_KEYS[id])setSwitch(control,state.permissions[id]??false);
    }
    for(const button of container.querySelectorAll('#data-controls-location button')){
      const on=/^(开启|On|Turn on)$/i.test(button.dataset.runtimeLabel||button.textContent.trim()),selected=on===!!state.preciseLocationAllowed;
      button.setAttribute('aria-pressed',String(selected));button.classList.toggle('text-default',selected);button.classList.toggle('bg-text/5',selected);button.classList.toggle('text-tertiary',!selected);
    }
    for(const row of container.querySelectorAll('[data-settings-search-entry^="keyboard-shortcut-"]')){
      const buttons=[...row.querySelectorAll('button:not([role=switch])')];
      for(const button of buttons){button.dataset.seDefaultShortcut??=button.textContent;button.textContent=typeof state.shortcuts[row.id]==='string'?state.shortcuts[row.id]:button.dataset.seDefaultShortcut;}
    }
    for(const button of container.querySelectorAll('[data-settings-panel] button'))if(/^(恢复默认快捷键|Restore default shortcuts)$/.test(button.dataset.runtimeLabel||button.textContent.trim()))button.disabled=!Object.values(state.shortcuts).some(value=>value!==null&&value!==undefined);
    if(slug==='plugins-settings')for(const button of container.querySelectorAll('[data-settings-panel] button'))if(button.dataset.seToolPermissions!==undefined||/低风险工具|只读工具|所有工具|始终询问|Allow .*tools|Always ask/.test(button.textContent)){button.dataset.seToolPermissions='';button.textContent={always_ask:'始终询问',ask_before_writes:'允许使用只读工具',review_important_actions:'允许使用低风险工具',full_access:'允许使用所有工具'}[state.toolPermissionMode]||'允许使用低风险工具';}
    const modes=['system','light','dark'];container.querySelectorAll('#appearance-mode input[type=radio]').forEach((input,i)=>{input.checked=state.appearanceTheme===modes[i];input.dataset.seKey='appearanceTheme';input.value=modes[i];const border=input.nextElementSibling?.lastElementChild;if(border?.classList.contains('absolute')){border.classList.toggle('border-ring',input.checked);border.classList.toggle('border-default',!input.checked);border.classList.toggle('group-hover:border-strong',!input.checked);}});
    const values={'general-language':state.language==='auto'?'自动检测':languageLabel(state.language),'general-enter-behavior':{enter:'按 Enter 键',cmdIfMultiline:'多行提示词使用 Ctrl + Enter',cmdAlways:'始终使用 Ctrl + Enter'}[state.enterBehavior],'general-available-reasoning-efforts':`已选择 ${state.enabledEfforts.length} 个`,'appearance-accent-color':COLOR_LABELS[state.accent]||'默认','voice-language':state.voiceLanguage==='auto'?'自动检测':languageLabel(state.voiceLanguage),'personalization-base-style':state.baseStyle||'默认','personalization-visual-answers':state.visualAnswers==='simple'?'简洁':'默认','voice-account-voice':state.voiceName||'系统默认'};
    for(const [id,text]of Object.entries(values))setButtonText(id,text);
    const presetLabel=container.querySelector('#appearance-theme button[aria-haspopup=menu] .truncate');if(presetLabel)presetLabel.textContent=PRESETS.find(x=>x[0]===state.preset)?.[1]||'ChatGPT';
    const accentSwatch=container.querySelector('#appearance-accent-color [aria-hidden=true][style]');if(accentSwatch)accentSwatch.style.backgroundColor=state.accent==='custom'?state.customAccent:COLORS[state.accent]||COLORS.default;
    for(const key of ['warm','enthusiastic','emoji','scannable'])setButtonText('personalization-trait-'+key,{default:'默认',more:'更多',less:'更少'}[state[key]]||'默认');
    const identity=getIdentity();for(const [id,key]of [['account-name','name'],['account-username','username'],['account-email','email'],['account-builder-profile','builderName']]){
      let value=state.localProfile[key]||identity?.[key]||(key==='builderName'?state.localProfile.name||identity?.name:'')||'';
      if(key==='username'&&value&&!value.startsWith('@'))value='@'+value;
      const row=container.querySelector('#'+id),valueNode=row?.querySelector('span.select-text'),button=row?.querySelector('button');
      if(valueNode)valueNode.textContent=value||(key==='email'?'使用 Google 登录':'添加');
      if(button&&key==='email')button.setAttribute('aria-label','更改电子邮箱'+(value?'：'+value:''));
    }
    for(const id of ['appearance-background-color','appearance-foreground-color']){
      const input=container.querySelector('#'+id+' input');const palette=THEME_PALETTES[state.preset]?.[currentMode()]||{};if(input){input.value=(id.includes('background')?state.surface||palette.surface:state.ink||palette.ink)||(currentMode()==='dark'?(id.includes('background')?'#000000':'#EDEDED'):(id.includes('background')?'#FCFCFC':'#0D0D0D'));input.dataset.seKey=id.includes('background')?'surface':'ink';}
    }
    container.querySelectorAll('[data-se-key]').forEach(input=>{const v=state[input.dataset.seKey];if(v!==undefined&&input.type!=='radio'){if(input.type==='checkbox')input.checked=!!v;else input.value=v;}});
    container.querySelectorAll('[data-settings-panel-slug]').forEach(b=>{b.setAttribute('aria-current',b.dataset.settingsPanelSlug===slug?'page':'false');});
  }
  function languageLabel(code){try{return new Intl.DisplayNames([document.documentElement.lang||'zh-CN'],{type:'language'}).of(code)||code;}catch{return code;}}
  function advanced(button){
    const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));let body=root.querySelector('[data-se-advanced]');
    if(body){body.hidden=expanded;return;}
    body=document.createElement('div');body.dataset.seAdvanced='';body.className='settings-advanced';
    body.innerHTML=`<div class="settings-local-row"><span>UI 字体大小<small>调整 ChatGPT 使用的基础字号</small></span><label><input type="number" min="11" max="16" step="1" data-se-key="sansFontSize" value="${state.sansFontSize}" aria-label="Sans font size"> px</label></div><div class="settings-local-row"><span>代码字体大小<small>调整聊天和差异视图中代码的基础字号</small></span><label><input type="number" min="8" max="24" step="1" data-se-key="codeFontSize" value="${state.codeFontSize}" aria-label="Code font size"> px</label></div><div class="settings-local-row"><span>减少动态效果<small>减少动画或匹配系统设置</small></span><select data-se-key="reducedMotion"><option value="system">系统</option><option value="on">开启</option><option value="off">关闭</option></select></div><div class="settings-local-row"><span>分别设置浅色和深色模式</span><input type="checkbox" data-se-key="separateModes" ${state.separateModes?'checked':''}></div><div class="settings-local-row"><span>对比度</span><input type="range" min="0" max="100" data-se-key="contrast" value="${state.contrast??45}" aria-label="对比度"></div><button type="button" data-se-reset-appearance>恢复默认</button>`;
    const section=button.closest('section');if(section)section.append(body);else button.parentElement.after(body);sync(root);
  }
  async function manageMemories(){
    const d=show('已保存的记忆',`<div data-memory-list>${state.memories.map(m=>`<div class="settings-memory"><p>${esc(m.text)}</p><button type="button" data-memory-delete="${esc(m.id)}">删除</button></div>`).join('')||'<p>没有已保存的记忆</p>'}</div><label class="settings-field">添加记忆<textarea name="memory" rows="3"></textarea></label>`,[{label:'添加',primary:true,run:box=>{const text=box.querySelector('[name=memory]').value.trim();if(!text)return false;save({memories:[...state.memories,{id:crypto.randomUUID(),text,createdAt:Date.now()}]});close();manageMemories();return false;}}]);
    d.querySelectorAll('[data-memory-delete]').forEach(b=>b.onclick=()=>{save({memories:state.memories.filter(m=>m.id!==b.dataset.memoryDelete)});b.closest('.settings-memory').remove();});
  }
  async function photo(key,title){
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>5*1024*1024)return toast('请选择小于 5 MB 的照片');const reader=new FileReader();reader.onload=()=>{save({[key]:reader.result});toast('照片已保存');};reader.readAsDataURL(file);};
    if(!state[key])return input.click();show(title,`<img class="settings-photo" src="${esc(state[key])}" alt="参考照片">`,[{label:'更改',run:()=>input.click()},{label:'删除',danger:true,run:()=>save({[key]:null})}]);
  }
  async function archiveManager(){
    const archived=getChats().filter(c=>c.archived);const d=show('已归档的聊天',archived.length?`<div class="settings-chat-list">${archived.map(c=>`<div><span>${esc(c.title)}</span><button type="button" data-unarchive="${esc(c.id)}">取消归档</button><button type="button" data-delete-chat="${esc(c.id)}">删除</button></div>`).join('')}</div>`:'<p>没有已归档的聊天</p>');
    d.querySelectorAll('[data-unarchive]').forEach(b=>b.onclick=async()=>{const c=getChats().find(x=>x.id===b.dataset.unarchive);if(c){c.archived=false;await db.saveChat?.(c);await onChatsChanged();b.parentElement.remove();}});
    d.querySelectorAll('[data-delete-chat]').forEach(b=>b.onclick=()=>confirm('删除聊天？','此操作将从此浏览器中永久删除聊天。',async()=>{await db.deleteChat?.(b.dataset.deleteChat);await onChatsChanged();}));
  }
  async function storageManager(imagesOnly=false){
    const exported=await db.exportData?.()||{assets:[]};const files=(exported.assets||[]).filter(f=>!imagesOnly||f.type?.startsWith('image/'));
    const d=show(imagesOnly?'图像':'文件',files.length?`<div class="settings-chat-list">${files.map(f=>`<div><span title="${esc(f.name)}">${esc(f.name)}<small>${esc(f.type||'文件')}</small></span><button type="button" data-download-asset="${esc(f.id)}">下载</button><button type="button" data-delete-asset="${esc(f.id)}">删除</button></div>`).join('')}</div>`:'<p>没有文件</p>');
    d.querySelectorAll('[data-download-asset]').forEach(b=>b.onclick=()=>{const f=files.find(x=>x.id===b.dataset.downloadAsset);if(f&&download)download(f.name,f.dataUrl||f.content||'',f.type);});
    d.querySelectorAll('[data-delete-asset]').forEach(b=>b.onclick=()=>confirm('删除文件？','这会从此浏览器中删除该文件及其聊天附件引用。',async()=>{const id=b.dataset.deleteAsset;await db.deleteAsset?.(id);for(const chat of getChats()){let changed=false;for(const message of chat.messages||[])for(const field of ['attachments','artifacts'])if(message[field]?.some(f=>f.id===id)){message[field]=message[field].filter(f=>f.id!==id);changed=true;}if(changed)await db.saveChat?.(chat);}await onChatsChanged();toast('文件已删除');}));
  }
  const BUTTON_CLASS='no-drag cursor-interaction items-center select-none disabled:cursor-default disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap inline-flex border gap-1 rounded-button-toolbar text-default bg-text/5 hover:bg-text/10 border-transparent button-toolbar py-0 text-sm leading-[18px] px-3';
  function panelBody(){return root.querySelector('[data-ui-settings-panel] [data-density]')||root.querySelector('[data-settings-panel] [data-density]');}
  function inlineHost(kind,initial){
    const body=panelBody();if(!body)return null;let host=body.querySelector(`[data-se-inline="${kind}"]`);
    if(!host){host=document.createElement('div');host.dataset.seInline=kind;host.className='flex flex-col gap-[var(--settings-section-gap,--spacing(10))]';host.innerHTML=initial;body.replaceChildren(host);}return host;
  }
  function openLocalChat(id){if(onOpenChat)return onOpenChat(id);location.hash='c='+encodeURIComponent(id);}
  function renderArchives(){
    if(slug!=='archived-chats')return;const chats=getChats().filter(c=>c.archived).sort((a,b)=>b.updatedAt-a.updatedAt);
    const host=inlineHost('archives','<div data-se-archive-search hidden><input class="settings-inline-search" data-se-archive-query aria-label="搜索已归档的聊天" placeholder="搜索已归档的聊天"></div><div data-se-archive-list></div>');if(!host)return;
    host.querySelector('[data-se-archive-search]').hidden=chats.length===0;
    const list=chats.filter(c=>!archiveQuery||(c.title+' '+(c.messages||[]).map(m=>m.content||'').join(' ')).toLowerCase().includes(archiveQuery.toLowerCase()));
    host.querySelector('[data-se-archive-list]').innerHTML=list.length?`<table class="w-full text-sm leading-5 font-normal settings-inline-table"><thead><tr><th>聊天</th><th>已更新</th><th><span class="sr-only">操作</span></th></tr></thead><tbody>${list.map(c=>`<tr><td><button type="button" class="settings-inline-title" data-se-open-chat="${esc(c.id)}">${esc(c.title)}</button></td><td class="text-secondary">${esc(new Date(c.updatedAt).toLocaleDateString())}</td><td><div class="settings-inline-actions"><button type="button" class="${BUTTON_CLASS}" data-se-restore-chat="${esc(c.id)}">取消归档</button><button type="button" class="${BUTTON_CLASS}" data-se-delete-chat="${esc(c.id)}">删除</button></div></td></tr>`).join('')}</tbody></table>`:`<div class="flex items-center px-4 text-sm text-secondary min-h-[var(--height-token-settings-row)] justify-center text-center">${archiveQuery?'没有找到相关聊天':'暂无已归档的聊天'}</div>`;
  }
  function fileBytes(file){
    if(Number.isFinite(file.size))return Math.max(0,file.size);
    if(file.dataUrl?.includes(';base64,')){const data=file.dataUrl.split(',')[1]||'';return Math.max(0,Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0));}
    return new TextEncoder().encode(file.content||'').byteLength;
  }
  const bytesLabel=bytes=>{if(bytes<1024)return bytes+' B';if(bytes<1024**2)return(bytes/1024).toFixed(1)+' KB';if(bytes<1024**3)return(bytes/1024**2).toFixed(1)+' MB';return(bytes/1024**3).toFixed(2)+' GB';};
  let storageEpoch=0,localAssets=[];
  async function renderStorage(){
    if(slug!=='storage')return;const epoch=++storageEpoch;
    const host=inlineHost('storage',`<div><div class="settings-inline-actions" role="group" aria-label="存储内容"><button type="button" class="${BUTTON_CLASS}" data-se-storage-tab="files">文件</button><button type="button" class="${BUTTON_CLASS}" data-se-storage-tab="images">图像</button></div><p data-se-storage-quota class="text-sm text-secondary settings-inline-note"></p></div><div class="settings-inline-toolbar"><input class="settings-inline-search" data-se-storage-query aria-label="搜索文件" placeholder="搜索文件"><select data-se-storage-sort aria-label="排序"><option value="date">最近添加</option><option value="name">名称</option><option value="size">大小</option></select></div><div data-se-storage-list><p class="text-secondary">正在加载…</p></div>`);if(!host)return;
    const exported=await db.exportData?.()||{assets:[]};if(slug!=='storage'||epoch!==storageEpoch||!host.isConnected)return;localAssets=exported.assets||[];
    const totalBytes=localAssets.reduce((n,f)=>n+fileBytes(f),0);let quotaText=`${localAssets.length} 个文件 · ${bytesLabel(totalBytes)}，保存在此浏览器中`;
    try{const estimate=await navigator.storage?.estimate?.();if(estimate?.quota)quotaText+=` · 此来源可用容量 ${bytesLabel(Math.max(0,estimate.quota-(estimate.usage||0)))}`;}catch{}
    if(slug!=='storage'||epoch!==storageEpoch||!host.isConnected)return;
    host.querySelector('[data-se-storage-quota]').textContent=quotaText;
    for(const button of host.querySelectorAll('[data-se-storage-tab]')){const selected=(button.dataset.seStorageTab==='images')===storageImages;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('bg-segmented-selected',selected);}
    host.querySelector('[data-se-storage-sort]').value=storageSort;
    const files=localAssets.filter(f=>(!storageImages||f.type?.startsWith('image/'))&&(!storageQuery||(f.name||'').toLowerCase().includes(storageQuery.toLowerCase()))).sort((a,b)=>storageSort==='name'?(a.name||'').localeCompare(b.name||''):storageSort==='size'?fileBytes(b)-fileBytes(a):(b.createdAt||0)-(a.createdAt||0));
    host.querySelector('[data-se-storage-list]').innerHTML=files.length?`<table class="w-full text-sm leading-5 font-normal settings-inline-table"><thead><tr><th>名称</th><th>大小</th><th><span class="sr-only">操作</span></th></tr></thead><tbody>${files.map(f=>`<tr><td><div class="settings-inline-file">${f.type?.startsWith('image/')?`<img src="${esc(f.dataUrl)}" alt="">`:''}<span>${esc(f.name)}<small class="text-secondary">${esc(f.type||'文件')}</small></span></div></td><td>${bytesLabel(fileBytes(f))}</td><td><div class="settings-inline-actions"><button type="button" class="${BUTTON_CLASS}" data-se-download-asset="${esc(f.id)}">下载</button><button type="button" class="${BUTTON_CLASS}" data-se-delete-asset="${esc(f.id)}">删除</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="flex items-center px-4 text-sm text-secondary min-h-[var(--height-token-settings-row)] justify-center text-center">没有文件</div>';
  }
  function tokenCount(message){const u=message.usage;if(!u||typeof u!=='object')return null;const input=Number(u.input_tokens??u.prompt_tokens??0),output=Number(u.output_tokens??u.completion_tokens??0),total=Number(u.total_tokens??input+output);return[input,output,total].every(n=>Number.isFinite(n)&&n>=0)?{input,output,total}:null;}
  function renderUsage(){
    if(slug!=='usage')return;
    const host=inlineHost('usage',`<div class="settings-inline-toolbar"><div class="settings-inline-actions" role="group" aria-label="使用情况分区"><button type="button" class="${BUTTON_CLASS}" data-se-usage-tab="overview">概览</button><button type="button" class="${BUTTON_CLASS}" data-se-usage-tab="analysis">分析</button></div><div class="settings-inline-actions"><button type="button" class="${BUTTON_CLASS}" data-se-usage-days="7">7 天</button><button type="button" class="${BUTTON_CLASS}" data-se-usage-days="30">30 天</button></div></div><div data-se-usage-content></div>`);if(!host)return;
    const since=Date.now()-usageDays*86400000,chats=getChats(),recent=chats.filter(c=>Number(c.updatedAt)>=since),messages=recent.flatMap(c=>(c.messages||[]).filter(m=>!m.createdAt||Number(m.createdAt)>=since).map(m=>({...m,chatMode:c.mode,chatId:c.id,chatTitle:c.title}))),assistant=messages.filter(m=>m.role==='assistant');
    let input=0,output=0,total=0,measured=0;for(const m of assistant){const t=tokenCount(m);if(t){input+=t.input;output+=t.output;total+=t.total;measured++;}}
    const groups=new Map();for(const m of assistant){const name=usageGroup==='model'?(m.model||'未记录模型'):({chat:'Chat',work:'Work',codex:'Codex'}[m.chatMode]||'Chat');const group=groups.get(name)||{requests:0,tokens:0};group.requests++;group.tokens+=tokenCount(m)?.total||0;groups.set(name,group);}
    const max=Math.max(1,...[...groups.values()].map(x=>x.requests));
    const stats=`<section class="flex flex-col"><div class="settings-local-row"><span class="font-medium">此浏览器中的用量<small>最近 ${usageDays} 天；API 服务商未提供的额度和 Token 不作估算</small></span></div><div class="settings-stat-grid"><div><small>聊天</small><strong>${recent.length}</strong></div><div><small>消息</small><strong>${messages.filter(m=>m.role!=='tool').length}</strong></div><div><small>已记录 Token</small><strong>${measured?total.toLocaleString():'未记录'}</strong></div><div><small>输入 / 输出 Token</small><strong>${measured?input.toLocaleString()+' / '+output.toLocaleString():'未记录'}</strong></div></div><p class="text-sm text-secondary settings-inline-note">${measured} 条回复包含服务商返回的用量记录。网站无法读取 OpenAI 账户的订阅限额和账单。</p></section>`;
    const history=recent.length?`<section><h2 class="font-medium text-lg">用量历史</h2><table class="w-full text-sm leading-5 font-normal settings-inline-table"><thead><tr><th>聊天</th><th>消息</th><th>已记录 Token</th></tr></thead><tbody>${recent.sort((a,b)=>b.updatedAt-a.updatedAt).map(c=>{const windowMessages=(c.messages||[]).filter(m=>!m.createdAt||Number(m.createdAt)>=since),counted=windowMessages.map(tokenCount).filter(Boolean);return`<tr><td><button class="settings-inline-title" type="button" data-se-open-chat="${esc(c.id)}">${esc(c.title)}</button></td><td>${windowMessages.filter(m=>m.role!=='tool').length}</td><td>${counted.length?counted.reduce((n,t)=>n+t.total,0).toLocaleString():'未记录'}</td></tr>`;}).join('')}</tbody></table></section>`:'<p class="text-sm text-secondary">此时段内没有聊天记录</p>';
    const analysis=`<section><div class="settings-inline-toolbar"><h2 class="font-medium text-lg">分析</h2><select data-se-usage-group aria-label="用量分组"><option value="mode">按功能</option><option value="model">按模型</option></select></div><div class="settings-usage-bars">${[...groups].map(([name,g])=>`<div><span>${esc(name)}</span><i style="--usage-bar:${g.requests/max*100}%"></i><span>${g.requests} 条回复${g.tokens?' · '+g.tokens.toLocaleString()+' Token':''}</span></div>`).join('')||'<p class="text-secondary">此时段内没有回复</p>'}</div></section>`;
    host.querySelector('[data-se-usage-content]').innerHTML=usageTab==='analysis'?analysis+history:stats+history;
    for(const b of host.querySelectorAll('[data-se-usage-tab]')){const selected=b.dataset.seUsageTab===usageTab;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('bg-segmented-selected',selected);}
    for(const b of host.querySelectorAll('[data-se-usage-days]')){const selected=Number(b.dataset.seUsageDays)===usageDays;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('bg-segmented-selected',selected);}
    const select=host.querySelector('[data-se-usage-group]');if(select)select.value=usageGroup;
  }
  async function dataAction(id,text){
    if(/export|导出/i.test(id+' '+text)){const data=await db.exportData?.()||{version:1,chats:getChats()};if(download)download('chatgpt-data.json',JSON.stringify({...data,...await getExportMetadata(),preferences:state},null,2),'application/json');return true;}
    if(/import|导入/i.test(id+' '+text)){const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const data=JSON.parse(await input.files[0].text());await db.importData?.(data);if(data.preferences&&typeof data.preferences==='object'){localStorage.setItem(KEY,JSON.stringify({...DEFAULTS,...data.preferences}));state=getLocalPreferences();save({});}await onImportMetadata(data);await onChatsChanged();toast('数据已导入');}catch(e){toast(e.message);}};input.click();return true;}
    if(/archive|归档/i.test(id+' '+text)){if(/all|全部/i.test(id+' '+text))confirm('归档所有聊天？','聊天会移至已归档的聊天。',async()=>{for(const c of getChats()){c.archived=true;await db.saveChat?.(c);}await onChatsChanged();});else archiveManager();return true;}
    if(/delete|删除|clear|清除/i.test(id+' '+text)){confirm('删除所有聊天？','此操作将永久删除此浏览器中保存的聊天和文件。',async()=>{await db.clearChats?.();await onClearData();await onChatsChanged();toast('数据已删除');});return true;}
    return false;
  }
  async function security(id,title){
    if(id==='security-account-pin'){
      if(!state.pin){await requestPin({create:true});return true;}
      if(!await requestPin())return true;
      show('账户 PIN 码','<p>PIN 用于锁定此网站在当前浏览器中的聊天。</p>',[{label:'更改 PIN 码',primary:true,run:()=>{requestPin({create:true,replace:true});return false;}},{label:'删除 PIN 码',danger:true,run:async()=>{save({pin:null});for(const chat of getChats())if(chat.locked){chat.locked=false;await db.saveChat?.(chat);}await onChatsChanged();logSecurity('删除账户 PIN 码');toast('PIN 已删除，聊天已解除锁定');}}]);return true;
    }
    if(id==='security-passkeys'){
      show(title,`<p>${state.passkey?'已在此设备创建通行密钥。':'为此网站在设备上创建通行密钥。登录验证需要网站的认证服务支持。'}</p>`,[{label:'添加通行密钥',primary:true,run:async()=>{if(!window.PublicKeyCredential||!navigator.credentials?.create)throw Error('当前浏览器不支持通行密钥');const userId=crypto.getRandomValues(new Uint8Array(32)),challenge=crypto.getRandomValues(new Uint8Array(32));const credential=await navigator.credentials.create({publicKey:{challenge,rp:{name:'ChatGPT',id:location.hostname},user:{id:userId,name:getIdentity()?.email||'local-user',displayName:getIdentity()?.name||'本地用户'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'preferred',userVerification:'preferred'},timeout:60000,attestation:'none'}});if(!credential)throw Error('未创建通行密钥');save({passkey:{id:credential.id,createdAt:Date.now()}});logSecurity('创建通行密钥');}}]);return true;
    }
    if(id==='security-active-sessions'){show(title,`<div class="settings-memory"><p>${esc(navigator.userAgent)}<small>当前浏览器 · ${esc(location.hostname)}</small></p></div>`,[{label:'登出',danger:true,run:()=>onLogout()}]);return true;}
    if(id==='security-history'){show(title,state.securityHistory.length?state.securityHistory.map(x=>`<div class="settings-memory"><p>${esc(x.action)}</p><small>${esc(new Date(x.at).toLocaleString())}</small></div>`).join(''):'<p>没有安全历史记录</p>');return true;}
    if(id==='security-linked-apps'){inform(title,'此网站尚未向其他应用授予登录访问权限。');return true;}
    if(['security-authenticator','security-text-message','security-password','security-advanced-account-security'].includes(id)){inform(title,'此功能需要网站自己的账户认证服务。当前 Google 登录由 Google 管理；你可以在 Google 账户的安全设置中管理密码和多因素验证。');return true;}
    return false;
  }
  function logSecurity(action){save({securityHistory:[{action,at:Date.now()},...state.securityHistory].slice(0,100)},false);}
  function requestPin({create=false,replace=false}={}){
    if(!state.pin&&!create)return Promise.resolve(false);
    return new Promise(resolve=>{
      let resolved=false;const finish=value=>{if(!resolved){resolved=true;resolve(value);}};
      const setup=!state.pin||create&&replace;
      const box=show(setup?'设置账户 PIN 码':'输入 PIN 码',`<label class="settings-field">PIN 码<input name="pin" type="password" inputmode="numeric" minlength="4" maxlength="12" autocomplete="${setup?'new-password':'current-password'}" autofocus></label><p data-pin-error class="settings-pin-error" role="alert"></p>`,[{label:setup?'保存':'解锁',primary:true,run:async d=>{
        const pin=d.querySelector('[name=pin]').value;
        if(!/^\d{4,12}$/.test(pin)){d.querySelector('[data-pin-error]').textContent='请输入 4–12 位数字 PIN';return false;}
        const salt=setup?[...crypto.getRandomValues(new Uint8Array(16))]:state.pin.salt;
        const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt.join(',')+':'+pin)))];
        if(setup){save({pin:{salt,hash}});logSecurity('设置账户 PIN 码');}
        else if(hash.length!==state.pin.hash.length||hash.some((v,i)=>v!==state.pin.hash[i])){d.querySelector('[data-pin-error]').textContent='PIN 码不正确';return false;}
        finish(true);
      }}]);
      box.addEventListener('close',()=>finish(false),{once:true});
    });
  }
  function family(trusted=false){
    const title=trusted?'邀请可信赖联系人':'邀请家庭成员';
    const saved=trusted?(state.trustedContact?[state.trustedContact]:[]):state.family;
    const body=`${saved.map(m=>`<div class="settings-memory"><p>${esc(m.name||m.email||m.phone)}${m.name?`<small>${esc(m.email||m.phone)}</small>`:''}</p>${trusted?'':`<button type="button" data-family-remove="${esc(m.id)}">移除</button>`}</div>`).join('')}<p>此处保存的联系信息仅保留在当前浏览器中。发送邀请和关联远程账户需要家庭账户服务。</p>${trusted?`<label class="settings-field">姓名<input name="name" autocomplete="name" value="${esc(state.trustedContact?.name||'')}" required></label><label class="settings-field">电话<input name="phone" type="tel" autocomplete="tel" value="${esc(state.trustedContact?.phone||'')}"></label>`:''}<label class="settings-field"><span data-contact-label>电子邮箱</span><input name="email" type="email" autocomplete="email" placeholder="name@email.com" value="${esc(trusted?state.trustedContact?.email||'':'')}" required></label>${trusted?'<label class="settings-consent"><input type="checkbox" name="consent" required>我已获得这位成年联系人的许可。</label>':'<button type="button" data-family-channel>使用电话</button><fieldset class="settings-choices"><legend>此人是：</legend><label><input type="radio" name="relationship" value="parent">我的家长或监护人</label><label><input type="radio" name="relationship" value="teen">我的孩子</label></fieldset>'}`;
    const d=show(title,body,[...(trusted&&state.trustedContact?[{label:'移除',danger:true,run:()=>save({trustedContact:null})}]:[]),{label:'保存',primary:true,run:box=>{
      const input=box.querySelector('[name=email]'),identifier=input.value.trim(),isPhone=input.type==='tel',relationship=box.querySelector('[name=relationship]:checked')?.value;
      if(isPhone?!/^\+?[\d\s()-]{6,25}$/.test(identifier):!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))throw Error(isPhone?'请输入有效的电话号码':'请输入有效的电子邮箱');
      if(trusted){const name=box.querySelector('[name=name]').value.trim();if(!name||!box.querySelector('[name=consent]').checked)throw Error('请填写姓名，并确认已获得联系人的许可');save({trustedContact:{name,email:identifier,phone:box.querySelector('[name=phone]').value.trim()||null}});}
      else{if(!relationship)throw Error('请选择你与此人的关系');save({family:[...state.family,{id:crypto.randomUUID(),name:'',email:isPhone?null:identifier,phone:isPhone?identifier:null,relationship,quietHours:null,studyMode:false}]});}
    }}]);
    d.querySelectorAll('[data-family-remove]').forEach(b=>b.onclick=()=>{save({family:state.family.filter(m=>m.id!==b.dataset.familyRemove)});b.closest('.settings-memory').remove();});
    const channel=d.querySelector('[data-family-channel]');if(channel)channel.onclick=()=>{const input=d.querySelector('[name=email]'),phone=input.type!=='tel';input.type=phone?'tel':'email';input.placeholder=phone?'电话号码':'name@email.com';d.querySelector('[data-contact-label]').textContent=phone?'电话号码':'电子邮箱';channel.textContent=phone?'使用电子邮箱':'使用电话';};
  }
  async function handleClick(event,target=event.target){
    const button=target?.closest?.('button,[role=button],a');if(!button)return false;
    if(button.closest('.settings-dialog'))return false;
    if(button.tagName==='A'){
      const url=new URL(button.getAttribute('href')||'',location.href),settingsSlug=url.pathname.match(/^\/settings\/([^/]+)/)?.[1]||new URLSearchParams(url.hash.slice(1)).get('settings');
      if(settingsSlug&&(url.origin===location.origin||url.hostname==='chatgpt.com')){event.preventDefault();onNavigate(settingsSlug);return true;}
      return false;
    }
    if(button.dataset.seOpenChat){openLocalChat(button.dataset.seOpenChat);return true;}
    if(button.dataset.seRestoreChat){const chat=getChats().find(c=>c.id===button.dataset.seRestoreChat);if(chat){chat.archived=false;await db.saveChat?.(chat);await onChatsChanged();renderArchives();}return true;}
    if(button.dataset.seDeleteChat){confirm('删除聊天？','此操作将从此浏览器中永久删除聊天。',async()=>{await db.deleteChat?.(button.dataset.seDeleteChat);await onChatsChanged();renderArchives();renderUsage();});return true;}
    if(button.dataset.seDownloadAsset){const file=localAssets.find(f=>f.id===button.dataset.seDownloadAsset);if(file&&download)download(file.name,file.dataUrl||file.content||'',file.type);return true;}
    if(button.dataset.seDeleteAsset){const id=button.dataset.seDeleteAsset;confirm('删除文件？','这会从此浏览器中删除该文件及其聊天附件引用。',async()=>{await db.deleteAsset?.(id);for(const chat of getChats()){let changed=false;for(const message of chat.messages||[])for(const field of ['attachments','artifacts'])if(message[field]?.some(f=>f.id===id)){message[field]=message[field].filter(f=>f.id!==id);changed=true;}if(changed)await db.saveChat?.(chat);}await onChatsChanged();await renderStorage();});return true;}
    if(button.dataset.seStorageTab){storageImages=button.dataset.seStorageTab==='images';await renderStorage();return true;}
    if(button.dataset.seUsageTab){usageTab=button.dataset.seUsageTab;renderUsage();return true;}
    if(button.dataset.seUsageDays){usageDays=Number(button.dataset.seUsageDays)===30?30:7;renderUsage();return true;}
    const nav=button.closest('[data-settings-panel-slug]');if(nav){onNavigate(nav.dataset.settingsPanelSlug);return true;}
    if(button.matches('[data-se-reset-appearance]')){save({appearanceTheme:'system',preset:'codex',accent:'default',surface:null,ink:null,sansFontSize:16,codeFontSize:12,reducedMotion:'system'});return true;}
    const row=button.closest('[data-settings-search-entry]'),id=row?.id||button.dataset.settingId||'',title=titleOf(row),text=button.dataset.runtimeLabel||button.getAttribute('aria-label')||button.textContent.trim();
    if(slug==='keyboard-shortcuts'&&/^(恢复默认快捷键|Restore default shortcuts)$/.test(text)){save({shortcuts:{}});return true;}
    if(id.startsWith('keyboard-shortcut-')){
      if(button.getAttribute('role')==='switch'){save({shortcuts:{...state.shortcuts,[id]:state.shortcuts[id]===false?null:false}});return true;}
      shortcutDialog(id,title);return true;
    }
    if(slug==='appearance'&&!row&&/高级|Advanced/.test(text)){advanced(button);return true;}
    if(!row&&!id){
      if(slug==='plugins-settings'&&(/^(浏览目录|Browse directory)$/.test(text))){location.hash='view=plugins';return true;}
      if(slug==='plugins-settings'&&(/低风险工具|只读工具|所有工具|始终询问|Allow .*tools|Always ask/.test(text)||button.dataset.seToolPermissions!==undefined)){
        button.dataset.seToolPermissions='';choose('工具权限','toolPermissionMode',[{value:'always_ask',label:'始终询问'},{value:'ask_before_writes',label:'允许使用只读工具'},{value:'review_important_actions',label:'允许使用低风险工具'},{value:'full_access',label:'允许使用所有工具'}],{value:state.toolPermissionMode||'review_important_actions'});return true;
      }
      if(slug==='data-controls'&&/管理|Manage/.test(text)&&/Cookie/i.test(button.parentElement?.parentElement?.textContent||'')){
        const consent=state.cookieConsent||{};
        show('Cookie 偏好','<p>这些偏好适用于此网站。必要存储用于保存聊天和设置。</p><div class="settings-choices"><label><input type="checkbox" checked disabled>必要 Cookie</label><label><input type="checkbox" name="analytics" '+(consent.analytics?'checked':'')+'>分析 Cookie</label><label><input type="checkbox" name="marketing" '+(consent.marketing?'checked':'')+'>营销 Cookie</label></div>',[{label:'保存',primary:true,run:d=>{const cookieConsent={analytics:d.querySelector('[name=analytics]').checked,marketing:d.querySelector('[name=marketing]').checked,updatedAt:Date.now()};save({cookieConsent});document.cookie='cg_cookie_consent='+encodeURIComponent(JSON.stringify(cookieConsent))+'; Max-Age=31536000; Path=/; SameSite=Lax';}}]);return true;
      }
      if(button.tagName==='BUTTON'&&button.closest('[data-settings-panel]')&&['usage','billing'].includes(slug)){
        inform(text||'用量与账单','用量与账单由当前 API 服务提供商管理。此网站没有接入 OpenAI 的订阅、信用额度或支付服务，因此不会提交付款或订阅变更。');return true;
      }
      if(button.tagName==='BUTTON'&&button.closest('[data-settings-panel]')&&['plugins-settings','passwords','browser-use','cloud-computer','codex-cloud','code-review'].includes(slug)){
        inform(text||'设置','此操作需要对应的远程服务或连接器。当前网站尚未连接该服务；不会显示虚假的连接成功状态。');return true;
      }
      if(slug==='notifications'&&/重试|Retry/.test(text)){if('Notification'in window){const permission=await Notification.requestPermission();save({notificationPermission:permission});toast(permission==='granted'?'通知权限已开启':'通知权限未开启');}else toast('浏览器不支持通知');return true;}
      if(slug==='parental-controls'&&/添加|Add/.test(text)){family();return true;}
      if(slug==='trusted-contact'&&/添加|Add|编辑|Edit|设置|Set up/.test(text)){family(true);return true;}
      if(/登出|Log out|Sign out/i.test(text)){onLogout();return true;}
      return false;
    }
    if(ROW_KEYS[id]&&(button.matches('[role=switch]')||button.querySelector('[role=switch]'))){save({[ROW_KEYS[id]]:!(state[ROW_KEYS[id]]??button.getAttribute('aria-checked')==='true')});return true;}
    if(id==='general-language'){choose(title,'language',[{value:'auto',label:'自动检测'},...LANGUAGES.map(value=>({value,label:languageLabel(value)}))]);return true;}
    if(id==='general-enter-behavior'){choose(title,'enterBehavior',[{value:'enter',label:'按 Enter 键'},{value:'cmdIfMultiline',label:'多行提示词使用 Ctrl + Enter'},{value:'cmdAlways',label:'始终使用 Ctrl + Enter'}]);return true;}
    if(id==='general-available-reasoning-efforts'){choose(title,'enabledEfforts',[{value:'none',label:'无'},{value:'low',label:'轻度'},{value:'medium',label:'中'},{value:'high',label:'高'},{value:'xhigh',label:'极高'},{value:'max',label:'Max'}],{multiple:true});return true;}
    if(id==='appearance-theme'){
      if(/复制|Copy/.test(text)){await navigator.clipboard.writeText(JSON.stringify({preset:state.preset,surface:state.surface,ink:state.ink,accent:state.accent,customAccent:state.customAccent,sansFontSize:state.sansFontSize,codeFontSize:state.codeFontSize}));toast('主题已复制');return true;}
      if(/导入|Import/.test(text)){show('导入主题','<label class="settings-field">主题<textarea name="theme" rows="6"></textarea></label>',[{label:'导入',primary:true,run:d=>{const v=JSON.parse(d.querySelector('[name=theme]').value);const patch={};for(const k of ['preset','surface','ink','accent','customAccent','sansFontSize','codeFontSize'])if(k in v)patch[k]=v[k];for(const k of ['surface','ink','customAccent'])if(patch[k]&&!/^#[\da-f]{6}$/i.test(patch[k]))throw Error('主题颜色必须为 #RRGGBB');save(patch);}}]);return true;}
      choose(title,'preset',PRESETS.filter(x=>x[2]==='both'||x[2]===currentMode()).map(([value,label])=>({value,label})),{onSelect:value=>save({preset:value,surface:null,ink:null})});return true;
    }
    if(id==='appearance-accent-color'){choose(title,'accent',[...Object.entries(COLORS).map(([value,color])=>({value,label:COLOR_LABELS[value],swatch:color})),{value:'custom',label:'自定义'}],{onSelect:value=>{save({accent:value});if(value==='custom')edit('自定义强调色','customAccent',{value:state.customAccent||'#3a83f7',validate:v=>/^#[\da-f]{6}$/i.test(v)});}});return true;}
    if(id==='appearance-background-color'||id==='appearance-foreground-color'){const key=id.includes('background')?'surface':'ink';const input=document.createElement('input');input.type='color';input.value=state[key]||(key==='surface'?'#fcfcfc':'#0d0d0d');input.oninput=()=>save({[key]:input.value});input.click();return true;}
    if(id==='personalization-memory-summary'){if(/自定义指令/.test(text))edit('自定义指令','customInstructions',{multiline:true});else manageMemories();return true;}
    if(id==='personalization-chatgpt-instructions'){edit('ChatGPT','customInstructions',{multiline:true,description:'为 ChatGPT 提供适用于所有聊天的额外指令和背景信息。'});return true;}
    if(id==='personalization-codex-instructions'){edit('Codex','codexInstructions',{multiline:true});return true;}
    if(id==='personalization-custom-rules'){edit(title,'customRules',{multiline:true});return true;}
    if(id==='personalization-reference-photo'||id==='personalization-full-body-reference-photo'){await photo(id.includes('full-body')?'fullBodyPhoto':'referencePhoto',title);return true;}
    if(id==='personalization-base-style'){choose(title,'baseStyle',[{value:'default',label:'默认'},{value:'professional',label:'专业'},{value:'friendly',label:'友好'},{value:'candid',label:'坦率'},{value:'quirky',label:'古灵精怪'},{value:'efficient',label:'高效'},{value:'nerdy',label:'书呆子'},{value:'cynical',label:'愤世嫉俗'}]);return true;}
    if(id.startsWith('personalization-trait-')){choose(title,id.replace('personalization-trait-',''),[{value:'default',label:'默认'},{value:'more',label:'更多'},{value:'less',label:'更少'}]);return true;}
    if(id==='personalization-visual-answers'){choose(title,'visualAnswers',[{value:'default',label:'默认'},{value:'simple',label:'简洁'}]);return true;}
    if(id==='voice-language'){choose(title,'voiceLanguage',[{value:'auto',label:'自动检测'},...LANGUAGES.map(value=>({value,label:languageLabel(value)}))]);return true;}
    if(id==='voice-account-voice'){
      const voices=window.speechSynthesis?.getVoices?.()||[];if(!voices.length){inform(title,'当前浏览器尚未提供语音。请开启系统语音后重试。');return true;}
      choose(title,'voiceName',[{value:'',label:'系统默认'},...voices.map(v=>({value:v.name,label:`${v.name} · ${v.lang}`}))],{onSelect:value=>{save({voiceName:value});const voice=voices.find(v=>v.name===value);const u=new SpeechSynthesisUtterance('你好，我是 ChatGPT。');if(voice)u.voice=voice;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}});return true;
    }
    if(id==='voice-account-dictionary'){edit(title,'dictionaryText',{multiline:true,value:state.dictionary.join('\n'),description:'每行输入一个听写应识别的词语。'});return true;}
    if(/shortcut|快捷键/.test(id+' '+text)){shortcutDialog(id==='voice-composer-dictation-shortcut'?'keyboard-shortcut-composer.toggleDictation':id,title);return true;}
    if(id.startsWith('account-')||id==='age'){
      if(id==='account-delete'){confirm('删除账户？','此操作将删除此网站在当前浏览器保存的个人资料、设置、聊天和文件。',async()=>{await db.clearChats?.();await onClearData();localStorage.removeItem(KEY);state=getLocalPreferences();notifySettings();await onChatsChanged();await onLogout();sync(root);applyAppearance();});return true;}
      if(id==='account-email'){onLogin();return true;}
      if(id==='age'){choose(title,'ageRange',[{value:'under18',label:'18 岁以下'},{value:'adult',label:'18 岁及以上'}]);return true;}
      if(id==='account-plan'){inform(title,'当前网站使用预配置的 API 服务。OpenAI 订阅和账单不会转移到此网站。');return true;}
      const key={'account-name':'name','account-username':'username','account-builder-profile':'builderName'}[id];if(key){show(title,`<label class="settings-field">${esc(title)}<input name="value" value="${esc(state.localProfile[key])}"></label>`,[{label:'保存',primary:true,run:d=>save({localProfile:{...state.localProfile,[key]:d.querySelector('[name=value]').value.trim()}})}]);return true;}
    }
    if(id.startsWith('security-')&&await security(id,title))return true;
    if(id==='parental-add-family-member'){family();return true;}
    if(slug==='trusted-contact'){family(true);return true;}
    if(slug==='archived-chats'){archiveManager();return true;}
    if(slug==='storage'){await storageManager(id==='storage-images');return true;}
    if(id==='data-controls-shared-links'){inform(title,'没有共享链接。此网站的聊天保存在当前浏览器，尚未连接可公开保存聊天的服务。');return true;}
    if(id==='data-controls-training'||id==='data-controls-daybreak-safety-training'){inform(title,'这个开关由模型服务商的账户服务管理。此网站无法更改 API 服务商的数据训练设置，也不会将此开关显示为已在服务商处启用。');return true;}
    if(id==='data-controls-archived-chats'){onNavigate('archived-chats');return true;}
    if(id==='data-controls-work-reset'){if(onResetWork)confirm('重置 ChatGPT Work？','这会重置当前浏览器中的 Work 执行环境及其工作区数据。',async()=>{await onResetWork();toast('Work 工作区已重置');});else inform(title,'当前执行环境未提供重置接口。');return true;}
    if(id==='data-controls-location'){
      const turnOn=/^(开启|On|Turn on)$/i.test(text);
      if(!turnOn){save({preciseLocationAllowed:false,location:null});return true;}
      if(state.preciseLocationAllowed)return true;
      if(!navigator.geolocation){inform(title,'当前浏览器不支持定位。');return true;}
      try{const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));save({preciseLocationAllowed:true,location:{latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy}});}catch(e){toast(e.code===1?'浏览器未允许位置权限':e.message);}return true;
    }
    if(['data-controls-information-sharing','data-controls-ads','data-controls-marketing'].includes(id)){inform(title,'此网站不提供广告、营销追踪或向第三方应用共享联系信息的服务。OpenAI 账户中的相应设置需要在原服务中管理。');return true;}
    if(slug==='data-controls'){if(await dataAction(id,text))return true;}
    if(slug==='pets'){
      choose('选择你的宠物','pet',[{value:'default',label:'不显示宠物'},...PETS.map(value=>({value,label:value}))]);return true;
    }
    if(slug==='usage'||slug==='billing'){inform(title,'用量与账单由当前 API 服务提供商管理。此网站可保存聊天和偏好设置；没有接入 OpenAI 订阅、信用额度或支付服务。');return true;}
    // A captured boolean preference keeps its native switch semantics.
    const switchControl=button.matches('[role=switch]')?button:button.querySelector('[role=switch]');
    if(switchControl){const value=state.permissions[id]??switchControl.getAttribute('aria-checked')==='true';save({permissions:{...state.permissions,[id]:!value}});setSwitch(switchControl,!value);return true;}
    if(['plugins-settings','passwords','browser-use','cloud-computer','codex-cloud','code-review'].includes(slug)){
      if(/network|网络|domain|域名/.test(id+' '+title)){edit(title,'allowedDomains',{multiline:true,description:'每行一个允许的域名。这些规则保存在当前浏览器中，供本网站的工具使用。'});return true;}
      if(/password|密码/.test(id+' '+title)){inform(title,'网页登录信息由浏览器密码管理器管理。此网站不会读取浏览器保存的密码。');return true;}
      if(/clear|清除|delete|删除/.test(id+' '+text)){confirm(title,'清除此网站保存的相关配置？',()=>save({permissions:{...state.permissions,[id]:null}}));return true;}
      inform(title,'此选项需要对应的远程服务或连接器。当前网站尚未连接该服务；本地聊天、文件分析和 Python 仍可使用。');return true;
    }
    if(slug==='notifications'){const permission=await Notification.requestPermission();save({notificationPermission:permission});toast(permission==='granted'?'通知权限已开启':'通知权限未开启');return true;}
    return false;
  }
  function shortcutDialog(id,title){
    const d=show(title,'<p>按下要使用的快捷键。</p><input name="shortcut" readonly class="settings-shortcut" placeholder="按下快捷键" autofocus>',[{label:'恢复默认',run:()=>save({shortcuts:{...state.shortcuts,[id]:null}})},{label:'保存',primary:true,run:box=>{const value=box.querySelector('[name=shortcut]').value;if(!value)return false;if(/^(?:(?:Ctrl|Meta|Alt|Shift)\+?)+$/.test(value))throw Error('快捷键必须包含修饰键以外的按键');save({shortcuts:{...state.shortcuts,[id]:value}});}}]);
    d.querySelector('[name=shortcut]').onkeydown=e=>{if(e.key==='Escape')return;e.preventDefault();e.stopPropagation();e.currentTarget.value=[e.ctrlKey?'Ctrl':null,e.metaKey?'Meta':null,e.altKey?'Alt':null,e.shiftKey?'Shift':null,!['Control','Alt','Shift','Meta'].includes(e.key)?(e.key.length===1?e.key.toUpperCase():e.key):null].filter(Boolean).join('+');};
  }
  function handleChange(event){
    const input=event.target;if(!input?.closest)return false;
    if(input.matches('[data-se-archive-query]')){archiveQuery=input.value;renderArchives();return true;}
    if(input.matches('[data-se-storage-query]')){storageQuery=input.value;renderStorage().catch(e=>toast(e.message));return true;}
    if(input.matches('[data-se-storage-sort]')){storageSort=input.value;renderStorage().catch(e=>toast(e.message));return true;}
    if(input.matches('[data-se-usage-group]')){usageGroup=input.value==='model'?'model':'mode';renderUsage();return true;}
    let key=input.dataset.seKey;const row=input.closest('[data-settings-search-entry]'),id=row?.id;
    if(!key&&ROW_KEYS[id])key=ROW_KEYS[id];
    if(key){let value=input.type==='checkbox'?input.checked:input.type==='number'||input.type==='range'?Number(input.value):input.value;if(['surface','ink','customAccent'].includes(key)&&!/^#[\da-f]{6}$/i.test(value))return true;if(key==='sansFontSize')value=Math.max(11,Math.min(16,value));if(key==='codeFontSize')value=Math.max(8,Math.min(24,value));save({[key]:value},false);if(key==='appearanceTheme')sync(root);return true;}
    if(input.type==='radio'&&slug==='pets'){save({pet:input.value});return true;}
    if(input.type==='checkbox'&&id){save({permissions:{...state.permissions,[id]:input.checked}},false);return true;}
    return false;
  }
  function hydrate(container=document,currentSlug=''){
    root=container;slug=currentSlug;sync(root);applyAppearance();
    if(slug==='archived-chats')renderArchives();
    if(slug==='storage')renderStorage().catch(e=>toast(e.message));
    if(slug==='usage')renderUsage();
    if(slug==='plugins-settings')for(const button of root.querySelectorAll('[data-settings-panel] button'))if(/低风险工具|只读工具|所有工具|始终询问|Allow .*tools|Always ask/.test(button.textContent)){button.dataset.seToolPermissions='';button.textContent={always_ask:'始终询问',ask_before_writes:'允许使用只读工具',review_important_actions:'允许使用低风险工具',full_access:'允许使用所有工具'}[state.toolPermissionMode]||'允许使用低风险工具';}
    if(slug==='security')for(const [id,value]of [['security-passkeys',state.passkey?'1':'添加'],['security-active-sessions','1'],['security-linked-apps','0']])setButtonText(id,value);
    if(slug==='appearance')root.querySelectorAll('input[type=text]').forEach(i=>{if(i.getAttribute('aria-label')?.includes('背景'))i.dataset.seKey='surface';if(i.getAttribute('aria-label')?.includes('墨迹'))i.dataset.seKey='ink';});
    return state;
  }
  notifySettings();applyAppearance();
  return {hydrate,handleClick,handleChange,applyAppearance,close,getState:()=>state,save,personalInstructions,archiveManager,requestPin};
}
