/** Bound provider/history image bytes to approximately 720p before API submission. */
export function fitImage720p(width, height) {
  if (!(width > 0 && height > 0)) throw Error('图片尺寸无效。');
  const landscape = width >= height;
  const scale = Math.min(1, (landscape ? 1280 : 720) / width, (landscape ? 720 : 1280) / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
async function decodeImage(blob) {
  if (typeof globalThis.createImageBitmap === 'function') {
    try { return await globalThis.createImageBitmap(blob); }
    catch { /* Use the browser image element as a second decoder. */ }
  }
  if (!globalThis.Image || !globalThis.URL?.createObjectURL) throw Error('当前浏览器不支持图片压缩，请使用新版浏览器。');
  const url = URL.createObjectURL(blob), image = new Image();
  try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('图片解码失败。')); image.src = url; }); return { width: image.naturalWidth, height: image.naturalHeight, source: image, close() {} }; }
  finally { URL.revokeObjectURL(url); }
}
function canvas(width, height) {
  if (typeof globalThis.OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
  const value = globalThis.document?.createElement('canvas');
  if (!value) throw Error('当前浏览器不支持图片压缩。');
  value.width = width; value.height = height; return value;
}
export async function compressImageInput(bytes, info, { signal, decode = decodeImage, createCanvas = canvas, maxBytes = 192 * 1024 } = {}) {
  signal?.throwIfAborted();
  const target = fitImage720p(info.width, info.height);
  if (target.width === info.width && target.height === info.height && bytes.length <= maxBytes) return { bytes, ...info, compressed: false };
  const bitmap = await decode(new Blob([bytes], { type: info.mimeType }));
  try {
    signal?.throwIfAborted();
    let { width, height } = fitImage720p(bitmap.width, bitmap.height);
    for (let attempt = 0; attempt < 6; attempt++) {
      const image = createCanvas(width, height), ctx = image.getContext('2d');
      if (!ctx) throw Error('浏览器无法创建图片压缩画布。');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap.source ?? bitmap, 0, 0, width, height);
      const options = { type: 'image/jpeg', quality: [0.8, 0.65, 0.5][Math.min(attempt, 2)] };
      const blob = image.convertToBlob ? await image.convertToBlob(options) : await new Promise((resolve, reject) => image.toBlob(value => value ? resolve(value) : reject(Error('图片压缩失败。')), options.type, options.quality));
      signal?.throwIfAborted();
      if (!blob?.size || blob.type !== 'image/jpeg') throw Error('浏览器无法编码压缩图片。');
      if (blob.size <= maxBytes) {
        const output = new Uint8Array(await blob.arrayBuffer());
        signal?.throwIfAborted();
        return { bytes: output, mimeType: 'image/jpeg', width, height, compressed: true };
      }
      if (attempt >= 2) { width = Math.max(1, Math.round(width * 0.8)); height = Math.max(1, Math.round(height * 0.8)); }
    }
    throw Error('图片压缩后仍然过大，请裁剪后重试。');
  } finally { bitmap.close?.(); }
}
