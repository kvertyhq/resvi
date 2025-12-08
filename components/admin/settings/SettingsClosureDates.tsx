import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface SettingsClosureDatesProps {
    closureDates: string[];
    setClosureDates: (dates: string[]) => void;
}

const SettingsClosureDates: React.FC<SettingsClosureDatesProps> = ({ closureDates, setClosureDates }) => {
    const selectedDates = closureDates.map(date => new Date(date));

    const handleSelect = (dates: Date[] | undefined) => {
        if (!dates) {
            setClosureDates([]);
            return;
        }
        // Convert dates to YYYY-MM-DD strings
        const dateStrings = dates.map(date => {
            // Adjust for timezone offset to ensure correct date string
            const offset = date.getTimezoneOffset();
            const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
            return adjustedDate.toISOString().split('T')[0];
        });
        setClosureDates(dateStrings);
    };

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Selective Closure Dates</h3>
            <p className="text-sm text-gray-500 mb-4">Select dates to disable orders and bookings. Tap a date to toggle it.</p>
            <div className="flex justify-center bg-white border border-gray-200 rounded-lg p-4">
                <DayPicker
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleSelect}
                    styles={{
                        caption: { color: '#eab308' } // brand-gold
                    }}
                    modifiersStyles={{
                        selected: { backgroundColor: '#eab308', color: 'white' }
                    }}
                />
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Closed Dates Summary:</h4>
                <div className="flex flex-wrap gap-2">
                    {closureDates.length > 0 ? (
                        closureDates.sort().map(date => (
                            <span key={date} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {date}
                            </span>
                        ))
                    ) : (
                        <span className="text-sm text-gray-400 italic">No dates selected</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsClosureDates;
