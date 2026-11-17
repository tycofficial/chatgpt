/** Compose real local byte authorities without changing publication authority.
 * A native save still uses exactly one standard object URL creation.
 */
export function createOwnedDownloadTransport({ providers, fetchImpl, onDiagnostic = () => {} } = {}) {
  const methods = ['ownsObjectURL', 'downloadVerifiedBytes', 'createNativeDownloadURL', 'forgetNativeDownloadURL'];
  if (!Array.isArray(providers) || !providers.length || providers.some(provider => !provider || methods.some(method => typeof provider[method] !== 'function')) || typeof fetchImpl !== 'function') throw new TypeError('Real local download authorities and a byte fetch implementation are required');
  const sources = providers.slice();
  const diagnostic = type => { try { onDiagnostic({ type }); } catch {} };
  function ownsObjectURL(url) {
    if (typeof url !== 'string' || !url.startsWith('blob:')) return false;
    try { return sources.some(provider => provider.ownsObjectURL(url) === true); }
    catch { diagnostic('local-download-authority-check-error'); return false; }
  }
  function createNativeDownloadURL(blob, createURL) {
    if (typeof createURL !== 'function') throw new TypeError('The standard object URL creator is required');
    let create = createURL;
    for (let index = sources.length - 1; index >= 0; index--) {
      const provider = sources[index], next = create;
      create = value => provider.createNativeDownloadURL(value, next);
    }
    return create(blob);
  }
  function forgetNativeDownloadURL(url) {
    // Every authority must forget its grant even if another cleanup fails.
    for (const provider of sources) try { provider.forgetNativeDownloadURL(url); }
    catch { diagnostic('local-download-authority-cleanup-error'); }
  }
  async function downloadVerifiedBytes(bytes, options, nativeDownload) {
    for (const provider of sources) {
      const result = await provider.downloadVerifiedBytes(bytes, options, nativeDownload);
      if (result?.handled === true) return { handled: true };
      if (result?.handled !== false) throw new TypeError('The local download authority returned an invalid result');
    }
    return { handled: false };
  }
  async function fetch(url, options = {}) {
    const current = () => {
      options.signal?.throwIfAborted();
      if (!ownsObjectURL(url)) throw new DOMException('The local file is unavailable for this account', 'AbortError');
    };
    if (!['GET', 'HEAD'].includes(String(options.method ?? 'GET').toUpperCase())) throw new TypeError('Local file bytes support GET and HEAD only');
    current();
    const response = await fetchImpl(url, options);
    try { current(); return response; }
    catch (error) { try { await response.body?.cancel(); } catch {} throw error; }
  }
  return Object.freeze({ ownsObjectURL, createNativeDownloadURL, forgetNativeDownloadURL, downloadVerifiedBytes, fetch });
}
