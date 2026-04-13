import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import {
    Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing,
    ShoppingCart, Search, User, Users, Clock,
    ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, CheckCheck, RotateCw,
    Pencil, X, Check, MapPin, Printer, ChefHat
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { receiptService } from '../../services/ReceiptService';

const CALLS_PER_PAGE = 12;
const HISTORY_PER_PAGE = 12;
const CUSTOMERS_PER_PAGE = 15;

const POSCallHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { showAlert, showConfirm } = useAlert();

    const formatDate = (dateString: string | null | undefined, formatStr: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return format(date, formatStr);
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // Tab state — default to 'orders'
    const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'customers' | 'calls'>('orders');

    // Call logs state
    const [calls, setCalls] = useState<any[]>([]);
    const [callsLoading, setCallsLoading] = useState(false);
    const [callPage, setCallPage] = useState(1);
    const [callTotal, setCallTotal] = useState(0);
    const [callSearch, setCallSearch] = useState('');

    // Phone orders state
    const [phoneOrders, setPhoneOrders] = useState<any[]>([]);
    const [completedOrders, setCompletedOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [markingComplete, setMarkingComplete] = useState<string | null>(null); // order id being marked

    // History filtering & pagination
    const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'custom' | 'all'>('today');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));


    // Map of phone number -> order (to link calls to orders)
    const [phoneToOrder, setPhoneToOrder] = useState<Record<string, any>>({});

    // Contacts
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPage, setCustomerPage] = useState(1);
    const [customerTotal, setCustomerTotal] = useState(0);
    const [customerLoading, setCustomerLoading] = useState(false);

    // Mobile view
    const [mobileView, setMobileView] = useState<'history' | 'customers' | 'orders'>('orders');

    // Editing State
    const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [updatingName, setUpdatingName] = useState(false);

    useEffect(() => {
        if (settings?.id) {
            fetchCalls();
            fetchCustomers();
            fetchPhoneOrders();
            fetchCompletedOrders();
        }

        const subscription = supabase
            .channel('callhistory_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, () => fetchCalls())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `source=eq.phone` }, () => {
                fetchPhoneOrders();
                fetchCompletedOrders();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [settings?.id]);

    // Refetch calls when page or search changes
    useEffect(() => {
        if (settings?.id) fetchCalls();
    }, [callPage, callSearch]);

    // Refetch history when filter or page changes
    useEffect(() => {
        if (settings?.id && activeTab === 'history') fetchCompletedOrders();
    }, [historyFilter, historyPage, customDate, activeTab]);

    // Refetch customers when page or search changes
    useEffect(() => {
        if (settings?.id && activeTab === 'customers') fetchCustomers();
    }, [customerPage, customerSearch, activeTab]);

    const fetchCalls = useCallback(async () => {
        if (!settings?.id) return;
        setCallsLoading(true);

        const from = (callPage - 1) * CALLS_PER_PAGE;
        const to = from + CALLS_PER_PAGE - 1;

        let query = supabase
            .from('call_logs')
            .select(`
                *,
                profiles ( id, full_name, phone ),
                orders!call_logs_order_id_fkey (
                    id, readable_id, daily_order_number, status, total_amount, payment_status,
                    order_items ( id, quantity, price_snapshot, name_snapshot ),
                    profiles!orders_user_id_fkey ( full_name, phone )
                )
            `, { count: 'exact' })
            .eq('restaurant_id', settings.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (callSearch.trim()) {
            query = query.ilike('caller_number', `%${callSearch.trim()}%`);
        }

        const { data, error, count } = await query;
        if (!error) {
            setCalls(data || []);
            setCallTotal(count || 0);
        }
        setCallsLoading(false);

    }, [settings?.id, callPage, callSearch]);

    const fetchCustomers = useCallback(async () => {
        if (!settings?.id) return;
        setCustomerLoading(true);

        const from = (customerPage - 1) * CUSTOMERS_PER_PAGE;

        const { data, error } = await supabase.rpc('get_pos_customers_v2', {
            p_restaurant_id: settings.id,
            p_search_query: customerSearch.trim() || null,
            p_limit: CUSTOMERS_PER_PAGE,
            p_offset: from
        });

        if (!error && data) {
            setCustomers(data || []);
            setCustomerTotal(data[0]?.total_count || 0);
        } else if (error) {
            console.error('Error fetching customers:', error);
            setCustomers([]);
            setCustomerTotal(0);
        }
        setCustomerLoading(false);
    }, [settings?.id, customerPage, customerSearch]);

    const handleUpdateName = async (customerId: string) => {
        if (!editName.trim()) return;
        setUpdatingName(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: editName.trim() })
                .eq('id', customerId);

            if (error) throw error;

            showAlert('Success', 'Customer name updated', 'success');
            setEditingCustomer(null);
            fetchCustomers(); // Refresh list
        } catch (err: any) {
            console.error('Error updating name:', err);
            showAlert('Error', 'Failed to update name', 'danger');
        } finally {
            setUpdatingName(false);
        }
    };

    const fetchPhoneOrders = async () => {
        if (!settings?.id) return;
        setOrdersLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                profiles!orders_user_id_fkey ( full_name, phone ),
                order_items ( id, quantity, price_snapshot, name_snapshot )
            `)
            .eq('restaurant_id', settings.id)
            .eq('source', 'phone')
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPhoneOrders(data);
            // Build phone->order map for linking calls
            const map: Record<string, any> = {};
            data.forEach((order: any) => {
                const phone = order.profiles?.phone || order.notes?.match(/\d{7,}/)?.[0];
                if (phone) map[phone] = order;
            });
            setPhoneToOrder(map);
        }
        setOrdersLoading(false);
    };

    const fetchCompletedOrders = useCallback(async () => {
        if (!settings?.id) return;
        setOrdersLoading(true);

        const from = (historyPage - 1) * HISTORY_PER_PAGE;
        const to = from + HISTORY_PER_PAGE - 1;

        let query = supabase
            .from('orders')
            .select(`
                *,
                profiles!orders_user_id_fkey ( full_name, phone ),
                order_items ( id, quantity, price_snapshot, name_snapshot )
            `, { count: 'exact' })
            .eq('restaurant_id', settings.id)
            .eq('source', 'phone')
            .in('status', ['completed', 'cancelled', 'served']);

        // Apply filters
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

        const { data, error, count } = await query;
        if (!error && data) {
            setCompletedOrders(data);
            setHistoryTotal(count || 0);
        }
        setOrdersLoading(false);
    }, [settings?.id, historyFilter, historyPage, customDate]);

    const markOrderComplete = async (order: any, e: React.MouseEvent) => {
        e.stopPropagation(); // don't open the detail modal
        const label = order.order_type === 'delivery' ? 'Delivered' : 'Completed';
        
        const confirmed = await showConfirm(
            'Confirm Complete',
            `Mark order ${order.readable_id || (order.daily_order_number ? '#' + order.daily_order_number : '')} as ${label}?\n\nThis will move it to the completed history.`,
            'warning'
        );

        if (!confirmed) return;

        setMarkingComplete(order.id);
        const { error } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', order.id);
            
        if (!error) {
            // Move locally: remove from active, add to completed
            setPhoneOrders(prev => prev.filter(o => o.id !== order.id));
            setCompletedOrders(prev => [
                { ...order, status: 'completed' },
                ...prev
            ]);
        } else {
            showAlert('Error', 'Failed to update order status. Please try again.', 'danger');
        }
        setMarkingComplete(null);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
            completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
            cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const handleCreateOrder = (callOrCustomer: any) => {
        const phone = callOrCustomer.caller_number || callOrCustomer.phone || '';
        const name = callOrCustomer.profiles?.full_name || callOrCustomer.full_name || '';
        navigate('/pos/phone-setup', {
            state: {
                customer: { id: callOrCustomer.profiles?.id || null, name, phone, full_name: name },
                isPhoneOrder: true,
                callLogId: callOrCustomer.id ?? null  // pass the call_logs row id
            }
        });
    };    const totalCallPages = Math.ceil(callTotal / CALLS_PER_PAGE);



    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-white dark:bg-gray-900 overflow-hidden relative">

            {/* Mobile Tab Toggle */}
            <div className="md:hidden flex p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                    onClick={() => { setMobileView('orders'); setActiveTab('orders'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${mobileView === 'orders' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500'}`}
                >
                    <ShoppingCart size={14} /> Phone Orders
                </button>
                <button
                    onClick={() => { setMobileView('history'); setActiveTab('history'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${mobileView === 'history' && activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500'}`}
                >
                    <CheckCircle2 size={14} /> History
                </button>
                <button
                    onClick={() => { setMobileView('history'); setActiveTab('calls'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${mobileView === 'history' && activeTab === 'calls' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500'}`}
                >
                    <Clock size={14} /> Calls
                </button>
                <button
                    onClick={() => { setMobileView('orders'); setActiveTab('customers'); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'customers' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500'}`}
                >
                    <Users size={14} /> Customers
                </button>
            </div>

            {/* Left Panel: Removed (Moved to Customers Tab) */}

            {/* Panel */}
            <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">

                {/* Header & Tabs */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                {activeTab === 'orders' ? 'Phone Orders' : activeTab === 'history' ? 'Order History' : activeTab === 'customers' ? 'Customer Contacts' : 'Call Logs'}
                            </h1>
                            {(activeTab === 'orders' || activeTab === 'history') && (
                                <button
                                    onClick={() => {
                                        fetchPhoneOrders();
                                        fetchCompletedOrders();
                                    }}
                                    disabled={ordersLoading}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-[var(--theme-color)] transition-all disabled:opacity-50"
                                    title="Refresh orders"
                                >
                                    <RotateCw size={16} className={ordersLoading ? 'animate-spin' : ''} />
                                </button>
                            )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                            {activeTab === 'orders' ? 'Active orders placed via phone' : activeTab === 'history' ? 'Completed and cancelled phone orders' : activeTab === 'customers' ? 'Manage and contact your customers' : 'Recent incoming and outgoing calls'}
                        </p>
                    </div>

                    <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white dark:bg-gray-600 shadow-sm text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <ShoppingCart size={15} />
                            Phone Orders
                            {phoneOrders.length > 0 && (
                                <span className="bg-[var(--theme-color)] text-white text-[10px] px-1.5 py-0.5 rounded-full">{phoneOrders.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-gray-600 shadow-sm text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <CheckCircle2 size={15} />
                            History
                        </button>
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'customers' ? 'bg-white dark:bg-gray-600 shadow-sm text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <Users size={15} />
                            Customers
                        </button>
                        <button
                            onClick={() => setActiveTab('calls')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'calls' ? 'bg-white dark:bg-gray-600 shadow-sm text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            <Clock size={15} />
                            Call Logs
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 md:p-6">

                    {/* --- PHONE ORDERS TAB --- */}
                    {activeTab === 'orders' && (
                        ordersLoading ? (
                            <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>
                        ) : (
                            <div className="space-y-8">
                                {/* ── ACTIVE ORDERS ── */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-sm">
                                        Active Orders
                                        {phoneOrders.length > 0 && (
                                            <span className="bg-[var(--theme-color)] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                                                {phoneOrders.length}
                                            </span>
                                        )}
                                    </div>

                                    {phoneOrders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <ShoppingCart size={36} className="mb-3 opacity-20" />
                                            <p className="text-sm font-medium">No active phone orders</p>
                                            <p className="text-xs mt-1 text-gray-400">Orders placed via phone will appear here</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {phoneOrders.map(order => (
                                                <div
                                                    key={order.id}
                                                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:border-[var(--theme-color)] hover:shadow-md transition-all overflow-hidden"
                                                >
                                                    {/* Card body — clickable to view details */}
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-5 flex flex-col flex-1 text-left w-full"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white text-base">
                                                                    {order.daily_order_number ? (
                                                                        <>
                                                                            #{order.daily_order_number}
                                                                            {order.readable_id && (
                                                                                <span className="text-xs text-gray-400 font-normal ml-1">
                                                                                    ({order.readable_id})
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        order.readable_id || `#${order.id.slice(0, 6)}`
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {formatDate(order.created_at, 'MMM d, h:mm a')}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {order.order_type && (
                                                                    <span className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                                        {order.order_type.replace('_', ' ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                                            <div className="font-semibold flex items-center gap-1">
                                                                <User size={13} /> {order.profiles?.full_name || order.customer_name || 'Guest Customer'}
                                                            </div>
                                                            {(order.profiles?.phone || order.customer_phone) && (
                                                                <div className="flex items-center gap-1 mt-1 text-gray-500">
                                                                    <Phone size={13} /> {order.customer_phone || order.profiles?.phone}
                                                                </div>
                                                            )}
                                                            {order.order_type === 'delivery' && (order.customer_address || order.customer_postcode || order.profiles?.address) && (
                                                                <div className="flex items-start gap-1 mt-1.5 text-gray-500">
                                                                    <MapPin size={13} className="mt-0.5 flex-shrink-0 text-[var(--theme-color)]" />
                                                                    <span className="text-xs leading-snug">
                                                                        {order.customer_address || order.profiles?.address}
                                                                        {(order.customer_address || order.profiles?.address) && (order.customer_postcode || order.profiles?.postcode) ? ', ' : ''}
                                                                        {order.customer_postcode || order.profiles?.postcode}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                                                            <div className="font-bold text-gray-900 dark:text-white">
                                                                £{(order.total_amount || 0).toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-[var(--theme-color)] font-semibold flex items-center gap-1">
                                                                {order.order_items?.length || 0} items · View →
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Mark Complete button */}
                                                    <button
                                                        onClick={(e) => markOrderComplete(order, e)}
                                                        disabled={markingComplete === order.id}
                                                        className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {markingComplete === order.id ? (
                                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                            </svg>
                                                        ) : (
                                                            <CheckCheck size={16} />
                                                        )}
                                                        Mark as {order.order_type === 'delivery' ? 'Delivered' : 'Completed'}
                                                    </button>

                                                    {/* Print buttons row */}
                                                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700/50 flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                receiptService.printOrder(order.id, settings?.id, true, order.payment_method, showAlert);
                                                            }}
                                                            className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-600 shrink-0"
                                                            title="Print Receipt"
                                                        >
                                                            <Printer size={24} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                receiptService.printKitchenTickets(order.id, settings?.id, undefined, showAlert);
                                                            }}
                                                            className="p-3 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl transition-colors border border-orange-200 dark:border-orange-800/50 shrink-0"
                                                            title="Print Kitchen Ticket (KOT)"
                                                        >
                                                            <ChefHat size={24} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {/* --- HISTORY TAB --- */}
                    {activeTab === 'history' && (
                        <div className="flex flex-col h-full">
                            {/* History Header & Filters */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-sm">
                                    Full Order History
                                    {historyTotal > 0 && (
                                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-1">
                                            {historyTotal}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                        {[
                                            { id: 'all', label: 'All' },
                                            { id: 'today', label: 'Today' },
                                            { id: 'yesterday', label: 'Yesterday' },
                                            { id: 'custom', label: 'Custom' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => { setHistoryFilter(f.id as any); setHistoryPage(1); }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${historyFilter === f.id ? 'bg-white dark:bg-gray-700 shadow-sm text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {historyFilter === 'custom' && (
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => { setCustomDate(e.target.value); setHistoryPage(1); }}
                                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium outline-none focus:border-[var(--theme-color)]"
                                        />
                                    )}
                                </div>
                            </div>

                            {ordersLoading ? (
                                <div className="flex flex-1 items-center justify-center py-20">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <RotateCw size={32} className="animate-spin" />
                                        <span className="text-sm font-medium">Fetching history...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 space-y-6">
                                    {completedOrders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <Clock size={48} className="mb-4 opacity-10" />
                                            <p className="text-base font-semibold">No history found</p>
                                            <p className="text-xs mt-1">Try changing the filters or date range</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {completedOrders.map(order => (
                                                    <button
                                                        key={order.id}
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:border-[var(--theme-color)] hover:shadow-md transition-all text-left w-full group"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white text-base group-hover:text-[var(--theme-color)] transition-colors">
                                                                    {order.daily_order_number ? (
                                                                        <>
                                                                            #{order.daily_order_number}
                                                                            {order.readable_id && (
                                                                                <span className="text-xs text-gray-400 font-normal ml-1">
                                                                                    ({order.readable_id})
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        order.readable_id || `#${order.id.slice(0, 6)}`
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                                    {formatDate(order.created_at, 'MMM d, h:mm a')}
                                                                    {order.order_type && (
                                                                        <span className="capitalize opacity-70"> · {order.order_type}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                                                    {order.profiles?.full_name || order.customer_name || 'Guest'}
                                                                </span>
                                                                {(order.profiles?.phone || order.customer_phone) && (
                                                                    <span className="text-[10px] text-gray-400">{order.customer_phone || order.profiles?.phone}</span>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                                                                    £{(order.total_amount || 0).toFixed(2)}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 capitalize">{order.payment_method || 'no payment'}</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Pagination */}
                                            {Math.ceil(historyTotal / HISTORY_PER_PAGE) > 1 && (
                                                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                                                    <p className="text-xs text-gray-500">
                                                        Showing {((historyPage - 1) * HISTORY_PER_PAGE) + 1}–{Math.min(historyPage * HISTORY_PER_PAGE, historyTotal)} of {historyTotal} orders
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={historyPage === 1}
                                                            onClick={() => setHistoryPage(p => p - 1)}
                                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 px-2">
                                                            Page {historyPage} of {Math.ceil(historyTotal / HISTORY_PER_PAGE)}
                                                        </span>
                                                        <button
                                                            disabled={historyPage >= Math.ceil(historyTotal / HISTORY_PER_PAGE)}
                                                            onClick={() => setHistoryPage(p => p + 1)}
                                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- CUSTOMERS TAB --- */}
                    {activeTab === 'customers' && (
                        <div className="flex flex-col h-full">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-sm">
                                    Saved Customers
                                    {customerTotal > 0 && (
                                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full ml-1">
                                            {customerTotal}
                                        </span>
                                    )}
                                </div>

                                <div className="relative max-w-xs w-full">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or phone..."
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-[var(--theme-color)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none transition-all"
                                        value={customerSearch}
                                        onChange={e => { setCustomerSearch(e.target.value); setCustomerPage(1); }}
                                    />
                                </div>
                            </div>

                            {customerLoading ? (
                                <div className="flex flex-1 items-center justify-center py-20">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <RotateCw size={32} className="animate-spin" />
                                        <span className="text-sm font-medium">Loading customers...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col">
                                    {customers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            <Users size={48} className="mb-4 opacity-10" />
                                            <p className="text-base font-semibold">No customers found</p>
                                            <p className="text-xs mt-1 italic">Try searching for a different name or number</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {customers.map(customer => (
                                                    <div
                                                        key={customer.id}
                                                        className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:border-[var(--theme-color)] hover:shadow-md transition-all group"
                                                    >
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="w-12 h-12 rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)] flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                                                                {customer.full_name?.charAt(0) || <User size={20} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                {editingCustomer?.id === customer.id ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            autoFocus
                                                                            value={editName}
                                                                            onChange={(e) => setEditName(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleUpdateName(customer.id);
                                                                                if (e.key === 'Escape') setEditingCustomer(null);
                                                                            }}
                                                                            className="w-full bg-white dark:bg-gray-900 border border-[var(--theme-color)] rounded px-2 py-1 text-sm outline-none"
                                                                        />
                                                                        <button 
                                                                            onClick={() => handleUpdateName(customer.id)}
                                                                            disabled={updatingName}
                                                                            className="text-green-600 hover:text-green-700"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditingCustomer(null)}
                                                                            className="text-gray-400 hover:text-gray-600"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-between group/name">
                                                                        <div className="font-bold text-gray-900 dark:text-white truncate flex-1">{customer.full_name}</div>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setEditingCustomer(customer);
                                                                                setEditName(customer.full_name || '');
                                                                            }}
                                                                            className="opacity-0 group-hover/name:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all ml-1"
                                                                        >
                                                                            <Pencil size={12} className="text-gray-400" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <div className="text-xs text-gray-500 font-medium">{customer.phone}</div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleCreateOrder(customer)}
                                                            className="mt-auto w-full py-2 bg-[var(--theme-color)]/5 hover:bg-[var(--theme-color)] text-[var(--theme-color)] hover:text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <ShoppingCart size={14} />
                                                            Start New Order
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Pagination */}
                                            {Math.ceil(customerTotal / CUSTOMERS_PER_PAGE) > 1 && (
                                                <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-gray-800 mt-8">
                                                    <p className="text-xs text-gray-500">
                                                        Showing {((customerPage - 1) * CUSTOMERS_PER_PAGE) + 1}–{Math.min(customerPage * CUSTOMERS_PER_PAGE, customerTotal)} of {customerTotal} customers
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            disabled={customerPage === 1}
                                                            onClick={() => setCustomerPage(p => p - 1)}
                                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 px-2 min-w-[100px] text-center">
                                                            Page {customerPage} of {Math.ceil(customerTotal / CUSTOMERS_PER_PAGE)}
                                                        </span>
                                                        <button
                                                            disabled={customerPage >= Math.ceil(customerTotal / CUSTOMERS_PER_PAGE)}
                                                            onClick={() => setCustomerPage(p => p + 1)}
                                                            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}


                    {/* Order Detail Modal */}
                    {selectedOrder && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
                            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col overflow-hidden">
                                {/* Header */}
                                <div className="bg-[var(--theme-color)] px-5 py-4 flex items-center justify-between flex-shrink-0">
                                    <div>
                                        <div className="text-white font-bold text-lg">
                                            {selectedOrder.readable_id || `Order #${selectedOrder.id.slice(0, 6)}`}
                                            {selectedOrder.daily_order_number && (
                                                <span className="ml-2 opacity-70 text-base font-normal">
                                                    (#{selectedOrder.daily_order_number})
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-white/70 text-xs mt-0.5">
                                            {formatDate(selectedOrder.created_at, 'MMMM d, yyyy · h:mm a')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor(selectedOrder.status)}`}>
                                            {selectedOrder.status}
                                        </span>
                                        <button
                                            onClick={() => setSelectedOrder(null)}
                                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable body */}
                                <div className="overflow-y-auto flex-1 p-5 space-y-5">
                                    {/* Customer info */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <User size={14} className="text-[var(--theme-color)]" />
                                            {selectedOrder.profiles?.full_name || selectedOrder.customer_name || 'Guest Customer'}
                                        </div>
                                        {(selectedOrder.profiles?.phone || selectedOrder.customer_phone) && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Phone size={14} />
                                                {selectedOrder.customer_phone || selectedOrder.profiles?.phone}
                                            </div>
                                        )}
                                        {selectedOrder.order_type && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                <ShoppingCart size={14} />
                                                {selectedOrder.order_type}
                                            </div>
                                        )}
                                        {selectedOrder.order_type === 'delivery' && (selectedOrder.customer_address || selectedOrder.customer_postcode || selectedOrder.profiles?.address) && (
                                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-[var(--theme-color)]" />
                                                <span>
                                                    {selectedOrder.customer_address || selectedOrder.profiles?.address}
                                                    {(selectedOrder.customer_address || selectedOrder.profiles?.address) && (selectedOrder.customer_postcode || selectedOrder.profiles?.postcode) ? ', ' : ''}
                                                    {selectedOrder.customer_postcode || selectedOrder.profiles?.postcode}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {selectedOrder.notes && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Notes</p>
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{selectedOrder.notes}</p>
                                        </div>
                                    )}

                                    {/* Order items */}
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Items</p>
                                        <div className="space-y-2">
                                            {(selectedOrder.order_items || []).map((item: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                                            {item.name_snapshot || 'Item'}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        £{((item.price_snapshot || 0) * item.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Totals */}
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                                        {selectedOrder.metadata?.delivery_fee > 0 && (
                                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                <span>Delivery fee</span>
                                                <span>£{Number(selectedOrder.metadata.delivery_fee).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {selectedOrder.metadata?.tax > 0 && (
                                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                                <span>Tax</span>
                                                <span>£{Number(selectedOrder.metadata.tax).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span>Total</span>
                                            <span>£{(selectedOrder.total_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>Payment</span>
                                            <span className="capitalize">{selectedOrder.payment_method || 'N/A'} · {selectedOrder.payment_status || 'unpaid'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Print buttons footer */}
                                <div className="flex border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    <button
                                        onClick={() => receiptService.printOrder(selectedOrder.id, settings?.id, true, selectedOrder.payment_method, showAlert)}
                                        className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Printer size={16} /> Print Receipt
                                    </button>
                                    <div className="w-px bg-gray-200 dark:bg-gray-700" />
                                    <button
                                        onClick={() => receiptService.printKitchenTickets(selectedOrder.id, settings?.id, undefined, showAlert)}
                                        className="flex-1 py-3 text-sm font-bold text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <ChefHat size={16} /> Print Kitchen
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* --- CALL LOGS TAB --- */}
                    {activeTab === 'calls' && (
                        <div className="flex flex-col gap-4">
                            {/* Search */}
                            <div className="relative max-w-xs">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by number..."
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-[var(--theme-color)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
                                    value={callSearch}
                                    onChange={e => { setCallSearch(e.target.value); setCallPage(1); }}
                                />
                            </div>

                            {callsLoading ? (
                                <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>
                            ) : calls.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <PhoneMissed size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No calls found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {calls.map(call => {
                                            // Use the directly linked order (from the FK join)
                                            const linkedOrder = call.orders || null;
                                            const customerName = call.profiles?.full_name ||
                                                customers.find(c => c.phone === call.caller_number)?.full_name;

                                            return (
                                                <div key={call.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col hover:border-[var(--theme-color)] hover:shadow-md transition-all">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${call.direction === 'inbound'
                                                            ? call.status === 'missed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                                            }`}>
                                                            {call.direction === 'inbound'
                                                                ? call.status === 'missed' ? <PhoneMissed size={18} /> : <PhoneIncoming size={18} />
                                                                : <PhoneOutgoing size={18} />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-gray-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                                                                {customerName || call.caller_number}
                                                                {customerName && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 bg-[var(--theme-color)]/10 text-[var(--theme-color)] rounded-full font-bold uppercase tracking-wide">Customer</span>
                                                                )}
                                                            </div>
                                                            {customerName && (
                                                                <div className="text-xs text-gray-500 mt-0.5">{call.caller_number}</div>
                                                            )}
                                                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                                                <span>{formatDate(call.created_at, 'MMM d, h:mm a')}</span>
                                                                <span className={`font-medium capitalize ${call.status === 'missed' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                    · {call.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                                        {linkedOrder ? (
                                                            // Directly linked order — show View Order button
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold min-w-0">
                                                                    <CheckCircle2 size={15} className="flex-shrink-0" />
                                                                    <span className="truncate">
                                                                        {linkedOrder.readable_id || `#${linkedOrder.id.slice(0, 6)}`}
                                                                        {linkedOrder.daily_order_number && (
                                                                            <span className="ml-1 opacity-60">
                                                                                (#{linkedOrder.daily_order_number})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getStatusColor(linkedOrder.status)}`}>
                                                                        {linkedOrder.status}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSelectedOrder(linkedOrder)}
                                                                    className="px-3 py-1.5 bg-[var(--theme-color)]/10 text-[var(--theme-color)] rounded-lg text-xs font-bold hover:bg-[var(--theme-color)]/20 transition-colors flex items-center gap-1 flex-shrink-0"
                                                                >
                                                                    <ExternalLink size={12} />
                                                                    View
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCreateOrder(call)}
                                                                className="w-full py-2 bg-[var(--theme-color)] text-white rounded-lg flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                                                            >
                                                                <ShoppingCart size={15} />
                                                                Start Order
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination */}

                                    {totalCallPages > 1 && (
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <p className="text-sm text-gray-500">
                                                Showing {((callPage - 1) * CALLS_PER_PAGE) + 1}–{Math.min(callPage * CALLS_PER_PAGE, callTotal)} of {callTotal} calls
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    disabled={callPage === 1}
                                                    onClick={() => setCallPage(p => p - 1)}
                                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {callPage} / {totalCallPages}
                                                </span>
                                                <button
                                                    disabled={callPage === totalCallPages}
                                                    onClick={() => setCallPage(p => p + 1)}
                                                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};

export default POSCallHistoryPage;
