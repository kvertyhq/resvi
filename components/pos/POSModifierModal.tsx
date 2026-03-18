import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAlert } from '../../context/AlertContext';

interface ModifierItem {
    id: string;
    name: string;
    price_adjustment: number;
    price_matrix?: Record<string, number>;
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

interface SelectedModifier {
    modifier_group_id: string;
    modifier_group_name: string;
    modifier_item_id: string;
    name: string;
    price: number;
    location: 'whole' | 'left' | 'right';
    intensity: 'light' | 'normal' | 'extra' | 'double';
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
    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [selections, setSelections] = useState<Record<string, Record<string, Partial<SelectedModifier>>>>({}); // groupId -> itemId -> modifierData
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        if (isOpen && menuItem) {
            fetchModifiers();
            
            // Handle Price Variants (Sizes)
            const variants = menuItem.price_variants || [];
            if (variants.length > 0) {
                // If there's a default or just pick first
                setSelectedVariant(variants[0]);
                setTotalPrice(Number(variants[0].price || 0));
            } else {
                setSelectedVariant(null);
                setTotalPrice(Number(menuItem.price || 0));
            }
            
            setSelections({});
        }
    }, [isOpen, menuItem]);

    // Recalculate total when selections or variant change
    useEffect(() => {
        if (!menuItem) return;
        
        let basePrice = selectedVariant ? Number(selectedVariant.price) : Number(menuItem.price || 0);
        let modifiersTotal = 0;

        Object.keys(selections).forEach(groupId => {
            const group = modifierGroups.find(g => g.id === groupId);
            if (group) {
                Object.keys(selections[groupId]).forEach(itemId => {
                    const modifier = selections[groupId][itemId];
                    const item = group.items.find(i => i.id === itemId);
                    if (item && modifier) {
                        let itemPrice = Number(item.price_adjustment || 0);
                        
                        // Use price matrix if variant is selected
                        if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                            itemPrice = Number(item.price_matrix[selectedVariant.name]);
                        }

                        // Fractional pricing for halves
                        if (modifier.location !== 'whole') {
                            itemPrice = itemPrice / 2;
                        }

                        // Intensity multipliers (example logic)
                        if (modifier.intensity === 'extra') itemPrice *= 1.5;
                        if (modifier.intensity === 'double') itemPrice *= 2;
                        if (modifier.intensity === 'light') itemPrice *= 0.5;

                        modifiersTotal += itemPrice;
                    }
                });
            }
        });
        
        setTotalPrice(basePrice + modifiersTotal);
    }, [selections, modifierGroups, menuItem, selectedVariant]);

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
            const groupSelections = prev[groupId] || {};
            
            if (groupSelections[itemId]) {
                // Remove
                const updatedGroup = { ...groupSelections };
                delete updatedGroup[itemId];
                return { ...prev, [groupId]: updatedGroup };
            } else {
                // Add default
                const group = modifierGroups.find(g => g.id === groupId);
                const item = group?.items.find(i => i.id === itemId);
                
                const newModifier: Partial<SelectedModifier> = {
                    modifier_group_id: groupId,
                    modifier_group_name: group?.name,
                    modifier_item_id: itemId,
                    name: item?.name,
                    location: 'whole',
                    intensity: 'normal'
                };

                if (!isMultiple) {
                    return { ...prev, [groupId]: { [itemId]: newModifier } };
                }
                return { ...prev, [groupId]: { ...groupSelections, [itemId]: newModifier } };
            }
        });
    };

    const updateModifierDetail = (groupId: string, itemId: string, field: 'location' | 'intensity', value: any) => {
        setSelections(prev => {
            const groupSelections = prev[groupId] || {};
            if (!groupSelections[itemId]) return prev;
            
            return {
                ...prev,
                [groupId]: {
                    ...groupSelections,
                    [itemId]: {
                        ...groupSelections[itemId],
                        [field]: value
                    }
                }
            };
        });
    };

    const handleConfirm = () => {
        // Validation
        for (const group of modifierGroups) {
            const selectedCount = Object.keys(selections[group.id] || {}).length;
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
                Object.keys(selections[groupId]).forEach(itemId => {
                    const modifier = selections[groupId][itemId];
                    const item = group.items.find(i => i.id === itemId);
                    
                    if (item && modifier) {
                        let itemPrice = Number(item.price_adjustment || 0);
                        if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                            itemPrice = Number(item.price_matrix[selectedVariant.name]);
                        }
                        
                        // We store the full modifier object with location and intensity
                        flatModifiers.push({
                            ...modifier,
                            price: itemPrice // This is the base adjustment, calculation happens in cart/display
                        });
                    }
                });
            }
        });

        // If a variant is selected, we might want to override the name
        const finalMenuItem = selectedVariant 
            ? { ...menuItem, name: `${menuItem.name} (${selectedVariant.name})`, price: selectedVariant.price }
            : menuItem;

        onAddToCart(finalMenuItem, flatModifiers, totalPrice);
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
                    {/* Variants / Sizes */}
                    {menuItem?.price_variants?.length > 0 && (
                        <div className="border-b border-gray-700 pb-6">
                            <h3 className="font-bold text-lg text-white mb-3">Select Size</h3>
                            <div className="flex gap-2">
                                {menuItem.price_variants.map((v: any) => (
                                    <button
                                        key={v.name}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all font-bold ${
                                            selectedVariant?.name === v.name
                                                ? 'bg-opacity-20 text-white'
                                                : 'bg-gray-700 border-transparent text-gray-400'
                                        }`}
                                        style={selectedVariant?.name === v.name ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                                    >
                                        <div className="text-sm uppercase">{v.name}</div>
                                        <div className="text-lg">${Number(v.price).toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-gray-400 py-8">Loading modifiers...</div>
                    ) : modifierGroups.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">No options available. Add to cart?</div>
                    ) : (
                        modifierGroups.map(group => (
                            <div key={group.id} className="border-b border-gray-700 pb-6 last:border-0">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--theme-color)' }}>{group.name}</h3>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">
                                        {group.is_required && <span className="text-red-400 mr-2">Required</span>}
                                        {group.is_multiple ? 'Choose Multiple' : 'Select One'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {group.items.map(item => {
                                        const modifier = (selections[group.id] || {})[item.id];
                                        const isSelected = !!modifier;
                                        
                                        let displayPrice = Number(item.price_adjustment || 0);
                                        if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                                            displayPrice = Number(item.price_matrix[selectedVariant.name]);
                                        }

                                        return (
                                            <div key={item.id} className="space-y-2">
                                                <button
                                                    onClick={() => toggleSelection(group.id, item.id, group.is_multiple)}
                                                    className={`
                                                        w-full flex justify-between items-center p-3 rounded-lg border transition-all text-left
                                                        ${isSelected
                                                            ? 'bg-opacity-10 text-white'
                                                            : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'}
                                                    `}
                                                    style={isSelected ? { borderColor: 'var(--theme-color)' } : {}}
                                                >
                                                    <span className="font-semibold">{item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        {displayPrice > 0 && (
                                                            <span className="text-sm opacity-80">+${displayPrice.toFixed(2)}</span>
                                                        )}
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? '' : 'border-gray-500'}`} style={isSelected ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}>
                                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                    </div>
                                                </button>

                                                {isSelected && (
                                                    <div className="flex gap-4 p-2 bg-gray-900 rounded-lg animate-in slide-in-from-top-1 duration-200">
                                                        {/* Location / Coverage */}
                                                        <div className="flex-1">
                                                            <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 ml-1">Coverage</div>
                                                            <div className="flex bg-gray-800 rounded-md p-1">
                                                                {['whole', 'left', 'right'].map((loc) => (
                                                                    <button
                                                                        key={loc}
                                                                        onClick={() => updateModifierDetail(group.id, item.id, 'location', loc)}
                                                                        className={`flex-1 text-[10px] py-1 rounded capitalize font-bold transition-all ${
                                                                            modifier.location === loc ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-700'
                                                                        }`}
                                                                    >
                                                                        {loc}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Intensity */}
                                                        <div className="flex-[1.5]">
                                                            <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 ml-1">Intensity</div>
                                                            <div className="flex bg-gray-800 rounded-md p-1">
                                                                {['light', 'normal', 'extra', 'double'].map((int) => (
                                                                    <button
                                                                        key={int}
                                                                        onClick={() => updateModifierDetail(group.id, item.id, 'intensity', int)}
                                                                        className={`flex-1 text-[10px] py-1 rounded capitalize font-bold transition-all ${
                                                                            modifier.intensity === int ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-700'
                                                                        }`}
                                                                    >
                                                                        {int}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
