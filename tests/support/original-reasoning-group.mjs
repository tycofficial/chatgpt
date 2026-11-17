import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

// Execute only the saved original pure message classifier and its pinned
// dependencies. No original UI entry, browser control, or network is involved.
const fixture = JSON.parse(fs.readFileSync(new URL('./original-reasoning-group-factories.json', import.meta.url), 'utf8'));
const records = new Map(fixture.modules.map(record => [record.id, record]));
const context = vm.createContext({ URL, URLSearchParams, TextEncoder, TextDecoder, crypto: webcrypto });
const modules = new Map(), files = new Map();
function original(id) {
  if (modules.has(id)) return modules.get(id).exports;
  const record = records.get(id);
  if (!record) throw Error('Unpinned original classifier dependency: ' + id);
  let file = files.get(record.file);
  if (!file) { file = fs.readFileSync(new URL('../../' + record.file, import.meta.url), 'utf8'); files.set(record.file, file); }
  const source = file.slice(record.start, record.end);
  if (createHash('sha256').update(source).digest('hex') !== record.sha256) throw Error('Original classifier source changed: ' + id);
  const module = { exports: {} }; modules.set(id, module);
  vm.runInContext('(' + source + ')', context, { filename: record.file, timeout: 1000 })(module, module.exports, original);
  return module.exports;
}
original.d = function(exports, getters, values) { const direct = arguments.length === 3, table = direct ? values : getters; for (const [key, value] of Object.entries(table)) if (!Object.hasOwn(exports, key)) Object.defineProperty(exports, key, { enumerable: true, get: direct ? () => value : value }); };
original.n = value => { const fn = value && value.__esModule ? () => value.default : () => value; original.d(fn, { a: fn }); return fn; };
original.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
original.o = (value, key) => Object.hasOwn(value, key);
original.nmd = module => { module.paths = []; module.children ??= []; return module; };
export const groupOriginalMessages = original(fixture.entry).b;
export const originalGroupingProof = { factories: modules.size, unchangedSource: true, originalUIExecuted: false, networkRequests: 0 };
