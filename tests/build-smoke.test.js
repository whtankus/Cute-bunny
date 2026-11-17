const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

test('production build emits a complete app bundle with generated public config', () => {
  fs.rmSync(output, { recursive: true, force: true });

  try {
    const result = spawnSync(process.execPath, ['scripts/build-preview.js'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_URL: 'https://cute-bunny-test.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key'
      }
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    for (const asset of [
      'index.html',
      'app.js',
      'style.css',
      'polish.css',
      'sw.js',
      'manifest.webmanifest',
      'bunny-app-icon-192.png',
      'bunny-app-icon-512.png',
      'apple-touch-icon.png',
      'supabase-config.js',
      'android-updater.js',
      '.nojekyll'
    ]) {
      assert.ok(fs.existsSync(path.join(output, asset)), 'build output is missing ' + asset);
    }

    const configSource = fs.readFileSync(path.join(output, 'supabase-config.js'), 'utf8');
    const sandbox = { window: {} };
    vm.runInNewContext(configSource, sandbox);

    assert.equal(sandbox.window.CUTE_BUNNY_CONFIG.supabaseUrl, 'https://cute-bunny-test.supabase.co');
    assert.equal(sandbox.window.CUTE_BUNNY_CONFIG.supabaseAnonKey, 'test-publishable-key');
    assert.ok(fs.statSync(path.join(output, 'android-updater.js')).size > 0);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
});
