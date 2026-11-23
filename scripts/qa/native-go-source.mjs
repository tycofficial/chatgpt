import { glob, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
const root = join(process.env.RUNNER_TEMP, 'chatgpt-upstream-capture', process.env.UPSTREAM, 'public', 'chatgpt.com', 'cdn', 'assets');
const found = new Map();
const targets = [
  ['card-module', /(?:^|[,\{])Y0ov\s*[:(]/],
  ['go-checkout', /(?:"go"\s*,\s*(?:price|lookup)|lookupType\s*:\s*"go"|go\s*:\s*\{lookupType|["']get_go["']|["']has_go["']|["']is_go_enabled["'])/i],
  ['go-feature', /[a-zA-Z0-9_]*(?:showGoPlan|isGoEligible|canShowGo|isGoAvailable|isGoEnabled|enabledGoPlan|checkout_go|chatgpt_go_checkout|go_plan_eligible|enable_go_plan|show_go_plan)[a-zA-Z0-9_]*/],
  ['go-label', /(?:Get Go|Upgrade to Go|Go available|Go plan is|ChatGPT Go is now|downgrade to Go)/],
  ['codex-surface', /(?:browserCodexEnabled|isBrowserCodexEnabled|showCodexMode|showCodexEntry|codex_tab_visible|showCodexTab)/],
];
for await (const file of glob('**/*.js', { cwd: root })) {
  const contents = await readFile(join(root, file), 'utf8');
  for (const [name, pattern] of targets) {
    const rows = found.get(name) ?? [];
    if (rows.length >= 14) continue;
    const hit = pattern.exec(contents);
    if (!hit) continue;
    const context = contents.slice(Math.max(0, hit.index - 160), hit.index + hit[0].length + 255);
    rows.push({file: basename(file), anchor: hit[0], context: context.replace(/\s+/g,' ')});
    found.set(name, rows);
  }
}
console.log('Native UI source markers ' + JSON.stringify(Object.fromEntries(found)));
