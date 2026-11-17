import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const MANIFEST_URL = 'https://raw.githubusercontent.com/whtankus/Cute-bunny/main/ota/latest.json';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let checking = false;

async function checkForCuteBunnyUpdate() {
  if (!Capacitor.isNativePlatform() || checking) return;
  checking = true;

  try {
    await CapacitorUpdater.notifyAppReady();

    const [manifestResponse, currentBundle] = await Promise.all([
      fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' }),
      CapacitorUpdater.current()
    ]);

    if (!manifestResponse.ok) return;
    const manifest = await manifestResponse.json();

    if (
      manifest?.appId !== 'com.cutebunny.app' ||
      typeof manifest.version !== 'string' ||
      typeof manifest.url !== 'string' ||
      !manifest.url.startsWith('https://') ||
      typeof manifest.checksum !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(manifest.checksum)
    ) return;

    if (currentBundle?.bundle?.version === manifest.version) return;

    const downloaded = await CapacitorUpdater.download({
      version: manifest.version,
      url: manifest.url,
      checksum: manifest.checksum
    });

    if (downloaded?.id) {
      await CapacitorUpdater.next({ id: downloaded.id });
      console.info('[Cute Bunny OTA] Update downloaded; it will apply when the app restarts.');
    }
  } catch (error) {
    console.warn('[Cute Bunny OTA] Update check skipped:', error);
  } finally {
    checking = false;
  }
}

if (Capacitor.isNativePlatform()) {
  void checkForCuteBunnyUpdate();

  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
    lastCheck = Date.now();
    void checkForCuteBunnyUpdate();
  });
}
