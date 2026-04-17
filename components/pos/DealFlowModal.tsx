import React, { useState, useEffect, useMemo } from 'react';
import { useAlert } from '../../context/AlertContext';
import { useMenu } from '../../context/MenuContext';
import { useOrder, DealSelection } from '../../context/OrderContext';
import { X, ChevronRight, ChevronLeft, Check, Plus, Package, ArrowRight, Layers } from 'lucide-react';
import POSModifierModal from './POSModifierModal';

interface DealFlowModalProps {
    deal: any;
    isOpen: boolean;
    onClose: () => void;
    onComplete: (deal: any, selections: DealSelection[], totalPrice: number) => void;
}

const DealFlowModal: React.FC<DealFlowModalProps> = ({ deal, isOpen, onClose, onComplete }) => {
    const { menuItems, categories, itemModifiersMap } = useMenu();
    const { showAlert } = useAlert();

    const [currentGroupIdx, setCurrentGroupIdx] = useState(0);
    const [selections, setSelections] = useState<Record<string, DealSelection[]>>({});
    
    // Modifier Modal State
    const [isModOpen, setIsModOpen] = useState(false);
    const [modMenuItem, setModMenuItem] = useState<any>(null);
    const [modDealOption, setModDealOption] = useState<any>(null);
    const [editingSelectionIdx, setEditingSelectionIdx] = useState<number | null>(null);
    const [activeOptionId, setActiveOptionId] = useState<string | null>(null);

    const groups = deal?.groups || [];
    const currentGroup = groups[currentGroupIdx];

    useEffect(() => {
        if (isOpen) {
            setCurrentGroupIdx(0);
            setSelections({});
            setActiveOptionId(null);
        }
    }, [isOpen]);

    const handleItemClick = (item: any, option: any) => {
        const groupSelections = selections[currentGroup.id] || [];
        // Match on both item ID and the specific option/path used to select it
        const existingIdx = groupSelections.findIndex(s => s.menu_item_id === item.id && s.option_id === option.id);
        
        // Check if item has modifiers or variants
        const hasMods = itemModifiersMap.has(item.id) || (item.price_variants && item.price_variants.length > 0);

        if (existingIdx > -1) {
            if (hasMods) {
                // Re-open modifier modal for editing
                const existing = groupSelections[existingIdx];
                setModMenuItem(item);
                setModDealOption(option);
                setEditingSelectionIdx(existingIdx);
                setIsModOpen(true);
            } else {
                // Remove it
                const updated = groupSelections.filter((_, i) => i !== existingIdx);
                setSelections({ ...selections, [currentGroup.id]: updated });
            }
            return;
        }

        // Check individual option max selection
        const optionSelections = groupSelections.filter(s => s.option_id === option.id);
        if (option.max_selection && optionSelections.length >= option.max_selection) {
            if (option.max_selection === 1) {
                // AUTO-REPLACE internal slot: filter out the old selection from this same option
                const filtered = groupSelections.filter(s => s.option_id !== option.id);
                if (hasMods) {
                    setModMenuItem(item);
                    setModDealOption(option);
                    setEditingSelectionIdx(null);
                    setIsModOpen(true);
                } else {
                    const selection: DealSelection = {
                        group_id: currentGroup.id,
                        group_name: currentGroup.name,
                        option_id: option.id,
                        menu_item_id: item.id,
                        name: item.name,
                        price_adjustment: option.price_adjustment || 0,
                        modifiers: [],
                        selected_variant: null
                    };
                    setSelections({ ...selections, [currentGroup.id]: [...filtered, selection] });
                }
                return;
            }
            showAlert('Limit Reached', `Maximum ${option.max_selection} allowed for this choice.`, 'warning');
            return;
        }

        // Check max selection
        if (currentGroup.max_selection && groupSelections.length >= currentGroup.max_selection) {
            if (currentGroup.max_selection === 1) {
                if (hasMods) {
                    setModMenuItem(item);
                    setModDealOption(option);
                    setEditingSelectionIdx(null); // It will replace, but we handle it in complete
                    setIsModOpen(true);
                } else {
                    // Replace
                    setSelections({ ...selections, [currentGroup.id]: [{
                        group_id: currentGroup.id,
                        group_name: currentGroup.name,
                        option_id: option.id,
                        menu_item_id: item.id,
                        name: item.name,
                        price_adjustment: option.price_adjustment || 0,
                        modifiers: [],
                        selected_variant: null
                    }] });
                }
                return;
            }
            showAlert('Selection Limit', `Maximum ${currentGroup.max_selection} selections allowed for this group.`, 'warning');
            return;
        }

        if (hasMods) {
            setModMenuItem(item);
            setModDealOption(option);
            setEditingSelectionIdx(null);
            setIsModOpen(true);
        } else {
            const selection: DealSelection = {
                group_id: currentGroup.id,
                group_name: currentGroup.name,
                option_id: option.id,
                menu_item_id: item.id,
                name: item.name,
                price_adjustment: option.price_adjustment || 0,
                modifiers: [],
                selected_variant: null
            };

            setSelections({ 
                ...selections, 
                [currentGroup.id]: [...groupSelections, selection] 
            });
        }
    };

    const handleModifierComplete = (item: any, selectedModifiers: any[], totalPrice: number) => {
        // Calculate the adjustment:
        // dealOption.price_adjustment is the base cost for this option in the deal.
        // We add any extra costs from modifiers.
        // POSModifierModal's totalPrice is item.basePrice + sum(modifiers).
        // Let's find the item's base price (either from selected variant or the item itself)
        const selectedVariant = (item as any).selected_variant;
        const basePrice = selectedVariant ? selectedVariant.price : item.price;
        
        // The adjustment from modifiers is totalPrice - basePrice
        const modifierAdjustment = Math.max(0, totalPrice - basePrice);
        
        const selection: DealSelection = {
            group_id: currentGroup.id,
            group_name: currentGroup.name,
            option_id: modDealOption.id,
            menu_item_id: item.id,
            name: item.name,
            price_adjustment: (modDealOption.price_adjustment || 0) + modifierAdjustment,
            modifiers: selectedModifiers,
            selected_variant: selectedVariant
        };

        const groupSelections = selections[currentGroup.id] || [];
        let updated: DealSelection[];

        if (editingSelectionIdx !== null) {
            updated = [...groupSelections];
            updated[editingSelectionIdx] = selection;
        } else if (modDealOption.max_selection === 1) {
            // AUTO-REPLACE internal slot: filter out the old selection from this same option
            const filtered = groupSelections.filter(s => s.option_id !== modDealOption.id);
            updated = [...filtered, selection];
        } else if (currentGroup.max_selection === 1) {
            updated = [selection];
        } else {
            // Check individual option max selection for non-edit mode
            const optionSelections = groupSelections.filter(s => s.option_id === modDealOption.id);
            if (modDealOption.max_selection && optionSelections.length >= modDealOption.max_selection) {
                showAlert('Limit Reached', `Maximum ${modDealOption.max_selection} allowed for this choice.`, 'warning');
                return;
            }
            updated = [...groupSelections, selection];
        }

        setSelections({ ...selections, [currentGroup.id]: updated });
        setIsModOpen(false);
        setModMenuItem(null);
        setModDealOption(null);
        setEditingSelectionIdx(null);
        // We stay in the category view after selection to allow more picks if needed
    };

    const handleClearOption = (optionId: string) => {
        const groupSelections = selections[currentGroup.id] || [];
        const updated = groupSelections.filter(s => s.option_id !== optionId);
        setSelections({ ...selections, [currentGroup.id]: updated });
    };

    const isGroupComplete = (groupId: string) => {
        const group = groups.find((g: any) => g.id === groupId);
        if (!group) return false;
        
        const sel = selections[groupId] || [];
        
        // 1. Check overall group min selection
        if (sel.length < (group.min_selection || 0)) return false;

        // 2. Check each option's min selection
        for (const opt of group.options) {
            if (opt.min_selection && opt.min_selection > 0) {
                const optSelCount = sel.filter(s => s.option_id === opt.id).length;
                if (optSelCount < opt.min_selection) return false;
            }
        }

        return true;
    };

    const isAllComplete = groups.every((g: any) => isGroupComplete(g.id));

    const handleFinish = () => {
        if (!isAllComplete) return;
        const flatSelections = Object.values(selections).flat() as DealSelection[];
        const totalPrice = deal.price + flatSelections.reduce((sum, s) => sum + (s.price_adjustment || 0), 0);
        onComplete({ ...deal, isDeal: true, selections: flatSelections }, [], totalPrice);
        onClose();
    };


    // Resolve options for current group
    const resolvedOptions = useMemo(() => {
        if (!currentGroup) return [];
        if (activeOptionId) {
            const opt = currentGroup.options.find((o: any) => o.id === activeOptionId);
            if (opt?.category_id) {
                return menuItems
                    .filter(i => i.category_id === opt.category_id)
                    .map(i => ({ ...i, deal_option: opt, type: 'item' }));
            }
        }

        return currentGroup.options.map((opt: any) => {
            if (opt.menu_item_id) {
                const item = menuItems.find(i => i.id === opt.menu_item_id);
                return item ? { ...item, deal_option: opt, type: 'item' } : null;
            } else if (opt.category_id) {
                const category = categories.find(c => c.id === opt.category_id);
                return category ? { ...category, deal_option: opt, type: 'category' } : null;
            }
            return null;
        }).filter(Boolean);
    }, [currentGroup, activeOptionId, menuItems, categories]);

    const activeOption = useMemo(() => 
        activeOptionId ? currentGroup.options.find((o: any) => o.id === activeOptionId) : null
    , [activeOptionId, currentGroup]);

    const activeCategory = useMemo(() => 
        activeOption?.category_id ? categories.find(c => c.id === activeOption.category_id) : null
    , [activeOption, categories]);

    if (!isOpen || !deal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Package className="text-[var(--theme-color)]" />
                            {deal.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{deal.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    {groups.map((g: any, idx: number) => {
                        const isSelected = idx === currentGroupIdx;
                        const isDone = isGroupComplete(g.id);
                        return (
                            <button 
                                key={g.id}
                                onClick={() => {
                                    setCurrentGroupIdx(idx);
                                    setActiveOptionId(null);
                                }}
                                className={`flex-1 py-4 px-2 text-center border-b-4 transition-all flex flex-col items-center gap-1 ${
                                    isSelected ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/10' : 'border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                                        isDone ? 'bg-green-500 text-white' : isSelected ? 'bg-[var(--theme-color)] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                        {isDone ? <Check size={14} /> : idx + 1}
                                    </span>
                                    <span className={`text-sm font-bold uppercase tracking-wider ${isSelected ? 'text-[var(--theme-color)]' : 'text-gray-500'}`}>
                                        {g.name}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {selections[g.id]?.length || 0} / {g.max_selection} Selected
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
                    {activeOptionId && (
                        <div className="mb-6 flex items-center gap-3 animate-fade-in">
                            <button 
                                onClick={() => setActiveOptionId(null)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                            >
                                <ChevronLeft size={18} /> Back
                            </button>
                            <div className="flex items-center gap-2 text-gray-400">
                                <span className="text-sm font-medium uppercase tracking-wider">{currentGroup.name}</span>
                                <ChevronRight size={14} />
                                <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{activeCategory?.name}</span>
                            </div>
                            
                            {/* NEW: Progress indicator for the current category choice */}
                            {activeCategory?.deal_option && (
                                <div className="ml-auto flex items-center gap-3">
                                    <div className="px-3 py-1 bg-[var(--theme-color)]/10 rounded-full border border-[var(--theme-color)]/20">
                                        <span className="text-[10px] font-black text-[var(--theme-color)] uppercase tracking-widest whitespace-nowrap">
                                            {activeCategory.name} Progress: {(selections[currentGroup.id] || []).filter(s => s.option_id === activeCategory.deal_option.id).length} / {activeCategory.deal_option.max_selection || '∞'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {resolvedOptions.map((itemOrCat: any) => {
                            if (itemOrCat.type === 'category') {
                                const categorySelections = (selections[currentGroup.id] || []).filter(s => 
                                    s.option_id === itemOrCat.deal_option.id
                                );
                                const hasSelection = categorySelections.length > 0;

                                return (
                                    <button
                                        key={itemOrCat.id}
                                        onClick={() => setActiveOptionId(itemOrCat.deal_option.id)}
                                        className={`relative bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 transition-all text-left shadow-sm group h-32 flex flex-col ${
                                            hasSelection
                                                ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/5' 
                                                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2 uppercase tracking-tight">{itemOrCat.name}</h4>
                                                {hasSelection ? (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleClearOption(itemOrCat.deal_option.id);
                                                        }}
                                                        className="p-1 -mr-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                        title="Clear all selections"
                                                    >
                                                        <X size={16} strokeWidth={3} />
                                                    </button>
                                                ) : (
                                                    <Layers size={18} className="text-gray-400" />
                                                )}
                                            </div>
                                            
                                            {(itemOrCat.deal_option?.min_selection > 0 || itemOrCat.deal_option?.max_selection) && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {itemOrCat.deal_option.min_selection > 0 && (
                                                        <span className="text-[9px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-red-100 dark:border-red-900/30">
                                                            Pick {itemOrCat.deal_option.min_selection}
                                                        </span>
                                                    )}
                                                    {itemOrCat.deal_option.max_selection && (
                                                        <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-gray-200 dark:border-gray-600">
                                                            Max {itemOrCat.deal_option.max_selection}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 opacity-60">
                                                {itemOrCat.description || `Select from ${itemOrCat.name}`}
                                            </p>
                                        </div>

                                        <div className="flex justify-between items-end mt-2">
                                            {hasSelection ? (
                                                <div className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md animate-in zoom-in duration-300 shadow-md shadow-green-500/20 uppercase">
                                                    {categorySelections.length} SELECTED
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-[var(--theme-color)] opacity-70 uppercase tracking-widest">
                                                    View Options
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            }

                            const item = itemOrCat;
                            const isSelected = (selections[currentGroup.id] || []).some(s => s.menu_item_id === item.id && s.option_id === item.deal_option.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item, item.deal_option)}
                                    className={`relative bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 transition-all text-left shadow-sm group h-32 flex flex-col ${
                                        isSelected 
                                            ? 'border-[var(--theme-color)] ring-2 ring-[var(--theme-color)]/20 shadow-md' 
                                            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                    }`}
                                >
                                    {isSelected && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleItemClick(item, item.deal_option);
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full transition-transform hover:scale-110 active:scale-95 z-10 shadow-lg"
                                            title="Remove selection"
                                        >
                                            <X size={12} strokeWidth={4} />
                                        </button>
                                    )}
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-2">{item.name}</h4>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                                    </div>
                                    
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-[var(--theme-color)] font-mono font-bold text-sm">
                                            {item.deal_option.price_adjustment > 0 ? `+£${item.deal_option.price_adjustment.toFixed(2)}` : 'Included'}
                                        </span>
                                        {isSelected && (
                                            <div className="flex flex-col items-end gap-1">
                                                {(() => {
                                                    const selection = (selections[currentGroup.id] || []).find(s => s.menu_item_id === item.id);
                                                    return (
                                                        <>
                                                            {selection?.selected_variant && (
                                                                <span className="text-[9px] bg-[var(--theme-color)]/10 text-[var(--theme-color)] px-1.5 py-0.5 rounded-full font-bold">
                                                                    {selection.selected_variant.name}
                                                                </span>
                                                            )}
                                                            {selection?.modifiers && selection.modifiers.length > 0 && (
                                                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                                                    +{selection.modifiers.length} Extras
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                <div className="bg-[var(--theme-color)] text-white p-1 rounded-full mt-1">
                                                    <Check size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                    <button 
                        disabled={currentGroupIdx === 0}
                        onClick={() => {
                            setCurrentGroupIdx(prev => prev - 1);
                            setActiveOptionId(null);
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft /> Previous
                    </button>

                    <div className="text-center bg-gray-50 dark:bg-gray-800 px-6 py-2 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 uppercase font-black tracking-widest block">Total Price</span>
                        <span className="text-2xl font-black text-[var(--theme-color)]">
                            £{(deal.price + (Object.values(selections).flat() as DealSelection[]).reduce((sum, s) => sum + (s.price_adjustment || 0), 0)).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {currentGroupIdx < groups.length - 1 && (
                            <button 
                                disabled={!isGroupComplete(currentGroup.id)}
                                onClick={() => {
                                    setCurrentGroupIdx(prev => prev + 1);
                                    setActiveOptionId(null);
                                }}
                                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all border border-gray-200 dark:border-gray-700"
                            >
                                Next Group <ChevronRight />
                            </button>
                        )}

                        {(isAllComplete || currentGroupIdx === groups.length - 1) && (
                            <button 
                                disabled={!isAllComplete}
                                onClick={handleFinish}
                                className="flex items-center gap-2 bg-[var(--theme-color)] text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-[var(--theme-color)]/30 hover:brightness-110 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                {currentGroupIdx === groups.length - 1 ? 'Add Deal to Cart' : 'Finish & Add'} <ArrowRight />
                            </button>
                        )}
                    </div>
                </div>
            </div>

        {/* Customization Modal */}
        {isModOpen && modMenuItem && (
            <POSModifierModal 
                isOpen={isModOpen}
                menuItem={modMenuItem}
                onClose={() => {
                    setIsModOpen(false);
                    setModMenuItem(null);
                    setModDealOption(null);
                    setEditingSelectionIdx(null);
                }}
                onAddToCart={handleModifierComplete}
                initialVariant={editingSelectionIdx !== null ? (selections[currentGroup.id]?.[editingSelectionIdx]?.selected_variant) : undefined}
                initialSelections={(() => {
                    if (editingSelectionIdx === null) return undefined;
                    const selection = selections[currentGroup.id][editingSelectionIdx];
                    if (!selection.modifiers) return undefined;
                    
                    const formatted: Record<string, Record<string, any>> = {};
                    selection.modifiers.forEach(m => {
                        if (!formatted[m.modifier_group_id]) formatted[m.modifier_group_id] = {};
                        formatted[m.modifier_group_id][m.modifier_item_id] = m;
                    });
                    return formatted;
                })()}
            />
        )}
    </div>
    );
};

export default DealFlowModal;
