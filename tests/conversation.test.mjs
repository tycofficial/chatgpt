import test from 'node:test';
import assert from 'node:assert/strict';
import {completeToolResponses} from '../conversation.js';
const assistant={id:'a',role:'assistant',tool_calls:[{id:'one'},{id:'two'}]};
test('cancelled multi-tool batch gets missing responses before next user',()=>{
  const messages=[assistant,{id:'t',role:'tool',tool_call_id:'one',content:'42'},{id:'u',role:'user',content:'continue'}];
  const fixed=completeToolResponses(messages,()=> 'new');
  assert.equal(fixed[1].content,'42');
  assert.equal(fixed[2].tool_call_id,'two');
  assert.equal(fixed[3].role,'user');
  assert.deepEqual(completeToolResponses(fixed),fixed);
});
test('interrupted tail gets all tool responses and orphan results are removed',()=>{
  const fixed=completeToolResponses([{role:'tool',tool_call_id:'orphan'},assistant],()=> 'new');
  assert.equal(fixed.length,3);
  assert.deepEqual(fixed.slice(1).map(x=>x.tool_call_id),['one','two']);
});
