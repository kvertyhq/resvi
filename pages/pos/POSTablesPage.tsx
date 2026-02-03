import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import TableMap from '../../components/pos/TableMap';
import { useSettings } from '../../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import POSQRModal from '../../components/pos/POSQRModal';
import ManageFloorsModal from '../../components/pos/ManageFloorsModal';
import POSTableEditModal from '../../components/pos/POSTableEditModal';
import POSTableOrderModal from '../../components/pos/POSTableOrderModal';
import HeldOrdersModal from '../../components/pos/HeldOrdersModal';
import NotificationModal from '../../components/pos/NotificationModal';
import { Pause } from 'lucide-react';

const POSTablesPage: React.FC = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [tables, setTables] = useState<any[]>([]);
    const [floors, setFloors] = useState<any[]>([]);
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isQRMode, setIsQRMode] = useState(false);
    const [isManageFloorsOpen, setIsManageFloorsOpen] = useState(false);

    // QR Modal State
    const [qrTable, setQrTable] = useState<any>(null);
    const [editTable, setEditTable] = useState<any>(null);

    // Order View Modal State
    const [viewOrderTable, setViewOrderTable] = useState<any>(null);
    const [viewOrders, setViewOrders] = useState<any[]>([]);

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
            fetchData();
            fetchHeldOrders();
        }
    }, [settings?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Floors
            const { data: floorData } = await supabase
                .rpc('get_pos_floors', { p_restaurant_id: settings?.id });

            const loadedFloors = floorData || [];
            setFloors(loadedFloors);

            // Default selection logic: existing selection -> first floor -> 'All' equivalent?
            // New logic: We always show ONE floor map. No 'All'.
            if (!selectedFloorId && loadedFloors.length > 0) {
                setSelectedFloorId(loadedFloors[0].id);
            }

            // 2. Fetch Tables
            const { data: tableData, error } = await supabase
                .rpc('get_pos_tables', { p_restaurant_id: settings?.id });

            if (error) throw error;

            // 3. Fetch Active Orders to determine status
            const { data: activeOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', settings?.id)
                .in('status', ['pending', 'preparing', 'ready', 'served']) // All active statuses
                .neq('status', 'completed')
                .neq('status', 'cancelled');

            // Map table_id -> Orders[]
            const orderMap = new Map<string, any[]>();
            if (activeOrders) {
                activeOrders.forEach(order => {
                    const existing = orderMap.get(order.table_id) || [];
                    orderMap.set(order.table_id, [...existing, order]);
                });
            }

            // Note: 'paid' is usually considered "billed" phase, but for "busy" visualization it is still occupied until they leave (completed).
            // Optimization: Map to specific statuses if we want 'occupied' vs 'billed' colors.
            // Current TableMap supports: 'available', 'occupied', 'billed', 'reserved'.

            // const occupiedTableIds = new Set(activeOrders?.map(o => o.table_id));

            // Auto-arrange if missing X/Y or Floor mapping fallback
            let gridCol = 0;
            let gridRow = 0;
            const COL_WIDTH = 120;
            const ROW_HEIGHT = 120;

            const normalizedData = (tableData || []).map(t => {
                let finalX = t.x;
                let finalY = t.y;

                if (!finalX && !finalY) {
                    finalX = 50 + (gridCol * COL_WIDTH);
                    finalY = 50 + (gridRow * ROW_HEIGHT);

                    gridCol++;
                    if (gridCol > 5) {
                        gridCol = 0;
                        gridRow++;
                    }
                }

                const activeOrders = orderMap.get(t.id) || [];
                let status = 'available';

                if (activeOrders.length > 0) {
                    // If ANY order is occupied -> occupied
                    // If ALL are paid -> billed
                    const hasOccupied = activeOrders.some((o: any) => o.payment_status !== 'paid');
                    if (hasOccupied) {
                        status = 'occupied';
                    } else {
                        status = 'billed';
                    }
                }

                return {
                    ...t,
                    x: finalX,
                    y: finalY,
                    width: t.width || 100,
                    height: t.height || 100,
                    shape: t.shape || 'rectangle',
                    status: status,
                    activeOrders: activeOrders,
                    updated: false
                };
            });

            setTables(normalizedData);
        } catch (error) {
            console.error('Error fetching tables/floors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTableUpdate = (id: string, x: number, y: number) => {
        setTables(prev => prev.map(t =>
            t.id === id ? { ...t, x, y, updated: true } : t
        ));
    };

    const handleSaveLayout = async () => {
        const updates = tables
            .filter(t => t.updated)
            .map(({ id, x, y }) => ({
                id,
                x: Math.round(x), // Ensure integer
                y: Math.round(y)
            }));

        if (updates.length === 0) {
            setIsEditMode(false);
            return;
        }

        try {
            setLoading(true);
            for (const update of updates) {
                const { error } = await supabase
                    .from('table_info')
                    .update({ x: update.x, y: update.y })
                    .eq('id', update.id);

                if (error) throw error;
            }

            alert('Layout saved successfully!');
            setIsEditMode(false);
            fetchData(); // re-fetch to clean state
        } catch (error: any) {
            console.error('Error saving layout:', error);
            alert('Failed to save layout');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTable = async () => {
        if (!selectedFloorId) return;
        setLoading(true);
        try {
            // Determine next table number roughly
            const existingNums = tables.map(t => parseInt(t.table_name.replace(/\D/g, '')) || 0);
            const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
            const newName = `Table ${nextNum}`;

            const { error } = await supabase
                .from('table_info')
                .insert({
                    restaurant_id: settings?.id,
                    table_name: newName,
                    floor_id: selectedFloorId,
                    zone: floors.find(f => f.id === selectedFloorId)?.name || 'Main Hall', // Legacy support
                    count: 4,
                    x: 50,
                    y: 50
                });

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error adding table:', error);
            alert('Failed to add table');
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = async (table: any) => {
        if (isEditMode) {
            setEditTable(table);
        } else if (isQRMode) {
            setQrTable(table);
        } else {
            // If table has active order, show modal first
            if (table.activeOrders && table.activeOrders.length > 0) {
                // Fetch full order details with items for ALL orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            *,
                            menu_items ( name )
                        )
                    `)
                    .in('id', table.activeOrders.map((o: any) => o.id));

                if (ordersData) {
                    setViewOrders(ordersData);
                    setViewOrderTable(table);
                }
            } else {
                // No active order, go directly to order page
                navigate(`/pos/order/${table.id}`);
            }
        }
    };

    // Filter tables for current floor
    // If no floors, show all (legacy mode)
    const displayedTables = floors.length > 0 && selectedFloorId
        ? tables.filter(t => t.floor_id === selectedFloorId || (!t.floor_id && t.zone === floors.find(f => f.id === selectedFloorId)?.name))
        : tables;

    if (loading) return <div className="p-8 text-gray-900 dark:text-white">Loading tables...</div>;

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 p-4 gap-4 transition-colors duration-300">
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-wider shrink-0">Floor Plan</h1>

                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 transition-colors overflow-x-auto max-w-xl">
                        {floors.map(floor => (
                            <button
                                key={floor.id}
                                onClick={() => setSelectedFloorId(floor.id)}
                                style={selectedFloorId === floor.id ? { backgroundColor: 'var(--theme-color)' } : {}}
                                className={`px-3 py-1 rounded-md text-sm transition-all whitespace-nowrap ${selectedFloorId === floor.id ? 'text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {floor.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pt-3">
                    <button
                        onClick={async () => {
                            await fetchHeldOrders();
                            setShowHeldOrdersModal(true);
                        }}
                        className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white border border-yellow-700 transition-all flex items-center gap-2 font-bold whitespace-nowrap relative"
                    >
                        <Pause className="h-5 w-5" />
                        Held Orders
                        {heldOrders.length > 0 && (
                            <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                                {heldOrders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/pos/history')}
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:text-gray-900 dark:hover:text-white transition-all flex items-center gap-2 font-bold whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        History
                    </button>

                    <button
                        onClick={() => setIsQRMode(!isQRMode)}
                        className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 font-bold whitespace-nowrap ${isQRMode ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                        {isQRMode ? 'Viewing QRs' : 'QR Codes'}
                    </button>

                    {isEditMode ? (
                        <>
                            <button
                                onClick={() => { fetchData(); setIsEditMode(false); }}
                                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors whitespace-nowrap"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveLayout}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 shadow-lg transition-colors font-semibold whitespace-nowrap"
                            >
                                Save Layout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 transition-all flex items-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Edit Layout
                        </button>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 overflow-auto relative rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-800 transition-colors duration-300">
                <TableMap
                    tables={displayedTables}
                    onTableUpdate={handleTableUpdate}
                    onTableClick={handleTableClick}
                    isEditMode={isEditMode}
                />
            </div>

            <POSQRModal
                isOpen={!!qrTable}
                onClose={() => setQrTable(null)}
                tableId={qrTable?.id}
                tableName={qrTable?.table_name}
                restaurantId={settings?.id}
            />

            <ManageFloorsModal
                isOpen={isManageFloorsOpen}
                onClose={() => setIsManageFloorsOpen(false)}
                floors={floors}
                settingsId={settings?.id}
                onUpdate={fetchData}
            />

            <POSTableEditModal
                isOpen={!!editTable}
                onClose={() => setEditTable(null)}
                table={editTable}
                onUpdate={fetchData}
            />

            <POSTableOrderModal
                isOpen={viewOrders.length > 0}
                onClose={() => {
                    setViewOrders([]);
                    setViewOrderTable(null);
                }}
                orders={viewOrders}
                tableName={viewOrderTable?.table_name || ''}
                tableId={viewOrderTable?.id || ''}
                onUpdate={fetchData}
            />

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

                        // Navigate to appropriate order page based on order type
                        if (heldOrder.order_type === 'walkin') {
                            navigate('/pos/order/walk-in', {
                                state: { heldOrder }
                            });
                        } else if (heldOrder.table_id) {
                            navigate(`/pos/order/${heldOrder.table_id}`, {
                                state: { heldOrder }
                            });
                        }
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

export default POSTablesPage;
