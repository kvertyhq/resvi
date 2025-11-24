import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle, Truck, XCircle, Filter } from 'lucide-react';

interface Order {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    total_amount: number;
    payment_status: 'unpaid' | 'paid' | 'refunded';
    order_type: 'delivery' | 'collection';
    restaurant_id: string;
    delivery_address_id: string | null;
    scheduled_time: string | null;
    notes: string | null;
    metadata: {
        subtotal: number;
        tax: number;
        delivery_fee: number;
    };
    profiles?: {
        full_name: string | null;
        phone: string | null;
    };
}

const OrderManagementPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        fetchOrders();

        // Realtime Subscription
        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Realtime update:', payload);
                fetchOrders(); // Refresh list on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const restaurantId = import.meta.env.VITE_RESTAURANT_ID;
            console.log('Fetching orders for restaurant ID:', restaurantId, '(from env variable)');

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        phone
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching orders:', error);
                setOrders([]);
            } else {
                console.log('Fetched', data?.length || 0, 'orders for restaurant', restaurantId);
                setOrders(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) {
                console.error('Error updating order status:', error);
                alert('Failed to update order status');
            } else {
                // Optimistic update
                setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
            }
        } catch (err) {
            console.error('Failed to update order:', err);
            alert('Failed to update order status');
        }
    };

    const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

    // Helper function to parse notes field
    const parseNotesField = (notesString: string | null) => {
        if (!notesString) return { address: null, notes: null };

        const addressMatch = notesString.match(/Address:\s*(.+?)(?=\nNotes:|$)/s);
        const notesMatch = notesString.match(/Notes:\s*(.+?)$/s);

        const address = addressMatch?.[1]?.trim() || null;
        const notes = notesMatch?.[1]?.trim() || null;

        return {
            address: address && address !== '' ? address : null,
            notes: notes && notes !== '' ? notes : null
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-purple-100 text-purple-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Order Management</h2>
                <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-gold focus:border-brand-gold"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="font-bold text-lg text-gray-900">#{order.id.substring(0, 8)}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                    order.payment_status === 'refunded' ? 'bg-gray-100 text-gray-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                    {order.payment_status}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="text-gray-600 text-sm space-y-1">
                                <div>
                                    <span className="font-semibold">{order.profiles?.full_name || 'Guest'}</span>
                                    {order.profiles?.phone && <span className="ml-2 text-gray-500">• {order.profiles.phone}</span>}
                                </div>
                                <div>
                                    <span className="font-semibold">Total: £{order.total_amount.toFixed(2)}</span>
                                    <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">{order.order_type}</span>
                                    {order.scheduled_time && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            Scheduled: {new Date(order.scheduled_time).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Subtotal: £{order.metadata.subtotal.toFixed(2)} •
                                    Tax: £{order.metadata.tax.toFixed(2)}
                                    {order.metadata.delivery_fee > 0 && ` • Delivery: £${order.metadata.delivery_fee.toFixed(2)}`}
                                </div>
                                {(() => {
                                    const { address, notes } = parseNotesField(order.notes);
                                    return (
                                        <>
                                            {order.order_type === 'delivery' && (
                                                <div className="text-xs mt-1">
                                                    <span className="font-medium text-gray-700">Address: </span>
                                                    <span className="text-gray-600">
                                                        {address || <span className="italic text-gray-400">Not available</span>}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-xs mt-1">
                                                <span className="font-medium text-gray-700">Notes: </span>
                                                <span className="text-gray-600 italic">
                                                    {notes || <span className="text-gray-400">Not applicable</span>}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 flex items-center space-x-2">
                            {order.status === 'pending' && (
                                <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Start Preparing
                                </button>
                            )}
                            {order.status === 'preparing' && (
                                <button onClick={() => updateStatus(order.id, 'ready')} className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
                                    Mark Ready
                                </button>
                            )}
                            {order.status === 'ready' && (
                                <button onClick={() => updateStatus(order.id, 'delivered')} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                                    Complete Order
                                </button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <button onClick={() => updateStatus(order.id, 'cancelled')} className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {filteredOrders.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                        No orders found matching the selected filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderManagementPage;
