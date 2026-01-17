import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Save, Printer, Eye } from 'lucide-react';

const Toast = ({ message, onClose }: { message: { type: 'success' | 'error', text: string }, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    return (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg flex items-center space-x-2 z-50 transition-transform transform duration-300 ease-in-out ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            <span>{message.text}</span>
            <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold">&times;</button>
        </div>
    );
};

const ReceiptSettingsPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        header_text: '',
        footer_text: '',
        show_logo: true,
        logo_url: '',
        custom_css: ''
    });

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchSettings(selectedRestaurantId);
        }
    }, [selectedRestaurantId]);

    const fetchSettings = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_receipt_settings', { p_restaurant_id: id });
            if (error) throw error;
            if (data) {
                setFormData({
                    header_text: data.header_text || '',
                    footer_text: data.footer_text || '',
                    show_logo: data.show_logo ?? true,
                    logo_url: data.logo_url || '',
                    custom_css: data.custom_css || ''
                });
            }
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setMessage({ type: 'error', text: 'Failed to load receipt settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('receipt_settings')
                .upsert({
                    restaurant_id: selectedRestaurantId,
                    ...formData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'restaurant_id' });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Receipt settings saved!' });
        } catch (err: any) {
            console.error('Error saving:', err);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setLoading(false);
        }
    };

    if (!selectedRestaurantId) {
        return <div className="text-center p-10 text-gray-500">Please select a restaurant.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto pb-10 p-4">
            {message && <Toast message={message} onClose={() => setMessage(null)} />}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-serif font-bold text-gray-800 flex items-center gap-2">
                    <Printer className="w-8 h-8" />
                    Receipt Configuration
                </h2>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-brand-dark-gray text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 flex items-center disabled:opacity-50 shadow-sm"
                >
                    <Save className="h-5 w-5 mr-2" />
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Form */}
                <div className="bg-white shadow rounded-lg p-6 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Header & Footer</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Header Text (Business Name/Address handled automatically, add extras here)</label>
                            <textarea
                                name="header_text"
                                value={formData.header_text}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border rounded-md focus:ring-brand-gold focus:border-brand-gold"
                                placeholder="E.g. VAT No: 12345678"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                            <textarea
                                name="footer_text"
                                value={formData.footer_text}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border rounded-md focus:ring-brand-gold focus:border-brand-gold"
                                placeholder="E.g. Thank you for visiting! Follow us on Instagram."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-700 border-b pb-2">Branding</h3>

                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                id="show_logo"
                                name="show_logo"
                                checked={formData.show_logo}
                                onChange={(e) => setFormData(prev => ({ ...prev, show_logo: e.target.checked }))}
                                className="h-4 w-4 text-brand-gold rounded border-gray-300 focus:ring-brand-gold"
                            />
                            <label htmlFor="show_logo" className="text-sm font-medium text-gray-700">Print Logo on Receipt</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Logo URL (Optional overlay)</label>
                            <input
                                type="text"
                                name="logo_url"
                                value={formData.logo_url}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md"
                                placeholder="https://..."
                            />
                            <p className="text-xs text-gray-500 mt-1">If blank, standard restaurant logo is used.</p>
                        </div>
                    </div>
                </div>

                {/* Live Preview (Mockup) */}
                <div className="bg-gray-100 rounded-lg p-8 flex justify-center items-start">
                    <div className="bg-white w-[300px] shadow-xl p-4 text-xs font-mono leading-tight space-y-4 relative">
                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow">
                            Preview
                        </div>

                        {/* Logo */}
                        {formData.show_logo && (
                            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-cover rounded-full" /> : 'Logo'}
                            </div>
                        )}

                        {/* Title */}
                        <div className="text-center">
                            <h1 className="text-lg font-bold uppercase mb-1">Restaurant Name</h1>
                            <p>123 Fake Street, London</p>
                            <p>020 7946 0123</p>
                        </div>

                        {/* Header Text */}
                        {formData.header_text && (
                            <div className="text-center border-b border-dashed border-gray-300 pb-2 whitespace-pre-wrap">
                                {formData.header_text}
                            </div>
                        )}

                        {/* Items */}
                        <div className="space-y-1">
                            <div className="flex justify-between font-bold">
                                <span>ITEM</span>
                                <span>PRICE</span>
                            </div>
                            <div className="flex justify-between">
                                <span>1x Burger</span>
                                <span>12.50</span>
                            </div>
                            <div className="flex justify-between">
                                <span>2x Coke</span>
                                <span>6.00</span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between font-bold text-sm">
                            <span>TOTAL</span>
                            <span>18.50</span>
                        </div>

                        {/* Footer Text */}
                        {formData.footer_text && (
                            <div className="text-center pt-4 whitespace-pre-wrap font-medium">
                                {formData.footer_text}
                            </div>
                        )}

                        <div className="text-center text-[10px] text-gray-400 pt-2">
                            {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptSettingsPage;
