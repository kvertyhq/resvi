import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { supabase } from '../../supabaseClient';
import { Clock, ArrowLeft } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';

const DeliveryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.05-2.05a1 1 0 011.414 0L10 16m-2 1h12V6h-2" />
    </svg>
);

const CollectionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
);

const POSPhoneOrderSetupPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { settings } = useSettings();

    // Retrieve incoming params
    const incomingState = location.state || {};
    const { customer, isPhoneOrder } = incomingState;

    const [orderType, setOrderType] = useState<'delivery' | 'collection' | null>(null);
    const [localDate, setLocalDate] = useState('');
    const [localTime, setLocalTime] = useState('');

    // Delivery fields
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [postcode, setPostcode] = useState(customer?.postcode || '');
    const [address, setAddress] = useState(customer?.address || '');

    const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
    const [capacityError, setCapacityError] = useState<string | null>(null);

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedToday = `${yyyy}-${mm}-${dd}`;

        setLocalDate(formattedToday);
        setDeliveryDate(formattedToday);
    }, []);

    useEffect(() => {
        setCapacityError(null);
    }, [orderType]);

    // Validation
    const isDeliveryReady = orderType === 'delivery' && deliveryDate && deliveryTime && postcode && address;
    const isCollectionReady = orderType === 'collection' && localDate && localTime;
    const canContinue = isDeliveryReady || isCollectionReady;

    const handleContinue = async () => {
        setIsCheckingCapacity(true);
        setCapacityError(null);

        if (!orderType) {
            setCapacityError("Please select a method.");
            setIsCheckingCapacity(false);
            return;
        }

        const date = orderType === 'delivery' ? deliveryDate : localDate;
        const time = orderType === 'delivery' ? deliveryTime : localTime;

        try {
            // Check capacity in the same way `OrderPage.tsx` does
            const { data, error } = await supabase.rpc('check_timeslot_capacity', {
                p_restaurant_id: settings?.id,
                p_date: date,
                p_time: time,
                p_order_type: orderType
            });

            if (error) throw error;

            if (data && (data.message === 'slot available' || data.unlimited === true)) {
                // Forward the settings to POSOrderPage
                const timeslot = { date, time };

                // Merge new address inputs into customer
                const updatedCustomer = {
                    ...customer,
                    postcode: orderType === 'delivery' ? postcode : customer?.postcode,
                    address: orderType === 'delivery' ? address : customer?.address,
                };

                navigate('/pos/order/walk-in', {
                    state: {
                        customer: updatedCustomer,
                        isPhoneOrder: true,
                        orderType: orderType, // 'delivery' or 'collection'
                        timeslot: timeslot
                    }
                });
            } else {
                setCapacityError("Selected time slot is not available. Please choose another time.");
            }
        } catch (error) {
            console.error("Error checking capacity:", error);
            setCapacityError("An error occurred. Please try again.");
        } finally {
            setIsCheckingCapacity(false);
        }
    };

    const baseButtonClasses = "w-full text-center p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 shadow-sm";
    const inactiveButtonClasses = "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-[var(--theme-color)]/40 text-gray-700 dark:text-gray-300";
    const activeButtonClasses = "border-[var(--theme-color)] bg-[var(--theme-color)] shadow-lg text-white scale-[1.02]";


    const getFilteredSlots = (dateString: string) => {
        if (!dateString || !settings?.collection_time_slots) return [];
        const date = new Date(dateString);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        return settings.collection_time_slots[dayName] || [];
    };

    const availableSlots = orderType === 'delivery' ? getFilteredSlots(deliveryDate) : getFilteredSlots(localDate);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => navigate(-1)}
            />

            {/* Modal Panel */}
            <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col animate-fade-in">
                {/* Header */}
                <div className="bg-[var(--theme-color)] p-5 text-white flex items-center gap-4 flex-shrink-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Phone Order Setup</h1>
                        <p className="text-white/80 text-sm mt-0.5">
                            {customer?.name || customer?.full_name || 'Guest'}
                            {customer?.phone ? ` · ${customer.phone}` : ''}
                        </p>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto flex-1 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Select Order Type</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => settings?.delivery_available !== false && setOrderType('delivery')}
                            disabled={settings?.delivery_available === false}
                            className={`${baseButtonClasses} ${settings?.delivery_available === false ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : orderType === 'delivery' ? activeButtonClasses : inactiveButtonClasses}`}
                        >
                            <DeliveryIcon />
                            <span className="font-bold">{settings?.delivery_available === false ? 'Delivery Unavailable' : 'Delivery'}</span>
                        </button>
                        <button
                            onClick={() => settings?.collection_available !== false && setOrderType('collection')}
                            disabled={settings?.collection_available === false}
                            className={`${baseButtonClasses} ${settings?.collection_available === false ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' : orderType === 'collection' ? activeButtonClasses : inactiveButtonClasses}`}
                        >
                            <CollectionIcon />
                            <span className="font-bold">{settings?.collection_available === false ? 'Collection Unavailable' : 'Collection'}</span>
                        </button>
                    </div>

                    {/* Order Details Form */}
                    <div className="space-y-5">
                        {capacityError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                                {capacityError}
                            </div>
                        )}

                        {orderType === 'delivery' && (
                            <div className="animate-fade-in space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700 text-sm">Delivery Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Postcode <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={postcode}
                                            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                                            placeholder="e.g. NW10 1AA"
                                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[var(--theme-color)] outline-none text-sm"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Full Address <span className="text-red-500">*</span></label>
                                        <textarea
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Enter delivery address"
                                            rows={2}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[var(--theme-color)] outline-none resize-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Delivery Date</label>
                                        <DatePicker
                                            value={deliveryDate}
                                            onChange={setDeliveryDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            placeholder="Select delivery date"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Time Slot</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <select value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[var(--theme-color)] outline-none appearance-none text-sm">
                                                <option value="" disabled>Select a time</option>
                                                {availableSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {orderType === 'collection' && (
                            <div className="animate-fade-in space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-gray-700 text-sm">Collection Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Collection Date</label>
                                        <DatePicker
                                            value={localDate}
                                            onChange={setLocalDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            placeholder="Select collection date"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Time Slot</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <select value={localTime} onChange={e => setLocalTime(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[var(--theme-color)] outline-none appearance-none text-sm">
                                                <option value="" disabled>Select a time</option>
                                                {availableSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={!canContinue || isCheckingCapacity}
                        className="w-full mt-6 bg-[var(--theme-color)] text-white py-3.5 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
                    >
                        {isCheckingCapacity ? 'Validating...' : 'Continue to Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POSPhoneOrderSetupPage;
