import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../supabaseClient';
import { Save } from 'lucide-react';
import SettingsBasicInfo from '../../components/admin/settings/SettingsBasicInfo';
import SettingsTheme from '../../components/admin/settings/SettingsTheme';
import SettingsLocation from '../../components/admin/settings/SettingsLocation';
import SettingsOperations from '../../components/admin/settings/SettingsOperations';
import SettingsMedia from '../../components/admin/settings/SettingsMedia';
import SettingsOpeningHours from '../../components/admin/settings/SettingsOpeningHours';
import SettingsClosureDates from '../../components/admin/settings/SettingsClosureDates';
import SettingsTimeslots from '../../components/admin/settings/SettingsTimeslots';
import SettingsBookingPreorder from '../../components/admin/settings/SettingsBookingPreorder';
import SettingsBookingGeneral from '../../components/admin/settings/SettingsBookingGeneral';
import SettingsDeliveryZones from '../../components/admin/settings/SettingsDeliveryZones';
import SettingsPayment from '../../components/admin/settings/SettingsPayment';
import SettingsTableManagement from '../../components/admin/settings/SettingsTableManagement';
import SettingsSMS from '../../components/admin/settings/SettingsSMS';
import SettingsIntegrations from '../../components/admin/settings/SettingsIntegrations';
import SettingsReceipts from '../../components/admin/settings/SettingsReceipts';

import { Users } from 'lucide-react';

// Simple Toast Component
const Toast = ({ message, onClose }: { message: { type: 'success' | 'error', text: string }, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    return (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg flex items-center space-x-2 z-50 transition-transform transform duration-300 ease-in-out ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
            <span>{message.text}</span>
            <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold">&times;</button>
        </div>
    );
};

const SettingsPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const { refreshSettings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postcode: '',
        phone: '',
        email: '',
        website_url: '',
        google_map_url: '',
        currency: '£',
        delivery_available: false,
        collection_available: false,
        delivery_time_estimate: 45,
        collection_time_estimate: 20,
        facebook_url: '',
        instagram_url: '',
        twitter_url: '',
        tiktok_url: '',
        youtube_url: '',
        logo_url: '',
        theme_color: '#c9a96e',
        header_color: '#333333',
        button_color: '#c9a96e',
        theme_settings: {
            header_color: '#333333',
            button_color: '#c9a96e',
            theme_color: '#c9a96e'
        },
        website_settings: {
            watermark_text: 'Your Name',
            hero_title: 'Fuel Your Mood. Feed Your Cravings.',
            hero_subtitle: 'Indulge in mood-boosting sushi and expertly prepared steaks—made with high-quality ingredients and chef precision.',
            about_subtitle: 'Passion on a Plate',
            about_sections: [],
            order_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/674.jpg',
            booking_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/684.jpg',
            about_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg',
            cover_page_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg',
            menu_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg',
            delivery_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg',
            inside_story_image_url: 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg'
        },
        tax_rate: 0,
        max_booking_size: 10,
        opening_hours: {} as Record<string, string[]>,
        delivery_fee: 0,
        delivery_fee_mode: 'flat',
        delivery_minimum: 0,
        max_delivery_radius_miles: 5,
        max_delivery_order_value: 1000,
        menu_pdf_url: '',
        is_menu_pdf_visible: true,
        timezone: 'UTC',
        sms_preferences: {
            new_booking_admin: true,
            new_booking_customer: true,
            booking_confirmed: true,
            booking_cancelled: true,
            table_assigned: true
        },
        google_analytics_id: '',
        bookings_enabled: true,
        show_tax: true
    });

    // New states for advanced settings
    const [collectionTimeSlots, setCollectionTimeSlots] = useState<Record<string, string[]>>({});
    const [closureDates, setClosureDates] = useState<string[]>([]);
    const [timeslotCapacities, setTimeslotCapacities] = useState<Record<string, { max_orders?: number; max_delivery?: number; max_collection?: number }>>({});
    const [preorderRequiredDays, setPreorderRequiredDays] = useState<string[]>([]);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchSettings(selectedRestaurantId);
        }
    }, [selectedRestaurantId]);

    const fetchSettings = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_restaurant_settings', { p_id: id });

            if (error) throw error;

            if (data) {
                const responseData = data.data || data;
                const settings = Array.isArray(responseData) ? responseData[0] : responseData;

                if (settings) {
                    setFormData({
                        name: settings.name || '',
                        description: settings.description || '',
                        address_line1: settings.address_line1 || '',
                        address_line2: settings.address_line2 || '',
                        city: settings.city || '',
                        postcode: settings.postcode || '',
                        phone: settings.phone || '',
                        email: settings.email || '',
                        website_url: settings.website_url || '',
                        google_map_url: settings.google_map_url || '',
                        currency: settings.currency || '£',
                        delivery_available: settings.delivery_available ?? false,
                        collection_available: settings.collection_available ?? false,
                        delivery_time_estimate: settings.delivery_time_estimate || 45,
                        collection_time_estimate: settings.collection_time_estimate || 20,
                        facebook_url: settings.facebook_url || '',
                        instagram_url: settings.instagram_url || '',
                        twitter_url: settings.twitter_url || '',
                        tiktok_url: settings.tiktok_url || '',
                        youtube_url: settings.youtube_url || '',
                        logo_url: settings.logo_url || '',
                        theme_color: settings.theme_color || '#c9a96e',
                        header_color: settings.header_color || '#333333',
                        button_color: settings.button_color || settings.theme_color || '#c9a96e',
                        theme_settings: settings.theme_settings || {
                            header_color: settings.header_color || '#333333',
                            button_color: settings.button_color || settings.theme_color || '#c9a96e',
                            theme_color: settings.theme_color || '#c9a96e'
                        },
                        website_settings: settings.website_settings || {
                            watermark_text: settings.watermark_text || 'Your Name',
                            hero_title: settings.hero_title || 'Fuel Your Mood. Feed Your Cravings.',
                            hero_subtitle: settings.hero_subtitle || 'Indulge in mood-boosting sushi and expertly prepared steaks—made with high-quality ingredients and chef precision.',
                            about_subtitle: settings.about_subtitle || 'Passion on a Plate',
                            about_sections: settings.about_sections || [],
                            order_image_url: settings.order_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/674.jpg',
                            booking_image_url: settings.booking_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/684.jpg',
                            about_image_url: settings.about_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg',
                            cover_page_url: settings.cover_page_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/734.jpg',
                            menu_image_url: settings.menu_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/689.jpg',
                            delivery_image_url: settings.delivery_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/694.jpg',
                            inside_story_image_url: settings.inside_story_image_url || 'https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/677.jpg'
                        },
                        tax_rate: settings.tax_rate || 0,
                        max_booking_size: settings.max_booking_size || 10,
                        opening_hours: settings.opening_hours || {},
                        delivery_fee: settings.delivery_fee || 0,
                        delivery_fee_mode: settings.delivery_fee_mode || 'flat',
                        delivery_minimum: settings.delivery_minimum || 0,
                        max_delivery_radius_miles: settings.max_delivery_radius_miles || 5,
                        max_delivery_order_value: settings.max_delivery_order_value || 1000,
                        menu_pdf_url: settings.menu_pdf_url || '',
                        is_menu_pdf_visible: settings.is_menu_pdf_visible ?? true,
                        timezone: settings.timezone || 'UTC',
                        sms_preferences: settings.sms_preferences || {
                            new_booking_admin: true,
                            new_booking_customer: true,
                            booking_confirmed: true,
                            booking_cancelled: true,
                            table_assigned: true
                        },
                        google_analytics_id: settings.google_analytics_id || '',
                        bookings_enabled: settings.bookings_enabled !== false, // Default to true if undefined
                        show_tax: settings.show_tax !== false // Default to true if undefined
                    });

                    setCollectionTimeSlots(settings.collection_time_slots || {});
                    setClosureDates(settings.closure_dates || []);
                    setTimeslotCapacities(settings.timeslot_capacities || {});

                    const pDays = settings.preorder_required_days;
                    setPreorderRequiredDays(Array.isArray(pDays) ? pDays : []);
                }
            }
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleWebsiteSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            website_settings: {
                ...prev.website_settings,
                [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
            }
        }));
    };

    const handleThemeSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            theme_settings: {
                ...prev.theme_settings,
                [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
            }
        }));
    };

    const updateWebsiteSettings = (updatedSettings: any) => {
        setFormData(prev => ({
            ...prev,
            website_settings: {
                ...prev.website_settings,
                ...updatedSettings
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;

        setLoading(true);
        setMessage(null);

        const dataToSave = {
            ...formData,
            collection_time_slots: collectionTimeSlots,
            closure_dates: closureDates,
            timeslot_capacities: timeslotCapacities,
            preorder_required_days: preorderRequiredDays
        };

        try {
            const { error } = await supabase
                .from('restaurant_settings')
                .update(dataToSave)
                .eq('id', selectedRestaurantId);

            if (error) throw error;

            await refreshSettings();
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'theme', label: 'Theme' },
        { id: 'media', label: 'Media & Socials' },
        { id: 'operations', label: 'Operations' },
        { id: 'orders', label: 'Orders' },
        { id: 'payments', label: 'Payments' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'receipts', label: 'Receipts' }
    ];

    if (!selectedRestaurantId) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                <p className="text-xl font-medium mb-2">No Restaurant Selected</p>
                <p>Please select a restaurant from the sidebar to manage settings.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
            {message && (
                <Toast message={message} onClose={() => setMessage(null)} />
            )}

            <form onSubmit={handleSubmit}>
                {/* Header with Save Button */}
                <div className="flex justify-between items-center mb-6 pt-6">
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-gray-900">Restaurant Settings</h2>
                        <p className="mt-1 text-sm text-gray-500">Manage your restaurant details, operations, and preferences.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand-dark-gray text-white px-3 py-1.5 md:px-6 md:py-2 text-sm md:text-base rounded-md font-medium hover:bg-gray-800 flex items-center disabled:opacity-50 shadow-sm transition-colors"
                    >
                        <Save className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
                        {loading ? 'Saving...' : (
                            <>
                                <span className="md:hidden">Save</span>
                                <span className="hidden md:inline">Save Settings</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Navigation Sidebar */}
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <nav className="space-y-1">
                            {/* Mobile: Horizontal Scroll */}
                            <div className="md:hidden overflow-x-auto flex pb-4 mb-4 border-b border-gray-200 gap-2 no-scrollbar">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-brand-gold text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Desktop: Vertical List */}
                            <div className="hidden md:block bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium border-l-4 transition-colors flex justify-between items-center ${activeTab === tab.id
                                            ? 'border-brand-gold bg-amber-50 text-amber-900'
                                            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                    >
                                        {tab.label}
                                        {activeTab === tab.id && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden min-h-[500px]">
                            {/* Content Header (Optional, makes it clear what section we are in) */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-medium leading-6 text-gray-900">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h3>
                            </div>

                            <div className="p-6">
                                {activeTab === 'general' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsBasicInfo formData={formData} handleChange={handleChange} />
                                        <SettingsLocation formData={formData} handleChange={handleChange} />
                                    </div>
                                )}

                                {activeTab === 'theme' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsTheme
                                            formData={formData}
                                            handleChange={handleChange}
                                            handleWebsiteSettingsChange={handleWebsiteSettingsChange}
                                            handleThemeSettingsChange={handleThemeSettingsChange}
                                            updateWebsiteSettings={updateWebsiteSettings}
                                        />
                                    </div>
                                )}

                                {activeTab === 'media' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsMedia
                                            formData={formData}
                                            handleChange={handleChange}
                                            handleWebsiteSettingsChange={handleWebsiteSettingsChange}
                                            setFormData={setFormData}
                                        />
                                    </div>
                                )}

                                {activeTab === 'operations' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsOperations formData={formData} handleChange={handleChange} />
                                        <SettingsOpeningHours formData={formData} setFormData={setFormData} />
                                        <SettingsClosureDates closureDates={closureDates} setClosureDates={setClosureDates} />
                                    </div>
                                )}

                                {activeTab === 'orders' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsDeliveryZones />
                                        <SettingsTimeslots
                                            timeSlots={collectionTimeSlots}
                                            setTimeSlots={setCollectionTimeSlots}
                                            capacities={timeslotCapacities}
                                            setCapacities={setTimeslotCapacities}
                                        />
                                    </div>
                                )}

                                {activeTab === 'payments' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsPayment />
                                    </div>
                                )}

                                {activeTab === 'bookings' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsBookingGeneral
                                            bookingsEnabled={formData.bookings_enabled}
                                            setBookingsEnabled={(enabled) => setFormData(prev => ({ ...prev, bookings_enabled: enabled }))}
                                        />
                                        <SettingsTableManagement />
                                        <SettingsBookingPreorder preorderRequiredDays={preorderRequiredDays} setPreorderRequiredDays={setPreorderRequiredDays} />
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsSMS formData={formData} setFormData={setFormData} />
                                    </div>
                                )}

                                {activeTab === 'integrations' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsIntegrations formData={formData} handleChange={handleChange} />
                                    </div>
                                )}

                                {activeTab === 'receipts' && (
                                    <div className="space-y-8 animate-fadeIn">
                                        <SettingsReceipts />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
