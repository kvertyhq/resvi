import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrder } from '../context/OrderContext';

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
    const { orderType, setOrderType, postcode, deliveryAvailable, deliveryDistance, deliveryError, checkPostcode, setCollectionSlot } = useOrder();

    const [localPostcode, setLocalPostcode] = useState(postcode);
    const [isCheckingPostcode, setIsCheckingPostcode] = useState(false);
    const [localDate, setLocalDate] = useState('');
    const [localTime, setLocalTime] = useState('');

    const isDeliveryReady = orderType === 'delivery' && deliveryAvailable === true;
    const isCollectionReady = orderType === 'collection' && localDate && localTime;
    const canContinue = isDeliveryReady || isCollectionReady;

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setLocalDate(`${yyyy}-${mm}-${dd}`);
    }, []);

    const handleContinue = () => {
        if (isDeliveryReady) {
            // Postcode is already in context from checkPostcode
        } else if (isCollectionReady) {
            setCollectionSlot(localDate, localTime);
        }
        navigate('/menu');
    };

    const handlePostcodeCheck = async () => {
        setIsCheckingPostcode(true);
        await checkPostcode(localPostcode);
        setIsCheckingPostcode(false);
    }

    const baseButtonClasses = "w-full text-center p-6 border rounded-lg cursor-pointer transition-all duration-300";
    const inactiveButtonClasses = "border-gray-200 bg-white hover:bg-gray-50 hover:border-brand-gold/50";
    const activeButtonClasses = "border-brand-gold bg-brand-gold/5 shadow-md";

    const timeSlots = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-160px)] font-sans">
            {/* Left Panel */}
            <div className="bg-brand-dark-gray text-white flex items-center justify-center p-8 relative overflow-hidden min-h-[40vh] lg:min-h-full bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/1200/800?grayscale&blur=1')" }}>
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
                            onClick={() => setOrderType('delivery')}
                            className={`${baseButtonClasses} ${orderType === 'delivery' ? activeButtonClasses : inactiveButtonClasses}`}
                            aria-pressed={orderType === 'delivery'}
                        >
                            <DeliveryIcon />
                            <span className="font-semibold text-brand-dark-gray">Delivery</span>
                        </button>
                        <button
                            onClick={() => setOrderType('collection')}
                            className={`${baseButtonClasses} ${orderType === 'collection' ? activeButtonClasses : inactiveButtonClasses}`}
                            aria-pressed={orderType === 'collection'}
                        >
                            <CollectionIcon />
                            <span className="font-semibold text-brand-dark-gray">Collection</span>
                        </button>
                    </div>

                    <div className="min-h-[160px] space-y-4">
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
                                {deliveryAvailable === true && deliveryDistance && (
                                    <p className="text-green-600 bg-green-50 p-3 rounded-md text-sm">
                                        Great! We deliver to your area ({(deliveryDistance * 0.621371).toFixed(1)} miles away).
                                    </p>
                                )}
                                {deliveryAvailable === false && deliveryError && (
                                    <p className="text-red-600 bg-red-50 p-3 rounded-md text-sm">
                                        {deliveryError}
                                        {deliveryDistance && deliveryDistance > 8.04672 && (
                                            <span className="block mt-1">Your location is {(deliveryDistance * 0.621371).toFixed(1)} miles away. We only deliver within 5 miles.</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                        {orderType === 'collection' && (
                            <div className="animate-fade-in space-y-4">
                                <p className="text-green-600 bg-green-50 p-3 rounded-md text-sm">Collection available today</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><CalendarIcon /></span>
                                            <input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Choose a collection date</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3"><ClockIcon /></span>
                                            <select value={localTime} onChange={e => setLocalTime(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold appearance-none bg-white">
                                                <option value="" disabled>Select a time</option>
                                                {timeSlots.map(time => <option key={time} value={time}>{time}</option>)}
                                            </select>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">We'll have it ready for the start of the slot</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={!canContinue}
                        className="w-full mt-6 bg-brand-gold text-white py-4 rounded-lg font-bold uppercase tracking-wider transition-opacity duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderPage;
