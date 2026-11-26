const declarationPattern = /^export const SITE_ACCOUNT_SERVICE = (["'])([^"'\r\n]+)\1;/m;

function parseOrigin(value, label) {
  let url;
  try { url = new URL(value); } catch {}
  if (!url || url.protocol !== 'https:' || ![url.origin, url.origin + '/'].includes(value)) {
    throw Error(label + ' must be an HTTPS origin without credentials, a path or a query.');
  }
  return url.origin;
}

export function requestedSiteAccountOrigin(value) {
  const requested = value?.trim();
  return requested ? parseOrigin(requested, 'CHATGPT_SITE_API_ORIGIN') : undefined;
}

export function siteAccountOriginDeclaration(moduleSource) {
  const match = declarationPattern.exec(moduleSource);
  if (!match) throw Error('Missing canonical site account origin');
  const origin = parseOrigin(match[2], 'The site account module origin');
  if (match[2] !== origin) throw Error('The site account module origin is not canonical');
  return { declaration: match[0], origin };
}

export function checkPackagedSiteAccountOrigin({ publishedModule, canonicalModule, recordedOrigin, expectedOrigin }) {
  const actual = siteAccountOriginDeclaration(publishedModule).origin;
  const recorded = recordedOrigin === undefined
    ? siteAccountOriginDeclaration(canonicalModule).origin
    : parseOrigin(recordedOrigin, 'The packaged site account origin');
  if (recordedOrigin !== undefined && recordedOrigin !== recorded) throw Error('The packaged site account origin is not canonical');
  if (actual !== recorded) throw Error('The configured account origin differs from the browser module');
  if (expectedOrigin && actual !== expectedOrigin) throw Error('The browser module does not use the requested CHATGPT_SITE_API_ORIGIN');
  return actual;
}

export async function retainedSiteAccountOrigin(requested, previous, readPreviousModule) {
  if (requested || previous?.siteAccountOrigin === undefined) return requested;
  return checkPackagedSiteAccountOrigin({ publishedModule: await readPreviousModule(), recordedOrigin: previous.siteAccountOrigin });
}
