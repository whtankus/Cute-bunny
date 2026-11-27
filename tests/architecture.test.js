const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Supabase client factory validates configuration and passes stable auth options', () => {
  const context = { window: {} };
  vm.runInNewContext(read('src/services/supabase-client.js'), context);
  const createClient = context.window.CuteBunnyServices.createSupabaseClient;
  assert.equal(createClient(null, { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'key' }), null);
  assert.equal(createClient({ createClient() {} }, { supabaseUrl: '', supabaseAnonKey: 'key' }), null);
  let received;
  const sdk = { createClient: (...args) => (received = args, { ready: true }) };
  const client = createClient(sdk, { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-key' });
  assert.equal(client.ready, true);
  assert.equal(received[0], 'https://example.supabase.co');
  assert.equal(received[1], 'public-key');
  assert.deepEqual(JSON.parse(JSON.stringify(received[2])), { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
});

test('API service delegates registration through the injected Supabase client', async () => {
  const context = { window: { location: { href: 'https://cute-bunny.example/' } }, FormData, URL, console };
  vm.runInNewContext(read('src/services/api.js'), context);
  let received;
  const client = { auth: { signUp: async options => { received = options; return { data: { session: null, user: { id: 'user-1' } }, error: null }; } } };
  const api = context.window.CuteBunnyServices.createApi({
    client,
    getCurrentUser: () => null,
    fetchFriendHeartCounts: async () => new Map(),
    themes: ['rose']
  });
  const result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email: 'bunny@example.com', password: 'safe-password', username: 'bunny', displayName: 'Bunny' }) });
  assert.equal(result.user.id, 'user-1');
  assert.equal(result.needsEmailConfirm, true);
  assert.equal(received.options.data.username, 'bunny');
  assert.equal(received.options.data.display_name, 'Bunny');
});

test('media optimizer keeps unsupported and GIF uploads unchanged', async () => {
  const context = { window: { CuteBunnyServices: {} }, console };
  vm.runInNewContext(read('src/services/media-optimizer.js'), context);
  const optimize = context.window.CuteBunnyServices.optimizePhotoUpload;
  const gif = { type: 'image/gif', name: 'memory.gif', size: 500 };
  const text = { type: 'text/plain', name: 'note.txt', size: 10 };
  assert.equal(await optimize(gif), gif);
  assert.equal(await optimize(text), text);
});

test('core DOM helpers expose query and HTML escaping without changing text content', () => {
  const element = { id: 'content' };
  const context = { window: {}, document: { querySelector: selector => selector === '#content' ? element : null } };
  vm.runInNewContext(read('src/core/dom.js'), context);
  assert.equal(context.window.CuteBunnyCore.query('#content'), element);
  assert.equal(context.window.CuteBunnyCore.escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
});


test("feature modules are loaded before app.js", () => {
 const html = read("index.html");
 const appIndex = html.indexOf("src=\"app.js?v=36\"");
 for (const feature of ["home","photos","notes","music","friends","notifications","profile","streak"]) {
  const script = "src=\"src/features/" + feature + "/" + feature + ".js\"";
  assert.ok(html.indexOf(script) >= 0, feature + " module exists in HTML");
  assert.ok(html.indexOf(script) < appIndex, feature + " loads before app.js");
  assert.match(read("src/features/" + feature + "/" + feature + ".js"), /^\/\* .* feature functions/);
 }
});


test("feature stylesheets are loaded and available to the production shell", () => {
 const html = read("index.html");
 const build = read("scripts/build-preview.js");
 const worker = read("sw.js");
 for (const feature of ["home","photos","notes","music","friends","notifications","profile","streak"]) {
  const path = "src/styles/features/" + feature + ".css";
  assert.ok(html.includes(path), feature + " stylesheet is loaded");
  assert.ok(build.includes(path), feature + " stylesheet is copied");
  assert.ok(worker.includes(path), feature + " stylesheet is precached");
  assert.ok(read(path).length > 100, feature + " stylesheet has extracted rules");
 }
});


test("page rendering is delegated to feature modules", () => {
 const app = read("app.js");
 const home = read("src/features/home/home.js");
 const photos = read("src/features/photos/photos.js");
 const music = read("src/features/music/music.js");
 const friends = read("src/features/friends/friends.js");
 assert.match(app, /renderHomePage\(c, visibleFeed, notes, pics, songs\)/);
 assert.match(app, /renderPhotosPage\(c, pics\)/);
 assert.match(app, /renderMusicPage\(c, songs\)/);
 assert.match(app, /renderFriendsPage\(c\)/);
 assert.match(home, /function renderHomePage\(/);
 assert.match(photos, /function renderPhotosPage\(/);
 assert.match(music, /function renderMusicPage\(/);
 assert.match(friends, /function renderFriendsPage\(/);
});


test("base and polish feature styles preserve their cascade layers", () => {
 const html = read("index.html");
 const build = read("scripts/build-preview.js");
 const worker = read("sw.js");
 const styleIndex = html.indexOf("style.css?v=milestone-shine-20261124");
 const tokensIndex = html.indexOf("src/styles/tokens.css");
 const polishIndex = html.indexOf("polish.css?v=badge-size-uniform-20261124");
 for (const feature of ["home","photos","notes","music","friends","notifications","profile","streak"]) {
  const base = "src/styles/features/base-" + feature + ".css";
  const polish = "src/styles/features/" + feature + ".css";
  assert.ok(html.indexOf(base) > styleIndex && html.indexOf(base) < tokensIndex, feature + " base styles load before tokens and polish");
  assert.ok(html.indexOf(polish) > polishIndex, feature + " polish styles load after legacy polish");
  for (const path of [base,polish]) {
   assert.ok(build.includes(path), path + " is copied");
   assert.ok(worker.includes(path), path + " is precached");
   assert.ok(read(path).length > 100, path + " contains CSS rules");
  }
 }
});
