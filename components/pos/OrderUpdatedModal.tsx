import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface OrderUpdatedModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId?: string;
    dailyOrderNumber?: number;
    title?: string;
}

const OrderUpdatedModal: React.FC<OrderUpdatedModalProps> = ({ isOpen, onClose, orderId, dailyOrderNumber, title }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fadeIn transform transition-all scale-100">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        <CheckCircle className="relative h-20 w-20 text-blue-500" strokeWidth={2} />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                    {title || 'Order Updated Successfully!'}
                </h2>

                {/* Order ID */}
                {(dailyOrderNumber || orderId) && (
                    <div className="text-center text-gray-500 dark:text-gray-400 mb-6 font-mono bg-gray-100 dark:bg-gray-700 py-2 rounded-lg">
                        Order #{dailyOrderNumber || (orderId ? orderId.slice(0, 8).toUpperCase() : '')}
                    </div>
                )}

                {/* Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-[var(--theme-color)] hover:brightness-110 text-white rounded-xl font-bold transition-colors shadow-lg"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default OrderUpdatedModal;
