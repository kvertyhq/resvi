import React from 'react';
import { Switch } from '@headlessui/react';
import { MessageSquare, Calendar, CheckCircle, XCircle, Truck } from 'lucide-react';

interface SMSPreferences {
    new_booking_admin: boolean;
    new_booking_customer: boolean;
    booking_confirmed: boolean;
    booking_cancelled: boolean;
    table_assigned: boolean;
    new_order_admin: boolean;
    new_order_customer: boolean;
    order_confirmed: boolean;
    order_preparing: boolean;
    order_out_for_delivery: boolean;
    order_ready_collection: boolean;
    order_completed_delivery: boolean;
}

interface SettingsSMSProps {
    formData: any;
    setFormData: (data: any) => void;
}

const ToggleItem: React.FC<{
    item: {
        key: string;
        title: string;
        description: string;
        icon: any;
    };
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ item, checked, onChange }) => (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="p-2 bg-gray-100 rounded-lg">
                <item.icon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
            </div>
        </div>
        <Switch
            checked={checked}
            onChange={onChange}
            className={`${checked ? 'bg-brand-gold' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2`}
        >
            <span
                className={`${checked ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
        </Switch>
    </div>
);

const SettingsSMS: React.FC<SettingsSMSProps> = ({ formData, setFormData }) => {
    // Helper to update specific preference
    const updateHeader = (key: keyof SMSPreferences, value: boolean) => {
        const currentPrefs = formData.sms_preferences || {
            new_booking_admin: true,
            new_booking_customer: true,
            booking_confirmed: true,
            booking_cancelled: true,
            table_assigned: true,
            new_order_admin: true,
            new_order_customer: true,
            order_confirmed: true,
            order_preparing: true,
            order_out_for_delivery: true,
            order_ready_collection: true,
            order_completed_delivery: true
        };

        setFormData({
            ...formData,
            sms_preferences: {
                ...currentPrefs,
                [key]: value
            }
        });
    };

    const getPref = (key: keyof SMSPreferences) => {
        return formData.sms_preferences?.[key] ?? true;
    };

    const bookingToggles = [
        {
            key: 'new_booking_admin',
            title: 'New Booking (Inform Admin)',
            description: 'Send SMS to admin when a new booking is received.',
            icon: MessageSquare
        },
        {
            key: 'new_booking_customer',
            title: 'New Booking (Inform Customer)',
            description: 'Send SMS confirmation to customer for new booking.',
            icon: Calendar
        },
        {
            key: 'booking_confirmed',
            title: 'Booking Confirmed',
            description: 'Send SMS to customer when booking is confirmed.',
            icon: CheckCircle
        },
        {
            key: 'table_assigned',
            title: 'Table Assigned',
            description: 'Send SMS to customer when table is assigned.',
            icon: CheckCircle
        },
        {
            key: 'booking_cancelled',
            title: 'Booking Cancelled',
            description: 'Send SMS to customer when booking is cancelled.',
            icon: XCircle
        }
    ];

    const orderToggles = [
        {
            key: 'new_order_admin',
            title: 'New Order (Inform Admin)',
            description: 'Send SMS to admin when a new order is received.',
            icon: MessageSquare
        },
        {
            key: 'new_order_customer',
            title: 'New Order (Inform Customer)',
            description: 'Send SMS to customer when they place an order.',
            icon: Calendar
        },
        {
            key: 'order_confirmed',
            title: 'Order Confirmed',
            description: 'Send SMS when order is confirmed.',
            icon: CheckCircle
        },
        {
            key: 'order_preparing',
            title: 'Order Preparing',
            description: 'Send SMS when order starts preparation.',
            icon: CheckCircle
        },
        {
            key: 'order_out_for_delivery',
            title: 'Out for Delivery',
            description: 'Send SMS when order is out for delivery.',
            icon: Truck
        },
        {
            key: 'order_ready_collection',
            title: 'Ready for Collection',
            description: 'Send SMS when order is ready for pickup (Collection only).',
            icon: CheckCircle
        },
        {
            key: 'order_completed_delivery',
            title: 'Order Delivered',
            description: 'Send SMS when order is marked completed (Delivery only).',
            icon: CheckCircle
        }
    ];

    return (
        <div className="space-y-8">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Configure which events trigger an SMS notification. Disabling unnecessary notifications can help save on credit costs.
                        </p>
                    </div>
                </div>
            </div>

            {/* Configuration Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Admin Notification Phone
                        </label>
                        <input
                            type="tel"
                            placeholder="+447700900000"
                            value={formData.admin_notifications_phone || ''}
                            onChange={(e) => {
                                // Strip all non-numeric characters except leading +
                                let val = e.target.value.replace(/[^0-9+]/g, '');
                                // Ensure + is only at the beginning
                                if (val.includes('+')) {
                                    const parts = val.split('+');
                                    // If multiple + or + not at start, clean it up
                                    val = (val.startsWith('+') ? '+' : '') + parts.join('');
                                }
                                setFormData({ ...formData, admin_notifications_phone: val });
                            }}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm p-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            The number that receives 'New Booking' and 'New Order' admin alerts.
                            {formData.admin_notifications_phone && !/^\+?[0-9]{10,15}$/.test(formData.admin_notifications_phone) && (
                                <span className="block text-red-500 mt-1">
                                    Invalid format. Expected: +4477... or 077... (10-15 digits)
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            SMS Sender ID
                        </label>
                        <input
                            type="text"
                            maxLength={11}
                            placeholder="ResVi"
                            value={formData.sms_sender_id || 'ResVi'}
                            onChange={(e) => setFormData({ ...formData, sms_sender_id: e.target.value })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm p-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            The name that appears as the sender (Max 11 alphanumeric characters).
                        </p>
                    </div>
                </div>
            </div>

            {/* Bookings Section */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Booking Notifications</h3>
                <div className="grid grid-cols-1 gap-4">
                    {bookingToggles.map((toggle) => (
                        <ToggleItem
                            key={toggle.key}
                            item={toggle}
                            checked={getPref(toggle.key as keyof SMSPreferences)}
                            onChange={(checked) => updateHeader(toggle.key as keyof SMSPreferences, checked)}
                        />
                    ))}
                </div>
            </div>

            {/* Orders Section */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Order Notifications</h3>
                <div className="grid grid-cols-1 gap-4">
                    {orderToggles.map((toggle) => (
                        <ToggleItem
                            key={toggle.key}
                            item={toggle}
                            checked={getPref(toggle.key as keyof SMSPreferences)}
                            onChange={(checked) => updateHeader(toggle.key as keyof SMSPreferences, checked)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsSMS;
