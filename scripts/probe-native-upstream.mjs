import { readFile } from 'node:fs/promises';

const official = new URL('https://chatgpt.com/');
const staticPath = /^\/cdn\/assets\/[\w.-]+\.(?:js|mjs|css)$/;
async function readPublic(path, contentType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(new URL(path, official), { credentials: 'omit', redirect: 'error', signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.includes(contentType)) throw Error(`Official resource unavailable (HTTP ${response.status})`);
    return await response.text();
  } finally { clearTimeout(timeout); }
}
const html = await readPublic('/', 'text/html');
const sourceBuild = /\bdata-build="([a-f\d]{40})"/i.exec(html)?.[1];
if (!sourceBuild) throw Error('Official public document does not expose a frontend build identifier');
const resources = new Set([...html.matchAll(/(?:src|href)="([^"#?]*)"/g)].map(([, value]) => {
  try { return new URL(value, official); } catch { return null; }
}).filter(url => url?.origin === official.origin && staticPath.test(url.pathname) && !url.search).map(url => url.pathname));

function exactOne(pattern, description) {
  const matches = [...resources].filter(path => pattern.test(path));
  if (matches.length !== 1) throw Error(`Expected one ${description} in the public document, found ${matches.length}`);
  return matches[0];
}

const manifest = exactOne(/\/manifest-[\w]+\.js$/, 'versioned route manifest');
const body = await readPublic(manifest, 'javascript');
if (!body.includes('/cdn/assets/')) throw Error('The official route manifest did not contain static asset references');
const current = JSON.parse(await readFile(new URL('../native-client/active.json', import.meta.url), 'utf8'));

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  origin: official.origin,
  upstreamBuild: sourceBuild,
  packagedBuild: current.sourceBuild,
  packagedRelease: current.release,
  newerGraphObserved: sourceBuild !== current.sourceBuild,
  manifest,
  runtime: exactOne(/\/633146\.[\da-f]+\.js$/, 'runtime'),
  entry: exactOne(/\/685809\.[\da-f]+\.js$/, 'entry'),
  publicBootAssets: resources.size,
  manifestAssetReferences: new Set(body.match(/\/cdn\/assets\/[\w./-]+\.(?:js|mjs|css)/g)).size,
}, null, 2));
