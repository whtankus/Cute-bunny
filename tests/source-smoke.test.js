const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('core browser scripts parse without syntax errors', () => {
  for (const file of ['app.js', 'sw.js', 'scripts/build-preview.js']) {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }), file);
  }
});

test('the app shell references local stylesheets that exist', () => {
  const html = read('index.html');
  const stylesheets = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1]);
  assert.ok(stylesheets.length >= 2, 'expected the main and polish stylesheets');

  for (const href of stylesheets) {
    if (/^https?:\/\//i.test(href)) continue;
    const file = decodeURIComponent(href.split('?')[0].replace(/^\.\//, ''));
    assert.ok(fs.existsSync(path.join(root, file)), 'missing stylesheet: ' + file);
  }
});

test('runtime scripts load configuration before the application', () => {
  const html = read('index.html');
  const configIndex = html.indexOf('src="supabase-config.js"');
  const appIndex = html.indexOf('src="app.js');
  assert.notEqual(configIndex, -1, 'Supabase configuration script must be present');
  assert.notEqual(appIndex, -1, 'application script must be present');
  assert.ok(configIndex < appIndex, 'configuration must load before app.js');
});

test('offline shell keeps navigation fallback and notification handling', () => {
  const sw = read('sw.js');
  assert.match(sw, /self\.addEventListener\(["']install["']/);
  assert.match(sw, /self\.addEventListener\(["']activate["']/);
  assert.match(sw, /self\.addEventListener\(["']fetch["']/);
  assert.match(sw, /cache\.match\(["']\.\/index\.html["']\)/);
  assert.match(sw, /self\.addEventListener\(["']notificationclick["']/);
});

test('build script copies the app shell and emits generated configuration', () => {
  const build = read('scripts/build-preview.js');
  for (const asset of ['index.html', 'app.js', 'style.css', 'polish.css', 'sw.js', 'manifest.webmanifest']) {
    assert.ok(build.includes("'" + asset + "'"), 'build asset list must include ' + asset);
  }
  assert.match(build, /SUPABASE_URL/);
  assert.match(build, /SUPABASE_PUBLISHABLE_KEY/);
});
