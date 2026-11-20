// Keep the 720p bounds and byte budget from the saved image-compression work.
const maxBytes = 192 * 1024;
const originalFormats = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function fitImage720p(width, height) {
  if (!(width > 0 && height > 0)) throw Error('图片尺寸无效。');
  const landscape = width >= height;
  const scale = Math.min(1, (landscape ? 1280 : 720) / width, (landscape ? 720 : 1280) / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch { /* Fall back to the browser image element. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    throw Error('无法读取这张图片，请尝试 PNG、JPEG 或 WebP 格式。');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function compressImageFile(file, { signal, decode = decodeImage, createCanvas = makeCanvas } = {}) {
  signal?.throwIfAborted();
  if (file.type === 'image/svg+xml' || !file.size || file.size > 32 * 1024 * 1024) {
    throw Error('请选择 32 MB 以内的照片或截图。');
  }
  const bitmap = await decode(file);
  try {
    signal?.throwIfAborted();
    let { width, height } = fitImage720p(bitmap.width, bitmap.height);
    if (width === bitmap.width && height === bitmap.height && file.size <= maxBytes && originalFormats.has(file.type)) {
      return { blob: file, width, height };
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw Error('浏览器无法压缩图片。');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap.source ?? bitmap, 0, 0, width, height);
      const quality = [0.8, 0.65, 0.5][Math.min(attempt, 2)];
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      signal?.throwIfAborted();
      if (!blob?.size || blob.type !== 'image/jpeg') throw Error('浏览器无法编码图片。');
      if (blob.size <= maxBytes) return { blob, width, height };
      if (attempt >= 2) {
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
      }
    }
    throw Error('图片压缩后仍然过大，请裁剪后重试。');
  } finally {
    bitmap.close?.();
  }
}

export function imageDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), { once: true });
    reader.addEventListener('error', () => reject(Error('无法读取压缩后的图片。')), { once: true });
    reader.readAsDataURL(blob);
  });
}
