import React from 'react';
import { X } from 'lucide-react';

interface OrderItem {
    id: string;
    menu_item?: {
        name: string;
    };
    quantity: number;
    price_snapshot: number;
    selected_modifiers?: any[];
    notes?: string;
}

interface OrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: string;
        readable_id?: string;
        daily_order_number?: number;
        created_at: string;
        total_amount: number;
        status: string;
        payment_status: string;
        discount_amount?: number;
        discount_type?: string;
        profiles?: {
            full_name: string;
            phone: string;
        };
        order_items?: OrderItem[];
    } | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    const subtotal = order.order_items?.reduce((sum, item) => sum + (item.price_snapshot * item.quantity), 0) || 0;
    const discount = order.discount_amount || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Order Details
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {order.daily_order_number ? `#${order.daily_order_number}` : (order.readable_id || `#${order.id.slice(0, 8)}`)} • {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Customer Info */}
                    {order.profiles && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Customer</h3>
                            <p className="text-gray-700 dark:text-gray-300">{order.profiles.full_name}</p>
                            {order.profiles.phone && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{order.profiles.phone}</p>
                            )}
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h3>
                        <div className="space-y-3">
                            {order.order_items?.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {item.quantity}x {item.menu_item?.name || 'Item'}
                                        </div>
                                        {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {item.selected_modifiers.map((mod: any, idx: number) => (
                                                    <span key={idx}>
                                                        {mod.name}
                                                        {idx < item.selected_modifiers!.length - 1 && ', '}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {item.notes && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                                                Note: {item.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white ml-4">
                                        £{(item.price_snapshot * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                <span>Subtotal</span>
                                <span>£{subtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>Discount ({order.discount_type})</span>
                                    <span>-£{discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span>Total</span>
                                <span>£{order.total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="mt-4 flex gap-3">
                        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                            <div className="font-semibold text-gray-900 dark:text-white capitalize">
                                {order.status}
                            </div>
                        </div>
                        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Payment</div>
                            <div className={`font-semibold capitalize ${order.payment_status === 'paid'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                                }`}>
                                {order.payment_status}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;
