import React, { useState } from 'react';

interface SettingsTimeslotsProps {
    timeSlots: Record<string, string[]>;
    setTimeSlots: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    capacities: Record<string, { max_orders?: number; max_delivery?: number; max_collection?: number; max_bookings?: number }>;
    setCapacities: React.Dispatch<React.SetStateAction<Record<string, { max_orders?: number; max_delivery?: number; max_collection?: number; max_bookings?: number }>>>;
}

const SettingsTimeslots: React.FC<SettingsTimeslotsProps> = ({ timeSlots, setTimeSlots, capacities, setCapacities }) => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const [selectedDay, setSelectedDay] = useState('mon');

    // Helper to generate slots for a day (simple implementation for now, can be expanded)
    // In a real scenario, we might want a more complex time range generator like in the original file
    // For this component, let's assume we manage specific slots or ranges.
    // Given the user request "Adjusted timeslots. Let admin be able to create his own timeslots",
    // we should allow adding specific times.

    const handleAddSlot = (day: string, time: string) => {
        if (!time) return;
        setTimeSlots(prev => {
            const currentSlots = prev[day] || [];
            if (currentSlots.includes(time)) return prev;
            return { ...prev, [day]: [...currentSlots, time].sort() };
        });
    };

    const handleRemoveSlot = (day: string, time: string) => {
        setTimeSlots(prev => {
            const currentSlots = prev[day] || [];
            return { ...prev, [day]: currentSlots.filter(t => t !== time) };
        });
    };

    const handleCapacityChange = (day: string, time: string, type: 'max_orders' | 'max_delivery' | 'max_collection' | 'max_bookings', value: number) => {
        const key = `${day}_${time}`;
        setCapacities(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [type]: value
            }
        }));
    };

    // Generate a list of standard 30-min slots for the dropdown
    const standardSlots = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            const h = i.toString().padStart(2, '0');
            const m = j.toString().padStart(2, '0');
            standardSlots.push(`${h}:${m}`);
        }
    }

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Timeslot Settings & Limits</h3>

            {/* Day Selector */}
            <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-md text-sm font-medium capitalize whitespace-nowrap ${selectedDay === day
                            ? 'bg-brand-gold text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {day}
                    </button>
                ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-md font-bold text-gray-800 capitalize mb-4">{selectedDay} Configuration</h4>

                {/* Add Slot */}
                <div className="flex items-center space-x-2 mb-6">
                    <select id="new-slot-time" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold">
                        <option value="">Select Time</option>
                        {standardSlots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => {
                            const select = document.getElementById('new-slot-time') as HTMLSelectElement;
                            handleAddSlot(selectedDay, select.value);
                            select.value = '';
                        }}
                        className="bg-brand-dark-gray text-white px-3 py-2 rounded-md text-sm hover:bg-gray-800"
                    >
                        Add Slot
                    </button>
                </div>

                {/* Slots List */}
                <div className="space-y-4">
                    {(timeSlots[selectedDay] || []).length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No timeslots configured for this day.</p>
                    ) : (
                        (timeSlots[selectedDay] || []).map(slot => {
                            const capacityKey = `${selectedDay}_${slot}`;
                            return (
                                <div key={slot} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-bold text-gray-800">{slot}</span>
                                        <button
                                            onClick={() => handleRemoveSlot(selectedDay, slot)}
                                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs text-brand-dark-gray font-bold mb-1">Max Table Bookings</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={capacities[capacityKey]?.max_bookings ?? ''}
                                                onChange={(e) => handleCapacityChange(selectedDay, slot, 'max_bookings', parseInt(e.target.value))}
                                                placeholder="Unlimited"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max Orders (Online)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={capacities[capacityKey]?.max_orders ?? ''}
                                                onChange={(e) => handleCapacityChange(selectedDay, slot, 'max_orders', parseInt(e.target.value))}
                                                placeholder="Unlimited"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max Delivery</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={capacities[capacityKey]?.max_delivery ?? ''}
                                                onChange={(e) => handleCapacityChange(selectedDay, slot, 'max_delivery', parseInt(e.target.value))}
                                                placeholder="Unlimited"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max Collection</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={capacities[capacityKey]?.max_collection ?? ''}
                                                onChange={(e) => handleCapacityChange(selectedDay, slot, 'max_collection', parseInt(e.target.value))}
                                                placeholder="Unlimited"
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div >
    );
};

export default SettingsTimeslots;
