/** Ensure cancelled tool batches remain valid input for the next model turn. */
export function completeToolResponses(messages, makeId = () => crypto.randomUUID()) {
  const output = [], pending = new Map();
  const finish = () => {
    for (const id of pending.keys()) output.push({id:makeId(),role:'tool',tool_call_id:id,content:JSON.stringify({error:'Tool execution was cancelled or interrupted. No result is available.'})});
    pending.clear();
  };
  for (const message of messages) {
    if (message.role !== 'tool') finish();
    if (message.role === 'tool') {
      if (!pending.has(message.tool_call_id)) continue;
      pending.delete(message.tool_call_id);
    }
    output.push(message);
    if (message.role === 'assistant') for (const call of message.tool_calls || []) pending.set(call.id, true);
  }
  finish();
  return output;
}
