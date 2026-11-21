const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const fixture = fs.readFileSync(path.join(__dirname, 'helpers/mock-supabase.js'), 'utf8');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png'
};

let browser;
let server;
let baseUrl;
const contexts = new Set();

test.before(async () => {
  browser = await chromium.launch({ headless: true });
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(dist, relative);
    if (!file.startsWith(dist + path.sep) && file !== path.join(dist, 'index.html')) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});

test.after(async () => {
  for (const context of contexts) await context.close();
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

async function newTestPage({ authenticated = false, viewport, seedHistory = false } = {}) {
  const context = await browser.newContext({
    viewport: viewport || { width: 1280, height: 900 },
    serviceWorkers: 'block'
  });
  contexts.add(context);
  const page = await context.newPage();
  await page.addInitScript({ content: fixture + `\n;(() => {\n  const authenticated = ${JSON.stringify(authenticated)};\n  const seedHistory = ${JSON.stringify(seedHistory)};\n  if (authenticated) localStorage.setItem('cuteBunnyTestAuth', 'true');\n  if (seedHistory) {\n    const state = window.__cuteBunnyTestState;\n    state.nextMemoryId = 2000;\n    for (let id = 1000; id < 1090; id++) {\n      state.tables.memories.push({ id, owner_id: id % 2 === 0 ? state.friend.id : state.user.id, kind: 'note', text: id === 1000 ? 'An old message with a persistent heart ♡ and a long line that should wrap naturally without wasting available space.' : 'Historical conversation message number ' + id + ' with words of different lengths and an emoji 🌷', created_at: new Date(Date.UTC(2026, 10, 21, 12, 0, 0) - (1090 - id) * 60000).toISOString(), file_name: '', content_type: '', storage_path: '' });\n    }\n    state.tables.memory_likes.push(
      { memory_id: 1000, user_id: state.user.id, created_at: new Date().toISOString() },
      { memory_id: 1000, user_id: 'other-test-user', created_at: new Date().toISOString() }
    );
    state.tables.memory_reactions.push(
      { memory_id: 1000, user_id: state.friend.id, emoji: '❤️', created_at: new Date().toISOString() },
      { memory_id: 1000, user_id: state.user.id, emoji: '🥰', created_at: new Date().toISOString() }
    );\n  }\n})();` });
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route => route.abort());
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  return page;
}

async function waitForSignedInApp(page) {
  await page.locator('#app').waitFor({ state: 'visible' });
  await page.locator('#sessionRestore').waitFor({ state: 'hidden' });
  await page.locator('#nav button[data-page="home"]').waitFor({ state: 'visible' });
}

test('welcome screen renders and opens registration', async () => {
  const page = await newTestPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.locator('#welcome').waitFor({ state: 'visible' });
  await page.locator('#enter').click();
  await page.locator('#authGate').waitFor({ state: 'visible' });
  assert.match(await page.locator('#authTitle').innerText(), /Create your account/);
  assert.equal(await page.locator('#authDisplay').evaluate(el => !el.closest('label').classList.contains('hidden')), true);
  assert.equal(await page.locator('#authUser').evaluate(el => !el.closest('label').classList.contains('hidden')), true);

  assert.deepEqual(errors, [], 'browser runtime should not throw uncaught errors');
});

test('registration and sign-in modes expose the correct fields', async () => {
  const page = await newTestPage();
  await page.locator('#enter').click();
  await page.locator('#authGate').waitFor({ state: 'visible' });

  await page.locator('#authSwitch').click();
  assert.match(await page.locator('#authTitle').innerText(), /Welcome back/);
  assert.equal(await page.locator('#authDisplay').evaluate(el => el.closest('label').classList.contains('hidden')), true);
  assert.equal(await page.locator('#authUser').evaluate(el => el.closest('label').classList.contains('hidden')), true);
  assert.equal(await page.locator('#authEmail').getAttribute('type'), 'text');
  assert.equal(await page.locator('#authEmail').getAttribute('placeholder'), 'Username or email');

  await page.locator('#authSwitch').click();
  assert.match(await page.locator('#authTitle').innerText(), /Create your account/);
  assert.equal(await page.locator('#authEmail').getAttribute('type'), 'email');
  assert.equal(await page.locator('#authDisplay').evaluate(el => !el.closest('label').classList.contains('hidden')), true);
});

test('welcome and authentication layouts fit a narrow mobile viewport', async () => {
  const page = await newTestPage({ viewport: { width: 360, height: 780 } });
  const welcomeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(welcomeOverflow, false, 'welcome screen should not overflow horizontally');

  await page.locator('#enter').click();
  await page.locator('#authGate').waitFor({ state: 'visible' });
  const authOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(authOverflow, false, 'authentication screen should not overflow horizontally');
});

test('authenticated session restores and sends a Notes message', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#nav button[data-page="notes"]').click();
  await page.locator('#chatComposer').waitFor({ state: 'visible' });
  await page.locator('#chatInput').fill('Browser test message ♡');
  await page.locator('#chatSend').click();

  await page.locator('#chatThread').getByText('Browser test message ♡').waitFor({ state: 'visible' });
  const saved = await page.evaluate(() => window.__cuteBunnyTestState.tables.memories.find(row => row.text === 'Browser test message ♡'));
  assert.ok(saved, 'the message should be persisted through the Supabase client');
  assert.equal(saved.owner_id, 'user-ankush-test');
  assert.equal(saved.kind, 'note');
});

test('opening Notes records a seen receipt for a visible friend message', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#nav button[data-page="notes"]').click();
  await page.locator('#chatThread').getByText('A little hello from your friend ♡').waitFor({ state: 'visible' });

  await page.waitForFunction(() => window.__cuteBunnyTestState.calls.some(call => call.rpc === 'mark_notes_seen'));
  const cursor = await page.evaluate(() => window.__cuteBunnyTestState.tables.note_read_cursors.find(row => row.owner_id === 'friend-test'));
  assert.ok(cursor, 'a read cursor should be created for the friend');
  assert.equal(cursor.reader_id, 'user-ankush-test');
  assert.equal(cursor.last_read_message_id, 101);
  await page.waitForFunction(() => window.__cuteBunnyTestState.tables.note_delivery_receipts.some(row => row.message_id === 101));
  const delivery = await page.evaluate(() => window.__cuteBunnyTestState.tables.note_delivery_receipts.find(row => row.message_id === 101));
  assert.equal(delivery.reader_id, 'user-ankush-test');
});

test('Notes can reply to a specific message and persist its parent ID', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#nav button[data-page="notes"]').click();
  const bubble = page.locator('.chat-message[data-memory="101"] .chat-bubble');
  await bubble.waitFor({ state: 'visible' });
  const box = await bubble.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(260);
  await page.mouse.up();
  await page.locator('.chat-actions-popup [data-chat-reply="101"]').click();
  await page.locator('#chatReplyingTo').waitFor({ state: 'visible' });
  await page.locator('#chatInput').fill('Replying to your hello ♡');
  await page.locator('#chatSend').click();
  await page.waitForFunction(() => window.__cuteBunnyTestState.tables.memories.some(row => row.text === 'Replying to your hello ♡'));
  const saved = await page.evaluate(() => window.__cuteBunnyTestState.tables.memories.find(row => row.text === 'Replying to your hello ♡'));
  assert.equal(saved.reply_to_id, 101);
});

test('profile edits save through the authenticated database client', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#profileOpen').click();
  await page.locator('#friendProfileGate').waitFor({ state: 'visible' });
  const flower = page.locator('#friendProfileFollow[data-theme-action="true"]');
  await flower.dispatchEvent('pointerdown', { pointerId: 1, clientX: 20, clientY: 20 });
  await page.waitForTimeout(650);
  await flower.dispatchEvent('pointerup', { pointerId: 1, clientX: 20, clientY: 20 });
  await page.locator('#profileGate').waitFor({ state: 'visible' });
  await page.locator('#profileDisplay').fill('Ankush Updated');
  await page.locator('#profileBio').fill('Updated from the browser test');
  await page.locator('#profileSave').click();
  await page.locator('#profileGate').waitFor({ state: 'hidden' });

  const profile = await page.evaluate(() => window.__cuteBunnyTestState.tables.profiles.find(row => row.id === 'user-ankush-test'));
  assert.equal(profile.display_name, 'Ankush Updated');
  assert.equal(profile.bio, 'Updated from the browser test');
  const settingsSaved = await page.evaluate(() => window.__cuteBunnyTestState.calls.some(call => call.table === 'profile_private_settings' && call.action === 'upsert'));
  assert.equal(settingsSaved, true, 'profile save should persist notification preferences');
});

test('notification centre renders the authenticated user’s activity', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#notificationOpen').click();
  await page.locator('#notificationGate').waitFor({ state: 'visible' });
  await page.locator('#notificationList .notification-row').waitFor({ state: 'visible' });
  await page.locator('#notificationList').getByText('Bunny Friend').waitFor({ state: 'visible' });
  await page.locator('#notificationList').getByText('liked your photo').waitFor({ state: 'visible' });
});

test('photo upload stores the file and creates a memory record', async () => {
  const page = await newTestPage({ authenticated: true });
  await waitForSignedInApp(page);
  await page.locator('#nav button[data-page="gallery"]').click();
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/W9sAAAAASUVORK5CYII=', 'base64');
  await page.locator('input[data-upload="photo"]').setInputFiles({
    name: 'browser-test.png',
    mimeType: 'image/png',
    buffer: image
  });

  await page.waitForFunction(() => window.__cuteBunnyTestState.tables.memories.some(row => row.file_name === 'browser-test.png'));
  const result = await page.evaluate(() => ({
    memory: window.__cuteBunnyTestState.tables.memories.find(row => row.file_name === 'browser-test.png'),
    upload: window.__cuteBunnyTestState.uploads.find(row => row.name === 'browser-test.png')
  }));
  assert.ok(result.upload, 'the media file should be uploaded to the private memories bucket');
  assert.equal(result.upload.bucket, 'memories');
  assert.equal(result.memory.owner_id, 'user-ankush-test');
  assert.equal(result.memory.kind, 'photo');
  assert.match(result.memory.storage_path, /^user-ankush-test\//);
});


test('Notes history uses stable keyset pagination and restores old message hearts', async () => {
  const page = await newTestPage({ authenticated: true, seedHistory: true });
  await waitForSignedInApp(page);
  await page.locator('#nav button[data-page="notes"]').click();
  await page.locator('.chat-message[data-memory="1089"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.chat-message[data-memory="1000"]').count(), 0, 'older rows should begin outside the first page');

  await page.evaluate(() => {
    const state = window.__cuteBunnyTestState;
    state.tables.memories.push({ id: 1090, owner_id: state.friend.id, kind: 'note', text: 'A new realtime message', created_at: new Date(Date.now() + 1000).toISOString(), file_name: '', content_type: '', storage_path: '' });
    const thread = document.querySelector('#chatThread');
    thread.scrollTop = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelectorAll('#chatThread > .chat-message[data-memory]').length >= 80);
  await page.evaluate(() => {
    document.querySelector('#chatThread').scrollTop = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }));
  });
  await page.locator('.chat-message[data-memory="1000"]').waitFor({ state: 'visible' });
  const oldMessage = page.locator('.chat-message[data-memory="1000"]');
  assert.match(await oldMessage.getAttribute('class'), /\bis-loved\b/, 'the historical message should render its saved heart state');
  assert.equal(await oldMessage.getAttribute('data-like-count'), '2', 'all hearts from different users should remain attached to the historical message');
  assert.equal(await oldMessage.getAttribute('data-reaction-count'), '2', 'all emoji reactions should hydrate with the historical message');
  const reactionQueryRan = await page.evaluate(() => window.__cuteBunnyTestState.calls.some(call => call.table === 'memory_reactions' && call.action === 'select'));
  assert.equal(reactionQueryRan, true, 'historical reaction rows should be fetched from persistent storage');
  const persisted = await page.evaluate(() => window.__cuteBunnyTestState.tables.memory_likes.some(row => row.memory_id === 1000 && row.user_id === 'user-ankush-test'));
  assert.equal(persisted, true, 'historical heart remains in persistent reaction storage');
});

test('message text wraps naturally inside existing desktop and mobile bubble limits', async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 360, height: 780 }]) {
    const page = await newTestPage({ authenticated: true, viewport, seedHistory: true });
    await waitForSignedInApp(page);
    await page.locator('#nav button[data-page="notes"]').click();
    const text = page.locator('.chat-message[data-memory="1089"] .chat-message-text');
    await text.waitFor({ state: 'visible' });
    const metrics = await text.evaluate(node => ({
      overflowWrap: getComputedStyle(node).overflowWrap,
      wordBreak: getComputedStyle(node).wordBreak,
      whiteSpace: getComputedStyle(node).whiteSpace,
      bubbleOverflow: node.closest('.chat-bubble').scrollWidth > node.closest('.chat-bubble').clientWidth,
      renderedLines: (() => { const range = document.createRange(); range.selectNodeContents(node); return range.getClientRects().length; })()
    }));
    assert.equal(metrics.overflowWrap, 'break-word');
    assert.equal(metrics.wordBreak, 'normal');
    assert.equal(metrics.whiteSpace, 'pre-wrap');
    assert.equal(metrics.bubbleOverflow, false);
    assert.ok(metrics.renderedLines >= 2, 'the long emoji-containing message should wrap naturally');
    await page.context().close();
    contexts.delete(page.context());
  }
});
