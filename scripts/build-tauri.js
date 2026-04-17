import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('.env.local not found');
    return {};
  }

  const env = {};
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value;
    }
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };

// Resolve relative path for Windows Certificate
if (env.SIG_CERTIFICATE && !path.isAbsolute(env.SIG_CERTIFICATE)) {
  env.SIG_CERTIFICATE = path.resolve(rootDir, env.SIG_CERTIFICATE);
}

// Validation
if (env.SIG_CERTIFICATE && (!fs.existsSync(env.SIG_CERTIFICATE) || !env.SIG_PASSWORD)) {
  console.warn('Warning: Windows signing certificate configuration is incomplete. Skipping Authenticode.');
}

console.log('Building Tauri app...');

// We pass TAURI_SIGNING_PRIVATE_KEY exactly as it is in .env.local (Base64 string).
// Tauri 2.0 CLI expects the Base64 string, not the decoded text.
const build = spawn('npx', ['tauri', 'build'], {
  stdio: 'inherit',
  env,
  shell: true
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('Build successful. Checking for signature files...');
    const bundleDirs = [
      path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis'),
      path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'msi')
    ];

    bundleDirs.forEach(dir => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(file => {
        if ((file.endsWith('.exe') || file.endsWith('.msi')) && !file.includes('.sig')) {
          const filePath = path.join(dir, file);
          const sigPath = `${filePath}.sig`;

          if (!fs.existsSync(sigPath)) {
            console.log(`Signature missing for ${file}. Manually signing...`);
            
            // Note: Manual signing fallback using the Base64 string from env
            const signResult = spawnSync('npx', ['tauri', 'signer', 'sign', '-k', env.TAURI_SIGNING_PRIVATE_KEY, `"${filePath}"`], {
              env: { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD },
              shell: true,
              encoding: 'utf8'
            });

            if (signResult.status === 0) {
              console.log(`Successfully generated signature for ${file}`);
            } else {
              console.error(`Failed to generate signature for ${file}:`, signResult.stderr);
            }
          } else {
            console.log(`Signature already exists for ${file}`);
          }
        }
      });
    });
  }
  process.exit(code);
});
