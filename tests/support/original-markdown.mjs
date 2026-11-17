import {parseHTML} from 'linkedom/worker';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const fixture = JSON.parse(fs.readFileSync(new URL('./original-markdown-factories.json', import.meta.url), 'utf8'));
// Standard DOM entity decoding only; no source app, UI entry, navigation or network.
const {document: entityDocument} = parseHTML('<!doctype html><html><head></head><body></body></html>');
const context = vm.createContext({ TextDecoder, TextEncoder, document: entityDocument }), cache = new Map();
function requireOriginal(id) {
  if (cache.has(id)) return cache.get(id).exports;
  const record = fixture.modules[id];
  if (!record || createHash('sha256').update(record.source).digest('hex') !== record.sha256) throw Error('Unapproved pure Markdown dependency ' + id);
  const module = { exports: {} }; cache.set(id, module);
  const factory = vm.runInContext('(' + record.source + ')', context, { filename: record.publicSource.file, timeout: 1000 });
  factory(module, module.exports, requireOriginal); return module.exports;
}
requireOriginal.d = function(exports, getters, values) { const direct = arguments.length === 3, table = direct ? values : getters; for (const [key, value] of Object.entries(table)) if (!Object.hasOwn(exports, key)) Object.defineProperty(exports, key, { enumerable: true, get: direct ? () => value : value }); };
requireOriginal.r = exports => { Object.defineProperty(exports, '__esModule', { value: true }); Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' }); };
requireOriginal.o = (value, key) => Object.hasOwn(value, key);
export const parseOriginalMarkdown = requireOriginal('cC4N').a;
export const originalMarkdownFixture = { entry: fixture.entry, factories: Object.keys(fixture.modules).length, sourceHashes: Object.fromEntries(Object.entries(fixture.modules).map(([id, record]) => [id, record.sha256])), originalUIExecuted: false, externalNetworkIO: false, standardDOMEntityCodec: true, standardDOMPackage: 'linkedom' };
