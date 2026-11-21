const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
let browser;

test.before(async () => { browser = await chromium.launch({ headless: true }); });
test.after(async () => { await browser?.close(); });

async function gesturePage() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(`
    <main id="mainContent" style="width:900px;height:650px">
      <section id="content">
        <div id="pageSurface" style="height:120px">Page content</div>
        <div class="chat-message"><div class="chat-bubble" data-chat-message-id="message-42"><span>Message text</span></div></div>
        <div class="sg-collectible-grid" style="width:260px;height:130px">
          <article class="sg-collectible-card">One</article>
          <article class="sg-collectible-card">Two</article>
          <article class="sg-collectible-card">Three</article>
        </div>
      </section>
    </main>
    <div id="notificationList"><div class="notification-row" data-notification-row="notification-9"><span>New activity</span></div></div>
  `);
  await page.addStyleTag({ path: path.join(root, 'dist', 'swipe-gestures.css') });
  await page.evaluate(() => {
    window.page = 'home';
    window.replyingToMessageId = '';
    window.__lastPage = '';
    window.go = next => { window.page = next; window.__lastPage = next; };
    window.hideMessageActions = () => {};
    window.renderNotesPage = () => { window.__notesRendered = true; };
    window.syncNotesKeyboardLayout = () => {};
    window.dismissNotification = async id => {
      window.__dismissedNotification = id;
      document.querySelector('[data-notification-row="' + id + '"]')?.remove();
      return true;
    };
  });
  await page.addScriptTag({ path: path.join(root, 'dist', 'swipe-gestures.js') });
  return page;
}

async function drag(page, selector, dx, dy = 0) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, selector + ' should be visible for a drag');
  const x = box.x + Math.min(box.width / 2, 80);
  const y = box.y + Math.min(box.height / 2, 30);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

test('horizontal swipe on main content navigates to the next page', async () => {
  const page = await gesturePage();
  await drag(page, '#pageSurface', -150);
  assert.equal(await page.evaluate(() => window.__lastPage), 'gallery');
  await page.close();
});

test('swiping a chat bubble right opens reply for that exact message', async () => {
  const page = await gesturePage();
  await page.evaluate(() => { window.page = 'notes'; });
  await drag(page, '[data-chat-message-id="message-42"]', 110);
  assert.equal(await page.evaluate(() => window.replyingToMessageId), 'message-42');
  assert.equal(await page.evaluate(() => window.__notesRendered), true);
  await page.close();
});

test('swiping a notification left dismisses that notification', async () => {
  const page = await gesturePage();
  await drag(page, '[data-notification-row="notification-9"]', -120);
  await page.waitForFunction(() => window.__dismissedNotification === 'notification-9');
  assert.equal(await page.evaluate(() => window.__dismissedNotification), 'notification-9');
  assert.equal(await page.locator('[data-notification-row="notification-9"]').count(), 0);
  await page.close();
});
