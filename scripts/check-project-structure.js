const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest',
  'src/core/dom.js',
  'src/features/home/home.js', 'src/styles/features/home.css', 'src/styles/features/base-home.css',
  'src/features/photos/photos.js', 'src/styles/features/photos.css', 'src/styles/features/base-photos.css',
  'src/features/notes/notes.js', 'src/styles/features/notes.css', 'src/styles/features/base-notes.css',
  'src/features/music/music.js', 'src/styles/features/music.css', 'src/styles/features/base-music.css',
  'src/features/friends/friends.js', 'src/styles/features/friends.css', 'src/styles/features/base-friends.css',
  'src/features/notifications/notifications.js', 'src/styles/features/notifications.css', 'src/styles/features/base-notifications.css',
  'src/features/profile/profile.js', 'src/styles/features/profile.css', 'src/styles/features/base-profile.css',
  'src/features/streak/streak.js', 'src/styles/features/streak.css', 'src/styles/features/base-streak.css',
  'src/features/notes/chat-events.js', 'src/services/supabase-client.js', 'src/services/media-optimizer.js', 'src/services/api.js', 'src/styles/tokens.css',
  'capacitor.config.json', 'scripts/build-preview.js', 'tests/source-smoke.test.js', 'tests/architecture.test.js',
  'docs/PROJECT-STRUCTURE.md', 'docs/FILE-NAMING.md', 'docs/FEATURE-MAP.md',
  'docs/REFACTOR-PLAN.md', 'supabase/schema.sql'
];
const missing = requiredFiles.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Project structure check failed. Missing required paths:');
  for (const file of missing) console.error(' - ' + file);
  process.exitCode = 1;
} else {
  console.log('Project structure check passed (' + requiredFiles.length + ' required paths).');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['check', 'test', 'build']) {
  if (!pkg.scripts?.[script]) {
    console.error('Missing npm script: ' + script);
    process.exitCode = 1;
  }
}
