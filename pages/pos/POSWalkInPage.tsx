import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { usePOS } from '../../context/POSContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, CreditCard, Trash2, Printer, Pause } from 'lucide-react';
import OrderDetailsModal from '../../components/pos/OrderDetailsModal';
import HeldOrdersModal from '../../components/pos/HeldOrdersModal';
import NotificationModal from '../../components/pos/NotificationModal';
import { receiptService } from '../../services/ReceiptService';

interface WalkInOrder {
    id: string;
    readable_id?: string;
    daily_order_number?: number;
    created_at: string;
    total_amount: number;
    status: string;
    payment_status: string;
    user_id: string | null;
    profiles?: {
        full_name: string;
        phone: string;
    };
    order_items?: any[];
    payments?: {
        payment_method: string;
    }[];
}

const POSWalkInPage: React.FC = () => {
    const { settings } = useSettings();
    const { staff } = usePOS();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<WalkInOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'active' | 'completed'>('active');
    const [showCustomerDetails, setShowCustomerDetails] = useState<{ [key: string]: boolean }>({});
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [countdown, setCountdown] = useState(10);

    // Held Orders
    const [heldOrders, setHeldOrders] = useState<any[]>([]);
    const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

    // Notification Modal
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');

    const fetchHeldOrders = async () => {
        if (!settings?.id) return;
        try {
            const { data } = await supabase.rpc('get_held_orders', {
                p_restaurant_id: settings.id
            });
            setHeldOrders(data || []);
        } catch (error) {
            console.error('Error fetching held orders:', error);
        }
    };

    useEffect(() => {
        if (settings?.id) {
            fetchOrders();
            fetchHeldOrders();

            // Subscribe to changes
            const subscription = supabase
                .channel('walkin_orders')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `order_type=eq.takeaway`
                }, () => fetchOrders(true))
                .subscribe();

            return () => { subscription.unsubscribe(); };
        }
    }, [settings?.id, filter]);

    // Auto-refresh every 10 seconds (only on Active tab)
    useEffect(() => {
        if (filter !== 'active') return; // Only auto-refresh on active tab

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    fetchOrders(true); // Silent refresh
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [filter]); // Reset when filter changes

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const statusFilter = filter === 'active'
                ? ['pending', 'confirmed', 'preparing', 'ready']
                : ['completed', 'cancelled'];

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    profiles!orders_user_id_fkey ( full_name, phone ),
                    order_items ( id, quantity, price_snapshot, name_snapshot ),
                    payments ( payment_method )
                `)
                .eq('restaurant_id', settings?.id)
                .eq('order_type', 'takeaway')
                .in('status', statusFilter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching walk-in orders:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
            preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
            completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const deleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order?')) return;

        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            alert('Failed to delete order');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            alert('Failed to update order status');
        }
    };

    const viewOrderDetails = async (orderId: string) => {
        try {
            // Fetch full order details with items
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    daily_order_number,
                    profiles!orders_user_id_fkey ( full_name, phone ),
                    order_items (
                        id,
                        quantity,
                        price_snapshot,
                        name_snapshot,
                        selected_modifiers,
                        notes,
                        menu_item:menu_items ( name )
                    )
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;
            setSelectedOrder(data);
            setShowOrderModal(true);
        } catch (error) {
            console.error('Error fetching order details:', error);
            alert('Failed to load order details');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Walk-In Orders</h1>
                        {filter === 'active' && (
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                                {orders.length}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage takeaway and counter orders</p>
                    {filter === 'active' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Auto-refresh in {countdown}s •{' '}
                            <button
                                onClick={() => {
                                    fetchOrders();
                                    setCountdown(10);
                                }}
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
                            >
                                Refresh now
                            </button>
                        </p>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto pt-3">
                    <button
                        onClick={async () => {
                            await fetchHeldOrders();
                            setShowHeldOrdersModal(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors font-medium shadow-md relative"
                    >
                        <Pause className="h-5 w-5" />
                        <span>Held Orders</span>
                        {heldOrders.length > 0 && (
                            <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                                {heldOrders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/pos/order/walk-in')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-md"
                    >
                        <Plus className="h-5 w-5" />
                        <span>New Walk-In Order</span>
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                        }`}
                >
                    Active Orders
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                        }`}
                >
                    Completed
                </button>
            </div>

            {/* Orders Grid */}
            {loading ? (
                <div className="flex items-center justify-center flex-1">
                    <div className="text-gray-500 dark:text-gray-400">Loading orders...</div>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-lg font-medium">No {filter} walk-in orders</p>
                    <p className="text-sm">Create a new order to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
                        >
                            {/* Order Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                                            Order #{order.daily_order_number || order.readable_id || order.id.slice(0, 8)}
                                        </div>
                                        {(order.profiles?.full_name || order.profiles?.phone) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCustomerDetails(prev => ({
                                                        ...prev,
                                                        [order.id]: !prev[order.id]
                                                    }));
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="View customer details"
                                            >
                                                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </button>
                                        )}
                                    </div>
                                    {showCustomerDetails[order.id] && (order.profiles?.full_name || order.profiles?.phone) && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-1">
                                            {order.profiles.full_name} {order.profiles.phone ? `(${order.profiles.phone})` : ''}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {new Date(order.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>

                            {/* Order Details */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Items:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Total:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        £{order.total_amount.toFixed(2)}
                                    </span>
                                </div>
                                {order.payment_status && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                                        <span className={`font-medium capitalize ${order.payment_status === 'paid'
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-yellow-600 dark:text-yellow-400'
                                            }`}>
                                            {order.payment_status}
                                            {order.payment_status === 'paid' && order.payments?.[0]?.payment_method && (
                                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                                    ({order.payments[0].payment_method.replace('_', ' ')})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                {/* Mark as Complete - Only for active orders that aren't completed */}
                                {filter === 'active' && order.status !== 'completed' && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, 'completed')}
                                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors font-medium"
                                    >
                                        Mark as Complete
                                    </button>
                                )}

                                {/* View/Pay Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => viewOrderDetails(order.id)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                        title="View Order Details"
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span>View</span>
                                    </button>
                                    {order.payment_status !== 'paid' && (
                                        <button
                                            onClick={() => navigate(`/pos/payment/${order.id}`)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                                            title="Process Payment"
                                        >
                                            <CreditCard className="h-4 w-4" />
                                            <span>Pay</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            receiptService.printOrder(order.id);
                                        }}
                                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-sm transition-colors flex items-center justify-center"
                                        title="Print Receipt"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Cancel/Delete button */}
                                {filter === 'active' && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Cancel this order?')) {
                                                updateOrderStatus(order.id, 'cancelled');
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors font-medium"
                                        title="Cancel Order"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Cancel</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Details Modal */}
            <OrderDetailsModal
                isOpen={showOrderModal}
                onClose={() => {
                    setShowOrderModal(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
            />

            {/* Held Orders Modal */}
            <HeldOrdersModal
                isOpen={showHeldOrdersModal}
                onClose={() => setShowHeldOrdersModal(false)}
                heldOrders={heldOrders}
                onRetrieve={async (heldOrder) => {
                    try {
                        // Delete held order from database
                        await supabase.rpc('delete_held_order', {
                            p_held_order_id: heldOrder.id
                        });

                        // Navigate to walk-in order page with held order data
                        navigate('/pos/order/walk-in', {
                            state: { heldOrder }
                        });
                    } catch (error) {
                        console.error('Error retrieving held order:', error);
                        setNotificationType('error');
                        setNotificationTitle('Failed to Retrieve Order');
                        setNotificationMessage('Please try again.');
                        setShowNotification(true);
                    }
                }}
            />

            {/* Notification Modal */}
            <NotificationModal
                isOpen={showNotification}
                onClose={() => setShowNotification(false)}
                type={notificationType}
                title={notificationTitle}
                message={notificationMessage}
            />
        </div>
    );
};

export default POSWalkInPage;
