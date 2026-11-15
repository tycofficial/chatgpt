/**
 * Browser-local implementations for the first-party navigation destinations.
 * Shell/rail markup belongs to ui/templates.json. Captured body markup takes
 * precedence here; fallback page/list classes come from the shipped UI sources.
 * This module never contacts private ChatGPT services or claims a cloud task ran.
 */
const KEY='cg-navigation-data:v1';
const names={space:'资料空间',scheduled:'定时任务',plugins:'插件',explore:'探索',sites:'站点',codex:'Codex',maps:'地图',images:'图像',gpts:'GPT',projects:'项目'};
const aliases={library:'space',spaces:'space',tasks:'scheduled',automations:'scheduled',apps:'plugins',more:'explore',websites:'sites',map:'maps',image:'images',gpt:'gpts',project:'projects',资料空间:'space',资料库:'space',定时任务:'scheduled',插件:'plugins',探索:'explore',站点:'sites',网站:'sites',地图:'maps',图像:'images',图片:'images',GPT:'gpts',项目:'projects'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}};
const freshState=()=>({pages:[],tasks:[],gpts:[],sites:[],files:[],spaces:[],plugins:{},trash:[],siteHistory:{},siteNames:{},siteHidden:[],fileHidden:[],fileFavorites:{},fileSpaceMap:{},imageUses:{},activeSpaceId:null});
const date=v=>new Date(v).toLocaleString();
const normal=n=>aliases[n]||String(n||'').toLowerCase();
const icon=n=>`<svg width="20" height="20" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
export const NAVIGATION_VIEW_PROVENANCE=Object.freeze({
  captured:'ui/templates.json views, when supplied by the saved-HTML assembler',
  source:'76629.ac20799396.js: scheduled page shell, rail/explore destination handlers; 396705.00162c6ea9.js: Space labels; 337882.da1b5beae8.js: sites preview action',
  fallback:'Browser-local page/list implementation; uncaptured destination layout is not asserted to be 1:1',
});

export function createNavigationViews(options={}){
  const {getChats=()=>[],getProjects=()=>[],onOpenChat=()=>{},onNewChat=()=>{},onCreateProject=()=>{},onSettings=()=>{},onAction=()=>{},toast=()=>{},download=()=>{}}=options;
  let state={...freshState(),...read()};
  for(const key of ['pages','tasks','gpts','sites','files','spaces','trash'])if(!Array.isArray(state[key]))state[key]=[];
  if(!Array.isArray(state.siteHidden))state.siteHidden=[];
  if(!Array.isArray(state.fileHidden))state.fileHidden=[];
  for(const key of ['siteHistory','siteNames','imageUses','fileFavorites','fileSpaceMap'])if(!state[key]||typeof state[key]!=='object')state[key]={};
  if(!state.plugins||typeof state.plugins!=='object'||Array.isArray(state.plugins))state.plugins={};
  let current='',container=null,query='',templatesPromise=null,selectedPage=null,capturedMarkup='',capturedName='',mapResults=[],mapRequest=null,mapLoading=false,lastMapRequest=0,imagePanelHTML='',inPageEditor=false,librarySelection=[];
  const snapshot=()=>({...state,files:options.db?state.files.map(({dataUrl,content,...meta})=>meta):state.files,sites:options.db?state.sites.map(({dataUrl,content,...meta})=>meta):state.sites,trash:options.db?state.trash.map(file=>['site','file'].includes(file.kind)?(({dataUrl,content,...meta})=>meta)(file):file):state.trash});
  const persist=()=>{localStorage.setItem(KEY,JSON.stringify(snapshot()));document.cookie='cg_workspace=1; Max-Age=31536000; Path=/; SameSite=Lax';};
  const storeSite=async file=>{if(options.db){const dataUrl=file.dataUrl||await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(new Blob([file.content||''],{type:'text/html'}));});await options.db.saveAsset({...file,type:'text/html',dataUrl});}return file;};
  const allFiles=()=>[...new Map([...state.files,...getChats().flatMap(c=>(c.messages||[]).flatMap(m=>[...(m.attachments||[]),...(m.artifacts||[])]))].map(f=>[f.id||f.name,f])).values()].filter(f=>!state.fileHidden.includes(f.id||f.name)).map(f=>({...f,favorite:state.fileFavorites[f.id||f.name]??f.favorite,spaceId:Object.hasOwn(state.fileSpaceMap,f.id||f.name)?state.fileSpaceMap[f.id||f.name]:f.spaceId}));
  const allSites=()=>[...new Map([...allFiles().filter(f=>/\.html?$/i.test(f.name)),...state.sites].map(f=>[f.id||f.name,f])).values()].filter(f=>!state.siteHidden.includes(f.id||f.name));
  const siteFile=id=>allSites().find(f=>(f.id||f.name)===id);
  const siteName=file=>state.siteNames[file.id||file.name]||file.name;
  const inSpace=file=>!state.activeSpaceId||file.spaceId===state.activeSpaceId;
  const promptText=element=>element?.isContentEditable?element.innerText.trim():String(element?.value||'').trim();
  const setPrompt=(element,text)=>{if(!element)return;if(element.isContentEditable)element.textContent=text;else element.value=text;element.dispatchEvent(new Event('input',{bubbles:true}));element.focus();};
  const shouldSubmit=(event,element)=>{if(event.key!=='Enter'||event.isComposing)return false;let behavior='enter';try{behavior=JSON.parse(localStorage.getItem('cg-ui-settings'))?.enterBehavior||'enter';}catch{}const modified=event.ctrlKey||event.metaKey;return behavior==='cmdAlways'?modified:behavior==='cmdIfMultiline'?(String(element.innerText||element.value||'').includes('\n')?modified:!event.shiftKey):!event.shiftKey;};
  const internetAllowed=()=>{try{return JSON.parse(localStorage.getItem('cg-ui-settings'))?.workInternetAccess!==false;}catch{return true;}};
  function previewHTML(source){if(internetAllowed())return String(source||'');const document=new DOMParser().parseFromString(String(source||''),'text/html'),meta=document.createElement('meta');meta.httpEquiv='Content-Security-Policy';meta.content="default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline' data: blob:; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'";document.head.prepend(meta);return'<!doctype html>'+document.documentElement.outerHTML;}
  const getTemplates=()=>templatesPromise??=fetch(new URL('./ui/templates.json',import.meta.url)).then(r=>r.ok?r.json():{}).catch(()=>({}));
  const matches=s=>!query||String(s||'').toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const select=(element,selected)=>{element.setAttribute(element.getAttribute('role')==='tab'?'aria-selected':'aria-pressed',String(selected));element.toggleAttribute('data-selected',selected);if(element.getAttribute('role')==='tab')element.dataset.state=selected?'active':'inactive';};
  const labelButton=(element,label)=>{if(element.textContent.trim()===label)return;const leaf=[...element.querySelectorAll('span')].reverse().find(s=>s.children.length===0&&s.textContent.trim());if(leaf)leaf.textContent=label;else{const text=[...element.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(text)text.textContent=label;else element.append(document.createTextNode(label));}};
  const row=(title,meta,actions,main='')=>`<div class="nav-local-row"><div class="nav-local-row-content">${main||`<strong>${esc(title)}</strong>`}${meta?`<small>${esc(meta)}</small>`:''}</div><div class="nav-local-row-actions">${actions}</div></div>`;
  const button=(label,action,attrs='')=>`<button type="button" class="nav-local-button" data-nav-action="${action}" ${attrs}>${esc(label)}</button>`;
  const empty=text=>`<div class="nav-local-empty">${esc(text)}</div>`;
  const shell=(title,subtitle,actions,body)=>`<section class="nav-local-view flex h-full min-h-0 w-full flex-col bg-surface" data-navigation-view="${current}"><header class="nav-local-header"><div><h1 class="heading-xl font-normal">${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><div class="nav-local-header-actions">${actions}</div></header><div class="nav-local-content">${body}</div></section>`;
  function dialog(title,content,onSubmit,label='保存'){
    document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.remove());
    const d=document.createElement('dialog');d.className='nav-local-dialog';d.setAttribute('aria-label',title);
    d.innerHTML=`<form method="dialog"><header><h2>${esc(title)}</h2><button type="button" data-dialog-close aria-label="关闭">×</button></header><div class="nav-local-dialog-body">${content}</div><footer>${button('取消','dialog-cancel')}<button type="submit" class="nav-local-button nav-local-primary">${esc(label)}</button></footer></form>`;
    document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove(),{once:true});d.querySelector('[data-dialog-close]').onclick=()=>d.close();d.querySelector('[data-nav-action="dialog-cancel"]').onclick=()=>d.close();
    d.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const result=await onSubmit?.(new FormData(e.currentTarget),d);if(result!==false)d.close();}catch(err){toast(err.message);}};
    d.addEventListener('click',e=>{if(e.target===d)d.close();});return d;
  }
  function editPage(page){
    dialog(page?'编辑页面':'新页面',`<label>标题<input name="title" required value="${esc(page?.title||'')}"></label><label>内容<textarea name="content" rows="12">${esc(page?.content||'')}</textarea></label>`,data=>{const item={...page,id:page?.id||crypto.randomUUID(),spaceId:page?(page.spaceId??null):state.activeSpaceId,title:String(data.get('title')).trim(),content:String(data.get('content')),updatedAt:Date.now(),createdAt:page?.createdAt||Date.now()};const i=state.pages.findIndex(p=>p.id===item.id);i<0?state.pages.unshift(item):state.pages.splice(i,1,item);persist();render();});
  }
  function editTask(task){
    const due=task?.due?new Date(task.due-new Date(task.due).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    dialog(task?.id?'编辑任务':'新建任务',`<label>名称<input name="title" required value="${esc(task?.title||'')}"></label><label>指令<textarea name="prompt" rows="4" required>${esc(task?.prompt||'')}</textarea></label><label>时间<input name="due" type="datetime-local" required value="${due}"></label><label>重复<select name="repeat"><option value="once">不重复</option><option value="daily" ${task?.repeat==='daily'?'selected':''}>每天</option><option value="weekly" ${task?.repeat==='weekly'?'selected':''}>每周</option></select></label><p class="nav-local-note">定时提醒在此网页保持打开时触发；浏览器关闭期间不会在云端执行。</p>`,data=>{const due=new Date(String(data.get('due'))).getTime();if(!Number.isFinite(due))throw Error('请选择有效时间');const item={id:task?.id||crypto.randomUUID(),title:String(data.get('title')).trim(),prompt:String(data.get('prompt')),due,repeat:String(data.get('repeat')),enabled:true,lastRun:task?.lastRun||null};const i=state.tasks.findIndex(t=>t.id===item.id);i<0?state.tasks.push(item):state.tasks.splice(i,1,item);persist();render();});
  }
  function editGpt(gpt){
    dialog(gpt?.id?'编辑 GPT':'创建 GPT',`<label>名称<input name="name" required value="${esc(gpt?.name||'')}"></label><label>描述<input name="description" value="${esc(gpt?.description||'')}"></label><label>指令<textarea name="instructions" required rows="7">${esc(gpt?.instructions||'')}</textarea></label>`,data=>{const item={id:gpt?.id||crypto.randomUUID(),name:String(data.get('name')),description:String(data.get('description')),instructions:String(data.get('instructions'))};const i=state.gpts.findIndex(g=>g.id===item.id);i<0?state.gpts.push(item):state.gpts.splice(i,1,item);persist();render();});
  }
  function editor(page){
    selectedPage=page.id;inPageEditor=true;
    container.innerHTML=shell(page.title,'',button('返回','pages')+button('下载','page-download',`data-id="${page.id}"`)+button('删除','page-delete',`data-id="${page.id}"`),`<input class="nav-local-page-title" data-page-title="${page.id}" value="${esc(page.title)}" aria-label="页面标题"><textarea class="nav-local-page-editor" data-page-content="${page.id}" aria-label="页面内容">${esc(page.content)}</textarea><p class="nav-local-note" data-save-status>已保存到此浏览器</p>`);
  }
  async function usePrompt(text,mode='work',gpt=null){
    if(document.querySelector('#stop-button:not([hidden])')){toast('请先停止当前回复');return false;}
    await onNewChat(mode);if(gpt)localStorage.setItem('cg-active-gpt',JSON.stringify(gpt));const prompt=document.querySelector('#prompt');if(prompt){prompt.value=text;if(prompt.isContentEditable)prompt.textContent=text;prompt.dispatchEvent(new Event('input',{bubbles:true}));prompt.focus();return true;}return false;
  }
  function render(){
    if(!container)return;
    selectedPage=null;
    if(capturedMarkup&&capturedName===current){if(inPageEditor){container.innerHTML=capturedMarkup;inPageEditor=false;}hydrateCaptured();renderCapturedRecords();return;}
    let html='';
    if(current==='space'){
      const pages=state.pages.filter(p=>matches(p.title+' '+p.content));const files=allFiles().filter(f=>matches(f.name));
      html=shell(names.space,'',button('新页面','page-create')+button('上传文件','import-files'),`<div class="nav-local-search"><input data-nav-search placeholder="搜索" aria-label="搜索资料空间" value="${esc(query)}"></div><div data-local-pages>${pages.map(p=>row(p.title,date(p.updatedAt),button('编辑','page-edit',`data-id="${p.id}"`)+button('更多','page-more',`data-id="${p.id}"`),`<button data-nav-action="page-open" data-id="${p.id}" class="nav-local-title">${esc(p.title)}</button>`)).join('')}${files.map(f=>fileRow(f)).join('')||empty('没有文件或页面')}</div>`);
    }else if(current==='scheduled'){
      html=shell(names.scheduled,'让 ChatGPT 安排任务、设置提醒或监测更新',button('新建任务','task-create'),`<p class="nav-local-note">此浏览器保存任务；网页保持打开时会触发到期提醒。</p>${state.tasks.map(t=>row(t.title,`${date(t.due)} · ${t.repeat==='daily'?'每天':t.repeat==='weekly'?'每周':'不重复'}${t.lastRun?' · 已提醒 '+date(t.lastRun):''}`,button('立即运行','task-run',`data-id="${t.id}"`)+button('编辑','task-edit',`data-id="${t.id}"`)+button(t.enabled?'暂停':'恢复','task-toggle',`data-id="${t.id}"`)+button('删除','task-delete',`data-id="${t.id}"`))).join('')||empty('没有定时任务')}`);
    }else if(current==='sites'){
      const sites=[...state.sites,...allFiles().filter(f=>/\.html?$/i.test(f.name))];
      html=shell(names.sites,'',button('新建站点','site-create')+button('导入 HTML','site-import'),sites.filter(s=>matches(s.name)).map(s=>row(s.name,'',button('预览','site-preview',`data-id="${esc(s.id||s.name)}"`)+button('下载','site-download',`data-id="${esc(s.id||s.name)}"`))).join('')||empty('没有站点'));
    }else if(current==='images'){
      html=shell(names.images,'',button('创建图像','image-create')+button('上传','import-files'),`<div class="nav-local-images">${allFiles().filter(f=>(f.type||f.mime||'').startsWith('image/')).map(f=>`<button data-nav-action="file-open" data-id="${esc(f.id||f.name)}"><img src="${esc(f.dataUrl)}" alt="${esc(f.name)}"><span>${esc(f.name)}</span></button>`).join('')||empty('没有图像')}</div>`);
    }else if(current==='projects'){
      html=shell(names.projects,'',button('新建项目','project-create'),getProjects().map(p=>row(p.name,'',button('打开','project-open',`data-id="${p.id}"`))).join('')||empty('没有项目'));
    }else if(current==='gpts'){
      html=shell('GPT','',button('创建','gpt-create'),`<p class="nav-local-note">自定义 GPT 的指令保存在此浏览器，并会添加到新对话。官方 GPT 商店和账户中的 GPT 未连接。</p>${state.gpts.map(g=>row(g.name,g.description,button('开始聊天','gpt-chat',`data-id="${g.id}"`)+button('编辑','gpt-edit',`data-id="${g.id}"`)+button('删除','gpt-delete',`data-id="${g.id}"`))).join('')||empty('没有自定义 GPT')}`);
    }else if(current==='plugins'){
      html=shell(names.plugins,'',button('管理插件','plugin-settings'),`<p class="nav-local-note">此部署尚未连接官方插件服务。Python、文件分析、网页搜索和画布使用本网页已接入的功能。</p>${[['Python','python'],['文件分析','attach'],['搜索网页','web'],['画布','canvas']].map(([n,a])=>row(n,'',button('打开','tool',`data-tool="${a}"`))).join('')}`);
    }else if(current==='explore'){
      html=shell(names.explore,'','',Object.entries(names).filter(([key])=>!['explore','codex'].includes(key)).map(([key,label])=>row(label,'',button('打开','destination',`data-destination="${key}"`))).join(''));
    }else if(current==='maps'){
      html=shell(names.maps,'','',`<form data-map-search class="nav-local-map-search"><input name="place" aria-label="搜索地点" placeholder="搜索地点" value="${esc(state.lastMapQuery||'')}"><button class="nav-local-button" type="submit">搜索</button></form><p class="nav-local-note">搜索通过 OpenStreetMap 在新标签页打开。</p>`);
      container.innerHTML=html;container.querySelector('[data-map-search]').onsubmit=e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('place');if(q){state.lastMapQuery=String(q);persist();window.open('https://www.openstreetmap.org/search?query='+encodeURIComponent(q),'_blank','noopener,noreferrer');}};return;
    }
    container.innerHTML=html;
  }
  function fileRow(f){return row(f.name,f.type||f.mime||'文件',button('打开','file-open',`data-id="${esc(f.id||f.name)}"`)+button('下载','file-download',`data-id="${esc(f.id||f.name)}"`)+button('更多','file-more',`data-id="${esc(f.id||f.name)}"`));}
  async function show(name,target,configuration={}){
    if(current==='maps'&&normal(name)!=='maps')mapRequest?.abort();
    current=normal(name);container=target;query='';imagePanelHTML='';inPageEditor=false;librarySelection=[];if(current==='codex'){await onNewChat('codex');return true;}if(!names[current])return false;
    if(options.db){state.files=await Promise.all(state.files.map(async file=>file.dataUrl?file:await options.db.getAsset(file.id)||file));state.sites=await Promise.all(state.sites.map(async file=>file.content||file.dataUrl?file:{...await options.db.getAsset(file.id),...file}));}
    if(configuration.captured){container.dataset.navigationView=current;capturedMarkup=container.innerHTML;capturedName=current;hydrateCaptured();renderCapturedRecords();return true;}
    const templates=await getTemplates();const entry=templates.views?.[current]||templates.views?.[Object.entries(aliases).find(([k,v])=>v===current&&templates.views?.[k])?.[0]];
    if(entry?.html){
      const doc=new DOMParser().parseFromString(entry.html,'text/html');const main=[...doc.querySelectorAll('main')].at(-1)||doc.querySelector('[data-ui-main]');
      if(main){container.innerHTML=main.innerHTML;container.dataset.navigationView=current;capturedMarkup=main.innerHTML;capturedName=current;hydrateCaptured();renderCapturedRecords();return true;}
    }
    render();return true;
  }
  function hydrateCaptured(){
    const rules={space:[[/新页面|新建页面|New page|^\s*创建\s*$|^\s*Create\s*$/i,'page-create'],[/上传|Upload/i,'import-files']],scheduled:[[/新建|创建任务|New task|Create task/i,'task-create']],sites:[[/新建|创建站点|Create site/i,'site-create'],[/导入|Import/i,'site-import']],images:[[/创建图像|Create image/i,'image-create'],[/上传|Upload/i,'import-files']],gpts:[[/创建|Create/i,'gpt-create']],projects:[[/新建项目|New project/i,'project-create']],plugins:[[/设置|管理|Settings|Manage/i,'plugin-settings']]};
    for(const b of container.querySelectorAll('button'))for(const[pattern,action]of rules[current]||[])if(pattern.test((b.getAttribute('aria-label')||'')+' '+b.textContent)){b.dataset.navAction=action;break;}
    for(const input of container.querySelectorAll('input'))if(/搜索|search/i.test((input.getAttribute('aria-label')||'')+' '+(input.placeholder||'')))input.dataset.navSearch='';
    if(current==='scheduled')for(const b of container.querySelectorAll('button')){const text=b.textContent.trim(),title=['新闻动态','电子邮箱监控','寻找周末读物','价格提醒','查找音乐演出','帮我安排周末'].find(t=>text.startsWith(t));if(title){b.dataset.navAction='task-template';b.dataset.navTitle=title;b.dataset.navPrompt=text.slice(title.length).trim();}}
    if(current==='space')hydrateLibrary();
    if(current==='plugins')hydratePlugins();
    if(current==='sites')hydrateSites();
    if(current==='images')hydrateImages();
    if(current==='gpts')hydrateGpts();
    if(current==='maps')hydrateMaps();
    if(current==='projects')hydrateProjects();
    hydrateNavigation();
  }
  function hydrateLibrary(){
    for(const b of container.querySelectorAll('button')){const text=b.textContent.trim(),aria=b.getAttribute('aria-label')||'';
      if(['推荐所有结果','收藏','你的条目','与你共享'].includes(text)){b.dataset.navAction='space-filter';b.dataset.filter=text;select(b,(state.spaceFilter||'推荐所有结果')===text);}
      if(['网格视图','列表视图'].includes(aria)){b.dataset.navAction='space-display';b.dataset.display=aria==='网格视图'?'grid':'list';select(b,(state.spaceDisplay||'grid')===b.dataset.display);}
      if(aria==='打开筛选器')b.dataset.navAction='space-filter-dialog';
      if(aria==='全选')b.dataset.navAction='library-select-all';
      if(text==='名称'||text==='上次活动时间'){b.dataset.navAction='library-sort';b.dataset.sort=text==='名称'?'name':'updated';b.setAttribute('aria-sort',state.librarySort?.key===b.dataset.sort?(state.librarySort.direction==='asc'?'ascending':'descending'):'none');}
    }
    const onboarding=container.querySelector('section[class~="group/getting-started"]');if(onboarding){onboarding.hidden=!!state.hideSpaceOnboarding;for(const b of onboarding.querySelectorAll('button:not([disabled])')){const aria=b.getAttribute('aria-label')||'';if(aria.startsWith('关闭'))b.dataset.navAction='space-onboarding-close';else if(aria){b.dataset.navAction='space-template';b.dataset.templateName=aria;b.dataset.templateContent=b.innerText||b.textContent;}}}
    for(const loader of container.querySelectorAll('[role="status"]'))if(loader.textContent.trim()==='正在加载资料库')loader.remove();
  }
  function hydrateProjects(){for(const b of container.querySelectorAll('button')){const text=b.textContent.trim();if(text==='创建')b.dataset.navAction='project-create';if(text==='已锁定的聊天')b.dataset.navAction='project-locked';if(text==='名称'||text==='已更新'){b.dataset.navAction='project-sort';b.dataset.sort=text==='名称'?'name':'updated';b.setAttribute('aria-sort',state.projectSort?.key===b.dataset.sort?(state.projectSort.direction==='asc'?'ascending':'descending'):'none');}}const rows=container.querySelector('[data-projects-rows]');if(rows)rows.dataset.localRecords='projects';}
  function hydrateNavigation(root=document.querySelector('[data-ui-sidebar]')){
    if(!root)return;
    const nav=root.querySelector('nav[aria-label="资料空间导航"]')||[...root.querySelectorAll('nav')].find(n=>n.textContent.includes('创建资料空间')||[...n.querySelectorAll('button')].some(b=>b.getAttribute('aria-label')==='创建资料空间'));
    if(!nav)return;
    const filterLabels=['全部','页面','幻灯片','站点','图像'];
    for(const b of nav.querySelectorAll('button')){
      if(b.closest('[data-nav-local-spaces]'))continue;
      const text=b.textContent.trim(),aria=b.getAttribute('aria-label')||'';
      if(text==='创建')b.dataset.navAction='space-create-menu';
      else if(aria==='搜索')b.dataset.navAction='space-search';
      else if(aria==='动态')b.dataset.navAction='space-activity';
      else if(aria==='创建资料空间')b.dataset.navAction='space-create';
      else if(text==='回收站'||text==='废纸篓')b.dataset.navAction='space-trash';
      else if(filterLabels.includes(text)){b.dataset.navAction='space-type';b.dataset.spaceType=text;select(b,(state.spaceType||'全部')===text);}
      else if(text==='展开显示'||b.dataset.navAction==='space-expand'){b.dataset.navAction='space-expand';labelButton(b,state.spaceExpanded?'收起':'展开显示');}
      else if(text==='资料空间'&&b.closest('h1'))b.dataset.navAction='space-switcher';
      else if(text==='最近'||text==='资料空间'){b.dataset.navAction='space-collapse';b.dataset.section=text;const section=b.closest('[class~="group/nav-section"]');if(section){const collapsed=!!state.sidebarCollapsed?.[text];for(const child of [...section.children].slice(1))child.hidden=collapsed;b.setAttribute('aria-expanded',String(!collapsed));}}
    }
    for(const input of nav.querySelectorAll('input[type=file]')){input.dataset.navSpaceImport='';}
    let list=nav.querySelector('[data-nav-local-spaces]');if(!list){list=document.createElement('div');list.dataset.navLocalSpaces='';const add=nav.querySelector('[aria-label="创建资料空间"]');const section=add?.closest('[class~="group/nav-section"]');(section||nav).append(list);}list.replaceChildren();
    const prototype=[...nav.querySelectorAll('button')].find(b=>b.textContent.trim()==='全部'),rowClass=prototype?.className||'nav-local-title';
    for(const space of state.spaces){const row=document.createElement('div');row.className='nav-local-sidebar-space';const b=document.createElement('button');b.type='button';b.className=rowClass;b.dataset.navAction='space-switch';b.dataset.id=space.id;b.textContent=space.name;select(b,state.activeSpaceId===space.id);const more=document.createElement('button');more.type='button';more.dataset.navAction='space-more';more.dataset.id=space.id;more.setAttribute('aria-label',space.name+' 的更多操作');more.textContent='⋯';row.append(b,more);list.append(row);}
    list.hidden=!!state.sidebarCollapsed?.['资料空间'];
    const recentButton=[...nav.querySelectorAll('button')].find(b=>b.dataset.section==='最近'),recentSection=recentButton?.closest('[class~="group/nav-section"]');
    if(recentSection){let recent=recentSection.querySelector('[data-nav-local-recent]');if(!recent){recent=document.createElement('div');recent.dataset.navLocalRecent='';recentSection.append(recent);}recent.replaceChildren();const items=[...state.pages.filter(inSpace).map(p=>({id:p.id,title:p.title,at:p.updatedAt,action:'page-open'})),...allFiles().filter(inSpace).map(f=>({id:f.id||f.name,title:f.name,at:f.createdAt||0,action:'file-open'}))].sort((a,b)=>b.at-a.at).slice(0,state.spaceExpanded?50:10);for(const item of items){const b=document.createElement('button');b.type='button';b.className=rowClass;b.dataset.navAction=item.action;b.dataset.id=item.id;b.textContent=item.title;recent.append(b);}recent.hidden=!!state.sidebarCollapsed?.['最近'];}
  }
  function createSpace(existing){dialog(existing?'重命名资料空间':'创建资料空间',`<label>名称<input name="name" required value="${esc(existing?.name||'')}"></label>`,data=>{const space={...existing,id:existing?.id||crypto.randomUUID(),name:String(data.get('name')).trim(),createdAt:existing?.createdAt||Date.now()};const i=state.spaces.findIndex(s=>s.id===space.id);i<0?state.spaces.push(space):state.spaces.splice(i,1,space);state.activeSpaceId=space.id;persist();routeSpace();});}
  function routeSpace(){if(current==='space')render();else location.hash='view=spaces';}
  function spaceSwitcher(){dialog('资料空间',button('全部资料空间','space-switch',`data-id=""`)+state.spaces.map(s=>button(s.name,'space-switch',`data-id="${s.id}"`)).join('')+button('创建资料空间','space-create'),()=>{},'关闭');}
  function searchSpace(){const d=dialog('搜索资料空间','<label>搜索<input data-local-space-search placeholder="搜索页面或文件" autofocus></label><div data-local-space-search-results></div>',()=>false,'搜索');const input=d.querySelector('input'),results=d.querySelector('[data-local-space-search-results]');const update=()=>{const q=input.value.trim().toLowerCase();results.innerHTML=state.pages.filter(p=>inSpace(p)&&(!q||(p.title+' '+p.content).toLowerCase().includes(q))).map(p=>row(p.title,'',button('打开','page-open',`data-id="${p.id}"`))).join('')+allFiles().filter(f=>inSpace(f)&&(!q||f.name.toLowerCase().includes(q))).map(fileRow).join('')||empty('没有找到相关条目');};input.oninput=update;d.querySelector('form').onsubmit=e=>{e.preventDefault();update();};update();}
  function showTrash(){dialog('回收站',state.trash.map(item=>row(item.title||item.name||'未命名',date(item.deletedAt),button('恢复','trash-restore',`data-id="${esc(item.id||item.name)}" data-kind="${item.kind}"`)+button('永久删除','trash-purge',`data-id="${esc(item.id||item.name)}" data-kind="${item.kind}"`))).join('')||empty('回收站为空'),()=>{},'关闭');}
  async function restoreTrash(id,kind){const index=state.trash.findIndex(t=>(t.id||t.name)===id&&t.kind===kind);if(index<0)return;const item=state.trash[index],{kind:discardKind,deletedAt,...record}=item;
    if(kind==='page')state.pages.unshift(record);else if(kind==='task')state.tasks.push(record);else if(kind==='gpt')state.gpts.push(record);else if(kind==='space')state.spaces.push(record);else if(kind==='plugin')state.plugins[record.name||record.id]=record;else if(kind==='site'){const saved=options.db?await options.db.getAsset(record.id):null;state.sites.push({...saved,...record});state.siteHidden=state.siteHidden.filter(x=>x!==id);}else if(kind==='file'){if(record.owned){const saved=options.db?await options.db.getAsset(record.id):null;state.files.push({...saved,...record});}state.fileHidden=state.fileHidden.filter(x=>x!==id);}else return;
    state.trash.splice(index,1);persist();render();showTrash();
  }
  function purgeTrash(id,kind){const item=state.trash.find(t=>(t.id||t.name)===id&&t.kind===kind);if(!item)return;dialog('永久删除？',`<p>永久删除“${esc(item.title||item.name||'未命名')}”？此操作无法撤销。</p>`,async()=>{if(['site','file'].includes(kind)&&item.owned&&!getChats().some(c=>(c.messages||[]).some(m=>[...(m.attachments||[]),...(m.artifacts||[])].some(f=>f.id===id))))await options.db?.deleteAsset(id);state.trash=state.trash.filter(t=>!((t.id||t.name)===id&&t.kind===kind));persist();render();showTrash();},'永久删除');}
  function hydrateSites(){
    for(const b of container.querySelectorAll('button')){const text=b.textContent.trim(),aria=b.getAttribute('aria-label')||'';if(text==='创建')b.dataset.navAction='site-create';if(b.getAttribute('role')==='tab'){b.dataset.navAction='site-tab';b.dataset.tab=text;select(b,(state.siteTab||'你的网站')===text);}if(['网格视图','列表视图'].includes(aria)){b.dataset.navAction='site-display';b.dataset.display=aria==='网格视图'?'grid':'list';select(b,(state.siteDisplay||'list')===b.dataset.display);}}
    for(const input of container.querySelectorAll('input[type=file]')){input.dataset.navSiteImport='';input.accept='.html,.htm';}
  }
  function hydrateImages(){
    const tabs=[...container.querySelectorAll('[role=tab]')];for(const b of tabs){b.dataset.navAction='image-tab';b.dataset.tab=b.textContent.trim();select(b,(state.imageTab||'模板')===b.dataset.tab);if(b.dataset.tab==='热门')b.title='按此浏览器中的模板使用次数排序';}
    const panel=container.querySelector('[role=tabpanel]');
    if(panel&&!imagePanelHTML)imagePanelHTML=panel.innerHTML;
    if(panel&&state.imageTab!=='我的图像'&&panel.dataset.navImageMode==='mine'){panel.innerHTML=imagePanelHTML;delete panel.dataset.navImageMode;}
    for(const b of container.querySelectorAll('button[aria-label]'))if(b.className.includes('group/use')){b.dataset.navAction='image-template';b.dataset.imagePrompt=b.getAttribute('aria-label');}
    if(panel&&state.imageTab==='我的图像'){panel.innerHTML=`<div class="nav-local-images">${allFiles().filter(f=>(f.type||f.mime||'').startsWith('image/')).map(f=>`<button data-nav-action="file-open" data-id="${esc(f.id||f.name)}"><img src="${esc(f.dataUrl)}" alt="${esc(f.name)}"><span>${esc(f.name)}</span></button>`).join('')||empty('没有图像')}</div>`;panel.dataset.navImageMode='mine';}
    if(panel&&state.imageTab==='热门'){const buttons=[...panel.querySelectorAll('button[data-image-prompt]')].sort((a,b)=>(state.imageUses[b.dataset.imagePrompt]||0)-(state.imageUses[a.dataset.imagePrompt]||0));for(const b of buttons)b.parentElement.append(b);}
    const p=container.querySelector('[contenteditable=true][aria-label="描述新图像"]');if(p){p.dataset.navImagePrompt='';if(!('value'in p))Object.defineProperty(p,'value',{configurable:true,get(){return this.innerText;},set(v){this.textContent=v||'';}});p.oninput=e=>{updateImageSubmit();e.stopPropagation();};p.onkeydown=e=>{if(e.key==='Enter'){e.stopPropagation();if(shouldSubmit(e,p)){e.preventDefault();submitImage();}}};
      const voice=container.querySelector('button[aria-label="开始语音"]');if(voice&&!container.querySelector('[data-nav-action="image-submit"]')){const send=voice.cloneNode(false);send.id='nav-image-send';send.removeAttribute('data-composer-voice-start');send.type='button';send.setAttribute('aria-label','发送');send.dataset.navAction='image-submit';send.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';voice.after(send);}updateImageSubmit();}
  }
  function updateImageSubmit(){const p=container?.querySelector('[data-nav-image-prompt]'),voice=container?.querySelector('button[aria-label="开始语音"]'),send=container?.querySelector('[data-nav-action="image-submit"]');const has=!!promptText(p);if(voice)voice.hidden=has;if(send)send.hidden=!has;}
  async function submitImage(){const p=container.querySelector('[data-nav-image-prompt]'),text=promptText(p);if(!text)return;await onAction('image-generate',{prompt:text,submit:true});const modalPrompt=document.querySelector('#image-prompt');if(modalPrompt){modalPrompt.value=text;modalPrompt.dispatchEvent(new Event('input',{bubbles:true}));const generate=document.querySelector('#generate-image');if(generate&&!generate.disabled){const run=generate.onclick;if(run)generate.onclick=async e=>{await run.call(generate,e);if(container?.isConnected&&current==='images'&&!document.querySelector('#image-prompt')){state.imageTab='我的图像';persist();render();}};generate.click();}}}
  function hydrateGpts(){
    for(const card of container.querySelectorAll('div[role=button]')){const title=card.querySelector('.text-default.truncate.font-medium')?.textContent.trim();if(!title)continue;card.dataset.navAction='gpt-public-detail';card.dataset.gptName=title;card.dataset.gptDescription=card.querySelector('[class*="line-clamp"]')?.textContent.trim()||'';card.dataset.gptAuthor=[...card.querySelectorAll('div')].find(e=>e.textContent.trim().startsWith('作者：')&&e.children.length===0)?.textContent.trim()||'';card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}};}
    for(const b of container.querySelectorAll('button')){const text=b.textContent.trim();if(b.getAttribute('role')==='tab'){b.dataset.navAction='gpt-category';b.dataset.category=text;select(b,(state.gptCategory||'精选推荐')===text);}else if(text==='我的 GPT'){b.dataset.navAction='gpt-mine';select(b,state.gptMode==='mine');}else if(text==='创建')b.dataset.navAction='gpt-create';else if(text==='探索插件')b.dataset.navAction='gpt-explore-plugins';else if(text==='查看更多'){b.dataset.navAction='gpt-category-more';b.dataset.category=b.closest('section')?.querySelector('h2,h3')?.textContent.trim()||'';}}
    filterGpts();
  }
  function filterGpts(){
    for(const card of container.querySelectorAll('div[data-gpt-name]'))card.hidden=state.gptMode==='mine'||!!query&&!matches(card.dataset.gptName+' '+card.dataset.gptDescription);
    for(const section of container.querySelectorAll('section')){const cards=[...section.querySelectorAll('div[data-gpt-name]')];if(cards.length)section.hidden=state.gptMode==='mine'||!!query&&!cards.some(c=>!c.hidden);}
  }
  async function gptDetails(card){
    const name=card.dataset.gptName,description=card.dataset.gptDescription||'',author=card.dataset.gptAuthor||'';
    document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.close());
    const templates=await getTemplates(),entry=templates.views?.['gpts-detail'];
    if(!entry?.html){dialog(name,`<p>${esc(description)}</p><p class="nav-local-note">依据公开介绍提供对话，未接入该 GPT 的私有指令或外部账户。</p>${button('开始聊天','gpt-public-chat',`data-gpt-name="${esc(name)}" data-gpt-description="${esc(description)}"`)}`,()=>{},'关闭');return;}
    const doc=new DOMParser().parseFromString(entry.html,'text/html'),source=[...doc.querySelectorAll('[role=dialog]')].at(-1);if(!source)return;
    document.querySelectorAll('[data-nav-gpt-dialog]').forEach(n=>n.remove());
    const wrapper=source.parentElement?.parentElement?.cloneNode(true)||source.cloneNode(true);wrapper.dataset.navGptDialog='';const content=wrapper.querySelector('[role=dialog]')||wrapper;
    const heading=content.querySelector('h2[id]')||content.querySelector('h2'),copy=content.querySelector('p[id]');if(heading)heading.textContent=name;if(copy)copy.textContent=description;
    if(name!=='Video AI by invideo'&&heading){const header=heading.parentElement,body=header.parentElement;for(const c of [...body.children])if(c!==header)c.remove();const sourceImage=card.querySelector('img')?.src;for(const img of header.querySelectorAll('img'))if(sourceImage)img.src=sourceImage;else img.remove();for(const n of [...header.children])if(n!==heading&&n!==copy&&n.textContent.includes('作者：'))n.textContent=author;}
    const notice=document.createElement('p');notice.className='mt-3 text-xs text-secondary text-center';notice.textContent='依据公开介绍提供对话；未接入该 GPT 的私有指令或外部账户。';copy?.after(notice);
    for(const b of content.querySelectorAll('button')){const text=b.textContent.trim();if(text==='关闭对话框'||b.getAttribute('aria-label')==='关闭')b.onclick=()=>wrapper.remove();else if(text==='开始聊天'){b.dataset.navAction='gpt-public-chat';b.dataset.gptName=name;b.dataset.gptDescription=description;}else if(text==='探索插件')b.dataset.navAction='gpt-explore-plugins';else if(b.getAttribute('aria-label')==='GPT 操作'){b.dataset.navAction='gpt-public-more';b.dataset.gptName=name;b.dataset.gptDescription=description;}else if(text.startsWith("Let's ")){b.dataset.navAction='gpt-public-chat';b.dataset.gptName=name;b.dataset.gptDescription=description;b.dataset.gptStarter=text;}}
    wrapper.addEventListener('click',e=>{if(!content.contains(e.target))wrapper.remove();});wrapper.addEventListener('keydown',e=>{if(e.key==='Escape')wrapper.remove();});document.body.append(wrapper);content.focus();
  }
  function hydrateMaps(){
    const map=container.querySelector('[data-ui-map],.chatgpt-mapbox');if(map){if(!internetAllowed()){map.replaceChildren();const note=document.createElement('div');note.className='nav-local-empty';note.setAttribute('role','status');note.textContent='互联网访问已在 Work 设置中关闭';map.append(note);}else if(!map.querySelector('[data-nav-osm-map]')){map.replaceChildren();const frame=document.createElement('iframe');frame.dataset.navOsmMap='';frame.title='OpenStreetMap';frame.className='nav-local-map-frame';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.src='https://www.openstreetmap.org/export/embed.html?bbox=-180%2C-60%2C180%2C85&layer=mapnik';map.append(frame);}}
    const p=container.querySelector('[contenteditable=true]');if(p){p.dataset.navMapPrompt='';if(!('value'in p))Object.defineProperty(p,'value',{configurable:true,get(){return this.innerText;},set(v){this.textContent=v||'';}});p.oninput=e=>{updateMapSubmit();e.stopPropagation();};p.onkeydown=e=>{if(e.key==='Enter'){e.stopPropagation();if(shouldSubmit(e,p)){e.preventDefault();searchMap(promptText(p));}}};}
    for(const b of container.querySelectorAll('button')){const aria=b.getAttribute('aria-label')||'';if(aria==='发送'){b.id='nav-map-send';b.dataset.navAction='map-submit';}if(aria==='地图归属信息')b.dataset.navAction='map-attribution';}
    for(const a of container.querySelectorAll('a[href*="mapbox.com"]')){a.href='https://www.openstreetmap.org/copyright';a.setAttribute('aria-label','OpenStreetMap');a.textContent='OpenStreetMap';}
    updateMapSubmit();
  }
  function updateMapSubmit(){const b=container?.querySelector('[data-nav-action="map-submit"]');if(b){b.disabled=mapLoading||!internetAllowed()||!promptText(container.querySelector('[data-nav-map-prompt]'));b.setAttribute('aria-disabled',String(b.disabled));}}
  async function searchMap(text){
    text=String(text||'').trim();if(!text)return;if(!internetAllowed())return toast('互联网访问已在 Work 设置中关闭');if(mapLoading)return toast('正在搜索地点…');const target=container;state.lastMapQuery=text;persist();
    // Photon official API: https://github.com/komoot/photon/blob/master/docs/api-v1.md
    // Public demo usage is limited to moderate, user-triggered, cached requests.
    const cached=state.mapCache?.[text];let results=cached?.results;
    if(!results){if(Date.now()-lastMapRequest<1500)return toast('请稍后再搜索');lastMapRequest=Date.now();mapRequest?.abort();mapRequest=new AbortController();mapLoading=true;updateMapSubmit();toast('正在搜索地点…');try{const base=localStorage.getItem('cg-map-geocoder')||'https://photon.komoot.io/api/';const url=new URL(base);if(url.protocol!=='https:')throw Error('地图搜索地址必须使用 HTTPS');url.searchParams.set('q',text);url.searchParams.set('limit','6');const response=await fetch(url,{signal:mapRequest.signal,referrerPolicy:'strict-origin-when-cross-origin'});if(!response.ok)throw Error('地图搜索暂时不可用');const data=await response.json();results=(data.features||[]).filter(f=>Array.isArray(f.geometry?.coordinates)).map(f=>({name:f.properties?.name||text,address:[f.properties?.street,f.properties?.city,f.properties?.state,f.properties?.country].filter(Boolean).join(' · '),lon:Number(f.geometry.coordinates[0]),lat:Number(f.geometry.coordinates[1]),osmType:f.properties?.osm_type,osmId:f.properties?.osm_id})).filter(f=>Number.isFinite(f.lon)&&Number.isFinite(f.lat));state.mapCache={...state.mapCache,[text]:{results,at:Date.now()}};const keys=Object.keys(state.mapCache);for(const k of keys.slice(0,-20))delete state.mapCache[k];persist();}catch(error){if(error.name!=='AbortError'){toast(error.message);dialog('地图搜索',`<p>${esc(error.message)}</p><a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">在 OpenStreetMap 中搜索</a>`,()=>{},'关闭');}return;}finally{mapLoading=false;updateMapSubmit();}}
    if(current!=='maps'||container!==target)return;mapResults=results;renderMapResults();if(results.length)focusMap(results[0]);else toast('没有找到地点，请输入具体地点或城市');
  }
  function renderMapResults(){let host=container.querySelector('[data-local-records="map-results"],.results-qLgUrv');if(!host){host=document.createElement('div');host.className='nav-local-map-results';container.append(host);}host.innerHTML=mapResults.map((r,i)=>`<button class="nav-local-map-result" data-nav-action="map-result" data-index="${i}"><strong>${esc(r.name)}</strong><small>${esc(r.address)}</small></button>`).join('')+'<p class="nav-local-note">地图数据 © OpenStreetMap contributors · 搜索由 Photon 提供</p>';}
  function focusMap(result){const frame=container.querySelector('[data-nav-osm-map]');if(frame){const {lon,lat}=result;frame.src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([lon-.025,lat-.018,lon+.025,lat+.018].join(','))+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lon);}}
  function hydratePlugins(){
    for(const button of container.querySelectorAll('button[aria-label^="安装 "]')){const name=button.getAttribute('aria-label').slice(3),card=button.closest('div.group');button.dataset.navAction='plugin-detail';button.dataset.pluginName=name;if(card){card.dataset.pluginName=name;card.dataset.pluginDescription=card.textContent.trim().replace(name,'').trim();for(const a of card.querySelectorAll('a[href*="/plugins/"]')){a.dataset.navAction='plugin-detail';a.dataset.pluginName=name;a.href='#plugins';}}}
    for(const a of container.querySelectorAll('a[href*="category="]')){const category=new URL(a.href,location.href).searchParams.get('category');a.dataset.navAction='plugin-category';a.dataset.category=category;const section=a.closest('section');if(section)section.dataset.pluginCategory=category;a.href='#plugins';}
    for(const a of container.querySelectorAll('a[href*="settings/plugins-settings"]'))a.dataset.navAction='plugin-settings';
    for(const b of container.querySelectorAll('button')){const text=b.textContent.trim(),aria=b.getAttribute('aria-label')||'';if(aria==='添加')b.dataset.navAction='plugin-add';if(aria==='更多操作')b.dataset.navAction='plugin-more';if(b.getAttribute('role')==='tab'){b.dataset.navAction='plugin-tab';b.dataset.tab=text;select(b,(state.pluginTab||'公开')===text);}}
    filterPlugins();
  }
  function filterPlugins(){
    for(const card of container.querySelectorAll('[data-plugin-name]:not(button):not(a)'))card.hidden=!!query&&!matches(card.dataset.pluginName+' '+card.dataset.pluginDescription);
    for(const section of container.querySelectorAll('section[data-plugin-category]'))section.hidden=!!state.pluginCategory&&section.dataset.pluginCategory!==state.pluginCategory;
  }
  function pluginDetails(name){
    const card=[...container.querySelectorAll('div[data-plugin-name]')].find(n=>n.dataset.pluginName===name),local=state.plugins[name];
    const description=card?.dataset.pluginDescription||local?.instructions||'';
    const d=dialog(name,`<p>${esc(description)}</p>${local?'<p class="nav-local-note">此本地插件的指令会添加到新聊天；未连接第三方账户。</p>':'<p class="nav-local-note">该插件需要独立的服务端与账户授权。本部署尚未连接此服务，不能读取你的第三方账户。</p>'}${button(local?'开始聊天':'管理插件',local?'plugin-use':'plugin-settings',`data-plugin-name="${esc(name)}"`)}`,()=>{},'关闭');
    return d;
  }
  function renderCapturedRecords(){
    if(current==='scheduled'){renderCapturedTasks();return;}
    if(current==='sites'){renderCapturedSites();return;}
    let html='';
    if(current==='space'){
      const allowed=(item,kind)=>{if(!inSpace(item))return false;if(state.spaceFilter==='收藏'&&!item.favorite)return false;if(state.spaceFilter==='与你共享')return false;const type=state.spaceType||'全部';if(type==='页面'&&kind!=='page'&&!/\.(md|txt|docx?)$/i.test(item.name||''))return false;if(type==='幻灯片'&&!/\.(pptx?|odp)$/i.test(item.name||''))return false;if(type==='图像'&&!(item.type||item.mime||'').startsWith('image/'))return false;return matches((item.title||item.name)+' '+(item.content||''));};
      const items=[...state.pages.filter(p=>allowed(p,'page')).map(p=>({id:'page:'+p.id,name:p.title,at:p.updatedAt,html:row(p.title,date(p.updatedAt),button('编辑','page-edit',`data-id="${p.id}"`)+button('更多','page-more',`data-id="${p.id}"`),`<button data-nav-action="page-open" data-id="${p.id}" class="nav-local-title">${esc(p.title)}</button>`)})),...allFiles().filter(f=>allowed(f,'file')).map(f=>({id:'file:'+(f.id||f.name),name:f.name,at:f.createdAt||0,html:fileRow(f)}))];
      const sort=state.librarySort||{key:'updated',direction:'desc'},direction=sort.direction==='asc'?1:-1;items.sort((a,b)=>direction*(sort.key==='name'?a.name.localeCompare(b.name):a.at-b.at));
      html=items.slice(0,state.spaceExpanded?items.length:20).map(x=>x.html.replace('<div class="nav-local-row">',`<div class="nav-local-row" data-library-record-id="${esc(x.id)}"${librarySelection.includes(x.id)?' data-selected':''}>`)).join('');
    }
    if(current==='scheduled')html=state.tasks.map(t=>row(t.title,date(t.due),button('立即运行','task-run',`data-id="${t.id}"`)+button('编辑','task-edit',`data-id="${t.id}"`)+button(t.enabled?'暂停':'恢复','task-toggle',`data-id="${t.id}"`)+button('删除','task-delete',`data-id="${t.id}"`))).join('');
    if(current==='sites')html=[...state.sites,...allFiles().filter(f=>/\.html?$/i.test(f.name))].map(f=>row(f.name,'',button('预览','site-preview',`data-id="${esc(f.id||f.name)}"`)+button('下载','site-download',`data-id="${esc(f.id||f.name)}"`))).join('');
    if(current==='projects'){const sort=state.projectSort||{key:'updated',direction:'desc'},direction=sort.direction==='asc'?1:-1;html=getProjects().map((p,i)=>({...p,_order:i})).filter(p=>matches(p.name)).sort((a,b)=>direction*(sort.key==='name'?a.name.localeCompare(b.name):(a.updatedAt||a.createdAt||a._order)-(b.updatedAt||b.createdAt||b._order))).map(p=>row(p.name,p.updatedAt?date(p.updatedAt):'',button('打开','project-open',`data-id="${p.id}"`))).join('');}
    if(current==='gpts'&&state.gptMode==='mine')html=state.gpts.map(g=>row(g.name,g.description,button('开始聊天','gpt-chat',`data-id="${g.id}"`)+button('编辑','gpt-edit',`data-id="${g.id}"`)+button('删除','gpt-delete',`data-id="${g.id}"`))).join('')||empty('没有自定义 GPT');
    if(current==='plugins')html=Object.entries(state.plugins).filter(([,p])=>p&&typeof p==='object'&&p.instructions).map(([name,p])=>row(name,p.description||'',button('打开','plugin-detail',`data-plugin-name="${esc(name)}"`)+button('开始聊天','plugin-use',`data-plugin-name="${esc(name)}"`)+button('删除','plugin-delete',`data-plugin-name="${esc(name)}"`))).join('');
    let host=container.querySelector('[data-nav-local-managed]');
    if(!html){host?.remove();if(current==='space')updateLibrarySelection();return;}
    if(!host){host=document.createElement('div');host.dataset.navLocalManaged='';host.className='nav-local-content';const body=container.querySelector('[data-local-records],[role="grid"],[data-local-pages],[data-local-tasks],[data-local-sites]')||container.querySelector('[class*="content-ymUHGU"]')||container.querySelector('[data-app-shell-main-content]')||container;body.append(host);}
    host.innerHTML=html;host.dataset.display=state.spaceDisplay||'grid';if(current==='space')updateLibrarySelection();
  }
  function updateLibrarySelection(){const b=container.querySelector('[data-nav-action="library-select-all"]');if(!b)return;const ids=[...container.querySelectorAll('[data-library-record-id]')].map(n=>n.dataset.libraryRecordId),selected=ids.filter(id=>librarySelection.includes(id)).length;const checked=ids.length>0&&selected===ids.length,mixed=selected>0&&!checked;b.disabled=!ids.length;b.setAttribute('aria-checked',mixed?'mixed':String(checked));b.dataset.state=mixed?'indeterminate':checked?'checked':'unchecked';b.style.opacity=selected?'1':'';b.innerHTML=checked?'<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><use href="./ui/assets/icons.svg#codex-icon-checkmark-md-light-16" fill="currentColor"/></svg>':mixed?'<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" stroke-width="1.5"/></svg>':'';}
  function renderCapturedTasks(){
    const list=container.querySelector('ul[data-local-records="tasks"],ul.grid');if(!list)return;
    list.querySelectorAll(':scope > [data-nav-local-task]').forEach(n=>n.remove());
    const sourceButton=list.querySelector('li button'),sourceClass=sourceButton?.className||'nav-local-button';
    for(const task of state.tasks){const li=document.createElement('li');li.dataset.navLocalTask=task.id;
      const b=document.createElement('button');b.type='button';b.className=sourceClass;b.dataset.navAction='task-edit';b.dataset.id=task.id;b.innerHTML=`<span class="flex min-w-0 flex-1 flex-col gap-1"><span class="text-base font-medium">${esc(task.title)}</span><span class="text-sm text-secondary">${esc(task.prompt)}</span><span class="text-xs text-tertiary">${esc(date(task.due))} · ${task.enabled?'已安排':'已暂停'}</span></span>`;
      const actions=document.createElement('div');actions.className='nav-local-row-actions nav-local-task-actions';actions.innerHTML=button('立即运行','task-run',`data-id="${task.id}"`)+button(task.enabled?'暂停':'恢复','task-toggle',`data-id="${task.id}"`)+button('删除','task-delete',`data-id="${task.id}"`);li.append(b,actions);list.prepend(li);
    }
  }
  function renderCapturedSites(){
    let host=container.querySelector('[data-local-records="sites"]');if(!host)return;
    host.querySelectorAll(':scope > [data-nav-local-site]').forEach(n=>n.remove());
    const layout=state.siteDisplay||'list';host.dataset.siteDisplay=layout;
    for(const child of host.children)if(!child.hasAttribute('data-nav-local-site'))child.hidden=layout==='grid';
    const files=allSites().filter(f=>inSpace(f)&&matches(siteName(f))&&(state.siteTab!=='与你共享'||f.shared));
    if(!files.length){const e=document.createElement('div');e.dataset.navLocalSite='empty';e.className='nav-local-empty';e.style.gridColumn='1/-1';e.textContent=state.siteTab==='与你共享'?'没有共享的站点':'没有站点';host.append(e);}
    for(const file of files){const id=file.id||file.name,name=siteName(file),history=state.siteHistory[id]||[];const el=document.createElement('div');el.dataset.navLocalSite=id;el.dataset.display=layout;el.className='nav-local-site-row group/site-row relative col-span-full grid min-h-[82px] grid-cols-subgrid items-center overflow-hidden rounded-xl px-4 py-4 select-none';el.innerHTML=`<div class="nav-local-site-title"><button data-nav-action="site-preview" data-id="${esc(id)}" aria-label="访问 ${esc(name)}" class="nav-local-title">${esc(name)}</button><small>${esc(date(file.createdAt||Date.now()))}</small></div><button data-nav-action="site-sharing" data-id="${esc(id)}" class="nav-local-button" aria-label="打开 ${esc(name)} 的共享设置">${file.shared?'标记为共享':'仅此浏览器'}</button><button data-nav-action="site-analytics" data-id="${esc(id)}" class="nav-local-button" aria-label="打开 ${esc(name)} 的数据分析页面">${history.length} 次本机预览</button><div class="nav-local-row-actions"><button data-nav-action="site-open-new" data-id="${esc(id)}" class="nav-local-button" aria-label="在新标签页中打开 ${esc(name)}">↗</button><button data-nav-action="site-more" data-id="${esc(id)}" class="nav-local-button" aria-label="${esc(name)} 的更多操作">⋯</button></div>`;host.append(el);}
  }
  function createSite(existing){
    dialog(existing?'编辑站点':'创建站点',`<label>文件名<input name="name" required value="${esc(existing?siteName(existing):'index.html')}"></label><label>HTML<textarea name="content" rows="12" required>${esc(existing?.content||'')}</textarea></label><div class="nav-local-row-actions">${button('导入 HTML','site-import')}${button('用 AI 创建','site-create-ai')}</div>`,async data=>{const own=existing&&state.sites.some(s=>s.id===existing.id),id=own?existing.id:crypto.randomUUID(),item={...existing,id,spaceId:existing?(existing.spaceId??null):state.activeSpaceId,name:String(data.get('name')).replace(/[\\/]/g,'_'),content:String(data.get('content')),dataUrl:undefined,type:'text/html',createdAt:existing?.createdAt||Date.now()};await storeSite(item);delete state.siteNames[id];const index=state.sites.findIndex(s=>s.id===id);index<0?state.sites.unshift(item):state.sites.splice(index,1,item);persist();render();});
  }
  async function importSites(files){for(const file of files){if(!/\.html?$/i.test(file.name)){toast('请选择 HTML 文件');continue;}const item={id:crypto.randomUUID(),spaceId:state.activeSpaceId,name:file.name,content:await file.text(),type:'text/html',createdAt:Date.now()};await storeSite(item);state.sites.unshift(item);}persist();render();document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.close());}
  async function openSite(file,newTab=false){
    const id=file.id||file.name;state.siteHistory[id]=[...(state.siteHistory[id]||[]),Date.now()].slice(-500);persist();
    if(!newTab){await preview({...file,name:siteName(file)});return;}
    const content=previewHTML(file.content||await(await fetch(file.dataUrl)).text());const wrapper=`<!doctype html><meta charset="utf-8"><title>${esc(siteName(file))}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe sandbox="allow-scripts allow-forms allow-modals allow-downloads" title="${esc(siteName(file))}" srcdoc="${esc(content)}"></iframe>`;const url=URL.createObjectURL(new Blob([wrapper],{type:'text/html'}));window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function siteAnalytics(file){const id=file.id||file.name,h=state.siteHistory[id]||[],days={};for(const t of h){const day=new Date(t).toLocaleDateString();days[day]=(days[day]||0)+1;}dialog('数据分析',`<p>${esc(siteName(file))}</p><p>${h.length} 次本浏览器预览</p><p class="nav-local-note">此数据仅记录本浏览器打开预览的次数，不代表云端访客。</p><table class="nav-local-analytics"><thead><tr><th>日期</th><th>预览次数</th></tr></thead><tbody>${Object.entries(days).reverse().map(([d,n])=>`<tr><td>${esc(d)}</td><td>${n}</td></tr>`).join('')}</tbody></table>`,()=>{},'关闭');}
  async function chooseFiles(accept,callback){const i=document.createElement('input');i.type='file';i.accept=accept;i.multiple=true;i.onchange=()=>callback([...i.files]);i.click();}
  async function importLocalFiles(files){try{for(const file of files){if(file.size>25*1024*1024){toast(file.name+' 超过 25 MB');continue;}const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});const asset={id:crypto.randomUUID(),spaceId:state.activeSpaceId,name:file.name,type:file.type||'application/octet-stream',size:file.size,dataUrl,content:file.type.startsWith('text/')||/\.(json|md|csv|py|js|html|css|txt)$/i.test(file.name)?await file.text():'',createdAt:Date.now()};await options.db?.saveAsset(asset);state.files.push(asset);}persist();render();}catch(error){toast(error.message||'文件未能保存');}}
  async function importFiles(){await chooseFiles('',importLocalFiles);}
  async function preview(file){
    const d=dialog(file.name,`<div class="nav-local-preview"></div>`,()=>{},'关闭');const view=d.querySelector('.nav-local-preview');const type=file.type||file.mime||'';
    if(type.startsWith('image/')){const img=document.createElement('img');img.alt=file.name;img.src=file.dataUrl;view.append(img);}else if(/\.html?$/i.test(file.name)){const frame=document.createElement('iframe');frame.title=file.name;frame.sandbox='allow-scripts allow-forms allow-modals';frame.srcdoc=previewHTML(file.content||await(await fetch(file.dataUrl)).text());view.append(frame);}else{const pre=document.createElement('pre');pre.textContent=file.content||'此文件可以下载后打开。';view.append(pre);}
  }
  async function handleClick(event,target=event.target){
    const b=target?.closest?.('[data-nav-action]');if(!b)return false;const a=b.dataset.navAction,id=b.dataset.id;event.preventDefault();
    if(a==='destination'){await show(b.dataset.destination,container);return true;}
    if(a==='space-create-menu'){dialog('创建',button('页面','page-create')+button('站点','site-create')+button('上传文件','import-files')+button('资料空间','space-create'),()=>{},'关闭');return true;}
    if(a==='space-search'){searchSpace();return true;}
    if(a==='space-create'){createSpace();return true;}
    if(a==='space-switcher'){spaceSwitcher();return true;}
    if(a==='space-switch'){state.activeSpaceId=id||null;persist();document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.close());routeSpace();return true;}
    if(a==='space-type'){state.spaceType=b.dataset.spaceType;persist();if(state.spaceType==='站点')location.hash='view=sites';else routeSpace();return true;}
    if(a==='space-expand'){state.spaceExpanded=!state.spaceExpanded;persist();render();return true;}
    if(a==='space-collapse'){state.sidebarCollapsed={...state.sidebarCollapsed,[b.dataset.section]:!state.sidebarCollapsed?.[b.dataset.section]};persist();hydrateNavigation();return true;}
    if(a==='space-more'){const s=state.spaces.find(s=>s.id===id);if(s)dialog(s.name,button('重命名','space-rename',`data-id="${id}"`)+button('移至回收站','space-remove',`data-id="${id}"`),()=>{},'关闭');return true;}
    if(a==='space-rename'){const s=state.spaces.find(s=>s.id===id);if(s)createSpace(s);return true;}
    if(a==='space-remove'){const s=state.spaces.find(s=>s.id===id);if(s)dialog('移至回收站？',`<p>将“${esc(s.name)}”移至本机回收站？页面和文件会保留在资料空间总览中。</p>`,()=>{state.trash.push({...s,kind:'space',deletedAt:Date.now()});state.spaces=state.spaces.filter(s=>s.id!==id);if(state.activeSpaceId===id)state.activeSpaceId=null;persist();render();},'移至回收站');return true;}
    if(a==='space-trash'){showTrash();return true;}
    if(a==='space-activity'){const events=[...state.pages.map(p=>({title:p.title,at:p.updatedAt})),...state.sites.map(s=>({title:siteName(s),at:s.createdAt})),...state.tasks.filter(t=>t.lastRun).map(t=>({title:t.title,at:t.lastRun}))].sort((a,b)=>b.at-a.at);dialog('动态',events.map(e=>row(e.title,date(e.at),'')).join('')||empty('暂无本机动态'),()=>{},'关闭');return true;}
    if(a==='trash-restore'){await restoreTrash(id,b.dataset.kind);return true;}
    if(a==='trash-purge'){purgeTrash(id,b.dataset.kind);return true;}
    if(a==='space-onboarding-close'){state.hideSpaceOnboarding=true;persist();hydrateLibrary();return true;}
    if(a==='space-template'){const name=b.dataset.templateName,content=b.dataset.templateContent;if(/幻灯片\s*$/.test(content)){await usePrompt('请参考“'+name+'”制作演示文稿，并生成可下载的文件。','work');}else{const page={id:crypto.randomUUID(),spaceId:state.activeSpaceId,title:name,content,createdAt:Date.now(),updatedAt:Date.now()};state.pages.unshift(page);persist();editor(page);hydrateNavigation();}return true;}
    if(a==='library-sort'){state.librarySort={key:b.dataset.sort,direction:state.librarySort?.key===b.dataset.sort&&state.librarySort.direction==='asc'?'desc':'asc'};persist();render();return true;}
    if(a==='library-select-all'){const ids=[...container.querySelectorAll('[data-library-record-id]')].map(n=>n.dataset.libraryRecordId);librarySelection=ids.every(id=>librarySelection.includes(id))?librarySelection.filter(id=>!ids.includes(id)):[...new Set([...librarySelection,...ids])];render();return true;}
    if(a==='project-sort'){state.projectSort={key:b.dataset.sort,direction:state.projectSort?.key===b.dataset.sort&&state.projectSort.direction==='asc'?'desc':'asc'};persist();render();return true;}
    if(a==='project-locked'){await onAction('locked-chats');return true;}
    if(a==='page-create')editPage();else if(a==='page-edit')editPage(state.pages.find(p=>p.id===id));else if(a==='page-open'){const page=state.pages.find(p=>p.id===id);if(page){document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.close());editor(page);}}else if(a==='pages')render();
    else if(a==='page-delete'){const p=state.pages.find(p=>p.id===id);if(p){state.trash.push({...p,kind:'page',deletedAt:Date.now()});state.pages=state.pages.filter(p=>p.id!==id);persist();render();toast('已移入本地废纸篓');}}
    else if(a==='page-more'){const p=state.pages.find(p=>p.id===id);dialog(p.title,button(p.favorite?'取消收藏':'收藏','page-favorite',`data-id="${id}"`)+button('下载','page-download',`data-id="${id}"`)+button('删除','page-delete',`data-id="${id}"`),()=>{},'关闭');}
    else if(a==='page-favorite'){const p=state.pages.find(p=>p.id===id);if(p){p.favorite=!p.favorite;persist();render();document.querySelector('dialog.nav-local-dialog')?.close();}}
    else if(a==='page-download'){const p=state.pages.find(p=>p.id===id);if(p)download(p.title+'.md',p.content,'text/markdown');}
    else if(a==='task-create')editTask();else if(a==='task-template')editTask({title:b.dataset.navTitle,prompt:b.dataset.navPrompt,due:Date.now()+86400000,repeat:/每天/.test(b.dataset.navPrompt)?'daily':/每周/.test(b.dataset.navPrompt)?'weekly':'once'});else if(a==='task-edit')editTask(state.tasks.find(t=>t.id===id));
    else if(a==='task-toggle'){const t=state.tasks.find(t=>t.id===id);if(t){t.enabled=!t.enabled;persist();render();}}
    else if(a==='task-delete'){const t=state.tasks.find(t=>t.id===id);if(t){state.trash.push({...t,kind:'task',deletedAt:Date.now()});state.tasks=state.tasks.filter(t=>t.id!==id);persist();render();}}
    else if(a==='task-run'){const t=state.tasks.find(t=>t.id===id);if(t&&await usePrompt(t.prompt))document.querySelector('#send-button:not([hidden])')?.click();}
    else if(a==='project-create')onCreateProject();else if(a==='project-open'){onAction('open-project',id);}
    else if(a==='image-create')onAction('image-generate');else if(a==='plugin-settings')onSettings('plugins-settings');else if(a==='tool')onAction(b.dataset.tool);
    else if(a==='gpt-create')editGpt();else if(a==='gpt-edit')editGpt(state.gpts.find(g=>g.id===id));
    else if(a==='gpt-delete'){const g=state.gpts.find(g=>g.id===id);if(g)state.trash.push({...g,kind:'gpt',deletedAt:Date.now()});state.gpts=state.gpts.filter(g=>g.id!==id);persist();render();}
    else if(a==='gpt-chat'){const g=state.gpts.find(g=>g.id===id);if(g)await usePrompt(g.instructions,'chat',g);}
    else if(a==='gpt-public-detail')await gptDetails(b);
    else if(a==='gpt-public-chat'){const g={id:'public-'+b.dataset.gptName,name:b.dataset.gptName,description:b.dataset.gptDescription,instructions:'Use this public assistant description as guidance: '+b.dataset.gptDescription+'. You are a local approximation; do not claim access to the original GPT private instructions, its external accounts, or its creator tools.'};document.querySelectorAll('[data-nav-gpt-dialog]').forEach(n=>n.remove());await usePrompt(b.dataset.gptStarter||'请根据以下公开介绍提供帮助：'+g.description,'chat',g);}
    else if(a==='gpt-public-more'){editGpt({name:b.dataset.gptName,description:b.dataset.gptDescription,instructions:b.dataset.gptDescription});}
    else if(a==='gpt-mine'){state.gptMode=state.gptMode==='mine'?'public':'mine';persist();render();}
    else if(a==='gpt-category'){state.gptMode='public';state.gptCategory=b.dataset.category;persist();render();const target=[...container.querySelectorAll('section')].find(s=>s.querySelector('h2,h3')?.textContent.trim()===b.dataset.category);target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
    else if(a==='gpt-category-more'){const section=b.closest('section'),cards=[...section.querySelectorAll('div[data-gpt-name]')];const d=dialog(b.dataset.category,'<div class="nav-local-gpt-category"></div>',()=>{},'关闭');const list=d.querySelector('.nav-local-gpt-category');for(const card of cards){const c=card.cloneNode(true);c.hidden=false;c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}};list.append(c);}}
    else if(a==='gpt-explore-plugins'){document.querySelectorAll('[data-nav-gpt-dialog]').forEach(n=>n.remove());await onAction('plugins');if(location.hash!=='#view=plugins')location.hash='view=plugins';}
    else if(a==='site-create')createSite();
    else if(a==='site-edit'){const f=siteFile(id);if(f)createSite(f);}
    else if(a==='site-create-ai'){document.querySelectorAll('dialog.nav-local-dialog').forEach(n=>n.close());await usePrompt('请创建一个完整、可运行的网站，将 HTML 保存为可下载的 index.html 文件。','work');}
    else if(a==='site-import')await chooseFiles('.html,.htm',importSites);
    else if(a==='site-preview'||a==='site-download'||a==='site-open-new'){const f=siteFile(id);if(f){if(a==='site-preview'||a==='site-open-new')await openSite(f,a==='site-open-new');else download(siteName(f),f.dataUrl||f.content,'text/html');}}
    else if(a==='site-tab'){state.siteTab=b.dataset.tab;persist();render();}
    else if(a==='site-display'){state.siteDisplay=b.dataset.display;persist();render();}
    else if(a==='site-analytics'){const f=siteFile(id);if(f)siteAnalytics(f);}
    else if(a==='site-more'){const f=siteFile(id);if(f)dialog(siteName(f),button('编辑','site-edit',`data-id="${esc(id)}"`)+button('重命名','site-rename',`data-id="${esc(id)}"`)+button('下载','site-download',`data-id="${esc(id)}"`)+button('共享设置','site-sharing',`data-id="${esc(id)}"`)+button('数据分析','site-analytics',`data-id="${esc(id)}"`)+button('从站点中移除','site-remove',`data-id="${esc(id)}"`),()=>{},'关闭');}
    else if(a==='site-rename'){const f=siteFile(id);if(f)dialog('重命名',`<label>名称<input name="name" required value="${esc(siteName(f))}"></label>`,data=>{state.siteNames[id]=String(data.get('name')).trim();persist();render();});}
    else if(a==='site-sharing'){const f=siteFile(id);if(f)dialog('共享设置',`<p class="nav-local-note">站点文件保存在此浏览器。共享标记用于本机列表；下载 HTML 文件后可交给他人打开，尚未创建云端公开链接。</p><label><input name="shared" type="checkbox" ${f.shared?'checked':''}> 标记为共享</label>${button('下载 HTML','site-download',`data-id="${esc(id)}"`)}`,data=>{const local=state.sites.find(s=>s.id===id);if(local)local.shared=data.has('shared');else{state.sites.push({...f,id,shared:data.has('shared')});}persist();render();});}
    else if(a==='site-remove'){const f=siteFile(id);if(f){state.trash.push({...f,owned:state.sites.some(s=>s.id===id),kind:'site',deletedAt:Date.now()});state.sites=state.sites.filter(s=>s.id!==id);state.siteHidden.push(id);persist();render();document.querySelector('dialog.nav-local-dialog')?.close();}}
    else if(a==='image-template'){const prompt=b.dataset.imagePrompt;state.imageUses[prompt]=(state.imageUses[prompt]||0)+1;persist();setPrompt(container.querySelector('[data-nav-image-prompt]'),prompt);updateImageSubmit();}
    else if(a==='image-tab'){state.imageTab=b.dataset.tab;persist();render();}
    else if(a==='image-submit')await submitImage();
    else if(a==='map-submit')await searchMap(promptText(container.querySelector('[data-nav-map-prompt]')));
    else if(a==='map-result'){const result=mapResults[Number(b.dataset.index)];if(result){focusMap(result);for(const item of container.querySelectorAll('[data-nav-action="map-result"]'))select(item,item===b);}}
    else if(a==='map-attribution')dialog('地图归属信息','<p>地图数据 © OpenStreetMap contributors。地点搜索由 Photon 提供。</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap 版权与许可</a>',()=>{},'关闭');
    else if(a==='file-open'||a==='file-download'){const f=allFiles().find(f=>(f.id||f.name)===id);if(f){if(a==='file-open')preview(f);else download(f.name,f.dataUrl||f.content,f.type||f.mime);}}
    else if(a==='file-more'){const f=allFiles().find(f=>(f.id||f.name)===id);if(f)dialog(f.name,button(f.favorite?'取消收藏':'收藏','file-favorite',`data-id="${esc(id)}"`)+button('移动到资料空间','file-move',`data-id="${esc(id)}"`)+button('移至本机回收站','file-remove',`data-id="${esc(id)}"`),()=>{},'关闭');}
    else if(a==='file-favorite'){state.fileFavorites[id]=!state.fileFavorites[id];persist();render();document.querySelector('dialog.nav-local-dialog')?.close();}
    else if(a==='file-move')dialog('移动到资料空间',button('资料空间总览','file-move-to',`data-id="${esc(id)}" data-space-id=""`)+state.spaces.map(s=>button(s.name,'file-move-to',`data-id="${esc(id)}" data-space-id="${s.id}"`)).join(''),()=>{},'关闭');
    else if(a==='file-move-to'){state.fileSpaceMap[id]=b.dataset.spaceId||null;persist();render();document.querySelector('dialog.nav-local-dialog')?.close();}
    else if(a==='file-remove'){const f=allFiles().find(f=>(f.id||f.name)===id);if(f)dialog('移至本机回收站？','<p>从此浏览器的资料空间中移除此文件？聊天中的原始附件会保留。</p>',()=>{state.trash.push({...f,owned:state.files.some(x=>x.id===id),kind:'file',deletedAt:Date.now()});state.files=state.files.filter(x=>x.id!==id);state.fileHidden.push(id);persist();render();},'移至回收站');}
    else if(a==='space-filter'){state.spaceFilter=b.dataset.filter;persist();render();}
    else if(a==='space-display'){state.spaceDisplay=b.dataset.display;persist();render();}
    else if(a==='space-filter-dialog'){dialog('筛选器','<label>搜索<input name="query" value="'+esc(query)+'"></label>',data=>{query=String(data.get('query'));render();});}
    else if(a==='plugin-detail')pluginDetails(b.dataset.pluginName);
    else if(a==='plugin-category'){state.pluginCategory=state.pluginCategory===b.dataset.category?null:b.dataset.category;persist();filterPlugins();}
    else if(a==='plugin-tab'){state.pluginTab=b.dataset.tab;persist();for(const t of container.querySelectorAll('[role="tab"]'))select(t,t===b);}
    else if(a==='plugin-more')dialog('更多操作',button('管理插件','plugin-settings')+button('添加本地插件','plugin-add'),()=>{},'关闭');
    else if(a==='plugin-add')dialog('添加插件','<p class="nav-local-note">添加此浏览器中的本地指令插件。第三方账户授权需要对应服务端接入。</p><label>名称<input name="name" required></label><label>描述<input name="description"></label><label>指令<textarea name="instructions" rows="7" required></textarea></label>',data=>{state.plugins[String(data.get('name')).trim()]={description:String(data.get('description')),instructions:String(data.get('instructions'))};persist();render();});
    else if(a==='plugin-use'){const p=state.plugins[b.dataset.pluginName];if(p?.instructions){document.querySelector('dialog.nav-local-dialog')?.close();await usePrompt(p.instructions,'work');}}
    else if(a==='plugin-delete'){const name=b.dataset.pluginName,p=state.plugins[name];if(p)state.trash.push({...p,id:name,name,kind:'plugin',deletedAt:Date.now()});delete state.plugins[name];persist();render();}
    else if(a==='import-files')await importFiles();else return false;
    return true;
  }
  function handleChange(event){
    const t=event.target;
    if(t.matches?.('[data-nav-space-import]')){importLocalFiles([...t.files]).catch(error=>toast(error.message));t.value='';return true;}
    if(t.matches?.('[data-nav-site-import]')){importSites([...t.files]).catch(error=>toast(error.message));t.value='';return true;}
    if(t.matches?.('[data-nav-image-prompt]')){updateImageSubmit();return true;}
    if(t.matches?.('[data-nav-map-prompt]'))return true;
    if(t.matches?.('[data-page-title],[data-page-content]')){const id=t.dataset.pageTitle||t.dataset.pageContent,p=state.pages.find(p=>p.id===id);if(p){if(t.dataset.pageTitle)p.title=t.value||'Untitled';else p.content=t.value;p.updatedAt=Date.now();persist();container.querySelector('[data-save-status]')?.replaceChildren(document.createTextNode('已保存到此浏览器'));}return true;}
    if(t.matches?.('[data-nav-search]')){query=t.value;if(current==='plugins'){filterPlugins();return true;}if(current==='gpts'){filterGpts();renderCapturedRecords();return true;}const start=t.selectionStart;render();const n=container.querySelector('[data-nav-search]');n?.focus();n?.setSelectionRange(start,start);return true;}
    return false;
  }
  function checkTasks(){let changed=false;const now=Date.now();for(const t of state.tasks){if(!t.enabled||t.due>now)continue;t.lastRun=now;changed=true;toast('定时任务：'+t.title);if('Notification'in window&&Notification.permission==='granted')new Notification(t.title,{body:t.prompt.slice(0,180),tag:'local-task-'+t.id});if(t.repeat==='daily'||t.repeat==='weekly'){const step=t.repeat==='daily'?86400000:604800000;do{t.due+=step;}while(t.due<=now);}else t.enabled=false;}if(changed){persist();if(current==='scheduled')render();}}
  const timer=setInterval(checkTasks,30000);checkTasks();
  function exportState(){return structuredClone({version:1,...snapshot()});}
  async function importState(value,{replace=true}={}){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('资料空间导入数据格式无效');
    const incoming=structuredClone(value),keys=['pages','tasks','gpts','sites','files','spaces','trash'];
    for(const key of keys)if(incoming[key]!==undefined&&(!Array.isArray(incoming[key])||incoming[key].some(item=>!item||typeof item!=='object')))throw Error('资料空间导入数据中的 '+key+' 格式无效');
    const next={...freshState(),...(replace?{}:state),...incoming};
    if(!replace){for(const key of keys)if(incoming[key])next[key]=[...new Map([...(state[key]||[]),...incoming[key]].map(item=>[(item.kind||'')+':'+(item.id||item.name),item])).values()];next.plugins={...state.plugins,...incoming.plugins};}
    for(const key of keys)if(!Array.isArray(next[key]))next[key]=[];
    for(const key of ['plugins','siteHistory','siteNames','imageUses','fileFavorites','fileSpaceMap'])if(!next[key]||typeof next[key]!=='object'||Array.isArray(next[key]))next[key]={};
    for(const key of ['siteHidden','fileHidden'])if(!Array.isArray(next[key]))next[key]=[];
    state=next;
    if(options.db){for(const file of state.files)if(file.dataUrl)await options.db.saveAsset(file);for(const file of state.sites)if(file.content||file.dataUrl)await storeSite(file);state.files=await Promise.all(state.files.map(async file=>file.dataUrl?file:{...await options.db.getAsset(file.id),...file}));state.sites=await Promise.all(state.sites.map(async file=>file.content||file.dataUrl?file:{...await options.db.getAsset(file.id),...file}));}
    persist();if(container?.isConnected)render();return exportState();
  }
  function clearState(){mapRequest?.abort();mapLoading=false;mapResults=[];state=freshState();localStorage.removeItem(KEY);document.cookie='cg_workspace=; Max-Age=0; Path=/; SameSite=Lax';document.querySelectorAll('dialog.nav-local-dialog,[data-nav-gpt-dialog]').forEach(n=>n.remove());if(container?.isConnected)render();}
  return {show,handleClick,handleChange,hydrateNavigation,exportState,importState,clearState,hydrate(root,name){container=root;current=normal(name);root.dataset.navigationView=current;capturedMarkup=root.innerHTML;capturedName=current;imagePanelHTML='';inPageEditor=false;hydrateCaptured();renderCapturedRecords();},refresh:render,destroy(){clearInterval(timer);mapRequest?.abort();},getState:()=>structuredClone(state)};
}
