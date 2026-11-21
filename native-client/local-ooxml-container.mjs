/** Bounded, byte-verified ZIP32 parts for the local Office text parsers. */
const defaults = Object.freeze({ maxZipEntries: 5000, maxUncompressedBytes: 64 * 1024 * 1024, maxXmlPartBytes: 4 * 1024 * 1024 });
const fail = (message, code = 'file_corrupted', status = 422) => Object.assign(new Error(message), { code, status });
let crcTable;
function crcUpdate(crc, bytes) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
    return value >>> 0;
  });
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ crc >>> 8;
  return crc >>> 0;
}
function configuredLimits(value) {
  const result = { ...defaults, ...value };
  for (const [key, max] of Object.entries({ maxZipEntries: 10000, maxUncompressedBytes: 128 * 1024 * 1024, maxXmlPartBytes: 4 * 1024 * 1024 })) {
    if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > max) throw fail('Invalid local Office container limit', 'document_parser_configuration', 500);
  }
  return result;
}
function checkAbort(signal) { if (signal?.aborted) throw signal.reason ?? new DOMException('Office extraction cancelled', 'AbortError'); }

/** Index only. No member names are ever extracted into a filesystem. */
export function indexOfficeZip32(bytes, limits = {}) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) throw fail('Real Office document bytes are required', 'file_zero_bytes', 400);
  if (bytes.length > 20 * 1024 * 1024) throw fail('The Office source exceeds the local upload limit', 'file_too_large', 413);
  const configured = configuredLimits(limits);
  if (bytes.length < 22) throw fail('The Office ZIP container is incomplete');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (view.getUint32(at, true) === 0x06054b50 && at + 22 + view.getUint16(at + 20, true) === bytes.length) { end = at; break; }
  }
  if (end < 0) {
    if (view.getUint32(0, true) === 0x04034b50) throw fail('The Office ZIP container is truncated or has no valid directory');
    throw fail('This is not a supported Office ZIP container. Encrypted or legacy Office files must be unlocked or converted first', 'unhandled_mime_type', 415);
  }
  const count = view.getUint16(end + 10, true), countOnDisk = view.getUint16(end + 8, true), directorySize = view.getUint32(end + 12, true), directoryOffset = view.getUint32(end + 16, true);
  if (count === 65535 || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw fail('ZIP64 Office documents are outside the local parser limit', 'document_container_limit', 413);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || count !== countOnDisk || !count || count > configured.maxZipEntries || directoryOffset + directorySize > end) throw fail('The Office ZIP directory is invalid or exceeds its entry limit', 'document_container_limit', 413);
  const result = [], names = new Set(), offsets = new Set();
  let at = directoryOffset, expanded = 0;
  const decodeName = value => { try { return new TextDecoder('utf-8', { fatal: true }).decode(value); } catch { throw fail('An Office ZIP member name is not valid UTF8'); } };
  for (let index = 0; index < count; index++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) throw fail('The Office ZIP directory is damaged');
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true), compressedSize = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true), nameSize = view.getUint16(at + 28, true), extraSize = view.getUint16(at + 30, true), commentSize = view.getUint16(at + 32, true), localOffset = view.getUint32(at + 42, true);
    if (flags & 1) throw fail('This Office ZIP is encrypted. Unlock it before uploading', 'document_password_required', 422);
    if (![0, 8].includes(method)) throw fail('The Office ZIP uses an unsupported compression method', 'unhandled_mime_type', 415);
    if ([compressedSize, size, localOffset].includes(0xffffffff)) throw fail('ZIP64 Office members are outside the local parser limit', 'document_container_limit', 413);
    if (at + 46 + nameSize + extraSize + commentSize > directoryOffset + directorySize || localOffset + 30 > directoryOffset || view.getUint32(localOffset, true) !== 0x04034b50) throw fail('An Office ZIP entry is damaged');
    const name = decodeName(bytes.subarray(at + 46, at + 46 + nameSize));
    if (!name || /[\u0000-\u001f\\]/.test(name) || name.startsWith('/') || name.split('/').some(part => part === '..' || part === '.') || names.has(name) || offsets.has(localOffset)) throw fail('The Office ZIP has an invalid, duplicate or aliased member path');
    if (/(?:^|\/)vbaProject\.bin$/i.test(name)) throw fail('Macro-bearing Office documents are not supported locally', 'unhandled_mime_type', 415);
    const localNameSize = view.getUint16(localOffset + 26, true), localExtraSize = view.getUint16(localOffset + 28, true), dataOffset = localOffset + 30 + localNameSize + localExtraSize;
    if (dataOffset + compressedSize > directoryOffset || view.getUint16(localOffset + 8, true) !== method || view.getUint16(localOffset + 6, true) !== flags || localNameSize !== nameSize || decodeName(bytes.subarray(localOffset + 30, localOffset + 30 + localNameSize)) !== name) throw fail('An Office ZIP local header or compressed entry disagrees with its directory');
    names.add(name); offsets.add(localOffset); expanded += size;
    if (expanded > configured.maxUncompressedBytes) throw fail('The Office ZIP expands beyond the local document budget', 'document_container_limit', 413);
    const xml = /\.(?:xml|rels)$/i.test(name);
    if (xml && size > configured.maxXmlPartBytes) throw fail('An Office XML part exceeds the local XML byte limit', 'document_container_limit', 413);
    result.push(Object.freeze({ name, method, size, compressedSize, crc: view.getUint32(at + 16, true), dataOffset, xml }));
    at += 46 + nameSize + extraSize + commentSize;
  }
  if (at !== directoryOffset + directorySize) throw fail('The Office ZIP directory contains unexpected data');
  return Object.freeze(result);
}

/** Verify every real expanded byte/CRC once; retain only bounded XML/rels. */
export async function readOfficeZipParts(bytes, limits = {}, { signal } = {}) {
  const configured = configuredLimits(limits), entries = indexOfficeZip32(bytes, configured), parts = new Map();
  let total = 0;
  for (const entry of entries) {
    checkAbort(signal);
    let crc = 0xffffffff, size = 0;
    const collected = [];
    const accept = chunk => {
      checkAbort(signal); size += chunk.length; total += chunk.length;
      if (size > entry.size || total > configured.maxUncompressedBytes) throw fail('Office expanded bytes exceed the directory or actual local byte budget', 'document_container_limit', 413);
      crc = crcUpdate(crc, chunk);
      if (entry.xml) collected.push(chunk.slice());
    };
    const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    if (entry.method === 0) accept(compressed);
    else {
      if (typeof DecompressionStream !== 'function') throw fail('This browser has no bounded Office decompression stream', 'document_parser_unavailable', 503);
      let reader;
      try {
        reader = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        for (;;) { const next = await reader.read(); if (next.done) break; accept(next.value); }
      } catch (error) {
        await reader?.cancel().catch(() => {});
        if (error?.code || error?.name === 'AbortError') throw error;
        throw fail('An Office ZIP compressed entry could not be decoded');
      } finally { reader?.releaseLock(); }
    }
    if (size !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw fail('An Office entry failed its expanded-size/CRC check');
    if (entry.xml) {
      const value = new Uint8Array(size); let offset = 0;
      for (const chunk of collected) { value.set(chunk, offset); offset += chunk.length; }
      parts.set(entry.name, value);
    }
  }
  // A read-only facade prevents accidental mutation of the package's lookup.
  return Object.freeze({ get size() { return parts.size; }, get: name => parts.get(name), has: name => parts.has(name), keys: () => parts.keys(), values: () => parts.values(), entries: () => parts.entries(), forEach: callback => parts.forEach((value, name) => callback(value, name)), [Symbol.iterator]: () => parts[Symbol.iterator]() });
}
