import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const env = args[0];

if (!env || !['admin', 'pos'].includes(env)) {
    console.error('Please specify an environment: admin or pos');
    process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'capacitor.config.ts');
const sourceConfigPath = path.join(rootDir, 'capacitor.configs', `capacitor.config.${env}.ts`);
const iosDir = path.join(rootDir, 'ios');
const sourceIosDir = path.join(rootDir, `ios-${env}`);

console.log(`Switching to ${env} environment...`);

// 1. Copy Capacitor Config
try {
    fs.copyFileSync(sourceConfigPath, configPath);
    console.log(`✅ Updated capacitor.config.ts with ${env} config`);
} catch (e) {
    console.error(`❌ Failed to copy config: ${e.message}`);
    process.exit(1);
}

// 2. Manage iOS Directory
if (!fs.existsSync(sourceIosDir)) {
    console.warn(`⚠️  Source directory ${sourceIosDir} does not exist.`);
    console.warn(`   If this is the first run, you may need to initialize it or copy the existing 'ios' folder.`);
} else {
    // Remove current ios folder (it's a build artifact/workspace)
    if (fs.existsSync(iosDir)) {
        console.log(`   Removing current ios directory...`);
        fs.rmSync(iosDir, { recursive: true, force: true });
    }

    // Copy source ios folder to ios
    console.log(`   Copying ${sourceIosDir} to ios...`);
    fs.cpSync(sourceIosDir, iosDir, { recursive: true });
    console.log(`✅ Updated ios directory from ios-${env}`);
}

// 3. Manage Android Directory
const androidDir = path.join(rootDir, 'android');
const sourceAndroidDir = path.join(rootDir, `android-${env}`);

if (!fs.existsSync(sourceAndroidDir)) {
    console.warn(`⚠️  Source directory ${sourceAndroidDir} does not exist.`);
    console.warn(`   If this is the first run, you may need to initialize it or copy the existing 'android' folder.`);
} else {
    // Remove current android folder
    if (fs.existsSync(androidDir)) {
        console.log(`   Removing current android directory...`);
        fs.rmSync(androidDir, { recursive: true, force: true });
    }

    // Copy source android folder to android
    console.log(`   Copying ${sourceAndroidDir} to android...`);
    fs.cpSync(sourceAndroidDir, androidDir, { recursive: true });
    console.log(`✅ Updated android directory from android-${env}`);
}

console.log(`🎉 Environment switched to ${env}`);
