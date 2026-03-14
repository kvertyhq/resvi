import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../supabaseClient';
import { CreditCard, Banknote, X } from 'lucide-react';

interface POSPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    onPaymentSuccess: (paymentMethod: string, transactionId?: string) => void;
}

const POSPaymentModal: React.FC<POSPaymentModalProps> = ({ isOpen, onClose, amount, onPaymentSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [processing, setProcessing] = useState(false);
    const [cardError, setCardError] = useState<string | null>(null);
    const [cardholderName, setCardholderName] = useState('');

    if (!isOpen) return null;

    const handleCashPayment = () => {
        onPaymentSuccess('cash');
        onClose();
    };

    const handleCardPayment = async () => {
        // Temporarily simplified for POS terminal use (external to this software)
        setProcessing(true);
        try {
            // In the future, this will connect to a physical terminal
            // For now, we assume the transaction was successful on the external terminal
            onPaymentSuccess('card');
            onClose();
        } catch (err: any) {
            setCardError('Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Process Payment
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Amount */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
                        Total Amount
                    </div>
                    <div className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                        £{amount.toFixed(2)}
                    </div>
                </div>

                {/* Payment Method Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${paymentMethod === 'cash'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        <Banknote className="h-5 w-5" />
                        Cash
                    </button>
                    <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${paymentMethod === 'card'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                    >
                        <CreditCard className="h-5 w-5" />
                        Card
                    </button>
                </div>

                {/* Payment Content */}
                {paymentMethod === 'cash' ? (
                    <div className="mb-6">
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                            Confirm cash payment received
                        </p>
                        <button
                            onClick={handleCashPayment}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
                        >
                            Confirm Cash Payment
                        </button>
                    </div>
                ) : (
                    <div className="mb-6">
                        {/* Cardholder Name and Details Hidden for POS Terminal Integration */}
                        {/* 
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cardholder Name
                            </label>
                            <input
                                type="text"
                                value={cardholderName}
                                onChange={(e) => setCardholderName(e.target.value)}
                                placeholder="Name on card"
                                required
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Card Details
                            </label>
                            <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                                <CardElement
                                    options={{
                                        hidePostalCode: true,
                                        style: {
                                            base: {
                                                fontSize: '16px',
                                                color: '#424770',
                                                '::placeholder': {
                                                    color: '#aab7c4',
                                                },
                                            },
                                            invalid: {
                                                color: '#9e2146',
                                            },
                                        },
                                    }}
                                    onChange={(e) => setCardError(e.error ? e.error.message : null)}
                                />
                            </div>
                            {cardError && <div className="text-red-500 text-sm mt-2">{cardError}</div>}
                        </div>
                        */}

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                            <p className="text-center text-blue-700 dark:text-blue-300 text-sm">
                                Please use the card terminal to process the payment of <strong>£{amount.toFixed(2)}</strong>.
                            </p>
                        </div>

                        <button
                            onClick={handleCardPayment}
                            disabled={processing}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                        >
                            {processing ? 'Processing...' : 'Confirm Card Payment'}
                        </button>
                    </div>
                )}

                {/* Cancel Button */}
                <button
                    onClick={onClose}
                    className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default POSPaymentModal;
