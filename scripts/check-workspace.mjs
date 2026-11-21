import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const shell = await read('index.html');
const release = /<meta name="workspace-release" content="([\d.]+)">/.exec(shell)?.[1];
if (!release || !shell.includes(`workspace-app.mjs?v=${release}`) || !shell.includes(`workspace.css?v=${release}`)) {
  throw Error('The Pages shell and entry files must share a release identifier');
}
for (const path of ['404.html', 'login/', 'signup/', 'logout/', 'auth/login/', 'auth/signup/', 'auth/logout/', 'plans/', 'pricing-plan/', 'site-plans/', 'codex/']) {
  const file = path.endsWith('/') ? path + 'index.html' : path;
  if (await read(file) !== shell) throw Error(`Stale Pages shell: ${file}`);
}
if (!(await read('site-offline.js')).includes(`const RELEASE = '${release}'`)) throw Error('Stale offline cache version');
const credentials = (await import(new URL('config.js', root))).DEFAULT_SETTINGS;
if (credentials.apiKey || credentials.apiProviders.some(provider => provider.apiKey)) throw Error('The public config must not contain API credentials');
const result = await build({ absWorkingDir: fileURLToPath(root), entryPoints: ['src/native-client/workspace-app.mjs', 'site-offline.js', 'python-worker.js'], outdir: 'workspace-check', format: 'esm', bundle: true, metafile: true, write: false, logLevel: 'silent', external: ['https://*'] });
for (const path of Object.keys(result.metafile.inputs)) {
  if (/^(?:original-client|_orbit-renderer|ui|native-client)\//.test(path)) throw Error(`The workspace imports an archived asset: ${path}`);
}
console.log(`Pages workspace ${release} verified (${Object.keys(result.metafile.inputs).length} source modules)`);
