/**
 * Source-faithful model power picker.
 * Visual declarations and the shader are derived from the public official assets:
 * https://chatgpt.com/cdn/assets/c7fcb2505631.css
 * https://chatgpt.com/cdn/assets/956483.6cfec0717e.js
 * https://chatgpt.com/cdn/assets/async/769183.7f2e2aa06b.js
 * https://chatgpt.com/cdn/assets/async/a41aecd7341d.css
 * https://chatgpt.com/cdn/assets/async/88509.a8325d5173.js
 * https://chatgpt.com/cdn/assets/async/d418c7edd9ad.css
 * Chat's five positions and two families were separately observed in the signed-in UI.
 * Other modes must be configured from observed labels via setModeTiers().
 */
const VERTEX_SOURCE = "\n  attribute vec2 aPosition;\n  varying vec2 vUv;\n\n  void main() {\n    vUv = aPosition * 0.5 + 0.5;\n    gl_Position = vec4(aPosition, 0.0, 1.0);\n  }\n";
const FRAGMENT_SOURCE = "\n  precision highp float;\n\n  varying vec2 vUv;\n\n  uniform float uTime;\n  uniform vec2 uResolution;\n\n  const vec3 COLOR_1 = vec3(0.592, 0.388, 0.945);\n  const vec3 COLOR_2 = vec3(0.831, 0.710, 0.953);\n  const vec3 COLOR_3 = vec3(0.286, 0.000, 0.404);\n  const vec3 COLOR_4 = vec3(0.145, 0.055, 0.478);\n  const vec3 COLOR_5 = vec3(0.592, 0.000, 0.996);\n  const vec3 COLOR_6 = vec3(0.780, 0.459, 0.914);\n  const vec3 COLOR_7 = vec3(0.725, 0.576, 1.000);\n  const vec3 COLOR_8 = vec3(0.400, 0.212, 0.820);\n  const vec3 COLOR_9 = vec3(0.882, 0.690, 1.000);\n  const vec3 COLOR_10 = vec3(0.498, 0.345, 0.957);\n  const vec3 COLOR_11 = vec3(0.659, 0.275, 0.910);\n  const vec3 COLOR_12 = vec3(0.212, 0.063, 0.400);\n\n  float grain(vec2 uv) {\n    vec2 grainUv = uv * uResolution * 0.5;\n    return fract(sin(dot(grainUv + uTime, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;\n  }\n\n  float fieldWeight(vec2 point, vec2 center) {\n    return exp(-dot(point - center, point - center) * 12.0);\n  }\n\n  vec3 fieldColor(vec2 rawUv) {\n    const float speed = 1.25;\n    vec2 uv = vec2(rawUv.x, 0.40 + rawUv.y * 0.18);\n    vec2 spatialScale = vec2(1.55, 1.0);\n    vec2 point = uv * spatialScale;\n    vec2 center1 = vec2(0.18 + sin(uTime * speed * 0.42) * 0.18, 0.36 + cos(uTime * speed * 0.50) * 0.42) * spatialScale;\n    vec2 center2 = vec2(0.34 + cos(uTime * speed * 0.62) * 0.24, 0.62 + sin(uTime * speed * 0.47) * 0.38) * spatialScale;\n    vec2 center3 = vec2(0.52 + sin(uTime * speed * 0.38) * 0.28, 0.30 + cos(uTime * speed * 0.58) * 0.36) * spatialScale;\n    vec2 center4 = vec2(0.70 + cos(uTime * speed * 0.54) * 0.24, 0.68 + sin(uTime * speed * 0.41) * 0.36) * spatialScale;\n    vec2 center5 = vec2(0.88 + sin(uTime * speed * 0.74) * 0.16, 0.36 + cos(uTime * speed * 0.64) * 0.40) * spatialScale;\n    vec2 center6 = vec2(0.12 + cos(uTime * speed * 0.48) * 0.20, 0.72 + sin(uTime * speed * 0.70) * 0.30) * spatialScale;\n    vec2 center7 = vec2(0.30 + sin(uTime * speed * 0.58) * 0.22, 0.44 + cos(uTime * speed * 0.52) * 0.42) * spatialScale;\n    vec2 center8 = vec2(0.46 + cos(uTime * speed * 0.68) * 0.26, 0.72 + sin(uTime * speed * 0.56) * 0.32) * spatialScale;\n    vec2 center9 = vec2(0.60 + sin(uTime * speed * 0.44) * 0.28, 0.26 + cos(uTime * speed * 0.60) * 0.38) * spatialScale;\n    vec2 center10 = vec2(0.76 + cos(uTime * speed * 0.50) * 0.22, 0.54 + sin(uTime * speed * 0.66) * 0.40) * spatialScale;\n    vec2 center11 = vec2(0.92 + sin(uTime * speed * 0.70) * 0.15, 0.66 + cos(uTime * speed * 0.46) * 0.30) * spatialScale;\n    vec2 center12 = vec2(0.06 + cos(uTime * speed * 0.40) * 0.14, 0.32 + sin(uTime * speed * 0.60) * 0.40) * spatialScale;\n    float weight1 = fieldWeight(point, center1) * (0.7 + 0.3 * sin(uTime * 0.91));\n    float weight2 = fieldWeight(point, center2) * (0.7 + 0.3 * cos(uTime * 1.07));\n    float weight3 = fieldWeight(point, center3) * (0.7 + 0.3 * sin(uTime * 0.76));\n    float weight4 = fieldWeight(point, center4) * (0.7 + 0.3 * cos(uTime * 1.18));\n    float weight5 = fieldWeight(point, center5) * (0.7 + 0.3 * sin(uTime * 1.03));\n    float weight6 = fieldWeight(point, center6) * (0.7 + 0.3 * cos(uTime * 0.83));\n    float weight7 = fieldWeight(point, center7) * (0.7 + 0.3 * sin(uTime * 1.24));\n    float weight8 = fieldWeight(point, center8) * (0.7 + 0.3 * cos(uTime * 0.96));\n    float weight9 = fieldWeight(point, center9) * (0.7 + 0.3 * sin(uTime * 1.11));\n    float weight10 = fieldWeight(point, center10) * (0.7 + 0.3 * cos(uTime * 0.72));\n    float weight11 = fieldWeight(point, center11) * (0.7 + 0.3 * sin(uTime * 1.29));\n    float weight12 = fieldWeight(point, center12) * (0.7 + 0.3 * cos(uTime * 0.88));\n    float totalWeight = max(\n      weight1 + weight2 + weight3 + weight4 + weight5 + weight6 +\n        weight7 + weight8 + weight9 + weight10 + weight11 + weight12,\n      0.0001\n    );\n    vec3 color = (\n      COLOR_1 * weight1 + COLOR_2 * weight2 + COLOR_3 * weight3 +\n      COLOR_4 * weight4 + COLOR_5 * weight5 + COLOR_6 * weight6 +\n      COLOR_7 * weight7 + COLOR_8 * weight8 + COLOR_9 * weight9 +\n      COLOR_10 * weight10 + COLOR_11 * weight11 + COLOR_12 * weight12\n    ) / totalWeight;\n    color = mix(COLOR_4, color, 0.96);\n\n    return pow(clamp(color, vec3(0.0), vec3(1.0)), vec3(0.9));\n  }\n\n  void main() {\n    vec3 color = fieldColor(vUv);\n    color += grain(vUv) * 0.012;\n    color.r += sin(uTime * 0.5) * 0.02;\n    color.g += cos(uTime * 0.7) * 0.02;\n    color.b += sin(uTime * 0.6) * 0.02;\n    color = pow(color, vec3(0.92));\n\n    gl_FragColor = vec4(color, 1.0);\n  }\n";
const CHAT_TIERS = Object.freeze(['Instant', 'Medium', 'High', 'Extra High', 'Pro']);
const FAMILIES = Object.freeze([{id:'gpt6',label:'GPT-6'},{id:'gpt56',label:'GPT-5.6 Sol'}]);
const RIGHT_CHEVRON = "<svg class=\"power-chevron\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M4.217 8.717a.4.4 0 0 0 .566.566L7.606 6.46a.65.65 0 0 0 0-.92L4.783 2.717a.4.4 0 0 0-.566.566L6.934 6z\"/></svg>";
const DOWN_CHEVRON = "<svg class=\"power-chevron\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M8.717 4.717a.4.4 0 0 1 .566.566L6.46 8.106a.65.65 0 0 1-.92 0L2.717 5.283a.4.4 0 0 1 .566-.566L6 7.434z\"/></svg>";
const CHECK = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M11.562 4.034a.525.525 0 1 1 .869.59l-4.892 7.194a.676.676 0 0 1-1.036.098L3.628 9.035a.526.526 0 0 1 .744-.742l2.553 2.558z\"/></svg>";

const clamp=(value,minimum,maximum)=>Math.min(maximum,Math.max(minimum,value));
// Exact official thumb-position correction: er(percent) = 13 - percent / 50 * 13.
const correction=percent=>13-percent/50*13;
const thumbPosition=percent=>`calc(${percent}% + ${correction(percent)}px)`;
const rangeTransform=percent=>`translateX(calc(${percent-100}% + ${correction(percent)}px))`;

// Exact dU23 / V8uZ spring constants and zP3a view transitions. Both adapters
// share this DOM implementation rather than replacing the original motions.
export function createPickerMotion(menu,isReduced,position){
  let progress=null,velocity=0,target=0,progressFrame=0,progressTime=0,scale=1,scaleVelocity=0,scaleTarget=1,scaleFrame=0,scaleTime=0,view=null,stage=null,oldPanel=null,cleanupTimer=0,viewFrame=0;
  const effects=new Map();
  const physics=(x,v,to,dt,k,d)=>{const a=d/2,w=Math.sqrt(k-a*a),y=x-to,e=Math.exp(-a*dt),c=Math.cos(w*dt),s=Math.sin(w*dt),b=(v+a*y)/w;return[to+e*(y*c+b*s),e*((-a*y+b*w)*c+(-a*b-y*w)*s)];};
  const paint=p=>{const n=Math.max(0,Math.min(100,p*100)),thumb=menu.querySelector('[data-power-thumb],[data-work-thumb]'),range=menu.querySelector('[data-power-range],[data-work-range]'),max=menu.querySelector('[data-power-max-effects],.MaxEffects-UlPrfl');if(thumb)thumb.style.left=thumbPosition(n);if(range)range.style.transform=rangeTransform(n);if(max)max.style.transform=`translateX(calc(${(n-100)*-.9}% + ${correction(n)*-.9}px))`;};
  function progressTick(now){const dt=Math.min(.064,(now-progressTime)/1000||1/60);progressTime=now;[progress,velocity]=physics(progress,velocity,target,dt,300,27);paint(progress);if(Math.abs(progress-target)<.0001&&Math.abs(velocity)<.001){progress=target;velocity=0;paint(progress);progressFrame=0;}else progressFrame=requestAnimationFrame(progressTick);}
  function setProgress(percent,dragging=false){target=percent/100;if(progress===null||dragging||isReduced()){cancelAnimationFrame(progressFrame);progressFrame=0;progress=target;velocity=0;paint(progress);return;}paint(progress);if(!progressFrame){progressTime=performance.now();progressFrame=requestAnimationFrame(progressTick);}}
  function scaleTick(now){const dt=Math.min(.064,(now-scaleTime)/1000||1/60);scaleTime=now;const active=scaleTarget>1;[scale,scaleVelocity]=physics(scale,scaleVelocity,scaleTarget,dt,active?420:220,active?38:26);const thumb=menu.querySelector('.ThumbSpring-tDZ1ke');if(thumb)thumb.style.transform=`scale(${scale})`;if(Math.abs(scale-scaleTarget)<.0001&&Math.abs(scaleVelocity)<.001){scale=scaleTarget;scaleVelocity=0;scaleFrame=0;if(thumb)thumb.style.transform=`scale(${scale})`;}else scaleFrame=requestAnimationFrame(scaleTick);}
  function thumb(active){scaleTarget=active&&!isReduced()?32/28:1;if(isReduced()){cancelAnimationFrame(scaleFrame);scaleFrame=0;scale=1;menu.querySelector('.ThumbSpring-tDZ1ke')?.style.setProperty('transform','scale(1)');}else if(!scaleFrame){scaleTime=performance.now();scaleFrame=requestAnimationFrame(scaleTick);}}
  function maximum(layer,active){
    if(!layer)return;let value=effects.get(layer);if(value?.active===active)return;const from=!value||layer.hidden?0:Number(getComputedStyle(layer).opacity)||0;value?.animation?.cancel();layer.hidden=false;layer.style.opacity=String(active?1:0);
    const animation=from!==(active?1:0)&&!isReduced()&&typeof layer.animate==='function'?layer.animate([{opacity:from},{opacity:active?1:0}],{duration:300,easing:'cubic-bezier(.23,1,.32,1)'}):null;
    value={active,animation};effects.set(layer,value);if(!active){if(animation)animation.finished.then(()=>{if(effects.get(layer)===value)layer.hidden=true;}).catch(()=>{});else layer.hidden=true;}
  }
  function settleView(){cancelAnimationFrame(viewFrame);clearTimeout(cleanupTimer);if(stage){const current=stage.firstElementChild,tails=[...menu.childNodes].filter(n=>n!==stage);if(current)menu.replaceChildren(current,...tails);stage=null;oldPanel=null;}for(const[layer,value]of effects)if(!layer.isConnected){value.animation?.cancel();effects.delete(layer);}}
  function targets(panel,kind,active){const header=panel.querySelector('.ViewControls-Qvy4rg'),slider=panel.querySelector('.SliderMotion-wqghZU')||panel.querySelector('.SimpleView-ZBgvlc'),models=panel.matches('.ModelList-I4a0SH')?panel:panel.querySelector('.ModelList-I4a0SH');panel.matches('.Menu-FcZccz')&&(panel.dataset.transitionsReady='true');if(kind==='power'){if(header){header.classList.add('SliderTopRowMotion-Mid9sy');header.dataset.active=String(active);}if(slider){slider.classList.add('SliderMotion-wqghZU');slider.dataset.active=String(active);}}else if(models){models.classList.add('ModelListMotion-iyH7rX');models.dataset.active=String(active);}}
  function switchView(next,build){
    settleView();const previous=menu.firstElementChild,prior=view,height=menu.getBoundingClientRect().height;view=next;build();const current=menu.firstElementChild;
    if(!previous||!current||prior===null||prior===next||isReduced()||menu.hidden){if(current)targets(current,next,true);return;}
    const newHeight=menu.getBoundingClientRect().height;stage=document.createElement('div');stage.className='picker-motion-stage';stage.style.height=height+'px';
    oldPanel=document.createElement('div');oldPanel.className='picker-motion-outgoing';oldPanel.inert=true;oldPanel.setAttribute('aria-hidden','true');oldPanel.append(previous);const tails=[...menu.childNodes].filter(n=>n!==current);
    for(const element of[previous,...previous.querySelectorAll('*')]){element.removeAttribute('id');for(const attr of[...element.attributes])if(/^data-(?:power-|work-|reasoning-slider)/.test(attr.name))element.removeAttribute(attr.name);if(element.tagName==='BUTTON')element.disabled=true;}
    targets(previous,prior,true);targets(current,next,false);stage.append(current,oldPanel);menu.replaceChildren(stage,...tails);stage.getBoundingClientRect();
    viewFrame=requestAnimationFrame(()=>{if(!stage)return;targets(previous,prior,false);targets(current,next,true);stage.style.height=newHeight+'px';position();});
    cleanupTimer=setTimeout(()=>{settleView();position();},400);
  }
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(position);observer?.observe(menu);
  return{progress:setProgress,thumb,maximum,switchView,resetView(){settleView();view=null;progress=null;velocity=0;scale=1;scaleVelocity=0;scaleTarget=1;cancelAnimationFrame(progressFrame);cancelAnimationFrame(scaleFrame);progressFrame=0;scaleFrame=0;},destroy(){cancelAnimationFrame(progressFrame);cancelAnimationFrame(scaleFrame);settleView();observer?.disconnect();for(const value of effects.values())value.animation?.cancel();effects.clear();}};
}

function startMaxFill(canvas,reducedMotion){
  if(!canvas||typeof WebGLRenderingContext==='undefined'||typeof ResizeObserver==='undefined')return()=>{};
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'high-performance',stencil:false});
  if(!gl)return()=>{};
  const shader=(kind,source)=>{const value=gl.createShader(kind);if(!value)return null;gl.shaderSource(value,source);gl.compileShader(value);if(gl.getShaderParameter(value,gl.COMPILE_STATUS))return value;gl.deleteShader(value);return null;};
  const vertex=shader(gl.VERTEX_SHADER,VERTEX_SOURCE),fragment=shader(gl.FRAGMENT_SHADER,FRAGMENT_SOURCE);
  if(!vertex||!fragment){if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);return()=>{};}
  const program=gl.createProgram();
  if(!program){gl.deleteShader(vertex);gl.deleteShader(fragment);return()=>{};}
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);return()=>{};}
  const buffer=gl.createBuffer();
  if(!buffer){gl.deleteProgram(program);return()=>{};}
  const position=gl.getAttribLocation(program,'aPosition'),resolution=gl.getUniformLocation(program,'uResolution'),time=gl.getUniformLocation(program,'uTime');
  const started=performance.now();let frame=0;
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const draw=t=>{gl.uniform1f(time,t);gl.drawArrays(gl.TRIANGLES,0,6);};
  const resize=()=>{const scale=Math.min(window.devicePixelRatio||1,2),bounds=canvas.getBoundingClientRect(),width=Math.max(Math.round(bounds.width),1),height=Math.max(Math.round(bounds.height),1);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(resolution,width,height);draw(reducedMotion?0:(performance.now()-started)/1000);};
  const animate=t=>{frame=0;draw((t-started)/1000);frame=requestAnimationFrame(animate);};
  const observer=new ResizeObserver(resize);resize();observer.observe(canvas);if(!reducedMotion)frame=requestAnimationFrame(animate);
  return()=>{if(frame)cancelAnimationFrame(frame);observer.disconnect();gl.deleteBuffer(buffer);gl.deleteProgram(program);};
}

// Original seeded initialization and motion bounds for the fourteen maximum-track particles.
const seeded=(index,step)=>{const value=43758.5453*Math.sin((index+1)*12.9898+78.233*step);return value-Math.floor(value);};
function startParticles(layer,reducedMotion){
  const timers=new Set();let stopped=false;
  const state=random=>{const x=random(),y=random();return{durationScale:.8+1.2*random(),horizontalOffset:Math.round((x-.5)*8),y:Math.round(12+(y-.5)*14)};};
  for(let index=0;index<14;index++){
    const particle=document.createElement('span');particle.className='TrackParticle-S3uVaU';
    let step=1;const initial=state(()=>seeded(index,step++));
    particle.style.left=`${Math.round(4+92*seeded(index,14))}%`;
    particle.style.opacity=String(.4+.6*seeded(index,11));
    particle.style.transform=`translate(-50%, -50%) scale(${.5+.45*seeded(index,12)})`;
    const apply=value=>{particle.style.translate=`${value.horizontalOffset}px ${value.y}px`;particle.style.transitionDuration=`${1.6*value.durationScale}s`;};
    apply(initial);layer.append(particle);
    if(!reducedMotion){const update=()=>{if(stopped)return;const next=state(Math.random);apply(next);const timer=setTimeout(()=>{timers.delete(timer);update();},1.6*next.durationScale*1000);timers.add(timer);};const timer=setTimeout(()=>{timers.delete(timer);update();},0);timers.add(timer);}
  }
  return()=>{stopped=true;timers.forEach(clearTimeout);layer.replaceChildren();};
}

/**
 * @param {{button:HTMLElement,menu:HTMLElement,getValue:()=>({family:'gpt6'|'gpt56',tier:number,mode:'chat'|'work'|'codex'}),onChange:(value:object)=>void}} options
 * @returns {{open:Function,close:Function,refresh:Function,destroy:Function,setModeTiers:Function}}
 */
export function mountPowerPicker({button,menu,getValue,onChange}){
  if(!button||!menu||typeof getValue!=='function')throw new TypeError('Power picker requires a button, a menu, and getValue().');
  const modeTiers=new Map([['chat',[...CHAT_TIERS]]]);
  const media=matchMedia('(prefers-reduced-motion: reduce)');const reduced=()=>document.documentElement.hasAttribute('data-reduced-motion')?document.documentElement.dataset.reducedMotion==='true':media.matches;
  const id=menu.id||`power-picker-${crypto.randomUUID()}`;menu.id=id;
  const originalButton={html:button.innerHTML,ariaLabel:button.getAttribute('aria-label'),haspopup:button.getAttribute('aria-haspopup'),controls:button.getAttribute('aria-controls')};
  let open=false,view='power',value=null,tierLabels=CHAT_TIERS,dragging=false,dragPointer=null,effectsCleanup=()=>{},mounted=true,lastTier=null,externalCloseObserver;
  const removers=[];
  const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));};
  const read=()=>{const state=getValue()||{};const mode=['chat','work','codex'].includes(state.mode)?state.mode:'chat';const labels=modeTiers.get(mode);return{family:FAMILIES.some(f=>f.id===state.family)?state.family:'gpt6',tier:clamp(Math.round(Number(state.tier)||0),0,(labels?.length||CHAT_TIERS.length)-1),mode};};
  const announce=()=>{const status=menu.querySelector('[data-power-announcement]');if(status)status.textContent=`${tierLabels[value.tier]}，第 ${value.tier+1} 项，共 ${tierLabels.length} 项。`;};
  const renderButton=()=>{const labels=modeTiers.get(value.mode);const label=open?'思考强度':labels?.[value.tier]||'思考强度';button.innerHTML=`<span class="power-trigger-label"></span>${DOWN_CHEVRON}`;button.querySelector('.power-trigger-label').textContent=label;button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded',String(open));button.dataset.powerPickerTrigger='';button.dataset.powerMaximum=String(!!labels&&labels[value.tier]==='Pro');button.setAttribute('aria-disabled',String(!labels));};
  const position=()=>{
    if(!open)return;
    const bounds=button.getBoundingClientRect(),viewportWidth=document.documentElement.clientWidth,viewportHeight=document.documentElement.clientHeight;
    const height=menu.getBoundingClientRect().height,width=menu.getBoundingClientRect().width;
    const gap=parseFloat(getComputedStyle(menu).getPropertyValue('--power-picker-side-offset'))||8;
    const above=bounds.top-height-gap>=8;
    menu.style.left=`${clamp(bounds.right-width,8,Math.max(8,viewportWidth-width-8))}px`;menu.style.transformOrigin=`right ${above?'bottom':'top'}`;
    menu.style.top=`${above?bounds.top-height-gap:Math.min(bounds.bottom+gap,Math.max(8,viewportHeight-height-8))}px`;
    menu.dataset.side=above?'top':'bottom';
  };
  const motion=createPickerMotion(menu,reduced,position);menu.dataset.pickerMotionOwned='';
  const stopEffects=()=>{effectsCleanup();effectsCleanup=()=>{};lastTier=null;};
  const applyTier=()=>{
    const slider=menu.querySelector('[data-power-slider]');if(!slider)return;
    const percent=tierLabels.length<=1?0:value.tier/(tierLabels.length-1)*100,isMaximum=tierLabels[value.tier]==='Pro';
    const label=menu.querySelector('[data-power-tier-label]');label.textContent=tierLabels[value.tier];label.dataset.maximum=String(isMaximum);
    slider.dataset.value=String(value.tier);slider.dataset.valueText=`${tierLabels[value.tier]}，第 ${value.tier+1} 项，共 ${tierLabels.length} 项。`;
    slider.dataset.highlighted=String(isMaximum);slider.dataset.dragging=String(dragging);slider.dataset.pointerDown=String(dragging);
    motion.progress(percent,dragging);motion.thumb(dragging);
    menu.querySelectorAll('[data-power-tick]').forEach((tick,index)=>tick.dataset.selected=String(index<=value.tier));
    const maxLayer=menu.querySelector('[data-power-max-effects]');motion.maximum(maxLayer,isMaximum);
    if(lastTier!==isMaximum){effectsCleanup();effectsCleanup=()=>{};lastTier=isMaximum;
      if(isMaximum){const cancelFill=startMaxFill(menu.querySelector('canvas'),reduced()),cancelParticles=startParticles(menu.querySelector('[data-power-particles]'),reduced());effectsCleanup=()=>{cancelFill();cancelParticles();};}
    }
    announce();renderButton();
  };
  const chooseTier=index=>{
    const next=clamp(index,0,tierLabels.length-1);if(next===value.tier){announce();return;}
    value={...read(),tier:next};onChange?.({...value});applyTier();
  };
  const pointerTier=event=>{const bounds=menu.querySelector('[data-power-slider]').getBoundingClientRect();const ratio=clamp((event.clientX-bounds.left-13)/Math.max(1,bounds.width-26),0,1);return Math.round(ratio*(tierLabels.length-1));};
  const buildPowerContents=()=>{
    stopEffects();view='power';menu.dataset.powerView='power';
    const tickMarkup=tierLabels.map((_,index)=>`<span class="Tick-pg_l_t" data-power-tick style="left:${thumbPosition(tierLabels.length<=1?0:index/(tierLabels.length-1)*100)}"></span>`).join('');
    menu.innerHTML=`<div class="Menu-FcZccz" data-reduced-motion="${reduced()}"><div class="ViewPanel-7FY74b"><div class="SimpleView-ZBgvlc"><div class="ViewControls-Qvy4rg"><button class="ViewToggle-pjFOrG" type="button" role="menuitem" aria-label="选择模型" data-power-families><span class="ViewToggleContent-W0th2p"><span class="ViewToggleEffortLabel-mpNoee" data-effort-only="true" data-power-tier-label></span><span class="ViewToggleIcon-QBviAo">${RIGHT_CHEVRON}</span></span></button></div></div><div class="SliderMotion-wqghZU"><div class="Container-qxn8NG" data-model-picker-power-slider=""><div class="Root-MhaajB" data-power-slider data-fast-mode="false" data-pointer-down="false" data-reduced-motion="${reduced()}" role="menuitem" aria-label="强度" aria-describedby="${id}-announcement ${id}-instructions" tabindex="0"><div class="Track-eoFI82"><span class="Range-CJS9gM" data-power-range><span class="MaxEffects-UlPrfl" data-power-max-effects><span class="Fill-nKJTzJ"><span class="Mask-tydFov"><canvas class="Canvas-bwIFs3" aria-hidden="true"></canvas></span></span><span class="TrackParticles-_dFYGl" data-power-particles aria-hidden="true"></span></span></span><div class="TickRail-KLjYfZ" aria-hidden="true">${tickMarkup}</div></div><div class="VisualThumbRail-hji66C" aria-hidden="true"><span class="ThumbScale-Hvw8Fr" data-power-thumb><span class="ThumbSpring-tDZ1ke"><span class="Thumb-hwJ5wX"></span></span></span></div></div></div></div></div></div><span class="power-sr-only" id="${id}-instructions">使用左右方向键调整强度</span><span class="power-sr-only" id="${id}-announcement" data-power-announcement role="status" aria-live="polite" aria-atomic="true"></span>`;
    const slider=menu.querySelector('[data-power-slider]');
    slider.addEventListener('keydown',event=>{const keys={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-1,PageUp:1};if(event.key in keys){event.preventDefault();event.stopPropagation();chooseTier(value.tier+keys[event.key]);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();event.stopPropagation();chooseTier(event.key==='Home'?0:tierLabels.length-1);}});
    slider.addEventListener('focus',()=>slider.parentElement.dataset.keyboardFocused='true');
    slider.addEventListener('blur',()=>slider.parentElement.dataset.keyboardFocused='false');
    slider.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();event.stopPropagation();dragging=true;dragPointer=event.pointerId;slider.setPointerCapture?.(event.pointerId);slider.focus({preventScroll:true});chooseTier(pointerTier(event));applyTier();});
    slider.addEventListener('pointermove',event=>{if(dragging&&event.pointerId===dragPointer){chooseTier(pointerTier(event));motion.progress(clamp((event.clientX-slider.getBoundingClientRect().left-13)/Math.max(1,slider.getBoundingClientRect().width-26),0,1)*100,true);}else{const thumb=menu.querySelector('[data-power-thumb]')?.getBoundingClientRect();if(thumb)motion.thumb(event.clientX>=thumb.left&&event.clientX<=thumb.right&&event.clientY>=thumb.top&&event.clientY<=thumb.bottom);}});slider.addEventListener('pointerleave',()=>{if(!dragging)motion.thumb(false);});
    const release=event=>{if(!dragging||event.pointerId!==dragPointer)return;dragging=false;dragPointer=null;if(slider.hasPointerCapture?.(event.pointerId))slider.releasePointerCapture(event.pointerId);applyTier();};
    slider.addEventListener('pointerup',release);slider.addEventListener('pointercancel',release);slider.addEventListener('lostpointercapture',()=>{if(dragging){dragging=false;dragPointer=null;applyTier();}});
    menu.querySelector('[data-power-families]').addEventListener('click',event=>{event.stopPropagation();buildFamilies();position();menu.querySelector('[aria-checked="true"]')?.focus();});
    applyTier();
  };
  const buildFamiliesContents=()=>{
    stopEffects();view='families';menu.dataset.powerView='families';
    menu.innerHTML=`<div class="ModelList-I4a0SH" role="group" aria-label="选择模型">${FAMILIES.map(family=>`<button class="power-family-row" type="button" role="menuitemradio" aria-checked="${family.id===value.family}" data-power-family="${family.id}"><span>${family.label}</span><span class="power-family-check">${family.id===value.family?CHECK:''}</span></button>`).join('')}</div>`;
    menu.querySelectorAll('[data-power-family]').forEach((row,index)=>{
      row.addEventListener('click',event=>{event.stopPropagation();value={...read(),family:row.dataset.powerFamily};onChange?.({...value});buildPower();position();menu.querySelector('[data-power-families]')?.focus();});
      row.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const rows=[...menu.querySelectorAll('[data-power-family]')];const target=event.key==='Home'?0:event.key==='End'?rows.length-1:(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[target].focus();}else if(event.key==='ArrowLeft'){event.preventDefault();buildPower();position();menu.querySelector('[data-power-families]')?.focus();}});
    });
  };
  const buildPower=()=>motion.switchView('power',buildPowerContents);
  const buildFamilies=()=>motion.switchView('models',buildFamiliesContents);
  const close=(restoreFocus=false)=>{if(!mounted)return;open=false;dragging=false;dragPointer=null;stopEffects();motion.resetView();menu.dataset.state='closed';menu.hidden=true;renderButton();if(restoreFocus)button.focus({preventScroll:true});};
  const show=()=>{
    value=read();const labels=modeTiers.get(value.mode);if(!labels)return;
    tierLabels=labels;motion.resetView();open=true;view='power';menu.hidden=false;menu.dataset.state='open';renderButton();buildPower();position();
  };
  const refresh=()=>{value=read();const labels=modeTiers.get(value.mode);if(!labels){close();renderButton();return;}tierLabels=labels;if(open){view==='power'?buildPower():buildFamilies();position();}renderButton();};
  menu.classList.add('power-picker','ModelPickerDropdownContent-BBm8p1');menu.setAttribute('role','menu');menu.setAttribute('aria-label','思考强度');menu.hidden=true;
  listen(button,'click',event=>{event.preventDefault();event.stopPropagation();open?close():show();});
  listen(button,'keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();event.stopPropagation();if(!open)show();menu.querySelector('[data-power-slider]')?.focus({preventScroll:true});}});
  listen(menu,'click',event=>event.stopPropagation());
  listen(document,'pointerdown',event=>{if(open&&!menu.contains(event.target)&&!button.contains(event.target))close();},true);
  listen(document,'keydown',event=>{if(!open)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}else if(event.key==='Tab')close();},true);
  listen(window,'resize',position);listen(window,'scroll',position,true);
  listen(media,'change',()=>{if(open&&view==='power'){buildPower();position();}});
  externalCloseObserver=new MutationObserver(()=>{if(menu.hidden&&open){open=false;stopEffects();renderButton();}});externalCloseObserver.observe(menu,{attributes:true,attributeFilter:['hidden']});
  value=read();renderButton();
  return{
    open:show,close,refresh,
    setModeTiers(mode,labels){if(!Array.isArray(labels)||labels.length<1||labels.some(label=>typeof label!=='string'||!label.trim()))throw new TypeError('Observed mode tiers must be a nonempty string array.');modeTiers.set(mode,[...labels]);refresh();},
    destroy(){close();motion.destroy();mounted=false;removers.forEach(remove=>remove());externalCloseObserver.disconnect();menu.replaceChildren();menu.classList.remove('power-picker','ModelPickerDropdownContent-BBm8p1');button.innerHTML=originalButton.html;for(const [attribute,value]of [['aria-label',originalButton.ariaLabel],['aria-haspopup',originalButton.haspopup],['aria-controls',originalButton.controls]])value==null?button.removeAttribute(attribute):button.setAttribute(attribute,value);button.removeAttribute('aria-expanded');button.removeAttribute('aria-disabled');delete button.dataset.powerPickerTrigger;delete button.dataset.powerMaximum;}
  };
}
