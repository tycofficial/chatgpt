/** Adopt the assets from one verified public capture into the native build inputs. */
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const [captureDirectory] = process.argv.slice(2);
if (!captureDirectory || process.argv.length !== 3) throw Error('Usage: node scripts/adopt-native-upstream.mjs <completed-capture-directory>');
const captureRoot = await realpath(captureDirectory);
const checkout = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const archive = path.join(checkout, 'original-client');
const publicDirectory = path.join(archive, 'public');
const nonce = randomUUID();
const manifestBytes = await readFile(path.join(captureRoot, 'capture-manifest.json'));
const source = JSON.parse(manifestBytes.toString('utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (source.schemaVersion !== 1 || source.status !== 'complete' || source.currentAtCompletion !== true ||
    source.pending?.length !== 0 || source.failed?.length !== 0 || source.unresolved?.length !== 0 ||
    source.assets?.length !== source.discoveredAssets || !source.loader?.js?.ids || !source.loader?.css?.ids ||
    !/^[a-f\d]{40}$/.test(source.sourceBuild) || path.basename(captureRoot) !== source.sourceBuild) {
  throw Error('The capture has not verified closure for one current official build');
}

const assetHosts = new Set(['chatgpt.com', 'cdn.oaistatic.com', 'persistent.oaistatic.com', 'cdn.openai.com']);
const approvedFrames = new Set(source.links.filter(link => link.relation === 'orbit-renderer-factory').map(link => link.to));
const compiledFramePath = /^\/_orbit-renderer\/assets\/orbit-character-[a-f\d]{16}\/[a-f\d]{16}\/frame\.html$/i;
function validate(asset) {
  const url = new URL(asset.url);
  const expected = 'public/' + url.hostname + url.pathname;
  const isFrame = url.hostname === 'chatgpt.com' && compiledFramePath.test(url.pathname) && approvedFrames.has(url.href);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !assetHosts.has(url.hostname) ||
      !/^\/[\w/.-]+$/.test(url.pathname) || (url.hostname === 'chatgpt.com' && !/^\/(?:cdn\/assets|_orbit-renderer)\//.test(url.pathname)) ||
      (url.pathname.toLowerCase().endsWith('.html') || /text\/html/i.test(asset.contentType ?? '')) && !isFrame ||
      asset.path !== expected || !/^[a-f\d]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 0) {
    throw Error('The capture includes an invalid static asset');
  }
  return asset;
}
const assets = new Map(source.assets.map(asset => [asset.url, validate(asset)]));
if (assets.size !== source.discoveredAssets || source.links?.some(link => !assets.has(link.to))) throw Error('The captured dependency edges do not match the captured asset set');
const paths = new Map();
for (const asset of assets.values()) {
  const sibling = paths.get(asset.path);
  if (sibling && sibling.sha256 !== asset.sha256) throw Error('Two captured URLs disagree on the same static path');
  paths.set(asset.path, asset);
}
const rendererPrefix = 'public/chatgpt.com/';
const rendererAssets = [...paths.values()].filter(asset => asset.path.startsWith(rendererPrefix + '_orbit-renderer/'));
if (!approvedFrames.size || [...approvedFrames].some(url => !assets.has(url))) throw Error('The verified capture does not contain the native Dot renderer');
const rendererManifest = {
  format: 'exact-public-dot-renderer-v1', sourceBuild: source.sourceBuild,
  assets: rendererAssets.map(({ url, path, bytes, sha256 }) => ({ url, path: path.slice(rendererPrefix.length), bytes, sha256 })),
  summary: { count: rendererAssets.length, pending: 0 }, failures: [],
};

function appAsset(value) {
  const url = new URL(value, source.shell.origin);
  if (!assets.has(url.href) || url.origin !== 'https://chatgpt.com' || !url.pathname.startsWith('/cdn/assets/')) throw Error('A native shell dependency is absent from the captured release: ' + url.pathname);
  return url.pathname;
}
const runtime = appAsset(source.runtime);
const manifest = appAsset(source.shell.manifest);
const entry = appAsset(source.entry);
const initialRoutes = Object.fromEntries(Object.entries(source.initialRoutes).map(([name, value]) => [name, appAsset(value)]));
const stylesheetLinks = [...new Set(source.shell.stylesheets ?? [])];
if (stylesheetLinks.length !== 1) throw Error('The public shell did not identify one primary stylesheet');
const stylesheet = appAsset(stylesheetLinks[0]);
if (!source.shell.iconSprite || !source.links.some(link => link.from === source.shell.origin && link.relation === 'shell-icon-sprite' && link.to === source.shell.iconSprite)) throw Error('The verified public graph does not identify its shell icon sprite');
const iconSprite = appAsset(source.shell.iconSprite);

const entrySource = await readFile(path.join(captureRoot, assets.get(source.entry).path));
if (sha(entrySource) !== assets.get(source.entry).sha256) throw Error('The official entry changed after capture');
const entryText = entrySource.toString('utf8');
const parser = { ecmaVersion: 'latest', sourceType: 'module' };
const program = parse(entryText, parser);
const bindings = program.body.filter(node => node.type === 'ImportDeclaration');
const ordered = bindings.map(node => new URL(node.source.value, source.entry).href);
if (source.entryModules?.length && JSON.stringify(ordered) !== JSON.stringify(source.entryModules)) throw Error('The entry no longer matches the captured import order');
const runtimeImport = bindings.find(node => node.specifiers.some(specifier => specifier.imported?.name === '__webpack_require__'));
const runtimeAlias = runtimeImport?.specifiers.find(specifier => specifier.imported?.name === '__webpack_require__')?.local.name;
const terminal = program.body.at(-1), declaration = program.body.at(-2);
const mountDeclaration = declaration?.declarations?.length === 1 ? declaration.declarations[0] : null;
const mount = mountDeclaration?.init;
const argument = mount?.arguments?.[0];
if (!runtimeAlias || appAsset(new URL(runtimeImport.source.value, source.entry)) !== runtime ||
    terminal?.expression?.type !== 'AwaitExpression' || terminal.expression.argument.name !== mountDeclaration?.id.name ||
    mount?.type !== 'CallExpression' || mount.callee.name !== runtimeAlias || argument?.type !== 'AssignmentExpression' ||
    argument.left.object?.name !== runtimeAlias || argument.left.property?.name !== 's' || typeof argument.right.value !== 'string') {
  throw Error('The original entry no longer matches the anchored deferred mount transform');
}
const registrations = [];
const edits = [{ start: declaration.start, end: terminal.end, replacement: `export const startOriginalClient=()=>${entryText.slice(mount.start, mount.end)};` }];
for (const [index, node] of bindings.entries()) {
  const dependency = appAsset(ordered[index]);
  if (dependency !== entry && dependency !== runtime) registrations.push(dependency);
  edits.push({ start: node.source.start, end: node.source.end, replacement: JSON.stringify(dependency === entry ? '/__prototype/entry-library.mjs' : dependency) });
}
if (edits.filter(edit => edit.replacement.includes('/__prototype/entry-library.mjs')).length !== 1) throw Error('The original entry self-registration changed');
let deferredEntry = entryText;
for (const edit of edits.sort((a, b) => b.start - a.start)) deferredEntry = deferredEntry.slice(0, edit.start) + edit.replacement + deferredEntry.slice(edit.end);
parse(deferredEntry, parser);

const graph = {
  format: 'original-public-static-resources/v1', sourceBuild: source.sourceBuild, manifest, runtime, initialRoutes,
  captureSha256: sha(manifestBytes), assets: source.assets.map(({ url, path, bytes, sha256 }) => ({ url, path, bytes, sha256 })),
  coverage: { enumerableStaticGraphVerified: true, downloadedPublicAssets: assets.size, frontendExecutionVerified: false, allInteractionsVerified: false },
};
const graphBytes = JSON.stringify(graph, null, 2) + '\n';
const plan = {
  schemaVersion: 1, sourceBuild: source.sourceBuild, sourceVersion: source.sourceVersion,
  sourceEntrySha256: assets.get(source.entry).sha256, assetManifestSha256: sha(graphBytes),
  runtime, manifest, stylesheet, iconSprite, initialRoutes,
  registrationEntry: './entry-library.mjs', registrationChunks: registrations, startModule: argument.right.value,
  mountMode: 'client', status: 'verified-public-static-graph-with-local-service-adapter',
};

const intake = path.join(archive, '.adopt-' + nonce);
const backupRoot = path.join(checkout, '.test-output');
const backup = path.join(backupRoot, 'previous-public-' + nonce);
await mkdir(intake);
await mkdir(backupRoot, { recursive: true });
const rows = [...paths.values()];
async function verify(file, expected) {
  const digest = createHash('sha256');
  let size = 0;
  for await (const bytes of createReadStream(file)) { size += bytes.length; digest.update(bytes); }
  if (size !== expected.bytes || digest.digest('hex') !== expected.sha256) throw Error('Captured asset digest mismatch: ' + expected.url);
}
let cursor = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (cursor < rows.length) {
    const asset = rows[cursor++];
    const from = await realpath(path.join(captureRoot, asset.path));
    const destination = path.join(intake, asset.path);
    if (!from.startsWith(captureRoot + path.sep) || !destination.startsWith(intake + path.sep)) throw Error('Captured path escaped its staging directory');
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(from, destination);
    await verify(destination, asset);
  }
}));
for (const asset of rendererManifest.assets) {
  const from = path.join(intake, rendererPrefix, asset.path);
  const target = path.join(intake, asset.path);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(from, target);
  await verify(target, asset);
}
const metadata = [
  [path.join(archive, 'resource-manifest.json'), graphBytes],
  [path.join(archive, 'dot-renderer-manifest.json'), JSON.stringify(rendererManifest, null, 2) + '\n'],
  [path.join(checkout, 'src/native-client/entry-plan.json'), JSON.stringify(plan, null, 2) + '\n'],
  [path.join(checkout, 'src/native-client/entry-library.mjs'), deferredEntry],
];
for (const [file, bytes] of metadata) await writeFile(file + '.' + nonce + '.partial', bytes, { flag: 'wx' });
const rendererDirectory = path.join(checkout, '_orbit-renderer');
const rotations = [
  { target: publicDirectory, staged: path.join(intake, 'public'), backup },
  { target: rendererDirectory, staged: path.join(intake, '_orbit-renderer'), backup: backup + '-renderer' },
  ...metadata.map(([file], index) => ({ target: file, staged: file + '.' + nonce + '.partial', backup: backup + '-metadata-' + index })),
];
if (await realpath(backupRoot) !== backupRoot) throw Error('The backup must remain in the native checkout');
for (const { target, staged } of rotations) {
  if (await realpath(target) !== target || await realpath(staged) !== staged) throw Error('A staged or published path resolves outside its expected location');
}
const applied = [];
try {
  for (const record of rotations) {
    await rename(record.target, record.backup);
    applied.push(record);
    await rename(record.staged, record.target);
    record.installed = true;
  }
} catch (cause) {
  for (const record of applied.reverse()) {
    if (record.installed) await rename(record.target, record.staged);
    await rename(record.backup, record.target);
  }
  throw cause;
}
const bytes = rows.reduce((total, asset) => total + asset.bytes, 0);
const largest = rows.reduce((maximum, asset) => asset.bytes > maximum.bytes ? asset : maximum);
console.log(JSON.stringify({ sourceBuild: plan.sourceBuild, sourceVersion: plan.sourceVersion, captureSha256: graph.captureSha256,
  files: rows.length, bytes, rendererFiles: rendererAssets.length, largest: { path: largest.path, bytes: largest.bytes }, previousArchive: backup }));
