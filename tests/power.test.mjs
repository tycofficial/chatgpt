import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_TIERS,getPowerRoute,getPowerRequestSettings} from '../power.js';
import {allowedReasoningEfforts} from '../runtime.js';

test('the observed five positions route to distinct supported requests within each family',()=>{
  assert.deepEqual(POWER_TIERS.map(x=>x.label),['Instant','Medium','High','Extra High','Pro']);
  for(const family of ['GPT-6','GPT-5.6 Sol']){
    const routes=POWER_TIERS.map(tier=>getPowerRoute(family,tier.id));
    assert.equal(new Set(routes.map(r=>r.model+':'+r.reasoningEffort)).size,5);
    for(const route of routes){assert.ok(allowedReasoningEfforts(route.model).includes(route.reasoningEffort));assert.equal(route.apiTransport,'responses');assert.equal(route.originalRoutingVerified,false);}
    assert.equal(routes[0].reasoningEffort,'none');assert.equal(routes[4].reasoningEffort,'max');assert.equal(routes[4].isFallback,true);assert.equal(routes[4].nativePro,false);assert.match(routes[4].notice,/不支持原生 Pro/);
  }
  assert.equal(getPowerRoute('GPT-6','Instant').model,'gpt-6-sol');assert.equal(getPowerRoute('GPT-6','Pro').model,'gpt-6-astra');assert.equal(getPowerRoute('GPT-5.6 Sol','Pro').model,'gpt-5.6-sol');
});

test('request settings preserve connection values without mutating stored settings or pretending native Pro',()=>{
  const settings={apiBase:'https://example.test',apiKey:'test-only-key',model:'old-model',reasoningMode:'pro'};
  const request=getPowerRequestSettings(settings,'GPT-6','Pro');
  assert.equal(request.apiKey,settings.apiKey);assert.equal(request.model,'gpt-6-astra');assert.equal(request.reasoningEffort,'max');assert.equal(request.reasoningMode,'standard');assert.equal(request.powerRoute.isFallback,true);assert.equal(settings.model,'old-model');assert.equal(settings.reasoningMode,'pro');
});

test('unknown family or slider value fails rather than silently reverting to Medium',()=>{
  assert.throws(()=>getPowerRoute('unknown','medium'),/不支持的模型系列/);
  assert.throws(()=>getPowerRoute('GPT-6','unknown'),/无效的思考档位/);
  assert.throws(()=>getPowerRoute('GPT-6',5),/无效的思考档位/);
});
