/**
 * Baseline captured from the signed-in first-party Work picker, 2026-11-15.
 * Additional manual models require a separately recorded dual-source match.
 * A provider's /v1/models response alone must never expand this catalog.
 * Future additions require both an official OpenAI release and a matching
 * provider model, with a separately verified picker preset mapping.
 */
export const WORK_MODEL_IDS = Object.freeze([
  'gpt-6-luna',
  'gpt-6.1-sol',
  'gpt-6-astra',
  'gpt-6.1-terra',
]);

export const WORK_PRESETS = Object.freeze([
  Object.freeze({id:'gpt-6-luna:high',model:'gpt-6-luna',effort:'high',label:'高',displayLabel:'GPT-6 Luna 高'}),
  Object.freeze({id:'gpt-6.1-sol:low',model:'gpt-6.1-sol',effort:'low',label:'轻度',displayLabel:'GPT-6.1 Sol 轻度'}),
  Object.freeze({id:'gpt-6.1-sol:medium',model:'gpt-6.1-sol',effort:'medium',label:'中',displayLabel:'GPT-6.1 Sol 中'}),
  Object.freeze({id:'gpt-6-astra:low',model:'gpt-6-astra',effort:'low',label:'轻度',displayLabel:'GPT-6 Astra 轻度'}),
  Object.freeze({id:'gpt-6-astra:medium',model:'gpt-6-astra',effort:'medium',label:'中',displayLabel:'GPT-6 Astra 中'}),
  Object.freeze({id:'gpt-6-astra:xhigh',model:'gpt-6-astra',effort:'xhigh',label:'极高',displayLabel:'GPT-6 Astra 极高'}),
]);

export const WORK_MODEL_LABELS=Object.freeze({'gpt-6-luna':'GPT-6 Luna','gpt-6.1-sol':'GPT-6.1 Sol','gpt-6-astra':'GPT-6 Astra','gpt-6.1-terra':'GPT-6.1 Terra'});
// Exact public locale IDs: composer.mode.local.reasoning.{none,low,medium,
// high,xhigh,max}.label (low uses .low.label.v2). These are original labels.
export const WORK_EFFORT_LABELS=Object.freeze({none:'无',low:'轻度',medium:'中',high:'高',xhigh:'极高',max:'Max',ultra:'Ultra'});
export const WORK_DEFAULT_OPTION=Object.freeze({
  id:'auto',label:'默认',description:'推荐模型集',resetLabel:'重置为默认',
  labelId:'composer.modelPicker.default.label',descriptionId:'composer.modelPicker.default.description',resetLabelId:'composer.modelPicker.resetToDefault',
});

// API efforts match runtime.allowedReasoningEfforts; Ultra separately declares
// a site orchestration mode. These
// are NOT a captured first-party per-model thinking_efforts response. The
// original TFzY protocol uses thinking_efforts/short_label/full_label; TWUU.d
// uses supportedReasoningEfforts. A host may narrow these API-supported lists.
export const WORK_PINNED_EFFORTS=Object.freeze({
  'gpt-6-luna':Object.freeze(['none','low','medium','high','xhigh','max']),
  'gpt-6.1-sol':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-6-astra':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-6.1-terra':Object.freeze(['none','low','medium','high','xhigh','max']),
});
// This manual addition has a public release and an exact provider catalog match.
// Model membership is not proof that the provider currently permits inference.
export const WORK_ADDITIONAL_MODEL_PROVENANCE=Object.freeze({
  'gpt-6.1-terra':Object.freeze({
    officialModelId:'gpt-6.1-terra',providerExactModelId:'gpt-6.1-terra',
    officialRelease:'https://learn.chatgpt.com/docs/changelog#2026-10-26',
    officialCapabilities:'https://developers.openai.com/api/docs/models/gpt-6.1-terra.md',
    providerModelsCheckedAt:'2026-11-16T14:14:05Z',providerModelsStatus:200,
    surfaces:Object.freeze(['work','codex']),manualOnly:true,curatedPreset:false,
    inferenceVerified:false,siteUltraEnabled:false,
  }),
});
// Ultra is a site execution mode; it is never a provider reasoning_effort enum.
// The runner must execute genuine parallel delegation with the same base family.
export const SITE_ULTRA_ORCHESTRATION=Object.freeze({
  effort:'ultra',mode:'parallel-agents',baseReasoningEffort:'max',
  models:Object.freeze(['gpt-6.1-sol','gpt-6-astra']),providerReasoningEffort:false,
});
export const WORK_CATALOG_PROVENANCE=Object.freeze({
  auto:'signed-in-first-party-six-position-capture',
  pinned:'adapter-api-capability-plus-explicit-site-orchestration',
  ultra:'site-parallel-agent-orchestration-not-provider-reasoning-enum',
  originalManualMembershipCaptured:false,
  labels:'public-original-zh-CN-locale',
  defaultOption:'dU23 + composer.modelPicker.default.label/description',
  originalProtocols:Object.freeze({modelConfig:'TFzY.thinking_efforts',workCapabilities:'TWUU.d.supportedReasoningEfforts',curatedPresets:'TWUU.c.sliderModelsConfig.presets'}),
});

const canonicalModel=value=>String(value||'').replace(/-wm$/,'');
const canonicalEffort=value=>typeof value==='string'?value:value?.reasoningEffort??value?.thinking_effort??value?.effort;
const enabled=(effort,options)=>!Array.isArray(options.enabledEfforts)||options.enabledEfforts.includes(effort);
const availableModels=options=>{
  if(!Array.isArray(options.models))return WORK_MODEL_IDS;
  return WORK_MODEL_IDS.filter(id=>options.models.some(value=>canonicalModel(typeof value==='string'?value:value?.id??value?.model)===id));
};

/** The default catalog crosses families; an explicit catalog never does. */
export function getWorkSelectionCatalog(selection={},options={}){
  const available=availableModels(options);
  if(selection.selectionMode==='pinned'){
    const model=canonicalModel(selection.model);if(!available.includes(model))return[];
    const configured=options.modelEfforts?.[model],supported=Array.isArray(configured)?configured.map(canonicalEffort):WORK_PINNED_EFFORTS[model];
    return(WORK_PINNED_EFFORTS[model]??[]).filter(effort=>supported.includes(effort)&&enabled(effort,options)).map(effort=>({
      id:`${model}:${effort}`,model,effort,label:WORK_EFFORT_LABELS[effort],displayLabel:`${WORK_MODEL_LABELS[model]} ${WORK_EFFORT_LABELS[effort]}`,
      capabilitySource:WORK_CATALOG_PROVENANCE.pinned,
    }));
  }
  const requested=Array.isArray(options.autoPresets)?options.autoPresets:null;
  return WORK_PRESETS.filter(p=>available.includes(p.model)&&enabled(p.effort,options)&&(!requested||requested.some(r=>typeof r==='string'?r===p.id:r?.id===p.id||canonicalModel(r?.model)===p.model&&canonicalEffort(r)===p.effort))).map(p=>({...p}));
}

export function normalizeWorkSelection(value={},options={}){
  const available=availableModels(options),requested=canonicalModel(value.model);
  const model=available.includes(requested)?requested:available.includes('gpt-6.1-sol')?'gpt-6.1-sol':available[0]??WORK_MODEL_IDS[1];
  const state={...value,model,effort:canonicalEffort(value.effort)??'low',fast:!!value.fast,selectionMode:value.selectionMode==='pinned'?'pinned':'auto'};
  const choices=getWorkSelectionCatalog(state,options);
  if(choices.some(p=>p.model===state.model&&p.effort===state.effort))return state;
  const next=choices.find(p=>p.model===state.model&&p.effort==='medium')??choices.find(p=>p.model===state.model)??choices.find(p=>p.model==='gpt-6.1-sol'&&p.effort==='medium')??choices[0];
  return next?{...state,model:next.model,effort:next.effort}:state;
}

export function selectWorkModel(value,model,options={}){
  model=canonicalModel(model);if(!availableModels(options).includes(model))return normalizeWorkSelection(value,options);
  const state={...value,model,selectionMode:'pinned'},choices=getWorkSelectionCatalog(state,options);
  if(!choices.length)return normalizeWorkSelection(value,options);
  const next=choices.find(p=>p.effort===value.effort)??choices.find(p=>p.effort==='medium')??choices[0];
  return normalizeWorkSelection({...state,effort:next.effort},options);
}

export function selectWorkDefault(value,options={}){
  return normalizeWorkSelection({...value,selectionMode:'auto'},options);
}

export function selectWorkTier(value,index,options={}){
  const state=normalizeWorkSelection(value,options),choices=getWorkSelectionCatalog(state,options);
  if(!choices.length)return state;
  const item=choices[Math.max(0,Math.min(choices.length-1,Math.round(Number(index)||0)))];
  return{...state,model:state.selectionMode==='pinned'?state.model:item.model,effort:item.effort};
}
