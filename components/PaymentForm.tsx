import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../supabaseClient';
import { useSettings } from '../context/SettingsContext';

interface PaymentFormProps {
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    amount: number; // Amount in pounds
    processing: boolean;
    setProcessing: (processing: boolean) => void;
    onBeforePayment?: () => Promise<{ success: boolean; error?: string }>;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, onError, amount, processing, setProcessing, onBeforePayment }) => {
    const { settings } = useSettings();
    const stripe = useStripe();
    const elements = useElements();
    const [cardError, setCardError] = useState<string | null>(null);
    const [cardholderName, setCardholderName] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);
        setCardError(null);

        // 0. Run Pre-Payment Checks (e.g., Min Order, Capacity)
        if (onBeforePayment) {
            try {
                const check = await onBeforePayment();
                if (!check.success) {
                    const msg = check.error || 'Validations failed.';
                    setCardError(msg);
                    onError(msg);
                    setProcessing(false);
                    return;
                }
            } catch (err: any) {
                const msg = err.message || 'Validation error occurred.';
                setCardError(msg);
                onError(msg);
                setProcessing(false);
                return;
            }
        }

        // 1. Create Payment Intent on Server (via Supabase RPC or Edge Function)
        // Here we assume a client-side helper function calls the backend
        try {
            const { data: { clientSecret }, error: intentError } = await createPaymentIntent(amount);

            if (intentError) {
                throw new Error(intentError.message || 'Failed to initialize payment');
            }

            // 2. Confirm Card Payment
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error("Card element not found");

            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement as any,
                    billing_details: {
                        name: cardholderName,
                    },
                }
            });

            if (error) {
                setCardError(error.message || 'Payment failed');
                onError(error.message || 'Payment failed');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess(paymentIntent.id);
            }
        } catch (err: any) {
            setCardError(err.message);
            onError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    // Real implementation using Supabase RPC
    const createPaymentIntent = async (amount: number) => {
        try {
            const { data, error } = await supabase.rpc('create_stripe_payment_intent', {
                p_amount: amount,
                p_currency: 'gbp',
                p_restaurant_id: settings?.id
            });

            if (error) {
                console.error('RPC Error:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (err) {
            console.error('Payment Init Error:', err);
            return { data: null, error: err };
        }
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="w-full">
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Name on card"
                    required
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold mb-4"
                />

                <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
                <div className="p-3 border border-gray-300 rounded-md bg-white">
                    <CardElement options={{
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
                    }} onChange={(e) => setCardError(e.error ? e.error.message : null)} />
                </div>
                {cardError && <div className="text-red-500 text-sm mt-2">{cardError}</div>}
            </div>

            {/* Note: The 'Pay' button is typically part of the parent modal's footer, 
                but Stripe requires it to be inside the <form> context or triggered programmatically.
                For integration, we might expose the handleSubmit or use a ref.
                For simplicity here, we assume this component allows self-submission or we trigger it externally.
             */}
        </form>
    );
};

export default PaymentForm;
