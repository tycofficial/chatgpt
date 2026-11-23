import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';

const archive = new URL('../../original-client/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('resource-manifest.json', archive), 'utf8'));
const plan = JSON.parse(readFileSync(new URL('../../src/native-client/entry-plan.json', import.meta.url), 'utf8'));
assert.equal(manifest.sourceBuild, plan.sourceBuild);
const chunks = new Map();
const tables = new Map();

export function capturedChunk(...ids) {
  for (const id of ids) {
    assert.ok(Number.isSafeInteger(id) && id >= 0);
    if (!chunks.has(id)) {
      const pattern = new RegExp('^https://chatgpt\\.com/cdn/assets/(?:async/)?' + id + '\\.[a-f\\d]{8,}\\.js$');
      const entries = manifest.assets.filter(asset => pattern.test(asset.url));
      assert.ok(entries.length <= 1, 'Ambiguous captured chunk ' + id);
      chunks.set(id, entries[0] ?? null);
    }
    if (chunks.get(id)) return chunks.get(id);
  }
  assert.fail('Missing captured chunk: ' + ids.join(', '));
}

export function capturedFactory(id, chunkId) {
  const asset = capturedChunk(chunkId);
  if (!tables.has(asset.url)) {
    const url = new URL(asset.url);
    assert.equal(asset.path, 'public/' + url.hostname + url.pathname);
    const bytes = readFileSync(new URL(asset.path, archive));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.url);
    const text = bytes.toString('utf8');
    const { body } = parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
    const table = body.flatMap(statement => (statement.declaration ?? statement).declarations ?? [])
      .find(declaration => declaration.id.name === '__webpack_modules__')?.init;
    assert.equal(table?.type, 'ObjectExpression', 'Missing original factory table: ' + asset.url);
    tables.set(asset.url, { text, properties: table.properties });
  }
  const { text, properties } = tables.get(asset.url);
  const members = properties.filter(property => (property.key?.name ?? property.key?.value) === id);
  assert.equal(members.length, 1, 'Expected one original factory ' + id + ' in ' + asset.url);
  const { value, method } = members[0];
  const prefix = method ? (value.async ? 'async ' : '') + 'function' + (value.generator ? '*' : '') : '';
  return prefix + text.slice(value.start, value.end);
}
