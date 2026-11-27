const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('core browser scripts parse without syntax errors', () => {
  for (const file of ['app.js', 'src/core/dom.js', 'src/services/supabase-client.js', 'src/services/media-optimizer.js', 'src/services/api.js', 'src/features/notes/chat-events.js', 'src/features/home/home.js', 'src/features/photos/photos.js', 'src/features/notes/notes.js', 'src/features/music/music.js', 'src/features/friends/friends.js', 'src/features/notifications/notifications.js', 'src/features/profile/profile.js', 'src/features/streak/streak.js', 'sw.js', 'scripts/build-preview.js']) {
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
  const streak = read('src/features/streak/streak.js');
  const bear = read('bear-hugs-progression.js');
  const styles = read('bear-hugs-progression.css');
  assert.match(streak, /bearActions: Array\.isArray\(saved\.bearActions\)/);
  assert.match(streak, /bearActionIds: Array\.isArray\(saved\.bearActionIds\)/);
  assert.match(streak, /!state\.bearActionIds\.includes\(actionId\)/);
  assert.match(streak, /kind === 'bear-action'/);
  assert.match(streak, /bearHugQuests/);
  assert.match(app, /cute-bunny:bear-action/);
  assert.match(streak, /item\.kind === 'bear-action' \? 'bear-hugs'/);
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
  const notifications = read('src/features/notifications/notifications.js');
  const html = read('index.html');
  const css = read('style.css');
  assert.match(notifications, /function updateNavNewDots\(\)/);
  assert.match(notifications, /gallery: \['photo'\], music: \['song'\], notes: \['note'\], friends: \['buddy'\]/);
  assert.match(notifications, /function markNavNotificationsSeen\(targetPage\)/);
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



test('core helpers and Supabase client are isolated behind small service boundaries', () => {
  const core = read('src/core/dom.js');
  const service = read('src/services/supabase-client.js');
  const app = read('app.js');
  const html = read('index.html');
  assert.match(core, /window\.CuteBunnyCore/);
  assert.match(core, /escapeHtml/);
  assert.match(service, /window\.CuteBunnyServices/);
  assert.match(service, /createSupabaseClient/);
  assert.match(app, /window\.CuteBunnyCore/);
  assert.match(app, /window\.CuteBunnyServices\.createSupabaseClient/);
  assert.ok(html.indexOf('src="src/core/dom.js"') < html.indexOf('src="app.js'));
  assert.ok(html.indexOf('src="src/services/supabase-client.js"') < html.indexOf('src="app.js'));
});

test('design tokens load separately from the remaining polish stylesheet', () => {
  const html = read('index.html');
  const tokens = read('src/styles/tokens.css');
  const polish = read('polish.css');
  assert.match(tokens, /--cb-ink:/);
  assert.doesNotMatch(polish.slice(0, 1200), /:root\s*\{/);
  assert.ok(html.indexOf('href="src/styles/tokens.css"') < html.indexOf('href="polish.css'));
});


test('photo optimization is isolated from the main application and keeps original files safe', () => {
  const app = read('app.js');
  const media = read('src/services/media-optimizer.js');
  const html = read('index.html');
  assert.doesNotMatch(app, /async function optimizePhotoUpload\(file\)/);
  assert.match(app, /CuteBunnyServices\.optimizePhotoUpload/);
  assert.match(media, /createImageBitmap/);
  assert.match(media, /image\/webp/);
  assert.match(media, /blob\.size >= file\.size/);
  assert.match(media, /bitmap\?\.close\?\.\(\)/);
  assert.ok(html.indexOf('src/services/media-optimizer.js') < html.indexOf('src="app.js'));
});


test('Notes composer submit and desktop Enter handling live in the Notes feature module', () => {
  const app = read('app.js');
  const notes = read('src/features/notes/chat-events.js');
  const html = read('index.html');
  assert.doesNotMatch(app, /event\.target\.id === 'chatComposer'/);
  assert.match(notes, /event\.target\.id !== 'chatComposer'/);
  assert.match(notes, /window\.sendChatMessage/);
  assert.match(notes, /window\.isTouchNotesViewport/);
  assert.match(notes, /event\.shiftKey/);
  assert.match(notes, /event\.isComposing/);
  assert.ok(html.indexOf('src/features/notes/chat-events.js') > html.indexOf('src="app.js'));
});


test('Supabase data access is provided by an injected service instead of being embedded in app.js', () => {
  const app = read('app.js');
  const service = read('src/services/api.js');
  const html = read('index.html');
  assert.doesNotMatch(app, /async function api\(path, options = \{\}\)/);
  assert.match(app, /CuteBunnyServices\.createApi/);
  assert.match(service, /function createApi\(\{ client, getCurrentUser, fetchFriendHeartCounts, themes \}\)/);
  assert.match(service, /return async function api/);
  assert.match(service, /sb\.from\('memories'\)/);
  assert.match(service, /sb\.storage\.from\('memories'\)/);
  assert.match(html, /src="src\/services\/api\.js"/);
  assert.ok(html.indexOf('src/services/api.js') < html.indexOf('src="app.js'));
});


test('Notes love-letter composer supports up to three photos and image-only messages', () => {
  const notes = read('src/features/notes/notes.js');
  const events = read('src/features/notes/chat-events.js');
  const styles = read('src/styles/features/notes.css');
  assert.ok(notes.includes('id="chatPhotoInput"'));
  assert.ok(notes.includes('id="chatPhotoPicker"'));
  assert.ok(notes.includes('id="chatPhotoPreview"'));
  assert.ok(notes.includes('attachedPhotos'));
  assert.ok(notes.includes('photos: selectedPhotos.map'));
  assert.ok(notes.includes('(!text && !selectedPhotos.length)'));
  assert.ok(notes.includes("kind: 'photo'"));
  assert.ok(events.includes('notesSelectedPhotos.length >= 3'));
  assert.ok(events.includes('URL.createObjectURL'));
  assert.ok(styles.includes('chat-message-photos'));
  assert.ok(styles.includes('chat-composer-main'));
});

test('Notes photo attachments persist through the RLS-protected Photo Garden link table', () => {
  const service = read('src/services/api.js');
  const schema = read('supabase/schema.sql');
  const migration = read('supabase/migrations/202611270001_notes_message_photo_attachments.sql');
  assert.ok(service.includes("from('note_message_photos')"));
  assert.ok(service.includes('attachedPhotosByNote'));
  assert.ok(schema.includes('create table if not exists public.note_message_photos'));
  assert.ok(migration.includes('enable row level security'));
  assert.ok(migration.includes('Attach own photo to own note'));
});

test('photo-sharing Notes messages retain the existing swipe-to-reply target', () => {
  const notes = read('src/features/notes/notes.js');
  const gestures = read('swipe-gestures.js');
  assert.ok(notes.includes('data-chat-message-id="${esc(id)}"'));
  assert.ok(notes.includes('reply_to_id: replyId'));
  assert.ok(gestures.includes('.chat-message .chat-bubble[data-chat-message-id]'));
  assert.ok(gestures.includes('replyingToMessageId = messageId'));
});


test('Notes photo attachments do not display like indicators and retain reply context', () => {
  const notes = read('src/features/notes/notes.js');
  const styles = read('src/styles/features/notes.css');
  assert.match(notes, /messageCharacterCount >= 6 && attachedPhotos\.length === 0/);
  assert.match(notes, /data-chat-message-id="\$\{esc\(id\)\}"/);
  assert.match(notes, /const bubbleContent = `\$\{heartButton\}\$\{replyMarkup\}/);
  assert.match(notes, /\$\{photoMarkup\}\s*\$\{textBubble\}/);
  assert.match(notes, /replyExcerpt = item\?\.text \|\| \(item\?\.photos\?\.length \? 'Photo shared'/);
  assert.match(notes, /chat-replying-author/);
  assert.match(notes, /<b>\$\{esc\(replyAuthor\)\}<\/b>/);
  assert.match(styles, /#content \.chat-replying-content\s*\{\s*flex-direction: column/);
  assert.match(styles, /width:calc\(100% \+ 6px\)/);
  assert.match(styles, /margin:0 -3px/);
  assert.match(styles, /inset: 50% auto auto 50% !important/);
  assert.match(styles, /animation: cb-photo-garden-float 3\.4s ease-in-out infinite/);
  assert.match(styles, /border-radius: 22px !important/);
  assert.match(styles, /#content \.chat-message-photo \{[\s\S]*?border-radius: 22px !important;[\s\S]*?box-shadow: none !important;[\s\S]*?transform-style: flat;/, 'shared Notes photos should keep rounded corners without 3D depth or shadow');
  assert.match(read('app.js'), /showMessageActions\(id, messagePressState\.bubble, !!photoTarget\)/);
  assert.match(read('app.js'), /chat-actions-popup' \+ \(photoTarget \? ' is-photo-actions'/);
  assert.match(read('src/styles/features/base-photos.css'), /Shared photo viewer: place the available Delete or Save action below the photo, centred/);
  assert.match(read('src/features/notes/chat-events.js'), /document\.addEventListener\('contextmenu'/);
});

test('Notes photo selection validates each file and releases local previews after hydration', () => {
  const events = read('src/features/notes/chat-events.js');
  const notes = read('src/features/notes/notes.js');
  const photos = read('src/features/photos/photos.js');
  assert.match(events, /for \(const file of files\)/);
  assert.match(events, /notesSelectedPhotos\.length >= 3/);
  assert.match(events, /window\.crypto\?\.randomUUID\?\./);
  assert.match(notes, /data-local-preview="true"/);
  assert.match(photos, /node\.dataset\.localPreview === 'true'/);
  assert.match(photos, /URL\.revokeObjectURL\(previousPreviewUrl\)/);
  assert.match(photos, /delete item\.previewUrl/);
});


test('Notes keeps the selected preview if the stored image fails to decode', () => {
  const photos = read('src/features/photos/photos.js');
  assert.match(photos, /node\.decode\(\)\.then\(releasePreview\)\.catch\(restorePreview\)/);
  assert.match(photos, /node\.dataset\.localPreview = 'true'/);
  assert.match(photos, /node\.addEventListener\('error', restorePreview/);
});
