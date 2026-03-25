import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useSettings } from '../context/SettingsContext';
import { MenuItemData } from '../context/OrderContext';
import { Plus, Minus } from 'lucide-react';

interface BookingMenuStepProps {
    onNext: () => void;
    onPrev: () => void;
    selectedItems: { item: MenuItemData; quantity: number }[];
    onItemsChange: (items: { item: MenuItemData; quantity: number }[]) => void;
    isLoading: boolean;
}

const BookingMenuStep: React.FC<BookingMenuStepProps> = ({ onNext, onPrev, selectedItems, onItemsChange, isLoading }) => {
    const { settings } = useSettings();
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [groupedMenu, setGroupedMenu] = useState<Record<string, MenuItemData[]>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [loadingMenu, setLoadingMenu] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL + '/rest/v1/rpc/get_full_menu_grouped_by_category';
            const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

            try {
                const res = await fetch(SUPABASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: SUPABASE_KEY,
                        Authorization: `Bearer ${SUPABASE_KEY}`,
                    },
                    body: JSON.stringify({ available_only: true }),
                });

                if (!res.ok) throw new Error('Failed to fetch menu');

                const data = await res.json();
                const grouped: Record<string, MenuItemData[]> = {};
                const cats: string[] = [];

                if (Array.isArray(data)) {
                    data.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

                    for (const catObj of data) {
                        const catName = catObj.name || 'Uncategorized';
                        cats.push(catName);

                        grouped[catName] = (catObj.menu_items || []).map((mi: any) => ({
                            id: mi.id,
                            name: mi.name,
                            description: mi.description,
                            price: mi.price,
                            category: catName,
                            category_id: catObj.id,
                            tax_rate: catObj.tax_rate,
                            image_url: mi.image_url,
                            is_available: mi.is_available

                        }));
                    }
                }

                setGroupedMenu(grouped);
                setCategories(cats);
                if (cats.length > 0) setActiveCategory(cats[0]);

            } catch (error) {
                console.error('Error loading menu:', error);
            } finally {
                setLoadingMenu(false);
            }
        };

        fetchMenu();
    }, []);

    const handleUpdateQuantity = (item: MenuItemData, delta: number) => {
        const existingIndex = selectedItems.findIndex(i => i.item.id === item.id);
        let newItems = [...selectedItems];

        if (existingIndex > -1) {
            newItems[existingIndex].quantity += delta;
            if (newItems[existingIndex].quantity <= 0) {
                newItems.splice(existingIndex, 1);
            }
        } else if (delta > 0) {
            newItems.push({ item, quantity: 1 });
        }

        onItemsChange(newItems);
    };

    const getItemQuantity = (itemId: string) => {
        const found = selectedItems.find(i => i.item.id === itemId);
        return found ? found.quantity : 0;
    };

    const currentItems = activeCategory ? groupedMenu[activeCategory] || [] : [];
    const subtotal = selectedItems.reduce((sum, current) => sum + (current.item.price * current.quantity), 0);
    const tax = settings?.show_tax === false ? 0 : selectedItems.reduce((sum, current) => {
        const rate = current.item.tax_rate || 0;
        return sum + (current.item.price * current.quantity * (rate / 100));
    }, 0);
    const totalAmount = subtotal + tax;


    // In strict mode we might pass these in, but for now I'll just hardcode 3/4 if this component is mounted
    // because it ONLY mounts when there are 4 steps total.
    const stepLabel = "3/4 Select Pre-order Items";

    return (
        <div>
            <p className="font-bold text-sm text-brand-mid-gray mb-4">{stepLabel}</p>
            <div className="bg-white p-4 shadow-inner min-h-[400px]">
                {loadingMenu ? (
                    <div className="text-center py-10">Loading menu...</div>
                ) : (
                    <>
                        <div className="flex overflow-x-auto space-x-2 pb-4 mb-4 border-b border-gray-100">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                                        ${activeCategory === cat ? 'bg-brand-dark-gray text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                    `}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {currentItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-semibold text-brand-dark-gray">{item.name}</h4>
                                        <p className="text-sm text-brand-gold font-bold">{settings?.currency}{item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-1">
                                        <button
                                            onClick={() => handleUpdateQuantity(item, -1)}
                                            className="p-1 text-gray-400 hover:text-brand-dark-gray disabled:opacity-30"
                                            disabled={getItemQuantity(item.id) === 0}
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold w-4 text-center text-sm">{getItemQuantity(item.id)}</span>
                                        <button
                                            onClick={() => handleUpdateQuantity(item, 1)}
                                            className="p-1 text-gray-400 hover:text-brand-dark-gray"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>{settings?.currency}{subtotal.toFixed(2)}</span>
                </div>
                {settings?.show_tax !== false && tax > 0 && (
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Tax:</span>
                        <span>{settings?.currency}{tax.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold">Total Pre-order Value:</span>
                    <span className="font-bold text-lg text-brand-dark-gray">{settings?.currency}{totalAmount.toFixed(2)}</span>
                </div>
            </div>


            <div className="flex justify-between mt-6">
                <button onClick={onPrev} className="px-8 py-3 bg-gray-300 text-brand-dark-gray font-bold uppercase text-sm tracking-wider hover:bg-gray-400 transition-colors">
                    Prev
                </button>
                <button
                    onClick={onNext}
                    disabled={selectedItems.length === 0 || isLoading}
                    className="px-8 py-3 bg-brand-gold text-white font-bold uppercase text-sm tracking-wider disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    title={selectedItems.length === 0 ? "Please select at least one item" : ""}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default BookingMenuStep;
