'use strict';

const OTA_RELEASE_BASE = 'https://github.com/whtankus/Cute-Bunny-Preview/releases/download/';

function validateCuteBunnyManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  if (manifest.appId !== 'com.cutebunny.app') return null;
  if (typeof manifest.version !== 'string' || !/^1\.0\.\d+$/.test(manifest.version)) return null;
  if (typeof manifest.url !== 'string') return null;
  if (typeof manifest.checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(manifest.checksum)) return null;

  let url;
  try {
    url = new URL(manifest.url);
  } catch {
    return null;
  }

  const expectedPath = `/whtankus/Cute-Bunny-Preview/releases/download/ota-v${manifest.version}/cute-bunny-ota.zip`;
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== expectedPath ||
    url.search ||
    url.hash ||
    !manifest.url.startsWith(OTA_RELEASE_BASE)
  ) return null;

  return {
    appId: manifest.appId,
    version: manifest.version,
    url: url.href,
    checksum: manifest.checksum.toLowerCase()
  };
}

function shouldInstallCuteBunnyUpdate(manifest, currentVersion) {
  if (!manifest || typeof manifest.version !== 'string') return false;
  if (typeof currentVersion !== 'string' || !/^1\.0\.\d+$/.test(currentVersion)) return true;
  const target = Number(manifest.version.split('.')[2]);
  const current = Number(currentVersion.split('.')[2]);
  return Number.isSafeInteger(target) && Number.isSafeInteger(current) && target > current;
}

module.exports = { validateCuteBunnyManifest, shouldInstallCuteBunnyUpdate };
