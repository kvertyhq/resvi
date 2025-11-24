import React from 'react';
import { useNavigate } from 'react-router-dom';

interface OrderResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    message?: string;
}

const OrderResultModal: React.FC<OrderResultModalProps> = ({ isOpen, onClose, type, message }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
                {/* Decorative background element */}
                <div className={`absolute top-0 left-0 w-full h-2 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}></div>

                <div className="text-center">
                    <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isSuccess ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                    </div>

                    <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                        {isSuccess ? 'Order Placed!' : 'Something went wrong'}
                    </h3>

                    <p className="text-gray-500 mb-8">
                        {message || (isSuccess
                            ? 'Your order has been successfully placed. We will start preparing it shortly.'
                            : 'We couldn\'t place your order. Please try again or contact the restaurant.')}
                    </p>

                    <div className="space-y-3">
                        {isSuccess ? (
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/');
                                }}
                                className="w-full px-4 py-3 bg-brand-dark-gray text-white rounded-lg font-semibold hover:bg-brand-mid-gray transition-colors"
                            >
                                Back to Home
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 bg-brand-dark-gray text-white rounded-lg font-semibold hover:bg-brand-mid-gray transition-colors"
                            >
                                Try Again
                            </button>
                        )}

                        {isSuccess && (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-3 bg-white text-brand-dark-gray border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderResultModal;
