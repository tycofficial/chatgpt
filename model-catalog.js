/**
 * Baseline captured from the signed-in first-party Work picker, 2026-11-15.
 * A provider's /v1/models response alone must never expand this catalog.
 * Future additions require both an official OpenAI release and a matching
 * provider model, with a separately verified picker preset mapping.
 */
export const WORK_MODEL_IDS = Object.freeze([
  'gpt-6-luna',
  'gpt-6.1-sol',
  'gpt-6-astra',
]);

export const WORK_PRESETS = Object.freeze([
  Object.freeze({id:'gpt-6-luna:high',model:'gpt-6-luna',effort:'high',label:'高',displayLabel:'GPT-6 Luna 高'}),
  Object.freeze({id:'gpt-6.1-sol:low',model:'gpt-6.1-sol',effort:'low',label:'轻度',displayLabel:'GPT-6.1 Sol 轻度'}),
  Object.freeze({id:'gpt-6.1-sol:medium',model:'gpt-6.1-sol',effort:'medium',label:'中',displayLabel:'GPT-6.1 Sol 中'}),
  Object.freeze({id:'gpt-6-astra:low',model:'gpt-6-astra',effort:'low',label:'轻度',displayLabel:'GPT-6 Astra 轻度'}),
  Object.freeze({id:'gpt-6-astra:medium',model:'gpt-6-astra',effort:'medium',label:'中',displayLabel:'GPT-6 Astra 中'}),
  Object.freeze({id:'gpt-6-astra:xhigh',model:'gpt-6-astra',effort:'xhigh',label:'极高',displayLabel:'GPT-6 Astra 极高'}),
]);
