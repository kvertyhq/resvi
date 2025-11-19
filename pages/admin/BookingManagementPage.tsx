import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Calendar, Users, Check, X, UserCheck } from 'lucide-react';

interface Booking {
    id: number;
    date: string;
    time: string;
    guests: number;
    name: string;
    email: string;
    phone: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    table_number?: number;
}

const BookingManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

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
        // Mock Data
        const mockBookings: Booking[] = [
            { id: 1, date: '2023-11-20', time: '19:00', guests: 4, name: 'Sarah Connor', email: 'sarah@example.com', phone: '07700900123', status: 'pending' },
            { id: 2, date: '2023-11-20', time: '20:00', guests: 2, name: 'Kyle Reese', email: 'kyle@example.com', phone: '07700900456', status: 'confirmed', table_number: 5 },
            { id: 3, date: '2023-11-21', time: '18:30', guests: 6, name: 'John Connor', email: 'john@example.com', phone: '07700900789', status: 'cancelled' },
        ];
        setBookings(mockBookings);
        setLoading(false);
    };

    const updateStatus = (id: number, status: 'confirmed' | 'cancelled') => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    };

    const assignTable = (id: number) => {
        const table = prompt("Enter table number:");
        if (table) {
            setBookings(prev => prev.map(b => b.id === id ? { ...b, table_number: parseInt(table), status: 'confirmed' } : b));
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-serif font-bold text-gray-800 mb-8">Booking Management</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
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
                        {bookings.map((booking) => (
                            <tr key={booking.id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{booking.date} at {booking.time}</div>
                                            <div className="text-sm text-gray-500 flex items-center mt-1">
                                                <Users className="h-3 w-3 mr-1" /> {booking.guests} guests
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{booking.name}</div>
                                    <div className="text-sm text-gray-500">{booking.email}</div>
                                    <div className="text-sm text-gray-500">{booking.phone}</div>
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
                                    {booking.table_number ? (
                                        <span className="font-bold text-gray-800">Table {booking.table_number}</span>
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
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BookingManagementPage;
