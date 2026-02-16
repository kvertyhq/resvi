import React from 'react';

interface SettingsBookingGeneralProps {
    bookingsEnabled: boolean;
    setBookingsEnabled: (enabled: boolean) => void;
}

const SettingsBookingGeneral: React.FC<SettingsBookingGeneralProps> = ({ bookingsEnabled, setBookingsEnabled }) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">General Booking Settings</h3>
            <div className="flex items-center justify-between">
                <div>
                    <label htmlFor="bookings_enabled" className="text-sm font-medium text-gray-700">Enable Table Bookings</label>
                    <p className="text-sm text-gray-500">
                        When disabled, the "Book a Table" button will be hidden from the website and customers won't be able to access the booking page.
                    </p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input
                        type="checkbox"
                        name="bookings_enabled"
                        id="bookings_enabled"
                        checked={bookingsEnabled}
                        onChange={(e) => setBookingsEnabled(e.target.checked)}
                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 right-6 checked:border-brand-gold border-gray-300"
                    />
                    <label
                        htmlFor="bookings_enabled"
                        className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer peer-checked:bg-brand-gold"
                    ></label>
                </div>
            </div>
        </div>
    );
};

export default SettingsBookingGeneral;
