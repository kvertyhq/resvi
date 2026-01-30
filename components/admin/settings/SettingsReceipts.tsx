import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../../context/AdminContext';
import { supabase } from '../../../supabaseClient';
import { Save, Printer } from 'lucide-react';

const SettingsReceipts: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        header_text: '',
        footer_text: '',
        show_logo: true,
        logo_url: '',
        custom_css: '',
        print_mode: 'manual' as 'auto_with_drawer' | 'auto_no_drawer' | 'manual'
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
                    custom_css: data.custom_css || '',
                    print_mode: data.print_mode || 'manual'
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
            const { error } = await supabase.rpc('upsert_receipt_settings', {
                p_restaurant_id: selectedRestaurantId,
                p_header_text: formData.header_text,
                p_footer_text: formData.footer_text,
                p_show_logo: formData.show_logo,
                p_logo_url: formData.logo_url,
                p_custom_css: formData.custom_css,
                p_print_mode: formData.print_mode
            });

            if (error) throw error;
            setMessage({ type: 'success', text: 'Receipt settings saved!' });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error('Error saving:', err);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setLoading(false);
        }
    };

    if (!selectedRestaurantId) return null;

    return (
        <div className="space-y-6">
            {message && (
                <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Receipt Customization</h3>
                    <p className="mt-1 text-sm text-gray-500">Customize how your printed and digital receipts look.</p>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 flex items-center disabled:opacity-50 text-sm transition-colors shadow-sm"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Config'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Editor Form */}
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 border-b pb-2">Header & Footer</h4>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
                            <textarea
                                name="header_text"
                                value={formData.header_text}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold sm:text-sm"
                                placeholder="E.g. VAT No: 12345678"
                            />
                            <p className="mt-1 text-xs text-gray-500">Business Name and Address are added automatically.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                            <textarea
                                name="footer_text"
                                value={formData.footer_text}
                                onChange={handleChange}
                                rows={3}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold sm:text-sm"
                                placeholder="E.g. Thank you for visiting! Follow us on Instagram."
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 border-b pb-2">Branding</h4>

                        <div className="flex items-center gap-2">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Logo URL (Optional)</label>
                            <input
                                type="text"
                                name="logo_url"
                                value={formData.logo_url}
                                onChange={handleChange}
                                className="w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                placeholder="https://..."
                            />
                            <p className="mt-1 text-xs text-gray-500">Leave blank to use the main restaurant logo settings.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
                        <h4 className="font-medium text-gray-900 border-b pb-2 flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print Behavior
                        </h4>

                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">Choose when receipts should be printed automatically:</p>

                            <div className="space-y-2">
                                <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input
                                        type="radio"
                                        name="print_mode"
                                        value="auto_with_drawer"
                                        checked={formData.print_mode === 'auto_with_drawer'}
                                        onChange={(e) => setFormData(prev => ({ ...prev, print_mode: e.target.value as any }))}
                                        className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Auto Print + Open Drawer</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Automatically print receipt and open cash drawer after order placement</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input
                                        type="radio"
                                        name="print_mode"
                                        value="auto_no_drawer"
                                        checked={formData.print_mode === 'auto_no_drawer'}
                                        onChange={(e) => setFormData(prev => ({ ...prev, print_mode: e.target.value as any }))}
                                        className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Auto Print (No Drawer)</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Automatically print receipt without opening cash drawer</div>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input
                                        type="radio"
                                        name="print_mode"
                                        value="manual"
                                        checked={formData.print_mode === 'manual'}
                                        onChange={(e) => setFormData(prev => ({ ...prev, print_mode: e.target.value as any }))}
                                        className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Manual Print</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Require manual click on print button (default)</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Preview (Mockup) */}
                <div className="bg-gray-100 rounded-lg p-6 flex justify-center items-start border border-gray-200 min-h-[400px]">
                    <div className="bg-white w-[280px] shadow-sm border border-gray-100 p-4 text-xs font-mono leading-tight space-y-3 relative">
                        <div className="absolute -top-3 -right-3 bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow">
                            Preview
                        </div>

                        {/* Logo */}
                        {formData.show_logo && (
                            <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-cover rounded-full" alt="Logo" /> : 'Logo'}
                            </div>
                        )}

                        {/* Title */}
                        <div className="text-center">
                            <h1 className="text-sm font-bold uppercase mb-1">Restaurant Name</h1>
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
                            <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
                                <span>ITEM</span>
                                <span>PRICE</span>
                            </div>
                            <div className="flex justify-between">
                                <span>1x Burger (Classic)</span>
                                <span>12.50</span>
                            </div>
                            <div className="flex justify-between">
                                <span>2x Coke</span>
                                <span>6.00</span>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between font-bold">
                            <span>TOTAL</span>
                            <span>18.50</span>
                        </div>

                        {/* Footer Text */}
                        {formData.footer_text && (
                            <div className="text-center pt-4 whitespace-pre-wrap font-medium">
                                {formData.footer_text}
                            </div>
                        )}

                        <div className="text-center text-[10px] text-gray-400 pt-2 border-t border-gray-100 mt-2">
                            {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsReceipts;
