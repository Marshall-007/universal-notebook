# Code Signing & Distribution

The release pipeline (`.github/workflows/build-release.yml`) produces installers
for Windows, macOS, and Android. By default they are **unsigned** (macOS/Windows)
or **debug-signed** (Android), which is fine for testing but shows security
warnings on install.

To ship trusted, production-grade binaries, add the repository secrets below.
Each platform's signing activates **only when its secrets are present** — with no
secrets, the pipeline behaves exactly as it does today.

Add secrets under **Settings → Secrets and variables → Actions → New repository secret**.

---

## Backend config (all platforms)

| Secret | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL. Empty → app builds in offline demo mode. |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (publishable) key. |

---

## Android (release keystore)

Generate a keystore once:

```bash
keytool -genkey -v -keystore release.keystore -alias universal-notebook \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore   # copy this into ANDROID_KEYSTORE_BASE64
```

| Secret | Description |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | base64 of `release.keystore`. Present → CI builds a signed `assembleRelease` APK; absent → debug `assembleDebug`. |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore store password. |
| `ANDROID_KEY_ALIAS` | Key alias (e.g. `universal-notebook`). |
| `ANDROID_KEY_PASSWORD` | Key password. |

The Gradle release `signingConfig` reads these via env (`android/app/build.gradle`).

---

## macOS (Developer ID + notarization)

Requires an Apple Developer account. Export your **Developer ID Application**
certificate as a `.p12` and base64-encode it (`base64 -w0 cert.p12`).

| Secret | Description |
| --- | --- |
| `APPLE_CERTIFICATE` | base64 of the Developer ID `.p12`. |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12`. |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)`. |
| `APPLE_ID` | Apple ID email used for notarization. |
| `APPLE_PASSWORD` | An app-specific password for that Apple ID. |
| `APPLE_TEAM_ID` | Your 10-character Apple Team ID. |

`tauri-action` picks these up automatically and signs + notarizes the `.dmg`.

---

## Windows (Authenticode)

Windows signing is **documented but not auto-wired**, because a robust automated
PFX import is certificate-specific and we don't want to risk the working build.
To enable it:

1. Add secrets `WINDOWS_CERTIFICATE` (base64 of your code-signing `.pfx`) and
   `WINDOWS_CERTIFICATE_PASSWORD`.
2. In `src-tauri/tauri.conf.json`, add a Windows signing config, e.g.:
   ```json
   "bundle": {
     "windows": { "certificateThumbprint": "<THUMBPRINT>", "digestAlgorithm": "sha256", "timestampUrl": "http://timestamp.digicert.com" }
   }
   ```
3. In the `build-desktop` job, before the Tauri build, add a Windows-only step
   that imports the PFX into the certificate store:
   ```yaml
   - name: Import Windows certificate
     if: runner.os == 'Windows' && env.WINDOWS_CERTIFICATE != ''
     env:
       WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
       WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
     shell: pwsh
     run: |
       $bytes = [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE)
       Set-Content cert.pfx -Value $bytes -AsByteStream
       $pw = ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force
       Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My -Password $pw
   ```

Alternatively use **Azure Trusted Signing** (no cert to manage) via
`azure/trusted-signing-action`.

---

## Auto-update (future)

For in-app updates, enable the Tauri updater plugin: generate an updater keypair
(`npx tauri signer generate`), set `TAURI_SIGNING_PRIVATE_KEY` /
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets, add the public key + endpoints to
`tauri.conf.json`, and add `@tauri-apps/plugin-updater`. Not enabled yet.
