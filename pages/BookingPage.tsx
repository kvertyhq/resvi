import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { validateUKPhone } from '../utils/validation';
import { useSettings } from '../context/SettingsContext';
import BookingMenuStep from './BookingMenuStep';
import { MenuItemData } from '../context/OrderContext';

// Helper to format items as markdown
const formatItemsToMarkdown = (items: { item: MenuItemData; quantity: number }[], currency: string = '£') => {
    if (!items || items.length === 0) return '';

    let markdown = "### Pre-ordered Items\n\n";
    let total = 0;

    items.forEach(({ item, quantity }) => {
        const itemTotal = item.price * quantity;
        total += itemTotal;
        markdown += `- **${quantity}x ${item.name}** (${currency}${item.price.toFixed(2)}) = ${currency}${itemTotal.toFixed(2)}\n`;
    });

    markdown += `\n**Total Value: ${currency}${total.toFixed(2)}**`;
    return markdown;
};

// Icons for calendar navigation
const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

// Decorative element for banner
const DecorativeElement = () => (
    <div className="flex items-center justify-center space-x-2 my-4">
        <span className="block h-px w-8 bg-brand-gold/50"></span>
        <span className="block h-1.5 w-1.5 border border-brand-gold/50"></span>
        <span className="block h-px w-8 bg-brand-gold/50"></span>
    </div>
);

// Step 1: Date Selection
const DateStep = ({ onDateSelect, selectedDate, onNext, closureDates, stepNumber, totalSteps }) => {
    const [displayDate, setDisplayDate] = useState(selectedDate || new Date());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const calendarDays = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`}></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDate = new Date(year, month, i);
            dayDate.setHours(0, 0, 0, 0);

            // Adjust for timezone offset to match the format in closureDates (YYYY-MM-DD)
            const offset = dayDate.getTimezoneOffset();
            const adjustedDate = new Date(dayDate.getTime() - (offset * 60 * 1000));
            const dateString = adjustedDate.toISOString().split('T')[0];

            const isClosed = closureDates.includes(dateString);
            const isSelected = selectedDate && dayDate.getTime() === selectedDate.getTime();
            const isPast = dayDate < today;
            const isDisabled = isPast || isClosed;

            days.push(
                <button
                    key={i}
                    disabled={isDisabled}
                    onClick={() => onDateSelect(dayDate)}
                    className={`p-3 text-center text-sm border relative
                        ${isDisabled ? 'text-gray-300 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-200 hover:bg-gray-200'}
                        ${isSelected ? 'bg-brand-mid-gray text-white border-brand-mid-gray' : ''}
                    `}
                    title={isClosed ? "Closed" : ""}
                >
                    {i}
                    {isClosed && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-400"></span>}
                </button>
            );
        }
        return days;
    }, [year, month, selectedDate, onDateSelect, today, closureDates]);

    const handlePrevMonth = () => {
        setDisplayDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setDisplayDate(new Date(year, month + 1, 1));
    };

    return (
        <div>
            <p className="font-bold text-sm text-brand-mid-gray mb-4">{stepNumber}/{totalSteps} Please Select a date</p>
            <div className="bg-white p-4 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon /></button>
                    <span className="font-bold text-brand-dark-gray">{monthNames[month]} {year}</span>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays}
                </div>
            </div>
            <div className="text-right mt-6">
                <button
                    onClick={onNext}
                    disabled={!selectedDate}
                    className="px-8 py-3 bg-brand-gold text-white font-bold uppercase text-sm tracking-wider disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    Next
                </button>
            </div>
        </div>
    );
};


// Step 2: Time and Guest Selection
const TimeGuestStep = ({ selectedTime, onTimeSelect, selectedGuests, onGuestsSelect, onPrev, onNext, availableTimes, isLoading, stepNumber, totalSteps }) => {
    const guests = [1, 2, 3, 4, 5, 6, 7, 8]; // Expanded guest options

    const baseButtonClasses = "p-3 border text-center font-semibold text-sm transition-colors";
    const inactiveClasses = "border-gray-300 bg-white hover:bg-gray-100";
    const activeClasses = "bg-brand-dark-gray text-white border-brand-dark-gray";

    return (
        <div>
            <p className="font-bold text-sm text-brand-mid-gray mb-4">{stepNumber}/{totalSteps} Select time and guests</p>
            <div className="bg-white p-4 shadow-inner space-y-6">
                <div>
                    <p className="font-bold text-xs uppercase tracking-wider mb-2 text-brand-dark-gray">Time</p>
                    {availableTimes.length === 0 ? (
                        <p className="text-sm text-red-500 italic">No available times for this date.</p>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {availableTimes.map(time => (
                                <button key={time} onClick={() => onTimeSelect(time)} className={`${baseButtonClasses} ${selectedTime === time ? activeClasses : inactiveClasses}`}>
                                    {time}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <p className="font-bold text-xs uppercase tracking-wider mb-2 text-brand-dark-gray">How many people?</p>
                    <div className="grid grid-cols-4 gap-2">
                        {guests.map(num => (
                            <button key={num} onClick={() => onGuestsSelect(num)} className={`${baseButtonClasses} ${selectedGuests === num ? activeClasses : inactiveClasses}`}>
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-6">
                <button onClick={onPrev} className="px-8 py-3 bg-gray-300 text-brand-dark-gray font-bold uppercase text-sm tracking-wider hover:bg-gray-400 transition-colors">
                    Prev
                </button>
                <button
                    onClick={onNext}
                    disabled={!selectedTime || !selectedGuests || isLoading}
                    className="px-8 py-3 bg-brand-gold text-white font-bold uppercase text-sm tracking-wider disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                    {isLoading ? 'Checking...' : 'Next'}
                </button>
            </div>
        </div>
    );
};

// Step 3: Details
const DetailsStep = ({ formData, setFormData, onPrev, onSubmit, isLoading, stepNumber, totalSteps }) => {
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const isSubmitDisabled = !formData.name || !formData.phone || !termsAccepted || isLoading;

    return (
        <div>
            <p className="font-bold text-sm text-brand-mid-gray mb-4">{stepNumber}/{totalSteps} Please fill with your details</p>
            <form className="bg-white p-4 shadow-inner space-y-4" onSubmit={onSubmit}>
                <div>
                    <input type="text" name="name" placeholder="First and Last Name" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-gold" required />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            +44
                        </span>
                        <input type="tel" name="phone" placeholder="7123 456789" value={formData.phone} onChange={handleChange} className="flex-1 min-w-0 block w-full p-3 border border-gray-300 rounded-r-md focus:outline-none focus:ring-1 focus:ring-brand-gold" required />
                    </div>
                </div>
                <div>
                    <textarea name="notes" placeholder="Please provide any additional info" rows={4} value={formData.notes} onChange={handleChange} className="w-full p-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-gold"></textarea>
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                        Please accept our <a href="/#/terms" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">Terms and conditions</a>
                    </label>
                </div>

                <div className="flex justify-between pt-2">
                    <button type="button" onClick={onPrev} className="px-8 py-3 bg-gray-300 text-brand-dark-gray font-bold uppercase text-sm tracking-wider hover:bg-gray-400 transition-colors">
                        Prev
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="px-8 py-3 bg-brand-gold text-white font-bold uppercase text-sm tracking-wider disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                        {isLoading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </form>
        </div>
    );
};


const BookingPage: React.FC = () => {
    const { settings } = useSettings();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [bookingData, setBookingData] = useState({
        date: null,
        time: '',
        guests: 0,
        name: '',
        phone: '',
        notes: '',
    });
    const [selectedItems, setSelectedItems] = useState<{ item: MenuItemData; quantity: number }[]>([]);
    // Skip logic state
    const [skipMenuStep, setSkipMenuStep] = useState(true);

    const totalSteps = skipMenuStep ? 3 : 4;

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleDateSelect = (date: Date) => {
        setBookingData(d => ({ ...d, date, time: '' }));

        // Check if date requires pre-order
        if (settings?.preorder_required_days && settings.preorder_required_days.length > 0) {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue"
            const isRequired = settings.preorder_required_days.includes(dayName);
            console.log(`Date selected: ${dayName}, Pre-order required: ${isRequired}`);
            setSkipMenuStep(!isRequired);
        } else {
            setSkipMenuStep(true);
        }
    };
    const handleTimeSelect = (time: string) => setBookingData(d => ({ ...d, time }));
    const handleGuestsSelect = (guests: number) => setBookingData(d => ({ ...d, guests }));

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        // Adjust for timezone to ensure we send the correct date string
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const formatTime = (time: string): string => {
        if (!time) return '';
        return time.replace('.', ':'); // 12.00 -> 12:00
    };

    const calculateTables = (guests: number): number => {
        if (!guests || guests <= 0) return 0;
        return Math.ceil(guests / 4); // Assuming 4 guests per table
    };

    // Get available times for the selected date
    const getAvailableTimes = () => {
        if (!bookingData.date || !settings?.collection_time_slots) return [];

        const dayOfWeek = bookingData.date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
        // Use the new day-specific keys if available, otherwise fallback to simple day key if that was the old structure
        // The settings object structure for collection_time_slots is Record<string, string[]> where key is day (mon, tue...)
        // My previous fix in SettingsTimeslots.tsx updated how we SAVE to this structure.
        // Wait, SettingsTimeslots.tsx updates `timeSlots` state which is `Record<string, string[]>`.
        // The keys are 'mon', 'tue', etc. The VALUES are arrays of time strings.
        // So `settings.collection_time_slots[dayOfWeek]` should give the array of times.

        return settings.collection_time_slots[dayOfWeek] || [];
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        // Prepend +44 to the user input for validation
        const fullPhone = '+44' + bookingData.phone;
        const validatedPhone = validateUKPhone(fullPhone);
        if (!validatedPhone) {
            alert('Please enter a valid UK mobile number (e.g., 7123 456789).');
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .rpc('create_booking', {
                    p_auto_confirm: false,
                    p_booking_date: formatDate(bookingData.date),
                    p_booking_time: formatTime(bookingData.time),
                    p_guest_count: bookingData.guests,
                    p_name: bookingData.name,
                    p_notes: bookingData.notes,
                    p_phone: validatedPhone,
                    p_table_count: calculateTables(bookingData.guests),
                    p_user_id: null, // Assuming guest booking for now, or could be session.user.id if auth implemented
                    p_restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
                    p_preorder_summary: formatItemsToMarkdown(selectedItems, settings?.currency)
                });

            if (error) {
                throw error;
            }

            if (data && !data.success) {
                alert(data.error_message || 'Booking failed. Please try again.');
                return;
            }

            alert(data?.message || 'Thank you for your reservation request! We will contact you shortly to confirm.');

            // Reset form state on successful submission
            setStep(1);
            setSelectedItems([]);
            setSkipMenuStep(true);
            setBookingData({
                date: null,
                time: '',
                guests: 0,
                name: '',
                phone: '',
                notes: '',
            });

        } catch (error) {
            console.error("Booking submission error:", error);
            alert(`Error: Could not submit your booking. Please try again. \n${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTimeGuestNext = async () => {
        if (!bookingData.date || !bookingData.time) return;

        // Removed check_timeslot_capacity for bookings as requested

        if (skipMenuStep) {
            setStep(4);
        } else {
            nextStep();
        }
    };

    return (
        <div className="bg-white text-brand-dark-gray font-sans">
            {/* Banner Section */}
            <section className="bg-brand-mid-gray text-white py-16 text-center">
                <DecorativeElement />
                <h1 className="text-5xl font-serif">Reserve a Table</h1>
                <p className="mt-2 text-gray-400">Book a table for a memorable dining experience</p>
            </section>

            {/* Main Content Section */}
            <section className="py-12 md:py-20 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-32 -mt-20 transform rotate-45 opacity-5 pointer-events-none">
                    {/* Decorative background element */}
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 xl:gap-16">

                        {/* Image Placeholder */}
                        <div className="lg:col-span-2 flex items-center justify-center h-96 lg:h-auto">
                            <img
                                src="https://qbgziszculmwzyhjvfyc.supabase.co/storage/v1/object/public/images/Landing%20Page/684.jpg"
                                alt="Restaurant Interior"
                                className="w-full h-full object-cover rounded-sm shadow-lg"
                            />
                        </div>

                        {/* Form Area */}
                        <div className="lg:col-span-3">
                            <h2 className="text-3xl font-serif text-brand-dark">Reserve a table</h2>
                            <p className="text-brand-mid-gray mb-6">or Call us at 0344 32423453</p>

                            <div className="bg-gray-100 p-6 sm:p-8 shadow-lg rounded-sm">
                                {step === 1 && (
                                    <DateStep
                                        selectedDate={bookingData.date}
                                        onDateSelect={handleDateSelect}
                                        onNext={nextStep}
                                        closureDates={settings?.closure_dates || []}
                                        stepNumber={1}
                                        totalSteps={totalSteps}
                                    />
                                )}
                                {step === 2 && (
                                    <TimeGuestStep
                                        selectedTime={bookingData.time}
                                        onTimeSelect={handleTimeSelect}
                                        selectedGuests={bookingData.guests}
                                        onGuestsSelect={handleGuestsSelect}
                                        onPrev={prevStep}
                                        onNext={handleTimeGuestNext}
                                        availableTimes={getAvailableTimes()}
                                        isLoading={isLoading}
                                        stepNumber={2}
                                        totalSteps={totalSteps}
                                    />
                                )}
                                {step === 3 && !skipMenuStep && (
                                    <BookingMenuStep
                                        onNext={nextStep}
                                        onPrev={prevStep}
                                        selectedItems={selectedItems}
                                        onItemsChange={setSelectedItems}
                                        isLoading={isLoading}
                                    // BookingMenuStep needs internal update for step display if it uses it.
                                    // Assuming I should pass it or it renders its own title. 
                                    // Let's modify BookingMenuStep if needed, but for now just passing props here won't break it if it doesn't use them.
                                    // Actually better to pass "stepIndicator={<p>...p>}" or similar if I can modify it. 
                                    // For now, I'll assume I need to update BookingMenuStep.tsx too or let it handle its own "2.5/3" -> "3/4" logic.
                                    />
                                )}
                                {(step === 3 && skipMenuStep) || (step === 4) ? (
                                    <DetailsStep
                                        formData={bookingData}
                                        setFormData={setBookingData}
                                        onPrev={prevStep}
                                        onSubmit={handleSubmit}
                                        isLoading={isLoading}
                                        stepNumber={totalSteps} // Always last step
                                        totalSteps={totalSteps}
                                    />
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default BookingPage;