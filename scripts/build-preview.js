const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const assets = [
  'index.html',
  'app.js',
  'style.css',
  'sw.js',
  'manifest.webmanifest',
  'bunny-app-icon-192.png',
  'bunny-app-icon-512.png',
  'apple-touch-icon.png'
];

for (const asset of assets) {
  const source = path.join(root, asset);
  if (!fs.existsSync(source)) throw new Error('Missing required preview asset: ' + asset);
  fs.copyFileSync(source, path.join(output, asset));
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
fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');
console.log('Cute Bunny preview built in dist/.');
