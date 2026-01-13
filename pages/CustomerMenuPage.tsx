import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import POSCategoryTabs from '../components/pos/POSCategoryTabs';
import POSMenuGrid from '../components/pos/POSMenuGrid';
import POSModifierModal from '../components/pos/POSModifierModal';

// Customer view acts similarly to POS but without Staff features
// and distinct styling (e.g. mobile first)

const CustomerMenuPage: React.FC = () => {
    const { tableId } = useParams<{ tableId: string }>();
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [itemModifiersMap, setItemModifiersMap] = useState<Set<string>>(new Set());

    // UI State
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);
    const [tableName, setTableName] = useState('');
    const [cartCount, setCartCount] = useState(0); // Simplified for MVP prev

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemForModal, setItemForModal] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        if (tableId) {
            fetchRestaurantContext();
        }
    }, [tableId]);

    const fetchRestaurantContext = async () => {
        setLoading(true);
        try {
            // 1. Get Table & Restaurant ID
            const { data: tableData, error } = await supabase
                .from('table_info')
                .select('restaurant_id, table_name')
                .eq('id', tableId)
                .single();

            if (error || !tableData) throw new Error('Invalid Table');

            setRestaurantId(tableData.restaurant_id);
            setTableName(tableData.table_name);

            // 2. Fetch Menu
            const { data: catData } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', tableData.restaurant_id)
                .order('order_index');
            if (catData) setCategories(catData);

            const { data: itemData } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', tableData.restaurant_id)
                .eq('is_available', true);

            if (itemData) {
                setMenuItems(itemData);
                // Modifiers check
                const itemIds = itemData.map(i => i.id);
                const { data: modLinks } = await supabase
                    .from('menu_item_modifiers')
                    .select('menu_item_id')
                    .in('menu_item_id', itemIds);

                if (modLinks) {
                    setItemModifiersMap(new Set(modLinks.map(l => l.menu_item_id)));
                }
            }

        } catch (error) {
            console.error('Error loading menu:', error);
            alert('Could not load menu. Please scan again.');
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: any) => {
        if (itemModifiersMap.has(item.id)) {
            setItemForModal(item);
            setIsModalOpen(true);
        } else {
            addToCart(item, [], item.price);
        }
    };

    const addToCart = (item: any, modifiers: any[], finalPrice: number) => {
        // Validation/Logic same as POS but maybe save to local storage for guest
        setCartCount(prev => prev + 1);
        alert(`Added ${item.name} to order! (Checkout coming soon)`);
        setIsModalOpen(false);
    };

    const filteredItems = selectedCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category_id === selectedCategory);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Loading Menu...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-20">
            {/* Mobile Header */}
            <div className="bg-white sticky top-0 z-20 shadow-sm px-4 py-3 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-gray-800 text-lg">Menu</h1>
                    <p className="text-xs text-gray-500">Table: {tableName}</p>
                </div>
                <button className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                    <span>🛒</span>
                    <span>{cartCount}</span>
                </button>
            </div>

            {/* Modals */}
            <POSModifierModal
                isOpen={isModalOpen}
                menuItem={itemForModal}
                onClose={() => setIsModalOpen(false)}
                onAddToCart={addToCart}
            />

            {/* Categories */}
            <div className="sticky top-14 z-10 bg-gray-50 pt-2 px-2">
                <POSCategoryTabs
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelect={setSelectedCategory}
                />
            </div>

            {/* Grid */}
            <div className="p-4">
                <POSMenuGrid items={filteredItems} onItemClick={handleItemClick} />
            </div>
        </div>
    );
};

export default CustomerMenuPage;
