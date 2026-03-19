import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAlert } from '../../context/AlertContext';
import { useSettings } from '../../context/SettingsContext';
import { X, Check } from 'lucide-react';

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

interface CustomerModifierModalProps {
    menuItem: any;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: any, selectedModifiers: any[], totalPrice: number) => void;
}

const CustomerModifierModal: React.FC<CustomerModifierModalProps> = ({ menuItem, isOpen, onClose, onAddToCart }) => {
    const { showAlert } = useAlert();
    const { settings } = useSettings();
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
                // Pick first by default
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

                        // Intensity multipliers
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
                .eq('menu_item_id', menuItem.id)
                .order('order_index');

            if (!links || links.length === 0) {
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

            // Order groups by link
            const orderedGroups = groupIds.map(id => groups.find(g => g.id === id)).filter(Boolean) as ModifierGroup[];

            // 3. Get Items for these groups
            const { data: items } = await supabase
                .from('menu_modifier_items')
                .select('*')
                .in('modifier_group_id', groupIds)
                .eq('is_available', true);

            // 4. Assemble
            const assembledGroups = orderedGroups.map(g => ({
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

        // If a variant is selected, append the name and update base price
        const finalMenuItem = selectedVariant 
            ? { ...menuItem, name: `${menuItem.name} (${selectedVariant.name})`, price: Number(selectedVariant.price), selected_variant: selectedVariant }
            : { ...menuItem };

        onAddToCart(finalMenuItem, flatModifiers, totalPrice);
        onClose();
    };

    if (!isOpen) return null;

    const currency = settings?.currency || '£';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold font-serif text-brand-dark-gray">{menuItem?.name}</h2>
                        {menuItem?.description && (
                            <p className="text-sm text-brand-mid-gray mt-1 line-clamp-2">{menuItem.description}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 ml-4 shrink-0 transition-colors">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {/* Variants / Sizes */}
                    {menuItem?.price_variants?.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-900">Choose Size</h3>
                                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide">Required</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {menuItem.price_variants.map((v: any) => (
                                    <button
                                        key={v.name}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all font-bold ${
                                            selectedVariant?.name === v.name
                                                ? 'bg-brand-gold/10 border-brand-gold text-brand-dark-gray shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="text-sm mb-1">{v.name}</div>
                                        <div className="text-lg text-brand-gold">{currency}{Number(v.price).toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
                        </div>
                    ) : (
                        modifierGroups.map((group, index) => (
                            <div key={group.id} className={`${index > 0 ? 'pt-6 border-t border-gray-100' : ''}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide ${
                                        group.is_required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {group.is_required ? 'Required' : 'Optional'}
                                        {group.max_selection ? ` (Max ${group.max_selection})` : ''}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {group.items.map(item => {
                                        const modifier = (selections[group.id] || {})[item.id];
                                        const isSelected = !!modifier;
                                        
                                        let displayPrice = Number(item.price_adjustment || 0);
                                        if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                                            displayPrice = Number(item.price_matrix[selectedVariant.name]);
                                        }

                                        return (
                                            <div key={item.id} className="focus-within:ring-2 focus-within:ring-brand-gold/50 rounded-xl">
                                                <button
                                                    onClick={() => toggleSelection(group.id, item.id, group.is_multiple)}
                                                    className={`
                                                        w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all text-left group
                                                        ${isSelected
                                                            ? 'bg-brand-gold/5 border-brand-gold'
                                                            : 'bg-white border-gray-200 hover:border-brand-gold/50 hover:bg-gray-50'}
                                                    `}
                                                >
                                                    <span className={`font-semibold ${isSelected ? 'text-brand-dark-gray' : 'text-gray-700'}`}>
                                                        {item.name}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        {displayPrice > 0 && (
                                                            <span className="text-sm font-medium text-gray-500">+{currency}{displayPrice.toFixed(2)}</span>
                                                        )}
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            isSelected ? 'bg-brand-gold border-brand-gold text-white' : 'border-gray-300 group-hover:border-gray-400 bg-white'
                                                        }`}>
                                                            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                                                        </div>
                                                    </div>
                                                </button>

                                                {isSelected && (
                                                    <div className="flex flex-col gap-2 p-3 mt-1 bg-gray-50 border border-brand-gold/20 rounded-lg animate-fade-in mx-1">
                                                        <div className="flex bg-white rounded-md p-1 border border-gray-200">
                                                            {['whole', 'left', 'right'].map((loc) => (
                                                                <button
                                                                    key={loc}
                                                                    onClick={() => updateModifierDetail(group.id, item.id, 'location', loc)}
                                                                    className={`flex-1 text-xs py-1.5 rounded capitalize font-bold transition-all ${
                                                                        modifier.location === loc 
                                                                            ? 'bg-brand-dark-gray text-white shadow-sm' 
                                                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                                                    }`}
                                                                >
                                                                    {loc}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="flex bg-white rounded-md p-1 border border-gray-200">
                                                            {['light', 'normal', 'extra', 'double'].map((int) => (
                                                                <button
                                                                    key={int}
                                                                    onClick={() => updateModifierDetail(group.id, item.id, 'intensity', int)}
                                                                    className={`flex-1 text-[11px] py-1.5 rounded capitalize font-bold transition-all ${
                                                                        modifier.intensity === int 
                                                                            ? 'bg-brand-dark-gray text-white shadow-sm' 
                                                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                                                    }`}
                                                                >
                                                                    {int}
                                                                </button>
                                                            ))}
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
                <div className="p-6 border-t border-gray-200 bg-white rounded-b-2xl">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-brand-gold text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex justify-between px-8 text-lg"
                    >
                        <span>Add to Order</span>
                        <span>{currency}{totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerModifierModal;
