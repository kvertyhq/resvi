import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, CheckCircle, Truck, XCircle, Filter, Eye, X, RefreshCcw, Printer } from 'lucide-react';
import { receiptService } from '../../services/ReceiptService';
import { useSettings } from '../../context/SettingsContext';
import OrderPrinterSettingsModal from '../../components/admin/OrderPrinterSettingsModal';
import { Settings as SettingsIcon } from 'lucide-react';

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
    readable_id: string; // Changed to string for alphanumeric IDs
    daily_order_number?: number;
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
    customer_name: string | null;
    customer_phone: string | null;
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

import { useAdmin } from '../../context/AdminContext';
import { useAlert } from '../../context/AlertContext';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const OrderManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const { settings } = useSettings();
    const { showAlert } = useAlert();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Auto Print State
    const [autoPrint, setAutoPrint] = useState<boolean>(() => {
        return localStorage.getItem('admin_auto_print') === 'true';
    });
    const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('admin_auto_print', autoPrint.toString());
    }, [autoPrint]);

    const fetchOrders = async () => {
        // Don't set loading to true on background refreshes if we have data, to avoid flicker
        // But for initial load or manual refresh we might want it.
        // For now let's keep it simple, but maybe avoid full loader if orders.length > 0
        if (orders.length === 0) setLoading(true);
        if (!selectedRestaurantId) return;

        try {
            const restaurantId = selectedRestaurantId;
            console.log('Fetching orders for restaurant ID:', restaurantId);

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    daily_order_number,
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
                .eq('source', 'online')
                .in('order_type', ['delivery', 'collection'])
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
                const newOrder = payload.new as any;
                if (newOrder.restaurant_id === selectedRestaurantId && 
                    newOrder.source === 'online' && 
                    ['delivery', 'collection'].includes(newOrder.order_type)) {
                    console.log('New online order received:', payload);
                    playNotificationSound();
                    
                    // Trigger auto-print if enabled
                    if (localStorage.getItem('admin_auto_print') === 'true') {
                        console.log('Auto-printing new order:', newOrder.id);
                        receiptService.printOrder(newOrder.id, selectedRestaurantId, false, undefined, showAlert);
                    }
                    
                    fetchOrders();
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updatedOrder = payload.new as any;
                if (updatedOrder.restaurant_id === selectedRestaurantId && 
                    updatedOrder.source === 'online' && 
                    ['delivery', 'collection'].includes(updatedOrder.order_type)) {
                    console.log('Online order updated:', payload);
                    fetchOrders();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedRestaurantId]);

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
                showAlert('Error', 'Failed to update order status', 'error');
            } else {
                // Optimistic update
                setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
            }
        } catch (err) {
            console.error('Failed to update order:', err);
            showAlert('Error', 'Failed to update order status', 'error');
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
                showAlert('Error', 'Failed to mark as paid', 'error');
            } else {
                // Optimistic update
                setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: 'paid' } : o));
                if (selectedOrder && selectedOrder.id === id) {
                    setSelectedOrder({ ...selectedOrder, payment_status: 'paid' });
                }
            }
        } catch (err) {
            console.error('Failed to update payment status:', err);
            showAlert('Error', 'Failed to mark as paid', 'error');
        }
    };

    const openOrderDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const filteredOrders = orders.filter(o => {
        // Base view mode filter
        const isHistory = o.status === 'completed' || o.status === 'cancelled';
        if (viewMode === 'active' && isHistory) return false;
        if (viewMode === 'history' && !isHistory) return false;

        // Additional status filter
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;

        return true;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, viewMode]);

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
            {!selectedRestaurantId ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                    <p className="text-xl font-medium mb-2">No Restaurant Selected</p>
                    <p>Please select a restaurant context to view orders.</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
                        <div className="flex items-center justify-between md:justify-start space-x-4">
                            <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-800">Order Management</h2>
                            <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400 hidden md:inline">Refreshing in {timeLeft}s</span>
                                <button
                                    onClick={handleRefresh}
                                    className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-50 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold"
                                    title="Refresh Orders"
                                >
                                    <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Middle: Print Controls */}
                        <div className="flex items-center space-x-4 bg-white/50 p-2 rounded-xl border border-gray-100 shadow-sm px-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setAutoPrint(!autoPrint)}
                                    className="flex items-center gap-3 group transition-all"
                                >
                                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${autoPrint ? 'text-green-600' : 'text-gray-400'}`}>
                                        Auto Print
                                    </span>
                                    <div className={`w-11 h-6 rounded-full relative transition-all duration-300 flex-shrink-0 ${autoPrint ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md transform ${autoPrint ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                <button
                                    onClick={() => setIsPrinterModalOpen(true)}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                                    title="Printer Settings"
                                >
                                    <SettingsIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-gold transition-colors" />
                                    <span className="text-xs font-medium text-gray-500 group-hover:text-gray-800">Printer</span>
                                </button>
                            </div>
                        </div>

                        {/* View Mode & Filter Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                            {/* Tabs for Active/History */}
                            <div className="bg-gray-100 p-1 rounded-lg flex">
                                <button
                                    onClick={() => setViewMode('active')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'active'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Active Orders
                                </button>
                                <button
                                    onClick={() => setViewMode('history')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'history'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    History
                                </button>
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <Filter className="h-5 w-5 text-gray-500" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="flex-1 md:flex-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-brand-gold focus:border-brand-gold"
                                >
                                    <option value="all">All Statuses</option>
                                    {viewMode === 'active' ? (
                                        <>
                                            <option value="pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="preparing">Preparing</option>
                                            <option value="out_for_delivery">Out for Delivery</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 pb-20 md:pb-0">
                        {paginatedOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-bold text-lg text-gray-900">#{order.readable_id}</span>
                                        {/* Show daily number as secondary */}
                                        {order.daily_order_number && (
                                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                #{order.daily_order_number}
                                            </span>
                                        )}
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                            {formatStatus(order.status)}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                            order.payment_status === 'refunded' ? 'bg-gray-100 text-gray-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {order.payment_status}
                                        </span>
                                        <span className="text-sm text-gray-500 flex items-center ml-auto md:ml-0">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-gray-600 text-sm space-y-1">
                                        <div>
                                            <span className="font-semibold">{order.profiles?.full_name || order.customer_name || 'Guest'}</span>
                                            {(order.profiles?.phone || order.customer_phone) && (
                                                <span className="ml-2 text-gray-500">• {order.profiles?.phone || order.customer_phone}</span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Total: {settings?.currency || '£'}{order.total_amount.toFixed(2)}</span>
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
                                            Subtotal: {settings?.currency || '£'}{(order.metadata?.subtotal || 0).toFixed(2)}
                                            {settings?.show_tax !== false && order.metadata?.tax > 0 && ` • Tax: ${settings?.currency || '£'}${(order.metadata?.tax || 0).toFixed(2)}`}
                                            {(order.metadata?.delivery_fee || 0) > 0 && ` • Delivery: ${settings?.currency || '£'}${order.metadata.delivery_fee.toFixed(2)}`}
                                        </div>

                                        {/* Order Progress Indicator */}
                                        {order.status !== 'cancelled' && (
                                            <div className="mt-4 mb-3 overflow-x-auto">
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
                                        onClick={() => {
                                            receiptService.printOrder(order.id, undefined, true, undefined, showAlert);
                                        }}
                                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-200"
                                        title="Print Receipt"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </button>

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

                    {/* Pagination Controls */}
                    {filteredOrders.length > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> of{' '}
                                        <span className="font-medium">{filteredOrders.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                    ? 'bg-brand-gold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold'
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Details Modal */}
                    {isModalOpen && selectedOrder && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
                            <div className="bg-white w-full md:rounded-lg md:shadow-xl md:max-w-2xl h-[90vh] md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col rounded-t-xl animate-slideUp md:animate-none">
                                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">Order #{selectedOrder.daily_order_number || selectedOrder.readable_id} Details</h3>
                                        <p className="text-sm text-gray-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 p-2">
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="p-4 md:p-6 overflow-y-auto flex-1 pb-20 md:pb-6">
                                    <div className="space-y-6">
                                        {/* Items List */}
                                        <div>
                                            <h4 className="font-semibold text-gray-900 mb-3">Ordered Items</h4>
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Qty</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[150px]">Item</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Price</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200">
                                                            {selectedOrder.order_items?.map((item, idx) => {
                                                                const addonsTotal = item.selected_addons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                                                                const itemTotal = (item.price_snapshot + addonsTotal) * item.quantity;

                                                                return (
                                                                    <tr key={idx}>
                                                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium align-top">{item.quantity}x</td>
                                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                                            <div className="font-medium">{item.name_snapshot}</div>
                                                                            {item.selected_addons && item.selected_addons.length > 0 && (
                                                                                <div className="text-xs text-gray-500 mt-1">
                                                                                    {item.selected_addons.map((addon, i) => (
                                                                                                                        <span key={i} className="block">
                                                                                            + {addon.name} ({settings?.currency || '£'}{addon.price.toFixed(2)})
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-gray-500 text-right align-top">
                                                                            {settings?.currency || '£'}{item.price_snapshot.toFixed(2)}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right align-top">
                                                                            {settings?.currency || '£'}{itemTotal.toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Summary */}
                                        <div className="border-t border-gray-200 pt-4">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Subtotal</span>
                                                <span className="font-medium">{settings?.currency || '£'}{(selectedOrder.metadata?.subtotal || 0).toFixed(2)}</span>
                                            </div>
                                            {settings?.show_tax !== false && (selectedOrder.metadata?.tax || 0) > 0 && (
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Tax</span>
                                                    <span className="font-medium">{settings?.currency || '£'}{(selectedOrder.metadata?.tax || 0).toFixed(2)}</span>
                                                </div>
                                            )}
                                            {(selectedOrder.metadata?.delivery_fee || 0) > 0 && (
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">Delivery Fee</span>
                                                    <span className="font-medium">{settings?.currency || '£'}{selectedOrder.metadata.delivery_fee.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-lg font-bold text-gray-900 mt-3 pt-3 border-t border-gray-200">
                                                <span>Total</span>
                                                <span>{settings?.currency || '£'}{selectedOrder.total_amount.toFixed(2)}</span>
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

                                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end pb-8 md:pb-4">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full md:w-auto px-4 py-3 md:py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium shadow-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Order Printer Settings Modal */}
                    <OrderPrinterSettingsModal 
                        isOpen={isPrinterModalOpen}
                        onClose={() => setIsPrinterModalOpen(false)}
                    />
                </>
            )}
        </div>
    );
};

export default OrderManagementPage;
