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
const staticExtension = /\.(?:m?js|css|json|webmanifest|wasm|onnx|bin|data|svg|woff2?|ttf|otf|eot|png|jpe?g|webp|avif|gif|ico|mp3|mp4|m4a|ogg|wav|webm|xlsx|docx|pptx|task|icc|lottie|tgs|riv|br|gz)$/i;
const rendererPackage = /^\/_orbit-renderer\/assets\/orbit-character-[a-f\d]{16}\/(.+)$/;
const rendererFrame = /^[a-f\d]{16}\/frame\.html$/;
const rendererLicense = /^[a-f\d]{16}\/THIRD_PARTY_NOTICES\.txt$/;
const rendererSelector = /^[a-f\d]{16}\/runtime\.mjs$/;
const rendererEngine = /^runtime\/(?:single-thread\/)?orbit-characters\.mjs$/;
const assetHosts = new Map([
  ['chatgpt.com', ['/cdn/assets/', '/_orbit-renderer/']],
  ['cdn.oaistatic.com', ['/']],
  ['persistent.oaistatic.com', ['/images/', '/voice/silero-vad-']],
  ['cdn.openai.com', ['/']],
]);
const args = process.argv.slice(2);
const flags = new Set(['--out', '--expected-build', '--concurrency', '--max-assets', '--max-bytes-mb', '--min-free-mb']);
const options = new Map();
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (options.has(flag)) throw Error(`Duplicate option ${flag}`);
  if (flag === '--resume' || flag === '--public-interactions' || flag === '--help') options.set(flag, true);
  else if (flags.has(flag) && args[index + 1] && !args[index + 1].startsWith('--')) options.set(flag, args[++index]);
  else throw Error(`Invalid option ${flag}`);
}
if (options.has('--help')) {
  console.log('node --use-env-proxy scripts/capture-native-upstream.mjs --out <directory> [--expected-build <sha>] [--concurrency 8] [--min-free-mb 160] [--max-assets N] [--max-bytes-mb N] [--resume] [--public-interactions]');
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
function rendererPath(url) {
  if (url?.origin !== 'https://chatgpt.com' || url.search) return '';
  return rendererPackage.exec(url.pathname)?.[1] ?? '';
}
function assetURL(literal, base) {
  if (typeof literal !== 'string' || !literal || /^\s*(?:#|data:|blob:|mailto:|javascript:)/i.test(literal)) return null;
  let url;
  try { url = new URL(literal, base); } catch { return null; }
  const prefixes = assetHosts.get(url.hostname);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !prefixes?.some(prefix => url.pathname.startsWith(prefix))) return null;
  if (!staticExtension.test(url.pathname)) {
    const rendererFile = rendererPath(url);
    if (!rendererFrame.test(rendererFile) && !rendererLicense.test(rendererFile)) return null;
  }
  // Limit filenames and query keys before making any request or logging any URL.
  if (!/^\/[\w/.-]+$/.test(url.pathname) || url.pathname.split('/').some(segment => segment === '.' || segment === '..') ||
      [...url.searchParams].some(([name, value]) => !['v','version','hash','build'].includes(name) || !/^[\w.-]{1,64}$/.test(value))) return null;
  url.hash = '';
  if (!url.search) url.search = '';
  return url;
}
function publishedPath(literal) {
  return /^(?:https?:\/\/|\/\/|\/cdn\/assets\/|\/_orbit-renderer\/)/i.test(literal);
}
function staticString(node, bindings) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'Identifier') return bindings?.get(node.name) ?? null;
  if (node?.type === 'TemplateLiteral') {
    if (!node.expressions.length) return node.quasis[0]?.value.cooked ?? null;
    if (!bindings) return null;
    let value = node.quasis[0].value.cooked;
    for (const [index, expression] of node.expressions.entries()) {
      const resolved = staticString(expression, bindings);
      if (resolved == null) return null;
      value += resolved + node.quasis[index + 1].value.cooked;
    }
    return value;
  }
  if (node?.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left, bindings), right = staticString(node.right, bindings);
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
      const html = /(?:text\/html|application\/xhtml\+xml)/i.test(response.headers.get('content-type') || '');
      const compiledFrame = rendererFrame.test(rendererPath(url));
      if (!isShell && html !== compiledFrame) {
        await response.body?.cancel();
        throw Error(compiledFrame ? 'The compiled renderer frame did not return HTML' : 'The static resource returned an HTML page');
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
  const spriteReference = document.documentElement.getAttribute('data-icon-sprite-url');
  const iconSprite = assetURL(spriteReference, homepage);
  if (spriteReference && !iconSprite) throw Error('The public icon sprite could not be resolved');
  const stylesheets = [...document.querySelectorAll('link[rel~="stylesheet"][href]')]
    .map(link => assetURL(link.getAttribute('href'), homepage)?.href).filter(Boolean);
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
  return { document, build, manifest, iconSprite, stylesheets, scripts, routes, date: response.headers.get('date'), sha256: sha(source) };
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
  const rendererFile = rendererPath(url);
  // Only the compiled frame factory can introduce HTML, and only that frame links its notice.
  if (url && !rendererFrame.test(rendererFile) && !rendererLicense.test(rendererFile)) add(url, from, relation);
  // Omitted external links, data URLs and API destinations are outside the public static graph.
}
function cssReferences(source, url) {
  for (const match of source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:url\(\s*["']?([^"'()\s]+)|@import\s+["']([^"']+))/gi)) {
    discover(match[1] ?? match[2], url, url, 'stylesheet-reference');
  }
}
const onnxFallbackName = 'ort-wasm-simd-threaded.wasm';
const onnxFallbackSources = new Set();
const sileroSelections = new Map();
function isMember(node, name) {
  return node?.type === 'MemberExpression' && !node.computed && node.property.name === name;
}
function variableValue(statements, name) {
  return statements?.flatMap(statement => (statement.declaration ?? statement).declarations ?? [])
    .find(declaration => declaration.id.name === name)?.init;
}
function returnedValue(fn) {
  return fn?.body?.type === 'BlockStatement'
    ? fn.body.body.find(statement => statement.type === 'ReturnStatement')?.argument
    : fn?.body;
}
function isRouterBasename(expression) {
  const source = expression?.callee?.object;
  const dataset = source?.left?.object;
  const html = dataset?.object;
  return isMember(expression?.callee, 'replace') &&
    expression.arguments[0]?.regex?.pattern === '\\/$' && staticString(expression.arguments[1]) === '' &&
    source?.operator === '??' && staticString(source.right) === '' &&
    isMember(source.left, 'routerBasename') && isMember(dataset, 'dataset') &&
    isMember(html, 'documentElement') && html.object.name === 'document';
}
function inspectRendererFrameFactory(factory, url) {
  const frames = new Map();
  walk(factory, node => {
    if (!['FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) return;
    const result = returnedValue(node);
    let pathname = staticString(result);
    if (result?.type === 'TemplateLiteral' && result.expressions.length === 1 && result.quasis[0].value.cooked === '') {
      const basename = result.expressions[0];
      if (basename.type === 'Identifier' && isRouterBasename(variableValue(node.body.body, basename.name))) {
        pathname = staticString(result, new Map([[basename.name, '']]));
      }
    }
    const target = assetURL(pathname, url);
    if (rendererFrame.test(rendererPath(target))) frames.set(target.href, target);
  });
  if (frames.size !== 1) throw Error('The native Dot renderer factory does not identify one compiled frame');
  add(frames.values().next().value, url, 'orbit-renderer-factory');
}
function rendererHtmlReferences(source, url) {
  const { document } = parseHTML(source);
  if (!document.querySelector('canvas#character') || !document.querySelector('script[type="module"][src]') ||
      document.querySelector('script:not([src]), form')) throw Error('The renderer URL did not return a compiled frame');
  const packageBase = new URL('../', url).href;
  for (const element of document.querySelectorAll('script[src], link[href]')) {
    const target = assetURL(element.getAttribute('src') ?? element.getAttribute('href'), url);
    if (!target?.href.startsWith(packageBase) || rendererFrame.test(rendererPath(target))) {
      throw Error('The compiled frame references an asset outside its package');
    }
    add(target, url, 'orbit-renderer-frame-resource');
  }
}
function rendererRuntimeReferences(program, url) {
  const selector = program.body.map(node => node.declaration ?? node)
    .find(node => node.type === 'FunctionDeclaration' && node.id.name === 'selectRuntime');
  const pathFunction = ownProperty(returnedValue(selector), 'path');
  const pathChoice = returnedValue(pathFunction);
  const filename = pathFunction?.params[0]?.name;
  const shared = staticString(pathChoice?.test?.right);
  const directory = pathChoice?.alternate?.left?.name;
  const directoryChoice = variableValue(selector?.body.body, directory);
  const fallback = staticString(variableValue(program.body, 'fallbackDirectory'));
  const extensions = variableValue(program.body, 'runtimeExtensions')?.elements?.map(node => staticString(node)) ?? [];
  if (pathChoice?.type !== 'ConditionalExpression' || pathChoice.test.operator !== '===' ||
      pathChoice.test.left.name !== filename || pathChoice.alternate.operator !== '+' ||
      pathChoice.alternate.right.name !== filename || !/^orbit-characters\.data$/.test(shared ?? '') ||
      directoryChoice?.type !== 'ConditionalExpression' || !fallback ||
      !['mjs', 'wasm', 'data'].every(extension => extensions.includes(extension)) ||
      extensions.some(extension => !['mjs', 'wasm', 'data'].includes(extension))) {
    throw Error('The original renderer runtime selector could not be resolved statically');
  }
  // Read both branches of the runtime selector and its shared package rule.
  const constants = new Map([['fallbackDirectory', fallback]]);
  const packageBase = new URL('../', url).href;
  for (const [expression, branch] of [
    [directoryChoice.consequent, 'threaded'],
    [directoryChoice.alternate, 'single-thread'],
  ]) {
    const selectedDirectory = staticString(expression, constants);
    for (const extension of extensions) {
      const file = shared.slice(0, -4) + extension;
      const path = file === shared ? pathChoice.consequent : pathChoice.alternate;
      const bindings = new Map([[directory, selectedDirectory], [filename, file]]);
      const target = assetURL(staticString(path, bindings), url);
      if (!selectedDirectory || !target?.href.startsWith(packageBase)) {
        throw Error('The renderer runtime path could not be resolved inside its package');
      }
      add(target, url, 'orbit-renderer-runtime-' + branch);
    }
  }
}
function rendererEngineReferences(program, url) {
  walk(program, node => {
    if (node.type === 'VariableDeclarator' && node.id.name === 'REMOTE_PACKAGE_BASE') {
      const filename = staticString(node.init);
      if (filename === 'orbit-characters.data') discover(filename, url, url, 'orbit-renderer-engine-package');
      return;
    }
    const target = node.arguments?.[0];
    if (node.type !== 'NewExpression' || node.callee.name !== 'Worker' ||
        target?.type !== 'CallExpression' || target.callee.name !== 'locateFile') return;
    const filename = staticString(target.arguments[0]);
    if (!/^[\w-]+\.mjs$/.test(filename ?? '')) throw Error('The renderer engine worker filename could not be resolved statically');
    discover(filename, url, url, 'orbit-renderer-engine-worker');
  });
}
function inspectOnnxFallback(node, url) {
  if (node.type !== 'ConditionalExpression' || !isMember(node.test, 'locateFile') || !isMember(node.alternate, 'href')) return;
  const fallback = node.alternate.object;
  const [name, base] = fallback.arguments ?? [];
  if (fallback.type === 'NewExpression' && fallback.callee.name === 'URL' && staticString(name) === onnxFallbackName &&
      isMember(base, 'url') && base.object.type === 'MetaProperty' && base.object.meta.name === 'import') onnxFallbackSources.add(url.href);
}
function javascriptReferences(program, url) {
  walk(program, node => {
    inspectOnnxFallback(node, url);
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
// Rspack emits static files as tiny factories returning its public path plus a filename.
const unresolvedPublicPathAssets = [];
function emittedAssetReferences(program, url) {
  const filenames = [];
  for (const node of program.body) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    for (const member of declaration?.declarations ?? []) {
      if (member.id.name !== '__webpack_modules__' || member.init?.type !== 'ObjectExpression') continue;
      for (const property of member.init.properties) {
        const factory = property.value;
        if (key(property) === 'OrBF') inspectRendererFrameFactory(factory, url);
        const [module, , require] = factory?.params ?? [];
        const assignment = factory?.body?.body?.length === 1 ? factory.body.body[0].expression : null;
        if (!module?.name || !require?.name || assignment?.type !== 'AssignmentExpression' || assignment.operator !== '=' ||
            assignment.left.type !== 'MemberExpression' || assignment.left.object.name !== module.name || assignment.left.property.name !== 'exports') continue;
        const value = assignment.right;
        if (value.type !== 'BinaryExpression' || value.operator !== '+' || value.left.type !== 'MemberExpression' ||
            value.left.object.name !== require.name || value.left.property.name !== 'p') continue;
        const filename = staticString(value.right);
        if (!filename?.startsWith('assets/') || !staticExtension.test(filename)) continue;
        filenames.push(filename);
        if (loader) discover(filename, loader.publicPath, url, 'webpack-emitted-asset');
        else unresolvedPublicPathAssets.push({ filename, url });
      }
    }
  }
  return filenames;
}
function rememberSileroSelection(program, url, filenames) {
  if (!loader) return;
  const scripts = filenames.filter(name => /^assets\/ort\.wasm\.bundle\.min\.[a-f\d]{10}\.mjs$/.test(name));
  const binaries = filenames.filter(name => /^assets\/[a-f\d]{10}\.module\.wasm$/.test(name));
  if (scripts.length !== 1 || binaries.length !== 1) return;
  const compiledScript = assetURL(scripts[0], loader.publicPath).href;
  const compiledWasm = assetURL(binaries[0], loader.publicPath).href;
  const selections = [];
  walk(program, node => {
    if (node.type !== 'SequenceExpression') return;
    const [threads, paths] = node.expressions;
    if (threads?.type !== 'AssignmentExpression' || threads.operator !== '=' || !isMember(threads.left, 'numThreads') || threads.right.value !== 1 ||
        paths?.type !== 'AssignmentExpression' || paths.operator !== '=' || !isMember(paths.left, 'wasmPaths') ||
        !isMember(threads.left.object, 'wasm') || !isMember(paths.left.object, 'wasm') ||
        threads.left.object.object.name == null || threads.left.object.object.name !== paths.left.object.object.name) return;
    const script = assetURL(staticString(ownProperty(paths.right, 'mjs')), url);
    const wasm = assetURL(staticString(ownProperty(paths.right, 'wasm')), url);
    if (script?.origin !== 'https://persistent.oaistatic.com' || wasm?.origin !== script.origin ||
        !/^\/voice\/silero-vad-v\d+\/ort-wasm-simd-threaded\.[a-f\d]{64}\.module\.js$/.test(script.pathname) ||
        !/^\/voice\/silero-vad-v\d+\/ort-wasm-simd-threaded\.[a-f\d]{64}\.binary\.wasm$/.test(wasm.pathname) ||
        path.posix.dirname(script.pathname) !== path.posix.dirname(wasm.pathname)) return;
    selections.push({ script: script.href, wasm: wasm.href });
  });
  if (selections.length === 1) sileroSelections.set(url.href, { ...selections[0], compiledScript, compiledWasm });
}
add(shell.manifest, homepage, 'shell-manifest');
if (shell.iconSprite) add(shell.iconSprite, homepage, 'shell-icon-sprite');
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
  const rendererFile = rendererPath(url);
  if (!['.js','.mjs','.css','.json','.webmanifest','.svg'].includes(type) && !rendererFrame.test(rendererFile)) return;
  const text = await readFile(file, 'utf8');
  if (type === '.html') { rendererHtmlReferences(text, url); return; }
  if (type === '.css') { cssReferences(text, url); return; }
  if (type === '.svg') {
    for (const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) discover(match[1], url, url, 'svg-reference');
    cssReferences(text, url);
    return;
  }
  if (type === '.json' || type === '.webmanifest') {
    const payload = JSON.parse(text);
    // Locale messages give a user-created sketch its download filename.
    if (type === '.json' && payload && typeof payload['composer.sketch.fileName'] === 'string') delete payload['composer.sketch.fileName'];
    const values = [payload];
    while (values.length) {
      const value = values.pop();
      if (value && typeof value === 'object') values.push(...Object.values(value));
      else if (typeof value === 'string') discover(value, url, url, 'static-json-reference');
    }
    return;
  }
  const program = parseJS(text);
  javascriptReferences(program, url);
  if (rendererSelector.test(rendererFile)) rendererRuntimeReferences(program, url);
  if (rendererEngine.test(rendererFile)) rendererEngineReferences(program, url);
  const emitted = emittedAssetReferences(program, url);
  if (text.includes('silero-vad-') && text.includes('wasmPaths')) rememberSileroSelection(program, url, emitted);
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
  if (url.href === runtimeUrl?.href) {
    loader = inspectResolver(program, url, add);
    for (const { filename, url: owner } of unresolvedPublicPathAssets.splice(0)) {
      discover(filename, loader.publicPath, owner, 'webpack-emitted-asset');
    }
  }
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
// Keep the same queue and hashing rules for assets observed by the browser.
async function observePublicInteractions() {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: process.env.CAPTURE_BROWSER_CHANNEL || 'msedge', headless: true });
  const actions = [
    { name: 'tools', roles: ['button'], label: /^(?:tools|add tools|添加工具|工具|添加文件等内容)$/i },
    { name: 'settings', roles: ['button', 'link'], label: /^(?:settings|设置)$/i },
    { name: 'images', roles: ['link', 'button'], label: /^(?:images|图像|图片)$/i },
    { name: 'plugins', roles: ['link', 'button'], label: /^(?:plugins|插件)$/i },
    { name: 'login-dialog', roles: ['button'], label: /^(?:log in|登录)$/i },
    { name: 'signup-dialog', roles: ['button'], label: /^(?:sign up for free|免费注册|注册)$/i },
  ];
  const outcomes = [];
  try {
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
    // This anonymous context never submits credentials, prompts, or forms.
    for (const action of actions) {
      const page = await context.newPage();
      const initial = new Set(), afterClick = new Set();
      let observing = initial;
      page.on('response', response => {
        if (response.request().method() !== 'GET' || response.status() !== 200) return;
        const publicURL = assetURL(response.url(), homepage);
        if (publicURL) observing.add(publicURL.href);
      });
      const item = { action: action.name, status: 'not-visible', newAssets: 0 };
      const currentBuild = () => page.evaluate(() => document.documentElement?.dataset?.build);
      const dialogs = () => page.getByRole('dialog').filter({ visible: true }).count();
      try {
        await page.goto(homepage, { waitUntil: 'domcontentloaded', timeout: 25000 });
        if (page.url() !== homepage || await currentBuild() !== shell.build) {
          item.status = 'build-mismatch';
          outcomes.push(item);
          continue;
        }
        const visible = action.roles.map(role => page.getByRole(role, { name: action.label }).filter({ visible: true }))
          .reduce((combined, next) => combined.or(next)).first();
        if (!await visible.isVisible()) await visible.waitFor({state:'visible',timeout:2200}).catch(()=>{});
        if (await visible.isVisible()) {
          const priorDialogs = await dialogs(), priorPath = new URL(page.url()).pathname;
          observing = afterClick;
          await visible.click({ timeout: 4500 });
          await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => {});
          const next = new URL(page.url());
          if (next.origin !== new URL(homepage).origin || await currentBuild().catch(() => null) !== shell.build) {
            item.status = 'navigated-outside-build';
          } else {
            item.status = await dialogs() > priorDialogs ? 'dialog-opened' : next.pathname !== priorPath ? 'route-opened' : 'clicked';
            for (const href of afterClick) {
              if (initial.has(href)) continue;
              discover(href, homepage, homepage, 'anonymous-' + action.name);
              item.newAssets++;
            }
          }
        }
        for (const href of initial) discover(href, homepage, homepage, 'anonymous-initial-render');
      } catch (error) {
        item.status = error.name === 'TimeoutError' ? 'timed-out' : 'unavailable';
      } finally { await page.close(); }
      outcomes.push(item);
    }
    return outcomes;
  } finally { await browser.close(); }
}

const publicInteractions = options.has('--public-interactions') ? await observePublicInteractions() : null;
if (publicInteractions) console.log(JSON.stringify({ publicInteractions }));

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
// A bundled Emscripten default remains an ordinary dependency unless the
// only captured importer supplies a matching public WASM location explicitly.
const conditionalFallbacks = [];
for (const [url, failure] of failed) {
  if (failure.reason !== 'HTTP 404' || path.posix.basename(new URL(url).pathname) !== onnxFallbackName) continue;
  const incoming = links.filter(edge => edge.to === url);
  const resolved = incoming.map(edge => {
    if (edge.relation !== 'constructed-static-url' || !onnxFallbackSources.has(edge.from)) return null;
    const parents = links.filter(parent => parent.to === edge.from);
    if (parents.length !== 1) return null;
    const parent = parents[0];
    const selected = sileroSelections.get(parent.from);
    if (!selected || (parent.relation === 'webpack-emitted-asset' ? selected.compiledScript : selected.script) !== edge.from ||
        ![selected.compiledScript, selected.compiledWasm, selected.script, selected.wasm].every(source => completed.has(source))) return null;
    const declaredDigestsMatch = [selected.script, selected.wasm].every(source => {
      const digest = new URL(source).pathname.match(/[a-f\d]{64}/)?.[0];
      return digest === completed.get(source)?.sha256;
    });
    return declaredDigestsMatch ? { ...edge, selectedBy: parent.from, selectedWasm: selected.wasm, httpStatus: 404 } : null;
  });
  if (!resolved.length || resolved.some(edge => edge == null)) continue;
  conditionalFallbacks.push(...resolved);
  known.delete(url);
  failed.delete(url);
}
const activeLinks = links.filter(edge => known.has(edge.to));
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
  shell: { date: shell.date, sha256: shell.sha256, origin: homepage, manifest: shell.manifest.href,
    iconSprite: shell.iconSprite?.href ?? null, stylesheets: shell.stylesheets },
  entry: entryUrl?.href ?? null, entryModules: entryModules ?? [], runtime: runtimeUrl?.href ?? null, initialRoutes: shell.routes, loader: loader ?? null,
  limits: { maxAssets: Number.isFinite(maxAssets) ? maxAssets : null, maxBytes: Number.isFinite(maxBytes) ? maxBytes : null, reserveBytes, initialFreeBytes, captureBudget, stoppedBy: exhausted },
  discoveredAssets: known.size, capturedAssets: completed.size, capturedBytes: [...completed.values()].reduce((total, item) => total + item.bytes, 0),
  assets: [...completed.values()].sort((left, right) => left.url.localeCompare(right.url)), links: activeLinks,
  pending, failed: [...failed.values()], unresolved, conditionalFallbacks,
  ...(publicInteractions ? { publicInteractions, allInteractionsVerified: false } : {}),
};
const partialManifest = path.join(stage, 'capture-manifest.' + crypto.randomUUID() + '.partial');
await writeFile(partialManifest, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
await rename(partialManifest, path.join(stage, 'capture-manifest.json'));
console.log(JSON.stringify({ status: result.status, stage, sourceBuild: shell.build, sourceVersion: sourceVersion ?? null, loader: loader ?? null,
  captured: completed.size, discovered: known.size, pending: pending.length, failed: failed.size, unresolved: unresolved.length, stoppedBy: exhausted }));
if (!complete) process.exitCode = 1;
