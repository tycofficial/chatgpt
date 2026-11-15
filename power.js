/** Public API routes for the observed UI. These are explicit substitutes, not claims
 * about ChatGPT's unpublished routing. Gateway Pro support was tested and rejected
 * (GPT-6) or silently downgraded (GPT-5.6), so we never request/pretend native Pro. */
export const POWER_TIERS = Object.freeze([
  Object.freeze({id:'instant',label:'Instant'}),
  Object.freeze({id:'medium',label:'Medium'}),
  Object.freeze({id:'high',label:'High'}),
  Object.freeze({id:'xhigh',label:'Extra High'}),
  Object.freeze({id:'pro',label:'Pro'}),
]);

function normalizeFamily(family) {
  const value=String(family||'').trim().toLowerCase().replace(/\s+/g,'-');
  if(value==='gpt-6'||value==='gpt-5.6-sol')return value;
  throw new Error(`不支持的模型系列：${String(family)}。`);
}

function normalizeTier(tier) {
  const value=String(tier||'').trim().toLowerCase();
  const normalized=value==='extra high'?'xhigh':value;
  if(POWER_TIERS.some(item=>item.id===normalized))return normalized;
  throw new Error(`无效的思考档位：${String(tier)}。`);
}

export function getPowerRoute(family,tier) {
  family=normalizeFamily(family);tier=normalizeTier(tier);
  let model=family==='gpt-6'?'gpt-6.1-sol':'gpt-5.6-sol';
  const reasoningEffort=tier==='instant'?'none':tier==='pro'?'max':tier;
  if(family==='gpt-6'&&tier==='instant')model='gpt-6-sol';
  if(family==='gpt-6'&&tier==='pro')model='gpt-6-astra';
  const isFallback=tier==='pro';
  const notice=isFallback
    ? `服务商不支持原生 Pro；此档位实际使用 ${model} / max（standard）替代，并非原版私有 Pro 路由。`
    : `实际 API 路由：${model} / ${reasoningEffort}。${family==='gpt-6'&&tier==='instant'?'GPT-6.1 Sol 不支持 none，因此 Instant 切换到 GPT-6 Sol。':''}`;
  return {family,tier,label:POWER_TIERS.find(item=>item.id===tier).label,model,reasoningEffort,reasoningMode:'standard',apiTransport:'responses',isFallback,nativePro:false,originalRoutingVerified:false,notice};
}

export function getPowerRequestSettings(settings,family,tier) {
  const route=getPowerRoute(family,tier);
  return {...settings,model:route.model,reasoningEffort:route.reasoningEffort,reasoningMode:route.reasoningMode,apiTransport:route.apiTransport,powerRoute:route};
}
