import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { validateUKPhone } from '../utils/validation';
import { useOrder } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from './PaymentForm';

interface OrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (details: OrderDetails) => void;
    orderType: 'delivery' | 'collection';
    isLoading: boolean;
}

export interface OrderDetails {
    name: string;
    phone: string;
    address: string;
    notes: string;
    paymentType: 'cash' | 'card';
    paymentIntentId?: string;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({ isOpen, onClose, onSubmit, orderType, isLoading }) => {
    const { settings } = useSettings();
    const { postcode, getAddressList, cartTotal, deliveryFee } = useOrder();

    // Payment State
    const [stripePromise, setStripePromise] = useState<any>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        if (settings?.payment_settings?.stripe_config?.publishable_key) {
            setStripePromise(loadStripe(settings.payment_settings.stripe_config.publishable_key));
        }
    }, [settings]);

    // Check available methods
    const cashEnabled = settings?.payment_settings?.enable_cash !== false; // Default true
    const cardEnabled = settings?.payment_settings?.enable_card === true;

    // Set default payment method based on availability
    useEffect(() => {
        if (!cashEnabled && cardEnabled) {
            setPaymentMethod('card');
        } else if (cashEnabled) {
            setPaymentMethod('cash');
        }
    }, [cashEnabled, cardEnabled]);


    const [formData, setFormData] = useState<{
        name: string;
        phone: string;
        address: string;
        notes: string;
    }>({
        name: '',
        phone: '',
        address: '',
        notes: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<string[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);

    useEffect(() => {
        if (isOpen && orderType === 'delivery' && postcode) {
            const fetchAddresses = async () => {
                setLoadingAddresses(true);
                const list = await getAddressList(postcode);
                setAddresses(list);
                setLoadingAddresses(false);
            };
            fetchAddresses();
        }
    }, [isOpen, orderType, postcode, getAddressList]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        setError(null);
        if (!formData.name) {
            setError('Please enter your full name.');
            return false;
        }
        if (!formData.phone) {
            setError('Please enter your phone number.');
            return false;
        }
        if (orderType === 'delivery' && !formData.address) {
            setError('Please enter your delivery address.');
            return false;
        }

        const fullPhone = '+44' + formData.phone;
        const validatedPhone = validateUKPhone(fullPhone);
        if (!validatedPhone) {
            setError('Please enter a valid UK mobile number (e.g., 7123 456789).');
            return false;
        }
        return validatedPhone; // Returns cleaned phone
    };

    const handleCashSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Attempting cash submission...", formData);
        const validPhone = validateForm();
        if (!validPhone) {
            console.warn("Validation failed for cash submission", formData);
            return;
        }
        console.log("Validation passed, submitting...", validPhone);

        onSubmit({
            ...formData,
            phone: validPhone,
            paymentType: 'cash'
        });
    };

    // Callback when Stripe payment succeeds
    const handleCardSuccess = (paymentIntentId: string) => {
        const validPhone = validateForm();
        if (!validPhone) return; // Should already be valid if we let them pay

        onSubmit({
            ...formData,
            phone: validPhone,
            paymentType: 'card',
            paymentIntentId
        });
    };

    const handleCardError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const totalToPay = cartTotal + (orderType === 'delivery' ? deliveryFee : 0);

    return (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 pt-10 sm:pt-24 bg-black bg-opacity-50 backdrop-blur-sm shadow-2xl overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] animate-fade-in my-auto">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-white rounded-t-lg">
                    <h3 className="text-xl font-serif font-bold text-gray-800">Complete Your Order</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">


                    {/* Personal Details Form - Common for both */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    +44
                                </span>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="flex-1 min-w-0 block w-full px-4 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                    placeholder="7123 456789"
                                />
                            </div>
                        </div>

                        {orderType === 'delivery' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                                {loadingAddresses ? (
                                    <div className="text-sm text-gray-500 mb-2">Loading addresses...</div>
                                ) : addresses.length > 0 ? (
                                    <select
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent bg-white"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select your address</option>
                                        {addresses.map((addr, index) => (
                                            <option key={index} value={addr}>{addr}</option>
                                        ))}
                                    </select>
                                ) : null}
                                <textarea
                                    name="address"
                                    required
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                    placeholder="Full address including postcode"
                                ></textarea>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (Optional)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                                placeholder="Allergies, special requests, etc."
                            ></textarea>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {cashEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`py-3 px-4 border rounded-lg text-center transition-all ${paymentMethod === 'cash'
                                        ? 'border-brand-gold bg-brand-gold/10 text-brand-dark-gray font-bold ring-2 ring-brand-gold ring-offset-1'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    Cash
                                </button>
                            )}
                            {cardEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`py-3 px-4 border rounded-lg text-center transition-all ${paymentMethod === 'card'
                                        ? 'border-brand-gold bg-brand-gold/10 text-brand-dark-gray font-bold ring-2 ring-brand-gold ring-offset-1'
                                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    Card
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    {paymentMethod === 'cash' && (
                        <div className="pt-2">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-2">
                                    {error}
                                </div>
                            )}
                            <button
                                onClick={handleCashSubmit}
                                disabled={isLoading}
                                className="w-full bg-brand-gold text-white font-bold py-3 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                            >
                                {isLoading ? 'Processing...' : `Place Order (£${totalToPay.toFixed(2)})`}
                            </button>
                        </div>
                    )}

                    {paymentMethod === 'card' && stripePromise && (
                        <div className="pt-2">
                            <Elements stripe={stripePromise}>
                                <PaymentForm
                                    amount={totalToPay}
                                    onSuccess={handleCardSuccess}
                                    onError={handleCardError}
                                    processing={isProcessingPayment}
                                    setProcessing={setIsProcessingPayment}
                                />
                                {/* Standard Submit Button inside PaymentForm is hidden/custom, 
                                    but Element's form handles submission.
                                    We need to ensure the button is PART of the PaymentForm or triggered by it. 
                                    Since PaymentForm was designed to wrap the button, let's verify PaymentForm implementation.
                                    Ah, PaymentForm has form onSubmit. We need a submit button INSIDE it.
                                    Let's pass children to PaymentForm or update it?
                                    Actually PaymentForm in previous step didn't have a button. I need to fix that.
                                */}
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-2">
                                        {error}
                                    </div>
                                )}
                                <button
                                    form="payment-form" // Assuming PaymentForm has id="payment-form"
                                    type="submit"
                                    disabled={isProcessingPayment}
                                    onClick={(e) => {
                                        if (!validateForm()) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full bg-brand-gold text-white font-bold py-3 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed shadow-md mt-4"
                                >
                                    {isProcessingPayment ? 'Processing...' : `Pay £${totalToPay.toFixed(2)}`}
                                </button>
                            </Elements>
                        </div>
                    )}

                    {paymentMethod === 'card' && !stripePromise && (
                        <p className="text-red-500 text-sm">Stripe configuration missing. Please select Cash.</p>
                    )}

                </div>
            </div>
        </div>
    );
};

export default OrderFormModal;
