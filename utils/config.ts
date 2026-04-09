/**
 * Configuration manager for dynamic restaurant settings.
 * Handles persistence of the Restaurant ID for Tauri and Web.
 */

const STORAGE_KEY = 'resvi_restaurant_id';

export const configManager = {
    /**
     * Gets the current restaurant ID.
     * Priority: localStorage -> Environment Variable
     */
    getRestaurantId: (): string | null => {
        // 1. Check persistent storage
        const storedId = localStorage.getItem(STORAGE_KEY);
        if (storedId && storedId.trim() !== '') {
            return storedId;
        }

        // 2. Fallback to build-time env variable (for cloud/dev)
        const envId = import.meta.env.VITE_RESTAURANT_ID;
        if (envId && envId.trim() !== '') {
            return envId;
        }

        return null;
    },

    /**
     * Persists a new restaurant ID locally.
     */
    setRestaurantId: (id: string): void => {
        if (!id || id.trim() === '') {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, id.trim());
        }
    },

    /**
     * Clears the current restaurant ID from local storage.
     */
    clearRestaurantId: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Helper to detect if running in a Tauri/Desktop environment
     */
    isTauri: (): boolean => {
        return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
    }
};
