/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GETADDRESS_API_KEY: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_RESTAURANT_ID: string;
    // Add other env variables here as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
