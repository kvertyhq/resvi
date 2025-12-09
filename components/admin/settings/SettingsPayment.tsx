import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { supabase } from '../../../supabaseClient';

const SettingsPayment: React.FC = () => {
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [enableCash, setEnableCash] = useState(true);
    const [enableCard, setEnableCard] = useState(false);
    const [stripePublishableKey, setStripePublishableKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');

    useEffect(() => {
        if (settings?.payment_settings) {
            setEnableCash(settings.payment_settings.enable_cash ?? true);
            setEnableCard(settings.payment_settings.enable_card ?? false);
            if (settings.payment_settings.stripe_config) {
                setStripePublishableKey(settings.payment_settings.stripe_config.publishable_key || '');
                setStripeSecretKey(settings.payment_settings.stripe_config.secret_key || '');
            }
        }
    }, [settings]);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const payment_settings = {
                enable_cash: enableCash,
                enable_card: enableCard,
                stripe_config: {
                    publishable_key: stripePublishableKey,
                    secret_key: stripeSecretKey
                }
            };

            const { error } = await supabase
                .from('restaurant_settings')
                .update({ payment_settings })
                .eq('id', import.meta.env.VITE_RESTAURANT_ID);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Payment settings updated successfully!' });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Payment Settings</h2>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Method Toggles */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                            <span className="block font-medium text-gray-900">Cash on Delivery / Collection</span>
                            <span className="text-sm text-gray-500">Allow customers to pay with cash.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={enableCash} onChange={e => setEnableCash(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                            <span className="block font-medium text-gray-900">Card Payment (Stripe)</span>
                            <span className="text-sm text-gray-500">Allow customers to pay online with credit/debit card.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={enableCard} onChange={e => setEnableCard(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold"></div>
                        </label>
                    </div>
                </div>

                {/* Stripe Configuration */}
                {enableCard && (
                    <div className="mt-6 border-t pt-6 animate-fade-in">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Stripe Configuration</h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Publishable Key</label>
                                <input
                                    type="text"
                                    value={stripePublishableKey}
                                    onChange={(e) => setStripePublishableKey(e.target.value)}
                                    placeholder="pk_test_..."
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold sm:text-sm p-2 border"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                                <input
                                    type="password"
                                    value={stripeSecretKey}
                                    onChange={(e) => setStripeSecretKey(e.target.value)}
                                    placeholder="sk_test_..."
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold sm:text-sm p-2 border"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Stored securely. Used for processing payments on the server.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-gold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPayment;
