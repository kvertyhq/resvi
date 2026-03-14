import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { format } from 'date-fns';
import KDSTimer from '../../components/pos/KDSTimer';
import { StationService, Station } from '../../services/StationService';

// --- Types ---
interface KDSMenuItem {
    name: string;
    category_id: string;
}

interface KDSOrderItem {
    id: string;
    menu_item_id: string;
    quantity: number;
    notes?: string;
    course_name: string;
    selected_modifiers: any[];
    name_snapshot?: string; // For misc items and snapshots
    menu_items: KDSMenuItem;
    station_id?: string; // Added
    status: string;
}

interface KDSTableInfo {
    table_name: string;
}

interface KDSOrder {
    id: string;
    readable_id: string;
    daily_order_number?: number;
    table_id: string;
    status: string;
    created_at: string;
    order_items: KDSOrderItem[];
    table_info: KDSTableInfo;
    order_type?: string;
}

const KDSPage: React.FC = () => {
    const { settings } = useSettings();
    const { showAlert } = useAlert();
    const [orders, setOrders] = useState<KDSOrder[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStationId, setActiveStationId] = useState<string | null>(null);
    const previousOrderCount = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 0.5;
    }, []);

    // 1. Fetch Stations on Mount
    useEffect(() => {
        if (settings?.id) {
            const loadStations = async () => {
                try {
                    const data = await StationService.getStations(settings.id);
                    setStations(data);

                    // Set default station
                    if (data.length > 0) {
                        const defaultStation = data.find(s => s.is_default && s.type === 'kitchen') || data[0];
                        setActiveStationId(defaultStation.id);
                    }
                } catch (error: any) {
                    console.error("Failed to load stations for KDS", error);
                    showAlert('Station Loading Error', error.message || 'Unknown error', 'error');
                }
            };
            loadStations();
        }
    }, [settings?.id]);

    // 2. Fetch Orders & Subscribe
    useEffect(() => {
        if (settings?.id) {
            fetchOrders();
            const subscription = supabase
                .channel('kds_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
                .subscribe();

            return () => { subscription.unsubscribe(); };
        }
    }, [settings?.id]);

    const fetchOrders = async () => {
        if (!settings?.id) return;
        setLoading(true); // Maybe debounced or just initial load? Keeping for now.
        try {
            const { data, error } = await supabase
                .rpc('get_pos_kds_orders', { p_restaurant_id: settings.id });

            if (error) throw error;

            const typedData = (data || []) as unknown as KDSOrder[];

            // Check for new orders to play sound
            if (typedData.length > previousOrderCount.current && previousOrderCount.current !== 0) {
                audioRef.current?.play().catch(e => console.log('Audio play failed', e));
            }
            previousOrderCount.current = typedData.length;

            setOrders(typedData);
        } catch (error: any) {
            console.error('KDS Fetch Error:', error);
            showAlert('Order Fetch Error', error.message || error.details || 'Check console', 'error');
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
            showAlert('Error', 'Failed to update status', 'error');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 dark:bg-yellow-500 text-yellow-900 dark:text-black',
            confirmed: 'bg-purple-100 dark:bg-purple-600 text-purple-900 dark:text-white',
            preparing: 'bg-blue-100 dark:bg-blue-600 text-blue-900 dark:text-white',
            ready: 'bg-green-100 dark:bg-green-600 text-green-900 dark:text-white'
        };
        const colorClass = colors[status] || 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white';
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${colorClass}`}>
                {status}
            </span>
        );
    };

    // Filter orders to only show items for the current station
    const getFilteredOrders = () => {
        if (!activeStationId) return [];

        return orders.map(order => {
            // Filter items that match the active station
            const stationItems = order.order_items.filter(item => {
                // Logic: Match item.station_id. 
                // Fallback: If item.station_id is missing (legacy data), maybe check default kitchen?
                // For stricter logic: only show matches.
                return item.station_id === activeStationId;
            });

            // Return order with filtered items.
            return {
                ...order,
                order_items: stationItems
            };
        }).filter(order => order.order_items.length > 0); // Only show orders with items for filtering
    };

    const filteredOrders = getFilteredOrders();
    const activeStationName = stations.find(s => s.id === activeStationId)?.name || 'Loading...';

    if (loading && orders.length === 0 && stations.length === 0) return <div className="text-gray-900 dark:text-white p-8">Loading KDS...</div>;

    // Helper: calculate count for badges
    const getCountForStation = (stationId: string) => {
        return orders.filter(o => o.order_items.some(i => i.station_id === stationId)).length;
    };

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-300">
            {/* Station Selector Header */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 transition-colors duration-300">
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto p-1 justify-center md:justify-start md:ml-12">
                    {stations.map(station => (
                        <button
                            key={station.id}
                            onClick={() => setActiveStationId(station.id)}
                            style={activeStationId === station.id ? { backgroundColor: 'var(--theme-color)' } : {}}
                            className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeStationId === station.id ? 'text-white scale-105 shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
                        >
                            <span>{station.type === 'bar' ? '🍹' : '👨‍🍳'} {station.name}</span>
                            <span className="bg-black bg-opacity-30 px-2 rounded-full text-sm">
                                {getCountForStation(station.id)}
                            </span>
                        </button>
                    ))}
                    {stations.length === 0 && !loading && (
                        <div className="text-red-500">No Stations Configured</div>
                    )}
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-mono text-sm uppercase tracking-wide">
                    {activeStationName} DISPLAY • {filteredOrders.length} ACTIVE
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
                                {order.table_info?.table_name || `#${order.daily_order_number || order.readable_id}`}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 p-4 gap-4 overflow-x-auto flex flex-nowrap items-start w-full">
                {filteredOrders.length === 0 ? (
                    <div className="w-full flex items-center justify-center h-64 text-gray-500 text-2xl">
                        No Active Orders for {activeStationName}
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="min-w-[280px] w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col shadow-xl flex-shrink-0 h-full max-h-[85vh] transition-colors duration-300">
                            {/* Header */}
                            <div className={`p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start gap-2 ${order.status === 'pending' || order.status === 'confirmed' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {/* Only show small ID if we have a table name (otherwise ID is the main header) */}
                                        {order.table_info?.table_name && (
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">#{order.daily_order_number || order.readable_id}</span>
                                        )}
                                        {order.order_type && (
                                            <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                                {order.order_type.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-black text-3xl text-gray-900 dark:text-white uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                                        {order.table_info?.table_name || `#${order.daily_order_number || order.readable_id}`}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(order.created_at), 'h:mm a')}</div>
                                        <KDSTimer startTime={order.created_at} />
                                    </div>
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
                                                        <span className="font-bold text-lg text-gray-900 dark:text-white">{item.quantity}x {item.name_snapshot || item.menu_items?.name}</span>
                                                    </div>
                                                    {item.selected_modifiers && Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0 && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400 pl-4 mt-1">
                                                            {item.selected_modifiers.map((m: any, idx: number) => (
                                                                <div key={idx}>+ {m.name}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 text-sm p-2 mt-1 rounded border-l-4 border-yellow-500 flex items-start gap-2">
                                                            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                            </svg>
                                                            <div className="flex-1">
                                                                <div className="font-bold text-xs uppercase">Special Instructions:</div>
                                                                <div className="font-medium">{item.notes}</div>
                                                            </div>
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
                                {(order.status === 'pending' || order.status === 'confirmed') && (
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
