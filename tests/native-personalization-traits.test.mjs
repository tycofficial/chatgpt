import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const host = fileURLToPath(new URL('./support/personalization-traits-host.mjs', import.meta.url));
function isolatedStore(t) {
  const parent = fs.realpathSync(path.resolve(process.env.PERSONALIZATION_TEST_TMPDIR ?? os.tmpdir()));
  const root = fs.mkdtempSync(path.join(parent, 'native-traits-webstorage-'));
  t.after(() => { const resolved = fs.realpathSync(root); assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('native-traits-webstorage-')); fs.rmSync(resolved, { recursive: true, force: true }); });
  return path.join(root, 'neutral-localstorage');
}
function run(scenario, file) {
  const child = spawnSync(process.execPath, ['--experimental-webstorage', '--localstorage-file=' + file, host, scenario], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024, env: { ...process.env } });
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.status, 0, child.stderr + '\n' + child.stdout);
  const line = child.stdout.split(/\r?\n/).findLast(value => value.startsWith('@@RESULT@@')); assert.ok(line, child.stdout); const report = JSON.parse(line.slice('@@RESULT@@'.length)); assert.equal(report.pass, true); assert.equal(report.actualStorage, 'Storage'); assert.equal(report.externalNetwork, false); return report;
}
const cases = [
  ['catalog', 'source-known trait catalog uses original native DTO, preserves unsupported Base style and does not store defaults'],
  ['partial', 'native partial trait PATCH preserves text and other trait values in actual Web Storage'],
  ['levels', 'all source less/default/more directions persist and default adds no authored guidance'],
  ['invalid', 'unknown base/trait keys, levels and prototype-looking fields fail without a storage change'],
  ['legacy', 'legacy four-field v1 remains exact and upgrades only on a genuine trait write'],
  ['disabled', 'declared disabled policy retains all settings and removes both text and traits from application'],
  ['owners', 'real Web Storage isolates owners and refuses guest or requested foreign account access'],
  ['bodyOwner', 'account changes while native PATCH body arrives do not commit to either account'],
  ['readOwner', 'account changes during real storage read cannot return mixed-owner instructions'],
  ['commitOwner', 'account change inside a real commit rolls back only the captured owner namespace'],
  ['storageFaults', 'real storage refusal and postcommit failure preserve the previous durable profile'],
  ['firstWriteFault', 'failed first trait write rolls back to no record instead of saved-looking state'],
  ['abort', 'aborts before or during actual writes preserve previous durable settings'],
  ['corrupt', 'malformed versions, traits and foreign owner envelopes are not silently reset'],
  ['copies', 'native catalog and profile responses do not expose mutable stored references'],
  ['payloadChatWork', 'actual Classic Chat and Work request payloads apply all selected traits and retain exact custom-text associations'],
  ['payloadUpdates', 'three same-conversation native REST sends apply changed then disabled traits in the next actual payload'],
  ['payloadFree', 'Free Think preserves Luna low/medium while applying genuine stored trait preferences'],
  ['payloadFault', 'unreadable trait storage fails the real local turn before any gateway request'],
  ['surfaces', 'Codex, Dot, unknown RPC, guest and late account changes never inherit these ChatGPT traits'],
  ['singleRead', 'request text and trait guidance use one owner-record snapshot and retain legacy getter JSON'],
];
for (const [scenario, description] of cases) test(description, t => run(scenario, isolatedStore(t)));
test('a fresh Node process restores actual Web Storage text and traits without a shared in-memory provider', t => {
  const file = isolatedStore(t), written = run('persistWrite', file); assert.equal(written.version, 2); assert.ok(fs.statSync(file).size > 0);
  const restored = run('persistRead', file); assert.equal(restored.version, 2);
});
