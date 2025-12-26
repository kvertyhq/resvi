import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Save } from 'lucide-react';
import SettingsBasicInfo from '../../components/admin/settings/SettingsBasicInfo';
import SettingsLocation from '../../components/admin/settings/SettingsLocation';
import SettingsOperations from '../../components/admin/settings/SettingsOperations';
import SettingsMedia from '../../components/admin/settings/SettingsMedia';
import SettingsOpeningHours from '../../components/admin/settings/SettingsOpeningHours';
import SettingsClosureDates from '../../components/admin/settings/SettingsClosureDates';
import SettingsTimeslots from '../../components/admin/settings/SettingsTimeslots';
import SettingsBookingPreorder from '../../components/admin/settings/SettingsBookingPreorder';
import SettingsDeliveryZones from '../../components/admin/settings/SettingsDeliveryZones';
import SettingsPayment from '../../components/admin/settings/SettingsPayment';
import SettingsTableManagement from '../../components/admin/settings/SettingsTableManagement';
import { Users } from 'lucide-react';
import UserManagementModal from '../../components/admin/UserManagementModal';

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
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);

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
        cover_image_url: '',
        theme_color: '#000000',
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
        timezone: 'UTC'
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
                        cover_image_url: settings.cover_image_url || '',
                        theme_color: settings.theme_color || '#000000',
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
                        timezone: settings.timezone || 'UTC'
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
        { id: 'media', label: 'Media & Socials' },
        { id: 'operations', label: 'Operations' },
        { id: 'orders', label: 'Orders' },
        { id: 'payments', label: 'Payments' },
        { id: 'bookings', label: 'Bookings' },
        { id: 'team', label: 'Team' }
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
        <div className="max-w-6xl mx-auto pb-10">
            {message && (
                <Toast message={message} onClose={() => setMessage(null)} />
            )}

            <form onSubmit={handleSubmit}>
                {/* Header with Save Button */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Restaurant Settings</h2>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand-dark-gray text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 flex items-center disabled:opacity-50 shadow-sm"
                    >
                        <Save className="h-5 w-5 mr-2" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-200">
                    <div className="flex flex-wrap border-b border-gray-200">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-colors ${activeTab === tab.id
                                    ? 'text-brand-gold border-b-2 border-brand-gold bg-gray-50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white shadow rounded-lg overflow-hidden p-6 space-y-8 min-h-[500px]">
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SettingsBasicInfo formData={formData} handleChange={handleChange} />
                            <SettingsLocation formData={formData} handleChange={handleChange} />
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-8 animate-fadeIn">
                            <SettingsMedia formData={formData} handleChange={handleChange} setFormData={setFormData} />
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
                            <SettingsTableManagement />
                            <SettingsBookingPreorder preorderRequiredDays={preorderRequiredDays} setPreorderRequiredDays={setPreorderRequiredDays} />
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-8 animate-fadeIn flex flex-col items-center justify-center py-12">
                            <div className="p-4 bg-gray-100 rounded-full mb-4">
                                <Users className="h-12 w-12 text-gray-500" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-900">Manage Team Members</h3>
                            <p className="text-gray-500 mb-8 max-w-sm text-center">
                                Invite new administrators or staff members to help manage your restaurant.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsUserModalOpen(true)}
                                className="bg-brand-gold text-white px-6 py-3 rounded-md font-medium hover:bg-opacity-90 transition-colors shadow-sm flex items-center"
                            >
                                <Users className="h-5 w-5 mr-2" />
                                Manage Team
                            </button>
                        </div>
                    )}
                </div>
            </form>

            <UserManagementModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                restaurantId={selectedRestaurantId}
                restaurantName={formData.name || 'Restaurant'}
            />
        </div>
    );
};

export default SettingsPage;
