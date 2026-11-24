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

test('Bear Hugs restores saved partners and keeps reward progression wired', () => {
  const bear = read('bear-hugs-progression.js');
  const styles = read('bear-hugs-progression.css');
  const html = read('index.html');
  assert.doesNotThrow(() => new vm.Script(bear, { filename: 'bear-hugs-progression.js' }));
  assert.match(bear, /Checking your saved Bearfriend connection/);
  assert.match(bear, /await loadPartnerRequests\(\)/);
  assert.match(bear, /set_bear_hug_equipment/);
  assert.match(bear, /data-bear-equip/);
  assert.match(bear, /bear-care-milestone/);
  assert.match(styles, /bear-reward-apply:disabled/);
  assert.match(styles, /bear-visual-cap/);
  assert.ok(html.includes('bear-hugs-living-world-20261124-3'));
});

test('Bear Hugs uses one fixed level and Care Point-based treasure collection', () => {
  const bear = read('bear-hugs-progression.js');
  const styles = read('bear-hugs-progression.css');
  assert.ok(bear.includes('<small>BEAR LEVEL</small><b>1</b>'));
  assert.doesNotMatch(bear, /reward\.level|nextReward\.level/);
  for (const threshold of [100, 350, 1250, 2150, 3050]) {
    assert.ok(bear.includes('unlockPoints: ' + threshold));
  }
  assert.match(bear, /bear-reward-progress-pips/);
  assert.match(bear, /unlockedCount/);
  assert.match(styles, /bear-reward-pip\.is-filled/);
  assert.match(styles, /bear-reward-count b/);
});

test('Bear Hugs daily missions track only successfully delivered actions', () => {
  const app = read('app.js');
  const bear = read('bear-hugs-progression.js');
  const styles = read('bear-hugs-progression.css');
  assert.match(app, /bearActions: Array\.isArray\(saved\.bearActions\)/);
  assert.match(app, /bearActionIds: Array\.isArray\(saved\.bearActionIds\)/);
  assert.match(app, /!state\.bearActionIds\.includes\(actionId\)/);
  assert.match(app, /kind === 'bear-action'/);
  assert.match(app, /bearHugQuests/);
  assert.match(app, /cute-bunny:bear-action/);
  assert.match(app, /item\.kind === 'bear-action' \? 'bear-hugs'/);
  assert.match(app, /destination === 'bear-hugs'/);
  assert.match(bear, /new CustomEvent\('cute-bunny:bear-action'/);
  assert.match(bear, /actionId: String\(payload\.actionId \|\| ''\)/);
  assert.match(bear, /if \(!delivered\) return;/);
  assert.match(bear, /sharedPoints = Math\.max\(sharedPoints, Number\(data\?\.love_points\) \|\| 0\)/);
  assert.match(bear, /sharedPoints = Math\.max\(sharedPoints, Number\(data\) \|\| 0\)/);
  assert.match(bear, /return acknowledged/);
  assert.match(bear, /lastSharedAction = action/);
  assert.match(bear, /Play immediately and keep every action button available/);
  assert.doesNotMatch(bear.slice(bear.indexOf('async function runLocalAction'), bear.indexOf('function ensureProgressChannel')), /actionInFlight|\.disabled = true|is-sending/);
  assert.doesNotMatch(bear, /BEAR MOOD|bear-mood-pill/);
  assert.doesNotMatch(styles, /bear-mood-pill/);
});

test('Bear Hugs adds visual-only idle personality, sleep, props, atmosphere and memories safely', () => {
  const bear = read('bear-hugs-progression.js');
  const app = read('app.js');
  const styles = read('bear-hugs-progression.css');
  assert.match(app, /peekaboo:\(t,b\)=>/);
  assert.match(app, /bump:\(t,b\)=>/);
  assert.match(app, /curious=Math\.max/);
  assert.doesNotMatch(bear, /bear-living-props|data-couple-action="feed"/);
  assert.match(styles, /bear-time-morning/);
  assert.match(bear, /recordBearMoment/);
  assert.match(bear, /bearsAreAsleep/);
  assert.match(styles, /bear-living-atmosphere/);
  assert.match(styles, /bear-moments-list/);
});

test('Bear Hugs plays a random visual-only action after 25 seconds of inactivity', () => {
  const bear = read('bear-hugs-progression.js');
  assert.match(bear, /function scheduleBearIdleAction\(delay = 25000\)/);
  assert.match(bear, /function runAutonomousBearAction\(\)/);
  assert.match(bear, /scheduleBearIdleAction\(25000\)/);
  assert.match(bear, /idleFor >= 120000/);
  assert.match(bear, /originalTrigger\(action, \{ remote: true, gender: getMe\(\)\?\.gender, autonomous: true \}\)/);
  assert.match(bear, /const choices = idleFor >= 120000 \? \['sleep'\] : \['hug', 'kiss', 'flykiss', 'hands', 'dance', 'pet', 'tummy', 'feed', 'peekaboo', 'bump'\]/);
  assert.match(bear, /event\.target\?\.closest\?\.\('#coupleBearGame'\)/);
  assert.match(bear, /document\.hidden/);
  assert.match(bear, /Autonomous moments are purely visual/);
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

test('Notes typing uses the same shared Broadcast channel as the working Cute Bunny app', () => {
  const app = read('app.js');
  assert.match(app, /sb\.channel\(['"]cute-bunny-notes-typing['"]\)/);
  assert.match(app, /\.on\(['"]broadcast['"], \{ event: ['"]typing['"] \}/);
  assert.match(app, /notesTypingChannelReady = true/);
  assert.match(app, /notesTypingQueuedState = null/);
  assert.doesNotMatch(app, /config: \{ private: true \}/);
  assert.doesNotMatch(app, /syncNotesTypingFriendChannels/);
  assert.doesNotMatch(app, /notesTypingFriendChannels/);
});

test('Virtual Buddy feature and its 3D module are fully removed', () => {
  const app = read('app.js');
  const html = read('index.html');
  const css = read('style.css');
  const sw = read('sw.js');
  const build = read('scripts/build-preview.js');
  const workflow = read('.github/workflows/deploy-pages.yml');
  assert.doesNotMatch(app, /renderVirtualPet|careForVirtualPet|readVirtualPet|data-care-pet|virtualBuddy3D/);
  assert.doesNotMatch(html, /virtual-buddy-3d/);
  assert.doesNotMatch(css, /sg-bunny-three|sg-virtual-pet|sg-pet-playground|Virtual Buddy/);
  assert.doesNotMatch(sw, /virtual-buddy-3d/);
  assert.doesNotMatch(build, /virtual-buddy-3d/);
  assert.doesNotMatch(workflow, /virtual-buddy-3d/);
  assert.ok(!fs.existsSync(path.join(root, 'virtual-buddy-3d.js')));
});


test('streak entry button and thumbnail play boing on pointer and keyboard activation', () => {
  const app = read('app.js');
  const start = app.indexOf('// Streak entry uses capture phase');
  const end = app.indexOf('// Homepage feature cards', start);
  const handlers = app.slice(start, end);
  assert.match(handlers, /if \(streakButton\) playCuteSound\('boing'\)/);
  assert.match(handlers, /playCuteSound\('boing'\);\s*openStreakGarden\(\);/);
});


test('main navigation shows glowing new-activity dots for unread content notifications', () => {
  const app = read('app.js');
  const html = read('index.html');
  const css = read('style.css');
  assert.match(app, /function updateNavNewDots\(\)/);
  assert.match(app, /gallery: \['photo'\], music: \['song'\], notes: \['note'\], friends: \['buddy'\]/);
  assert.match(app, /function markNavNotificationsSeen\(targetPage\)/);
  for (const page of ['home', 'gallery', 'notes', 'music', 'friends']) {
    assert.ok(html.includes('data-page="' + page + '"') && html.includes('class="nav-new-dot"'));
  }
  assert.match(css, /nav-new-dot\.is-visible/);
  assert.match(css, /nav-new-dot-glow/);
});


test('Bear Hugs action buttons stay responsive while actions send independently', () => {
  const bear = read('bear-hugs-progression.js');
  const handler = bear.slice(bear.indexOf('async function runLocalAction'), bear.indexOf('function ensureProgressChannel'));
  assert.match(handler, /originalTrigger\(action/);
  assert.match(handler, /void \(async \(\) =>/);
  assert.match(handler, /await sendAction\(action, partnerId, actionId\)/);
  assert.match(handler, /await recordSharedAction\(action, partnerId, actionId\)/);
  assert.doesNotMatch(handler, /actionInFlight|\.disabled = true|querySelectorAll\('\.bear-action-button'\)/);
});
test('Achievement Garden keeps earned heart flowers and includes 1,500 and 2,000 heart milestones', () => {
  const app = read('app.js');
  const css = read('style.css');
  const gardenStart = app.indexOf('/* Achievement Garden');
  const garden = app.slice(gardenStart, app.indexOf('\nfunction render(', gardenStart));
  assert.match(garden, /heart-bloom-1500/);
  assert.match(garden, /heart-bloom-2000/);
  assert.ok(garden.includes('achievements.map(item =>'));
  assert.ok(!garden.includes('if (!remaining.length) return'));
  assert.ok(garden.includes("art:'crown'"));
  assert.ok(css.includes('.achievement-card.is-earned'));
});

