import React from 'react';

interface SettingsThemeProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleWebsiteSettingsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleThemeSettingsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const SettingsTheme: React.FC<SettingsThemeProps> = ({ formData, handleChange, handleWebsiteSettingsChange, handleThemeSettingsChange }) => {
    const themeSettings = formData.theme_settings || {};
    const websiteSettings = formData.website_settings || {};

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Website Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Watermark Text */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Watermark Text</label>
                    <p className="text-xs text-gray-500 mb-2">Text overlay shown on the homepage hero section.</p>
                    <input type="text" name="watermark_text" value={websiteSettings.watermark_text || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                {/* Theme Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                    <p className="text-xs text-gray-500 mb-2">Primary accent color used for highlights and small elements.</p>
                    <div className="flex items-center space-x-2">
                        <input type="color" name="theme_color" value={themeSettings.theme_color || '#c9a96e'} onChange={handleThemeSettingsChange} className="h-10 w-10 border border-gray-300 rounded p-1 cursor-pointer" />
                        <input type="text" name="theme_color" value={themeSettings.theme_color || '#c9a96e'} onChange={handleThemeSettingsChange} className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    </div>
                </div>

                {/* Header Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Header Background Color</label>
                    <p className="text-xs text-gray-500 mb-2">The background color for the main navigation bar.</p>
                    <div className="flex items-center space-x-2">
                        <input type="color" name="header_color" value={themeSettings.header_color || '#333333'} onChange={handleThemeSettingsChange} className="h-10 w-10 border border-gray-300 rounded p-1 cursor-pointer" />
                        <input type="text" name="header_color" value={themeSettings.header_color || '#333333'} onChange={handleThemeSettingsChange} className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    </div>
                </div>

                {/* Button Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Button Color</label>
                    <p className="text-xs text-gray-500 mb-2">Primary action color for buttons throughout the website.</p>
                    <div className="flex items-center space-x-2">
                        <input type="color" name="button_color" value={themeSettings.button_color || themeSettings.theme_color || '#c9a96e'} onChange={handleThemeSettingsChange} className="h-10 w-10 border border-gray-300 rounded p-1 cursor-pointer" />
                        <input type="text" name="button_color" value={themeSettings.button_color || themeSettings.theme_color || '#c9a96e'} onChange={handleThemeSettingsChange} className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    </div>
                </div>
            </div>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Preview</h4>
                <div className="space-y-4">
                    <div className="h-12 rounded shadow-sm flex items-center px-4 text-white text-xs font-medium" style={{ backgroundColor: themeSettings.header_color || '#333333' }}>
                        Header Preview
                    </div>
                    <div className="flex space-x-4">
                        <button type="button" className="px-6 py-2 rounded text-white text-sm font-bold shadow-sm" style={{ backgroundColor: themeSettings.button_color || themeSettings.theme_color || '#c9a96e' }}>
                            Primary Button
                        </button>
                        <div className="text-sm font-medium" style={{ color: themeSettings.theme_color || '#c9a96e' }}>
                            Accent Text Link
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsTheme;
