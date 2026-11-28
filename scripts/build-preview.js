const fs = require('node:fs');
const esbuild = require('esbuild');
const path = require('node:path');

const root = process.cwd();
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const assets = [
  'index.html',
  'app.js',
  'bear-pose-engine.js',
  'bearfriend-home.js',
  'bearfriend-home-view.js',
  'bearfriend-home.css',
  'bearfriend-home-controls.css',
  'src/core/dom.js',
  'src/services/supabase-client.js',
  'src/services/media-optimizer.js',
  'src/services/api.js',
  'src/features/notes/chat-events.js',
  'src/features/home/home.js',
  'src/features/photos/photos.js',
  'src/features/notes/notes.js',
  'src/features/music/music.js',
  'src/features/friends/friends.js',
  'src/features/notifications/notifications.js',
  'src/features/profile/profile.js',
  'src/features/streak/streak.js',
  'src/styles/tokens.css',
  'src/styles/features/base-home.css',
  'src/styles/features/base-photos.css',
  'src/styles/features/base-notes.css',
  'src/styles/features/base-music.css',
  'src/styles/features/base-friends.css',
  'src/styles/features/base-notifications.css',
  'src/styles/features/base-profile.css',
  'src/styles/features/base-streak.css',
  'src/styles/features/home.css',
  'src/styles/features/photos.css',
  'src/styles/features/notes.css',
  'src/styles/features/music.css',
  'src/styles/features/friends.css',
  'src/styles/features/notifications.css',
  'src/styles/features/profile.css',
  'src/styles/features/streak.css',
  'style.css',
  'polish.css',
  'button-interactions.css',
  'swipe-gestures.css',
  'swipe-gestures.js',
  'header-statusbar-blend.css',
  'bear-hugs-progression.css',
  'bear-hugs-progression.js',
  'sw.js',
  'manifest.webmanifest',
  'bunny-app-icon-192.png',
  'bunny-app-icon-512.png',
  'apple-touch-icon.png'
];

for (const asset of assets) {
  const source = path.join(root, asset);
  if (!fs.existsSync(source)) throw new Error('Missing required preview asset: ' + asset);
  const destination = path.join(output, asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl.trim() || !supabaseKey.trim()) {
  throw new Error('Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the repository Actions secrets.');
}

const config = 'window.CUTE_BUNNY_CONFIG = ' + JSON.stringify({
  supabaseUrl: supabaseUrl.trim(),
  supabaseAnonKey: supabaseKey.trim()
}) + ';\n';

fs.writeFileSync(path.join(output, 'supabase-config.js'), config, 'utf8');
esbuild.buildSync({
  entryPoints: [path.join(root, 'scripts', 'android-updater-entry.js')],
  outfile: path.join(output, 'android-updater.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2020'],
  sourcemap: false,
  minify: true
});

fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');
console.log('Cute Bunny preview built in dist/.');
