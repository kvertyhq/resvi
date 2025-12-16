import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle, Truck, XCircle, Filter, Eye, X, RefreshCcw } from 'lucide-react';

interface OrderItem {
    id: string;
    menu_item_id: string;
    name_snapshot: string;
    price_snapshot: number;
    quantity: number;
    selected_addons: {
        id: string;
        name: string;
        price: number;
    }[];
}

interface Order {
    id: string;
    readable_id: number;
    user_id: string;
    created_at: string;
    updated_at: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'completed' | 'cancelled';
    total_amount: number;
    payment_status: 'unpaid' | 'paid' | 'refunded';
    order_type: 'delivery' | 'collection';
    restaurant_id: string;
    delivery_address_id: string | null;
    scheduled_time: string | null;
    payment_method: string | null; // Added
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
    order_items: OrderItem[];
}

import useAutoRefresh from '../../hooks/useAutoRefresh';

const OrderManagementPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrders = async () => {
        // Don't set loading to true on background refreshes if we have data, to avoid flicker
        // But for initial load or manual refresh we might want it.
        // For now let's keep it simple, but maybe avoid full loader if orders.length > 0
        if (orders.length === 0) setLoading(true);

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
                    ),
                    order_items (
                        id,
                        menu_item_id,
                        name_snapshot,
                        price_snapshot,
                        quantity,
                        selected_addons
                    )
                `)
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching orders:', error);
                // setOrders([]); // Don't clear orders on error, keep stale data
            } else {
                console.log('Fetched', data?.length || 0, 'orders for restaurant', restaurantId);

                // Play sound if new orders are found (and it's not the initial empty state)
                if (data && data.length > 0 && orders.length > 0) {
                    const currentIds = new Set(orders.map(o => o.id));
                    const newOrders = data.filter(o => !currentIds.has(o.id));

                    if (newOrders.length > 0) {
                        console.log('New orders detected:', newOrders.length);
                        playNotificationSound();
                    }
                }

                setOrders(data || []);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
            // setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto Refresh
    const { timeLeft } = useAutoRefresh(fetchOrders, 15000);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        fetchOrders();

        // Realtime Subscription
        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                console.log('New order received:', payload);
                playNotificationSound();
                fetchOrders();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Order updated:', payload);
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.log("Audio play failed (user interaction required):", error);
            });
        }
    };

    const handleRefresh = () => {
        fetchOrders();
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

    const markAsPaid = async (id: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid' })
                .eq('id', id);

            if (error) {
                console.error('Error updating payment status:', error);
                alert('Failed to mark as paid');
            } else {
                // Optimistic update
                setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: 'paid' } : o));
                if (selectedOrder && selectedOrder.id === id) {
                    setSelectedOrder({ ...selectedOrder, payment_status: 'paid' });
                }
            }
        } catch (err) {
            console.error('Failed to update payment status:', err);
            alert('Failed to mark as paid');
        }
    };

    const openOrderDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
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
            case 'confirmed': return 'bg-cyan-100 text-cyan-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatStatus = (status: string) => {
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getOrderProgress = (order: Order) => {
        const deliverySteps = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed'];
        const collectionSteps = ['pending', 'confirmed', 'preparing', 'completed'];

        const steps = order.order_type === 'delivery' ? deliverySteps : collectionSteps;
        const currentIndex = steps.indexOf(order.status);

        return steps.map((step, index) => ({
            name: formatStatus(step),
            status: order.status === 'cancelled' ? 'cancelled' :
                index < currentIndex ? 'completed' :
                    index === currentIndex ? 'current' : 'upcoming'
        }));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-4">
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Order Management</h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">Refreshing in {timeLeft}s</span>
                        <button
                            onClick={handleRefresh}
                            className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold"
                            title="Refresh Orders"
                        >
                            <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-gold focus:border-brand-gold"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="font-bold text-lg text-gray-900">#{order.readable_id}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                    {formatStatus(order.status)}
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
                                    {order.payment_method && (
                                        <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded uppercase border border-blue-100">
                                            {order.payment_method}
                                        </span>
                                    )}
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

                                {/* Order Progress Indicator */}
                                {order.status !== 'cancelled' && (
                                    <div className="mt-3 mb-2">
                                        <div className="flex items-center justify-between">
                                            {getOrderProgress(order).map((step, index, array) => (
                                                <React.Fragment key={step.name}>
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${step.status === 'completed' ? 'bg-green-500 text-white' :
                                                            step.status === 'current' ? 'bg-blue-500 text-white' :
                                                                'bg-gray-200 text-gray-500'
                                                            }`}>
                                                            {step.status === 'completed' ? '✓' : index + 1}
                                                        </div>
                                                        <div className={`mt-1 text-xs text-center max-w-[80px] ${step.status === 'current' ? 'font-semibold text-blue-600' :
                                                            step.status === 'completed' ? 'text-green-600' :
                                                                'text-gray-400'
                                                            }`}>
                                                            {step.name}
                                                        </div>
                                                    </div>
                                                    {index < array.length - 1 && (
                                                        <div className={`flex-1 h-0.5 mx-2 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                                                            }`} />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                )}

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

                        <div className="mt-4 md:mt-0 flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:space-x-2">
                            {/* Mark as Paid Button */}
                            {order.payment_method === 'cash' && order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                                <button
                                    onClick={() => markAsPaid(order.id)}
                                    className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-green-200"
                                >
                                    Mark as Paid
                                </button>
                            )}

                            <button
                                onClick={() => openOrderDetails(order)}
                                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View Items
                            </button>

                            {order.status === 'pending' && (
                                <button onClick={() => updateStatus(order.id, 'confirmed')} className="bg-cyan-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-cyan-700 transition-colors">
                                    Confirm Order
                                </button>
                            )}
                            {order.status === 'confirmed' && (
                                <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Start Preparing
                                </button>
                            )}
                            {order.status === 'preparing' && order.order_type === 'delivery' && (
                                <button onClick={() => updateStatus(order.id, 'out_for_delivery')} className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
                                    Out for Delivery
                                </button>
                            )}
                            {order.status === 'preparing' && order.order_type === 'collection' && (
                                <button onClick={() => updateStatus(order.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                                    Mark as Ready
                                </button>
                            )}
                            {order.status === 'out_for_delivery' && (
                                <button onClick={() => updateStatus(order.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                                    Complete Order
                                </button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'completed' && (
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

            {/* Order Details Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Order #{selectedOrder.readable_id} Details</h3>
                                <p className="text-sm text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-6">
                                {/* Items List */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3">Ordered Items</h4>
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedOrder.order_items?.map((item, idx) => {
                                                    const addonsTotal = item.selected_addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                                                    const itemTotal = (item.price_snapshot + addonsTotal) * item.quantity;

                                                    return (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.quantity}x</td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                <div className="font-medium">{item.name_snapshot}</div>
                                                                {item.selected_addons && item.selected_addons.length > 0 && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {item.selected_addons.map((addon, i) => (
                                                                            <span key={i} className="block">
                                                                                + {addon.name} (£{addon.price.toFixed(2)})
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">
                                                                £{item.price_snapshot.toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                                                                £{itemTotal.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span className="font-medium">£{selectedOrder.metadata.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Tax</span>
                                        <span className="font-medium">£{selectedOrder.metadata.tax.toFixed(2)}</span>
                                    </div>
                                    {selectedOrder.metadata.delivery_fee > 0 && (
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Delivery Fee</span>
                                            <span className="font-medium">£{selectedOrder.metadata.delivery_fee.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-bold text-gray-900 mt-3 pt-3 border-t border-gray-200">
                                        <span>Total</span>
                                        <span>£{selectedOrder.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Customer & Note Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</h5>
                                        <p className="text-sm font-medium">{selectedOrder.profiles?.full_name || 'Guest'}</p>
                                        <p className="text-sm text-gray-600">{selectedOrder.profiles?.phone}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-md">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Order Info</h5>
                                        <p className="text-sm"><span className="text-gray-500">Type:</span> {selectedOrder.order_type}</p>
                                        <p className="text-sm"><span className="text-gray-500">Payment:</span> {selectedOrder.payment_status}</p>
                                        {selectedOrder.payment_method && (
                                            <p className="text-sm"><span className="text-gray-500">Method:</span> <span className="uppercase">{selectedOrder.payment_method}</span></p>
                                        )}
                                    </div>
                                </div>

                                {selectedOrder.notes && (
                                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100">
                                        <h5 className="text-xs font-semibold text-yellow-800 uppercase mb-1">Notes</h5>
                                        <p className="text-sm text-yellow-900">{selectedOrder.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManagementPage;
