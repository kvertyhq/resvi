import React, { createContext, useContext, useEffect, useState } from "react";

type Settings = {
  restaurant_name?: string;
  logo_url?: string;
  theme_color?: string;
  enable_booking?: boolean;
  // add whatever fields your settings API returns
};

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  loading: true,
  error: null,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(
          process.env.SUPABASE_URL + "/get_restaurant_settings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.SUPABASE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_KEY!}`,
            },
            body: JSON.stringify({ p_id: process.env.RESTAURANT_ID })
          }
        );

        if (!res.ok) throw new Error("Failed to load settings");

        const data = await res.json();

        setSettings(data?.data);
        document.title = data?.data?.name;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
