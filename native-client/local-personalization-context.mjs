/** Apply browser-local custom instructions only to original Classic Chat/Work. */
import { USER_SYSTEM_MESSAGES_STORAGE_KEY } from './local-personalization-service.mjs?v=bc63582b1dbb7427';

const identityFields = ['accountId', 'userId', 'accountUserId'];
const copyIdentity = value => value && Object.fromEntries(identityFields.map(key => [key, value[key] ?? null]));
const sameIdentity = (a, b) => !!a && !!b && identityFields.every(key => (a[key] ?? null) === (b[key] ?? null));

/** The identity/namespace module is boot-bound; late login requires its normal reload. */
export function createPersonalizationIdentityProvider({ getSiteAccount, getLocalIdentity, getStorageKey }) {
  const bootSite = getSiteAccount();
  const bootOwner = bootSite?.id ?? null, bootAccount = bootSite?.accountId ?? null;
  const bootIdentity = copyIdentity(getLocalIdentity());
  const bootNamespace = getStorageKey(USER_SYSTEM_MESSAGES_STORAGE_KEY);
  return () => {
    const site = getSiteAccount(), identity = getLocalIdentity();
    if (!bootOwner || site?.id !== bootOwner || (site?.accountId ?? null) !== bootAccount ||
        getStorageKey(USER_SYSTEM_MESSAGES_STORAGE_KEY) !== bootNamespace ||
        bootNamespace === USER_SYSTEM_MESSAGES_STORAGE_KEY + ':guest' || !sameIdentity(identity, bootIdentity)) return null;
    return copyIdentity(identity);
  };
}

export function getClassicPersonalizationSurface({ thread, turn } = {}) {
  const metadata = thread?.adapterMetadata;
  if (typeof metadata?.classicRootId !== 'string' || !metadata.classicRootId) return null;
  for (const entry of [metadata, turn?.adapterMetadata]) {
    const client = entry?.clientMetadata;
    if ([entry?.conversationOrigin, client?.conversationOrigin, client?.localProductSurface].some(value => value === 'codex' || value === 'dot')) return null;
  }
  // RPC-only and future product origins do not inherit this web preference.
  if (metadata.conversationOrigin === 'tpp') return 'work';
  return metadata.conversationOrigin == null ? 'chat' : null;
}

export function createPersonalizedSettingsReader({ readSettings, personalization, getIdentity }) {
  return context => {
    const settings = { ...readSettings() };
    const surface = getClassicPersonalizationSurface(context);
    if (!surface || !getIdentity()) return settings;
    const custom = typeof personalization.getRequestInstructions === 'function'
      ? personalization.getRequestInstructions({ surface })
      : personalization.getCustomInstructions({ surface });
    if (custom) settings.customInstructions = [settings.customInstructions, custom].filter(value => typeof value === 'string' && value.trim()).join('\n\n');
    return settings;
  };
}
