import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as catalog from '../model-catalog.js';
import { createModelCatalogAdapter } from '../src/native-client/model-catalog-adapter.mjs';

test('native Library stays absent until its actual provider is registered and a site identity exists', () => {
  let signedIn = false;
  const source = fs.readFileSync(new URL('../src/native-client/local-configuration.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\r?$/gm, '').replace(/^export\s+/gm, '');
  const context = vm.createContext({ catalog, createModelCatalogAdapter,
    getPrototypeStatsigUser: () => ({ userID: 'library-fixture', customIDs: {} }),
    isPrototypeLocalSession: () => signedIn, hasModelSelectionAccess: () => false,
    getSitePlanCapabilities: () => ({ planType: 'free', chat: true, modelSelection: false, work: false, codex: false, dot: false }),
    structuredClone, Date,
  });
  new vm.Script(source + '\nglobalThis.policy={read:getPrototypeConfiguration,register:setLocalLibraryAvailability};').runInContext(context);
  const { policy } = context;
  const gate = () => policy.read().feature_gates['224248639'].value;
  assert.equal(gate(), false);
  signedIn = true;
  assert.equal(gate(), false);
  policy.register(() => true);
  assert.equal(gate(), true);
  const configuration = policy.read();
  assert.equal(Object.values(configuration.feature_gates).filter(row => row.name === '224248639' && row.value === true).length, 2);
  assert.equal(configuration.feature_gates['536305374'].value, false);
  assert.equal(configuration.feature_gates['1186680773'].value, false);
  signedIn = false;
  assert.equal(gate(), false);
  signedIn = true;
  policy.register(() => false);
  assert.equal(gate(), false);
  assert.throws(() => policy.register(true), /availability reader/);
});
