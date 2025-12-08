import React from 'react';

interface SettingsOpeningHoursProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const SettingsOpeningHours: React.FC<SettingsOpeningHoursProps> = ({ formData, setFormData }) => {
    return (
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
                                setFormData((prev: any) => ({ ...prev, opening_hours: newHours }));
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold text-sm"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SettingsOpeningHours;
