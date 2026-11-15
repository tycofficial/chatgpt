import {createPickerMotion} from './power-picker.js';
import {WORK_MODEL_IDS,WORK_PRESETS,WORK_MODEL_LABELS,WORK_EFFORT_LABELS,WORK_DEFAULT_OPTION,WORK_CATALOG_PROVENANCE,getWorkSelectionCatalog,normalizeWorkSelection,selectWorkModel,selectWorkDefault,selectWorkTier} from './model-catalog.js';
/**
 * Work / Codex model power picker adapter.
 * Visual declarations and the shader are derived from the public official assets:
 * https://chatgpt.com/cdn/assets/c7fcb2505631.css
 * https://chatgpt.com/cdn/assets/956483.6cfec0717e.js
 * https://chatgpt.com/cdn/assets/async/769183.7f2e2aa06b.js
 * https://chatgpt.com/cdn/assets/async/a41aecd7341d.css
 * https://chatgpt.com/cdn/assets/async/88509.a8325d5173.js
 * https://chatgpt.com/cdn/assets/async/d418c7edd9ad.css
 * Model and reasoning catalogs are supplied by the host after capture/provider validation.
 */
const VERTEX_SOURCE = "\n  attribute vec2 aPosition;\n  varying vec2 vUv;\n\n  void main() {\n    vUv = aPosition * 0.5 + 0.5;\n    gl_Position = vec4(aPosition, 0.0, 1.0);\n  }\n";
const FRAGMENT_SOURCE = "\n  precision highp float;\n\n  varying vec2 vUv;\n\n  uniform float uTime;\n  uniform vec2 uResolution;\n\n  const vec3 COLOR_1 = vec3(0.592, 0.388, 0.945);\n  const vec3 COLOR_2 = vec3(0.831, 0.710, 0.953);\n  const vec3 COLOR_3 = vec3(0.286, 0.000, 0.404);\n  const vec3 COLOR_4 = vec3(0.145, 0.055, 0.478);\n  const vec3 COLOR_5 = vec3(0.592, 0.000, 0.996);\n  const vec3 COLOR_6 = vec3(0.780, 0.459, 0.914);\n  const vec3 COLOR_7 = vec3(0.725, 0.576, 1.000);\n  const vec3 COLOR_8 = vec3(0.400, 0.212, 0.820);\n  const vec3 COLOR_9 = vec3(0.882, 0.690, 1.000);\n  const vec3 COLOR_10 = vec3(0.498, 0.345, 0.957);\n  const vec3 COLOR_11 = vec3(0.659, 0.275, 0.910);\n  const vec3 COLOR_12 = vec3(0.212, 0.063, 0.400);\n\n  float grain(vec2 uv) {\n    vec2 grainUv = uv * uResolution * 0.5;\n    return fract(sin(dot(grainUv + uTime, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;\n  }\n\n  float fieldWeight(vec2 point, vec2 center) {\n    return exp(-dot(point - center, point - center) * 12.0);\n  }\n\n  vec3 fieldColor(vec2 rawUv) {\n    const float speed = 1.25;\n    vec2 uv = vec2(rawUv.x, 0.40 + rawUv.y * 0.18);\n    vec2 spatialScale = vec2(1.55, 1.0);\n    vec2 point = uv * spatialScale;\n    vec2 center1 = vec2(0.18 + sin(uTime * speed * 0.42) * 0.18, 0.36 + cos(uTime * speed * 0.50) * 0.42) * spatialScale;\n    vec2 center2 = vec2(0.34 + cos(uTime * speed * 0.62) * 0.24, 0.62 + sin(uTime * speed * 0.47) * 0.38) * spatialScale;\n    vec2 center3 = vec2(0.52 + sin(uTime * speed * 0.38) * 0.28, 0.30 + cos(uTime * speed * 0.58) * 0.36) * spatialScale;\n    vec2 center4 = vec2(0.70 + cos(uTime * speed * 0.54) * 0.24, 0.68 + sin(uTime * speed * 0.41) * 0.36) * spatialScale;\n    vec2 center5 = vec2(0.88 + sin(uTime * speed * 0.74) * 0.16, 0.36 + cos(uTime * speed * 0.64) * 0.40) * spatialScale;\n    vec2 center6 = vec2(0.12 + cos(uTime * speed * 0.48) * 0.20, 0.72 + sin(uTime * speed * 0.70) * 0.30) * spatialScale;\n    vec2 center7 = vec2(0.30 + sin(uTime * speed * 0.58) * 0.22, 0.44 + cos(uTime * speed * 0.52) * 0.42) * spatialScale;\n    vec2 center8 = vec2(0.46 + cos(uTime * speed * 0.68) * 0.26, 0.72 + sin(uTime * speed * 0.56) * 0.32) * spatialScale;\n    vec2 center9 = vec2(0.60 + sin(uTime * speed * 0.44) * 0.28, 0.26 + cos(uTime * speed * 0.60) * 0.38) * spatialScale;\n    vec2 center10 = vec2(0.76 + cos(uTime * speed * 0.50) * 0.22, 0.54 + sin(uTime * speed * 0.66) * 0.40) * spatialScale;\n    vec2 center11 = vec2(0.92 + sin(uTime * speed * 0.70) * 0.15, 0.66 + cos(uTime * speed * 0.46) * 0.30) * spatialScale;\n    vec2 center12 = vec2(0.06 + cos(uTime * speed * 0.40) * 0.14, 0.32 + sin(uTime * speed * 0.60) * 0.40) * spatialScale;\n    float weight1 = fieldWeight(point, center1) * (0.7 + 0.3 * sin(uTime * 0.91));\n    float weight2 = fieldWeight(point, center2) * (0.7 + 0.3 * cos(uTime * 1.07));\n    float weight3 = fieldWeight(point, center3) * (0.7 + 0.3 * sin(uTime * 0.76));\n    float weight4 = fieldWeight(point, center4) * (0.7 + 0.3 * cos(uTime * 1.18));\n    float weight5 = fieldWeight(point, center5) * (0.7 + 0.3 * sin(uTime * 1.03));\n    float weight6 = fieldWeight(point, center6) * (0.7 + 0.3 * cos(uTime * 0.83));\n    float weight7 = fieldWeight(point, center7) * (0.7 + 0.3 * sin(uTime * 1.24));\n    float weight8 = fieldWeight(point, center8) * (0.7 + 0.3 * cos(uTime * 0.96));\n    float weight9 = fieldWeight(point, center9) * (0.7 + 0.3 * sin(uTime * 1.11));\n    float weight10 = fieldWeight(point, center10) * (0.7 + 0.3 * cos(uTime * 0.72));\n    float weight11 = fieldWeight(point, center11) * (0.7 + 0.3 * sin(uTime * 1.29));\n    float weight12 = fieldWeight(point, center12) * (0.7 + 0.3 * cos(uTime * 0.88));\n    float totalWeight = max(\n      weight1 + weight2 + weight3 + weight4 + weight5 + weight6 +\n        weight7 + weight8 + weight9 + weight10 + weight11 + weight12,\n      0.0001\n    );\n    vec3 color = (\n      COLOR_1 * weight1 + COLOR_2 * weight2 + COLOR_3 * weight3 +\n      COLOR_4 * weight4 + COLOR_5 * weight5 + COLOR_6 * weight6 +\n      COLOR_7 * weight7 + COLOR_8 * weight8 + COLOR_9 * weight9 +\n      COLOR_10 * weight10 + COLOR_11 * weight11 + COLOR_12 * weight12\n    ) / totalWeight;\n    color = mix(COLOR_4, color, 0.96);\n\n    return pow(clamp(color, vec3(0.0), vec3(1.0)), vec3(0.9));\n  }\n\n  void main() {\n    vec3 color = fieldColor(vUv);\n    color += grain(vUv) * 0.012;\n    color.r += sin(uTime * 0.5) * 0.02;\n    color.g += cos(uTime * 0.7) * 0.02;\n    color.b += sin(uTime * 0.6) * 0.02;\n    color = pow(color, vec3(0.92));\n\n    gl_FragColor = vec4(color, 1.0);\n  }\n";
const RIGHT_CHEVRON = "<svg class=\"power-chevron\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M4.217 8.717a.4.4 0 0 0 .566.566L7.606 6.46a.65.65 0 0 0 0-.92L4.783 2.717a.4.4 0 0 0-.566.566L6.934 6z\"/></svg>";
const DOWN_CHEVRON = "<svg class=\"power-chevron\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" aria-hidden=\"true\"><path d=\"M8.717 4.717a.4.4 0 0 1 .566.566L6.46 8.106a.65.65 0 0 1-.92 0L2.717 5.283a.4.4 0 0 1 .566-.566L6 7.434z\"/></svg>";
const CHECK = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M11.562 4.034a.525.525 0 1 1 .869.59l-4.892 7.194a.676.676 0 0 1-1.036.098L3.628 9.035a.526.526 0 0 1 .744-.742l2.553 2.558z\"/></svg>";

const clamp=(value,minimum,maximum)=>Math.min(maximum,Math.max(minimum,value));
// Exact official thumb-position correction: er(percent) = 13 - percent / 50 * 13.
const correction=percent=>13-percent/50*13;
const thumbPosition=percent=>`calc(${percent}% + ${correction(percent)}px)`;
const rangeTransform=percent=>`translateX(calc(${percent-100}% + ${correction(percent)}px))`;

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

const EFFORT_LABELS=WORK_EFFORT_LABELS;
const MODEL_LABELS=WORK_MODEL_LABELS;
// Each position was separately observed in the signed-in Work UI on 2026-11-15.
// Unlike Chat's family selector, this slider changes the model and its effort.
export const OBSERVED_WORK_PRESETS=WORK_PRESETS;
const FAST_ICON = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><use href="./ui/assets/icons.svg#codex-icon-bolt-light-20" fill="currentColor" /></svg>';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelName=id=>MODEL_LABELS[id]||String(id||'').replace(/-wm$/,'').replace(/^gpt-/,'GPT-');
const canonicalModel=value=>String(value||'').replace(/-wm$/,'');
export const OBSERVED_WORK_MODELS=WORK_MODEL_IDS;
const cleanModels=values=>{const supplied=(Array.isArray(values)?values:[]).map(v=>canonicalModel(typeof v==='string'?v:v.id));const valid=OBSERVED_WORK_MODELS.filter(id=>supplied.includes(id));return valid.length?valid:[...OBSERVED_WORK_MODELS];};

/**
 * Uses the separate first-party Work picker structure; the caller supplies the
 * active model's observed/supported catalog. Changing a tier never invents a
 * private model route. onChange returns the actual model/effort/speed settings.
 */
export function mountWorkPicker({button,menu,getValue,onChange,efforts=WORK_PRESETS,models=WORK_MODEL_IDS,enabledEfforts,modelEfforts}) {
  if(!button||!menu||typeof getValue!=='function')throw new TypeError('Work picker requires button, menu, and getValue.');
  let autoPresets=efforts,modelCatalog=cleanModels(models),allowedEfforts=enabledEfforts,capabilityMap=modelEfforts,catalog=[],opened=false,view='power',dragging=false,destroyed=false,stopEffects=()=>{},maxEffect=false,wheelDelta=0,wheelTime=0;
  let state={model:'gpt-6.1-sol',effort:'low',fast:false,selectionMode:'auto'};
  const catalogOptions=()=>({autoPresets,models:modelCatalog,enabledEfforts:allowedEfforts,modelEfforts:capabilityMap});
  const updateCatalog=()=>{catalog=getWorkSelectionCatalog(state,catalogOptions());};
  const id=menu.id||`work-picker-${crypto.randomUUID()}`;menu.id=id;
  const announcements=`${id}-announcement`,instructions=`${id}-instructions`;
  const media=matchMedia('(prefers-reduced-motion: reduce)');const reduced=()=>document.documentElement.hasAttribute('data-reduced-motion')?document.documentElement.dataset.reducedMotion==='true':media.matches;
  const removers=[];
  const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));};
  const read=()=>{const value=getValue()||{};state=normalizeWorkSelection({...state,...value},catalogOptions());updateCatalog();if(value.model!==state.model||value.effort!==state.effort||value.selectionMode!==state.selectionMode)onChange?.({...state,serviceTier:state.fast?'priority':null});};
  const motion=createPickerMotion(menu,reduced,position);menu.dataset.pickerMotionOwned='';
  const selected=()=>catalog.findIndex(item=>item.effort===state.effort&&(!item.model||item.model===state.model));
  const selectedLabel=()=>catalog[selected()]?.label||EFFORT_LABELS[state.effort]||String(state.effort||'');
  const resetEffects=()=>{stopEffects();stopEffects=()=>{};maxEffect=false;};
  function position(){
    if(!opened)return;
    const bounds=button.getBoundingClientRect(),width=menu.offsetWidth,height=menu.offsetHeight;
    menu.style.left=`${clamp(bounds.right-width,8,Math.max(8,innerWidth-width-8))}px`;
    const above=bounds.top-height-8>=8;menu.style.top=`${above?bounds.top-height-8:Math.min(bounds.bottom+8,Math.max(8,innerHeight-height-8))}px`;menu.dataset.side=above?'top':'bottom';menu.style.transformOrigin=`right ${above?'bottom':'top'}`;
  }
  function renderTrigger(){
    const model=escapeHTML(modelName(state.model)),effort=escapeHTML(selectedLabel());
    button.innerHTML=`<span class="ModelPickerTriggerContent-MFmRQj"><span class="ModelPickerTriggerLabel-xR9gDc"><span class="ModelPickerTriggerModelGroup-uBOG5R"><span class="ModelPickerTriggerModelLabel-rz_zsL" data-model-selection-label="${escapeHTML(state.model)}"><span class="ModelPickerTriggerModelText-W2hMlT">${model}</span></span></span><span class="ModelPickerTriggerEffortLabel-xGzgW7">${effort}</span></span></span>`;
    button.setAttribute('aria-label','选择 ChatGPT 模型');button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded',String(opened));button.dataset.state=opened?'open':'closed';button.dataset.selectedReasoningEffort=state.effort;button.dataset.workPickerTrigger='';button.dataset.selectionMode=state.selectionMode;
  }
  function emit(){
    const value={...state,serviceTier:state.fast?'priority':null,effortSource:state.selectionMode==='pinned'?WORK_CATALOG_PROVENANCE.pinned:WORK_CATALOG_PROVENANCE.auto};onChange?.(value);renderTrigger();
  }
  function syncPower(){
    const current=selected(),percent=catalog.length<2?0:Math.max(0,current)/(catalog.length-1)*100,isMaximum=!!catalog[current]?.isMaximum||state.effort==='ultra';
    const slider=menu.querySelector('[data-work-slider]');if(!slider)return;
    slider.setAttribute('aria-disabled',String(!catalog.length));slider.setAttribute('aria-valuemin','0');slider.setAttribute('aria-valuemax',String(Math.max(0,catalog.length-1)));slider.setAttribute('aria-valuenow',String(Math.max(0,current)));slider.setAttribute('aria-valuetext',selectedLabel());slider.dataset.highlighted=String(isMaximum);slider.dataset.fastMode=String(state.fast);slider.dataset.dragging=String(dragging);slider.dataset.pointerDown=String(dragging);
    const label=menu.querySelector('[data-work-effort]');label.textContent=selectedLabel();label.dataset.maximum=String(isMaximum);
    const modelLabel=menu.querySelector('.ViewToggleModelLabel-Ns2DVV');modelLabel.textContent=modelName(state.model);modelLabel.dataset.modelSelectionLabel=state.model;
    motion.progress(percent,dragging);motion.thumb(dragging);
    menu.querySelectorAll('[data-work-tick]').forEach((tick,index)=>tick.dataset.selected=String(index<=current));
    menu.querySelector(`#${announcements}`).textContent=`${selectedLabel()}，第 ${Math.max(0,current)+1} 项，共 ${catalog.length} 项。`;
    const fast=menu.querySelector('[data-work-fast]');fast.setAttribute('aria-checked',String(state.fast));fast.setAttribute('aria-label',state.fast?'启用标准模式':'启用快速模式');fast.dataset.fastModeEnabled=String(state.fast);
    if(isMaximum!==maxEffect){resetEffects();maxEffect=isMaximum;const effects=menu.querySelector('.MaxEffects-UlPrfl');motion.maximum(effects,isMaximum);if(isMaximum){const a=startMaxFill(effects.querySelector('canvas'),reduced()),b=startParticles(effects.querySelector('.TrackParticles-_dFYGl'),reduced());stopEffects=()=>{a();b();};}}
  }
  function choose(index){
    if(!catalog.length)return;const next=selectWorkTier(state,index,catalogOptions());if(next.effort===state.effort&&next.model===state.model)return;
    state=next;emit();syncPower();
  }
  function renderPowerContents(){
    resetEffects();
    menu.innerHTML=`<div class="Menu-FcZccz" data-transitions-ready="true"><div class="ViewPanel-7FY74b"><div class="ViewControls-Qvy4rg" data-explicit-model="${state.selectionMode==='pinned'}" data-inline-model="true" data-effort-header="true"><button type="button" role="menuitem" aria-label="选择模型" data-work-models class="ViewToggle-pjFOrG" data-interactive="true" data-model-picker-view-toggle><span class="ViewToggleContent-W0th2p"><span class="ViewToggleModelLabel-Ns2DVV">${escapeHTML(modelName(state.model))}</span><span class="ViewToggleEffortLabel-mpNoee" data-work-effort></span><span class="ViewToggleIcon-QBviAo">${RIGHT_CHEVRON}</span></span></button><div class="HeaderShortcuts-bZb9rG"><button type="button" class="FastModeToggle-qGLhyE" role="menuitemcheckbox" data-work-fast aria-label="启用快速模式" aria-checked="false"><span class="FastModeToggleContent-oM5Eti">${FAST_ICON}</span></button></div></div><div class="SimpleView-ZBgvlc"><span class="KeyboardAnnouncement-cfumvn" role="status" aria-live="polite" id="${announcements}"></span><span class="KeyboardAnnouncement-cfumvn" id="${instructions}">使用左右方向键调整强度</span><div class="SliderKeyboardControl-wao2b_" role="menuitem" tabindex="0" aria-label="强度" aria-keyshortcuts="ArrowLeft ArrowRight" aria-describedby="${announcements} ${instructions}" data-reasoning-slider><div class="Container-qxn8NG" data-model-picker-power-slider><div class="Root-MhaajB" data-work-slider dir="ltr" role="slider" tabindex="-1" aria-label="强度"><div class="Track-eoFI82"><span class="Range-CJS9gM" data-work-range><span class="MaxEffects-UlPrfl" hidden><span class="Fill-nKJTzJ"><span class="Mask-tydFov"><canvas class="Canvas-bwIFs3"></canvas></span></span><span class="TrackParticles-_dFYGl"></span></span></span><div class="TickRail-KLjYfZ">${catalog.map((item,index)=>`<span class="Tick-pg_l_t" data-work-tick="${index}" style="left:${thumbPosition(catalog.length<2?0:index/(catalog.length-1)*100)}" title="${escapeHTML(item.label)}"></span>`).join('')}</div></div><div class="VisualThumbRail-hji66C" aria-hidden="true"><span class="ThumbScale-Hvw8Fr" data-work-thumb><span class="ThumbSpring-tDZ1ke"><span class="Thumb-hwJ5wX"></span></span></span></div></div></div></div></div></div></div>`;
    menu.querySelector('[data-work-models]').onclick=()=>{view='models';render();};menu.querySelector('[data-work-fast]').onclick=()=>{state.fast=!state.fast;emit();syncPower();};syncPower();position();
  }
  function renderModelsContents(){
    resetEffects();
    const current=state.model,pinned=state.selectionMode==='pinned',list=[...modelCatalog],autoEnabled=getWorkSelectionCatalog({...state,selectionMode:'auto'},catalogOptions()).length>0;
    menu.innerHTML=`<div class="Menu-FcZccz"><div class="ModelList-I4a0SH" role="group" aria-label="模型"><button type="button" role="menuitemradio" aria-checked="${!pinned}" class="work-model-row" data-work-default ${autoEnabled?'':'disabled'}><span class="work-model-default-copy"><span>${WORK_DEFAULT_OPTION.label}</span><span class="DefaultDescription-MgbNE2">${WORK_DEFAULT_OPTION.description}</span></span><span class="work-model-check">${!pinned?CHECK:''}</span></button>${list.map(model=>{const checked=pinned&&model===current,available=getWorkSelectionCatalog({model,selectionMode:'pinned'},catalogOptions()).length>0;return`<button type="button" role="menuitemradio" aria-checked="${checked}" class="work-model-row" data-work-model="${escapeHTML(model)}" ${available?'':'disabled'}><span>${escapeHTML(modelName(model))}</span><span class="work-model-check">${checked?CHECK:''}</span></button>`;}).join('')}</div></div>`;
    menu.querySelector('[data-work-default]').onclick=()=>{state=selectWorkDefault(state,catalogOptions());updateCatalog();emit();view='power';render();menu.querySelector('[data-reasoning-slider]')?.focus();};
    menu.querySelectorAll('[data-work-model]').forEach(row=>row.onclick=()=>{state=selectWorkModel(state,row.dataset.workModel,catalogOptions());updateCatalog();emit();view='power';render();menu.querySelector('[data-reasoning-slider]')?.focus();});position();
  }

  function renderPower(){motion.switchView('power',renderPowerContents);}
  function renderModels(){motion.switchView('models',renderModelsContents);}
  function render(){if(view==='models')renderModels();else renderPower();renderTrigger();}
  function open(){if(destroyed||opened)return;read();motion.resetView();opened=true;view='power';menu.hidden=false;menu.dataset.state='open';menu.classList.add('work-picker');menu.setAttribute('role','menu');menu.setAttribute('aria-label','选择 ChatGPT 模型');render();menu.querySelector('[data-reasoning-slider]')?.focus();}
  function close({focus=false}={}){if(!opened)return;opened=false;dragging=false;motion.resetView();menu.dataset.state='closed';menu.hidden=true;resetEffects();renderTrigger();if(focus)button.focus();}
  function refresh(){read();if(opened)render();else renderTrigger();}
  listen(button,'click',event=>{event.preventDefault();event.stopPropagation();opened?close():open();});
  listen(document,'pointerdown',event=>{if(opened&&!menu.contains(event.target)&&!button.contains(event.target))close();});
  listen(menu,'keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(view==='models'){view='power';render();menu.querySelector('[data-reasoning-slider]')?.focus();}else close({focus:true});return;}
    if(event.key==='Tab'){close();return;}
    const isSlider=!!event.target.closest('[data-reasoning-slider]');
    if(isSlider&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const index=Math.max(0,selected());choose(event.key==='Home'?0:event.key==='End'?catalog.length-1:index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1));return;}
    if(isSlider&&event.key==='Enter'){event.preventDefault();close({focus:true});return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const items=[...menu.querySelectorAll('button:not(:disabled),[data-reasoning-slider]')],index=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowUp'?-1:1)+items.length)%items.length]?.focus();}
  });
  const chooseAt=event=>{const slider=menu.querySelector('[data-work-slider]');if(!slider||catalog.length<2)return;const bounds=slider.getBoundingClientRect(),inset=13,span=Math.max(1,bounds.width-2*inset);const ratio=clamp((event.clientX-bounds.left-inset)/span,0,1);choose(Math.round(ratio*(catalog.length-1)));if(dragging)motion.progress(ratio*100,true);};
  listen(menu,'pointerdown',event=>{const slider=event.target.closest('[data-work-slider]');if(!slider||event.button!==0)return;event.preventDefault();dragging=true;slider.setPointerCapture(event.pointerId);menu.querySelector('[data-reasoning-slider]')?.focus();chooseAt(event);syncPower();});
  listen(menu,'pointermove',event=>{if(dragging){event.preventDefault();chooseAt(event);}else{const thumb=menu.querySelector('[data-work-thumb]')?.getBoundingClientRect();if(thumb)motion.thumb(event.clientX>=thumb.left&&event.clientX<=thumb.right&&event.clientY>=thumb.top&&event.clientY<=thumb.bottom);}});
  listen(menu,'pointerup',event=>{if(!dragging)return;chooseAt(event);dragging=false;syncPower();});
  listen(menu,'pointerleave',()=>{if(!dragging)motion.thumb(false);});
  listen(menu,'pointercancel',()=>{dragging=false;syncPower();});
  listen(menu,'lostpointercapture',()=>{if(dragging){dragging=false;syncPower();}});
  listen(menu,'wheel',event=>{if(view!=='power'||!event.target.closest('[data-reasoning-slider]')||event.ctrlKey)return;event.preventDefault();let delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:-event.deltaY;if(event.deltaMode)delta=30*Math.sign(delta);if(event.timeStamp-wheelTime>160||Math.sign(delta)!==Math.sign(wheelDelta))wheelDelta=0;wheelTime=event.timeStamp;wheelDelta+=delta;if(Math.abs(wheelDelta)>=30){const direction=Math.sign(wheelDelta);wheelDelta-=30*direction;choose(Math.max(0,selected())+direction);}}, {passive:false});
  listen(window,'resize',position);listen(window,'scroll',position,true);listen(media,'change',()=>{if(opened&&view==='power')renderPower();});
  read();menu.hidden=true;renderTrigger();
  return {open,close,refresh,destroy(){close();motion.destroy();destroyed=true;removers.forEach(remove=>remove());},setEfforts(values){autoPresets=values;refresh();},setModels(values){modelCatalog=cleanModels(values);refresh();},setEnabledEfforts(values){allowedEfforts=values;refresh();},setModelEfforts(values){capabilityMap=values;refresh();}};
}

