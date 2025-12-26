import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation(); // Add this import if missing, wait, I need to check imports.
    const { login } = useAdmin();

    useEffect(() => {
        // Check for error from redirection
        const state = location.state as { error?: string };
        if (state?.error) {
            setError(state.error);
            // Clean up state so refresh doesn't show error again? 
            // Replace history to remove state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Call context login if needed for extra state updates, though auth listener handles session
            await login(email);
            navigate('/admin/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-serif font-bold text-brand-dark-gray">Admin Panel</h1>
                    <p className="text-gray-500 mt-2">Sign in to manage your restaurant</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                        />
                    </div>
                    <div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                            />
                            <div className="text-right mt-1">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/forgot-password')}
                                    className="text-sm text-brand-gold hover:text-yellow-600 hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-dark-gray text-white py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
