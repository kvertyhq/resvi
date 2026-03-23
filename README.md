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


# Tauri Auto Updater

`npx tauri signer generate -w src-tauri/signer.key`

Save the **Public Key** it outputs and paste it into `src-tauri/tauri.conf.json` where I wrote `"SET_YOUR_PUBLIC_KEY_HERE"`.

You need a simple JSON file hosted at the `endpoints` URL

{
  "version": "1.0.1",
  "notes": "Bug fixes and font scaling updates!",
  "pub_date": "2024-03-23T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://your-domain.com/updates/app-1.0.1.msi.zip"
    }
  }
}

**Build with Signing** : When you run `npm run tauri build`, you must set these environment variables so Tauri can sign the bundle:

* `TAURI_SIGNING_PRIVATE_KEY` (The content of your `.key` file)
* `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (If you used one)
