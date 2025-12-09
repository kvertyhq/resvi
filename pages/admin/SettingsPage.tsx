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
        max_delivery_order_value: 1000
    });

    // New states for advanced settings
    const [collectionTimeSlots, setCollectionTimeSlots] = useState<Record<string, string[]>>({});
    const [closureDates, setClosureDates] = useState<string[]>([]);
    const [timeslotCapacities, setTimeslotCapacities] = useState<Record<string, { max_orders?: number; max_delivery?: number; max_collection?: number }>>({});
    const [preorderRequiredDays, setPreorderRequiredDays] = useState<string[]>([]);

    useEffect(() => {
        const envRestaurantId = import.meta.env.VITE_RESTAURANT_ID;
        if (envRestaurantId) {
            fetchSettings(envRestaurantId);
        }
    }, []);

    const fetchSettings = async (id: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_restaurant_settings', { p_id: import.meta.env.VITE_RESTAURANT_ID });

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
                        max_delivery_order_value: settings.max_delivery_order_value || 1000
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
        const targetId = import.meta.env.VITE_RESTAURANT_ID;
        if (!targetId) return;

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
                .eq('id', targetId);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Restaurant Settings</h2>

            {message && (
                <Toast message={message} onClose={() => setMessage(null)} />
            )}

            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 space-y-8">
                    <SettingsBasicInfo formData={formData} handleChange={handleChange} />
                    <SettingsLocation formData={formData} handleChange={handleChange} />
                    <SettingsOperations formData={formData} handleChange={handleChange} />
                    <SettingsPayment />
                    <SettingsDeliveryZones />
                    <SettingsTimeslots
                        timeSlots={collectionTimeSlots}
                        setTimeSlots={setCollectionTimeSlots}
                        capacities={timeslotCapacities}
                        setCapacities={setTimeslotCapacities}
                    />
                    <SettingsBookingPreorder preorderRequiredDays={preorderRequiredDays} setPreorderRequiredDays={setPreorderRequiredDays} />
                    <SettingsClosureDates closureDates={closureDates} setClosureDates={setClosureDates} />
                    <SettingsOpeningHours formData={formData} setFormData={setFormData} />
                    <SettingsMedia formData={formData} handleChange={handleChange} />
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-brand-dark-gray text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 flex items-center disabled:opacity-50">
                        <Save className="h-5 w-5 mr-2" />
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
