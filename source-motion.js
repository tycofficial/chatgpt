/* Small adapters for the exact motion contracts in the captured public UI.
 * Source evidence is listed below; no original app/runtime module is executed.
 */
export const SOURCE_MOTION = Object.freeze({
  easing: {enter:'cubic-bezier(.19,1,.22,1)',exit:'cubic-bezier(.8,0,.4,1)',snappy:'cubic-bezier(.23,1,.32,1)',inOut:'cubic-bezier(.42,0,.58,1)'},
  mode: {duration:300,easing:'cubic-bezier(.23,1,.32,1)'},
  composerLayout: {duration:300,easing:'cubic-bezier(.23,1,.32,1)',crossfade:false},
  composerHeight: {duration:150,easing:'cubic-bezier(.23,1,.32,1)'},
  headline: {duration:200,easing:'cubic-bezier(.42,0,.58,1)',y:-4,exitDuration:0},
  menu: {enter:150,exit:100,scale:.95,enterEase:'cubic-bezier(.19,1,.22,1)',exitEase:'cubic-bezier(.8,0,.4,1)'},
  select: {enter:300,exit:200,scale:.95,enterEase:'cubic-bezier(.19,1,.22,1)',exitEase:'cubic-bezier(.8,0,.4,1)'},
  sidebar: {duration:300,bounce:.1,legacyDuration:350,peekDuration:120,peekEase:'cubic-bezier(0,0,.58,1)'},
  dialogHeight: {duration:300,easing:'cubic-bezier(.23,1,.32,1)',measurementThreshold:.5},
  button: {duration:150,easing:'ease'},
  evidence: {
    mode:'956483.6cfec0717e.js / N0Qc; capture-16-modes.json',
    composer:'956483.6cfec0717e.js / osar.LayoutTransition and O5pN; V8uZ.e; c7fcb2505631.css .animatedHeight-NnnHkK',
    headline:'956483.6cfec0717e.js / d1LW; capture-16-modes.json',
    sidebar:'337882.da1b5beae8.js / gbrq.et + I7bK.b; captured feature navigation uses duration .3, bounce .1; peek override .12',
    springResolver:'447351.16e0481926.js / oNzN (duration/bounce resolver and analytic spring)',
    menu:'2239c557318a.css .Menu-rMiuRe .MenuList-OZJ_8w; .MenuItem-xtyGWy',
    select:'225b7e817ac3.css .Menu-dvUYfg .MenuList-cH1ibD',
    dialogHeight:'87162.d101a9fdd5.js / JNtf; 23dc69af331f.css .heightAnimated-LhPH1S',
    button:'2239c557318a.css .Button-BZrLNX and pseudo-elements',
  },
  limitations:['The saved native .surface-tkBoA3 CSS has no entrance/exit animation. Generic menu timing is a separate, explicitly named source variant.','No general dialog entrance scale/fade was established; dialog adapter animates only the verified content-height behavior.','Picker motion is owned by the dedicated picker implementations.'],
});

const clamp=(a,b,v)=>Math.max(a,Math.min(b,v));
const reduced=()=>typeof matchMedia==='function'&&(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.reducedMotion==='true');
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const rect=e=>e?.getBoundingClientRect();
const savedStyle=(e,names)=>Object.fromEntries(names.map(n=>[n,[e.style.getPropertyValue(n),e.style.getPropertyPriority(n)]]));
const restoreStyle=(e,values)=>{for(const[n,[v,p]]of Object.entries(values))v?e.style.setProperty(n,v,p):e.style.removeProperty(n);};
const activeAnimations=new Set();

function bezier(x1,y1,x2,y2){
  const at=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
  return x=>{let lo=0,hi=1,t=x;for(let i=0;i<18;i++){const v=at(t,x1,x2);if(Math.abs(v-x)<1e-7)break;v<x?lo=t:hi=t;t=(lo+hi)/2;}return at(t,y1,y2);};
}
const snappy=bezier(.23,1,.32,1);

/** Duration/bounce spring resolution follows the original oNzN implementation.
 * duration is milliseconds, as in that generator (the public transition uses s).
 */
export function sourceSpring(duration=300,bounce=.1){
  const seconds=clamp(.01,10,duration/1000);let ratio=clamp(.05,1,1-bounce);
  const damped=w=>w*Math.sqrt(1-ratio*ratio);
  let equation,derivative;
  if(ratio<1){
    equation=w=>.001-(w*ratio)/damped(w)*Math.exp(-w*ratio*seconds);
    derivative=w=>{const exponent=w*ratio*seconds;return(-ratio*ratio*w*w*seconds)*Math.exp(-exponent)*(-equation(w)+.001>0?-1:1)/damped(w*w);};
  }else{
    equation=w=>-.001+Math.exp(-w*seconds)*(w*seconds+1);
    derivative=w=>-seconds*seconds*w*Math.exp(-w*seconds);
  }
  let omega=5/seconds;
  for(let i=1;i<12;i++)omega-=equation(omega)/derivative(omega);
  if(!Number.isFinite(omega)){omega=10;ratio=.5;} // Original 100/10 fallback.
  return elapsed=>{
    if(elapsed>=duration)return 1;
    const t=Math.max(0,elapsed)/1000;
    if(ratio<1){const wd=damped(omega);return 1-Math.exp(-ratio*omega*t)*(ratio*omega/wd*Math.sin(wd*t)+Math.cos(wd*t));}
    return 1-Math.exp(-omega*t)*(1+omega*t);
  };
}

function run(duration,progress,update,finish){
  let raf,ended=false,resolve;
  const done=new Promise(r=>resolve=r);
  const record={cancel(){if(ended)return;ended=true;cancelAnimationFrame(raf);activeAnimations.delete(record);resolve(false);},done};
  activeAnimations.add(record);
  const complete=()=>{if(ended)return;ended=true;activeAnimations.delete(record);finish?.();resolve(true);};
  if(reduced()||!duration){update(1);complete();return record;}
  const start=performance.now();
  const step=now=>{if(ended)return;const elapsed=now-start;update(progress(Math.min(duration,elapsed)));elapsed>=duration?complete():raf=requestAnimationFrame(step);};
  update(progress(0));raf=requestAnimationFrame(step);return record;
}

function webAnimate(node,keyframes,options){
  if(!node||reduced()||!node.animate)return Promise.resolve();
  const animation=node.animate(keyframes,{...options,fill:'both'});
  const record={cancel:()=>animation.cancel()};activeAnimations.add(record);
  return animation.finished.catch(()=>{}).finally(()=>{animation.cancel();activeAnimations.delete(record);});
}

const homeSelectors={surface:'[data-ui-main] [data-composer-body]',editor:'[data-ui-main] .LegacyExpandableEditor-J8Xfot',attach:'#attach-button',model:'#model-button',mic:'#mic-button',voice:'#voice-button'};
/** Read before replacing mode DOM. Original shared layout IDs are surface/editor. */
export function snapshotHome(root=document){
  const targets={};
  for(const[key,selector]of Object.entries(homeSelectors)){
    const node=root.querySelector(selector);if(!node)continue;
    const bounds=rect(node);if(!bounds?.width||!bounds.height)continue;
    const style=getComputedStyle(node);
    targets[key]={rect:bounds,radius:style.borderRadius};
  }
  const indicator=root.querySelector('.indicator-zrk55u');
  return{targets,indicator:indicator?getComputedStyle(indicator).transform:null};
}

let homeRun;
/** Project the new original DOM from old bounds without scaling its text/icons.
 * Each child compensates its nearest projected parent's scale, like layout
 * projection. This preserves the original layout; no screenshot/copy is added.
 */
export function animateHomeSwap(before,{root=document,headline=true,focus=false}={}){
  homeRun?.cancel();
  if(!before)return Promise.resolve();
  const targets=[];
  for(const[key,selector]of Object.entries(homeSelectors)){
    const node=root.querySelector(selector),old=before.targets[key];if(!node||!old)continue;
    const bounds=rect(node);if(!bounds?.width||!bounds.height)continue;
    targets.push({key,node,old:old.rect,after:bounds,oldRadius:old.radius,newRadius:getComputedStyle(node).borderRadius,baseline:savedStyle(node,['transform','transform-origin','will-change','border-radius']),parent:null});
  }
  for(const target of targets){
    target.parent=targets.filter(t=>t!==target&&t.node.contains(target.node)).sort((a,b)=>a.node.contains(b.node)?1:-1)[0]||null;
    target.node.style.transformOrigin='0 0';target.node.style.willChange='transform';
  }
  const interpolate=(a,b,p)=>a+(b-a)*p;
  const dispose=()=>{for(const t of targets)restoreStyle(t.node,t.baseline);};
  const motion=run(SOURCE_MOTION.composerLayout.duration,t=>snappy(t/SOURCE_MOTION.composerLayout.duration),p=>{
    for(const target of targets){
      const o=target.old,n=target.after;
      target.visual={left:interpolate(o.left,n.left,p),top:interpolate(o.top,n.top,p),width:interpolate(o.width,n.width,p),height:interpolate(o.height,n.height,p)};
      const v=target.visual,parent=target.parent;
      let x,y,sx,sy;
      if(parent){
        const psx=parent.visual.width/parent.after.width,psy=parent.visual.height/parent.after.height;
        x=(v.left-parent.visual.left-(n.left-parent.after.left)*psx)/psx;
        y=(v.top-parent.visual.top-(n.top-parent.after.top)*psy)/psy;
        sx=v.width/(n.width*psx);sy=v.height/(n.height*psy);
      }else{x=v.left-n.left;y=v.top-n.top;sx=v.width/n.width;sy=v.height/n.height;}
      target.node.style.transform=`translate(${x}px,${y}px) scale(${sx},${sy})`;
      if(target.key==='surface'){
        const a=parseFloat(target.oldRadius),b=parseFloat(target.newRadius);
        if(Number.isFinite(a)&&Number.isFinite(b)){const radius=interpolate(a,b,p);target.node.style.borderRadius=`${radius/(v.width/n.width)}px / ${radius/(v.height/n.height)}px`;}
      }
    }
  },dispose);
  const oldCancel=motion.cancel;motion.cancel=()=>{oldCancel();dispose();};homeRun=motion;
  const indicator=root.querySelector('.indicator-zrk55u');
  if(indicator&&before.indicator)webAnimate(indicator,[{transform:before.indicator},{transform:getComputedStyle(indicator).transform}],{duration:SOURCE_MOTION.mode.duration,easing:SOURCE_MOTION.mode.easing});
  if(headline)enterHeadline(root.querySelector('#welcome'));
  const utility=root.querySelector('.ResponsiveHomeUtilityBar-wLIz9N');
  if(utility)enterUtilityBar(utility,{position:'responsive'});
  return motion.done.then(completed=>{if(completed&&focus){const prompt=root.querySelector('#prompt');prompt?.focus({preventScroll:true});prompt?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}return completed;});
}

export function enterHeadline(node){return webAnimate(node,[{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:SOURCE_MOTION.headline.easing});}
export function enterUtilityBar(node,{position='responsive'}={}){
  const above=position==='above'||position==='responsive'&&matchMedia('(width < 40rem)').matches;
  return webAnimate(node,[{opacity:0,transform:`translateY(${above?'100%':'-100%'})`},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:SOURCE_MOTION.composerLayout.easing});
}

const sidebars=new WeakMap();
/** Keep the expanded pane mounted through collapse; animate its clip/width. */
export function animateSidebar({collapsed,shell=document.querySelector('[data-app-shell-frame]'),sidebar=document.querySelector('[data-ui-sidebar]'),pane=document.querySelector('[data-ui-home-nav],nav[aria-label="设置"]'),expandedWidth=340,closedWidth=52,commit}={}){
  if(!sidebar||!shell){commit?.();return Promise.resolve();}
  const from=rect(sidebar).width,to=collapsed?closedWidth:expandedWidth;
  const previous=sidebars.get(sidebar);
  const baseline=previous?.baseline||savedStyle(sidebar,['width','min-width','flex-basis','overflow']);
  const paneBaseline=previous?.paneBaseline||(pane?savedStyle(pane,['display','visibility']):null);
  previous?.run.cancel();
  if(pane){pane.style.setProperty('display','flex','important');pane.style.visibility='visible';}
  sidebar.style.setProperty('overflow','hidden','important');
  commit?commit():document.body.classList.toggle('sidebar-collapsed',collapsed);
  const duration=SOURCE_MOTION.sidebar.duration;
  const motion=run(duration,sourceSpring(duration,.1),p=>{
    const width=from+(to-from)*p;
    shell.style.setProperty('--app-shell-left-panel-width',`${width}px`);
    shell.style.setProperty('--app-shell-animated-left-panel-width',`${width}px`);
    for(const prop of ['width','min-width','flex-basis'])sidebar.style.setProperty(prop,`${width}px`,'important');
  },()=>{
    restoreStyle(sidebar,baseline);if(pane&&paneBaseline)restoreStyle(pane,paneBaseline);
    shell.style.setProperty('--app-shell-left-panel-width',`${to}px`);shell.style.setProperty('--app-shell-animated-left-panel-width',`${to}px`);sidebars.delete(sidebar);
  });
  sidebars.set(sidebar,{run:motion,baseline,paneBaseline});
  motion.done.then(()=>{if(sidebars.get(sidebar)?.run===motion)sidebars.delete(sidebar);});
  return motion.done;
}

function surfaceProfile(kind){return SOURCE_MOTION[kind==='select'?'select':'menu'];}
/** Explicit generic-menu source variant; dedicated model pickers are excluded. */
export function openSurface(node,{kind='menu',origin}={}){
  if(!node)return Promise.resolve();
  if(node.matches?.('[data-runtime-power-menu],.power-menu,.work-menu'))return Promise.resolve();
  node.hidden=false;node.dataset.sourceMenu='';node.dataset.state='open';
  for(const item of node.querySelectorAll('button,[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'))if(!item.matches('.Button-BZrLNX,.MenuItem-xtyGWy,.MenuItem-FhQcPS'))item.dataset.sourceMenuItem='';
  if(origin)node.style.transformOrigin=origin;
  const p=surfaceProfile(kind);
  return webAnimate(node,[{opacity:0,scale:p.scale},{opacity:1,scale:1}],{duration:p.enter,easing:p.enterEase});
}
export async function closeSurface(node,{kind='menu',remove=true}={}){
  if(!node)return;node.dataset.state='closed';node.style.pointerEvents='none';const p=surfaceProfile(kind);
  await webAnimate(node,[{opacity:getComputedStyle(node).opacity,scale:getComputedStyle(node).scale||1},{opacity:0,scale:p.scale}],{duration:p.exit,easing:p.exitEase});
  if(remove)node.remove();else{node.hidden=true;node.style.pointerEvents='';}
}

/** Pass the original content wrapper separately. Never wraps/reflows controls. */
export function observeDialogHeight(dialog,content){
  if(!dialog||!content||dialog===content)return()=>{};
  const baseline=savedStyle(dialog,['height','--dialog-content-height']);
  let current=NaN,measureFrame,readyFrame;
  dialog.dataset.sourceDialogHeight='';
  const measure=()=>{cancelAnimationFrame(measureFrame);measureFrame=requestAnimationFrame(()=>{
    const style=getComputedStyle(dialog),height=(content.offsetHeight||content.scrollHeight)+(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);
    if(!Number.isFinite(height)||Math.abs(height-current)<.5)return;current=height;
    dialog.style.setProperty('--dialog-content-height',`${height}px`);dialog.style.height='var(--dialog-content-height)';
    if(!dialog.dataset.dialogHeightReady)readyFrame=requestAnimationFrame(()=>dialog.dataset.dialogHeightReady='true');
  });};
  const observer=new ResizeObserver(measure);observer.observe(content);measure();
  return()=>{observer.disconnect();cancelAnimationFrame(measureFrame);cancelAnimationFrame(readyFrame);restoreStyle(dialog,baseline);delete dialog.dataset.sourceDialogHeight;delete dialog.dataset.dialogHeightReady;};
}

export function mountSourceMotion(){
  document.documentElement.dataset.sourceMotion='';
  const cleanups=new Set();
  return{
    snapshotHome,animateHomeSwap,openSurface,closeSurface,sidebar:animateSidebar,enterHeadline,
    async swapHome(update,options){const before=snapshotHome(options?.root||document);update();await frame();return animateHomeSwap(before,options);},
    dialogHeight(dialog,content){const cleanup=observeDialogHeight(dialog,content);cleanups.add(cleanup);return()=>{cleanup();cleanups.delete(cleanup);};},
    dispose(){homeRun?.cancel();for(const a of [...activeAnimations])a.cancel();for(const cleanup of cleanups)cleanup();cleanups.clear();delete document.documentElement.dataset.sourceMotion;},
  };
}
