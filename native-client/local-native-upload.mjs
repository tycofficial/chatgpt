/**
 * Keep the native GDNt class and route only issued local uploads to real storage.
 * Source GDNt: 514085.004fb5c464.js:2973..15808; static getInstance:
 * return null==this.instance&&(this.instance=new p),this.instance.
 */
const wrappedClasses = new WeakMap();
export function wrapNativeFileUploadClass(NativeWebFetch, files, referenceURL = globalThis.location?.href) {
  if (typeof NativeWebFetch?.getInstance !== 'function' || typeof files?.isLocalUploadURL !== 'function' || typeof files?.upload !== 'function') throw new TypeError('Native WebFetch class and real local files service are required');
  const previous = wrappedClasses.get(NativeWebFetch);
  if (previous) {
    if (previous !== files) throw Error('Native upload class was already bound to another file provider');
    return NativeWebFetch;
  }
  const descriptor = Object.getOwnPropertyDescriptor(NativeWebFetch, 'getInstance');
  const originalGetInstance = NativeWebFetch.getInstance;
  const patchedInstances = new WeakSet();
  function retainNativeInstance(instance) {
    if (patchedInstances.has(instance)) return instance;
    const nativeUpload = instance.upload;
    if (typeof nativeUpload !== 'function') throw TypeError('Native upload method is absent');
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
  wrappedClasses.set(NativeWebFetch, files);
  return NativeWebFetch;
}

/*
boot-adapter.mjs integration, before the native GDNt factory is instantiated:
  import { ..., localFilesService } from './service-boundary.mjs?v=533b5cd1fed6f95d';
  // Include the function above (or import its committed equivalent).
  overrideExports('GDNt', {}, { deferred: true }, {
    b: NativeWebFetch => wrapNativeFileUploadClass(NativeWebFetch, localFilesService),
  });
Do not replace the class with a spread object or Proxy its instances.
*/
