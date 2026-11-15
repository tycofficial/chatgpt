/** Original public v2 pet atlases and FPUb frame timings, rendered locally.
 * The web replica anchors its companion to the viewport; the original native
 * app's overlay/window management is not reproduced by this module.
 */
const ASSETS={
  codex:'codex-spritesheet-v6.922b99db4b.webp',
  dewey:'dewey-spritesheet-v5.81cf696c13.webp',
  fireball:'fireball-spritesheet-v5.864d94523f.webp',
  hoots:'hoots-spritesheet-v8.52075ad356.webp',
  rocky:'rocky-spritesheet-v5.03e1d8b0f2.webp',
  seedy:'seedy-spritesheet-v10.c613f3fce1.webp',
  stacky:'stacky-spritesheet-v6.62c1fa318f.webp',
  bsod:'bsod-spritesheet-v5.f4386b1066.webp',
  'null-signal':'null-signal-spritesheet-v7.e7af0b42f5.webp',
};
const NAMES={codex:'Codex',dewey:'Dewey',fireball:'Fireball',hoots:'Hoots',rocky:'Rocky',seedy:'Seedy',stacky:'Stacky',bsod:'BSOD','null-signal':'Null Signal'};
const row=(r,count,ms,last)=>Array.from({length:count},(_,c)=>({r,c,ms:c===count-1?last:ms}));
const idle=[280,110,110,140,140,320].map((ms,c)=>({r:0,c,ms:ms*6}));
const ANIMATIONS={idle,waving:row(3,4,140,280),jumping:row(4,5,140,280),failed:row(5,8,140,240),waiting:row(6,6,150,260),running:row(7,6,120,220),review:row(8,6,150,280),'running-left':row(2,8,120,220),'running-right':row(1,8,120,220)};
export const BUILTIN_COMPANIONS=Object.keys(ASSETS).map(id=>({id,name:NAMES[id],url:new URL('./companion-assets/'+ASSETS[id],import.meta.url).href}));

export function mountCompanion({getPreferences=()=>({}),getMode=()=>document.body.dataset.mode,onOpenSettings=()=>{},getState}={}){
  let disposed=false,timer=null,lookTimer=null,frame=0,animation='idle',selection='',loaded=false,hover=false,forcedState=null,lastVisible=false;
  const button=document.createElement('button');button.type='button';button.className='companion-control';button.hidden=true;button.dataset.localCompanion='';
  const sprite=document.createElement('span');sprite.className='Root-acw8Rg companion-sprite';sprite.setAttribute('aria-hidden','true');button.append(sprite);document.body.append(button);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const normalize=value=>String(value||'default').toLowerCase().replace(/\s+/g,'-');
  const reduced=()=>{const s=getPreferences()||{};return s.reducedMotion==='on'||s.reducedMotion!=='off'&&motion.matches;};
  function clearAnimation(){clearTimeout(timer);timer=null;}
  function paint(f){sprite.style.backgroundPosition=`${f.c/7*100}% ${f.r/10*100}%`;}
  function cycle(){
    clearAnimation();if(disposed||button.hidden||!loaded)return;
    const frames=ANIMATIONS[animation]||idle;paint(frames[frame]||frames[0]);
    if(reduced())return;
    timer=setTimeout(()=>{frame=(frame+1)%frames.length;cycle();},(frames[frame]||frames[0]).ms);
  }
  function animate(next){if(!ANIMATIONS[next])next='idle';if(next===animation&&timer!==null)return;clearAnimation();animation=next;frame=0;sprite.dataset.codexPetState=next;cycle();}
  function inferredState(){
    if(forcedState)return forcedState;
    const explicit=getState?.();if(explicit&&ANIMATIONS[explicit])return explicit;
    const stop=document.getElementById('stop-button');return stop&&!stop.hidden?'running':'idle';
  }
  function refresh(){
    if(disposed)return;
    const prefs=getPreferences()||{},id=normalize(prefs.pet),mode=getMode(),view=document.body.dataset.view;
    const visible=Object.hasOwn(ASSETS,id)&&['work','codex'].includes(mode)&&(!view||view==='chat')&&!document.hidden;
    if(visible&&selection!==id){
      selection=id;loaded=false;clearAnimation();sprite.dataset.codexPetAssetRef=id;sprite.dataset.codexPetId=id;
      sprite.style.backgroundSize='800% 1100%';sprite.style.backgroundImage=`url("${new URL('./companion-assets/'+ASSETS[id],import.meta.url).href}")`;
      const image=new Image(),requested=id;image.onload=()=>{if(disposed||selection!==requested)return;loaded=true;cycle();};image.onerror=()=>{if(selection===requested){loaded=false;button.hidden=true;}};image.src=new URL('./companion-assets/'+ASSETS[id],import.meta.url).href;
      button.setAttribute('aria-label','智能伙伴：'+NAMES[id]);button.title=NAMES[id];
    }
    button.hidden=!visible;
    if(!visible){clearAnimation();clearTimeout(lookTimer);hover=false;}
    else if(!lastVisible){frame=0;animate('waving');clearTimeout(lookTimer);lookTimer=setTimeout(()=>animate(inferredState()),700);}
    else animate(hover?'jumping':inferredState());
    lastVisible=visible;
  }
  button.addEventListener('click',e=>{e.stopPropagation();onOpenSettings('pets');});
  button.addEventListener('pointerenter',()=>{hover=true;clearTimeout(lookTimer);animate('jumping');});
  button.addEventListener('pointerleave',()=>{hover=false;animate(inferredState());});
  function look(e){
    if(disposed||button.hidden||!loaded||hover||reduced()||inferredState()!=='idle')return;
    const box=button.getBoundingClientRect(),dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2);
    if(Math.hypot(dx,dy)<=1)return;
    // FPUb look frames: 16 directions, clockwise from north, in atlas rows 9–10.
    const direction=Math.round((Math.atan2(dx,-dy)*180/Math.PI+360)%360/22.5)%16;
    clearAnimation();paint({r:9+Math.floor(direction/8),c:direction%8});clearTimeout(lookTimer);lookTimer=setTimeout(()=>{frame=0;cycle();},500);
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.target===document.body||r.target.id==='stop-button'))refresh();
  });
  observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['data-mode','data-view','hidden']});
  const onVisibility=()=>refresh();document.addEventListener('visibilitychange',onVisibility);document.addEventListener('pointermove',look,{passive:true});motion.addEventListener?.('change',refresh);
  refresh();
  return{
    refresh,
    setState(state){forcedState=ANIMATIONS[state]?state:null;refresh();},
    destroy(){disposed=true;clearAnimation();clearTimeout(lookTimer);observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('pointermove',look);motion.removeEventListener?.('change',refresh);button.remove();}
  };
}
