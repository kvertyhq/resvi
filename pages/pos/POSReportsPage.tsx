import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { Clock, Filter, Eye, X, ArrowLeft, RefreshCcw, Search, Calendar, DollarSign, ShoppingBag, BarChart3, ChevronDown, ChevronRight, Loader2, Printer } from 'lucide-react';
import { receiptService } from '../../services/ReceiptService';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, startOfMonth, endOfDay, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';

interface OrderItem {
    id: string;
    quantity: number;
    name_snapshot: string;
    price_snapshot: number;
    selected_addons: any[];
}

interface Order {
    id: string;
    readable_id: string;
    daily_order_number?: number;
    created_at: string;
    status: string;
    total_amount: number;
    payment_status: string;
    order_type: 'dine_in' | 'walk_in' | 'takeaway' | 'delivery';
    payment_method: string | null;
    table_info?: { table_name: string };
    order_items: OrderItem[];
}

const PAGE_SIZE = 20;

const POSReportsPage: React.FC = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filter State
    const [activeTab, setActiveTab] = useState<'dine_in' | 'walk_in'>('dine_in');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // Stats State (Independent of filters)
    const [dayStats, setDayStats] = useState({ revenue: 0, count: 0 });
    const [monthStats, setMonthStats] = useState({ revenue: 0, count: 0 });

    // Modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Initial Load & Stats
    useEffect(() => {
        if (settings?.id) {
            fetchStats();
            // Reset and fetch list
            setPage(0);
            setOrders([]);
            fetchOrders(0, true);
        }
    }, [settings?.id, activeTab, startDate, endDate]);

    const fetchStats = async () => {
        try {
            const today = new Date();
            const startMonth = startOfMonth(today).toISOString();
            const endMonth = endOfMonth(today).toISOString();
            const startDay = startOfDay(today).toISOString();
            const endDay = endOfDay(today).toISOString();

            // Fetch basic stats for Day and Month (all types combined or filtered? Usually Dashboard stats are global)
            // Let's make them global for the POS "Pulse"
            const { data: statsData } = await supabase
                .from('orders')
                .select('total_amount, created_at')
                .eq('restaurant_id', settings?.id)
                .gte('created_at', startMonth)
                .lte('created_at', endMonth)
                .neq('status', 'cancelled');

            if (statsData) {
                let dayRev = 0, dayCnt = 0, monthRev = 0, monthCnt = 0;

                statsData.forEach(o => {
                    monthRev += o.total_amount;
                    monthCnt++;

                    if (o.created_at >= startDay && o.created_at <= endDay) {
                        dayRev += o.total_amount;
                        dayCnt++;
                    }
                });

                setDayStats({ revenue: dayRev, count: dayCnt });
                setMonthStats({ revenue: monthRev, count: monthCnt });
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    const fetchOrders = async (pageIndex: number, isRefresh = false) => {
        if (!settings?.id) return;

        if (isRefresh) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            // Apply Date Filter
            const from = new Date(startDate);
            from.setHours(0, 0, 0, 0); // Start of start date
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999); // End of end date

            let query = supabase
                .from('orders')
                .select(`
                    *,
                    daily_order_number,
                    table_info (table_name),
                    order_items (
                        id,
                        name_snapshot,
                        price_snapshot,
                        quantity,
                        selected_addons
                    )
                `)
                .eq('restaurant_id', settings.id)
                .gte('created_at', from.toISOString())
                .lte('created_at', to.toISOString())
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false })
                .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

            // Apply Tab Filter
            if (activeTab === 'dine_in') {
                // Dine-in orders have a table assigned
                query = query.not('table_id', 'is', null);
            } else {
                // Walk-in/Takeaway orders have no table assigned
                query = query.is('table_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;

            const newOrders = (data || []) as Order[];

            if (isRefresh) {
                setOrders(newOrders);
            } else {
                setOrders(prev => [...prev, ...newOrders]);
            }

            // Check if we reached the end
            if (newOrders.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchOrders(nextPage, false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
            case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
            case 'served': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
            case 'paid': return 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100';
            case 'completed': return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 shrink-0 transition-colors">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-lg">
                                <BarChart3 size={24} />
                            </span>
                            Reports & History
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date Filter */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 px-2 py-1 outline-none"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 px-2 py-1 outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => settings?.id && receiptService.printReport('x', settings.id)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Printer size={16} />
                                X Report
                            </button>
                            <button
                                onClick={() => settings?.id && receiptService.printReport('z', settings.id)}
                                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors"
                            >
                                <Printer size={16} />
                                Z Report
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setPage(0);
                                setOrders([]);
                                fetchOrders(0, true);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <RefreshCcw size={20} className={loading && !loadingMore ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Daily */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-blue-100 font-medium mb-1">Today's Sales</p>
                                        <h3 className="text-3xl font-bold">{settings?.currency || '$'}{dayStats.revenue.toFixed(2)}</h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <DollarSign size={24} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-blue-100 bg-blue-700/30 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                                    <ShoppingBag size={14} />
                                    <span>{dayStats.count} Orders Today</span>
                                </div>
                            </div>
                        </div>

                        {/* Monthly */}
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-purple-100 font-medium mb-1">Month's Sales</p>
                                        <h3 className="text-3xl font-bold">{settings?.currency || '$'}{monthStats.revenue.toFixed(2)}</h3>
                                    </div>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Calendar size={24} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-purple-100 bg-purple-700/30 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                                    <ShoppingBag size={14} />
                                    <span>{monthStats.count} Orders This Month</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('dine_in')}
                            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'dine_in'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Dine-In Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('walk_in')}
                            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'walk_in'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Walk-In Orders
                        </button>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-4 pb-10">
                        {orders.length > 0 ? (
                            <>
                                {orders.map(order => (
                                    <div
                                        key={order.id}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow cursor-pointer group animate-fadeIn"
                                        onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-bold text-lg text-gray-900 dark:text-white font-mono">
                                                    #{order.daily_order_number || order.readable_id || order.id.substring(0, 6)}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    {format(parseISO(order.created_at), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                {order.table_info?.table_name ? (
                                                    <span className="font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs uppercase tracking-wide">
                                                        {order.table_info.table_name}
                                                    </span>
                                                ) : (
                                                    <span className="font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs uppercase tracking-wide">
                                                        Walk-In
                                                    </span>
                                                )}
                                                <span className="text-gray-400">•</span>
                                                <span>{order.order_items.reduce((s, i) => s + i.quantity, 0)} Items</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end justify-center min-w-[100px]">
                                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                                {settings?.currency || '$'}{order.total_amount.toFixed(2)}
                                            </div>
                                            <div className={`text-xs uppercase font-bold mt-1 ${order.payment_status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                                                }`}>
                                                {order.payment_status || 'Unpaid'}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Load More / Pagination */}
                                {hasMore && (
                                    <div className="flex justify-center pt-4">
                                        <button
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                            className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {loadingMore && <Loader2 size={16} className="animate-spin" />}
                                            {loadingMore ? 'Loading...' : 'Load More Orders'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            !loading && (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center gap-3">
                                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400">
                                        <Search size={32} />
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 font-medium">No orders found for this period.</div>
                                    <p className="text-sm text-gray-400">Try adjusting the date filters.</p>
                                </div>
                            )
                        )}

                        {loading && orders.length === 0 && (
                            <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                                <Loader2 size={32} className="animate-spin text-[var(--theme-color)]" />
                                <p>Loading orders...</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="text-base font-normal text-gray-500">Order</span>
                                #{selectedOrder.daily_order_number || selectedOrder.id.substring(0, 8)}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                        {settings?.currency || '$'}{selectedOrder.total_amount.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {format(parseISO(selectedOrder.created_at), 'PPP p')}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(selectedOrder.status)}`}>
                                    {selectedOrder.status}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {selectedOrder.order_items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-start text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div className="flex gap-3">
                                            <span className="font-bold text-gray-900 dark:text-white w-6">{item.quantity}x</span>
                                            <div>
                                                <span className="text-gray-800 dark:text-gray-200 font-medium">{item.name_snapshot}</span>
                                                {item.selected_addons && item.selected_addons.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {item.selected_addons.map(a => `+ ${a.name}`).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {settings?.currency || '$'}{(item.price_snapshot * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
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

export default POSReportsPage;
