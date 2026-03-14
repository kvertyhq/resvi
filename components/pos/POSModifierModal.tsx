import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAlert } from '../../context/AlertContext';

interface ModifierItem {
    id: string;
    name: string;
    price_adjustment: number;
}

interface ModifierGroup {
    id: string;
    name: string;
    is_required: boolean;
    is_multiple: boolean;
    min_selection: number;
    max_selection: number;
    items: ModifierItem[];
}

interface POSModifierModalProps {
    menuItem: any;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: any, selectedModifiers: any[], totalPrice: number) => void;
}

const POSModifierModal: React.FC<POSModifierModalProps> = ({ menuItem, isOpen, onClose, onAddToCart }) => {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [selections, setSelections] = useState<Record<string, string[]>>({}); // groupId -> array of itemIds
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        if (isOpen && menuItem) {
            fetchModifiers();
            setTotalPrice(menuItem.price || 0);
            setSelections({});
        }
    }, [isOpen, menuItem]);

    // Recalculate total when selections change
    useEffect(() => {
        if (!menuItem) return;
        let newTotal = Number(menuItem.price || 0);

        Object.keys(selections).forEach(groupId => {
            const group = modifierGroups.find(g => g.id === groupId);
            if (group) {
                selections[groupId].forEach(itemId => {
                    const item = group.items.find(i => i.id === itemId);
                    if (item) {
                        newTotal += Number(item.price_adjustment);
                    }
                });
            }
        });
        setTotalPrice(newTotal);
    }, [selections, modifierGroups, menuItem]);

    const fetchModifiers = async () => {
        setLoading(true);
        try {
            // 1. Get links
            const { data: links } = await supabase
                .from('menu_item_modifiers')
                .select('modifier_group_id')
                .eq('menu_item_id', menuItem.id);

            if (!links || links.length === 0) {
                // No modifiers, auto-add? Validation could be done in parent, 
                // but if we are here we might checking. 
                // For now, let's just show empty states.
                setModifierGroups([]);
                setLoading(false);
                return;
            }

            const groupIds = links.map(l => l.modifier_group_id);

            // 2. Get Groups
            const { data: groups } = await supabase
                .from('menu_modifiers')
                .select('*')
                .in('id', groupIds);

            if (!groups) {
                setModifierGroups([]);
                return;
            }

            // 3. Get Items for these groups
            const { data: items } = await supabase
                .from('menu_modifier_items')
                .select('*')
                .in('modifier_group_id', groupIds)
                .eq('is_available', true);

            // 4. Assemble
            const assembledGroups = groups.map(g => ({
                ...g,
                items: (items || []).filter(i => i.modifier_group_id === g.id)
            }));

            setModifierGroups(assembledGroups);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (groupId: string, itemId: string, isMultiple: boolean) => {
        setSelections(prev => {
            const current = prev[groupId] || [];
            if (current.includes(itemId)) {
                // Remove
                return { ...prev, [groupId]: current.filter(id => id !== itemId) };
            } else {
                // Add
                if (!isMultiple) {
                    return { ...prev, [groupId]: [itemId] }; // Replace
                }
                return { ...prev, [groupId]: [...current, itemId] };
            }
        });
    };

    const handleConfirm = () => {
        // Validation
        for (const group of modifierGroups) {
            const selectedCount = (selections[group.id] || []).length;
            if (group.is_required && selectedCount < (group.min_selection || 1)) {
                showAlert('Selection Required', `Please select options for ${group.name}`, 'warning');
                return;
            }
            if (group.max_selection && selectedCount > group.max_selection) {
                showAlert('Too Many Options', `Too many options for ${group.name} (Max ${group.max_selection})`, 'warning');
                return;
            }
        }

        // Build flat list of modifiers for the order
        const flatModifiers: any[] = [];
        Object.keys(selections).forEach(groupId => {
            const group = modifierGroups.find(g => g.id === groupId);
            if (group) {
                selections[groupId].forEach(itemId => {
                    const item = group.items.find(i => i.id === itemId);
                    if (item) {
                        flatModifiers.push({
                            modifier_group_id: groupId,
                            modifier_group_name: group.name,
                            modifier_item_id: item.id,
                            name: item.name,
                            price: item.price_adjustment
                        });
                    }
                });
            }
        });

        onAddToCart(menuItem, flatModifiers, totalPrice);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{menuItem?.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {loading ? (
                        <div className="text-center text-gray-400 py-8">Loading modifiers...</div>
                    ) : modifierGroups.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">No options available. Add to cart?</div>
                    ) : (
                        modifierGroups.map(group => (
                            <div key={group.id} className="border-b border-gray-700 pb-4 last:border-0">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--theme-color)' }}>{group.name}</h3>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">
                                        {group.is_required && <span className="text-red-400 mr-2">Required</span>}
                                        {group.is_multiple ? 'Choose Multiple' : 'Select One'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    {group.items.map(item => {
                                        const isSelected = (selections[group.id] || []).includes(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => toggleSelection(group.id, item.id, group.is_multiple)}
                                                className={`
                                                    flex justify-between items-center p-3 rounded-lg border transition-all text-left
                                                    ${isSelected
                                                        ? 'bg-opacity-20 text-white'
                                                        : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'}
                                                `}
                                                style={isSelected ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                                            >
                                                <span>{item.name}</span>
                                                <div className="flex items-center gap-3">
                                                    {Number(item.price_adjustment) > 0 && (
                                                        <span className="text-sm opacity-80">+${item.price_adjustment}</span>
                                                    )}
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? '' : 'border-gray-500'}`} style={isSelected ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}>
                                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl">
                    <button
                        onClick={handleConfirm}
                        style={{ backgroundColor: 'var(--theme-color)' }}
                        className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-between px-8 hover:brightness-110"
                    >
                        <span>Add to Order</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POSModifierModal;
