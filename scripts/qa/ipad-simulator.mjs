import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { appendFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const site = new URL('https://tycofficial.github.io/chatgpt/');
const appium = new URL('http://127.0.0.1:4723/');
const editor = '#prompt-textarea, .ProseMirror[contenteditable=true], textarea[placeholder]';
const elementKey = 'element-6066-11e4-a52e-4f735466cecf';
let currentPhase = 'starting';

function phase(name, evidence = {}) {
  currentPhase = name;
  console.log(JSON.stringify({ phase: name, ...evidence }));
}

function selectDevice(inventory) {
  const runtimePrefix = 'com.apple.CoreSimulator.SimRuntime.iOS-';
  const eligible = Object.entries(inventory.devices ?? {}).flatMap(([runtime, devices]) => {
    if (!runtime.startsWith(runtimePrefix)) return [];
    const version = runtime.slice(runtimePrefix.length).replaceAll('-', '.');
    if (!/^\d+(\.\d+)+$/.test(version)) return [];
    return devices.filter(device => device.isAvailable && /^iPad[ A-Za-z0-9()-]*$/.test(device.name))
      .filter(device => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(device.udid))
      .map(device => ({ ...device, version }));
  });
  const preferred = ({ name }) => name === 'iPad (A16)' ? 0 : 1;
  eligible.sort((left, right) => right.version.localeCompare(left.version, 'en', { numeric: true })
    || preferred(left) - preferred(right) || left.name.localeCompare(right.name));
  assert(eligible.length, 'Xcode has no available iPad on an installed iOS Simulator runtime.');
  return eligible[0];
}

async function waitFor(label, check, timeout = 40_000) {
  const limit = Date.now() + timeout;
  let cause;
  do {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      cause = error;
    }
    await delay(300);
  } while (Date.now() < limit);
  throw Object.assign(new Error('Timed out waiting for ' + label, { cause }), { waitFor: label });
}

async function command(method, path, body, timeout = 65_000) {
  const operation = `${method} ${path === 'session' || path.startsWith('session/') && method === 'DELETE' ? 'session' : path.split('/').at(-1)}`;
  let response;
  try {
    response = await fetch(new URL(path, appium), {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (cause) {
    throw Object.assign(new Error('WebDriver did not return a response', { cause }), { operation, timeoutMs: timeout });
  }
  const payload = await response.json().catch(cause => {
    throw Object.assign(new Error('WebDriver returned an invalid response', { cause }), { operation, http: response.status });
  });
  if (!response.ok || payload.value?.error) {
    const protocolError = payload.value?.error;
    throw Object.assign(new Error('WebDriver rejected the command'), {
      operation, http: response.status,
      code: typeof protocolError === 'string' && /^[a-z0-9 _-]{1,60}$/i.test(protocolError) ? protocolError : 'webdriver_error',
    });
  }
  return payload.value;
}

function browser(sessionId) {
  const base = 'session/' + encodeURIComponent(sessionId);
  const perform = (method, path, body) => command(method, base + path, body);
  const execute = (script, ...args) => perform('POST', '/execute/sync', { script, args });

  async function find(selector, enabled = false) {
    return waitFor(selector, async () => {
      const elements = await perform('POST', '/elements', { using: 'css selector', value: selector });
      for (const element of elements) {
        const usable = await execute(
          'const [node, needsEnabled] = arguments;'
          + 'const style = getComputedStyle(node);'
          + 'return node.isConnected && node.getClientRects().length > 0 && style.visibility === "visible" '
          + '&& (!needsEnabled || !node.disabled && node.getAttribute("aria-disabled") !== "true");',
          element, enabled,
        );
        if (usable) return '/element/' + encodeURIComponent(element[elementKey]);
      }
      return false;
    });
  }

  return {
    execute,
    goto: url => perform('POST', '/url', { url: url.href }),
    refresh: () => perform('POST', '/refresh', {}),
    async type(selector, text) {
      const path = await find(selector);
      await perform('POST', path + '/click', {});
      await perform('POST', path + '/value', { text });
    },
    async click(selector) {
      const path = await find(selector, true);
      await perform('POST', path + '/click', {});
    },
  };
}

function browserState(page) {
  return page.execute(
    'const editable = [...document.querySelectorAll(arguments[0])].find(node => '
    + 'node.getClientRects().length > 0 && (node.isContentEditable || node.tagName === "TEXTAREA"));'
    + 'const bootstrap = [...document.scripts].find(node => '
    + 'node.src && new URL(node.src).pathname.endsWith("/native-client/bootstrap.mjs"));'
    + 'return { path: location.pathname, origin: location.origin, '
    + 'release: window.__CHATGPT_REPLICA_ENV__?.release ?? document.documentElement.dataset.nativeClientRelease, '
    + 'bootstrapRelease: bootstrap ? new URL(bootstrap.src).searchParams.get("v") : window.__CHATGPT_REPLICA_ENV__?.release, '
    + 'editorReady: !!editable, draft: editable ? (editable.value ?? editable.innerText) : null, '
    + 'width: innerWidth, height: innerHeight, touchPoints: navigator.maxTouchPoints, '
    + 'userAgent: navigator.userAgent, pixelRatio: devicePixelRatio };',
    editor,
  );
}

function assertSite(state, expectedRelease) {
  assert.equal(state.origin, site.origin);
  assert(state.path === '/chatgpt' || state.path.startsWith(site.pathname), state.path);
  assert.equal(state.release, expectedRelease, 'Safari HTML and the public release manifest disagree.');
  assert.equal(state.bootstrapRelease, expectedRelease, 'Safari HTML selected a different bootstrap version.');
}

async function openEditor(page, description) {
  return waitFor(description, async () => {
    const state = await browserState(page);
    return state.editorReady ? state : false;
  });
}

function hasMessage(page, role, text) {
  return page.execute(
    'const shown = node => node.getClientRects().length && !node.closest("[aria-hidden=true],[hidden],[contenteditable=true]");'
    + 'const match = node => shown(node) && node.innerText.trim() === arguments[1];'
    + 'const native = [...document.querySelectorAll("main [data-message-author-role]")].filter(node => '
    + 'shown(node) && node.getAttribute("data-message-author-role") === arguments[0]);'
    + 'if (native.length) return native.filter(node => match(node) || [...node.querySelectorAll("p, pre code")].some(match)).length;'
    + 'return [...document.querySelectorAll("main p, main pre code")].filter(match).length;',
    role, text,
  );
}

async function sendPrompt(page, prompt) {
  await page.type(editor, prompt);
  await page.click('button[data-testid="send-button"], button[aria-label="发送"], button[aria-label="Send message"]');
}

async function liveChat(page, expectedRelease) {
  phase('signup-opening');
  await page.goto(new URL('auth/signup/', site));
  const username = 'qa_ipad_' + randomBytes(6).toString('hex');
  const password = 'Qa9!' + randomBytes(18).toString('base64url');
  await page.type('#site-username', username);
  await page.type('#site-password', password);
  await page.click('#site-password + button[type=submit], form button[type=submit]');
  assertSite(await openEditor(page, 'signed-in Chat editor'), expectedRelease);
  const signedIn = await page.execute(
    'const bootstrap = document.querySelector("#client-bootstrap");'
    + 'return !!bootstrap && JSON.parse(bootstrap.textContent).session?.user?.name === arguments[0];',
    username,
  );
  assert(signedIn, 'The registered test account was not active in the application.');
  phase('signup-verified');

  const firstReply = 'IPAD-QA-' + randomBytes(3).toString('hex');
  const firstPrompt = 'Reply with exactly ' + firstReply + ' and no other text.';
  phase('first-message-sending');
  await sendPrompt(page, firstPrompt);
  const conversation = await waitFor('the sent conversation route', async () => {
    const state = await browserState(page);
    return state.path.startsWith(site.pathname + 'c/') ? state.path : false;
  });
  const completedBeforeRefresh = Boolean(await hasMessage(page, 'assistant', firstReply));
  phase('first-message-refreshing', { completedBeforeRefresh });
  await page.refresh();
  const reloaded = await openEditor(page, 'Chat editor after refreshing a sent conversation');
  assertSite(reloaded, expectedRelease);
  assert.equal(reloaded.path, conversation);
  await waitFor('the first reply after refreshing', () => hasMessage(page, 'assistant', firstReply), 65_000);
  assert.equal(await hasMessage(page, 'user', firstPrompt), 1);
  assert.equal(await hasMessage(page, 'assistant', firstReply), 1);
  phase('first-message-restored');

  const nextReply = 'IPAD-NEXT-' + randomBytes(3).toString('hex');
  phase('follow-up-sending');
  await sendPrompt(page, 'Reply with exactly ' + nextReply + ' and no other text.');
  await waitFor('a reply to the follow-up', () => hasMessage(page, 'assistant', nextReply), 65_000);
  assert.equal((await browserState(page)).path, conversation);
  assert.equal(await hasMessage(page, 'assistant', firstReply), 1);
  assert.equal(await hasMessage(page, 'assistant', nextReply), 1);
  phase('follow-up-verified');
  return { sentMessages: 2, completedBeforeRefresh, oneReplyPerPromptInTranscript: true };
}

async function smoke() {
  const { IPAD_UDID: udid, IPAD_NAME: deviceName, IPAD_OS: platformVersion } = process.env;
  assert(udid && deviceName && platformVersion, 'Select an iPad Simulator with Xcode before running Safari QA.');
  phase('public-release-check');
  const manifestResponse = await fetch(new URL('native-client/active.json', site), {
    headers: { 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(15_000),
  });
  assert(manifestResponse.ok, 'The public release manifest returned HTTP ' + manifestResponse.status);
  const { release } = await manifestResponse.json();
  assert(/^[0-9a-f]{16}$/.test(release), 'The public site did not advertise an active native release.');
  if (process.env.IPAD_EXPECT_RELEASE) assert.equal(release, process.env.IPAD_EXPECT_RELEASE);
  phase('public-release-verified', { release });

  phase('webdriver-listener-check');
  await waitFor('the local Appium server', async () => (await command('GET', 'status', undefined, 2000)).ready, 45_000);
  phase('webdriver-listener-ready');
  const started = Date.now();
  phase('safari-session-opening', { deviceName, iPadOS: platformVersion });
  const session = await command('POST', 'session', {
    capabilities: {
      alwaysMatch: {
        platformName: 'iOS',
        browserName: 'Safari',
        'appium:automationName': 'Safari',
        'safari:useSimulator': true,
        'safari:deviceType': 'iPad',
        'safari:deviceUDID': udid,
        'safari:platformVersion': platformVersion,
        'appium:newCommandTimeout': 180,
      },
      firstMatch: [{}],
    },
  }, 150_000);
  assert(session?.sessionId, 'Appium did not create a Safari session.');
  phase('safari-session-created', { elapsedMs: Date.now() - started });
  try {
    if (process.env.IPAD_SESSION_READY_MARKER) await writeFile(process.env.IPAD_SESSION_READY_MARKER, 'safari-session-created\n');
    const actual = session.capabilities ?? {};
    assert.equal(actual.browserName?.toLowerCase(), 'safari', 'Safari WebDriver did not report Safari.');
    assert.equal(actual.platformName?.toLowerCase(), 'ios', 'Safari WebDriver did not report iOS.');
    if (actual['safari:deviceUDID']) assert.equal(actual['safari:deviceUDID'].toLowerCase(), udid.toLowerCase());
    const page = browser(session.sessionId);
    phase('public-home-navigating');
    await page.goto(site);
    const initial = await openEditor(page, 'an editable public Chat home in Safari');
    assertSite(initial, release);
    assert(initial.touchPoints > 0, 'Safari reports no touch input support.');
    phase('public-editor-ready', { viewport: [initial.width, initial.height], touchPoints: initial.touchPoints });

    const draft = 'iPad Safari QA';
    await page.type(editor, draft);
    await waitFor('the draft entered through the Safari editor', async () => (await browserState(page)).draft?.trim() === draft);
    phase('draft-entered');
    await page.refresh();
    const refreshed = await openEditor(page, 'the public Chat editor after refreshing');
    assertSite(refreshed, release);
    phase('public-editor-refresh-verified');

    const result = {
      runtime: 'Xcode iPad Simulator, Apple Safari WebDriver',
      deviceName,
      iPadOS: actual['safari:platformVersion'] ?? actual.platformVersion ?? platformVersion,
      release,
      userAgent: initial.userAgent,
      touchPoints: initial.touchPoints,
      pixelRatio: initial.pixelRatio,
      viewport: [refreshed.width, refreshed.height],
      editorEntryAndRefreshPassed: true,
      unsentDraftPersisted: refreshed.draft?.trim() === draft,
      elapsedMs: Date.now() - started,
    };
    if (process.env.IPAD_LIVE_CHAT === '1') result.liveChat = await liveChat(page, release);
    const evidence = JSON.stringify(result, null, 2);
    console.log(evidence);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, '## Public Safari smoke test on iPad Simulator\n\n'
        + evidence.split('\n').map(line => '    ' + line).join('\n') + '\n');
    }
  } finally {
    await command('DELETE', 'session/' + encodeURIComponent(session.sessionId), undefined, 10_000)
      .catch(() => console.warn('Local Safari WebDriver session cleanup did not complete.'));
  }
}

if (process.argv[2] === 'select-device') {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const device = selectDevice(JSON.parse(Buffer.concat(chunks)));
  console.log('IPAD_UDID=' + device.udid + '\nIPAD_NAME=' + device.name + '\nIPAD_OS=' + device.version);
} else {
  try {
    await smoke();
  } catch (error) {
    const causes = [];
    for (let cause = error; cause && causes.length < 4; cause = cause.cause) {
      causes.push({ name: cause.name, operation: cause.operation, waitFor: cause.waitFor, code: cause.code, http: cause.http, timeoutMs: cause.timeoutMs });
    }
    console.error(JSON.stringify({ phase: currentPhase, failed: true, causes }));
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `## iPad Safari QA\n\nLast phase: \`${currentPhase}\`.\n`);
    }
    process.exitCode = 1;
  }
}
