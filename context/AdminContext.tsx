import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AdminContextType {
    session: Session | null;
    user: User | null;
    role: string | null;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string) => void;
    restaurants: { id: string; name: string }[];
    login: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<string | null>(() => {
        return localStorage.getItem('admin_selected_restaurant_id');
    });
    const [loading, setLoading] = useState(true);
    const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) {
                setRole(null);
                setRestaurants([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch profile and restaurants when session changes
    useEffect(() => {
        const fetchAdminData = async () => {
            if (!session) return;

            // 1. Fetch Profile to get Role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, restaurant_id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profileError) {
                console.error('Error fetching admin profile:', profileError);
                setLoading(false);
                return;
            }

            const userRole = profile?.role || 'customer'; // Default to customer if null, but expected to be set
            setRole(userRole);

            // 2. Fetch Restaurants based on Role
            let query = supabase.from('restaurant_settings').select('id, name, is_disabled');

            // If NOT super_admin, filter by assigned restaurant
            if (userRole !== 'super_admin' && profile?.restaurant_id) {
                query = query.eq('id', profile.restaurant_id);
            } else if (userRole !== 'super_admin' && !profile?.restaurant_id) {
                // If they have no restaurant assigned and are not super admin, they see nothing?
                // Or maybe they see nothing.
                console.warn('User has no assigned restaurant.');
                setRestaurants([]);
                setLoading(false);
                return;
            }

            const { data: restaurantData, error: restaurantError } = await query;

            if (restaurantError) {
                console.error('Error fetching restaurants:', restaurantError);
            } else if (restaurantData) {
                // Filter out disabled restaurants unless the user is a super admin
                const validRestaurants = restaurantData.filter(r => userRole === 'super_admin' || !r.is_disabled);

                if (userRole !== 'super_admin' && validRestaurants.length === 0 && restaurantData.length > 0) {
                    // Force log out
                    window.alert("Access Restricted: Your workspace has been disabled. Please contact support.");
                    await supabase.auth.signOut();
                    localStorage.removeItem('admin_selected_restaurant_id');
                    setSelectedRestaurantIdState(null);
                    setRole(null);
                    setRestaurants([]);
                    setLoading(false);
                    return;
                }

                setRestaurants(validRestaurants);

                // Auto-select logic
                if (!selectedRestaurantId || !validRestaurants.find(r => r.id === selectedRestaurantId)) {
                    if (validRestaurants.length > 0) {
                        setSelectedRestaurantId(validRestaurants[0].id);
                    } else {
                        setSelectedRestaurantIdState(null);
                    }
                }
            }
            setLoading(false);
        };

        if (session) {
            fetchAdminData();
        }
    }, [session]);

    const setSelectedRestaurantId = (id: string) => {
        setSelectedRestaurantIdState(id);
        localStorage.setItem('admin_selected_restaurant_id', id);
    };

    const login = async (email: string) => {
        console.log('Login logic handled by Supabase Auth UI');
    };

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('admin_selected_restaurant_id');
        setSelectedRestaurantIdState(null);
        setRole(null);
        setRestaurants([]);
    };

    return (
        <AdminContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                role,
                selectedRestaurantId,
                setSelectedRestaurantId,
                restaurants,
                login,
                logout,
                loading,
            }}
        >
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
