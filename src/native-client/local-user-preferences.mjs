/** Source g2p6 GET/PATCH shapes backed by real browser-local preferences. */
const key = 'original-client-prototype-user-preferences:v1';
function read() {
  try { const value = JSON.parse(globalThis.localStorage.getItem(key) ?? '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}
function save(value) { globalThis.localStorage.setItem(key, JSON.stringify(value)); }
export function readLocalUserPreferences() {
  const state = read();
  return { settings: state.settings ?? {}, announcements: state.announcements ?? {}, eligible_announcements: [], flags: {} };
}
export function updateLocalUserPreference(feature, value) {
  if (!feature || !/^[a-zA-Z0-9_.-]+$/.test(feature)) throw Error('Invalid local preference key');
  const state = read(); state.settings = { ...state.settings, [feature]: value }; save(state);
  return state.settings;
}
export function acknowledgeLocalAnnouncement(id) {
  if (typeof id !== 'string' || !id) throw Error('Announcement ID is required');
  const state = read(); state.announcements = { ...state.announcements, [id]: Date.now() }; save(state);
  return state.announcements;
}
