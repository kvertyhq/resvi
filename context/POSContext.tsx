import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSettings } from './SettingsContext';

interface StaffProfile {
    id: string;
    full_name: string;
    role: string;
    restaurant_id: string; // Added restaurant_id to StaffProfile
}

interface POSContextType {
    staff: StaffProfile | null;
    isAuthenticated: boolean;
    login: (pin: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clockIn: () => Promise<void>;
    clockOut: () => Promise<void>;
    activeShift: any;
    loading: boolean;
}

const POSContext = createContext<POSContextType>({
    staff: null,
    isAuthenticated: false,
    loading: true,
    login: async () => false,
    logout: async () => { },
    clockIn: async () => { },
    clockOut: async () => { },
    activeShift: null,
});

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useSettings();
    const [staff, setStaff] = useState<any>(null);
    const [activeShift, setActiveShift] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Persist login via localStorage for page refreshes (optional, but good for UX)
    useEffect(() => {
        const storedStaff = localStorage.getItem('pos_staff');
        if (storedStaff) {
            const parsedStaff = JSON.parse(storedStaff);
            setStaff(parsedStaff);

            // Try to fetch active shift for the stored staff
            const fetchActiveShift = async () => {
                if (parsedStaff?.id) {
                    const { data: shiftData } = await supabase
                        .from('staff_shifts')
                        .select('*')
                        .eq('staff_id', parsedStaff.id)
                        .is('clock_out', null)
                        .maybeSingle();
                    setActiveShift(shiftData);
                }
            };
            fetchActiveShift();
        }
        setLoading(false);
    }, []);

    const login = async (pin: string) => {
        if (!settings?.id) {
            console.error('Login failed: Settings not loaded or restaurant_id missing');
            return false;
        }

        try {
            // 1. Find profile with this PIN code for this restaurant
            const { data, error } = await supabase
                .rpc('pos_login', {
                    p_restaurant_id: settings.id,
                    p_pin_code: pin
                })
                .maybeSingle();

            if (error) {
                console.error('Supabase RPC Login Error:', error);
                alert(`Login Error: ${error.message}`);
                return false;
            }

            if (!data) {
                console.warn('Login failed: No profile found for this PIN');
                return false;
            }

            const profileData = data as any;
            const profile: StaffProfile = { // Ensure type matches StaffProfile
                id: profileData.id,
                full_name: profileData.full_name,
                role: profileData.role,
                restaurant_id: profileData.restaurant_id
            };

            // 2. Set State
            setStaff(profile);
            localStorage.setItem('pos_staff', JSON.stringify(profile));
            return true;

        } catch (err) {
            console.error('Login error:', err);
            return false;
        }
    };

    const logout = async () => {
        // For now, simpler logout
        setStaff(null);
        setActiveShift(null); // Clear active shift on logout
        localStorage.removeItem('pos_staff');
    };

    const clockIn = async () => {
        if (!staff) return;
        const { data, error } = await supabase
            .from('staff_shifts')
            .insert({ staff_id: staff.id, restaurant_id: staff.restaurant_id })
            .select()
            .single();

        if (!error) setActiveShift(data);
        else alert('Clock In Failed');
    };

    const clockOut = async () => {
        if (!activeShift) return;
        const { error } = await supabase
            .from('staff_shifts')
            .update({ clock_out: new Date().toISOString() })
            .eq('id', activeShift.id);

        if (!error) setActiveShift(null);
        else alert('Clock Out Failed');
    };

    return (
        <POSContext.Provider value={{ staff, isAuthenticated: !!staff, loading, login, logout, clockIn, clockOut, activeShift }}>
            {!loading && children}
        </POSContext.Provider>
    );
};

export const usePOS = () => useContext(POSContext);
