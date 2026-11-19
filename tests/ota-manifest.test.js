const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldInstallCuteBunnyUpdate,
  validateCuteBunnyManifest
} = require('../scripts/ota-manifest.js');

const validManifest = {
  appId: 'com.cutebunny.app',
  version: '1.0.16',
  url: 'https://github.com/whtankus/Cute-Bunny-Preview/releases/download/ota-v1.0.16/cute-bunny-ota.zip',
  checksum: 'a'.repeat(64)
};

test('accepts a correctly scoped Preview OTA release manifest', () => {
  assert.deepEqual(validateCuteBunnyManifest(validManifest), {
    ...validManifest,
    checksum: 'a'.repeat(64)
  });
});

test('rejects manifests for another app or malformed versions', () => {
  assert.equal(validateCuteBunnyManifest({ ...validManifest, appId: 'com.other.app' }), null);
  assert.equal(validateCuteBunnyManifest({ ...validManifest, version: 'latest' }), null);
  assert.equal(validateCuteBunnyManifest({ ...validManifest, version: '1.0.-1' }), null);
});

test('rejects non-HTTPS, foreign-host, and mismatched release URLs', () => {
  assert.equal(validateCuteBunnyManifest({ ...validManifest, url: validManifest.url.replace('https:', 'http:') }), null);
  assert.equal(validateCuteBunnyManifest({ ...validManifest, url: validManifest.url.replace('github.com', 'example.com') }), null);
  assert.equal(validateCuteBunnyManifest({ ...validManifest, url: validManifest.url.replace('ota-v1.0.16', 'ota-v1.0.15') }), null);
  assert.equal(validateCuteBunnyManifest({ ...validManifest, url: validManifest.url + '?redirect=1' }), null);
});

test('rejects malformed checksums and non-object manifest payloads', () => {
  assert.equal(validateCuteBunnyManifest({ ...validManifest, checksum: 'not-a-checksum' }), null);
  assert.equal(validateCuteBunnyManifest(null), null);
  assert.equal(validateCuteBunnyManifest([]), null);
});

test('installs only a newer Preview bundle version', () => {
  const manifest = validateCuteBunnyManifest(validManifest);
  assert.equal(shouldInstallCuteBunnyUpdate(manifest, '1.0.15'), true);
  assert.equal(shouldInstallCuteBunnyUpdate(manifest, '1.0.16'), false);
  assert.equal(shouldInstallCuteBunnyUpdate(manifest, '1.0.17'), false);
  assert.equal(shouldInstallCuteBunnyUpdate(manifest, 'unknown'), true);
  assert.equal(shouldInstallCuteBunnyUpdate(null, '1.0.15'), false);
});
