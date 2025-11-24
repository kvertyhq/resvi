import React, { useState } from 'react';
import { useOrder } from '../context/OrderContext';
import { useSettings } from '@/context/SettingsContext';
import OrderFormModal, { OrderDetails } from './OrderFormModal';
import OrderResultModal from './OrderResultModal';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const OrderSummary: React.FC = () => {
    const { cart, cartTotal, updateQuantity, removeFromCart, orderType, postcode, deliveryDistance, collectionDate, collectionTime, submitOrder } = useOrder();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [resultType, setResultType] = useState<'success' | 'error'>('success');
    const [resultMessage, setResultMessage] = useState('');

    const subtotal = cartTotal;
    const deliveryFee = orderType === 'delivery' ? 20 : 0;
    const total = subtotal + deliveryFee;

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    const { settings } = useSettings();

    const handleOrderClick = () => {
        setIsModalOpen(true);
    };

    const handleOrderSubmit = async (details: OrderDetails) => {
        setIsLoading(true);
        const result = await submitOrder({
            ...details,
            deliveryFee,
            orderType: orderType || 'collection'
        });
        setIsLoading(false);

        if (result.success) {
            setIsModalOpen(false);
            setResultType('success');
            setResultMessage('Your order has been successfully placed!');
            setResultModalOpen(true);
        } else {
            setResultType('error');
            setResultMessage('Failed to place order. Please try again.');
            setResultModalOpen(true);
        }
    };

    return (
        <aside className="sticky top-24">
            <div className="border border-gray-200 bg-gray-50/50 p-6 rounded-lg">
                <h3 className="text-2xl font-serif font-bold text-brand-dark-gray border-b border-gray-200 pb-4 mb-4">Order Summary</h3>

                {cart.length === 0 ? (
                    <p className="text-brand-mid-gray text-center py-8">Your cart is empty</p>
                ) : (
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-brand-dark-gray">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-5 w-5 border rounded-full text-gray-500">-</button>
                                        <span className="text-sm font-bold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-5 w-5 border rounded-full text-gray-500">+</button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-brand-dark-gray">{settings?.currency}{(item.price * item.quantity).toFixed(2)}</p>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 mt-1"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {cart.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-brand-mid-gray">Subtotal</span>
                            <span className="font-semibold text-brand-dark-gray">{settings?.currency}{subtotal.toFixed(2)}</span>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="flex justify-between">
                                <span className="text-brand-mid-gray">Delivery Fee</span>
                                <span className="font-semibold text-brand-dark-gray">{settings?.currency}{deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg pt-2 border-t border-gray-100">
                            <span className="text-brand-dark-gray font-bold">TOTAL</span>
                            <span className="font-bold text-brand-dark-gray">{settings?.currency}{total.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200 text-sm space-y-2">
                    {orderType === 'delivery' && (
                        <>
                            <div className="flex justify-between items-center"><span className="font-semibold">Method</span> <span className="bg-gray-200 px-2 py-0.5 rounded">Delivery</span></div>
                            <div className="flex justify-between items-center"><span className="font-semibold">Postcode</span> <span>{postcode}</span></div>
                            {deliveryDistance && (
                                <div className="flex justify-between items-center"><span className="font-semibold">Distance</span> <span>{(deliveryDistance * 0.621371).toFixed(1)} miles</span></div>
                            )}
                        </>
                    )}
                    {orderType === 'collection' && (
                        <>
                            <div className="flex justify-between items-center"><span className="font-semibold">Method</span> <span className="bg-gray-200 px-2 py-0.5 rounded">Collection</span></div>
                            <div className="flex justify-between items-center"><span className="font-semibold">Date</span> <span>{formatDate(collectionDate)}</span></div>
                            <div className="flex justify-between items-center"><span className="font-semibold">Time</span> <span>{collectionTime}</span></div>
                        </>
                    )}
                </div>

                <button
                    disabled={cart.length === 0}
                    onClick={handleOrderClick}
                    className="w-full mt-6 bg-brand-dark-gray text-white py-3 rounded-lg font-bold uppercase tracking-wider transition-opacity duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-mid-gray"
                >
                    Order Now
                </button>
            </div>

            <OrderFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleOrderSubmit}
                orderType={orderType || 'collection'}
                isLoading={isLoading}
            />

            <OrderResultModal
                isOpen={resultModalOpen}
                onClose={() => setResultModalOpen(false)}
                type={resultType}
                message={resultMessage}
            />
        </aside>
    );
};

export default OrderSummary;
