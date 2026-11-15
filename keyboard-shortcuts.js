/** Browser-eligible commands and defaults from the captured public AlRz/n5iL
 * keymap. Settings use keyboard-shortcut-{commandId}: string = custom binding,
 * false = disabled, null/undefined = restore default. No desktop-only bindings.
 */
export const DEFAULT_BROWSER_SHORTCUTS=Object.freeze({
  focusMainChat:{windows:['Shift+Escape'],macOS:['Shift+Escape']},
  'composer.submit':{windows:['Enter'],macOS:['Enter']},
  'composer.submitInBackground':{windows:['CmdOrCtrl+Enter'],macOS:['CmdOrCtrl+Enter']},
  'composer.openModelPicker':{windows:['Ctrl+Shift+M'],macOS:['Ctrl+Shift+M']},
  'composer.toggleDictation':{windows:[],macOS:['Ctrl+Shift+D']},
  'composer.startVoiceMode':{windows:[],macOS:['Ctrl+Shift+V']},
  'composer.addFiles':{windows:['CmdOrCtrl+U'],macOS:['CmdOrCtrl+U']},
  deleteChat:{windows:['CmdOrCtrl+Shift+Delete','Command+Shift+Backspace'],macOS:['CmdOrCtrl+Shift+Delete','Command+Shift+Backspace']},
  newTask:{windows:['CmdOrCtrl+Shift+O'],macOS:['CmdOrCtrl+Shift+O']},
  showKeyboardShortcuts:{windows:['CmdOrCtrl+/'],macOS:['CmdOrCtrl+/']},
  'artifact.sendAnnotations':{windows:['CmdOrCtrl+Enter'],macOS:['CmdOrCtrl+Enter']},
  searchChats:{windows:['CmdOrCtrl+K'],macOS:['CmdOrCtrl+K']},
  toggleSidebar:{windows:['CmdOrCtrl+Shift+S'],macOS:['CmdOrCtrl+Shift+S']}
});
const IDS=Object.keys(DEFAULT_BROWSER_SHORTCUTS);
const KEY_ALIASES={esc:'escape',return:'enter',spacebar:'space',space:'space',del:'delete',left:'arrowleft',right:'arrowright',up:'arrowup',down:'arrowdown',plus:'+',minus:'-'};
const keyName=value=>KEY_ALIASES[String(value).toLowerCase()]||String(value).toLowerCase();
const isApple=()=>/mac|iphone|ipad/i.test(navigator.userAgentData?.platform||navigator.platform||'');
function parseBinding(value,apple){
  if(typeof value!=='string'||!value.length)return null;
  let text=value,parts,key;
  if(text===' '||text==='+'){parts=[];key=text===' '?'space':'+';}
  else if(text.endsWith('+ ')){parts=text.slice(0,-2).split('+');key='space';}
  else if(text.endsWith('++')){parts=text.slice(0,-2).split('+');key='+';}
  else{parts=text.trim().split('+');key=keyName(parts.pop()?.trim()||'');}
  if(!key)return null;
  const chord={key,ctrl:false,meta:false,alt:false,shift:false};
  for(const modifier of parts){
    const name=modifier.trim().toLowerCase();if(!name)continue;
    if(['cmdorctrl','commandorcontrol','mod','primary'].includes(name))chord[apple?'meta':'ctrl']=true;
    else if(['ctrl','control','control_l','control_r'].includes(name))chord.ctrl=true;
    else if(['cmd','command','meta','win','super','os','meta_l','meta_r'].includes(name))chord.meta=true;
    else if(['alt','option','alt_l','alt_r'].includes(name))chord.alt=true;
    else if(['shift','shift_l','shift_r'].includes(name))chord.shift=true;
    else return null;
  }
  if(['control','ctrl','meta','command','cmd','alt','option','shift','win','os','super'].includes(chord.key))return null;
  return chord;
}
function matches(event,chord){
  const key=event.key===' '?'space':keyName(event.key);
  return!!chord&&key===chord.key&&event.ctrlKey===chord.ctrl&&event.metaKey===chord.meta&&event.altKey===chord.alt&&event.shiftKey===chord.shift;
}
function overrideFor(preferences,id){
  const shortcuts=preferences?.shortcuts||{},row='keyboard-shortcut-'+id;
  return Object.hasOwn(shortcuts,row)?shortcuts[row]:shortcuts[id];
}
function isDefaultBinding(value,id){return value===undefined||value===null||id==='composer.submit'&&typeof value==='string'&&value.toLowerCase()==='enter';}
function visible(element){return!!element&&!element.hidden&&element.getClientRects().length>0;}
function targetElement(event){return event.composedPath?.().find(node=>node instanceof Element)||document.activeElement;}
const INTERACTIVE='[role=menu],[role=menubar],[role=listbox],[role=combobox],[role=slider],[role=tree],input[type=range],select,[data-shortcut-capture],[name=shortcut]';
const EDITABLE='input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),textarea,[contenteditable]:not([contenteditable=false]),[role=textbox]';

/** onCommand must return false synchronously when it cannot run a command.
 * Returning true, undefined, or a Promise accepts it and consumes the key event.
 * getContext may return {view,busy,hasActiveChat,artifactOpen,artifactFocused,
 * annotationsPending,canSubmit,canFocusMainChat,disabledCommands,canRunCommand}.
 */
export function installKeyboardShortcuts({getPreferences=()=>({}),onCommand=()=>false,getContext=()=>({})}={}){
  let destroyed=false;
  function contextFor(event){
    const supplied=getContext()||{},target=targetElement(event),prompt=document.querySelector('#prompt'),inPrompt=!!prompt&&(target===prompt||prompt.contains(target));
    const artifact=target?.closest?.('#artifact-panel,.artifact-panel,[data-artifact-view],[data-artifact-annotations],[data-annotation-editor]');
    return{
      ...supplied,target,prompt,inPrompt,
      view:supplied.view??supplied.currentView??document.body.dataset.view??'chat',
      hasActiveChat:supplied.hasActiveChat??(supplied.active!==undefined?!!supplied.active:document.body.classList.contains('has-messages')),
      artifactFocused:supplied.artifactFocused??!!artifact,
      artifactOpen:supplied.artifactOpen??visible(document.getElementById('artifact-panel')),
      typing:!!target?.closest?.(EDITABLE)
    };
  }
  function blocked(event,context){
    if(event.defaultPrevented||event.isComposing||event.keyCode===229||['Process','Dead','Unidentified'].includes(event.key)||event.getModifierState?.('AltGraph'))return true;
    if(context.shortcutsDisabled||context.menuOpen||context.modalOpen)return true;
    if(context.target?.closest?.(INTERACTIVE+',dialog[open],[role=dialog],.settings-dialog,.modal'))return true;
    // A modal can retain focus briefly in the page while it is being mounted.
    return[...document.querySelectorAll('dialog[open],[role=dialog][aria-modal=true]')].some(visible);
  }
  function allowed(id,event,context,preferences){
    if(context.disabledCommands?.has?.(id)||context.disabledCommands?.includes?.(id))return false;
    if(typeof context.canRunCommand==='function'&&context.canRunCommand(id)===false)return false;
    if(id==='artifact.sendAnnotations')return context.artifactOpen&&(context.artifactFocused||context.annotationsPending===true)&&!context.inPrompt;
    if(context.typing&&!context.inPrompt&&id!=='focusMainChat')return false;
    if(context.typing&&event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey)return false;
    if(id==='deleteChat')return!!context.hasActiveChat;
    if(id==='focusMainChat')return context.canFocusMainChat??!!context.prompt;
    if(id.startsWith('composer.')){
      if(!context.prompt||context.view!=='chat')return false;
      if(id==='composer.submit'||id==='composer.submitInBackground')return context.inPrompt&&context.canSubmit!==false;
      if(id==='composer.toggleDictation')return preferences.dictationEnabled!==false;
      if(id==='composer.startVoiceMode')return preferences.voiceEnabled!==false;
    }
    return true;
  }
  function accept(id,event,context){
    if(event.repeat){event.preventDefault();event.stopImmediatePropagation();return true;}
    const result=onCommand(id,event,context);if(result===false)return false;
    event.preventDefault();event.stopImmediatePropagation();return true;
  }
  function defaultSubmit(event,context,preferences,apple){
    const override=overrideFor(preferences,'composer.submit');
    if(!isDefaultBinding(override,'composer.submit')||!context.inPrompt||event.key!=='Enter'||event.altKey||event.shiftKey)return false;
    const primary=apple?event.metaKey&&!event.ctrlKey:event.ctrlKey&&!event.metaKey;
    const none=!event.ctrlKey&&!event.metaKey;
    const multiline=String(context.prompt?.value??context.prompt?.innerText??context.prompt?.textContent??'').includes('\n');
    const behavior=preferences.enterBehavior||'enter',submit=behavior==='cmdAlways'?primary:behavior==='cmdIfMultiline'?(multiline?primary:none):none;
    return submit&&allowed('composer.submit',event,context,preferences)&&accept('composer.submit',event,context);
  }
  function listener(event){
    if(destroyed)return;const context=contextFor(event);if(blocked(event,context))return;
    const preferences=getPreferences()||{},apple=isApple();
    // Explicit custom bindings take priority over other commands' defaults.
    for(const id of IDS){
      const override=overrideFor(preferences,id);if(override===false||isDefaultBinding(override,id))continue;
      const keys=Array.isArray(override)?override:[override];
      if(keys.some(key=>matches(event,parseBinding(key,apple)))&&allowed(id,event,context,preferences)&&accept(id,event,context))return;
    }
    if(defaultSubmit(event,context,preferences,apple))return;
    const ids=context.artifactFocused?['artifact.sendAnnotations',...IDS.filter(id=>id!=='artifact.sendAnnotations')]:IDS;
    for(const id of ids){
      if(id==='composer.submit'||!isDefaultBinding(overrideFor(preferences,id),id))continue;
      const keys=DEFAULT_BROWSER_SHORTCUTS[id][apple?'macOS':'windows'];
      if(keys.some(key=>matches(event,parseBinding(key,apple)))&&allowed(id,event,context,preferences)&&accept(id,event,context))return;
    }
  }
  document.addEventListener('keydown',listener,true);
  return{
    destroy(){if(destroyed)return;destroyed=true;document.removeEventListener('keydown',listener,true);},
    getBindings(){const p=getPreferences()||{},apple=isApple();return Object.fromEntries(IDS.map(id=>{const value=overrideFor(p,id);return[id,value===false?[]:isDefaultBinding(value,id)?[...DEFAULT_BROWSER_SHORTCUTS[id][apple?'macOS':'windows']]:Array.isArray(value)?value:[value]];}));}
  };
}
