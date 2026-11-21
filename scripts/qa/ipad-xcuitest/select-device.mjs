import assert from 'node:assert/strict';

const input = [];
for await (const chunk of process.stdin) input.push(chunk);
const { devices } = JSON.parse(Buffer.concat(input));
const prefix = 'com.apple.CoreSimulator.SimRuntime.iOS-';
const candidates = Object.entries(devices).flatMap(([runtime, entries]) => {
  if (!runtime.startsWith(prefix)) return [];
  const version = runtime.slice(prefix.length).replaceAll('-', '.');
  if (!/^\d+(\.\d+)+$/.test(version)) return [];
  return entries.filter(({ isAvailable, name, udid }) => isAvailable && /^iPad[ A-Za-z0-9()-]*$/.test(name) && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(udid))
    .map(({ name, udid }) => ({ version, name, udid }));
});
const preferred = name => Number(name !== 'iPad (A16)');
candidates.sort((left, right) => right.version.localeCompare(left.version, 'en', { numeric: true }) ||
  preferred(left.name) - preferred(right.name) || left.name.localeCompare(right.name));
assert(candidates.length, 'Xcode reported no available iPad Simulator.');
const { name, udid, version } = candidates[0];
console.log('IPAD_UDID=' + udid + '\nIPAD_NAME=' + name + '\nIPAD_OS=' + version);
