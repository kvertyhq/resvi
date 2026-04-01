import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface OnboardRestaurantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const OnboardRestaurantModal: React.FC<OnboardRestaurantModalProps> = ({ isOpen, onClose, onSuccess }) => {
    // Restaurant Details
    const [restaurantName, setRestaurantName] = useState('');
    const [subscriptionPlan, setSubscriptionPlan] = useState('basic');
    const [smsCredits, setSmsCredits] = useState(0);
    const [timezone, setTimezone] = useState('Europe/London');
    const [currency, setCurrency] = useState('£');
    const [themeColor, setThemeColor] = useState('#c9a96e');
    const [headerColor, setHeaderColor] = useState('#333333');
    const [buttonColor, setButtonColor] = useState('#c9a96e');

    // Initial Admin User
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setRestaurantName('');
            setSubscriptionPlan('basic');
            setSmsCredits(0);
            setTimezone('Europe/London');
            setCurrency('£');
            setThemeColor('#c9a96e');
            setHeaderColor('#333333');
            setButtonColor('#c9a96e');
            setAdminEmail('');
            setAdminPassword('');
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create the restaurant instance
            const { data: newRestaurant, error: createError } = await supabase
                .from('restaurant_settings')
                .insert([{
                    name: restaurantName,
                    subscription_plan: subscriptionPlan,
                    sms_credits: smsCredits,
                    timezone: timezone,
                    currency: currency,
                    theme_color: themeColor,
                    header_color: headerColor,
                    button_color: buttonColor,
                    theme_settings: {
                        theme_color: themeColor,
                        header_color: headerColor,
                        button_color: buttonColor
                    },
                    website_settings: {
                        watermark_text: restaurantName,
                        hero_title: 'Fuel Your Mood. Feed Your Cravings.',
                        hero_subtitle: '',
                        about_subtitle: 'Passion on a Plate',
                        about_sections: [],
                        order_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/674.jpg',
                        booking_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/684.jpg',
                        about_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg',
                        cover_page_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg',
                        menu_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg',
                        delivery_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg',
                        inside_story_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg'
                    }
                }])
                .select('id')
                .single();

            if (createError) throw createError;
            if (!newRestaurant) throw new Error("Failed to retrieve created restaurant ID.");

            const restaurantId = newRestaurant.id;

            // 2. Add an SMS credit transaction record if > 0
            if (smsCredits > 0) {
                await supabase.from('sms_credit_transactions').insert({
                    restaurant_id: restaurantId,
                    amount: smsCredits,
                    description: 'Initial onboarding credits'
                });
            }

            // 3. Create the initial administrative user using the secure Edge Function
            const { data, error: funcError } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'create-staff',
                    role: 'admin',
                    restaurantId: restaurantId,
                    email: adminEmail,
                    password: adminPassword
                }
            });

            if (funcError) throw funcError;
            if (data?.error) throw new Error(data.error);

            // Successfully finished onboarding
            onSuccess();
        } catch (err: any) {
            console.error('Onboarding failed:', err);
            setError(err.message || 'An unknown error occurred during onboarding.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col transform transition-all scale-100">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-gold/20 p-2 rounded-xl text-brand-gold">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">Onboard New Restaurant</h2>
                            <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">Provision environment & owner</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
                            <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-8">
                        {/* Section 1: Business Details */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-brand-gold" />
                                1. Business Profile
                            </h3>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Restaurant Name</label>
                                <input
                                    type="text"
                                    required
                                    disabled={loading}
                                    placeholder="e.g. Papa Luigi's Pizza"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-3 border"
                                    value={restaurantName}
                                    onChange={e => setRestaurantName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Subscription Plan</label>
                                    <select
                                        disabled={loading}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-3 border font-medium capitalize"
                                        value={subscriptionPlan}
                                        onChange={e => setSubscriptionPlan(e.target.value)}
                                    >
                                        <option value="basic">Basic</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Initial SMS Credits</label>
                                    <input
                                        type="number"
                                        min="0"
                                        disabled={loading}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-3 border"
                                        value={smsCredits}
                                        onChange={e => setSmsCredits(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                                    <select
                                        disabled={loading}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-3 border font-medium"
                                        value={currency}
                                        onChange={e => setCurrency(e.target.value)}
                                        required
                                    >
                                        <option value="£">GBP (£)</option>
                                        <option value="$">USD ($)</option>
                                        <option value="€">EUR (€)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Timezone</label>
                                    <select
                                        disabled={loading}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-3 border font-medium"
                                        value={timezone}
                                        onChange={e => setTimezone(e.target.value)}
                                        required
                                    >
                                        <option value="Europe/London">Europe/London</option>
                                        <option value="Europe/Dublin">Europe/Dublin</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                                        <option value="Australia/Sydney">Australia/Sydney</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Theme Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            disabled={loading}
                                            className="h-10 w-12 p-0.5 border border-gray-300 rounded-lg cursor-pointer bg-white"
                                            value={themeColor}
                                            onChange={e => setThemeColor(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            disabled={loading}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border font-mono text-sm uppercase"
                                            value={themeColor}
                                            onChange={e => setThemeColor(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Header Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            disabled={loading}
                                            className="h-10 w-12 p-0.5 border border-gray-300 rounded-lg cursor-pointer bg-white"
                                            value={headerColor}
                                            onChange={e => setHeaderColor(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            disabled={loading}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border font-mono text-sm uppercase"
                                            value={headerColor}
                                            onChange={e => setHeaderColor(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Button Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            disabled={loading}
                                            className="h-10 w-12 p-0.5 border border-gray-300 rounded-lg cursor-pointer bg-white"
                                            value={buttonColor}
                                            onChange={e => setButtonColor(e.target.value)}
                                        />
                                        <input 
                                            type="text" 
                                            disabled={loading}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border font-mono text-sm uppercase"
                                            value={buttonColor}
                                            onChange={e => setButtonColor(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Owner / Admin Credentials */}
                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-4 h-4 text-blue-600" />
                                2. Owner Credentials
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 font-medium">Create the master login the client will use to complete their setup.</p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="email"
                                        required
                                        disabled={loading}
                                        placeholder="admin@restaurant.com"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 pl-10 border"
                                        value={adminEmail}
                                        onChange={e => setAdminEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        disabled={loading}
                                        placeholder="Secure starting password"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 pl-10 border"
                                        value={adminPassword}
                                        onChange={e => setAdminPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6 -mx-2 px-2">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={onClose}
                                className="px-5 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !restaurantName || !adminEmail || !adminPassword}
                                className="px-6 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-600/20"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                        Provisioning...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        Create Workspace
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default OnboardRestaurantModal;
