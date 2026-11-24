// Same-origin client for the authenticated local bridge. Persist a mutation's request ID
// and instance ID before sending it so a lost response can be read without resubmitting work.
export async function connectLocalCodex({ csrf, fetchImpl = globalThis.fetch } = {}) {
  const path = '/local/codex/v1/';
  async function send(resource, options = {}) {
    const { body, signal } = options;
    const response = await fetchImpl(path + resource, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      cache: 'no-store', redirect: 'error', signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Bridge-CSRF': csrf },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(Error(result?.error?.message || 'The local Codex connection is unavailable.'), {
      code: result?.error?.code, status: response.status,
    });
    return result;
  }

  const status = await send('status');
  return {
    status,
    request(method, params = {}, { requestId, instanceId = status.instanceId, signal } = {}) {
      return send('rpc', { body: { instanceId, requestId, method, params }, signal });
    },
    readReceipt(requestId, { instanceId = status.instanceId, signal } = {}) {
      const query = new URLSearchParams({ requestId, instanceId });
      return send('receipt?' + query, { signal });
    },
    readEvents(threadId, { after = 0, instanceId = status.instanceId, signal } = {}) {
      const query = new URLSearchParams({ threadId, instanceId, after: String(after) });
      return send('events?' + query, { signal });
    },
  };
}
