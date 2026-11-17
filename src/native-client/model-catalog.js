/**
 * The six curated positions preserve the captured first-party Work picker.
 * Manual membership uses the eight exact first-party calling-host IDs,
 * official Help model guidance and the recorded 2026-11-17 provider matches.
 * Those manual entries do not add or invent another curated slider position.
 */
export const WORK_MODEL_IDS = Object.freeze([
  'gpt-6-luna',
  'gpt-6.1-sol',
  'gpt-6-astra',
  'gpt-6.1-terra',
  'gpt-6-sol',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
]);

export const WORK_PRESETS = Object.freeze([
  Object.freeze({id:'gpt-6-luna:high',model:'gpt-6-luna',effort:'high',label:'高',displayLabel:'GPT-6 Luna 高'}),
  Object.freeze({id:'gpt-6.1-sol:low',model:'gpt-6.1-sol',effort:'low',label:'轻度',displayLabel:'GPT-6.1 Sol 轻度'}),
  Object.freeze({id:'gpt-6.1-sol:medium',model:'gpt-6.1-sol',effort:'medium',label:'中',displayLabel:'GPT-6.1 Sol 中'}),
  Object.freeze({id:'gpt-6-astra:low',model:'gpt-6-astra',effort:'low',label:'轻度',displayLabel:'GPT-6 Astra 轻度'}),
  Object.freeze({id:'gpt-6-astra:medium',model:'gpt-6-astra',effort:'medium',label:'中',displayLabel:'GPT-6 Astra 中'}),
  Object.freeze({id:'gpt-6-astra:xhigh',model:'gpt-6-astra',effort:'xhigh',label:'极高',displayLabel:'GPT-6 Astra 极高'}),
]);

export const WORK_MODEL_LABELS=Object.freeze({'gpt-6-luna':'GPT-6 Luna','gpt-6.1-sol':'GPT-6.1 Sol','gpt-6-astra':'GPT-6 Astra','gpt-6.1-terra':'GPT-6.1 Terra','gpt-6-sol':'GPT-6 Sol','gpt-5.6-sol':'GPT-5.6 Sol','gpt-5.6-terra':'GPT-5.6 Terra','gpt-5.6-luna':'GPT-5.6 Luna'});
// Exact public locale IDs: composer.mode.local.reasoning.{none,low,medium,
// high,xhigh,max}.label (low uses .low.label.v2). These are original labels.
export const WORK_EFFORT_LABELS=Object.freeze({none:'无',low:'轻度',medium:'中',high:'高',xhigh:'极高',max:'Max',ultra:'Ultra'});
export const WORK_DEFAULT_OPTION=Object.freeze({
  id:'auto',label:'默认',description:'推荐模型集',resetLabel:'重置为默认',
  labelId:'composer.modelPicker.default.label',descriptionId:'composer.modelPicker.default.description',resetLabelId:'composer.modelPicker.resetToDefault',
});

// Work/Codex UI membership is a subset of API capability, not its full enum.
// Luna starts at low per the user's requirement and the connected first-party
// calling-host declaration. API none remains valid in runtime.js. Other model
// entries and site Ultra stay unchanged; this is not a captured Web-account list.
// Original TFzY uses thinking_efforts labels; TWUU.d uses supportedReasoningEfforts.
export const WORK_PINNED_EFFORTS=Object.freeze({
  'gpt-6-luna':Object.freeze(['low','medium','high','xhigh','max']),
  'gpt-6.1-sol':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-6-astra':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-6.1-terra':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-6-sol':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-5.6-sol':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-5.6-terra':Object.freeze(['low','medium','high','xhigh','max','ultra']),
  'gpt-5.6-luna':Object.freeze(['low','medium','high','xhigh','max']),
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
    inferenceVerified:false,siteUltraEnabled:true,
  }),
});
// Ultra is a site execution mode; it is never a provider reasoning_effort enum.
// The runner must execute genuine parallel delegation with the same base family.
export const SITE_ULTRA_ORCHESTRATION=Object.freeze({
  effort:'ultra',mode:'parallel-agents',baseReasoningEffort:'max',
  models:Object.freeze(['gpt-6.1-sol','gpt-6-astra','gpt-6.1-terra','gpt-6-sol','gpt-5.6-sol','gpt-5.6-terra']),providerReasoningEffort:false,
});

// Frontend aliases are presentation choices, never provider model slugs.
// The original TFzY effort enum has no Pro value: Pro is its own row/mode.
export const CHAT_API_MODEL_IDS=Object.freeze(['gpt-6-sol','gpt-6-astra','gpt-5.6-sol']);
export const CHAT_EFFORTS=Object.freeze(['none','medium','high','xhigh']);
export const CHAT_EFFORT_LABELS=Object.freeze({none:'Instant',medium:'Medium',high:'High',xhigh:'Extra High'});
export const CHAT_FAMILIES=Object.freeze([
  Object.freeze({id:'gpt-6',label:'GPT-6',standardAlias:'auto',proAlias:'chat-gpt-6-pro',model:'gpt-6-sol',proModel:'gpt-6-astra'}),
  Object.freeze({id:'gpt-5.6-sol',label:'GPT-5.6 Sol',standardAlias:'chat-gpt-5.6-sol',proAlias:'chat-gpt-5.6-sol-pro',model:'gpt-5.6-sol',proModel:'gpt-5.6-sol'}),
]);
export const CHAT_MODEL_PROVENANCE=Object.freeze({source:'official-help-20001354-and-20001275-plus-exact-provider-models',help:'https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt',reasoningMode:'https://developers.openai.com/api/docs/guides/reasoning',frontendAliasesAreProviderModels:false});

/** Resolve only a paid Chat family/option; Free policy is enforced in core. */
export function resolveChatSelection(model='auto',{effort,reasoningMode}={}){
  if(reasoningMode!=null&&!['standard','pro'].includes(reasoningMode))throw new RangeError('Unsupported Chat reasoning mode');
  const family=CHAT_FAMILIES.find(value=>[value.standardAlias,value.proAlias,value.model,value.proModel].includes(model));
  if(!family)throw new RangeError('This model is not offered in Chat');
  const pro=model===family.proAlias||model==='gpt-6-astra'||reasoningMode==='pro';
  if(pro&&reasoningMode==='standard')throw new RangeError('The Chat Pro alias requires pro reasoning mode');
  const mode=pro?'pro':'standard',selected=effort??'medium';
  if(pro?selected!=='medium':!CHAT_EFFORTS.includes(selected))throw new RangeError('Unsupported Chat thinking option');
  return{model:pro?family.proModel:family.model,effort:selected,reasoningMode:mode,frontendModelSlug:pro?family.proAlias:family.standardAlias,chatFamily:family.id};
}
export const WORK_CATALOG_PROVENANCE=Object.freeze({
  auto:'signed-in-first-party-six-position-capture',
  pinned:'first-party-calling-host-supported-efforts-plus-explicit-site-orchestration',
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


/** Pure Work/Codex presentation codec. Never apply to API turns/checkpoints.
 * Accepts the original TFzY tuple, TWUU row/id or local pinned selection.
 * It performs no storage/cookie writes and preserves every unrelated value.
 */
export function normalizeWorkUISelection(value){
  if(typeof value==='string')return ['gpt-6-luna:none','gpt-5.6-luna:none'].includes(value)?value.slice(0,-4)+'low':value;
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const model=value.model??value.slug;if(!['gpt-6-luna','gpt-5.6-luna'].includes(canonicalModel(model)))return value;
  const patch={};
  if(value.effort==='none')patch.effort='low';
  if(value.reasoningEffort==='none')patch.reasoningEffort='low';
  if(value.thinkingEffort==='zero')patch.thinkingEffort='min';
  if(!Object.keys(patch).length)return value;
  if(value.id===model+':none')patch.id=model+':low';
  return {...value,...patch};
}
/** Original pQ72.b preference DTO, after its normal decoder has read it.
 * Only deprecated Luna UI effort values are changed; no past turn is rewritten.
 */
export function normalizeWorkUIStoredPreference(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const selected=value.modelSettings?.lastUsedModelSlug??value.modelSettings?.defaultModelSlug;
  let result=value;
  if(['gpt-6-luna','gpt-5.6-luna'].includes(canonicalModel(selected))&&value.thinkingEffort==='zero'){
    result={...value,thinkingEffort:'min'};
    // This fraction encoded the removed effort and must not restore it again.
    if(Object.hasOwn(result,'defaultSliderFraction'))delete result.defaultSliderFraction;
  }
  const last=value.lastStartedModelConfig;
  if(['gpt-6-luna','gpt-5.6-luna'].includes(canonicalModel(last?.modelSlug))&&last.thinkingEffort==='zero'){
    result={...result,lastStartedModelConfig:{...last,thinkingEffort:'min'}};
  }
  return result;
}

export function normalizeWorkSelection(value={},options={}){
  if(value.selectionMode==='pinned')value=normalizeWorkUISelection(value);
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
  const state=normalizeWorkUISelection({...value,model,selectionMode:'pinned'}),choices=getWorkSelectionCatalog(state,options);
  if(!choices.length)return normalizeWorkSelection(value,options);
  const next=choices.find(p=>p.effort===state.effort)??choices.find(p=>p.effort==='medium')??choices[0];
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
