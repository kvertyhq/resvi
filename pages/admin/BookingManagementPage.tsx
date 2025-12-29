import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Calendar, Users, Check, X, UserCheck, List, Grid, RefreshCcw } from 'lucide-react';
import CalendarView, { Booking } from '../../components/admin/CalendarView';
import useAutoRefresh from '../../hooks/useAutoRefresh';

// Removed unavailable react-markdown import. Displaying as pre-formatted text.


type TabType = 'today' | 'upcoming' | 'past';
type ViewType = 'list' | 'calendar';

// Simple Modal for Pre-orders
const PreOrderModal = ({ content, onClose }: { content: string; onClose: () => void }) => {
    if (!content) return null;

    // Parser for the specific markdown format
    const lines = content.split('\n');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-serif font-bold text-lg text-gray-800">Pre-ordered Items</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">
                    {lines.map((line, index) => {
                        // Headers
                        if (line.startsWith('###')) {
                            return null; // Skip title as we have modal title
                        }
                        // List items: "- **Qty Name** (Price) = Total"
                        if (line.trim().startsWith('-')) {
                            // Simple regex to clean up markdown bold
                            const cleanLine = line.replace(/^\-\s*/, '').replace(/\*\*/g, '');
                            return (
                                <div key={index} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                                    <span>{cleanLine.split('=')[0]}</span>
                                    <span className="font-semibold text-gray-900">{cleanLine.split('=')[1]}</span>
                                </div>
                            );
                        }
                        // Total
                        if (line.includes('Total Value')) {
                            const cleanLine = line.replace(/\*\*/g, '');
                            return (
                                <div key={index} className="mt-4 pt-4 border-t border-gray-200 flex justify-between font-bold text-brand-gold text-lg">
                                    <span>Total Value</span>
                                    <span>{cleanLine.split(':')[1]}</span>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
                <div className="p-4 border-t bg-gray-50 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-medium">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const BookingManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('today');
    const [viewType, setViewType] = useState<ViewType>('list');
    const [selectedPreorder, setSelectedPreorder] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Auto Refresh
    const { timeLeft } = useAutoRefresh(() => fetchBookings(false), 15000);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        if (selectedRestaurantId) {
            fetchBookings();

            const channel = supabase
                .channel('public:bookings')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
                    console.log('New booking received:', payload);
                    playNotificationSound();
                    fetchBookings();
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
                    fetchBookings();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedRestaurantId]);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.log("Audio play failed (user interaction required):", error);
            });
        }
    };

    const handleRefresh = () => {
        fetchBookings(true);
    };

    const fetchBookings = async (showLoading = true) => {
        if (showLoading && bookings.length === 0) setLoading(true); // Only show loading if empty or forced

        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                profiles:user_id (
                    full_name,
                    phone
                )
            `)
            .eq('restaurant_id', selectedRestaurantId)
            .order('booking_date', { ascending: false })
            .order('booking_time', { ascending: false });

        if (error) {
            console.error('Error fetching bookings:', error);
        } else {
            if (data && data.length > 0 && bookings.length > 0) {
                const currentIds = new Set(bookings.map(b => b.id));
                const newBookings = data.filter(b => !currentIds.has(b.id));

                if (newBookings.length > 0) {
                    console.log('New bookings detected:', newBookings.length);
                    playNotificationSound();
                }
            }
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
            {!selectedRestaurantId ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                    <p className="text-xl font-medium mb-2">No Restaurant Selected</p>
                    <p>Please select a restaurant context to view bookings.</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-3xl font-serif font-bold text-gray-800">Booking Management</h2>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">Refreshing in {timeLeft}s</span>
                                <button
                                    onClick={handleRefresh}
                                    className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold"
                                    title="Refresh Bookings"
                                >
                                    <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
                            <button
                                onClick={() => setViewType('list')}
                                className={`p-2 rounded-md transition-colors ${viewType === 'list' ? 'bg-brand-gold text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="List View"
                            >
                                <List className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setViewType('calendar')}
                                className={`p-2 rounded-md transition-colors ${viewType === 'calendar' ? 'bg-brand-gold text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Calendar View"
                            >
                                <Grid className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {viewType === 'list' ? (
                        <>
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
                                {/* Mobile Card View */}
                                <div className="md:hidden">
                                    {filteredBookings.map((booking) => (
                                        <div key={booking.id} className="p-4 border-b border-gray-200 last:border-b-0 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center">
                                                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{booking.booking_date.split('-').reverse().join('-')}</div>
                                                        <div className="text-xs text-gray-500">{booking.booking_time}</div>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center text-gray-700">
                                                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                                                    {booking.guest_count} Guests
                                                </div>
                                                <div className="text-right">
                                                    {booking.table_assigned ? (
                                                        <span className="font-bold text-gray-800">Table {booking.table_assigned}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No Table</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-sm bg-gray-50 p-3 rounded-md">
                                                <div className="font-medium text-gray-900">
                                                    {booking.profiles?.full_name || booking.name || 'Guest'}
                                                    {booking.profiles && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Member</span>}
                                                </div>
                                                <div className="text-gray-500 text-xs mt-0.5">{booking.profiles?.phone || booking.phone}</div>
                                                {booking.special_request && (
                                                    <div className="text-xs text-gray-500 mt-2 italic border-t border-gray-200 pt-1">
                                                        "{booking.special_request}"
                                                    </div>
                                                )}
                                                {booking.preorder_summary && (
                                                    <button
                                                        onClick={() => setSelectedPreorder(booking.preorder_summary || '')}
                                                        className="mt-2 text-xs flex items-center text-brand-gold hover:text-brand-dark transition-colors font-medium"
                                                    >
                                                        <List className="h-3 w-3 mr-1" />
                                                        View Pre-order
                                                    </button>
                                                )}
                                            </div>

                                            {/* Mobile Actions */}
                                            {booking.status !== 'cancelled' && (
                                                <div className="flex space-x-2 pt-2">
                                                    <button
                                                        onClick={() => assignTable(booking.id)}
                                                        className="flex-1 flex items-center justify-center py-2 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                                                    >
                                                        <UserCheck className="h-4 w-4 mr-1.5" />
                                                        Assign Table
                                                    </button>

                                                    {booking.status === 'pending' && (
                                                        <button
                                                            onClick={() => updateStatus(booking.id, 'confirmed')}
                                                            className="flex-1 flex items-center justify-center py-2 bg-green-50 text-green-700 rounded-md text-xs font-medium"
                                                        >
                                                            <Check className="h-4 w-4 mr-1.5" />
                                                            Confirm
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => updateStatus(booking.id, 'cancelled')}
                                                        className="w-10 flex items-center justify-center py-2 bg-red-50 text-red-700 rounded-md"
                                                        title="Cancel"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {filteredBookings.length === 0 && !loading && (
                                        <div className="p-6 text-center text-gray-500 text-sm">No bookings found.</div>
                                    )}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
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
                                                                {booking.preorder_summary && (
                                                                    <button
                                                                        onClick={() => setSelectedPreorder(booking.preorder_summary || '')}
                                                                        className="mt-2 text-xs flex items-center bg-brand-gold text-white px-3 py-1.5 rounded-md hover:bg-brand-dark transition-colors font-medium shadow-sm"
                                                                    >
                                                                        <List className="h-3 w-3 mr-1.5" />
                                                                        View Pre-order
                                                                    </button>
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
                        </>
                    ) : (
                        <CalendarView
                            bookings={bookings}
                            onStatusUpdate={updateStatus}
                            onAssignTable={assignTable}
                            onViewPreorder={(summary) => setSelectedPreorder(summary)}
                        />
                    )}
                    {selectedPreorder && (
                        <PreOrderModal
                            content={selectedPreorder}
                            onClose={() => setSelectedPreorder(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default BookingManagementPage;
