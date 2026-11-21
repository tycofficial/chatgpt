/** YCTv service contract over localStorage; original definitions/schemas remain authoritative. */
export function createLocalHostSettingsClass(NativeSettings, api) {
  const storageKey = 'original-client-prototype-host-settings:v1';
  const readState = () => {
    const state = JSON.parse(globalThis.localStorage.getItem(storageKey) ?? '{}');
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw Error('Invalid local host settings storage');
    if (api.canSelectModels?.() && state['site-model-slider-version'] !== 2) {
      const previous=Array.isArray(state['enabled-reasoning-efforts'])?state['enabled-reasoning-efforts']:['low','medium','high','xhigh'];
      state['enabled-reasoning-efforts']=[...new Set([...previous.filter(value=>value!=='none'),'max','ultra'])];
      state['show-ultra-in-model-picker-slider']=true;
      state['site-model-slider-version']=2;
      globalThis.localStorage.setItem(storageKey,JSON.stringify(state));
    }
    return state;
  };
  const definitions = () => api.settings.Od.filter(definition => definition.key !== api.settings.lf.externalBrowserLinkShortcut.key && api.settings.lh(definition.key) != null);
  const definition = key => definitions().find(value => value.key === key);
  const rawValue = (key, state = readState()) => {
    const def = definition(key);
    if (!def) throw Error(`Unknown setting: ${key}`);
    const cookie = api.browser.a(def);
    if (cookie) {
      const value = api.cookie.a(cookie.name);
      if (value != null) return api.cookieValue.c(cookie.name, value);
    }
    if (state[key] !== undefined) return state[key];
    if (api.canSelectModels?.()) {
      if (key === 'enabled-reasoning-efforts') return ['low','medium','high','xhigh','max','ultra'];
      if (key === 'show-ultra-in-model-picker-slider') return true;
    }
    return undefined;
  };
  const snapshot = (key, state) => {
    const def = definition(key), value = rawValue(key, state), effective = value ?? api.browser.b(def);
    return { configured: value === undefined ? undefined : api.settings.Ij(key, value), effective: effective === undefined ? undefined : api.settings.Ij(key, effective) };
  };
  return class LocalHostSettings extends NativeSettings {
    async read(key) { return snapshot(key, readState()); }
    async readAll() {
      const state = readState(), configuredValues = {}, values = {};
      for (const def of definitions()) {
        const result = snapshot(def.key, state);
        if (result.configured !== undefined) configuredValues[def.key] = result.configured;
        if (result.effective !== undefined) values[def.key] = result.effective;
      }
      return { configuredValues, values };
    }
    async write(key, value) {
      const def = definition(key);
      if (!def) throw Error(`Unknown setting: ${key}`);
      const parsed = api.settings.mh(key).parse(value), state = readState();
      const cookie = api.browser.a(def);
      if (cookie) {
        const stored = api.cookieValue.c(cookie.name, parsed);
        if (parsed != null && stored === undefined || !api.cookie.c(cookie.name, stored)) throw Error('Could not save browser setting');
      }
      if (parsed === undefined) delete state[key]; else state[key] = parsed;
      globalThis.localStorage.setItem(storageKey, JSON.stringify(state));
    }
    async subscribe() { return null; }
    async readForAgent() {
      const defs = api.settings.uh().filter(def => definition(def.key));
      const state = readState(), settings = {}, effectiveSettings = {};
      for (const def of defs) {
        const value = rawValue(def.key, state), effective = value ?? api.browser.b(def);
        if (value !== undefined) settings[def.key] = value;
        if (effective !== undefined) effectiveSettings[def.key] = effective;
      }
      return { filePath: null, settings, effectiveSettings, definitions: defs };
    }
    async writeForAgent(values) {
      for (const [key, value] of Object.entries(values)) {
        const def = definition(key);
        if (!def || def.agentAccess !== 'read-write') throw Error(`Setting cannot be written by Codex: ${key}`);
        await this.write(key, value);
      }
      const result = await this.readForAgent();
      return { settings: result.settings, effectiveSettings: result.effectiveSettings };
    }
  };
}
