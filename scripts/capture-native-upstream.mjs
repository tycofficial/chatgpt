/** Capture one observed public ChatGPT frontend release and its static dependency graph. */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { appendFile, mkdir, readFile, realpath, rename, statfs, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'acorn';
import { parseHTML } from 'linkedom';

const homepage = 'https://chatgpt.com/';
const mib = 1024 ** 2;
const metadataReserve = 20 * mib;
const maxFileBytes = 128 * mib;
const staticExtension = /\.(?:m?js|css|json|webmanifest|wasm|bin|data|svg|woff2?|ttf|otf|eot|png|jpe?g|webp|avif|gif|ico|mp3|mp4|m4a|ogg|wav|webm|xlsx|docx|pptx|task|icc|lottie|tgs|riv|br|gz)$/i;
const assetHosts = new Map([
  ['chatgpt.com', ['/cdn/assets/', '/_orbit-renderer/']],
  ['cdn.oaistatic.com', ['/']],
  ['persistent.oaistatic.com', ['/images/']],
  ['cdn.openai.com', ['/']],
]);
const args = process.argv.slice(2);
const flags = new Set(['--out', '--expected-build', '--concurrency', '--max-assets', '--max-bytes-mb', '--min-free-mb']);
const options = new Map();
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (options.has(flag)) throw Error(`Duplicate option ${flag}`);
  if (flag === '--resume' || flag === '--help') options.set(flag, true);
  else if (flags.has(flag) && args[index + 1] && !args[index + 1].startsWith('--')) options.set(flag, args[++index]);
  else throw Error(`Invalid option ${flag}`);
}
if (options.has('--help')) {
  console.log('node --use-env-proxy scripts/capture-native-upstream.mjs --out <directory> [--expected-build <sha>] [--concurrency 8] [--min-free-mb 160] [--max-assets N] [--max-bytes-mb N] [--resume]');
  process.exit(0);
}
function integer(flag, fallback, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  if (!options.has(flag)) return fallback;
  const value = Number(options.get(flag));
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw Error(`Invalid value for ${flag}`);
  return value;
}
const concurrency = integer('--concurrency', 8, 1, 16);
const maxAssets = integer('--max-assets', Infinity, 3);
const maxBytes = integer('--max-bytes-mb', Infinity, 1) * mib;
const reserveBytes = integer('--min-free-mb', 160, 64) * mib;
const expectedBuild = options.get('--expected-build');
const buildPattern = /^[a-f\d]{40}$/i;
if (expectedBuild && !buildPattern.test(expectedBuild)) throw Error('Expected build must be a full hexadecimal source identifier');
const output = path.resolve(options.get('--out') ?? '.test-output/upstream-capture');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const key = property => property?.key?.value ?? property?.key?.name;
const ownProperty = (node, name) => node?.properties?.find(property => key(property) === name)?.value;

function walk(node, visit) {
  visit(node);
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      for (const entry of child) if (entry?.type) walk(entry, visit);
    } else if (child?.type) walk(child, visit);
  }
}
function parseJS(text) {
  try { return parse(text, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch { return parse(text, { ecmaVersion: 'latest', sourceType: 'script' }); }
}
function assetURL(literal, base) {
  if (typeof literal !== 'string' || !literal || /^\s*(?:#|data:|blob:|mailto:|javascript:)/i.test(literal)) return null;
  let url;
  try { url = new URL(literal, base); } catch { return null; }
  const prefixes = assetHosts.get(url.hostname);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !prefixes?.some(prefix => url.pathname.startsWith(prefix)) || !staticExtension.test(url.pathname)) return null;
  // Limit filenames and query keys before making any request or logging any URL.
  if (!/^\/[\w/.-]+$/.test(url.pathname) || url.pathname.split('/').some(segment => segment === '.' || segment === '..') ||
      [...url.searchParams].some(([name, value]) => !['v','version','hash','build'].includes(name) || !/^[\w.-]{1,64}$/.test(value))) return null;
  url.hash = '';
  return url;
}
function publishedPath(literal) {
  return /^(?:https?:\/\/|\/\/|\/cdn\/assets\/|\/_orbit-renderer\/)/i.test(literal);
}
function staticString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0]?.value.cooked ?? null;
  if (node?.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left), right = staticString(node.right);
    if (left != null && right != null) return left + right;
  }
  return null;
}

async function responseAt(url, isShell = false) {
  for (let tryNumber = 0; ; tryNumber++) {
    let response;
    try { response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(45_000) }); }
    catch (cause) {
      if (tryNumber === 2) throw cause;
      await delay(500 * 2 ** tryNumber);
      continue;
    }
    if (response.status === 200) {
      if (!isShell && /(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('content-type') || '')) {
        await response.body?.cancel();
        throw Error('The static resource returned an HTML page');
      }
      return response;
    }
    await response.body?.cancel();
    if (tryNumber === 2 || ![408,429,500,502,503,504].includes(response.status)) throw Error(`HTTP ${response.status}`);
    const retryAfter = Number(response.headers.get('retry-after'));
    await delay(Math.max(500 * 2 ** tryNumber, Number.isFinite(retryAfter) ? Math.min(10000, retryAfter * 1000) : 0));
  }
}
async function readShell() {
  const response = await responseAt(homepage, true);
  const source = Buffer.from(await response.arrayBuffer());
  const { document } = parseHTML(source.toString('utf8'));
  const build = document.documentElement.dataset.build;
  if (!buildPattern.test(build ?? '')) throw Error('The public response does not contain an official frontend build identifier');
  const scripts = [...document.querySelectorAll('script[type="module"]:not([src])')].map(node => node.textContent);
  const shellModule = scripts.find(text => text.includes('__reactRouterRouteModules'));
  if (!shellModule) throw Error('The public frontend route bootstrap is missing');
  const bootstrap = parseJS(shellModule);
  const imports = new Map();
  let routeBindings;
  for (const node of bootstrap.body) {
    if (node.type === 'ImportDeclaration') for (const specifier of node.specifiers) imports.set(specifier.local.name, node.source.value);
    if (node.expression?.type === 'AssignmentExpression' && node.expression.left.property?.name === '__reactRouterRouteModules') routeBindings = node.expression.right;
  }
  const routes = Object.fromEntries((routeBindings?.properties ?? []).map(property => [key(property), imports.get(property.value.name)]));
  if (!Object.keys(routes).length || Object.values(routes).some(url => !assetURL(url, homepage))) throw Error('An initial route import could not be resolved');
  const manifest = bootstrap.body.filter(node => node.type === 'ImportDeclaration').map(node => assetURL(node.source.value, homepage))
    .find(url => url && /\/manifest-[a-f\d]+\.js$/i.test(url.pathname));
  if (!manifest) throw Error('The public route manifest is missing');
  return { document, build, manifest, scripts, routes, date: response.headers.get('date'), sha256: sha(source) };
}

/** Evaluate only this loader's constant filename expressions, without running vendor code. */
const objects = new WeakMap();
function staticValue(node, parameter, id) {
  switch (node?.type) {
    case 'Identifier': if (node.name === parameter) return id; break;
    case 'Literal': return node.value;
    case 'ConditionalExpression': return staticValue(node.test, parameter, id) ? staticValue(node.consequent, parameter, id) : staticValue(node.alternate, parameter, id);
    case 'BinaryExpression': {
      const left = staticValue(node.left, parameter, id), right = staticValue(node.right, parameter, id);
      if (node.operator === '===') return left === right;
      if (node.operator === '+' && left !== undefined && right !== undefined) return left + right;
      break;
    }
    case 'ObjectExpression': {
      if (!objects.has(node)) {
        const constants = new Map();
        for (const property of node.properties) {
          if (key(property) == null || property.value?.type !== 'Literal') throw Error('A filename lookup contains a computed expression');
          constants.set(String(key(property)), property.value.value);
        }
        objects.set(node, constants);
      }
      return objects.get(node);
    }
    case 'MemberExpression': {
      const target = staticValue(node.object, parameter, id);
      if (target instanceof Map && node.computed) return target.get(String(staticValue(node.property, parameter, id)));
      break;
    }
  }
  throw Error(`Unsupported filename expression ${node?.type ?? 'missing'}`);
}
function inspectResolver(program, runtimeURL, register) {
  let runtimeName, assetBase;
  const resolvers = new Map();
  const aliases = new Map();
  for (const node of program.body) for (const item of node.specifiers ?? []) {
    if (node.type === 'ExportNamedDeclaration' && item.exported.name === '__webpack_require__') runtimeName = item.local.name;
  }
  if (!runtimeName) throw Error('Runtime does not export the observed loader');
  for (const node of program.body) for (const item of node.declarations ?? []) {
    if (item.id.type === 'Identifier' && item.init?.type === 'Identifier') aliases.set(item.id.name, item.init.name);
  }
  const exposedNames = new Set([runtimeName]);
  while (aliases.has(runtimeName) && !exposedNames.has(aliases.get(runtimeName))) {
    runtimeName = aliases.get(runtimeName);
    exposedNames.add(runtimeName);
  }
  walk(program, node => {
    if (node.type !== 'AssignmentExpression' || node.left.object?.name !== runtimeName) return;
    const field = node.left.property?.name;
    if (field === 'p' && staticString(node.right)) assetBase = new URL(staticString(node.right), runtimeURL);
    if (!['u','miniCssF'].includes(field) || node.right.type !== 'ArrowFunctionExpression') return;
    const parameter = node.right.params[0]?.name;
    if (!parameter) return;
    const ids = new Set();
    walk(node.right.body, candidate => {
      if (candidate.type === 'ObjectExpression') for (const item of candidate.properties) {
        if (/^\d+$/.test(String(key(item)))) ids.add(Number(key(item)));
      }
      if (candidate.type === 'BinaryExpression' && candidate.operator === '===') {
        for (const [identifier, constant] of [[candidate.left, candidate.right], [candidate.right, candidate.left]]) {
          if (identifier.name === parameter && Number.isSafeInteger(constant.value)) ids.add(constant.value);
        }
      }
    });
    if (ids.size > (resolvers.get(field)?.ids.size ?? 0)) resolvers.set(field, { ids, parameter, body: node.right.body });
  });
  if (!assetBase || !resolvers.has('u') || !resolvers.has('miniCssF')) throw Error('The original public path, script map, or stylesheet map is missing');
  const output = { publicPath: assetBase.href };
  for (const [field, type] of [['u', 'js'], ['miniCssF', 'css']]) {
    const { ids, parameter, body } = resolvers.get(field);
    const urls = new Set();
    for (const id of [...ids].sort((left, right) => left - right)) {
      const filename = staticValue(body, parameter, id);
      const url = assetURL(filename, assetBase);
      if (!url || !url.pathname.endsWith('.' + type)) throw Error(`Invalid official ${type} filename for chunk ${id}`);
      register(url, runtimeURL, 'runtime-' + type, id);
      urls.add(url.href);
    }
    output[type] = { ids: ids.size, distinctAssets: urls.size };
  }
  return output;
}

const shell = await readShell();
if (expectedBuild && expectedBuild.toLowerCase() !== shell.build.toLowerCase()) throw Error(`Expected ${expectedBuild} but the public shell returned ${shell.build}`);
await mkdir(output, { recursive: true });
const resolvedOutput = await realpath(output);
const stage = path.join(resolvedOutput, shell.build);
const journal = path.join(stage, 'capture-journal.jsonl');
const free = async () => { const stats = await statfs(resolvedOutput); return Number(stats.bavail) * Number(stats.bsize); };
const initialFreeBytes = await free();
if (initialFreeBytes <= reserveBytes + metadataReserve) throw Error(`Available disk bytes ${initialFreeBytes} are below the requested reserve`);
const captureBudget = Math.min(maxBytes, initialFreeBytes - reserveBytes - metadataReserve);
const header = { type: 'capture', schemaVersion: 1, build: shell.build, manifest: shell.manifest.href, origin: homepage };
const prior = new Map();
if (options.has('--resume')) {
  const lines = (await readFile(journal, 'utf8')).split('\n');
  if (JSON.stringify(JSON.parse(lines.shift())) !== JSON.stringify(header)) throw Error('The existing staging journal belongs to a different official graph');
  for (const line of lines) {
    if (!line) continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (row.type === 'asset' && assetURL(row.url, homepage)?.href === row.url && /^[a-f\d]{64}$/.test(row.sha256) && Number.isSafeInteger(row.bytes)) prior.set(row.url, row);
  }
} else {
  await mkdir(stage);
  await writeFile(journal, JSON.stringify(header) + '\n', { flag: 'wx' });
}

const known = new Map(), links = [], linkKeys = new Set(), completed = new Map(), failed = new Map(), unresolved = [];
let written = 0, attempts = 0, exhausted = null, entryUrl, runtimeUrl, sourceVersion, loader, entryModules;
let journalWrites = Promise.resolve();
const queue = [];
function add(url, from, relation, chunkId) {
  if (!known.has(url.href)) { known.set(url.href, url); queue.push(url); }
  const source = typeof from === 'string' ? from : from.href;
  const identity = `${source}\n${url.href}\n${relation}\n${chunkId ?? ''}`;
  if (linkKeys.has(identity)) return;
  linkKeys.add(identity);
  links.push({ from: source, to: url.href, relation, ...(chunkId == null ? {} : { chunkId }) });
}
function discover(value, base, from, relation) {
  const url = assetURL(value, base);
  if (url) add(url, from, relation);
  // Omitted external links, data URLs and API destinations are outside the public static graph.
}
function cssReferences(source, url) {
  for (const match of source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:url\(\s*["']?([^"'()\s]+)|@import\s+["']([^"']+))/gi)) {
    discover(match[1] ?? match[2], url, url, 'stylesheet-reference');
  }
}
function javascriptReferences(program, url) {
  walk(program, node => {
    const literal = staticString(node.source);
    if (literal && ['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)) discover(literal, url, url, 'module-reference');
    else if (node.type === 'NewExpression' && node.callee.name === 'URL') {
      const value = staticString(node.arguments[0]), base = node.arguments[1];
      let actualBase;
      const staticBase = staticString(base);
      if (staticBase && /^https:\/\//.test(staticBase)) actualBase = staticBase;
      if (base?.type === 'MemberExpression' && base.object?.type === 'MetaProperty' && base.object.meta.name === 'import' && base.property.name === 'url') actualBase = url;
      if (value && (actualBase || publishedPath(value))) discover(value, actualBase ?? url, url, 'constructed-static-url');
    } else {
      const value = staticString(node);
      if (value && publishedPath(value)) discover(value, url, url, 'public-static-literal');
    }
  });
}
add(shell.manifest, homepage, 'shell-manifest');
for (const element of shell.document.querySelectorAll('script[src],link[href],img[src],source[src],video[poster]')) {
  discover(element.getAttribute('src') ?? element.getAttribute('href') ?? element.getAttribute('poster'), homepage, homepage, 'shell-resource');
}
for (const element of shell.document.querySelectorAll('img[srcset],source[srcset]')) {
  for (const source of element.getAttribute('srcset').split(',')) discover(source.trim().split(/\s+/)[0], homepage, homepage, 'shell-resource');
}
for (const value of Object.values(shell.routes)) discover(value, homepage, homepage, 'initial-route-module');
for (const script of shell.scripts) {
  try { javascriptReferences(parseJS(script), new URL(homepage)); }
  catch { unresolved.push({ source: homepage, reason: 'An inline static module could not be parsed' }); }
}

async function analyze(url, file) {
  const type = path.posix.extname(url.pathname).toLowerCase();
  if (!['.js','.mjs','.css','.json','.webmanifest','.svg'].includes(type)) return;
  const text = await readFile(file, 'utf8');
  if (type === '.css') { cssReferences(text, url); return; }
  if (type === '.svg') {
    for (const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) discover(match[1], url, url, 'svg-reference');
    cssReferences(text, url);
    return;
  }
  if (type === '.json' || type === '.webmanifest') {
    const values = [JSON.parse(text)];
    while (values.length) {
      const value = values.pop();
      if (value && typeof value === 'object') values.push(...Object.values(value));
      else if (typeof value === 'string') discover(value, url, url, 'static-json-reference');
    }
    return;
  }
  const program = parseJS(text);
  javascriptReferences(program, url);
  if (url.href === shell.manifest.href) {
    const root = program.body.find(node => node.expression?.type === 'AssignmentExpression' && node.expression.left.property?.name === '__reactRouterManifest')?.expression.right;
    sourceVersion = staticString(ownProperty(root, 'version'));
    entryUrl = assetURL(staticString(ownProperty(ownProperty(root, 'entry'), 'module')), url);
    if (!sourceVersion || !url.pathname.endsWith(`/manifest-${sourceVersion}.js`) || !entryUrl || !ownProperty(root, 'routes')) throw Error('The route manifest does not identify an exact release entry');
    add(entryUrl, url, 'manifest-entry');
  }
  if (url.href === entryUrl?.href) {
    const imports = program.body.filter(node => node.type === 'ImportDeclaration');
    entryModules = imports.map(node => assetURL(node.source.value, url)?.href).filter(Boolean);
    const binding = imports.find(node => node.specifiers.some(specifier => specifier.imported?.name === '__webpack_require__'));
    runtimeUrl = assetURL(binding?.source.value, url);
    if (!runtimeUrl) throw Error('The official entry does not identify its public runtime');
    add(runtimeUrl, url, 'entry-runtime');
  }
  if (url.href === runtimeUrl?.href) loader = inspectResolver(program, url, add);
}

async function digestFile(file) {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest('hex') };
}
const destinationWrites = new Map();
class SpaceLimit extends Error {}
async function download(url) {
  const relative = ['public', url.hostname, ...url.pathname.split('/').filter(Boolean)].join('/');
  const destination = path.resolve(stage, relative);
  if (!destination.startsWith(stage + path.sep)) throw Error('Static asset destination escaped the staged release');
  const previous = prior.get(url.href);
  if (previous?.path === relative) {
    try {
      const actual = await digestFile(destination);
      if (actual.bytes === previous.bytes && actual.sha256 === previous.sha256) {
        destinationWrites.set(destination, { sha: actual.sha256, operation: Promise.resolve() });
        return previous;
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const response = await responseAt(url);
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxFileBytes) { await response.body?.cancel(); throw Error('The public asset exceeds the per-file limit'); }
  if (!response.body) throw Error('The public asset has no body');
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = destination + '.' + attempts.toString() + '.' + crypto.randomUUID() + '.partial';
  const hash = createHash('sha256');
  let bytes = 0, temporaryAccounted = true;
  try {
    await pipeline(Readable.fromWeb(response.body), new Transform({
      transform(chunk, _encoding, callback) {
        if (bytes + chunk.length > maxFileBytes) return callback(Error('The public asset exceeds the per-file limit'));
        if (written + chunk.length > captureBudget) return callback(new SpaceLimit('The release exceeds the available capture space'));
        bytes += chunk.length; written += chunk.length; hash.update(chunk);
        callback(null, chunk);
      },
    }), createWriteStream(temporary, { flags: 'wx' }));
    const sha256 = hash.digest('hex');
    const previousWrite = destinationWrites.get(destination);
    if (previousWrite && previousWrite.sha !== sha256) throw Error('Two published URLs disagree on the expected asset bytes');
    if (previousWrite) {
      await previousWrite.operation;
      await unlink(temporary);
      written -= bytes;
    } else {
      const operation = rename(temporary, destination);
      destinationWrites.set(destination, { sha: sha256, operation });
      try { await operation; }
      catch (error) { destinationWrites.delete(destination); throw error; }
    }
    temporaryAccounted = false;
    const result = { type: 'asset', url: url.href, path: relative, bytes, sha256, contentType: response.headers.get('content-type') };
    journalWrites = journalWrites.then(() => appendFile(journal, JSON.stringify(result) + '\n'));
    await journalWrites;
    return result;
  } catch (error) {
    await unlink(temporary).catch(() => {});
    if (temporaryAccounted) written -= bytes;
    throw error;
  }
}

async function collect(url) {
  attempts++;
  let item;
  try { item = await download(url); }
  catch (error) {
    if (error instanceof SpaceLimit) exhausted = error.message;
    failed.set(url.href, { url: url.href, reason: error.message });
    return;
  }
  completed.set(url.href, item);
  try { await analyze(url, path.join(stage, item.path)); }
  catch (error) { unresolved.push({ source: url.href, reason: error.message }); }
}
// Follow only the values observed from the root, its manifest, and its entry before scanning the remainder.
await collect(shell.manifest);
if (entryUrl) await collect(entryUrl);
if (runtimeUrl) await collect(runtimeUrl);
for (let cursor = 0; cursor < queue.length && attempts < maxAssets && !exhausted;) {
  if (await free() <= reserveBytes + metadataReserve) { exhausted = 'The free disk reserve was reached'; break; }
  const batch = [];
  while (cursor < queue.length && batch.length < concurrency && attempts + batch.length < maxAssets) {
    const next = queue[cursor++];
    if (!completed.has(next.href) && !failed.has(next.href)) batch.push(next);
  }
  await Promise.all(batch.map(collect));
  if (attempts % 100 < concurrency && maxAssets === Infinity) console.log(JSON.stringify({ captured: completed.size, discovered: known.size, failed: failed.size, written }));
}
const pending = [...known.keys()].filter(url => !completed.has(url) && !failed.has(url));
const diagnostic = maxAssets !== Infinity || maxBytes !== Infinity;
if (!exhausted && pending.length && attempts >= maxAssets) exhausted = `Diagnostic asset limit reached (${maxAssets})`;
let currentAtCompletion = null;
if (!diagnostic && !pending.length && !failed.size && !unresolved.length && loader) {
  try {
    const latest = await readShell();
    currentAtCompletion = latest.build === shell.build && latest.manifest.href === shell.manifest.href;
  } catch (error) { unresolved.push({ source: homepage, reason: 'Could not recheck the public release: ' + error.message }); }
}
const complete = !diagnostic && !pending.length && !failed.size && !unresolved.length && !exhausted && Boolean(loader) && currentAtCompletion === true;
const result = {
  schemaVersion: 1, status: complete ? 'complete' : 'incomplete',
  scope: 'Public shell bootstrap, versioned manifest, original runtime filename maps, and public static references discovered from captured resources',
  sourceBuild: shell.build, sourceVersion: sourceVersion ?? null, currentAtCompletion,
  shell: { date: shell.date, sha256: shell.sha256, origin: homepage, manifest: shell.manifest.href },
  entry: entryUrl?.href ?? null, entryModules: entryModules ?? [], runtime: runtimeUrl?.href ?? null, initialRoutes: shell.routes, loader: loader ?? null,
  limits: { maxAssets: Number.isFinite(maxAssets) ? maxAssets : null, maxBytes: Number.isFinite(maxBytes) ? maxBytes : null, reserveBytes, initialFreeBytes, captureBudget, stoppedBy: exhausted },
  discoveredAssets: known.size, capturedAssets: completed.size, capturedBytes: [...completed.values()].reduce((total, item) => total + item.bytes, 0),
  assets: [...completed.values()].sort((left, right) => left.url.localeCompare(right.url)), links, pending, failed: [...failed.values()], unresolved,
};
const partialManifest = path.join(stage, 'capture-manifest.' + crypto.randomUUID() + '.partial');
await writeFile(partialManifest, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
await rename(partialManifest, path.join(stage, 'capture-manifest.json'));
console.log(JSON.stringify({ status: result.status, stage, sourceBuild: shell.build, sourceVersion: sourceVersion ?? null, loader: loader ?? null,
  captured: completed.size, discovered: known.size, pending: pending.length, failed: failed.size, unresolved: unresolved.length, stoppedBy: exhausted }));
if (!complete) process.exitCode = 1;
