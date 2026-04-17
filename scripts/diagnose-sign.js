import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function diagnose() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const keyBase64 = envContent.match(/TAURI_SIGNING_PRIVATE_KEY=(.*)/)?.[1]?.trim()?.replace(/^['"]|['"]$/g, '');
  const password = envContent.match(/TAURI_SIGNING_PRIVATE_KEY_PASSWORD=(.*)/)?.[1]?.trim()?.replace(/^['"]|['"]$/g, '');

  if (!keyBase64 || !password) {
    console.log('Missing key or password in .env.local');
    return;
  }

  const decoded = Buffer.from(keyBase64, 'base64').toString('utf8');
  console.log('Decoded key text starts with:', decoded.substring(0, 50));

  fs.writeFileSync('test.txt', 'test content');
  
  const combinations = [
    { name: 'Full key with header', content: decoded },
    { name: 'Only base64 part', content: decoded.split('\n')[1]?.trim() || decoded },
    { name: 'Raw binary bytes', content: Buffer.from(decoded.split('\n')[1]?.trim() || decoded, 'base64') }
  ];

  for (const combo of combinations) {
    console.log(`\n--- Testing: ${combo.name} ---`);
    fs.writeFileSync('diag_key.tmp', combo.content);
    
    const testEnv = { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: password };
    delete testEnv.TAURI_SIGNING_PRIVATE_KEY; // PURGE any inherited session variable

    const result = spawnSync('npx.cmd', ['tauri', 'signer', 'sign', '-f', 'diag_key.tmp', 'test.txt'], {
      env: testEnv,
      encoding: 'utf8',
      shell: true
    });

    console.log('Status:', result.status);
    console.log('Stdout:', result.stdout);
    console.log('Stderr:', result.stderr);
    
    if (result.status === 0) {
      console.log(`SUCCESS with ${combo.name}!`);
    }
  }

  fs.unlinkSync('test.txt');
  fs.unlinkSync('diag_key.tmp');
}

diagnose();
