/** Original asynchronous workspaceFiles.downloadCopy boundary.
 * The native temporary-file registry and RpcStub lifecycle remain authoritative.
 * Actual publication byte/owner verification belongs to the injected Library.
 */
const object = value => value !== null && (typeof value === 'object' || typeof value === 'function');

export function wrapNativeDownloadServices(services, {
  isTemporaryPath, getTemporaryFile, getDefaultFileName, sanitizeFileName,
  maxBytes, createTooLargeError, downloadVerifiedBytes, nativeDownload, wrapRpcMethod,
} = {}) {
  if (!object(services)) throw new TypeError('The original native host services container is required.');
  if (![isTemporaryPath, getTemporaryFile, getDefaultFileName, sanitizeFileName, createTooLargeError, downloadVerifiedBytes, nativeDownload, wrapRpcMethod].every(value => typeof value === 'function') || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError('Original temporary-file, filename, size/error, RpcStub and synchronous download services are required.');
  }
  const original = Reflect.get(services, 'workspaceFiles', services);
  if (!object(original)) return services;
  const workspaceFiles = new Proxy(original, {
    get(target, key) {
      if (key !== 'downloadCopy') return Reflect.get(target, key, target);
      // n10M awaits and disposes the property value before making its call.
      // Return a fresh real native RpcStub on every access, never a plain async
      // function, a forged dispose method, or a cached already-disposed stub.
      const wrapped = wrapRpcMethod(async (...args) => {
        const request = args[0];
        const fallback = async () => {
          // A native property read can acquire its own disposable RPC handle.
          // Managed saves need none; an actual fallback owns and releases it.
          const method = await Reflect.get(target, key, target);
          try { return await Reflect.apply(method, target, args); }
          finally { method?.[Symbol.dispose ?? Symbol.for('dispose')]?.(); }
        };
        if (!object(request) || typeof request.path !== 'string' || !isTemporaryPath(request.path)) return fallback();
        const source = getTemporaryFile(request.path)?.bytes;
        if (source == null) return fallback();
        const length = source.byteLength;
        const { maxBytes: requestedLimit = maxBytes } = request;
        const limit = Math.min(requestedLimit, maxBytes);
        if (length > limit) throw createTooLargeError(length);
        // Afr7 stores the genuine byte copy. Copy again before an asynchronous
        // verifier so neither it nor another temporary-file caller can alter
        // the bytes admitted to this one native save operation.
        const view = ArrayBuffer.isView(source)
          ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
          : new Uint8Array(source);
        const bytes = view.slice();
        const fileName = request.fileName == null ? getDefaultFileName(request.path) : sanitizeFileName(request.fileName);
        let invoked = false;
        const result = await downloadVerifiedBytes(bytes, { fileName, signal: request.signal }, (blob, name) => {
          if (invoked) throw new TypeError('The verified native download may run only once.');
          invoked = true;
          const output = nativeDownload(blob, name);
          if (output != null && typeof output.then === 'function') throw new TypeError('The original native download primitive must be synchronous.');
          return output;
        });
        if (result?.handled === true) {
          if (!invoked) throw new TypeError('A handled download must invoke the actual native download primitive.');
          return;
        }
        if (result?.handled === false && !invoked) return fallback();
        throw new TypeError('The verified download provider returned an inconsistent result.');
      });
      const dispose = Symbol.dispose ?? Symbol.for('dispose');
      if (typeof wrapped !== 'function' || typeof wrapped[dispose] !== 'function') throw new TypeError('The download method must be wrapped in an actual disposable native RpcStub.');
      return wrapped;
    },
  });
  const descriptors = Object.getOwnPropertyDescriptors(services);
  const previous = descriptors.workspaceFiles;
  descriptors.workspaceFiles = { value: workspaceFiles, enumerable: previous?.enumerable ?? true, configurable: previous?.configurable ?? true, writable: previous && 'writable' in previous ? previous.writable : true };
  const output = Object.create(Object.getPrototypeOf(services), descriptors);
  if (!Object.isExtensible(services)) Object.preventExtensions(output);
  return output;
}
