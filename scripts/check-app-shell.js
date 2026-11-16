const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function assetVersion(source, file, label) {
  const escaped = file.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  const match = source.match(new RegExp('(?:\\\\./)?' + escaped + '\\\\?v=([A-Za-z0-9._-]+)'));
  if (!match) throw new Error(label + ' is missing a versioned ' + file + ' reference.');
  return match[1];
}

for (const file of ['style.css', 'app.js']) {
  const htmlVersion = assetVersion(html, file, 'index.html');
  const workerVersion = assetVersion(worker, file, 'sw.js');
  if (htmlVersion !== workerVersion) {
    throw new Error(file + ' version mismatch: index.html=' + htmlVersion + ', sw.js=' + workerVersion);
  }
}

const required = [
  'index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest',
  'bunny-app-icon-192.png', 'bunny-app-icon-512.png', 'apple-touch-icon.png'
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error('Missing required app asset: ' + file);
}

const installBlock = worker.match(/const APP_ASSETS = \\[([\\s\\S]*?)\\];/);
if (!installBlock) throw new Error('Service worker APP_ASSETS list was not found.');
for (const file of required) {
  if (!installBlock[1].includes(file)) throw new Error('Service worker install cache omits ' + file);
}

console.log('Cute Bunny app-shell asset versions and install-cache entries are consistent.');
