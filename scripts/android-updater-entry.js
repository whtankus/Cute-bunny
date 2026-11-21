import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { shouldInstallCuteBunnyUpdate, validateCuteBunnyManifest } from './ota-manifest.js';

const MANIFEST_URL = 'https://raw.githubusercontent.com/whtankus/Cute-Bunny-Preview/main/ota/latest.json';
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
    const manifest = validateCuteBunnyManifest(await manifestResponse.json());
    if (!manifest || !shouldInstallCuteBunnyUpdate(manifest, currentBundle?.bundle?.version)) return;

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
