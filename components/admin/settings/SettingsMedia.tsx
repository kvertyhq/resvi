import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { FileText, Upload, Trash2, Loader2, ExternalLink } from 'lucide-react';

interface SettingsMediaProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const SettingsMedia: React.FC<SettingsMediaProps> = ({ formData, handleChange, setFormData }) => {
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            setPdfError('Please select a PDF file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setPdfError('File size must be less than 5MB.');
            return;
        }

        setUploadingPdf(true);
        setPdfError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `menu-pdf-${Date.now()}.${fileExt}`;
            // Upload to 'menus' bucket
            const { error: uploadError } = await supabase.storage
                .from('menus')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('menus')
                .getPublicUrl(fileName);

            // Update form data with new URL
            setFormData((prev: any) => ({ ...prev, menu_pdf_url: publicUrl }));

        } catch (error: any) {
            console.error('Error uploading PDF:', error);
            setPdfError(error.message || 'Error uploading file');
        } finally {
            setUploadingPdf(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleRemovePdf = () => {
        if (confirm('Are you sure you want to remove the specific menu PDF link?')) {
            setFormData((prev: any) => ({ ...prev, menu_pdf_url: '' }));
        }
    };

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Media & Socials</h3>

            {/* Menu PDF Section */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                            <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                Digital Menu PDF
                            </h4>
                            <p className="text-xs text-gray-500">Upload a PDF menu for customers to download.</p>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_menu_pdf_visible"
                                name="is_menu_pdf_visible"
                                checked={formData.is_menu_pdf_visible !== false} // Default to true if undefined
                                onChange={handleChange}
                                className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                            />
                            <label htmlFor="is_menu_pdf_visible" className="ml-2 text-sm text-gray-700 font-medium">
                                Show on Homepage
                            </label>
                        </div>
                    </div>

                    <div className="flex items-start space-x-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Upload new PDF menu</label>
                            <div className="flex items-center space-x-2">
                                <label className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingPdf ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {uploadingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                    {uploadingPdf ? 'Uploading...' : 'Choose File'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="application/pdf"
                                        onChange={handlePdfUpload}
                                        disabled={uploadingPdf}
                                    />
                                </label>
                                <span className="text-xs text-gray-500">Max 5MB</span>
                            </div>
                            {pdfError && <p className="text-xs text-red-600 mt-1">{pdfError}</p>}
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Current PDF URL</label>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    name="menu_pdf_url"
                                    value={formData.menu_pdf_url || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="block w-full text-sm border-gray-300 rounded-l-md focus:ring-brand-gold focus:border-brand-gold"
                                />
                                {formData.menu_pdf_url && (
                                    <a
                                        href={formData.menu_pdf_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100"
                                        title="View PDF"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {formData.menu_pdf_url && (
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center overflow-hidden">
                                <div className="bg-red-100 p-2 rounded-full mr-3">
                                    <FileText className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-gray-900 truncate">Menu PDF</p>
                                    <p className="text-xs text-gray-500 truncate">{formData.menu_pdf_url}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemovePdf}
                                className="text-red-500 hover:text-red-700 p-2"
                                title="Remove PDF"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
