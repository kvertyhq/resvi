<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GkVxnYg5jTWnR2-tH_y9meEXRbH3zxb3

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Important

alter publication supabase_realtime add table call_logs;


# Releasing and Signing (Windows)

To build a production-ready Windows application that is signed (to avoid "Unknown Publisher" warnings) and supports the auto-updater, follow these steps.

## 1. Prerequisites

- **OpenSSL/Keytool**: For certificate management.
- **Windows SDK**: Specifically `signtool.exe` (installed with "Desktop development with C++" in Visual Studio).
- **Node.js**: v22+.

## 2. Setup Signing Keys

### A. Windows Authenticode (The .exe/.msi signature)
1. Place your `.pfx` or `.p12` certificate file in the project root (e.g., `codesigning.pfx`).
2. Add the following to your `.env.local`:
   ```env
   SIG_CERTIFICATE=codesigning.pfx
   SIG_PASSWORD=your_certificate_password
   ```

### B. Tauri Updater (The update payload signature)
1. Generate a signing key if you haven't already:
   `npx tauri signer generate -w src-tauri/signer.key`
2. Save the **Public Key** it outputs and paste it into `src-tauri/tauri.conf.json`:
   ```json
   "plugins": {
     "updater": {
       "pubkey": "YOUR_PUBLIC_KEY_HERE",
       ...
     }
   }
   ```
3. Copy the content of `src-tauri/signer.key` and add it to your `.env.local`:
   ```env
   TAURI_SIGNING_PRIVATE_KEY="untrusted comment: minisign private key: ..."
   TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your_optional_password
   ```

## 3. Build the Application

Run the customized build script which loads your `.env.local` and validates the signing configuration:

```bash
npm run tauri:build
```

The script will:
1. Sync the version from `package.json` to `tauri.conf.json`.
2. Load environment variables.
3. Run `tauri build`.
4. Use `scripts/sign.js` to automatically sign the resulting bundles using `signtool.exe`.

## 4. Distributing Updates

You need a simple JSON file hosted at the `endpoints` URL defined in `tauri.conf.json`:

```json
{
  "version": "1.0.2",
  "notes": "Feature updates and bug fixes!",
  "pub_date": "2024-03-23T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://your-domain.com/updates/app-1.0.2.msi.zip"
    }
  }
}
```
> [!TIP]
> The `signature` for the updater JSON is found in the console output after a successful `npm run tauri:build`.
