import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalDotCompletion } from '../src/native-client/local-dot-adapter.mjs';

for (const direct of [true, false]) {
  test('Dot chooses ' + (direct ? 'the reachable Terra provider' : 'its site relay') + ' before sending a prompt', async () => {
    const root = 'https://api.openclawplan.com';
    const proxy = 'https://dot-site.fixture.test';
    const submitted = [], probes = [];
    const settings = { model: 'gpt-6.1-terra', reasoningEffort: 'medium' };
    const request = createLocalDotCompletion({
      siteOrigin: proxy,
      getProviders: () => [{ id: 'openclawplan', apiBase: root + '/v1', apiKey: 'fixture-only', supportedModels: [settings.model] }],
      fetchDirectModels: async (url, options) => {
        probes.push(url.href);
        assert.equal(options.credentials, 'omit');
        assert.equal(options.headers.Authorization, 'Bearer fixture-only');
        if (!direct) throw new TypeError('Unavailable from this browser');
        return Response.json({ data: [] });
      },
      complete: async options => {
        submitted.push(options.settings.apiBase);
        return { model: options.settings.model, actual_reasoning: { effort: options.settings.reasoningEffort }, content: 'Fixture' };
      },
    });
    await Promise.all([request.prepare(), request({ settings })]);
    assert.deepEqual(probes, [root + '/v1/models']);
    assert.deepEqual(submitted, [direct ? root + '/v1' : proxy + '/api-proxy/openclawplan/v1']);
  });
}
