# Android release signing

Cute Bunny builds Android APKs with GitHub Actions. Public release APKs must use one persistent PKCS#12 keystore so Android can install future updates over earlier releases.

## GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions → New repository secret** and create:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded bytes of the release keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Private-key password |

On Windows PowerShell, copy the Base64 value with:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\Downloads\cute-bunny-release.keystore")) | Set-Clipboard
```

Paste the clipboard contents into `ANDROID_KEYSTORE_BASE64`. On macOS/Linux, use `base64 -w 0 cute-bunny-release.keystore` (or `base64 cute-bunny-release.keystore` on macOS).

The Android workflow can build a debug APK without signing secrets. It skips publishing a signed GitHub Release until all four signing secrets are configured. After adding them, run **Actions → Build Cute Bunny Android APK → Run workflow**.

## Permanent-key rules

- Keep at least two secure backups of the keystore and its passwords.
- Never regenerate or replace this key after publishing the first signed release; Android will reject updates signed with a different key.
- Do not commit the keystore, passwords, or Base64 data to the repository.
- The workflow increments Android `versionCode` on every run so newer signed releases can update earlier installations.
