import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

function syncVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));

    if (tauriConfig.version !== pkg.version) {
      console.log(`\x1b[33mSyncing version: tauri.conf.json (${tauriConfig.version}) -> package.json (${pkg.version})\x1b[0m`);
      tauriConfig.version = pkg.version;
      fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
      console.log('\x1b[32m✓ Version synced successfully.\x1b[0m');
    } else {
      console.log('\x1b[34mℹ Version is already in sync.\x1b[0m');
    }
  } catch (error) {
    console.error('\x1b[31m✖ Failed to sync version:\x1b[0m', error.message);
    process.exit(1);
  }
}

syncVersion();
