import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const fileToSign = process.argv[2];
if (!fileToSign) {
  console.error('No file to sign provided');
  process.exit(1);
}

function findSignTool() {
  const commonPaths = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64',
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.19041.0\\x64',
    'C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(path.join(p, 'signtool.exe'))) {
      return path.join(p, 'signtool.exe');
    }
  }
  return 'signtool.exe';
}

const signtool = findSignTool();
const cert = process.env.SIG_CERTIFICATE;
const pass = process.env.SIG_PASSWORD;

if (!cert || !pass) {
  console.error('SIG_CERTIFICATE or SIG_PASSWORD not set');
  process.exit(1);
}

const command = `"${signtool}" sign /f "${cert}" /p "${pass}" /fd sha256 /tr http://timestamp.digicert.com /td sha256 /v "${fileToSign}"`;
console.log('Running:', command);

try {
  execSync(command, { stdio: 'inherit' });
} catch (err) {
  console.error('Signing failed:', err.message);
  process.exit(1);
}
