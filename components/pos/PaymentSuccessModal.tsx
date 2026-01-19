import React from 'react';
import { CheckCircle, Info } from 'lucide-react';

interface PaymentSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    amountPaid: number;
    remaining: number;
    isFullyPaid: boolean;
    change?: number; // Optional, for future use if we calculate change
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
    isOpen,
    onClose,
    amountPaid,
    remaining,
    isFullyPaid
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fadeIn transform transition-all scale-100">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isFullyPaid ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        {isFullyPaid ? (
                            <CheckCircle className="relative h-20 w-20 text-green-500" strokeWidth={2} />
                        ) : (
                            <CheckCircle className="relative h-20 w-20 text-blue-500" strokeWidth={2} />
                        )}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
                    {isFullyPaid ? 'Order Paid in Full!' : 'Payment Recorded'}
                </h2>

                {/* Details */}
                <div className="space-y-3 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">${amountPaid.toFixed(2)}</span>
                        </div>
                        {!isFullyPaid && (
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                                <span className="text-gray-500 dark:text-gray-400">Remaining</span>
                                <span className="text-lg font-semibold text-red-500 dark:text-red-400">${remaining.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Button */}
                <button
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-colors shadow-lg ${isFullyPaid
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {isFullyPaid ? 'Back to POS' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccessModal;
