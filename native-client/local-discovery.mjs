/**
 * Original plugin-service read DTOs backed by the official public manifest
 * snapshot and an account-scoped, persistent site-local registration registry.
 * No captured account/install inventory, OAuth token, private API or UI.
 *
 * Native contracts:
 * PwKw 731863.bbf914bfbc.js:2285487-2290509 -> GET /ps/plugins/home.
 * cLdu 731863.bbf914bfbc.js:2273498-2284277 -> installed service-plugin DTOs.
 * aFrt.e 731863.bbf914bfbc.js:2269198-2270162 -> flat public card DTO.
 * EEop.G 731863.bbf914bfbc.js:2255890+ -> GET service plugin detail.
 * neAJ 731863.bbf914bfbc.js:2248800+ -> POST /ps/plugins/batch read.
 * eo3l async/411351.503586dd1d.js:429123-431376 -> category pagination.
 * Dwjh async/822290.e59ed98952.js:40695+ -> install app_ids_needing_auth.
 */
import {
  PUBLIC_PLUGIN_CATALOG, PUBLIC_PLUGIN_CATALOG_PROVENANCE,
} from './public-plugin-catalog.mjs?v=cb3222cb661f11da';

const SOURCE = 'official-public-manifests-and-site-local-registry';
const copy = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const slug = value => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const asset = path => path ? new URL(path, import.meta.url).href : null;
function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  } });
}
function failure(message, status = 400, code = 'LOCAL_PLUGIN_ERROR') {
  return response({ detail: { error_type: code.toLowerCase(), message }, error: { code, message }, adapter_source: SOURCE }, status);
}
function error(message, status = 400) { return Object.assign(new Error(message), { status }); }

export function createLocalDiscoveryAdapter({
  storage = globalThis.localStorage,
  getAccountId = () => null,
  readConnectedAppIds = () => [],
  diagnostics = [],
  now = Date.now,
  catalog = PUBLIC_PLUGIN_CATALOG,
} = {}) {
  if (typeof storage?.getItem !== 'function' || typeof storage?.setItem !== 'function') {
    throw new TypeError('Persistent site storage is required for the local plugin registry');
  }
  const rows = catalog.map(copy);
  const byId = new Map();
  for (const row of rows) for (const key of [row.id, row.name, row.name + '@' + row.source.marketplaceName]) byId.set(key, row);
  const categories = [...new Set(rows.map(row => row.category).filter(Boolean))].map(title => ({
    id: slug(title), slug: slug(title), title,
  }));
  const byCategory = new Map(categories.map(category => [category.slug, category]));
  const note = (method, path, capability) => diagnostics.push({
    type: 'local-adapter', service: 'plugin-directory', method, path, capability, source: SOURCE,
  });
  const account = () => {
    const id = getAccountId();
    return typeof id === 'string' && id ? id : null;
  };
  const key = id => 'site-public-plugin-registry:v1:' + encodeURIComponent(id);
  function readState(id = account()) {
    if (!id) return { schemaVersion: 1, registrations: {} };
    const raw = storage.getItem(key(id));
    if (raw == null) return { schemaVersion: 1, registrations: {} };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw error('本站插件记录无法读取；未覆盖原有记录。', 500); }
    if (parsed?.schemaVersion !== 1 || !object(parsed.registrations)) throw error('本站插件记录格式不受支持。', 500);
    return parsed;
  }
  function saveState(id, state) {
    if (!id) throw error('请先登录本站账户。', 401);
    try { storage.setItem(key(id), JSON.stringify(state)); }
    catch { throw error('本站插件记录未能持久保存；未报告安装成功。', 507); }
  }
  const registration = (row, state) => state.registrations[row.id] ?? null;
  function requireRow(id) {
    const row = byId.get(id);
    if (!row) throw error('Plugin not found', 404);
    return row;
  }

  function publicCard(row) {
    return {
      id: row.id, display_name: row.displayName,
      short_description: row.shortDescription,
      icon_url: asset(row.assets.logo), icon_url_dark: asset(row.assets.logoDark ?? row.assets.logo),
      keywords: copy(row.keywords), installation_policy: row.installationPolicy,
      status: 'ENABLED', local_metadata_registration: true,
    };
  }
  function servicePlugin(row, state) {
    const local = registration(row, state);
    const info = {
      display_name: row.displayName,
      short_description: row.shortDescription,
      long_description: row.longDescription,
      developer_name: row.developerName,
      category: row.category, capabilities: copy(row.capabilities),
      logo_url: asset(row.assets.logo),
      logo_url_dark: asset(row.assets.logoDark ?? row.assets.logo),
      composer_icon_url: asset(row.assets.composerIcon ?? row.assets.logo),
      website_url: row.websiteURL, privacy_policy_url: row.privacyPolicyURL,
      terms_of_service_url: row.termsOfServiceURL,
      screenshot_urls: [],
    };
    return {
      id: row.id, name: row.name, scope: 'GLOBAL', status: 'ENABLED',
      authentication_policy: row.authenticationPolicy,
      installation_policy: row.installationPolicy,
      ...(local ? { enabled: local.enabled === true, installed_at: local.installedAt } : {}),
      disabled_skill_names: [], disabled_reason: null,
      release: {
        id: row.id + ':' + row.source.manifestBlobSha,
        version: row.version, display_name: row.displayName,
        description: row.description, keywords: copy(row.keywords),
        interface: info,
        app_ids: copy(row.appIds), app_templates: [],
        skills: [], mcp_servers: [],
      },
      extensions: { search_mention_providers: [] },
      adapter_source: SOURCE,
      local_metadata_registration: true,
      // This registry install grants no external account/tool authorization.
      external_account_authentication: 'separate-host-authorization-required',
      source_manifest: copy(row.source), source_license: row.license,
    };
  }
  function page(items, url) {
    const requested = Number(url.searchParams.get('limit') ?? 50);
    const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 200) : 50;
    const token = url.searchParams.get('pageToken') ?? url.searchParams.get('page_token');
    let start = 0;
    if (token != null) {
      const match = /^site-plugin-page:(\d+)$/.exec(token);
      if (!match || Number(match[1]) > items.length) throw error('Invalid local plugin page token');
      start = Number(match[1]);
    }
    const end = Math.min(items.length, start + limit);
    return { plugins: items.slice(start, end).map(publicCard),
      pagination: { limit, next_page_token: end < items.length ? 'site-plugin-page:' + end : null },
      adapter_source: SOURCE };
  }
  function connectedAppIds() {
    const ids = readConnectedAppIds();
    if (!Array.isArray(ids)) throw error('Connected-app state is unavailable', 503);
    return new Set(ids.filter(id => typeof id === 'string'));
  }

  async function handle(request, canonicalPath) {
    const url = new URL(request.url, 'http://local.invalid');
    const path = (canonicalPath ?? url.pathname).replace(/^\/(?:backend-api|__codex-api)(?=\/)/, '').replace(/\/+$/, '') || '/';
    if (!/^\/ps\/(?:plugins|plugin-categories)(?:\/|$)/.test(path)) return null;
    const method = request.method.toUpperCase();
    try {
      if (method === 'GET' && path === '/ps/plugins/home') {
        note(method, path, 'official-public-catalog');
        return response({
          sections: categories.map(category => ({
            id: 'plugins-' + category.slug, title: category.title, url_slug: category.slug,
            plugins: rows.filter(row => row.category === category.title).map(publicCard),
          })),
          adapter_source: SOURCE, source: PUBLIC_PLUGIN_CATALOG_PROVENANCE,
        });
      }
      if (method === 'GET' && path === '/ps/plugins/installed') {
        note(method, path, 'site-local-installed-records');
        const state = readState();
        return response({
          plugins: rows.filter(row => registration(row, state)).map(row => servicePlugin(row, state)),
          pagination: { limit: 1000, next_page_token: null }, adapter_source: SOURCE,
        });
      }
      if (method === 'POST' && path === '/ps/plugins/batch') {
        note(method, path, 'public-metadata-batch-read');
        const body = await request.json();
        if (!Array.isArray(body?.plugin_ids) || body.plugin_ids.length > 200) throw error('A bounded plugin_ids array is required');
        const state = readState();
        return response({ results: body.plugin_ids.map(id => ({
          requested_plugin_id: id, plugin: byId.has(id) ? servicePlugin(byId.get(id), state) : null,
        })), adapter_source: SOURCE });
      }
      const categoryMatch = /^\/ps\/plugin-categories\/([^/]+)\/plugins$/.exec(path);
      if (method === 'GET' && categoryMatch) {
        note(method, path, 'official-public-category');
        const category = byCategory.get(decodeURIComponent(categoryMatch[1]));
        if (!category) throw error('Plugin category not found', 404);
        const query = (url.searchParams.get('q') ?? '').trim().toLocaleLowerCase().slice(0, 256);
        const matches = rows.filter(row => row.category === category.title &&
          (!query || [row.displayName, row.name, row.shortDescription, ...row.keywords].join(' ').toLocaleLowerCase().includes(query)));
        return response({ ...page(matches, url), category });
      }
      const appMatch = /^\/ps\/plugins\/canonical-app\/([^/]+)$/.exec(path);
      if (method === 'GET' && appMatch) {
        const appId = decodeURIComponent(appMatch[1]);
        return response({ plugin_id: rows.find(row => row.appIds.includes(appId))?.id ?? null, adapter_source: SOURCE });
      }
      if (method === 'GET' && path === '/ps/plugins/workspace/template-instances') {
        return response({ instances: [], page_token: null, pagination: { next_page_token: null }, adapter_source: SOURCE });
      }
      const actionMatch = /^\/ps\/plugins\/([^/]+)\/(install|uninstall|enable|disable)$/.exec(path);
      if (method === 'POST' && actionMatch) {
        const row = requireRow(decodeURIComponent(actionMatch[1])), action = actionMatch[2], id = account();
        if (!id) throw error('请先登录本站账户。', 401);
        const state = readState(id), previous = registration(row, state);
        if (action === 'install') {
          if (row.installationPolicy !== 'AVAILABLE') throw error('The public manifest does not allow this local registration', 403);
          state.registrations[row.id] = {
            id: row.id, name: row.name, version: row.version, source: copy(row.source),
            enabled: previous?.enabled ?? true,
            installedAt: previous?.installedAt ?? new Date(now()).toISOString(),
            manifestReferenceStored: true,
          };
        } else if (action === 'uninstall') {
          delete state.registrations[row.id];
        } else {
          if (!previous) throw error('This plugin is not registered in the current site account', 404);
          state.registrations[row.id] = { ...previous, enabled: action === 'enable' };
        }
        const connected = action === 'install' ? connectedAppIds() : new Set();
        saveState(id, state);
        note(method, path, 'persistent-site-local-registration');
        return response({
          plugin: servicePlugin(row, state),
          app_ids_needing_auth: action === 'install' ? row.appIds.filter(appId => !connected.has(appId)) : [],
          adapter_source: SOURCE, local_metadata_registration: true,
        });
      }
      const detailMatch = /^\/ps\/plugins\/([^/]+)$/.exec(path);
      if (method === 'GET' && detailMatch) {
        note(method, path, 'official-public-plugin-detail');
        return response(servicePlugin(requireRow(decodeURIComponent(detailMatch[1])), readState()));
      }
      return failure('此插件服务操作尚未连接；未伪造第三方账号或工具执行结果。', 501, 'LOCAL_PLUGIN_CAPABILITY_UNAVAILABLE');
    } catch (cause) {
      return failure(cause.message, cause.status ?? 400);
    }
  }

  function getInstalledManifestReferences() {
    const state = readState();
    return rows.filter(row => registration(row, state)).map(row => ({
      id: row.id, name: row.name, enabled: registration(row, state).enabled,
      version: row.version, source: copy(row.source), appIds: copy(row.appIds),
      localMetadataRegistration: true, externalAccountAuthorizationGranted: false,
    }));
  }
  return Object.freeze({ handle, getInstalledManifestReferences, provenance: PUBLIC_PLUGIN_CATALOG_PROVENANCE });
}
