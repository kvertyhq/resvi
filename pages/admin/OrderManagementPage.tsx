import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle, Truck, XCircle, Filter } from 'lucide-react';

interface Order {
    id: number;
    created_at: string;
    status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    total: number;
    customer_name?: string; // Assuming these might exist or be joined
    items_count?: number;
    order_type: 'delivery' | 'collection';
}

const OrderManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    useEffect(() => {
        if (selectedRestaurantId) {
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
        }
    }, [selectedRestaurantId]);

    const fetchOrders = async () => {
        setLoading(true);
        // Mock data for now as table structure might vary, but this simulates the fetch
        // const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

        // Simulated Data
        const mockOrders: Order[] = [
            { id: 1024, created_at: new Date().toISOString(), status: 'pending', total: 45.50, customer_name: 'John Doe', items_count: 3, order_type: 'delivery' },
            { id: 1023, created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: 'preparing', total: 22.00, customer_name: 'Jane Smith', items_count: 2, order_type: 'collection' },
            { id: 1022, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), status: 'ready', total: 68.90, customer_name: 'Bob Johnson', items_count: 5, order_type: 'delivery' },
            { id: 1021, created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: 'delivered', total: 34.20, customer_name: 'Alice Brown', items_count: 2, order_type: 'delivery' },
        ];

        setOrders(mockOrders);
        setLoading(false);
    };

    const updateStatus = async (id: number, newStatus: string) => {
        // await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        // Optimistic update for mock
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
    };

    const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

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
                                <span className="font-bold text-lg text-gray-900">#{order.id}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="text-gray-600 text-sm">
                                <span className="font-semibold">{order.customer_name}</span> • {order.items_count} items • <span className="font-semibold">£{order.total.toFixed(2)}</span>
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">{order.order_type}</span>
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
