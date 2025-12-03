import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Calendar, Clock, Users, User, ChevronRight } from 'lucide-react';
import { Booking } from './CalendarView'; // Importing interface from CalendarView

const DashboardBookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'day' | 'week' | 'month'>('day');

    useEffect(() => {
        fetchBookings();
    }, [filter]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const restaurantId = import.meta.env.VITE_RESTAURANT_ID;
            const today = new Date();
            let startDate = new Date();
            let endDate = new Date();

            // Calculate date range based on filter
            if (filter === 'day') {
                // Today is already set
            } else if (filter === 'week') {
                // Start of week (Sunday)
                const day = today.getDay(); // 0 (Sun) to 6 (Sat)
                const diff = today.getDate() - day;

                startDate = new Date(today);
                startDate.setDate(diff);

                // End of week (Saturday)
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            } else if (filter === 'month') {
                // Start of month
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                // End of month
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            }

            // Format dates for Supabase query (YYYY-MM-DD)
            const formatDate = (date: Date) => {
                return date.toISOString().split('T')[0];
            };

            let query = supabase
                .from('bookings')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        phone
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .order('booking_date', { ascending: true })
                .order('booking_time', { ascending: true });

            if (filter === 'day') {
                query = query.eq('booking_date', formatDate(today));
            } else {
                query = query
                    .gte('booking_date', formatDate(startDate))
                    .lte('booking_date', formatDate(endDate));
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching bookings:', error);
            } else {
                setBookings(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFilterLabel = () => {
        switch (filter) {
            case 'day': return 'Today';
            case 'week': return 'This Week';
            case 'month': return 'This Month';
            default: return '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-brand-gold" />
                        Bookings Overview
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Showing bookings for <span className="font-semibold text-gray-700">{getFilterLabel()}</span>
                    </p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('day')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'day'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setFilter('week')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'week'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === 'month'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Month
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                </div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No bookings found for {getFilterLabel().toLowerCase()}.</p>
                </div>
            ) : (
                <div className="overflow-hidden">
                    <div className="grid gap-3">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors group">
                                <div className="flex items-center space-x-4">
                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-brand-gold/10 rounded-lg text-brand-gold">
                                        <span className="text-xs font-bold uppercase">
                                            {new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-lg font-bold leading-none">
                                            {new Date(booking.booking_date).getDate()}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-center">
                                            <h4 className="font-semibold text-gray-900 text-sm">
                                                {booking.profiles?.full_name || booking.name || 'Guest'}
                                            </h4>
                                            <span className={`ml-2 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
                                            <span className="flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {booking.booking_time.slice(0, 5)}
                                            </span>
                                            <span className="flex items-center">
                                                <Users className="h-3 w-3 mr-1" />
                                                {booking.guest_count} ppl
                                            </span>
                                            {booking.table_assigned && (
                                                <span className="font-medium text-gray-600">
                                                    Table {booking.table_assigned}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    {booking.special_request && (
                                        <span className="hidden sm:inline-block text-xs text-gray-400 italic mr-4 max-w-[150px] truncate">
                                            "{booking.special_request}"
                                        </span>
                                    )}
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardBookings;
