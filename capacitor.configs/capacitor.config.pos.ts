import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.kverty.resvi', // Keeping original appId for POS as it's likely the main one
    appName: 'Resvi POS',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
