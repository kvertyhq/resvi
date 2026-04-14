import { spawn } from 'child_process';
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
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[key] = value;
    }
  });
  return env;
}

const env = { ...process.env, ...loadEnv() };

if (env.SIG_CERTIFICATE && !path.isAbsolute(env.SIG_CERTIFICATE)) {
  env.SIG_CERTIFICATE = path.resolve(rootDir, env.SIG_CERTIFICATE);
}

console.log('Building Tauri app...');

const build = spawn('npx', ['tauri', 'build'], {
  stdio: 'inherit',
  env,
  shell: true
});

build.on('close', (code) => {
  process.exit(code);
});
