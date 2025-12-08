import React from 'react';

interface SettingsMediaProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const SettingsMedia: React.FC<SettingsMediaProps> = ({ formData, handleChange }) => {
    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Media & Socials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                    <input type="text" name="cover_image_url" value={formData.cover_image_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                </div>

                {/* Socials */}
                <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Social Media</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Facebook</label>
                            <input type="url" name="facebook_url" value={formData.facebook_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Instagram</label>
                            <input type="url" name="instagram_url" value={formData.instagram_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Twitter</label>
                            <input type="url" name="twitter_url" value={formData.twitter_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">TikTok</label>
                            <input type="url" name="tiktok_url" value={formData.tiktok_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">YouTube</label>
                            <input type="url" name="youtube_url" value={formData.youtube_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsMedia;
