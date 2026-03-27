import React from 'react';

interface SettingsThemeProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleWebsiteSettingsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleThemeSettingsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    updateWebsiteSettings: (updatedSettings: any) => void;
}

const ImagePreview: React.FC<{ url: string; label: string }> = ({ url, label }) => {
    if (!url) return <div className="mt-2 h-20 w-32 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs text-center px-2">No {label} set</div>;
    
    return (
        <div className="mt-2 flex items-start space-x-3">
            <div className="relative group">
                <img 
                    src={url} 
                    alt={label} 
                    className="h-20 w-32 object-cover rounded border border-gray-200 shadow-sm transition-transform group-hover:scale-105"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+URL';
                    }}
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity rounded pointer-events-none"></div>
            </div>
            <div className="text-[10px] text-gray-400 break-all max-w-[150px] line-clamp-3">
                {url}
            </div>
        </div>
    );
};

const SettingsTheme: React.FC<SettingsThemeProps> = ({ formData, handleChange, handleWebsiteSettingsChange, handleThemeSettingsChange, updateWebsiteSettings }) => {
    const themeSettings = formData.theme_settings || {};
    const websiteSettings = formData.website_settings || {};
    const aboutSections = websiteSettings.about_sections || [];

    const handleAddAboutSection = () => {
        const newSection = { title: 'New Section', content: '', image_url: '' };
        updateWebsiteSettings({ about_sections: [...aboutSections, newSection] });
    };

    const handleRemoveAboutSection = (index: number) => {
        const updated = aboutSections.filter((_: any, i: number) => i !== index);
        updateWebsiteSettings({ about_sections: updated });
    };

    const handleAboutSectionChange = (index: number, field: string, value: string) => {
        const updated = aboutSections.map((section: any, i: number) => {
            if (i === index) {
                return { ...section, [field]: value };
            }
            return section;
        });
        updateWebsiteSettings({ about_sections: updated });
    };

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Website Appearance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ... (Appearance fields remain the same) ... */}
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

            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4 mt-12">Website Content & Imagery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Hero Title */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
                    <p className="text-xs text-gray-500 mb-2">The main headline shown on the homepage hero section.</p>
                    <input type="text" name="hero_title" value={websiteSettings.hero_title || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                {/* Hero Subtitle */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
                    <p className="text-xs text-gray-500 mb-2">The description text shown below the hero title.</p>
                    <textarea name="hero_subtitle" rows={2} value={websiteSettings.hero_subtitle || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                {/* About Page Subtitle */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">About Page Subtitle</label>
                    <p className="text-xs text-gray-500 mb-2">The secondary heading shown on the "About Us" page banner.</p>
                    <input type="text" name="about_subtitle" value={websiteSettings.about_subtitle || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                {/* Logo URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <p className="text-xs text-gray-500 mb-2">The main logo shown in the header and footer.</p>
                    <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={formData.logo_url} label="Logo" />
                </div>

                {/* Cover Page URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Page URL</label>
                    <p className="text-xs text-gray-500 mb-2">The hero background image on the homepage.</p>
                    <input type="text" name="cover_page_url" value={websiteSettings.cover_page_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.cover_page_url} label="Cover Page" />
                </div>

                {/* Menu Section Image URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Menu Section Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">Background image for the "Our Menu" section.</p>
                    <input type="text" name="menu_image_url" value={websiteSettings.menu_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.menu_image_url} label="Menu Section" />
                </div>

                {/* Delivery Section Image URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Section Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">Background image for the "Delivery" section.</p>
                    <input type="text" name="delivery_image_url" value={websiteSettings.delivery_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.delivery_image_url} label="Delivery Section" />
                </div>

                {/* Inside Story Image URL */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inside Story Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">Background image for the "Our Story" section.</p>
                    <input type="text" name="inside_story_image_url" value={websiteSettings.inside_story_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.inside_story_image_url} label="Inside Story" />
                </div>

                {/* Booking Page Image URL */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Page Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">The image shown on the table reservation page.</p>
                    <input type="text" name="booking_image_url" value={websiteSettings.booking_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.booking_image_url} label="Booking Page" />
                </div>

                {/* Order Page Image URL */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Page Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">The header image shown on the online ordering page.</p>
                    <input type="text" name="order_image_url" value={websiteSettings.order_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.order_image_url} label="Order Page" />
                </div>

                {/* About Page Image URL */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">About Page Image URL</label>
                    <p className="text-xs text-gray-500 mb-2">The header image shown on the "About Us" page banner.</p>
                    <input type="text" name="about_image_url" value={websiteSettings.about_image_url || ''} onChange={handleWebsiteSettingsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                    <ImagePreview url={websiteSettings.about_image_url} label="About Page" />
                </div>
            </div>

            <div className="mt-12 border-t pt-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">About Us Sections</h3>
                        <p className="text-sm text-gray-500">Manage the content blocks on your "About Us" page.</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={handleAddAboutSection}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-gold hover:bg-brand-gold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold"
                    >
                        Add New Section
                    </button>
                </div>

                <div className="space-y-8">
                    {aboutSections.map((section: any, index: number) => (
                        <div key={index} className="p-6 bg-gray-50 rounded-lg border border-gray-200 relative group animate-fadeIn">
                            <button 
                                type="button" 
                                onClick={() => handleRemoveAboutSection(index)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove Section"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Section Title</label>
                                        <input 
                                            type="text" 
                                            value={section.title || ''} 
                                            onChange={(e) => handleAboutSectionChange(index, 'title', e.target.value)} 
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label>
                                        <textarea 
                                            rows={4} 
                                            value={section.content || ''} 
                                            onChange={(e) => handleAboutSectionChange(index, 'content', e.target.value)} 
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                                        <input 
                                            type="text" 
                                            value={section.image_url || ''} 
                                            onChange={(e) => handleAboutSectionChange(index, 'image_url', e.target.value)} 
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold" 
                                        />
                                        <ImagePreview url={section.image_url} label={`About Section ${index + 1}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {aboutSections.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <p className="text-gray-500">No about sections added yet. Click "Add New Section" to start.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Color Palette Preview</h4>
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
