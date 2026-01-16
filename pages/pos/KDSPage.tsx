import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { format } from 'date-fns';

interface OrderItem {
    id: string;
    menu_item_id: string;
    quantity: number;
    notes?: string;
    course_name: string;
    selected_modifiers: any[];
    menu_items: {
        name: string,
        category_id: string,
        menu_categories: { station: string }
    };
    status: string;
}

interface Order {
    id: string;
    table_id: string;
    status: string;
    created_at: string;
    order_items: OrderItem[];
    table_info: { table_name: string };
}

const KDSPage: React.FC = () => {
    const { settings } = useSettings();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStation, setActiveStation] = useState<'kitchen' | 'bar'>('kitchen');

    useEffect(() => {
        if (settings?.id) {
            fetchOrders();
            const subscription = supabase
                .channel('kds_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
                .subscribe();

            return () => { subscription.unsubscribe(); };
        }
    }, [settings?.id, activeStation]); // Refetch/Re-filter when station changes (though we handle filtering client side usually, fetching all is safer for now)

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Fetch everything, we filter client side for better performance on toggle
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, table_id, status, created_at,
                    table_info ( table_name ),
                    order_items (
                        id, quantity, notes, course_name, selected_modifiers,
                        menu_items ( 
                            name,
                            category_id,
                            menu_categories ( station ) 
                        )
                    )
                `)
                .eq('restaurant_id', settings?.id)
                .in('status', ['pending', 'preparing', 'ready'])
                .order('created_at', { ascending: true });

            if (error) throw error;
            setOrders(data as any || []);
        } catch (error) {
            console.error('KDS Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors = {
            pending: 'bg-yellow-100 dark:bg-yellow-500 text-yellow-900 dark:text-black',
            preparing: 'bg-blue-100 dark:bg-blue-600 text-blue-900 dark:text-white',
            ready: 'bg-green-100 dark:bg-green-600 text-green-900 dark:text-white'
        }[status] || 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white';
        return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colors}`}>{status}</span>;
    };

    // Filter orders to only show items for the current station
    const getFilteredOrders = () => {
        return orders.map(order => {
            // Filter items that match the active station
            const stationItems = order.order_items.filter(item => {
                const itemStation = item.menu_items?.menu_categories?.station || 'kitchen'; // Default to kitchen
                return itemStation === activeStation;
            });

            // Return order with filtered items. If no items for this station, filtering happens in render
            return {
                ...order,
                order_items: stationItems
            };
        }).filter(order => order.order_items.length > 0); // Only show orders that have items for this station
    };

    const filteredOrders = getFilteredOrders();

    if (loading && orders.length === 0) return <div className="text-gray-900 dark:text-white p-8">Loading KDS...</div>;

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
            {/* Station Selector Header */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 justify-center md:justify-start">
                    <button
                        onClick={() => setActiveStation('kitchen')}
                        style={activeStation === 'kitchen' ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeStation === 'kitchen' ? 'text-white scale-105 shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        <span>👨‍🍳 Kitchen</span>
                        <span className="bg-black bg-opacity-30 px-2 rounded-full text-sm">
                            {orders.filter(o => o.order_items.some(i => (i.menu_items?.menu_categories?.station || 'kitchen') === 'kitchen')).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveStation('bar')}
                        style={activeStation === 'bar' ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeStation === 'bar' ? 'text-white scale-105 shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        <span>🍹 Bar</span>
                        <span className="bg-black bg-opacity-30 px-2 rounded-full text-sm">
                            {orders.filter(o => o.order_items.some(i => i.menu_items?.menu_categories?.station === 'bar')).length}
                        </span>
                    </button>
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-mono text-sm uppercase tracking-wide">
                    {activeStation} DISPLAY • {filteredOrders.length} ACTIVE
                </div>
            </div>

            {/* Ready Orders Summary Banner */}
            {orders.some(o => o.status === 'ready') && (
                <div className="bg-green-600 text-white p-3 px-4 shadow-md flex items-center justify-between flex-shrink-0 z-10 transition-all duration-500 ease-in-out">
                    <div className="font-bold flex items-center gap-3">
                        <span className="text-2xl animate-bounce">🔔</span>
                        <span className="tracking-wider text-xl">READY TO SERVE:</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto py-1 hide-scrollbar">
                        {orders.filter(o => o.status === 'ready').map(order => (
                            <div key={order.id} className="bg-white text-green-700 font-extrabold px-4 py-2 rounded-lg text-xl shadow-lg border-2 border-green-800 whitespace-nowrap transform hover:scale-105 transition-transform">
                                {order.table_info?.table_name}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 p-4 gap-4 overflow-x-auto flex flex-nowrap items-start w-full">
                {filteredOrders.length === 0 ? (
                    <div className="w-full flex items-center justify-center h-64 text-gray-500 text-2xl">
                        No Active {activeStation === 'kitchen' ? 'Kitchen' : 'Bar'} Orders
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="min-w-[280px] w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col shadow-xl flex-shrink-0 h-full max-h-[85vh] transition-colors duration-300">
                            {/* Header */}
                            <div className={`p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center ${order.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                <div>
                                    <h3 className="font-black text-3xl text-gray-900 dark:text-white uppercase tracking-wider">{order.table_info?.table_name}</h3>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(order.created_at), 'h:mm a')}</div>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                {['Starter', 'Main', 'Dessert', 'Drink'].map(course => {
                                    const courseItems = order.order_items.filter(i => (i.course_name || 'Main') === course);
                                    if (courseItems.length === 0) return null;

                                    return (
                                        <div key={course} className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{course}</h4>
                                            {courseItems.map(item => (
                                                <div key={item.id} className="mb-2">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-bold text-lg text-gray-900 dark:text-white">{item.quantity}x {item.menu_items?.name}</span>
                                                    </div>
                                                    {item.selected_modifiers && Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0 && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 pl-4 mt-1">
                                                            {item.selected_modifiers.map((m: any, idx: number) => (
                                                                <div key={idx}>+ {m.name}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 text-sm p-1 mt-1 rounded px-2 font-bold border border-red-200 dark:border-red-900/50">
                                                            Note: {item.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'preparing')}
                                        style={{ backgroundColor: 'var(--theme-color)' }}
                                        className="w-full text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all hover:brightness-110"
                                    >
                                        Start Preparing
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'ready')}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all"
                                    >
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'served')}
                                        className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>✅</span> Mark Served
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default KDSPage;
