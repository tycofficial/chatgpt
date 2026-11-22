import assert from 'node:assert/strict';
import test from 'node:test';
import { installRestrictedBrowserStorage, isVolatileBrowserStorage } from '../src/native-client/restricted-browser-storage.mjs';

const denied = () => { throw new DOMException('Storage is unavailable', 'SecurityError'); };

test('browser-denied storage has isolated per-page settings without persistent databases', () => {
  const createPage = () => Object.defineProperties({}, Object.fromEntries(
    ['localStorage', 'sessionStorage', 'indexedDB', 'caches'].map(name => [name, { configurable: true, get: denied }]),
  ));
  const first = createPage(), fresh = createPage();
  installRestrictedBrowserStorage(first);
  installRestrictedBrowserStorage(fresh);
  assert.equal(first.indexedDB, undefined);
  assert.equal(first.caches, undefined);
  assert.equal(isVolatileBrowserStorage(first.localStorage), true);
  assert.equal(isVolatileBrowserStorage(first.sessionStorage), true);

  first.localStorage.setItem('theme', 'dark');
  first.sessionStorage.setItem('dismissed', 1);
  installRestrictedBrowserStorage(first);
  assert.equal(first.localStorage.getItem('theme'), 'dark');
  assert.equal(first.sessionStorage.key(0), 'dismissed');
  assert.equal(first.sessionStorage.getItem('dismissed'), '1');
  assert.equal(fresh.localStorage.getItem('theme'), null);
  assert.equal(fresh.sessionStorage.length, 0);
});

test('available identity storage is never replaced when an unrelated storage kind is blocked', () => {
  const accountStorage = { getItem: () => 'existing session' };
  const indexedDB = { open() {} };
  const scope = { localStorage: accountStorage, sessionStorage: { getItem: denied }, indexedDB };
  installRestrictedBrowserStorage(scope);
  assert.equal(scope.localStorage, accountStorage);
  assert.equal(isVolatileBrowserStorage(scope.localStorage), false);
  assert.equal(isVolatileBrowserStorage(scope.sessionStorage), true);
  assert.equal(scope.indexedDB, indexedDB);
});
