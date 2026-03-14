import React from 'react';
import { X, Plus, CreditCard, Eye, CheckCircle } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
    id: string;
    quantity: number;
    price_snapshot: number;
    notes?: string;
    course_name?: string;
    selected_modifiers?: any[];
    menu_items?: {
        name: string;
    };
}

interface Order {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    order_items?: OrderItem[];
    discount_amount?: number;
    payment_status?: string;
    daily_order_number?: number;
}

interface POSTableOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    tableName: string;
    tableId: string;
    onUpdate?: () => void;
}

const POSTableOrderModal: React.FC<POSTableOrderModalProps> = ({
    isOpen,
    onClose,
    orders,
    tableName,
    tableId,
    onUpdate
}) => {
    const { showAlert } = useAlert();
    const navigate = useNavigate();

    const handleComplete = async (orderId: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;
            if (onUpdate) onUpdate();
            // Don't close immediately if there are other orders? 
            // For now, close to refresh state cleanly.
            onClose();
        } catch (error) {
            console.error('Error completing order:', error);
            showAlert('Error', 'Failed to complete order', 'error');
        }
    };

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
            preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
            served: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tableName}</h2>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {orders.length} Active {orders.length === 1 ? 'Order' : 'Orders'}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                navigate(`/pos/order/${tableId}?mode=new`); // New Order
                                onClose();
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            New Order
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {orders.map((order) => {
                        const subtotal = order.order_items?.reduce((sum, item) => sum + (item.price_snapshot * item.quantity), 0) || 0;
                        const total = order.total_amount || 0;

                        return (
                            <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                {/* Order Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-mono font-bold text-gray-500 dark:text-gray-400">
                                            #{order.daily_order_number || order.id.slice(0, 8).toUpperCase()}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        {order.payment_status && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${order.payment_status === 'paid'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                                                }`}>
                                                {order.payment_status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        £{total.toFixed(2)}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="space-y-2 mb-4">
                                    {order.order_items?.map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <div className="flex-1">
                                                <span className="font-medium text-gray-900 dark:text-white">{item.quantity}x {item.menu_items?.name}</span>
                                                {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                                    <div className="text-gray-500 ml-4 text-xs">
                                                        {item.selected_modifiers.map((m: any) => m.name).join(', ')}
                                                    </div>
                                                )}
                                                {item.notes && <div className="text-orange-500 text-xs ml-4 italic">{item.notes}</div>}
                                            </div>
                                            <span className="text-gray-600 dark:text-gray-400">£{(item.price_snapshot * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                                    {order.status === 'pending' && (
                                        <button
                                            onClick={() => {
                                                navigate(`/pos/order/${tableId}?orderId=${order.id}`);
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium"
                                        >
                                            Add Items / Edit
                                        </button>
                                    )}

                                    {order.payment_status === 'paid' ? (
                                        <button
                                            onClick={() => handleComplete(order.id)}
                                            className="px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm font-bold shadow"
                                        >
                                            Mark Completed
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                navigate(`/pos/payment/${order.id}`);
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium shadow"
                                        >
                                            Payment
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default POSTableOrderModal;
