import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Save } from 'lucide-react';

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
        opening_hours: {} as Record<string, string[]>, // JSONB
        collection_time_slots: {} as Record<string, string[]> // JSONB
    });

    const [collectionRanges, setCollectionRanges] = useState<Record<string, { start: string, end: string }[]>>({});

    useEffect(() => {
        // Use env var for now as requested
        const envRestaurantId = import.meta.env.VITE_RESTAURANT_ID;
        if (envRestaurantId) {
            fetchSettings(envRestaurantId);
        }
    }, []);

    const parseSlotsToRanges = (slots: Record<string, string[]>) => {
        const ranges: Record<string, { start: string, end: string }[]> = {};
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        days.forEach(day => {
            const daySlots = slots[day]?.sort() || [];
            if (daySlots.length === 0) return;

            const dayRanges: { start: string, end: string }[] = [];
            let start = daySlots[0];
            let prev = daySlots[0];

            for (let i = 1; i < daySlots.length; i++) {
                const current = daySlots[i];
                const prevDate = new Date(`2000-01-01T${prev}`);
                const currentDate = new Date(`2000-01-01T${current}`);
                const diff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60);

                if (diff > 30) {
                    // End of a contiguous block
                    // For the range end, we add 30 mins to the last slot to represent the closing time
                    const endDate = new Date(prevDate.getTime() + 30 * 60000);
                    const endString = endDate.toTimeString().slice(0, 5);
                    dayRanges.push({ start, end: endString });
                    start = current;
                }
                prev = current;
            }
            // Push the last range
            const lastDate = new Date(`2000-01-01T${prev}`);
            const lastEndDate = new Date(lastDate.getTime() + 30 * 60000);
            const lastEndString = lastEndDate.toTimeString().slice(0, 5);
            dayRanges.push({ start, end: lastEndString });

            ranges[day] = dayRanges;
        });
        return ranges;
    };

    const generateSlots = (ranges: Record<string, { start: string, end: string }[]>) => {
        const slots: Record<string, string[]> = {};
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        days.forEach(day => {
            const dayRanges = ranges[day];
            if (!dayRanges || dayRanges.length === 0) return;

            const daySlots: string[] = [];
            dayRanges.forEach(range => {
                if (!range.start || !range.end) return;

                let current = new Date(`2000-01-01T${range.start}`);
                const end = new Date(`2000-01-01T${range.end}`);

                while (current < end) {
                    daySlots.push(current.toTimeString().slice(0, 5));
                    current = new Date(current.getTime() + 30 * 60000);
                }
            });
            slots[day] = [...new Set(daySlots)].sort();
        });
        return slots;
    };

    const fetchSettings = async (id: string) => {
        setLoading(true);
        try {
            // Use env var for p_id
            const { data, error } = await supabase.rpc('get_restaurant_settings', { p_id: import.meta.env.VITE_RESTAURANT_ID });

            if (error) throw error;

            if (data) {
                // The API returns { data: { ... }, success: true }
                // So we need to access data.data if it exists, or fallback to data if it's direct
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
                        collection_time_slots: settings.collection_time_slots || {}
                    });

                    if (settings.collection_time_slots) {
                        setCollectionRanges(parseSlotsToRanges(settings.collection_time_slots));
                    }
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

    const handleRangeChange = (day: string, index: number, field: 'start' | 'end', value: string) => {
        setCollectionRanges(prev => {
            const newRanges = { ...prev };
            // Create a shallow copy of the array for the specific day to avoid mutation
            const dayRanges = [...(newRanges[day] || [])];

            // Ensure object exists at index
            if (!dayRanges[index]) dayRanges[index] = { start: '', end: '' };

            dayRanges[index] = { ...dayRanges[index], [field]: value };
            newRanges[day] = dayRanges;
            return newRanges;
        });
    };

    const addRange = (day: string) => {
        setCollectionRanges(prev => {
            const newRanges = { ...prev };
            // Create a shallow copy of the array for the specific day to avoid mutation
            const dayRanges = [...(newRanges[day] || [])];
            dayRanges.push({ start: '', end: '' });
            newRanges[day] = dayRanges;
            return newRanges;
        });
    };

    const removeRange = (day: string, index: number) => {
        setCollectionRanges(prev => {
            const newRanges = { ...prev };
            if (newRanges[day]) {
                newRanges[day] = newRanges[day].filter((_, i) => i !== index);
            }
            return newRanges;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Use env var for update
        const targetId = import.meta.env.VITE_RESTAURANT_ID;
        if (!targetId) return;

        setLoading(true);
        setMessage(null);

        // Generate slots from ranges
        const generatedSlots = generateSlots(collectionRanges);
        const dataToSave = { ...formData, collection_time_slots: generatedSlots };

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

    // if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Restaurant Settings</h2>

            {message && (
                <div className={`p-4 rounded-md mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 space-y-8">

                    {/* Basic Info */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                                <input type="url" name="website_url" value={formData.website_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Location</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                <input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                <input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                                <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Google Map URL</label>
                                <input type="url" name="google_map_url" value={formData.google_map_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                        </div>
                    </div>

                    {/* Operations */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Operations & Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold">
                                    <option value="£">£ (GBP)</option>
                                    <option value="$">$ (USD)</option>
                                    <option value="€">€ (EUR)</option>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Theme Color</label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" name="theme_color" value={formData.theme_color} onChange={handleChange} className="h-10 w-10 border border-gray-300 rounded p-1" />
                                    <input type="text" name="theme_color" value={formData.theme_color} onChange={handleChange} className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                </div>
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
                        </div>
                    </div>

                    {/* Collection Time Slots */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Collection Time Slots</h3>
                        <p className="text-sm text-gray-500 mb-4">Define the available time ranges for collection. These will be converted into 30-minute slots.</p>
                        <div className="space-y-4">
                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                                <div key={day} className="border-b border-gray-100 pb-4 last:border-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="w-24 text-sm font-bold text-gray-700 capitalize">{day}</label>
                                        <button type="button" onClick={() => addRange(day)} className="text-xs text-brand-gold hover:text-brand-dark-gray font-medium">
                                            + Add Range
                                        </button>
                                    </div>
                                    {collectionRanges[day]?.map((range, index) => (
                                        <div key={index} className="flex items-center space-x-2 mb-2">
                                            <input
                                                type="time"
                                                value={range.start}
                                                onChange={(e) => handleRangeChange(day, index, 'start', e.target.value)}
                                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="time"
                                                value={range.end}
                                                onChange={(e) => handleRangeChange(day, index, 'end', e.target.value)}
                                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                            <button type="button" onClick={() => removeRange(day, index)} className="text-red-500 hover:text-red-700">
                                                <span className="sr-only">Remove</span>
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    {(!collectionRanges[day] || collectionRanges[day].length === 0) && (
                                        <p className="text-xs text-gray-400 italic">No slots defined</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Social Media */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Social Media</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                                <input type="url" name="facebook_url" value={formData.facebook_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                                <input type="url" name="instagram_url" value={formData.instagram_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter URL</label>
                                <input type="url" name="twitter_url" value={formData.twitter_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">TikTok URL</label>
                                <input type="url" name="tiktok_url" value={formData.tiktok_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                                <input type="url" name="youtube_url" value={formData.youtube_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                        </div>
                    </div>

                    {/* Media */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Media</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                {/* Opening Hours */}
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Opening Hours</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                                            <div key={day} className="flex items-center">
                                                <label className="w-24 text-sm font-medium text-gray-700 capitalize">{day}</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 09:00-22:00"
                                                    value={formData.opening_hours?.[day]?.[0] || ''}
                                                    onChange={(e) => {
                                                        const newHours = { ...formData.opening_hours };
                                                        if (e.target.value) {
                                                            newHours[day] = [e.target.value];
                                                        } else {
                                                            delete newHours[day];
                                                        }
                                                        setFormData(prev => ({ ...prev, opening_hours: newHours }));
                                                    }}
                                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                                <input type="text" name="cover_image_url" value={formData.cover_image_url} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                            </div>
                        </div>
                    </div>

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
