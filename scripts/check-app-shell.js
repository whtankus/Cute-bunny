const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function assetVersion(source, file, label) {
  const marker = file + '?v=';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(label + ' is missing a versioned ' + file + ' reference.');
  const valueStart = start + marker.length;
  let valueEnd = valueStart;
  while (valueEnd < source.length && /[A-Za-z0-9._-]/.test(source[valueEnd])) valueEnd++;
  if (valueEnd === valueStart) throw new Error(label + ' has an empty version for ' + file + '.');
  return source.slice(valueStart, valueEnd);
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

const installStart = worker.indexOf('const APP_ASSETS = [');
const installEnd = worker.indexOf('];', installStart);
if (installStart < 0 || installEnd < 0) throw new Error('Service worker APP_ASSETS list was not found.');
const installBlock = worker.slice(installStart, installEnd);
for (const file of required) {
  if (!installBlock.includes(file)) throw new Error('Service worker install cache omits ' + file);
}

console.log('Cute Bunny app-shell asset versions and install-cache entries are consistent.');
