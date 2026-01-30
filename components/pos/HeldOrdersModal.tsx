import React from 'react';
import { X } from 'lucide-react';

interface HeldOrder {
    id: string;
    customer_name: string;
    items: any[];
    total: number;
    order_type: string;
    table_name: string | null;
    created_at: string;
    staff_name: string;
    discount_type: string | null;
    discount_amount: number;
}

interface HeldOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldOrders: HeldOrder[];
    onRetrieve: (order: HeldOrder) => void;
}

const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({ isOpen, onClose, heldOrders, onRetrieve }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Held Orders</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {heldOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400 text-lg">No held orders</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                                Orders you hold will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {heldOrders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => onRetrieve(order)}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">
                                                {order.customer_name}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {order.order_type === 'table' && order.table_name
                                                    ? `Table: ${order.table_name}`
                                                    : 'Walk-in'}
                                            </div>
                                            {order.staff_name && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                                    Staff: {order.staff_name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                                                ${order.total.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(order.created_at).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                        {order.discount_type && (
                                            <span className="ml-2 text-green-600 dark:text-green-400">
                                                • Discount applied
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeldOrdersModal;
