import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Calendar, Users, Check, X, UserCheck } from 'lucide-react';

interface Booking {
    id: string;
    booking_date: string;
    booking_time: string;
    guest_count: number;
    name?: string; // Renamed from customer_name
    customer_email?: string;
    phone?: string; // Renamed from customer_phone
    status: 'pending' | 'confirmed' | 'cancelled';
    table_assigned?: string;
    special_request?: string;
    created_at?: string;
    user_id?: string;
    profiles?: {
        full_name: string;
        phone: string;
    };
}

type TabType = 'today' | 'upcoming' | 'past';

const BookingManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('today');

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchBookings();

            const channel = supabase
                .channel('public:bookings')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
                    fetchBookings();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedRestaurantId]);

    const fetchBookings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    phone
                )
            `)
            .order('booking_date', { ascending: false })
            .order('booking_time', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
        } else {
            setBookings(data || []);
        }
        setLoading(false);
    };

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const filterBookingsByTab = (bookings: Booking[], tab: TabType): Booking[] => {
        const today = getTodayDate();

        switch (tab) {
            case 'today':
                return bookings.filter(booking => booking.booking_date === today);
            case 'upcoming':
                return bookings.filter(booking => booking.booking_date > today);
            case 'past':
                return bookings.filter(booking => booking.booking_date < today);
            default:
                return bookings;
        }
    };

    const filteredBookings = filterBookingsByTab(bookings, activeTab);

    const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
        const { error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        } else {
            fetchBookings();
        }
    };

    const assignTable = async (id: string) => {
        const table = prompt("Enter table number/name:");
        if (table) {
            const { error } = await supabase
                .from('bookings')
                .update({ table_assigned: table, status: 'confirmed' })
                .eq('id', id);

            if (error) {
                console.error('Error assigning table:', error);
                alert('Failed to assign table');
            } else {
                fetchBookings();
            }
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Booking Management</h2>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'today'
                            ? 'border-brand-gold text-brand-gold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'upcoming'
                            ? 'border-brand-gold text-brand-gold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'past'
                            ? 'border-brand-gold text-brand-gold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Past
                    </button>
                </nav>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{booking.booking_date.split('-').reverse().join('-')} at {booking.booking_time}</div>
                                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                                    <Users className="h-3 w-3 mr-1" /> {booking.guest_count} guests
                                                </div>
                                                {booking.special_request && (
                                                    <div className="text-xs text-gray-500 mt-1 italic">"{booking.special_request}"</div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {booking.profiles?.full_name || booking.name || 'Guest'}
                                            {booking.profiles && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Member</span>}
                                        </div>
                                        <div className="text-sm text-gray-500">{booking.customer_email}</div>
                                        <div className="text-sm text-gray-500">{booking.profiles?.phone || booking.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {booking.table_assigned ? (
                                            <span className="font-bold text-gray-800">Table {booking.table_assigned}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {booking.status !== 'cancelled' && (
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => assignTable(booking.id)} className="text-blue-600 hover:text-blue-900" title="Assign Table">
                                                    <UserCheck className="h-5 w-5" />
                                                </button>
                                                {booking.status === 'pending' && (
                                                    <button onClick={() => updateStatus(booking.id, 'confirmed')} className="text-green-600 hover:text-green-900" title="Confirm">
                                                        <Check className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <button onClick={() => updateStatus(booking.id, 'cancelled')} className="text-red-600 hover:text-red-900" title="Cancel">
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredBookings.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No bookings found for this category.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BookingManagementPage;
