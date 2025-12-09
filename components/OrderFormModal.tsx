import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { validateUKPhone } from '../utils/validation';
import { useOrder } from '../context/OrderContext';

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
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({ isOpen, onClose, onSubmit, orderType, isLoading }) => {
    const [formData, setFormData] = useState<OrderDetails>({
        name: '',
        phone: '',
        address: '',
        notes: ''
    });
    const [error, setError] = useState<string | null>(null);
    const { postcode, getAddressList } = useOrder();
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Prepend +44 to the user input for validation
        const fullPhone = '+44' + formData.phone;
        const validatedPhone = validateUKPhone(fullPhone);
        if (!validatedPhone) {
            setError('Please enter a valid UK mobile number (e.g., 7123 456789).');
            return;
        }

        onSubmit({
            ...formData,
            phone: validatedPhone
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-24 bg-black bg-opacity-50 backdrop-blur-sm shadow-2xl overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[85vh] animate-fade-in my-auto">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-white rounded-t-lg">
                    <h3 className="text-xl font-serif font-bold text-gray-800">Complete Your Order</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
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

                            {/* Address Lookup Dropdown */}
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

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-gold text-white font-bold py-3 rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Confirm Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderFormModal;
