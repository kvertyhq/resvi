import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { Clock, Filter, Eye, X, ArrowLeft, RefreshCcw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    daily_order_number?: number;
    user_id: string;
    created_at: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled';
    total_amount: number;
    payment_status: 'unpaid' | 'paid' | 'refunded';
    order_type: 'dine_in';
    table_id: string;
    payment_method: string | null;
    notes: string | null;
    metadata: {
        subtotal: number;
        tax: number;
    };
    table_info?: {
        table_name: string;
    };
    order_items: OrderItem[];
}

const POSHistoryPage: React.FC = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchHistory = async () => {
        if (!settings?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
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
                .eq('order_type', 'dine_in')
                .order('created_at', { ascending: false })
                .limit(50); // Limit to last 50 for performance

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [settings?.id]);

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            order.readable_id.toString().includes(searchQuery) ||
            (order.table_info?.table_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-green-100 text-green-800';
            case 'served': return 'bg-purple-100 text-purple-800';
            case 'paid': return 'bg-green-200 text-green-900';
            case 'completed': return 'bg-gray-200 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4 shrink-0 transition-colors">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dine-In History</h1>
                        <button
                            onClick={fetchHistory}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search Table or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </header>

            {/* List */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 transition-colors">
                <div className="max-w-6xl mx-auto space-y-4">
                    {loading && orders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading history...</div>
                    ) : filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => { setSelectedOrder(order); setIsModalOpen(true); }}
                            >
                                {/* Left Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-lg text-gray-900 dark:text-white">#{order.daily_order_number || order.readable_id}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(order.created_at)} • {formatTime(order.created_at)}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                                            <span className="font-semibold">{order.table_info?.table_name || 'Unknown Table'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>Items: {order.order_items?.reduce((acc, item) => acc + item.quantity, 0) || 0}</span>
                                        </div>
                                        {order.payment_method && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="uppercase text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                                    {order.payment_method}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Amounts & Action */}
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 min-w-[120px]">
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                                            {settings?.currency || '£'}{order.total_amount.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Amount</div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsModalOpen(true); }}
                                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        <Eye size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No history found.
                        </div>
                    )}
                </div>
            </main>

            {/* Details Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    Order #{selectedOrder.daily_order_number || selectedOrder.readable_id}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status.replace('_', ' ')}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDate(selectedOrder.created_at)} at {formatTime(selectedOrder.created_at)} • {selectedOrder.table_info?.table_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Status Stepper */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
                            <div className="flex items-center justify-between relative min-w-[320px]">
                                {/* Connector Line */}
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

                                {[
                                    { label: 'Placed', active: true },
                                    { label: 'Preparing', active: ['preparing', 'ready', 'served', 'completed'].includes(selectedOrder.status) },
                                    { label: 'Ready', active: ['ready', 'served', 'completed'].includes(selectedOrder.status) },
                                    { label: 'Paid', active: selectedOrder.payment_status === 'paid' },
                                    { label: 'Completed', active: selectedOrder.status === 'completed' }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center bg-white dark:bg-gray-800 px-2 z-10">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${step.active
                                            ? 'bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:border-green-500 dark:text-green-400'
                                            : 'bg-gray-50 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500'
                                            }`}>
                                            {step.active ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <span className="text-xs font-bold">{idx + 1}</span>
                                            )}
                                        </div>
                                        <span className={`text-xs mt-1 font-medium ${step.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
                            <div className="space-y-4">
                                {selectedOrder.order_items?.map((item, idx) => {
                                    const addonsTotal = item.selected_addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                                    const itemTotal = (item.price_snapshot + addonsTotal) * item.quantity;
                                    return (
                                        <div key={idx} className="flex justify-between items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                            <div className="flex gap-3">
                                                <span className="font-bold text-gray-900 dark:text-white w-6">{item.quantity}x</span>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{item.name_snapshot}</div>
                                                    {item.selected_addons?.length > 0 && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            {item.selected_addons.map(a => `+ ${a.name}`).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="font-semibold text-gray-900 dark:text-white">
                                                {settings?.currency || '£'}{itemTotal.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span>{settings?.currency || '£'}{(selectedOrder.metadata?.subtotal || 0).toFixed(2)}</span>
                                </div>
                                {settings?.show_tax !== false && (selectedOrder.metadata?.tax || 0) > 0 && (
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Tax</span>
                                        <span>{settings?.currency || '£'}{(selectedOrder.metadata?.tax || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span>Total</span>
                                    <span>{settings?.currency || '£'}{selectedOrder.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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

export default POSHistoryPage;
