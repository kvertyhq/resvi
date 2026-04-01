import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSettings } from './SettingsContext';
import { useAlert } from './AlertContext';

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
    uiFontScale: number;
    setUIFontScale: (scale: number) => void;
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
    uiFontScale: 1,
    setUIFontScale: () => { }
});

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useSettings();
    const { showAlert } = useAlert();
    const [staff, setStaff] = useState<any>(null);
    const [activeShift, setActiveShift] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uiFontScale, setUIFontScaleState] = useState<number>(() => {
        const saved = localStorage.getItem('pos-font-scale');
        return saved ? parseFloat(saved) : 1;
    });

    const setUIFontScale = (scale: number) => {
        setUIFontScaleState(scale);
        localStorage.setItem('pos-font-scale', scale.toString());
    };

    // Persist login via localStorage for page refreshes
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

    // Watch for disablement mid-session or on load
    useEffect(() => {
        if (settings?.is_disabled && staff) {
            logout();
            showAlert('Access Restricted', 'Your workspace has been locked. Please contact support.', 'error');
        }
    }, [settings?.is_disabled, staff]);

    const login = async (pin: string) => {
        if (!settings?.id) {
            console.error('Login failed: Settings not loaded or restaurant_id missing');
            return false;
        }

        if (settings.is_disabled) {
            showAlert('Access Restricted', 'Your workspace has been locked. Please contact support.', 'error');
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
                showAlert('Login Error', error.message, 'error');
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
        else showAlert('Clock In Failed', 'Could not start shift. Please try again.', 'error');
    };

    const clockOut = async () => {
        if (!activeShift) return;
        const { error } = await supabase
            .from('staff_shifts')
            .update({ clock_out: new Date().toISOString() })
            .eq('id', activeShift.id);

        if (!error) setActiveShift(null);
        else showAlert('Clock Out Failed', 'Could not end shift. Please try again.', 'error');
    };

    return (
        <POSContext.Provider value={{ staff, isAuthenticated: !!staff, loading, login, logout, clockIn, clockOut, activeShift, uiFontScale, setUIFontScale }}>
            {!loading && children}
        </POSContext.Provider>
    );
};

export const usePOS = () => useContext(POSContext);
