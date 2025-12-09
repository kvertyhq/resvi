import React from 'react';

// Days mapping for cleaner UI
const DAYS = [
    { key: 'Mon', label: 'Monday' },
    { key: 'Tue', label: 'Tuesday' },
    { key: 'Wed', label: 'Wednesday' },
    { key: 'Thu', label: 'Thursday' },
    { key: 'Fri', label: 'Friday' },
    { key: 'Sat', label: 'Saturday' },
    { key: 'Sun', label: 'Sunday' },
];

interface SettingsBookingPreorderProps {
    preorderRequiredDays: string[];
    setPreorderRequiredDays: React.Dispatch<React.SetStateAction<string[]>>;
}

const SettingsBookingPreorder: React.FC<SettingsBookingPreorderProps> = ({
    preorderRequiredDays,
    setPreorderRequiredDays
}) => {
    const safeDays = Array.isArray(preorderRequiredDays) ? preorderRequiredDays : [];

    const handleDayToggle = (day: string) => {
        setPreorderRequiredDays(prev => {
            const current = Array.isArray(prev) ? prev : [];
            if (current.includes(day)) {
                return current.filter(d => d !== day);
            } else {
                return [...current, day];
            }
        });
    };

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Table Booking Pre-order Rules</h3>
            <p className="text-sm text-gray-500 mb-4">
                Select the days where customers are <strong>required</strong> to pre-order their food when booking a table.
                This helps in reducing food wastage.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {DAYS.map((day) => {
                    const isSelected = safeDays.includes(day.key);
                    return (
                        <div
                            key={day.key}
                            onClick={() => handleDayToggle(day.key)}
                            className={`
                                cursor-pointer rounded-lg border p-4 flex flex-col items-center justify-center transition-all duration-200
                                ${isSelected
                                    ? 'bg-brand-gold/10 border-brand-gold text-brand-dark-gray shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                                }
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => { }} // Handled by div click
                                className="h-5 w-5 text-brand-gold border-gray-300 rounded focus:ring-brand-gold mb-2 pointer-events-none"
                            />
                            <span className="font-semibold text-sm">{day.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-100 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                    When a customer selects a date falling on a checked day, they will be prompted to select items from the menu before confirming their booking.
                </span>
            </div>
        </div>
    );
};

export default SettingsBookingPreorder;
