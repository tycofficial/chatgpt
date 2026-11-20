
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as catalog from '../src/native-client/model-catalog.js';
import {createModelCatalogAdapter,FRONTEND_TO_RAW_EFFORT} from '../src/native-client/model-catalog-adapter.mjs';
import {allowedReasoningEfforts} from '../runtime.js';
import {DEFAULT_SETTINGS} from '../config.js';
const adapter=createModelCatalogAdapter(catalog);
test('TFzY raw effort semantics keep zero/none, max and ultra distinct',()=>{assert.equal(FRONTEND_TO_RAW_EFFORT.none,'zero');assert.equal(FRONTEND_TO_RAW_EFFORT.max,'max');assert.equal(FRONTEND_TO_RAW_EFFORT.ultra,'ultra');assert.notEqual(FRONTEND_TO_RAW_EFFORT.max,FRONTEND_TO_RAW_EFFORT.ultra);});
test('both Luna manual catalogs start at Low and end at Max without site Ultra',()=>{for(const model of ['gpt-6-luna','gpt-5.6-luna']){const raw=adapter.getWorkModels().models.find(m=>m.slug===model),rpc=adapter.getRpcModelList().data.find(m=>m.model===model);assert.equal(raw.thinking_efforts[0].thinking_effort,'min');assert.equal(raw.thinking_efforts[0].short_label,'轻度');assert.equal(rpc.supportedReasoningEfforts[0].reasoningEffort,'low');assert.equal(rpc.supportedReasoningEfforts.at(-1).reasoningEffort,'max');assert(!rpc.supportedReasoningEfforts.some(e=>e.reasoningEffort==='ultra'));}});
test('six non-Luna models expose separate site Ultra above their API Max effort',()=>{for(const model of catalog.SITE_ULTRA_ORCHESTRATION.models){const row=adapter.getRpcModelList().data.find(m=>m.model===model),top=row.supportedReasoningEfforts.at(-1);assert.equal(top.reasoningEffort,'ultra');assert.equal(top.adapterExecutionMode.mode,'parallel-agents');assert.equal(top.adapterExecutionMode.baseReasoningEffort,'max');assert.equal(top.adapterExecutionMode.providerReasoningEffort,false);assert(row.supportedReasoningEfforts.some(e=>e.reasoningEffort==='max'));assert.equal(adapter.getWorkModels().models.find(m=>m.slug===model).thinking_efforts.at(-1).short_label,'Ultra');}});
test('Ultra is never advertised as a provider reasoning_effort value',()=>{for(const model of catalog.WORK_MODEL_IDS)assert(!allowedReasoningEfforts(model).includes('ultra'));});
test('raw display title contains only thinking option and each Chat family owns its version field',()=>{const raw=adapter.getChatGptModels();for(const version of raw.versions){for(const preset of version.intelligence_presets){assert.equal(preset.selected_display_title,preset.title);assert(!/GPT|Luna|Sol|Astra/.test(preset.selected_display_title));assert.equal(preset.selected_display_version,version.display_text);}}});
test('legacy auto remains GPT-6 standard and Chat never gains Work orchestration',()=>{const raw=adapter.getChatGptModels();assert(!raw.models.find(m=>m.slug==='auto').thinking_efforts.some(e=>e.thinking_effort==='ultra'));assert(raw.versions.every(v=>v.intelligence_presets.every(e=>e.thinking_effort!=='ultra')));assert.equal(catalog.resolveChatSelection('auto').model,'gpt-6-sol');});
test('the six observed default presets remain distinct from manual model capabilities',()=>{assert.equal(adapter.getSliderModelsConfig().presets[0].length,6);assert.deepEqual(adapter.getSliderModelsConfig().presets[0].map(e=>[e.model,e.reasoning_effort]),catalog.WORK_PRESETS.map(e=>[e.model,e.effort]));});
test('source mode separation and both Ultra gates use verified site permission',()=>{const source=fs.readFileSync(new URL('../src/native-client/local-configuration.mjs',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace(/^export\s+/gm,'');for(const access of [false,true]){const context=vm.createContext({catalog,createModelCatalogAdapter,getPrototypeStatsigUser:()=>({userID:'fixture-user',customIDs:{}}),isPrototypeLocalSession:()=>true,hasModelSelectionAccess:()=>access,getSitePlanCapabilities:()=>({work:access,dot:access}),structuredClone,Date});new vm.Script(source+'\nglobalThis.fixtureConfig=getPrototypeConfiguration();',{filename:'local-configuration.mjs (isolated fixture)'}).runInContext(context);const config=context.fixtureConfig;assert.equal(config.layer_configs['3040264819'].value.merged_picker,false);for(const id of ['536305374','1186680773']){assert.equal(config.feature_gates[id].value,access);assert.equal(Object.values(config.feature_gates).filter(g=>g.name===id).length,2);}}});

test('Fast survives the source TFzY two-level service-tier filter without adding it to Chat',()=>{
  const raw=adapter.getWorkModels(),chat=adapter.getChatGptModels();
  const presetTiers=new Set(raw.versions.flatMap(v=>v.intelligence_presets).flatMap(p=>(p.service_tier_options??[]).filter(t=>t.service_tier!=='standard').map(t=>t.service_tier)));
  assert(presetTiers.has('fast'));
  for(const id of catalog.WORK_MODEL_IDS){
    const row=raw.models.find(m=>m.slug===id);
    assert(row.service_tier_options.filter(t=>presetTiers.has(t.service_tier)).some(t=>t.service_tier==='fast'));
    assert(adapter.getRpcModelList().data.find(m=>m.model===id).serviceTiers.some(t=>t.id==='fast'));
  }
  assert.equal(chat.models.find(m=>m.slug==='auto').service_tier_options,undefined);
  assert(chat.versions.every(v=>v.intelligence_presets.every(p=>p.service_tier_options===undefined)));
  assert.equal(adapter.provenance.fastMode.providerPriorityVerified,false);
});

test('dual-matched Terra stays manual with declared host Ultra and no Chat or curated preset',()=>{
  const id='gpt-6.1-terra',efforts=['low','medium','high','xhigh','max','ultra'];
  assert(catalog.WORK_MODEL_IDS.includes(id));
  assert.deepEqual(catalog.WORK_PINNED_EFFORTS[id],efforts);
  assert.deepEqual(catalog.getWorkSelectionCatalog({model:id,selectionMode:'pinned'}).map(x=>x.effort),efforts);
  assert(!catalog.WORK_PRESETS.some(p=>p.model===id));
  assert(catalog.SITE_ULTRA_ORCHESTRATION.models.includes(id));
  const raw=adapter.getChatGptModels();
  assert(raw.models.find(m=>m.slug===id).is_work_mode_model);
  assert(raw.versions.every(v=>!v.intelligence_presets.some(p=>p.model_slug===id)));
  assert(!adapter.getWorkModels().versions.find(v=>v.id==='latest').intelligence_presets.some(p=>p.model_slug===id));
  assert.deepEqual(adapter.getRpcModelList().data.find(m=>m.model===id).supportedReasoningEfforts.map(x=>x.reasoningEffort),efforts);
  assert.equal(catalog.WORK_ADDITIONAL_MODEL_PROVENANCE[id].manualOnly,true);
  assert.equal(catalog.WORK_ADDITIONAL_MODEL_PROVENANCE[id].inferenceVerified,false);
});
test('GPT-6.2 Sol and Astra are manual Work/Codex models with exact published efforts',()=>{
  const providerEfforts=['low','medium','high','xhigh','max'];
  const expected=[...providerEfforts,'ultra'];
  for(const id of ['gpt-6.2-sol','gpt-6.2-astra']){
    assert(catalog.WORK_MODEL_IDS.includes(id));
    assert.deepEqual(catalog.WORK_PINNED_EFFORTS[id],expected);
    assert.deepEqual(allowedReasoningEfforts(id),providerEfforts);
    assert.deepEqual(catalog.getWorkSelectionCatalog({model:id,selectionMode:'pinned'}).map(choice=>choice.effort),expected);
    assert(catalog.SITE_ULTRA_ORCHESTRATION.models.includes(id));
    assert(!catalog.WORK_PRESETS.some(choice=>choice.model===id));
    assert.equal(catalog.WORK_ADDITIONAL_MODEL_PROVENANCE[id].manualOnly,true);
    assert.equal(catalog.WORK_ADDITIONAL_MODEL_PROVENANCE[id].providerModelsStatus,200);
    assert.deepEqual(catalog.WORK_ADDITIONAL_MODEL_PROVENANCE[id].surfaces,['work','codex']);
  }
  const docode=DEFAULT_SETTINGS.apiProviders.find(provider=>provider.id==='docode');
  const backup=DEFAULT_SETTINGS.apiProviders.find(provider=>provider.id==='openclawplan');
  assert(docode.supportedModels.includes('gpt-6.2-sol'));
  assert(docode.supportedModels.includes('gpt-6.2-astra'));
  assert(!backup.supportedModels.includes('gpt-6.2-sol'));
  assert(!backup.supportedModels.includes('gpt-6.2-astra'));
});
test('Codex accepts exactly the shared verified manual catalog and rejects provider extras',()=>{
  const source=fs.readFileSync(new URL('../src/native-client/local-codex-adapter.mjs',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export\s+/gm,'');
  const context=vm.createContext({WORK_MODEL_IDS:catalog.WORK_MODEL_IDS,Object,Set,Map,TypeError,RangeError,structuredClone});
  new vm.Script(source+'\nglobalThis.fixtureFactory=createLocalCodexAdapter;globalThis.fixtureIds=CODEX_MODEL_IDS;').runInContext(context);
  assert.equal(context.fixtureIds,catalog.WORK_MODEL_IDS);
  const options={appServer:{dispatch(){},subscribe(){return()=>{};}},models:adapter,readSettings:()=>({})};
  assert.doesNotThrow(()=>context.fixtureFactory(options));
  const extraModel={...adapter,getRpcModelList:()=>({data:[...adapter.getRpcModelList().data,{model:'unverified-provider-model'}]})};
  assert.throws(()=>context.fixtureFactory({...options,models:extraModel}),/explicit verified model catalog/);
  const wrongModel={...adapter,getRpcModelList:()=>({data:adapter.getRpcModelList().data.map((row,i)=>i?row:{...row,model:'unverified-provider-model'})})};
  assert.throws(()=>context.fixtureFactory({...options,models:wrongModel}),/explicit verified model catalog/);
});

test('Work default uses the original curated latest version and never the Chat alias',()=>{
  const work=adapter.getWorkModels(),chat=adapter.getChatGptModels(),selection=catalog.normalizeWorkSelection({});
  assert.equal(chat.default_model_slug,'auto');
  assert.equal(work.default_model_slug,selection.model);
  assert.equal(work.models.find(m=>m.slug===selection.model).default_thinking_effort,FRONTEND_TO_RAW_EFFORT[selection.effort]);
  assert(!work.models.some(m=>m.slug==='auto'));
  assert(!work.categories.some(m=>m.default_model==='auto'));
  assert(!work.versions.some(m=>m.id==='auto'));
  assert(work.internal_groups.every(g=>!g.model_ids.includes('auto')));
  const latest=work.versions.find(v=>v.id==='latest');
  assert.deepEqual(latest.slugs,[...new Set(catalog.WORK_PRESETS.map(p=>p.model))]);
  assert(latest.slugs.includes(selection.model));
  assert.equal(latest.intelligence_presets.length,6);
  assert(!latest.slugs.includes('gpt-6.1-terra'));
  assert(work.versions.some(v=>v.id==='gpt-6.1-terra'));
});
