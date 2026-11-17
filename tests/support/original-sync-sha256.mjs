import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
const fixture = JSON.parse(fs.readFileSync(new URL('./original-sync-sha256-factories.json', import.meta.url), 'utf8'));
const context = vm.createContext({ TextEncoder, TextDecoder }), cache = new Map();
function original(id) {
  if (cache.has(id)) return cache.get(id).exports;
  const record = fixture.modules[id];
  if (!record || createHash('sha256').update(record.source).digest('hex') !== record.sha256) throw Error('Unapproved original synchronous SHA dependency');
  const module = { exports: {} }; cache.set(id, module);
  vm.runInContext('(' + record.source + ')', context, { filename: record.publicSource.file, timeout: 1000 })(module, module.exports, original);
  return module.exports;
}
original.d = function(exports, getters, values) { const direct = arguments.length === 3, table = direct ? values : getters; for (const [key, value] of Object.entries(table)) if (!Object.hasOwn(exports, key)) Object.defineProperty(exports, key, { enumerable: true, get: direct ? () => value : value }); };
original.r = exports => { Object.defineProperty(exports, '__esModule', { value: true }); Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' }); };
original.o = (value, key) => Object.hasOwn(value, key);
export const originalSHA256Bytes = bytes => original('hAXn').e(original('LMwm').a(bytes));
export const originalSHA256Fixture = { factories: Object.keys(fixture.modules).length, sourceHashes: Object.fromEntries(Object.entries(fixture.modules).map(([id, value]) => [id, value.sha256])) };
