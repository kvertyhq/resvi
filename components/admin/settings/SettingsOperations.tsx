import React from 'react';

interface SettingsOperationsProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const SettingsOperations: React.FC<SettingsOperationsProps> = ({ formData, handleChange }) => {
    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Operations & Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold">
                        <option value="£">£ (GBP)</option>
                        <option value="$">$ (USD)</option>
                        <option value="€">€ (EUR)</option>
                        <option value="INR">₹ (INR)</option>
                        <option value="JPY">¥ (JPY)</option>
                        <option value="CNY">¥ (CNY)</option>
                        <option value="AUD">A$ (AUD)</option>
                        <option value="CAD">C$ (CAD)</option>
                        <option value="CHF">Fr (CHF)</option>
                        <option value="BRL">R$ (BRL)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                    <input type="number" name="tax_rate" value={formData.tax_rate} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Booking Size</label>
                    <input type="number" name="max_booking_size" value={formData.max_booking_size} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="delivery_available" name="delivery_available" checked={formData.delivery_available} onChange={handleChange} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                        <label htmlFor="delivery_available" className="ml-2 block text-sm text-gray-900">Delivery Available</label>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="collection_available" name="collection_available" checked={formData.collection_available} onChange={handleChange} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                        <label htmlFor="collection_available" className="ml-2 block text-sm text-gray-900">Collection Available</label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time (min)</label>
                        <input type="number" name="delivery_time_estimate" value={formData.delivery_time_estimate} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Collection Time (min)</label>
                        <input type="number" name="collection_time_estimate" value={formData.collection_time_estimate} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    </div>
                </div>

                {/* Delivery Settings */}
                {formData.delivery_available && (
                    <div className="col-span-2 bg-gray-50 p-4 rounded-md border border-gray-200 mt-2">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Configuration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ({formData.currency})</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">{formData.currency}</span>
                                    </div>
                                    <input type="number" name="delivery_fee" value={formData.delivery_fee} onChange={handleChange} step="0.01" className="block w-full rounded-md border-gray-300 pl-12 pr-3 focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">{formData.currency}</span>
                                    </div>
                                    <input type="number" name="delivery_minimum" value={formData.delivery_minimum} onChange={handleChange} step="0.01" className="block w-full rounded-md border-gray-300 pl-12 pr-3 focus:border-brand-gold focus:ring-brand-gold sm:text-sm py-2" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Delivery Radius (Miles)</label>
                                <input type="number" name="max_delivery_radius_miles" value={formData.max_delivery_radius_miles} onChange={handleChange} step="0.1" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                <p className="text-xs text-gray-500 mt-1">Delivery will be unavailable outside this radius.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Delivery Order Value ({formData.currency})</label>
                                <input type="number" name="max_delivery_order_value" value={formData.max_delivery_order_value} onChange={handleChange} step="0.01" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                <p className="text-xs text-gray-500 mt-1">Maximum allowed value for delivery orders.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsOperations;
