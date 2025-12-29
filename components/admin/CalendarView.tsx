import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, User } from 'lucide-react';

// Define interface locally to avoid circular dependencies or refactoring right now
// ideally this should be in a shared types file
export interface Booking {
    id: string;
    booking_date: string;
    booking_time: string;
    guest_count: number;
    name?: string;
    customer_email?: string;
    phone?: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    table_assigned?: string;
    special_request?: string;
    preorder_summary?: string; // Markdown string
    created_at?: string;
    user_id?: string;
    profiles?: {
        full_name: string;
        phone: string;
    };
    metadata?: any;
}

interface CalendarViewProps {
    bookings: Booking[];
    onStatusUpdate: (id: string, status: 'confirmed' | 'cancelled') => void;
    onAssignTable: (id: string) => void;
    onViewPreorder: (summary: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ bookings, onStatusUpdate, onAssignTable, onViewPreorder }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

    // Helper to get days in month
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // Helper to get day of week for first day of month (0 = Sunday)
    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Generate calendar grid
    const days = [];
    // Empty cells for days before start of month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Filter bookings for the current view
    const getBookingsForDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return bookings.filter(b => {
            if (b.booking_date !== dateStr) return false;
            if (filterStatus !== 'all' && b.status !== filterStatus) return false;
            return true;
        });
    };

    const handleDateClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr === selectedDate ? null : dateStr);
    };

    // Get selected date bookings for detail view
    const selectedDateBookings = selectedDate ? bookings.filter(b => b.booking_date === selectedDate && (filterStatus === 'all' || b.status === filterStatus)) : [];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-serif font-bold text-gray-800">
                        {monthNames[month]} {year}
                    </h2>
                    <div className="flex space-x-1">
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronLeft className="h-6 w-6 text-gray-600" />
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full">
                            <ChevronRight className="h-6 w-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Filter Status:</span>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-brand-gold focus:ring focus:ring-brand-gold focus:ring-opacity-50"
                    >
                        <option value="all">All</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}

                {/* Days */}
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="bg-white h-32"></div>;
                    }

                    const dayBookings = getBookingsForDate(day);
                    const isSelected = selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`bg-white h-32 p-2 cursor-pointer transition-colors hover:bg-gray-50 relative ${isSelected ? 'ring-2 ring-inset ring-brand-gold' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${isToday ? 'bg-brand-gold text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}`}>
                                    {day}
                                </span>
                                {dayBookings.length > 0 && (
                                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                        {dayBookings.length}
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)]">
                                {dayBookings.slice(0, 3).map(booking => (
                                    <div
                                        key={booking.id}
                                        className={`text-xs px-1.5 py-1 rounded truncate border-l-2 ${booking.status === 'confirmed' ? 'bg-green-50 border-green-500 text-green-700' :
                                            booking.status === 'cancelled' ? 'bg-red-50 border-red-500 text-red-700' :
                                                'bg-yellow-50 border-yellow-500 text-yellow-700'
                                            }`}
                                    >
                                        {booking.booking_time.slice(0, 5)} - {booking.profiles?.full_name || booking.name || booking.metadata?.guest_name || 'Guest'}
                                    </div>
                                ))}
                                {dayBookings.length > 3 && (
                                    <div className="text-xs text-gray-400 pl-1">
                                        + {dayBookings.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Bookings for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>

                    {selectedDateBookings.length === 0 ? (
                        <p className="text-gray-500 italic">No bookings found for this date.</p>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {selectedDateBookings.map(booking => (
                                <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center text-brand-gold font-bold">
                                            <Clock className="h-4 w-4 mr-1.5" />
                                            {booking.booking_time.slice(0, 5)}
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex items-center text-gray-900 font-medium mb-1">
                                            <User className="h-4 w-4 mr-2 text-gray-400" />
                                            {booking.profiles?.full_name || booking.name || booking.metadata?.guest_name || 'Guest'}
                                        </div>
                                        <div className="flex items-center text-gray-600 text-sm ml-6">
                                            <Users className="h-3 w-3 mr-1.5" />
                                            {booking.guest_count} guests
                                        </div>
                                    </div>

                                    {booking.table_assigned && (
                                        <div className="text-sm text-gray-600 mb-3 ml-6">
                                            Table: <span className="font-semibold">{booking.table_assigned}</span>
                                        </div>
                                    )}

                                    {booking.special_request && (
                                        <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mb-3">
                                            "{booking.special_request}"
                                        </div>
                                    )}

                                    {booking.preorder_summary && (
                                        <button
                                            onClick={() => onViewPreorder(booking.preorder_summary!)}
                                            className="text-xs w-full mt-2 bg-brand-gold text-white px-2 py-1.5 rounded hover:bg-brand-dark transition-colors font-medium text-center"
                                        >
                                            View Pre-order
                                        </button>
                                    )}

                                    <div className="flex justify-end space-x-2 mt-2 pt-2 border-t border-gray-100">
                                        {booking.status !== 'cancelled' && (
                                            <>
                                                <button
                                                    onClick={() => onAssignTable(booking.id)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    Assign Table
                                                </button>
                                                {booking.status === 'pending' && (
                                                    <button
                                                        onClick={() => onStatusUpdate(booking.id, 'confirmed')}
                                                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onStatusUpdate(booking.id, 'cancelled')}
                                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalendarView;
