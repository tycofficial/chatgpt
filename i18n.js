/* Static interface text only. Public official locale catalogs supply translations;
 * English defaults come from the corresponding public id/defaultMessage source.
 * Optional model fallback receives only the fixed CORE labels below, never DOM
 * text, chat content, files, identities, instructions, or other user records. */
const CORE={
  '首页':'Home','资料空间':'Space','定时任务':'Scheduled tasks','插件':'Plugins','探索':'Explore','站点':'Sites','地图':'Maps','图像':'Images','项目':'Projects','用量':'Usage','聊天':'Chat','工作':'Work','今天想聊点什么？':'What would you like to chat about today?','我们要做什么？':'What are we working on?','我们要构建什么？':'What are we building?','询问 ChatGPT':'Ask ChatGPT','使用 ChatGPT Work':'Use ChatGPT Work','随心输入':'Ask anything','新聊天':'New chat','搜索':'Search','临时聊天':'Temporary chat','设置':'Settings','安全':'Security','账户':'Account','家长控制':'Parental controls','可信赖联系人':'Trusted contact','使用情况':'Usage','账单':'Billing','常规':'General','外观':'Appearance','通知':'Notifications','语音':'Voice','个性化':'Personalization','智能伙伴':'Pets','键盘快捷键':'Keyboard shortcuts','已归档的聊天':'Archived chats','存储':'Storage','数据控制':'Data controls','密码':'Passwords','浏览器':'Browser','云端电脑':'Cloud computer','Codex 云端':'Codex cloud','代码审查':'Code review',
  '保存':'Save','取消':'Cancel','完成':'Done','关闭':'Close','确定':'OK','确认':'Confirm','删除':'Delete','移除':'Remove','更改':'Change','编辑':'Edit','添加':'Add','管理':'Manage','导入':'Import','导出':'Export','下载':'Download','重试':'Retry','恢复默认':'Restore defaults','恢复默认快捷键':'Restore default shortcuts','开启':'On','关闭动态效果':'Reduce motion','系统':'System','浅色':'Light','深色':'Dark','默认':'Default','自定义':'Custom','语言':'Language','自动检测':'Auto-detect','发送快捷键':'Send shortcut','可用推理强度':'Available reasoning efforts','无':'None','轻度':'Low','中':'Medium','高':'High','极高':'Extra high','强调色':'Accent','背景':'Background','前景':'Foreground','模式':'Mode','主题':'Theme','高级':'Advanced','蓝色':'Blue','绿色':'Green','黄色':'Yellow','粉色':'Pink','橙色':'Orange','紫色':'Purple','黑色':'Black',
  '姓名':'Name','用户名':'Username','电子邮箱':'Email address','登录':'Log in','退出登录':'Log out','使用 Google 登录':'Sign in with Google','文件':'Files','名称':'Name','大小':'Size','最近添加':'Recently added','搜索文件':'Search files','搜索已归档的聊天':'Search archived chats','没有文件':'No files','暂无已归档的聊天':'No archived chats yet','没有找到相关聊天':'No matching chats','已更新':'Updated','操作':'Actions','取消归档':'Unarchive','概览':'Overview','分析':'Analytics','此浏览器中的用量':'Usage in this browser','消息':'Messages','已记录 Token':'Recorded tokens','输入 / 输出 Token':'Input / output tokens','未记录':'Not recorded','用量历史':'Usage history','此时段内没有聊天记录':'No chats during this period','此时段内没有回复':'No replies during this period','按功能':'By feature','按模型':'By model','未记录模型':'Model not recorded','7 天':'7 days','30 天':'30 days',
  '启用记忆':'Enable memory','自定义指令':'Custom instructions','已保存的记忆':'Saved memories','没有已保存的记忆':'No saved memories','添加记忆':'Add a memory','参考照片':'Reference photo','全身参考照片':'Full-body reference photo','基础风格和语气':'Base style and tone','更多':'More','更少':'Less','亲切程度':'Warmth','热情程度':'Enthusiasm','表情符号':'Emoji','标题和列表':'Headers and lists','简洁':'Simple','专业':'Professional','友好':'Friendly','坦率':'Candid','古灵精怪':'Quirky','高效':'Efficient','书呆子':'Nerdy','愤世嫉俗':'Cynical','系统默认':'System default','语音词典':'Voice dictionary','按下快捷键':'Press a shortcut','工具权限':'Tool permissions','始终询问':'Always ask','允许使用只读工具':'Allow read-only tools','允许使用低风险工具':'Allow low-risk tools','允许使用所有工具':'Allow all tools','Cookie 偏好':'Cookie preferences','必要 Cookie':'Necessary cookies','分析 Cookie':'Analytics cookies','营销 Cookie':'Marketing cookies','账户 PIN 码':'Account PIN','设置账户 PIN 码':'Set account PIN','输入 PIN 码':'Enter PIN','更改 PIN 码':'Change PIN','删除 PIN 码':'Delete PIN','解锁':'Unlock','邀请家庭成员':'Invite family member','邀请可信赖联系人':'Invite a trusted contact','电话':'Phone','电话号码':'Phone number','使用电话':'Use phone','使用电子邮箱':'Use email','此人是：':'This person is:','我的家长或监护人':'My parent or guardian','我的孩子':'My child'
};
const BUILTIN_SKIP='#messages,[data-message],.message,#history-list,#project-list,[data-chat],[data-project],[data-artifact],[data-user-content],[data-private-content],.settings-inline-title,.settings-inline-file,.settings-memory,.settings-chat-list,.settings-photo,#profile-button,.select-text,pre,code,script,style,textarea';
const originalText=new WeakMap(),originalAttributes=new WeakMap(),epochs=new WeakMap(),localeMemory=new Map(),aliases=new Map();
let catalogPromise;
const storageRead=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
const storageWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
async function catalog(){
  if(!catalogPromise)catalogPromise=fetch(new URL('./i18n/labels.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('无法载入界面词库');return r.json();}).then(data=>{
    for(const[zh,en]of Object.entries(CORE)){const existing=data.byText[zh]||data.byText[en],entry={...(existing||{}),en,zh};data.byText[zh]=entry;data.byText[en]=entry;}
    return data;
  });return catalogPromise;
}
function normalize(locale){
  const value=String(!locale||locale==='auto'?(navigator.language||'zh-CN'):locale).replace('_','-');
  if(/^en(?:-|$)/i.test(value))return'en-US';if(/^zh(?:-|$)/i.test(value))return/-(TW|HK|Hant)/i.test(value)?(/-HK/i.test(value)?'zh-HK':'zh-TW'):'zh-CN';return value;
}
function localeKey(locale,manifest){if(manifest[locale])return locale;const base=locale.split('-')[0].toLowerCase();if(base==='no')return'nb-NO';return Object.keys(manifest).find(k=>k.toLowerCase()===locale.toLowerCase())||Object.keys(manifest).find(k=>k.split('-')[0].toLowerCase()===base)||null;}
async function translateFixedCore(locale,labels,getSettings){
  const settings=getSettings?.();if(!settings?.apiBase||!settings.apiKey||!labels.length)return{};
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
  try{
    const base=settings.apiBase.replace(/\/+$/,'');const url=(base.endsWith('/v1')?base:base+'/v1')+'/chat/completions';
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+settings.apiKey},signal:abort.signal,body:JSON.stringify({model:'gpt-6-luna',reasoning_effort:'none',stream:false,messages:[{role:'system',content:'Translate these fixed software interface labels into '+locale+'. Return a JSON object mapping each exact original label to its translation. Preserve product names and placeholders. Do not add explanations.'},{role:'user',content:JSON.stringify(labels)}]})});
    if(!response.ok)return{};const result=await response.json(),content=result.choices?.[0]?.message?.content;if(typeof content!=='string')return{};
    const parsed=JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));
    const allowed=new Set(labels),clean={};for(const[k,v]of Object.entries(parsed))if(allowed.has(k)&&typeof v==='string'&&v.trim()&&v.length<1000)clean[k]=v;return clean;
  }catch{return{};}finally{clearTimeout(timer);}
}
async function dictionary(locale,data,getSettings){
  if(locale==='en-US'||locale==='zh-CN')return null;
  const key=localeKey(locale,data.locales);if(!key)return null;
  const cacheKey='cg-i18n:'+data.build+':'+key;
  if(localeMemory.has(cacheKey))return localeMemory.get(cacheKey);
  const pending=(async()=>{
    const cached=storageRead(cacheKey);if(cached)return cached;
    const response=await fetch(data.locales[key],{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('界面语言词库加载失败');
    const official=await response.json(),map={};for(const[text,entry]of Object.entries(data.byText)){const translated=entry.id?official[entry.id]:null;if(typeof translated==='string'&&!/[{}<>]/.test(translated))map[text]=translated;}
    // This fallback can only access these fixed labels declared in source above.
    const missing=Object.keys(CORE).filter(label=>!map[label]);const additions=await translateFixedCore(locale,missing,getSettings);
    for(const[label,translated]of Object.entries(additions)){map[label]=translated;map[CORE[label]]=translated;}
    storageWrite(cacheKey,map);return map;
  })();localeMemory.set(cacheKey,pending);try{return await pending;}catch(error){localeMemory.delete(cacheKey);throw error;}
}
function inPrivateArea(element){return!!element?.closest?.(BUILTIN_SKIP);}
function lookup(text,locale,data,map){
  const entry=data.byText[text]||aliases.get(text);if(!entry)return null;
  const value=locale==='en-US'?entry.en:locale==='zh-CN'?entry.zh:map?.[text]||map?.[entry.zh]||map?.[entry.en];
  if(typeof value==='string'&&value){aliases.set(value,entry);return value;}return null;
}
/** Apply the chosen locale to known static labels only. Safe to call repeatedly. */
export async function applyLocale(root=document,{locale='auto',getSettings,templates,toast=()=>{}}={}){
  if(!root?.querySelectorAll)return{translated:0};const epoch=(epochs.get(root)||0)+1;epochs.set(root,epoch);
  const wanted=normalize(locale);let data,map;
  try{data=await catalog();map=await dictionary(wanted,data,getSettings);}catch(error){toast(error.message);return{locale:wanted,translated:0,error:error.message};}
  if(epochs.get(root)!==epoch||root!==document&&!root.isConnected)return{locale:wanted,translated:0};
  for(const element of root.querySelectorAll('button,a'))if(!inPrivateArea(element)&&element.dataset.runtimeLabel===undefined)element.dataset.runtimeLabel=element.getAttribute('aria-label')||element.textContent.trim();
  let count=0;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){
    const parent=node.parentElement;if(!parent||inPrivateArea(parent)||parent.closest('[contenteditable],input'))continue;
    let record=originalText.get(node);if(!record||node.nodeValue!==record.last)record={source:node.nodeValue,last:node.nodeValue};
    const trimmed=record.source.trim();if(!trimmed)continue;const translated=lookup(trimmed,wanted,data,map);if(translated===null)continue;
    const next=record.source.replace(trimmed,translated);if(node.nodeValue!==next){node.nodeValue=next;count++;}record.last=next;originalText.set(node,record);
  }
  for(const element of root.querySelectorAll('[aria-label],[placeholder],[title],[data-placeholder]')){
    if(inPrivateArea(element))continue;
    let records=originalAttributes.get(element);if(!records){records={};originalAttributes.set(element,records);}
    for(const attr of ['aria-label','placeholder','title','data-placeholder']){
      if(!element.hasAttribute(attr))continue;if(element.matches('[contenteditable]')&&!['data-placeholder','aria-label'].includes(attr))continue;
      const value=element.getAttribute(attr);let record=records[attr];if(!record||value!==record.last)record={source:value,last:value};
      const translated=lookup(record.source.trim(),wanted,data,map);if(translated===null)continue;
      if(element.matches('button,a')&&element.dataset.runtimeLabel===undefined)element.dataset.runtimeLabel=element.getAttribute('aria-label')||element.textContent.trim();
      if(value!==translated){element.setAttribute(attr,translated);count++;}record.last=translated;records[attr]=record;
    }
  }
  return{locale:wanted,translated:count,publicCatalog:true};
}
