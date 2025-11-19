import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AdminContextType {
    session: Session | null;
    user: User | null;
    selectedRestaurantId: string | null;
    setSelectedRestaurantId: (id: string) => void;
    restaurants: { id: string; name: string }[];
    login: (email: string) => Promise<void>; // Simplified for now, actual auth handled by Supabase
    logout: () => Promise<void>;
    loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<string | null>(() => {
        return localStorage.getItem('admin_selected_restaurant_id');
    });
    const [loading, setLoading] = useState(true);

    const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // Fetch restaurants
        const fetchRestaurants = async () => {
            const { data, error } = await supabase
                .from('restaurant_settings')
                .select('id, name');

            if (error) {
                console.error('Error fetching restaurants:', error);
            } else if (data) {
                setRestaurants(data);
                // If no restaurant selected, select the first one
                if (!selectedRestaurantId && data.length > 0) {
                    setSelectedRestaurantId(data[0].id);
                }
            }
        };

        fetchRestaurants();

        return () => subscription.unsubscribe();
    }, []);

    const setSelectedRestaurantId = (id: string) => {
        setSelectedRestaurantIdState(id);
        localStorage.setItem('admin_selected_restaurant_id', id);
    };

    const login = async (email: string) => {
        // This is a placeholder. Actual login happens in the LoginPage component using supabase.auth.signInWithPassword
        console.log('Login requested for', email);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('admin_selected_restaurant_id');
        setSelectedRestaurantIdState(null);
    };

    return (
        <AdminContext.Provider
            value={{
                session,
                user: session?.user ?? null,
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
