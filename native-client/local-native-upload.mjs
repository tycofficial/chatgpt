/**
 * Keep the native GDNt class, issued uploads and exact owned local byte fetches.
 * Source GDNt: 514085.004fb5c464.js:2973..15808; static getInstance:
 * return null==this.instance&&(this.instance=new p),this.instance.
 */
const wrappedClasses = new WeakMap();
export function wrapNativeFileUploadClass(NativeWebFetch, files, referenceURL = globalThis.location?.href, localDownloads = null) {
  if (typeof NativeWebFetch?.getInstance !== 'function' || typeof files?.isLocalUploadURL !== 'function' || typeof files?.upload !== 'function') throw new TypeError('Native WebFetch class and real local files service are required');
  if (localDownloads != null && (typeof localDownloads.ownsObjectURL !== 'function' || typeof localDownloads.fetch !== 'function')) throw new TypeError('A real owned local download provider is required');
  const ownsObjectURL = localDownloads?.ownsObjectURL, fetchLocal = localDownloads?.fetch;
  const previous = wrappedClasses.get(NativeWebFetch);
  if (previous) {
    if (previous.files !== files || previous.referenceURL !== referenceURL || previous.localDownloads !== localDownloads || previous.ownsObjectURL !== ownsObjectURL || previous.fetchLocal !== fetchLocal) throw Error('Native upload class was already bound to different file/download providers or options');
    return NativeWebFetch;
  }
  const descriptor = Object.getOwnPropertyDescriptor(NativeWebFetch, 'getInstance');
  const originalGetInstance = NativeWebFetch.getInstance;
  const patchedInstances = new WeakSet();
  function retainNativeInstance(instance) {
    if (patchedInstances.has(instance)) return instance;
    const nativeUpload = instance.upload, nativeFetch = instance.fetch;
    if (typeof nativeUpload !== 'function') throw TypeError('Native upload method is absent');
    if (localDownloads != null && typeof nativeFetch !== 'function') throw TypeError('Native fetch method is absent');
    const uploadDescriptor = Object.getOwnPropertyDescriptor(instance, 'upload');
    Object.defineProperty(instance, 'upload', {
      configurable: uploadDescriptor?.configurable ?? true,
      enumerable: uploadDescriptor?.enumerable ?? false,
      writable: uploadDescriptor?.writable ?? true,
      value: function(...args) {
        // Classification deliberately ignores owner/ticket validity. A previous
        // account's URL must receive the local service's 403, never native XHR.
        if (files.isLocalUploadURL(args[1], referenceURL)) return files.upload(...args);
        return Reflect.apply(nativeUpload, this, args);
      },
    });
    if (localDownloads != null) {
      const fetchDescriptor = Object.getOwnPropertyDescriptor(instance, 'fetch');
      Object.defineProperty(instance, 'fetch', {
        configurable: fetchDescriptor?.configurable ?? true,
        enumerable: fetchDescriptor?.enumerable ?? false,
        writable: fetchDescriptor?.writable ?? true,
        value: function(...args) {
          const url = args[0], options = args[1] === undefined ? {} : args[1];
          const method = options && typeof options === 'object' ? String(options.method ?? 'GET').toUpperCase() : null;
          if (typeof url !== 'string' || !['GET','HEAD'].includes(method) || !Reflect.apply(ownsObjectURL, localDownloads, [url])) return Reflect.apply(nativeFetch, this, args);
          return (async () => {
            const current = () => {
              options.signal?.throwIfAborted();
              options.assertRequestCurrent?.();
              if (!Reflect.apply(ownsObjectURL, localDownloads, [url])) throw new DOMException('The local download account changed or its URL was revoked', 'AbortError');
            };
            current();
            const response = await Reflect.apply(fetchLocal, localDownloads, [url, { ...options, method }]);
            try {
              current();
              options.onResponseHeaders?.(response.headers, response.status);
              return response;
            } catch (error) {
              try { await response.body?.cancel(); } catch {}
              throw error;
            }
          })();
        },
      });
    }
    patchedInstances.add(instance);
    return instance;
  }
  Object.defineProperty(NativeWebFetch, 'getInstance', {
    ...descriptor,
    value: function(...args) {
      return retainNativeInstance(Reflect.apply(originalGetInstance, this, args));
    },
  });
  // The original source has this public static field. Do not create its
  // singleton early; when one already exists, retain and instrument that object.
  if (NativeWebFetch.instance != null) retainNativeInstance(NativeWebFetch.instance);
  wrappedClasses.set(NativeWebFetch, { files, referenceURL, localDownloads, ownsObjectURL, fetchLocal });
  return NativeWebFetch;
}

/*
boot-adapter.mjs integration, before the native GDNt factory is instantiated:
  import { ..., localFilesService } from './service-boundary.mjs?v=2389b4a65e4ee133';
  // Include the function above (or import its committed equivalent).
  overrideExports('GDNt', {}, { deferred: true }, {
    b: NativeWebFetch => wrapNativeFileUploadClass(NativeWebFetch, localFilesService),
  });
Do not replace the class with a spread object or Proxy its instances.
*/
