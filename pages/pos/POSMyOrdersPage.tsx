import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { usePOS } from '../../context/POSContext';
import { useSettings } from '../../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const POSMyOrdersPage: React.FC = () => {
    const { staff } = usePOS();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (staff?.id) {
            fetchMyOrders();
        }
    }, [staff?.id]);

    const fetchMyOrders = async () => {
        setLoading(true);
        try {
            // Fetch active dine-in orders (not completed/cancelled)
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id, 
                    table_id,
                    total_amount, 
                    status, 
                    created_at,
                    table_info ( table_name )
                `)
                .eq('order_type', 'dine_in')
                .neq('status', 'completed')
                .neq('status', 'cancelled')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'preparing': return 'bg-blue-100 text-blue-800';
            case 'ready': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">Active Dine-In Orders</h1>

            {loading ? (
                <div className="text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p>No active orders found.</p>
                    <button onClick={() => navigate('/pos')} className="mt-4 text-orange-500 hover:text-orange-400">
                        Go to Tables
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => navigate(`/pos/order/${order.table_id}`)} // Re-opening order not fully implemented yet via tableId link, but logic is same
                            className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-orange-500 cursor-pointer transition-all shadow-lg"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">
                                    {order.table_info?.table_name || 'Unknown Table'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="flex justify-between items-end text-gray-400 text-sm mt-4">
                                <span>{format(new Date(order.created_at), 'h:mm a')}</span>
                                <span className="text-white font-mono text-lg font-bold">
                                    {settings?.currency || '$'}{order.total_amount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default POSMyOrdersPage;
