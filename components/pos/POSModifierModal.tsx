import React, { useState, useEffect, useMemo } from 'react';
import { useAlert } from '../../context/AlertContext';
import { useMenu } from '../../context/MenuContext';

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

interface ExcludedTopping {
    id: string;
    name: string;
    group_name?: string; // Added to show context (e.g. "Pizza Toppings")
    replacement?: { id: string; name: string; group_name?: string };
}

interface POSModifierModalProps {
    menuItem: any;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (item: any, selectedModifiers: any[], totalPrice: number, excludedToppings?: ExcludedTopping[], selectedReplacers?: any[]) => void;
    currency?: string;
    initialVariant?: any;
    initialSelections?: Record<string, Record<string, Partial<SelectedModifier>>>;
    initialExclusions?: ExcludedTopping[];
    initialReplacers?: Record<string, Record<string, boolean>>;
    initialReplacersArray?: any[];
}

const POSModifierModal: React.FC<POSModifierModalProps> = ({
    menuItem, isOpen, onClose, onAddToCart, currency = '£',
    initialVariant, initialSelections, initialExclusions, initialReplacers, initialReplacersArray
}) => {
    const { showAlert } = useAlert();
    const {
        modifierGroups: allGroups,
        modifierItems: allItems,
        menuItemModifiers: allLinks,
        menuCategoryModifiers: allCatLinks,
        replacerGroups: allReplGroups,
        replacerItems: allReplItems,
        menuItemReplacers: allItemReplLinks,
        loading: menuLoading
    } = useMenu();

    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [selections, setSelections] = useState<Record<string, Record<string, Partial<SelectedModifier>>>>({});
    const [totalPrice, setTotalPrice] = useState(0);
    const [expandedCustomise, setExpandedCustomise] = useState<Record<string, boolean>>({});

    // --- Replacement State ---
    // Stores selected replacers: { groupId: { itemId: true } } (legacy groups without ingredient_name)
    const [selectedReplacers, setSelectedReplacers] = useState<Record<string, Record<string, boolean>>>({});

    // --- Ingredient-based Replacer State ---
    // Key: menu_item_replacers entry id, Value: selected replacer item id (or undefined = just excluded)
    const [ingredientExclusions, setIngredientExclusions] = useState<Record<string, string | undefined>>({});
    const [replacerPopupEntry, setReplacerPopupEntry] = useState<any>(null);

    // --- Topping Exclusion State ---
    const [excludedToppings, setExcludedToppings] = useState<ExcludedTopping[]>([]);
    const [replacementPickerFor, setReplacementPickerFor] = useState<string | null>(null);

    const toggleCustomise = (key: string) =>
        setExpandedCustomise(prev => ({ ...prev, [key]: !prev[key] }));

    // Filter and assemble groups for the current item locally
    const modifierGroups = useMemo(() => {
        if (!menuItem || !allGroups || !allItems) return [];

        const linkMap = new Map<string, number>();

        // 1. Add Category Modifiers (Lower priority / base)
        if (allCatLinks) {
            allCatLinks
                .filter(l => l.category_id === menuItem.category_id)
                .forEach(l => linkMap.set(l.modifier_group_id, l.order_index ?? 0));
        }

        // 2. Add Item Modifiers (Can override or add to category modifiers)
        if (allLinks) {
            allLinks
                .filter(l => l.menu_item_id === menuItem.id)
                .forEach(l => linkMap.set(l.modifier_group_id, l.order_index ?? 0));
        }

        const groupIds = Array.from(linkMap.keys());

        return allGroups
            .filter(g => groupIds.includes(g.id))
            .map(g => ({
                ...g,
                items: allItems.filter(i => i.modifier_group_id === g.id)
            }))
            .sort((a, b) => (linkMap.get(a.id) ?? 0) - (linkMap.get(b.id) ?? 0));
    }, [menuItem, allLinks, allCatLinks, allGroups, allItems]);

    // Build ingredient entries from menu_item_replacers with ingredient_name
    const ingredientEntries = useMemo(() => {
        if (!menuItem || !allItemReplLinks || !allReplGroups || !allReplItems) return [];
        return allItemReplLinks
            .filter(l => l.menu_item_id === menuItem.id && l.ingredient_name)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map(l => ({
                ...l,
                group: allReplGroups.find((g: any) => g.id === l.replacer_group_id),
                groupItems: allReplItems.filter((i: any) => i.replacer_group_id === l.replacer_group_id)
            }));
    }, [menuItem, allItemReplLinks, allReplGroups, allReplItems]);

    // Legacy: replacer groups for entries WITHOUT ingredient_name (fallback)
    const replacerGroups = useMemo(() => {
        if (!menuItem || !allReplGroups || !allReplItems || !allItemReplLinks) return [];

        const legacyLinks = allItemReplLinks
            .filter(l => l.menu_item_id === menuItem.id && !l.ingredient_name);

        if (legacyLinks.length === 0) return [];

        const linkedGroupIds = legacyLinks
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map(l => l.replacer_group_id);

        return allReplGroups
            .filter(g => linkedGroupIds.includes(g.id))
            .map(g => ({
                ...g,
                items: allReplItems.filter(i => i.replacer_group_id === g.id)
            }))
            .sort((a, b) => linkedGroupIds.indexOf(a.id) - linkedGroupIds.indexOf(b.id));
    }, [menuItem, allReplGroups, allReplItems, allItemReplLinks]);

    // Resolve default toppings from their IDs
    const defaultToppings = useMemo(() => {
        if (!menuItem || !allItems) return [];
        const ids: string[] = menuItem.default_topping_ids || [];
        return ids.map(id => allItems.find(i => i.id === id)).filter(Boolean) as ModifierItem[];
    }, [menuItem, allItems]);

    // All toppings available for replacement (from multi-select groups linked to this item)
    const allToppingsForReplacement = useMemo(() => {
        return modifierGroups
            .filter(g => g.is_multiple)
            .flatMap(g => g.items);
    }, [modifierGroups]);

    useEffect(() => {
        if (isOpen && menuItem) {
            // Priority: Initial values (from cart edit) > Menu Item defaults
            if (initialVariant) {
                setSelectedVariant(initialVariant);
            } else {
                const variants = menuItem.price_variants || [];
                if (variants.length > 0) {
                    setSelectedVariant(variants[0]);
                } else {
                    setSelectedVariant(null);
                }
            }

            setSelections(initialSelections || {});
            setExcludedToppings(initialExclusions || []);
            setSelectedReplacers(initialReplacers || {});

            // Auto-fill ingredient-based replacers
            const exclusions: Record<string, string | undefined> = {};
            if (initialReplacersArray) {
                ingredientEntries.forEach(entry => {
                    const match = initialReplacersArray.find(r => r.ingredient_name === entry.ingredient_name);
                    if (match) {
                        if (match.is_exclusion_only) {
                            exclusions[entry.id] = undefined;
                        } else {
                            exclusions[entry.id] = match.id;
                        }
                    }
                });
            }
            setIngredientExclusions(exclusions);
            setReplacerPopupEntry(null);

            setExpandedCustomise({});
            setReplacementPickerFor(null);
        }
    }, [isOpen, menuItem, initialVariant, initialSelections, initialExclusions, initialReplacers, initialReplacersArray, ingredientEntries]);

    // Recalculate total
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
                        if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                            itemPrice = Number(item.price_matrix[selectedVariant.name]);
                        }
                        if (modifier.location !== 'whole') itemPrice = itemPrice / 2;
                        if (modifier.intensity === 'extra') itemPrice *= 1.5;
                        if (modifier.intensity === 'double') itemPrice *= 2;
                        if (modifier.intensity === 'light') itemPrice *= 0.5;
                        modifiersTotal += itemPrice;
                    }
                });
            }
        });

        // Add Legacy Replacers Total
        let replacersTotal = 0;
        Object.keys(selectedReplacers).forEach(groupId => {
            const group = replacerGroups.find(g => g.id === groupId);
            if (group) {
                Object.keys(selectedReplacers[groupId]).forEach(itemId => {
                    const item = group.items.find(i => i.id === itemId);
                    if (item) {
                        replacersTotal += Number(item.price_adjustment || 0);
                    }
                });
            }
        });

        // Add Ingredient-based Replacers Total
        let ingredientReplacersTotal = 0;
        Object.entries(ingredientExclusions).forEach(([entryId, replacerItemId]) => {
            if (replacerItemId) {
                const entry = ingredientEntries.find(e => e.id === entryId);
                const item = entry?.groupItems.find((i: any) => i.id === replacerItemId);
                if (item) {
                    ingredientReplacersTotal += Number(item.price_adjustment || 0);
                }
            }
        });

        setTotalPrice(basePrice + modifiersTotal + replacersTotal + ingredientReplacersTotal);
    }, [selections, modifierGroups, selectedReplacers, replacerGroups, ingredientExclusions, ingredientEntries, menuItem, selectedVariant]);

    const loading = menuLoading;

    const toggleSelection = (groupId: string, itemId: string, isMultiple: boolean) => {
        setSelections(prev => {
            const groupSelections = prev[groupId] || {};
            if (groupSelections[itemId]) {
                const updatedGroup = { ...groupSelections };
                delete updatedGroup[itemId];
                return { ...prev, [groupId]: updatedGroup };
            } else {
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
                    [itemId]: { ...groupSelections[itemId], [field]: value }
                }
            };
        });
    };

    // Toggle exclusion of a default topping
    const toggleExclusion = (topping: ModifierItem) => {
        setExcludedToppings(prev => {
            const exists = prev.find(e => e.id === topping.id);
            if (exists) {
                // Re-instate it
                return prev.filter(e => e.id !== topping.id);
            } else {
                // Find the group this topping belongs to
                const group = modifierGroups.find(g => g.items.some(i => i.id === topping.id));
                // Exclude it and open replacement picker
                setReplacementPickerFor(topping.id);
                return [...prev, {
                    id: topping.id,
                    name: topping.name,
                    group_name: group?.name
                }];
            }
        });
    };

    // Pick a replacement for an excluded topping
    const pickReplacement = (excludedId: string, replacement: ModifierItem) => {
        const group = modifierGroups.find(g => g.items.some(i => i.id === replacement.id));
        setExcludedToppings(prev =>
            prev.map(e => e.id === excludedId
                ? { ...e, replacement: { id: replacement.id, name: replacement.name, group_name: group?.name } }
                : e
            )
        );
        setReplacementPickerFor(null);
    };

    const toggleReplacer = (groupId: string, itemId: string, isMultiple: boolean) => {
        setSelectedReplacers(prev => {
            const groupSelections = prev[groupId] || {};
            const isSelected = !!groupSelections[itemId];
            const group = replacerGroups.find(g => g.id === groupId);
            const item = group?.items.find(i => i.id === itemId);

            let newGroup = { ...groupSelections };
            if (isSelected) {
                delete newGroup[itemId];
            } else {
                if (!isMultiple) newGroup = {};
                newGroup[itemId] = true;

                // Handle target exclusion
                if (item?.target_modifier_item_id) {
                    const targetTopping = defaultToppings.find(t => t.id === item.target_modifier_item_id);
                    if (targetTopping && !excludedToppings.find(e => e.id === targetTopping.id)) {
                        setExcludedToppings(prevEx => [...prevEx, {
                            id: targetTopping.id,
                            name: targetTopping.name,
                            group_name: modifierGroups.find(mg => mg.items.some(mi => mi.id === targetTopping.id))?.name
                        }]);
                    }
                }
            }
            return { ...prev, [groupId]: newGroup };
        });
    };

    const handleConfirm = () => {
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

        // Validate Replacer Groups
        for (const group of replacerGroups) {
            const selectedCount = Object.keys(selectedReplacers[group.id] || {}).length;
            if (group.is_required && selectedCount < (group.min_selection || 1)) {
                showAlert('Selection Required', `Please select options for ${group.name}`, 'warning');
                return;
            }
            if (group.max_selection && selectedCount > group.max_selection) {
                showAlert('Too Many Options', `Too many options for ${group.name} (Max ${group.max_selection})`, 'warning');
                return;
            }
        }

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
                        flatModifiers.push({ ...modifier, price: itemPrice });
                    }
                });
            }
        });

        const finalMenuItem = selectedVariant
            ? { ...menuItem, name: `${menuItem.name} (${selectedVariant.name})`, price: selectedVariant.price }
            : menuItem;

        const flatReplacers: any[] = [];

        // Legacy group-based replacers
        Object.keys(selectedReplacers).forEach(groupId => {
            const group = replacerGroups.find(g => g.id === groupId);
            if (group) {
                Object.keys(selectedReplacers[groupId]).forEach(itemId => {
                    const item = group.items.find(i => i.id === itemId);
                    if (item) {
                        flatReplacers.push({
                            id: item.id,
                            group_id: groupId,
                            name: item.name,
                            price_adjustment: item.price_adjustment,
                            target_modifier_item_id: item.target_modifier_item_id
                        });
                    }
                });
            }
        });

        // Ingredient-based replacers
        Object.entries(ingredientExclusions).forEach(([entryId, replacerItemId]) => {
            const entry = ingredientEntries.find(e => e.id === entryId);
            if (entry) {
                if (replacerItemId) {
                    const item = entry.groupItems.find((i: any) => i.id === replacerItemId);
                    if (item) {
                        flatReplacers.push({
                            id: item.id,
                            group_id: entry.replacer_group_id,
                            name: item.name,
                            price_adjustment: item.price_adjustment,
                            target_modifier_item_id: item.target_modifier_item_id,
                            ingredient_name: entry.ingredient_name
                        });
                    }
                } else {
                    // Excluded without replacement
                    flatReplacers.push({
                        id: entryId,
                        group_id: entry.replacer_group_id,
                        name: `${entry.ingredient_name}`,
                        price_adjustment: 0,
                        ingredient_name: entry.ingredient_name,
                        is_exclusion_only: true
                    });
                }
            }
        });

        onAddToCart(
            finalMenuItem,
            flatModifiers,
            totalPrice,
            excludedToppings.length > 0 ? excludedToppings : undefined,
            flatReplacers.length > 0 ? flatReplacers : undefined
        );
        onClose();
    };

    if (!isOpen) return null;

    // IDs of excluded toppings (for quick lookup)
    const excludedIds = new Set(excludedToppings.map(e => e.id));
    // IDs not available for replacement (already excluded, or already added as a topping)
    const replacementBlockedIds = new Set([...excludedIds]);

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
                            <h3 className="font-bold text-lg text-white mb-3">Select Variant</h3>
                            <div className="flex gap-2">
                                {menuItem.price_variants.map((v: any) => (
                                    <button
                                        key={v.name}
                                        onClick={() => setSelectedVariant(v)}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all font-bold ${selectedVariant?.name === v.name
                                            ? 'bg-opacity-20 text-white'
                                            : 'bg-gray-700 border-transparent text-gray-400'
                                            }`}
                                        style={selectedVariant?.name === v.name ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}
                                    >
                                        <div className="text-sm uppercase">{v.name}</div>
                                        <div className="text-lg">{currency}{Number(v.price).toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Included Toppings Section */}
                    {defaultToppings.length > 0 && (
                        <div className="border-b border-gray-700 pb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-base text-white">Included Toppings</h3>
                                <span className="text-xs text-gray-500">Tap to remove / swap</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {defaultToppings.map(topping => {
                                    const isExcluded = excludedIds.has(topping.id);
                                    const excl = excludedToppings.find(e => e.id === topping.id);
                                    return (
                                        <div key={topping.id} className="flex flex-col items-start gap-1">
                                            <button
                                                onClick={() => toggleExclusion(topping)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${isExcluded
                                                    ? 'bg-red-900 border-red-500 text-red-300 line-through'
                                                    : 'bg-gray-700 border-gray-600 text-gray-200 hover:border-red-400'
                                                    }`}
                                            >
                                                {isExcluded ? `NO ${topping.name}` : topping.name}
                                            </button>
                                            {isExcluded && (
                                                <div className="flex items-center gap-1 pl-1">
                                                    {excl?.replacement ? (
                                                        <button
                                                            onClick={() => setReplacementPickerFor(topping.id)}
                                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-900 border border-green-500 text-green-300"
                                                        >
                                                            ↔ {excl.replacement.name}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setReplacementPickerFor(topping.id)}
                                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700 border border-dashed border-gray-500 text-gray-400 hover:border-gray-300"
                                                        >
                                                            + Swap with
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Replacement Picker Overlay */}
                            {replacementPickerFor && (
                                <div className="mt-3 bg-gray-900 rounded-xl border border-gray-600 overflow-hidden">
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700">
                                        <span className="text-xs font-bold text-white uppercase tracking-wide">
                                            Swap {excludedToppings.find(e => e.id === replacementPickerFor)?.name} with…
                                        </span>
                                        <button
                                            onClick={() => setReplacementPickerFor(null)}
                                            className="text-gray-400 hover:text-white text-xs"
                                        >
                                            Skip ✕
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 p-2 max-h-48 overflow-y-auto">
                                        {allToppingsForReplacement
                                            .filter(t => !replacementBlockedIds.has(t.id))
                                            .map(t => {
                                                const current = excludedToppings.find(e => e.id === replacementPickerFor);
                                                const isChosen = current?.replacement?.id === t.id;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => pickReplacement(replacementPickerFor, t)}
                                                        className={`p-2 rounded-lg text-xs font-semibold border-2 transition-all text-center ${isChosen
                                                            ? 'text-white'
                                                            : 'bg-gray-800 border-transparent text-gray-300 hover:bg-gray-700'
                                                            }`}
                                                        style={isChosen ? { backgroundColor: 'color-mix(in srgb, var(--theme-color) 30%, #111827)', borderColor: 'var(--theme-color)' } : {}}
                                                    >
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ingredient-based Replacers */}
                    {ingredientEntries.length > 0 && (
                        <div className="border-b border-gray-700 pb-6">
                            <h3 className="font-bold text-lg text-white mb-4">Customise Ingredients</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {ingredientEntries.map(entry => {
                                    const isExcluded = entry.id in ingredientExclusions;
                                    const replacementId = ingredientExclusions[entry.id];
                                    const replacementItem = replacementId
                                        ? entry.groupItems.find((i: any) => i.id === replacementId)
                                        : null;
                                    return (
                                        <button
                                            key={entry.id}
                                            onClick={() => {
                                                if (isExcluded) {
                                                    setIngredientExclusions(prev => {
                                                        const next = { ...prev };
                                                        delete next[entry.id];
                                                        return next;
                                                    });
                                                } else {
                                                    setIngredientExclusions(prev => ({ ...prev, [entry.id]: undefined }));
                                                    setReplacerPopupEntry(entry);
                                                }
                                            }}
                                            className={`p-3 rounded-xl text-sm font-bold transition-all border-2 text-center ${isExcluded
                                                ? 'bg-red-600 border-red-500 text-white'
                                                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'
                                                }`}
                                        >
                                            {isExcluded
                                                ? (entry.ingredient_name?.toLowerCase().startsWith('no')
                                                    ? entry.ingredient_name.toUpperCase()
                                                    : `${entry.ingredient_name}`)
                                                : entry.ingredient_name}
                                            {replacementItem && (
                                                <div className="text-sm mt-0.5 font-bold opacity-90">
                                                    → {replacementItem.name}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Legacy Replacer Groups (entries without ingredient_name) */}
                    {replacerGroups.length > 0 && (
                        <div className="border-b border-gray-700 pb-6">
                            <h3 className="font-bold text-lg text-white mb-4">Replacements & Swaps</h3>
                            <div className="space-y-6">
                                {replacerGroups.map(group => (
                                    <div key={group.id} className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <h4 className="font-bold text-sm text-gray-300 uppercase tracking-wider">{group.name}</h4>
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">
                                                {group.is_required ? 'Required' : 'Optional'}
                                                {group.is_multiple ? ' • Multiple' : ' • One only'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.items.map((item: any) => {
                                                const isSelected = !!(selectedReplacers[group.id] || {})[item.id];
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => toggleReplacer(group.id, item.id, group.is_multiple)}
                                                        className={`
                                                            relative p-3 rounded-xl border-2 text-left transition-all
                                                            ${isSelected
                                                                ? 'text-white border-brand-gold bg-brand-gold bg-opacity-10'
                                                                : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'}
                                                        `}
                                                        style={isSelected ? { borderColor: 'var(--theme-color)', color: 'white' } : {}}
                                                    >
                                                        <div className="text-xs font-bold">{item.name}</div>
                                                        {item.price_adjustment !== 0 && (
                                                            <div className="text-[10px] mt-1 opacity-70">
                                                                {item.price_adjustment > 0 ? `+${currency}${item.price_adjustment.toFixed(2)}` : `-${currency}${Math.abs(item.price_adjustment).toFixed(2)}`}
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-brand-gold" style={{ backgroundColor: 'var(--theme-color)' }}>
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modifier Groups */}
                    {loading ? (
                        <div className="text-center text-gray-400 py-8">Loading modifiers...</div>
                    ) : modifierGroups.length === 0 ? null : (
                        modifierGroups.map(group => (
                            <div key={group.id} className="border-b border-gray-700 pb-6 last:border-0">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--theme-color)' }}>{group.name}</h3>
                                    <span className="text-xs text-gray-500 uppercase font-semibold">
                                        {group.is_required && <span className="text-red-400 mr-2">Required</span>}
                                        {group.is_multiple ? 'Choose Multiple' : 'Select One'}
                                    </span>
                                </div>

                                {/* Compact chip grid for multi-select groups */}
                                {group.is_multiple ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {group.items.map((item: any) => {
                                            const modifier = (selections[group.id] || {})[item.id];
                                            const isSelected = !!modifier;

                                            let displayPrice = Number(item.price_adjustment || 0);
                                            if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                                                displayPrice = Number(item.price_matrix[selectedVariant.name]);
                                            }

                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => toggleSelection(group.id, item.id, true)}
                                                    className={`
                                                        relative flex flex-col items-center justify-center
                                                        p-2 rounded-lg border-2 text-center transition-all
                                                        min-h-[52px] select-none
                                                        ${isSelected
                                                            ? 'text-white shadow-md'
                                                            : 'bg-gray-700 border-transparent text-gray-300 hover:bg-gray-600'}
                                                    `}
                                                    style={isSelected
                                                        ? { backgroundColor: 'color-mix(in srgb, var(--theme-color) 25%, #1f2937)', borderColor: 'var(--theme-color)' }
                                                        : {}}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-color)' }}>
                                                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-semibold leading-tight">{item.name}</span>
                                                    {displayPrice > 0 && (
                                                        <span className="text-[10px] opacity-70 mt-0.5">{currency}{displayPrice.toFixed(2)}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Full-row layout for single-select groups */
                                    <div className="grid grid-cols-1 gap-3">
                                        {group.items.map((item: any) => {
                                            const modifier = (selections[group.id] || {})[item.id];
                                            const isSelected = !!modifier;

                                            let displayPrice = Number(item.price_adjustment || 0);
                                            if (selectedVariant && item.price_matrix?.[selectedVariant.name] !== undefined) {
                                                displayPrice = Number(item.price_matrix[selectedVariant.name]);
                                            }

                                            return (
                                                <div key={item.id} className="space-y-2">
                                                    <button
                                                        onClick={() => toggleSelection(group.id, item.id, false)}
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
                                                                <span className="text-sm opacity-80">{currency}{displayPrice.toFixed(2)}</span>
                                                            )}
                                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? '' : 'border-gray-500'}`} style={isSelected ? { backgroundColor: 'var(--theme-color)', borderColor: 'var(--theme-color)' } : {}}>
                                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {isSelected && (
                                                        <div className="space-y-1">
                                                            {/* Customise toggle */}
                                                            <button
                                                                onClick={() => toggleCustomise(`${group.id}-${item.id}`)}
                                                                className="w-full flex items-center justify-end gap-1 text-[11px] font-semibold px-1 py-0.5 transition-colors"
                                                                style={{ color: 'var(--theme-color)' }}
                                                            >
                                                                Customise
                                                                <svg className={`w-3 h-3 transition-transform ${expandedCustomise[`${group.id}-${item.id}`] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>

                                                            {/* Collapsible Coverage + Intensity */}
                                                            {expandedCustomise[`${group.id}-${item.id}`] && (
                                                                <div className="flex gap-4 p-2 bg-gray-900 rounded-lg">
                                                                    <div className="flex-1">
                                                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 ml-1">Coverage</div>
                                                                        <div className="flex bg-gray-800 rounded-md p-1">
                                                                            {['whole', 'left', 'right'].map((loc) => (
                                                                                <button
                                                                                    key={loc}
                                                                                    onClick={() => updateModifierDetail(group.id, item.id, 'location', loc)}
                                                                                    className={`flex-1 text-[10px] py-1 rounded capitalize font-bold transition-all ${modifier.location === loc ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-700'
                                                                                        }`}
                                                                                >
                                                                                    {loc}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-[1.5]">
                                                                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 ml-1">Intensity</div>
                                                                        <div className="flex bg-gray-800 rounded-md p-1">
                                                                            {['light', 'normal', 'extra', 'double'].map((int) => (
                                                                                <button
                                                                                    key={int}
                                                                                    onClick={() => updateModifierDetail(group.id, item.id, 'intensity', int)}
                                                                                    className={`flex-1 text-[10px] py-1 rounded capitalize font-bold transition-all ${modifier.intensity === int ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-700'
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
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl">
                    {/* Summary of exclusions */}
                    {(excludedToppings.length > 0 || Object.keys(ingredientExclusions).length > 0) && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {excludedToppings.map(e => (
                                <span key={e.id} className="text-[10px] px-2 py-0.5 rounded-full bg-red-900 text-red-300 font-semibold">
                                    NO {e.name}{e.replacement ? ` → ${e.replacement.name}` : ''}
                                </span>
                            ))}
                            {Object.entries(ingredientExclusions).map(([entryId, replacerItemId]) => {
                                const entry = ingredientEntries.find(e => e.id === entryId);
                                if (!entry) return null;
                                const replacementItem = replacerItemId
                                    ? entry.groupItems.find((i: any) => i.id === replacerItemId)
                                    : null;
                                return (
                                    <span key={entryId} className="text-[10px] px-2 py-0.5 rounded-full bg-red-900 text-red-300 font-semibold">
                                        {entry.ingredient_name?.toLowerCase().startsWith('no')
                                            ? entry.ingredient_name.toUpperCase()
                                            : `${entry.ingredient_name}`}
                                        {replacementItem ? ` → ${replacementItem.name}` : ''}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    <button
                        onClick={handleConfirm}
                        style={{ backgroundColor: 'var(--theme-color)' }}
                        className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-between px-8 hover:brightness-110"
                    >
                        <span>{initialSelections ? 'Update Item' : 'Add to Order'}</span>
                        <span>{currency}{totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>

            {/* Replacer Popup Overlay */}
            {replacerPopupEntry && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 p-4">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="px-4 py-3 border-b border-gray-700">
                            <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                                {replacerPopupEntry.group?.name || 'Select Replacement'}
                            </h3>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
                            {replacerPopupEntry.groupItems.map((item: any) => {
                                const isSelected = ingredientExclusions[replacerPopupEntry.id] === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setIngredientExclusions(prev => ({
                                                ...prev,
                                                [replacerPopupEntry.id]: isSelected ? undefined : item.id
                                            }));
                                        }}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-center ${isSelected
                                            ? 'bg-white text-gray-900 border-white shadow-lg'
                                            : 'bg-gray-700 border-transparent text-gray-200 hover:bg-gray-600'
                                            }`}
                                    >
                                        {item.name}
                                        {item.price_adjustment > 0 && (
                                            <div className="text-[10px] mt-0.5 opacity-70">
                                                +{currency}{Number(item.price_adjustment).toFixed(2)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-gray-700">
                            <button
                                onClick={() => setReplacerPopupEntry(null)}
                                className="w-full py-3 rounded-xl font-bold text-white text-lg"
                                style={{ backgroundColor: 'var(--theme-color)' }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POSModifierModal;
