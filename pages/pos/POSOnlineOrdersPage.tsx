import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { usePOS } from '../../context/POSContext';
import { useAlert } from '../../context/AlertContext';
import { Clock, Check, X, Printer, RefreshCw, ShoppingBag, Eye, ChefHat } from 'lucide-react';
import { format } from 'date-fns';
import { receiptService } from '../../services/ReceiptService';
import OrderDetailsModal from '../../components/pos/OrderDetailsModal';

interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    price_snapshot?: number;
    menu_item?: { name: string };
    custom_item_name?: string;
    name_snapshot?: string;
    modifiers: any[];
    notes?: string;
}

interface Order {
    id: string;
    daily_order_number: number;
    created_at: string;
    status: string;
    payment_status: string;
    total_amount: number;
    order_type: string;
    source: string;
    metadata: any;
    order_items: OrderItem[];
    user_id?: string;
    profiles?: { full_name: string; phone: string };
}

const POSOnlineOrdersPage: React.FC = () => {
    const { settings } = useSettings();
    const { staff } = usePOS();
    const { showAlert, showConfirm } = useAlert();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(15);
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const fetchOrders = async () => {
        if (!settings?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        menu_item: menu_items(name)
                    ),
                    profiles:user_id (full_name, phone)
                `)
                .eq('restaurant_id', settings.id)
                .in('source', ['online', 'qr'])
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching online orders:', error);
            showAlert('Error', 'Failed to fetch online orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    fetchOrders();
                    return 30; // reset to 30
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [settings?.id]); // Rebind if settings change

    useEffect(() => {
        fetchOrders();

        if (!settings?.id) return;

        // Realtime subscription for updates
        const channel = supabase.channel('pos_online_orders_page')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `restaurant_id=eq.${settings.id}`
            }, (payload) => {
                const newRow = payload.new as any;
                const oldRow = payload.old as any;
                if (['online', 'qr'].includes(newRow?.source || oldRow?.source)) {
                    fetchOrders(); // Refresh everything to ensure consistency with items
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [settings?.id]);

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setActionLoading(orderId);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            showAlert('Success', `Order marked as ${newStatus}`, 'success');
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            showAlert('Error', 'Failed to update order status', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAcceptOrder = async (order: Order) => {
        await updateOrderStatus(order.id, 'preparing');
        // Optional: Print automatically upon accepting?
        // await receiptService.printOrder(order.id, settings.id, false, null, showAlert);
    };

    const handleCancelOrder = async (orderId: string) => {
        const confirmed = await showConfirm(
            'Cancel Order?',
            'Are you sure you want to cancel this online order? If the customer has paid, this action will currently not do an automatic refund from the POS.',
            'warning'
        );
        if (confirmed) {
            await updateOrderStatus(orderId, 'cancelled');
        }
    };

    const handlePrintOrder = async (orderId: string) => {
        if (!settings?.id) return;
        setActionLoading(`print-${orderId}`);
        try {
            await receiptService.printOrder(orderId, settings.id, false, null, showAlert);
        } catch (error) {
            console.error('Failed to print', error);
        } finally {
            setActionLoading(null);
        }
    };


    const formatTimeSince = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000); // in minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}h ${mins}m ago`;
    };

    const renderStepper = (status: string) => {
        const steps = [
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'preparing', label: 'Preparing' },
            { id: 'ready', label: 'Ready' }
        ];

        let currentIndex = steps.findIndex(s => s.id === status);
        if (['completed', 'collected'].includes(status)) currentIndex = steps.length;

        return (
            <div className="px-5 pb-6 pt-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20">
                {status === 'cancelled' ? (
                    <div className="text-red-500 font-bold text-xs text-center uppercase tracking-wider flex items-center justify-center gap-2">
                        <X size={14} /> Order Cancelled
                    </div>
                ) : (
                    <div className="flex items-center justify-between relative mt-2 mb-1">
                        <div className="absolute left-0 top-1/2 -mt-[1px] w-full h-[3px] bg-gray-200 dark:bg-gray-700 rounded-full z-0"></div>
                        <div className="absolute left-0 top-1/2 -mt-[1px] h-[3px] bg-green-500 rounded-full z-0 transition-all duration-300" 
                             style={{ width: `${Math.min(100, Math.max(0, (currentIndex / (steps.length - 1)) * 100))}%` }}></div>
                        
                        {steps.map((step, idx) => {
                            const isCompleted = idx <= currentIndex;
                            const isCurrent = idx === currentIndex || (status === 'pending' && idx === 0);
                            
                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5 px-1 bg-white dark:bg-gray-800 outline outline-4 outline-white dark:outline-gray-800 rounded-full">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shadow-sm ${
                                        isCompleted 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-400'
                                    }`}>
                                        {isCompleted ? <Check size={14} strokeWidth={3} /> : (idx + 1)}
                                    </div>
                                    <span className={`absolute -bottom-5 whitespace-nowrap text-[9px] uppercase tracking-wider font-bold ${
                                        isCurrent ? 'text-green-600' : (isCompleted ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400')
                                    }`}>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderOrderCard = (order: Order) => (
        <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col mb-4">
            <div className={`p-4 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-start ${order.status === 'pending' ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                            #{order.daily_order_number || order.id.slice(0, 4)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            {order.order_type.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={14} /> {format(new Date(order.created_at), 'HH:mm')} ({formatTimeSince(order.created_at)})
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-lg text-gray-900 dark:text-white" style={{ color: 'var(--theme-color)' }}>
                        {settings?.currency_symbol || '£'}{order.total_amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{order.source}</div>
                </div>
            </div>

            {renderStepper(order.status)}

            <div className="p-4 flex-1">
                <ul className="space-y-2 mb-4">
                    {order.order_items?.map((item, idx) => (
                        <li key={item.id || idx} className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <span className="font-medium">{item.quantity}x</span> {item.menu_item?.name || item.custom_item_name || item.name_snapshot || 'Item'}
                                    {item.notes && <div className="text-xs text-orange-600 italic ml-4 mt-0.5">Note: {item.notes}</div>}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <div className="text-xs text-gray-500 ml-4 mt-0.5">
                                            {item.modifiers.length} mod(s)
                                        </div>
                                    )}
                                </div>
                                <span className="font-medium shrink-0">
                                    {settings?.currency_symbol}
                                    {((item.price_snapshot || item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50 flex gap-2">
                {order.status === 'pending' && (
                    <>
                        <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={actionLoading === order.id}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200 dark:border-red-900/30 font-medium"
                            title="Reject Order"
                        >
                            <X size={20} />
                        </button>
                        <button
                            onClick={() => handleAcceptOrder(order)}
                            disabled={actionLoading === order.id}
                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> Accept & Prep
                        </button>
                    </>
                )}
                {['confirmed', 'preparing'].includes(order.status) && (
                    <>
                        <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            disabled={actionLoading === order.id}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-colors"
                        >
                            Mark Ready
                        </button>
                    </>
                )}
                {['ready'].includes(order.status) && (
                    <>
                        <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={actionLoading === order.id}
                            className="flex-1 py-2 px-4 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-bold shadow-sm hover:bg-gray-900 transition-colors"
                        >
                            Mark Collected
                        </button>
                    </>
                )}
                <button
                    onClick={() => handlePrintOrder(order.id)}
                    disabled={actionLoading === `print-${order.id}`}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 shrink-0"
                    title="Print Receipt"
                >
                    <Printer size={20} />
                </button>
                <button
                    onClick={() => receiptService.printKitchenTickets(order.id, settings?.id, undefined, showAlert)}
                    className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors border border-orange-200 dark:border-orange-800/50 shrink-0"
                    title="Print Kitchen Ticket (KOT)"
                >
                    <ChefHat size={20} />
                </button>
                <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 shrink-0"
                    title="View Details"
                >
                    <Eye size={20} />
                </button>
            </div>
        </div>
    );

    const activeOrders = orders.filter(o => !['completed', 'collected', 'cancelled'].includes(o.status));
    const historyOrders = orders.filter(o => ['completed', 'collected', 'cancelled'].includes(o.status));

    const pendingOrders = activeOrders.filter(o => o.status === 'pending');
    const preparingOrders = activeOrders.filter(o => ['confirmed', 'preparing'].includes(o.status));
    const completedOrders = activeOrders.filter(o => ['ready'].includes(o.status));

    return (
        <>
            <OrderDetailsModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                currency={settings?.currency_symbol || '£'}
            />
            <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
                {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex justify-between items-center shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800" style={{ color: 'var(--theme-color)' }}>
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">Online Orders</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage incoming web & QR orders</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-xl flex mr-2 sm:mr-4">
                        <button 
                            onClick={() => setViewMode('active')}
                            className={`px-3 py-1.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${viewMode === 'active' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Active
                        </button>
                        <button 
                            onClick={() => setViewMode('history')}
                            className={`px-3 py-1.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${viewMode === 'history' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            History <span className="hidden sm:inline-flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 rounded-full text-[10px]">{historyOrders.length}</span>
                        </button>
                    </div>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 hidden lg:inline-block whitespace-nowrap">
                        Auto-refresh in {timeLeft}s
                    </span>
                    <button
                        onClick={() => { fetchOrders(); setTimeLeft(30); }}
                        disabled={loading}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
                        title="Force Refresh"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            {viewMode === 'active' ? (
                <div className="flex-1 overflow-x-hidden lg:overflow-x-auto overflow-y-auto lg:overflow-y-hidden p-4 sm:p-6 custom-scrollbar">
                    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-full min-w-full pb-20 lg:pb-0">

                        {/* Column 1: New / Pending */}
                        <div className="flex flex-col w-full lg:flex-1 lg:min-w-[300px] h-auto lg:h-full">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    New
                                    <span className={`text-white text-xs px-2 py-0.5 rounded-full ${pendingOrders.length > 0 ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                        {pendingOrders.length}
                                    </span>
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-visible lg:overflow-y-auto pr-2 hide-scrollbar lg:pb-24">
                                {pendingOrders.map(renderOrderCard)}
                                {pendingOrders.length === 0 && (
                                    <div className="text-center p-8 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        No new orders
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Preparing */}
                        <div className="flex flex-col w-full lg:flex-1 lg:min-w-[300px] h-auto lg:h-full">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">Preparing</h2>
                                <span className={`text-white text-xs px-2 py-0.5 rounded-full ${preparingOrders.length > 0 ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                    {preparingOrders.length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-visible lg:overflow-y-auto pr-2 hide-scrollbar lg:pb-24">
                                {preparingOrders.map(renderOrderCard)}
                                {preparingOrders.length === 0 && (
                                    <div className="text-center p-8 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        Nothing preparing
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 3: Ready / Completed */}
                        <div className="flex flex-col w-full lg:flex-1 lg:min-w-[300px] h-auto lg:h-full">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">Handled</h2>
                            </div>
                            <div className="flex-1 overflow-y-visible lg:overflow-y-auto pr-2 hide-scrollbar lg:pb-24">
                                {completedOrders.map(renderOrderCard)}
                                {completedOrders.length === 0 && (
                                    <div className="text-center p-8 text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        No completed orders yet
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-6 pb-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-end">
                            <div>
                                <h2 className="font-bold text-xl text-gray-800 dark:text-gray-200">Order History</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Recently completed, collected, and cancelled orders</p>
                            </div>
                        </div>
                        {historyOrders.length === 0 ? (
                            <div className="text-center p-12 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No History Available</h3>
                                <p className="text-sm mt-1">Completed orders will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                                {historyOrders.map(renderOrderCard)}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>
        </>
    );
};

export default POSOnlineOrdersPage;
