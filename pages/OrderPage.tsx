import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../supabaseClient';

const DeliveryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2.05-2.05a1 1 0 011.414 0L10 16m-2 1h12V6h-2" />
    </svg>
);

const CollectionIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
);

const CalendarIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>);
const ClockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>);


const OrderPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { orderType, setOrderType, postcode, deliveryAvailable, deliveryDistance, deliveryError, checkPostcode, setCollectionSlot, setDeliverySlot, deliveryFee } = useOrder();

    const [localPostcode, setLocalPostcode] = useState(postcode);
    const [isCheckingPostcode, setIsCheckingPostcode] = useState(false);
    const [localDate, setLocalDate] = useState('');
    const [localTime, setLocalTime] = useState('');

    // Delivery slot state
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');

    const isDeliveryReady = orderType === 'delivery' && deliveryAvailable === true && deliveryDate && deliveryTime;
    const isCollectionReady = orderType === 'collection' && localDate && localTime;
    const canContinue = isDeliveryReady || isCollectionReady;

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedToday = `${yyyy}-${mm}-${dd}`;

        setLocalDate(formattedToday);
        setDeliveryDate(formattedToday);
    }, []);

    const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
    const [capacityError, setCapacityError] = useState<string | null>(null);

    useEffect(() => {
        setCapacityError(null);
    }, [orderType]);

    const handleContinue = async () => {
        setIsCheckingCapacity(true);
        setCapacityError(null); // Reset error

        // Validation Logic
        if (!orderType) {
            setCapacityError("Please select a delivery method.");
            setIsCheckingCapacity(false);
            return;
        }

        if (orderType === 'delivery') {
            if (!localPostcode) {
                setCapacityError("Please enter a postcode.");
                setIsCheckingCapacity(false);
                return;
            }
            if (deliveryAvailable !== true) {
                setCapacityError("Please check your postcode to ensure we deliver to your area.");
                setIsCheckingCapacity(false);
                return;
            }
            if (!deliveryDate) {
                setCapacityError("Please select a delivery date.");
                setIsCheckingCapacity(false);
                return;
            }
            if (!deliveryTime) {
                setCapacityError("Please select a time slot.");
                setIsCheckingCapacity(false);
                return;
            }
        }

        if (orderType === 'collection') {
            if (!localDate) {
                setCapacityError("Please select a collection date.");
                setIsCheckingCapacity(false);
                return;
            }
            if (!localTime) {
                setCapacityError("Please select a time slot.");
                setIsCheckingCapacity(false);
                return;
            }
        }

        const date = orderType === 'delivery' ? deliveryDate : localDate;
        const time = orderType === 'delivery' ? deliveryTime : localTime;

        try {
            const { data, error } = await supabase.rpc('check_timeslot_capacity', {
                p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
                p_date: date,
                p_time: time,
                p_order_type: orderType
            });

            if (error) throw error;

            if (data && (data.message === 'slot available' || data.unlimited === true)) {
                if (orderType === 'delivery') {
                    setDeliverySlot(deliveryDate, deliveryTime);
                } else if (orderType === 'collection') {
                    setCollectionSlot(localDate, localTime);
                }
                navigate('/menu');
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

    const handlePostcodeCheck = async () => {
        setIsCheckingPostcode(true);
        await checkPostcode(localPostcode);
        setIsCheckingPostcode(false);
    }

    const baseButtonClasses = "w-full text-center p-6 border rounded-lg cursor-pointer transition-all duration-300";
    const inactiveButtonClasses = "border-gray-200 bg-white hover:bg-gray-50 hover:border-brand-gold/50";
    const activeButtonClasses = "border-brand-gold bg-brand-gold/5 shadow-md";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-160px)] font-sans">
            {/* Left Panel */}
            <div className="bg-brand-dark-gray text-white flex items-center justify-center p-8 relative overflow-hidden min-h-[40vh] lg:min-h-full bg-cover bg-center" style={{ backgroundImage: "url('https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/674.jpg')" }}>
                <div className="absolute inset-0 bg-black opacity-60"></div>
                <div className="relative z-10 text-center">
                    <h1 className="text-5xl md:text-6xl font-serif tracking-wider">Let's get your order started</h1>
                    <p className="mt-4 text-lg text-gray-400 max-w-md mx-auto">
                        Choose Delivery or Collection to see availability, fees and times.
                    </p>
                </div>
            </div>

            {/* Right Panel */}
            <div className="bg-gray-50 flex items-center justify-center p-4 sm:p-8">
                <div className="max-w-md w-full bg-white p-8 shadow-xl rounded-lg border border-gray-200">
                    <h2 className="text-3xl font-bold text-brand-dark-gray mb-2 font-serif">How would you like to get your food?</h2>
                    <p className="text-brand-mid-gray mb-8">Pick a method to continue.</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => settings?.delivery_available !== false && setOrderType('delivery')}
                            disabled={settings?.delivery_available === false}
                            className={`${baseButtonClasses} ${settings?.delivery_available === false
                                ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                                : orderType === 'delivery' ? activeButtonClasses : inactiveButtonClasses
                                }`}
                            aria-pressed={orderType === 'delivery'}
                        >
                            <DeliveryIcon />
                            <span className="font-semibold text-brand-dark-gray">
                                {settings?.delivery_available === false ? 'Delivery Unavailable' : 'Delivery'}
                            </span>
                        </button>
                        <button
                            onClick={() => settings?.collection_available !== false && setOrderType('collection')}
                            disabled={settings?.collection_available === false}
                            className={`${baseButtonClasses} ${settings?.collection_available === false
                                ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                                : orderType === 'collection' ? activeButtonClasses : inactiveButtonClasses
                                }`}
                            aria-pressed={orderType === 'collection'}
                        >
                            <CollectionIcon />
                            <span className="font-semibold text-brand-dark-gray">
                                {settings?.collection_available === false ? 'Collection Unavailable' : 'Collection'}
                            </span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {(() => {
                            // Helper to filter slots based on timezone
                            const getFilteredSlots = (dateString: string) => {
                                if (!dateString || !settings?.collection_time_slots) return [];

                                const date = new Date(dateString);
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                                const rawSlots = settings.collection_time_slots[dayName] || [];

                                try {
                                    // 1. Get restaurant timezone
                                    const tz = settings.timezone || 'UTC';

                                    // 2. Get "Restaurant Today" (YYYY-MM-DD)
                                    const now = new Date();
                                    const restaurantDateStr = new Intl.DateTimeFormat('en-CA', {
                                        timeZone: tz,
                                        year: 'numeric', month: '2-digit', day: '2-digit'
                                    }).format(now);

                                    // 3. Compare selected date with "Restaurant Today"
                                    if (dateString === restaurantDateStr) {
                                        // It is today. We need to filter past times.

                                        // 4. Get "Restaurant Now" Time (HH:MM)
                                        const timeStr = new Intl.DateTimeFormat('en-GB', {
                                            timeZone: tz,
                                            hour: '2-digit', minute: '2-digit', hour12: false
                                        }).format(now);

                                        const [h, m] = timeStr.split(':').map(Number);
                                        const currentMinutes = h * 60 + m;

                                        return rawSlots.filter(t => {
                                            // Handle various time formats if necessary (e.g. "12.00", "12:00")
                                            // Assuming format similar to booking "12.00" or "12:00"
                                            let slotH, slotM;
                                            if (t.includes(':')) {
                                                [slotH, slotM] = t.split(':').map(Number);
                                            } else {
                                                [slotH, slotM] = t.split('.').map(Number);
                                            }

                                            const slotMinutes = slotH * 60 + slotM;
                                            return slotMinutes > currentMinutes;
                                        });
                                    }
                                } catch (e) {
                                    console.error("Error filtering order slots:", e);
                                    return rawSlots;
                                }

                                return rawSlots;
                            };

                            const availableSlots = orderType === 'delivery'
                                ? getFilteredSlots(deliveryDate)
                                : getFilteredSlots(localDate);

                            return (
                                <>
                                    {orderType === 'delivery' && (
                                        <div className="animate-fade-in space-y-4">
                                            <p className="text-sm text-gray-600">Enter postcode to check availability</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={localPostcode}
                                                    onChange={(e) => setLocalPostcode(e.target.value.toUpperCase())}
                                                    placeholder="e.g. NW10 1AA"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
                                                />
                                                <button
                                                    onClick={handlePostcodeCheck}
                                                    disabled={isCheckingPostcode || !localPostcode}
                                                    className="px-6 py-3 bg-brand-dark-gray text-white rounded-md font-semibold disabled:bg-gray-400 hover:bg-brand-mid-gray transition-colors"
                                                >
                                                    {isCheckingPostcode ? '...' : 'Check'}
                                                </button>
                                            </div>
                                            {deliveryAvailable === true && (
                                                <>
                                                    <p className="text-green-600 bg-green-50 p-3 rounded-md text-sm">
                                                        {deliveryDistance ? (
                                                            `Great! We deliver to your area (${(deliveryDistance * 0.621371).toFixed(1)} miles away).`
                                                        ) : (
                                                            "Great! We deliver to your area."
                                                        )}
                                                        <span className="block mt-1 font-medium">
                                                            Delivery Fee: {deliveryFee === 0 ? 'Free' : `£${deliveryFee.toFixed(2)}`}
                                                        </span>
                                                    </p>
                                                    {capacityError && (
                                                        <p className="text-red-600 bg-red-50 p-3 rounded-md text-sm">{capacityError}</p>
                                                    )}
                                                    {/* Delivery Slot Selection */}
                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                                            <div className="relative">
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><CalendarIcon /></span>
                                                                <input
                                                                    type="date"
                                                                    value={deliveryDate}
                                                                    onChange={e => {
                                                                        const selectedDate = e.target.value;
                                                                        if (settings?.closure_dates?.includes(selectedDate)) {
                                                                            alert("We are closed on this date. Please select another date.");
                                                                            setDeliveryDate('');
                                                                        } else {
                                                                            setDeliveryDate(selectedDate);
                                                                        }
                                                                    }}
                                                                    min={new Date().toISOString().split('T')[0]}
                                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                                                            <div className="relative">
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><ClockIcon /></span>
                                                                <select value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold appearance-none bg-white">
                                                                    <option value="" disabled>Select a time</option>
                                                                    {availableSlots.map((slot) => (
                                                                        <option key={slot} value={slot}>{slot}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                            {deliveryAvailable === false && deliveryError && (
                                                <p className="text-red-600 bg-red-50 p-3 rounded-md text-sm">
                                                    {deliveryError}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {orderType === 'collection' && (
                                        <div className="animate-fade-in space-y-4">
                                            {capacityError && (
                                                <p className="text-red-600 bg-red-50 p-3 rounded-md text-sm">{capacityError}</p>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><CalendarIcon /></span>
                                                        <input
                                                            type="date"
                                                            value={localDate}
                                                            onChange={e => {
                                                                const selectedDate = e.target.value;
                                                                if (settings?.closure_dates?.includes(selectedDate)) {
                                                                    alert("We are closed on this date. Please select another date.");
                                                                    setLocalDate('');
                                                                } else {
                                                                    setLocalDate(selectedDate);
                                                                }
                                                            }}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">Choose a collection date</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3"><ClockIcon /></span>
                                                        <select value={localTime} onChange={e => setLocalTime(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold appearance-none bg-white">
                                                            <option value="" disabled>Select a time</option>
                                                            {availableSlots.map((slot) => (
                                                                <option key={slot} value={slot}>{slot}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {localDate && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {availableSlots.length === 0 ? "No slots available for this day" : ""}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={isCheckingCapacity}
                        className="w-full mt-6 bg-brand-gold text-white py-4 rounded-lg font-bold uppercase tracking-wider transition-opacity duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    >
                        {isCheckingCapacity ? 'Checking Availability...' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderPage;
