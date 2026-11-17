import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { durablePublicationHost } from './support/generated-publication-host.mjs';

// Controlled operation failures exercise real temporary/target files. They are
// not presented as a reproduction of the separately captured Windows EPERM.
const fault = (code, syscall = 'rename') => Object.assign(Error('Neutral controlled operation failure'), { code, errno: code === 'EPERM' ? -4048 : -5, syscall });
async function fixture(t, { renameFailure = () => null, writeFailure = null, platform = 'win32', checkCritical = false } = {}) {
  const parent = path.resolve(process.env.GENERATED_PUBLICATION_TEST_TMPDIR ?? os.tmpdir()); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'native-publication-host-'));
  let testing = false, critical = false;
  const events = { writes: [], renames: [], targets: [], temporaries: [], times: [] };
  const host = await durablePublicationHost(root, {
    metadataPlatform: platform,
    metadataWriteSync(file, value, encoding) {
      if (testing) { events.writes.push(file); if (writeFailure) throw writeFailure; }
      return fss.writeFileSync(file, value, encoding);
    },
    metadataRenameSync(from, to) {
      if (testing) {
        if (checkCritical) assert.equal(critical, true, 'The synchronous metadata call must retain its outer lock');
        events.renames.push([from, to]); events.times.push(performance.now());
        events.targets.push(fss.readFileSync(to, 'utf8')); events.temporaries.push(fss.readFileSync(from, 'utf8'));
        const error = renameFailure(events.renames.length); if (error) throw error;
      }
      return fss.renameSync(from, to);
    },
  });
  host.metadataStorage.setItem('neutral-state', 'old committed value'); testing = true;
  t.after(async () => { const resolved = await fs.realpath(root), relative = path.relative(parent, resolved); assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(resolved).startsWith('native-publication-host-')); await fs.rm(resolved, { recursive: true, force: true }); });
  return { root, host, events, setCritical: value => { critical = value; }, write: () => host.metadataStorage.setItem('neutral-state', 'new prepared value') };
}
function retainsOldTarget(e) {
  assert.equal(e.host.metadataStorage.getItem('neutral-state'), 'old committed value');
  assert.ok(e.events.targets.every(value => value === 'old committed value'));
  assert.ok(e.events.temporaries.every(value => value === 'new prepared value'));
  assert.equal(e.events.writes.length, 1); assert.equal(new Set(e.events.renames.map(([from]) => from)).size, 1);
}
function onlySanitizedDiagnostics(host) {
  for (const row of host.ioDiagnostics) assert.deepEqual(Object.keys(row).sort(), ['code', 'errno', 'operation', 'syscall']);
}

test('Windows transient EPERM retries only the same prepared atomic rename within the held call', async t => {
  const e = await fixture(t, { renameFailure: attempt => attempt <= 2 ? fault('EPERM') : null, checkCritical: true });
  await e.host.storageLocks.request('native-publication-host-' + path.basename(e.root), { mode: 'exclusive' }, () => {
    e.setCritical(true); try { e.write(); } finally { e.setCritical(false); }
  });
  assert.equal(e.events.writes.length, 1); assert.equal(e.events.renames.length, 3);
  assert.equal(new Set(e.events.renames.map(([from]) => from)).size, 1);
  assert.ok(e.events.targets.every(value => value === 'old committed value')); assert.ok(e.events.temporaries.every(value => value === 'new prepared value'));
  assert.equal(e.host.metadataStorage.getItem('neutral-state'), 'new prepared value');
  assert.equal((await fs.readdir(path.join(e.root, 'metadata'))).length, 1);
  assert.equal(e.host.ioDiagnostics.filter(row => row.operation === 'metadata-rename-recovered').length, 1); onlySanitizedDiagnostics(e.host);
  t.diagnostic(JSON.stringify({ controlledWindowsEPERM: true, metadataWrites: 1, renameAttempts: 3, recoveredMetadataRenames: 1, actualAtomicReplacement: true }));
});

test('non-EPERM rename errors are never retried and retain the previous target', async t => {
  const error = fault('EACCES'), e = await fixture(t, { renameFailure: () => error });
  assert.throws(e.write, value => value === error); retainsOldTarget(e); assert.equal(e.events.renames.length, 1);
  assert.deepEqual(e.host.ioDiagnostics, [{ operation: 'metadata-rename', code: 'EACCES', errno: -5, syscall: 'rename' }]);
});

test('EPERM on another platform is not treated as the Windows sharing violation', async t => {
  const error = fault('EPERM'), e = await fixture(t, { platform: 'linux', renameFailure: () => error });
  assert.throws(e.write, value => value === error); retainsOldTarget(e); assert.equal(e.events.renames.length, 1); onlySanitizedDiagnostics(e.host);
});

test('permanent Windows EPERM stops at the bounded budget and preserves target and prepared bytes', async t => {
  const error = fault('EPERM'), e = await fixture(t, { renameFailure: () => error });
  const start = performance.now(); assert.throws(e.write, value => value === error); const elapsed = performance.now() - start;
  retainsOldTarget(e); assert.ok(e.events.renames.length > 1); assert.ok(e.events.renames.length <= 52);
  assert.ok(elapsed >= 200); assert.ok(e.events.times.at(-1) - e.events.times[0] < 275, 'No retry is scheduled outside the 250ms budget');
  assert.equal(e.host.ioDiagnostics.filter(row => row.operation === 'metadata-rename-recovered').length, 0);
  assert.equal(fss.readFileSync(e.events.writes[0], 'utf8'), 'new prepared value'); onlySanitizedDiagnostics(e.host);
  t.diagnostic(JSON.stringify({ permanentWindowsEPERM: true, metadataWrites: e.events.writes.length, renameAttempts: e.events.renames.length, oldTargetPreserved: true, retryBudgetMs: 250 }));
});

test('metadata write failure is returned unchanged without any rename or retry', async t => {
  const error = fault('EIO', 'write'), e = await fixture(t, { writeFailure: error });
  assert.throws(e.write, value => value === error); assert.equal(e.events.writes.length, 1); assert.equal(e.events.renames.length, 0);
  assert.equal(e.host.metadataStorage.getItem('neutral-state'), 'old committed value');
  assert.deepEqual(e.host.ioDiagnostics, [{ operation: 'metadata-write', code: 'EIO', errno: -5, syscall: 'write' }]);
});

test('a different error after transient EPERM ends recovery immediately and never replaces the old target', async t => {
  const first = fault('EPERM'), last = fault('EIO'), e = await fixture(t, { renameFailure: attempt => attempt === 1 ? first : last });
  assert.throws(e.write, value => value === last); retainsOldTarget(e); assert.equal(e.events.renames.length, 2);
  assert.equal(e.host.ioDiagnostics.filter(row => row.operation === 'metadata-rename-recovered').length, 0); onlySanitizedDiagnostics(e.host);
});
