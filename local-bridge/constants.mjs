import path from 'node:path';
import os from 'node:os';
export const ISSUER = 'https://auth.openai.com';
export const RESOURCE = 'https://api.openai.com/v1';
export const AUTHORIZE_ENDPOINT = ISSUER + '/api/accounts/authorize';
export const TOKEN_ENDPOINT = ISSUER + '/api/accounts/oauth/token';
export const DISCOVERY_ENDPOINT = ISSUER + '/.well-known/openid-configuration';
export const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'];
export const APP_NAME = 'TYC ChatGPT Local Bridge';
export const SITE_ORIGIN = 'https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site';
export const STATE_DIRECTORY = process.env.LOCAL_BRIDGE_STATE_DIR || (process.platform === 'win32' ? 'D:\\ChatGPT-Local-Bridge\\state' : path.join(os.homedir(), '.config', 'tyc-chatgpt-local-bridge'));
export const DEPS_DIRECTORY = process.env.LOCAL_BRIDGE_DEPS_DIR || (process.platform === 'win32' ? 'D:\\ChatGPT-Local-Bridge\\deps' : path.join(os.homedir(), '.cache', 'tyc-chatgpt-local-bridge', 'deps'));
export class BridgeError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'BridgeError'; this.code = code; Object.assign(this, details); }
}
export function diagnostic(error) {
  return { code: error.code || 'BRIDGE_ERROR', message: error.safeMessage || error.message || 'Bridge operation failed', ...(error.status ? { httpStatus: error.status } : {}), ...(error.requestId ? { requestId: error.requestId } : {}), ...(error.param ? { param: error.param } : {}) };
}
