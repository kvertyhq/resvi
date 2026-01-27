import React from 'react';
import { CheckCircle } from 'lucide-react';

interface OrderSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    dailyOrderNumber?: number;
    orderType: 'walkin' | 'table';
}

const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, onClose, orderId, dailyOrderNumber, orderType }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                        <CheckCircle className="relative h-20 w-20 text-green-500" strokeWidth={2} />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                    Order Created Successfully!
                </h2>

                {/* Subtitle */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                    {orderType === 'walkin' ? 'Walk-in order has been placed' : 'Table order has been placed'}
                </p>

                {/* Order ID */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                        Order ID
                    </div>
                    <div className="text-lg font-mono font-bold text-center text-gray-900 dark:text-white">
                        #{dailyOrderNumber || orderId.slice(0, 8).toUpperCase()}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-lg"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default OrderSuccessModal;
