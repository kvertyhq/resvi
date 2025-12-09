import React, { createContext, useContext, useEffect, useState } from "react";

type Settings = {
  restaurant_name?: string;
  logo_url?: string;
  theme_color?: string;
  enable_booking?: boolean;
  address_line1?: string;
  address_line2?: string;
  phone?: string;
  email?: string;
  name?: string;
  opening_hours?: {
    mon?: string[];
    tue?: string[];
    wed?: string[];
    thu?: string[];
    fri?: string[];
    sat?: string[];
    sun?: string[];
  };
  collection_time_slots?: Record<string, string[]>;
  closure_dates?: string[]; // Array of ISO date strings (YYYY-MM-DD)
  timeslot_capacities?: Record<string, { max_orders?: number; max_delivery?: number; max_collection?: number }>;
  preorder_required_days?: string[]; // Array of day names (e.g. 'Mon', 'Tue')
  max_delivery_radius_miles?: number;
  max_delivery_order_value?: number;
  delivery_available?: boolean;
  collection_available?: boolean;
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
          import.meta.env.VITE_SUPABASE_URL + "/rest/v1/rpc/get_restaurant_settings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`,
            },
            body: JSON.stringify({ p_id: import.meta.env.VITE_RESTAURANT_ID })
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
