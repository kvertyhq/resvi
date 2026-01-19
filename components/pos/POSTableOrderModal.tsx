import React from 'react';
import { X, Plus, CreditCard, Eye, CheckCircle } from 'lucide-react';
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
}

interface POSTableOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    tableName: string;
    tableId: string;
    onUpdate?: () => void;
}

const POSTableOrderModal: React.FC<POSTableOrderModalProps> = ({
    isOpen,
    onClose,
    order,
    tableName,
    tableId,
    onUpdate
}) => {


    const navigate = useNavigate();

    const handleComplete = async () => {
        if (!order) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id);

            if (error) throw error;
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error('Error completing order:', error);
            alert('Failed to complete order');
        }
    };

    if (!isOpen || !order) return null;

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
            preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
            served: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const subtotal = order.order_items?.reduce((sum, item) => sum + (item.price_snapshot * item.quantity), 0) || 0;
    const discount = order.discount_amount || 0;
    const total = order.total_amount || 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tableName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                            {order.payment_status && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${order.payment_status === 'paid'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                    {order.payment_status}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Order Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Items</h3>
                    <div className="space-y-3">
                        {order.order_items?.map((item) => (
                            <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {item.quantity}x {item.menu_items?.name || 'Unknown Item'}
                                        </div>
                                        {item.course_name && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {item.course_name}
                                            </div>
                                        )}
                                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 pl-4">
                                                {item.selected_modifiers.map((mod: any, idx: number) => (
                                                    <div key={idx}>+ {mod.name}</div>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && (
                                            <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-2 text-sm">
                                                <div className="font-semibold text-yellow-900 dark:text-yellow-200">Note:</div>
                                                <div className="text-yellow-800 dark:text-yellow-300">{item.notes}</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            £{(item.price_snapshot * item.quantity).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            £{item.price_snapshot.toFixed(2)} each
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal:</span>
                            <span>£{subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Discount:</span>
                                <span>-£{discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span>Total:</span>
                            <span>£{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <button
                        onClick={() => {
                            navigate(`/pos/order/${tableId}`);
                            onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        Add Items
                    </button>
                    {order.payment_status === 'paid' ? (
                        <button
                            onClick={handleComplete}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--theme-color)] text-white rounded-lg transition-colors font-bold shadow-lg hover:brightness-110"
                        >
                            <CheckCircle className="h-5 w-5" />
                            Mark as Completed
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                navigate(`/pos/payment/${order.id}`);
                                onClose();
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <CreditCard className="h-5 w-5" />
                            Payment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default POSTableOrderModal;
