import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEPS_DIRECTORY } from './constants.mjs';
export async function loadJose() {
  try { return await import('jose'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  const require = createRequire(pathToFileURL(path.join(DEPS_DIRECTORY, 'package.json')));
  try { return await import(pathToFileURL(require.resolve('jose')).href); }
  catch { throw Error('jose is not installed. Run local-bridge/Install.ps1 first; dependencies are kept outside this repository.'); }
}
