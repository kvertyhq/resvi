import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

interface MiscItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, price: number, notes?: string) => void;
    currency?: string;
}

const MiscItemModal: React.FC<MiscItemModalProps> = ({ isOpen, onClose, onAdd, currency = '£' }) => {
    const { showAlert } = useAlert();
    const [itemName, setItemName] = useState('Misc Item');
    const [itemPrice, setItemPrice] = useState('');
    const [itemNotes, setItemNotes] = useState('');

    if (!isOpen) return null;

    const handleAdd = () => {
        const name = itemName.trim();
        const price = parseFloat(itemPrice);

        if (!name) {
            showAlert('Name Required', 'Please enter an item name', 'warning');
            return;
        }

        if (isNaN(price) || price <= 0) {
            showAlert('Invalid Price', 'Please enter a valid price', 'warning');
            return;
        }

        onAdd(name, price, itemNotes.trim() || undefined);

        // Reset form
        setItemName('Misc Item');
        setItemPrice('');
        setItemNotes('');
        onClose();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAdd();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scaleIn">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Add Miscellaneous Item
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    {/* Item Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Item Name
                        </label>
                        <input
                            type="text"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., Extra Sauce, Service Charge"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* Item Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Price ({currency})
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="0.00"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] focus:border-transparent"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={itemNotes}
                            onChange={(e) => setItemNotes(e.target.value)}
                            placeholder="Add any special instructions or notes..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)] focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex-1 py-3 bg-[var(--theme-color)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiscItemModal;
