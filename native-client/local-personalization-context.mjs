/** Apply browser-local custom instructions only to original Classic Chat/Work. */
import { USER_SYSTEM_MESSAGES_STORAGE_KEY } from './local-personalization-service.mjs?v=d54056d29411fe79';

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

/** Conversations also support the existing signed-out Free UI, in its own browser namespace. */
export function createConversationIdentityProvider({getSiteAccount,getVerifiedIdentity,getStorageKey}) {
  const bootOwner=getSiteAccount()?.id??null,namespace=getStorageKey('cg-original-app-server:v1');
  const guest=Object.freeze({ownerId:'browser-guest',accountId:'browser-guest',userId:'browser-guest',accountUserId:'browser-guest',authenticationMode:'browser-guest'});
  return()=>{
    const site=getSiteAccount();
    if(getStorageKey('cg-original-app-server:v1')!==namespace)return null;
    if(!bootOwner)return !site&&namespace==='cg-original-app-server:v1:guest'?guest:null;
    const local=getVerifiedIdentity();
    return site?.id===bootOwner&&local?{...local,ownerId:site.id}:null;
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
