export const fallbackDirectory = "single-thread";
export const runtimeExtensions = ["mjs", "wasm", "data"];

/** @param {{crossOriginIsolated: boolean, SharedArrayBuffer?: typeof SharedArrayBuffer}} host */
export function selectRuntime(host) {
  // https://github.com/openai/orbit-character-engine/pull/139
  const threaded =
    host.crossOriginIsolated && typeof host.SharedArrayBuffer !== "undefined";
  const directory = threaded
    ? "../runtime/"
    : `../runtime/${fallbackDirectory}/`;
  return {
    threaded,
    /** @param {string} file */
    path(file) {
      // The SDK publishes the same data with both engines. Share the intro's HTML preload.
      return file === "orbit-characters.data"
        ? `../runtime/${file}`
        : directory + file;
    },
  };
}

const runtime = selectRuntime(globalThis);
export const threaded = runtime.threaded;

/** @param {string} file */
export function locateFile(file) {
  return new URL(runtime.path(file), location.href).href;
}

/** @returns {Promise<typeof import("../runtime/orbit-characters.mjs")>} */
export function importRuntime() {
  return import(/* @vite-ignore */ runtime.path("orbit-characters.mjs"));
}

export function preloadRuntime(extensions = runtimeExtensions) {
  return Promise.all(
    extensions.map(
      (extension) =>
        new Promise((resolve) => {
          const preload = document.createElement("link");
          preload.rel = extension === "mjs" ? "modulepreload" : "preload";
          if (extension !== "mjs") {
            preload.as = "fetch";
          }
          preload.crossOrigin = "anonymous";
          preload.href = locateFile(`orbit-characters.${extension}`);
          preload.onload = preload.onerror = () => resolve(undefined);
          document.head.append(preload);
        }),
    ),
  );
}
