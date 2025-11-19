import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Mail } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/admin/reset-password`,
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Password reset link has been sent to your email address.',
            });
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.message || 'Failed to send reset link.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <Link to="/admin/login" className="flex items-center text-sm text-gray-500 hover:text-brand-dark-gray mb-6 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
                </Link>

                <div className="text-center mb-8">
                    <div className="bg-brand-gold/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-6 w-6 text-brand-gold" />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-brand-dark-gray">Forgot Password?</h1>
                    <p className="text-gray-500 mt-2 text-sm">Enter your email address and we'll send you a link to reset your password.</p>
                </div>

                {message && (
                    <div className={`p-3 rounded-md mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleReset} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                            placeholder="you@example.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-dark-gray text-white py-2 rounded-md font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Sending Link...' : 'Send Reset Link'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
