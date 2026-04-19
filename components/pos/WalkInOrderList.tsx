import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { usePOS } from '../../context/POSContext';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Eye, CreditCard, Trash2, Printer, RotateCw, ChefHat, ChevronLeft, ChevronRight } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import { receiptService } from '../../services/ReceiptService';

interface WalkInOrderListProps {
    filter: 'active' | 'completed';
    onActiveCountChange?: (count: number) => void;
    onCountdownChange?: (seconds: number) => void;
}

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

const WalkInOrderList: React.FC<WalkInOrderListProps> = ({ filter, onActiveCountChange, onCountdownChange }) => {
    const { settings } = useSettings();
    const { showAlert, showConfirm } = useAlert();
    const navigate = useNavigate();

    const [orders, setOrders] = useState<WalkInOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCustomerDetails, setShowCustomerDetails] = useState<{ [key: string]: boolean }>({});
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [countdown, setCountdown] = useState(10);

    // Pagination & Filtering
    const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'custom' | 'all'>('today');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const ORDERS_PER_PAGE = 12;

    const fetchOrders = async (silent = false) => {
        if (!settings?.id) return;
        if (!silent) setLoading(true);
        try {
            const statusFilter = filter === 'active'
                ? ['pending', 'confirmed', 'preparing', 'ready']
                : ['completed', 'cancelled', 'served'];

            const from = filter === 'completed' ? (historyPage - 1) * ORDERS_PER_PAGE : 0;
            const to = filter === 'completed' ? from + ORDERS_PER_PAGE - 1 : 99;

            let query = supabase
                .from('orders')
                .select(`
                    *,
                    profiles!orders_user_id_fkey ( full_name, phone ),
                    order_items ( id, quantity, price_snapshot, name_snapshot ),
                    payments ( payment_method )
                `, { count: 'exact' })
                .eq('restaurant_id', settings?.id)
                .eq('order_type', 'takeaway')
                .in('status', statusFilter);

            if (filter === 'completed') {
                if (historyFilter === 'today') {
                    const start = startOfDay(new Date()).toISOString();
                    const end = endOfDay(new Date()).toISOString();
                    query = query.gte('created_at', start).lte('created_at', end);
                } else if (historyFilter === 'yesterday') {
                    const yesterday = subDays(new Date(), 1);
                    const start = startOfDay(yesterday).toISOString();
                    const end = endOfDay(yesterday).toISOString();
                    query = query.gte('created_at', start).lte('created_at', end);
                } else if (historyFilter === 'custom' && customDate) {
                    const date = new Date(customDate);
                    const start = startOfDay(date).toISOString();
                    const end = endOfDay(date).toISOString();
                    query = query.gte('created_at', start).lte('created_at', end);
                }
                query = query.order('created_at', { ascending: false }).range(from, to);
            } else {
                query = query.order('created_at', { ascending: false }).limit(100);
            }

            const { data, error, count } = await query;

            if (error) throw error;
            setOrders(data || []);
            if (filter === 'completed') {
                setHistoryTotal(count || 0);
            }
        } catch (error) {
            console.error('Error fetching walk-in orders:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (settings?.id) {
            fetchOrders();
            const subscription = supabase
                .channel('walkin_orders_list')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `order_type=eq.takeaway`
                }, () => fetchOrders(true))
                .subscribe();

            return () => { subscription.unsubscribe(); };
        }
    }, [settings?.id, filter, historyFilter, historyPage, customDate]);

    useEffect(() => {
        if (filter !== 'active') return;
        const interval = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [filter]);

    useEffect(() => {
        if (onCountdownChange) onCountdownChange(countdown);
        if (countdown === 10 && filter === 'active') {
            fetchOrders(true);
        }
    }, [countdown, filter, onCountdownChange]);

    useEffect(() => {
        if (filter === 'active' && onActiveCountChange) {
            onActiveCountChange(orders.length);
        }
    }, [orders.length, filter, onActiveCountChange]);

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

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);
            if (error) throw error;
            fetchOrders();
        } catch (error) {
            showAlert('Error', 'Failed to update order status', 'error');
        }
    };

    const viewOrderDetails = async (orderId: string) => {
        try {
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
                        excluded_toppings,
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
            showAlert('Error', 'Failed to load order details', 'error');
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* List Controls */}
            <div className="flex justify-start mb-4">
                {filter === 'active' && (
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                        <span>Refreshing in <span className="font-bold text-blue-600">{countdown}s</span></span>
                    </div>
                )}
            </div>

            {filter === 'completed' && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                            {['all', 'today', 'yesterday', 'custom'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => { setHistoryFilter(f as any); setHistoryPage(1); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${historyFilter === f ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {f.charAt(0) + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        {historyFilter === 'custom' && (
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => { setCustomDate(e.target.value); setHistoryPage(1); }}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium outline-none"
                            />
                        )}
                        <button
                            onClick={() => fetchOrders()}
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                            title="Refresh"
                        >
                            <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            )}

            {/* Orders Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50">
                    <Eye size={48} className="mb-4" />
                    <p className="text-lg font-medium">No {filter} orders found</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                                            #{order.daily_order_number || order.readable_id || order.id.slice(0, 8)}
                                        </div>
                                        <div className="text-xs text-gray-500">{format(new Date(order.created_at), 'HH:mm')}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Customer</span>
                                        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                                            {order.profiles?.full_name || 'Guest'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {settings?.currency || '£'}{order.total_amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {filter === 'active' && order.status !== 'completed' && (
                                        <button
                                            onClick={() => updateOrderStatus(order.id, 'completed')}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm"
                                        >
                                            Complete
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => viewOrderDetails(order.id)}
                                            className="flex-1 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                        {order.payment_status !== 'paid' && (
                                            <button
                                                onClick={() => navigate(`/pos/payment/${order.id}`)}
                                                className="flex-1 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                            >
                                                <CreditCard size={14} /> Pay
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => receiptService.printOrder(order.id, settings?.id, true, order.payments?.[0]?.payment_method, showAlert)}
                                            className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                        >
                                            <Printer size={14} />
                                        </button>
                                        <button
                                            onClick={() => receiptService.printKitchenTickets(order.id, settings?.id, undefined, showAlert)}
                                            className="flex-1 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
                                        >
                                            <ChefHat size={14} /> KOT
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {filter === 'completed' && Math.ceil(historyTotal / ORDERS_PER_PAGE) > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                disabled={historyPage === 1}
                                onClick={() => setHistoryPage(p => p - 1)}
                                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-bold">Page {historyPage} of {Math.ceil(historyTotal / ORDERS_PER_PAGE)}</span>
                            <button
                                disabled={historyPage >= Math.ceil(historyTotal / ORDERS_PER_PAGE)}
                                onClick={() => setHistoryPage(p => p + 1)}
                                className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <OrderDetailsModal
                isOpen={showOrderModal}
                onClose={() => { setShowOrderModal(false); setSelectedOrder(null); }}
                order={selectedOrder}
                currency={settings?.currency || '£'}
            />
        </div>
    );
};

export default WalkInOrderList;
