const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
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

test.before(async () => {
  browser = await chromium.launch({ headless: true });
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
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
  await browser?.close();
  await new Promise(resolve => server?.close(resolve));
});

test('welcome screen renders and opens registration', async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#welcome').waitFor({ state: 'visible' });
  await assertVisible(page, '#enter');

  await page.locator('#enter').click();
  await page.locator('#authGate').waitFor({ state: 'visible' });
  assert.match(await page.locator('#authTitle').innerText(), /Create your account/);
  await assertVisible(page, '#authDisplay');
  await assertVisible(page, '#authUser');

  assert.deepEqual(errors, [], 'browser runtime should not throw uncaught errors');
  await page.close();
});

test('registration and sign-in modes expose the correct fields', async () => {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
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
  await page.close();
});

test('welcome and authentication layouts fit a narrow mobile viewport', async () => {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 }, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const welcomeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(welcomeOverflow, false, 'welcome screen should not overflow horizontally');

  await page.locator('#enter').click();
  await page.locator('#authGate').waitFor({ state: 'visible' });
  const authOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(authOverflow, false, 'authentication screen should not overflow horizontally');
  await page.close();
});

async function assertVisible(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible' });
  assert.equal(await page.locator(selector).isVisible(), true);
}
