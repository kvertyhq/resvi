import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../supabaseClient';
import { X, Lock, CreditCard } from 'lucide-react';

// Initialize Stripe outside of component
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!stripeKey) console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
const stripePromise = loadStripe(stripeKey || '');

interface CreditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pkg: { id: string; name: string; price: number; credits: number; currency: string } | null;
    restaurantId: string;
    onSuccess: () => void;
}

const CheckoutForm: React.FC<{ onSuccess: () => void; onClose: () => void; amount: number }> = ({ onSuccess, onClose, amount }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    // We don't redirect, we handle inline.
                    // But Stripe Payment Element usually requires a return_url unless redirect: 'if_required' is used
                    return_url: window.location.origin + '/admin/credits',
                },
                redirect: 'if_required',
            });

            if (error) {
                setMessage(error.message || 'Payment failed');
                setIsLoading(false);
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                // Payment Succeeded! Now Verify
                setMessage('Payment successful! Verifying credits...');

                const { data, error: verifyError } = await supabase.functions.invoke('verify-credit-purchase', {
                    body: { paymentIntentId: paymentIntent.id }
                });

                if (verifyError || (data && data.error)) {
                    console.error('Verify error:', verifyError || data.error);
                    setMessage('Payment succeeded but verification failed. Please contact support.');
                    // In production, we'd want to retry or alert admin automatically
                } else {
                    onSuccess();
                    onClose();
                }
                setIsLoading(false);
            }
        } catch (err: any) {
            setMessage('Unexpected error occurred.');
            console.error(err);
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4">
            <PaymentElement
                options={{ layout: 'tabs' }}
                onReady={() => console.log('Payment Element Ready')}
            />
            {message && <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">{message}</div>}
            <button
                disabled={isLoading || !stripe || !elements}
                id="submit"
                className="w-full mt-6 bg-brand-gold text-white py-3 rounded-md font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
                {isLoading ? (
                    <span className="flex items-center">Processing...</span>
                ) : (
                    <span className="flex items-center">
                        <Lock className="w-4 h-4 mr-2" />
                        Pay £{amount.toFixed(2)}
                    </span>
                )}
            </button>
        </form>
    );
};

const CreditPaymentModal: React.FC<CreditPaymentModalProps> = ({ isOpen, onClose, pkg, restaurantId, onSuccess }) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && pkg && restaurantId) {
            setClientSecret(null);
            setInitError(null);
            initializePayment();
        }
    }, [isOpen, pkg, restaurantId]);

    const initializePayment = async () => {
        if (!pkg) return;

        const { data, error } = await supabase.functions.invoke('buy-sms-credits', {
            body: {
                package_id: pkg.id,
                restaurant_id: restaurantId
            }
        });

        if (error || (data && data.error)) {
            console.error('Init Payment Error:', error || data?.error);
            setInitError('Failed to initialize payment. Please try again.');
        } else if (data && data.clientSecret) {
            setClientSecret(data.clientSecret);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-brand-gold" />
                        Secure Payment
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-blue-50 p-4 rounded-md">
                        <p className="text-sm text-blue-800">
                            Purchasing: <span className="font-bold">{pkg?.name}</span>
                        </p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">
                            £{pkg?.price.toFixed(2)}
                            <span className="text-sm font-normal text-blue-600 ml-2">({pkg?.credits} credits)</span>
                        </p>
                    </div>

                    {initError ? (
                        <div className="text-center py-4 text-red-600">
                            <p>{initError}</p>
                            <button onClick={initializePayment} className="mt-2 text-indigo-600 hover:underline">Retry</button>
                        </div>
                    ) : clientSecret ? (
                        <Elements stripe={stripePromise} options={{
                            clientSecret,
                            appearance: { theme: 'stripe' }
                        }}>
                            <CheckoutForm
                                onSuccess={onSuccess}
                                onClose={onClose}
                                amount={pkg?.price || 0}
                            />
                        </Elements>
                    ) : (
                        <div className="py-8 text-center text-gray-500 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold mb-3"></div>
                            Initializing secure checkout...
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 bg-gray-50 text-xs text-center text-gray-400 border-t border-gray-100">
                    Powered by Stripe. Your payment details are encrypted.
                </div>
            </div>
        </div>
    );
};

export default CreditPaymentModal;
