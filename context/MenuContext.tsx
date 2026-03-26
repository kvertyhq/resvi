import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useSettings } from './SettingsContext';

interface MenuContextType {
    categories: any[];
    menuItems: any[];
    itemModifiersMap: Set<string>;
    modifierGroups: any[];
    modifierItems: any[];
    menuItemModifiers: any[];
    menuCategoryModifiers: any[];
    loading: boolean;

    isSyncing: boolean;
    refreshMenu: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType>({
    categories: [],
    menuItems: [],
    itemModifiersMap: new Set(),
    modifierGroups: [],
    modifierItems: [],
    menuItemModifiers: [],
    menuCategoryModifiers: [],
    loading: true,

    isSyncing: false,
    refreshMenu: async () => { },
});

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useSettings();
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [itemModifiersMap, setItemModifiersMap] = useState<Set<string>>(new Set());
    const [modifierGroups, setModifierGroups] = useState<any[]>([]);
    const [modifierItems, setModifierItems] = useState<any[]>([]);
    const [menuItemModifiers, setMenuItemModifiers] = useState<any[]>([]);
    const [menuCategoryModifiers, setMenuCategoryModifiers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isSyncing, setIsSyncing] = useState(false);

    const restaurantId = settings?.id;

    // Load from cache on mount or when restaurantId changes
    useEffect(() => {
        if (!restaurantId) return;

        const cacheKey = `pos_menu_cache_${restaurantId}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            try {
                const { 
                    categories: cat, 
                    menuItems: items, 
                    itemModifiersMap: modArray,
                    modifierGroups: groups,
                    modifierItems: mItems,
                    menuItemModifiers: mLinks
                } = JSON.parse(cachedData);
                
                setCategories(cat || []);
                setMenuItems(items || []);
                setItemModifiersMap(new Set(modArray || []));
                setModifierGroups(groups || []);
                setModifierItems(mItems || []);
                setMenuItemModifiers(mLinks || []);
                setMenuCategoryModifiers([]); // Initial sync will fill this
                setLoading(false);
            } catch (e) {

                console.error('Failed to parse menu cache', e);
            }
        }

        // Always trigger a background sync
        refreshMenu();
    }, [restaurantId]);

    const refreshMenu = useCallback(async () => {
        if (!restaurantId) return;

        setIsSyncing(true);
        try {
            // 1. Categories & Items (Parallel)
            const [catRes, itemRes] = await Promise.all([
                supabase.from('menu_categories').select('id, name, description, order_index, tax_rate').eq('restaurant_id', restaurantId).order('order_index'),
                supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true)
            ]);

            if (catRes.error) throw catRes.error;
            if (itemRes.error) throw itemRes.error;

            const catData = catRes.data || [];
            const itemData = itemRes.data || [];

            // 2. Modifiers & Links & Items (Parallel)
            let modSet = new Set<string>();
            let linksData: any[] = [];
            let catLinksData: any[] = [];
            let groupsData: any[] = [];
            let mItemsData: any[] = [];

            if (itemData.length > 0) {
                const itemIds = itemData.map(i => i.id);
                
                // Fetch groups first to get their IDs
                const { data: groups, error: groupsError } = await supabase
                    .from('menu_modifiers')
                    .select('*')
                    .eq('restaurant_id', restaurantId);

                if (groupsError) throw groupsError;
                groupsData = groups || [];

                if (groupsData.length > 0) {
                    const groupIds = groupsData.map(g => g.id);
                    const [linksRes, catLinksRes, itemsRes] = await Promise.all([
                        supabase.from('menu_item_modifiers').select('*').in('menu_item_id', itemIds),
                        supabase.from('menu_category_modifiers').select('*').in('category_id', catData.map(c => c.id)),
                        supabase.from('menu_modifier_items').select('*').in('modifier_group_id', groupIds).eq('is_available', true)
                    ]);

                    if (linksRes.data) {
                        linksData = linksRes.data;
                    }

                    if (catLinksRes.data) {
                        catLinksData = catLinksRes.data;
                    }

                    // Build modSet: items with direct modifiers OR category modifiers
                    const itemsWithDirectMod = new Set(linksData.map(l => l.menu_item_id));
                    const categoriesWithMod = new Set(catLinksData.map(l => l.category_id));
                    
                    itemData.forEach(item => {
                        if (itemsWithDirectMod.has(item.id) || categoriesWithMod.has(item.category_id)) {
                            modSet.add(item.id);
                        }
                    });

                    if (itemsRes.data) mItemsData = itemsRes.data;
                }
            }

            // Update State
            setCategories(catData);
            setMenuItems(itemData);
            setItemModifiersMap(modSet);
            setMenuItemModifiers(linksData);
            setMenuCategoryModifiers(catLinksData);
            setModifierGroups(groupsData);
            setModifierItems(mItemsData);
            setLoading(false);

            // Save to Cache
            const cacheKey = `pos_menu_cache_${restaurantId}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                categories: catData,
                menuItems: itemData,
                itemModifiersMap: Array.from(modSet),
                modifierGroups: groupsData,
                modifierItems: mItemsData,
                menuItemModifiers: linksData,
                menuCategoryModifiers: catLinksData,
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('Error syncing menu:', error);
            setLoading(false);
        } finally {
            setIsSyncing(false);
        }
    }, [restaurantId]);

    return (
        <MenuContext.Provider value={{ 
            categories, 
            menuItems, 
            itemModifiersMap, 
            modifierGroups,
            modifierItems,
            menuItemModifiers,
            menuCategoryModifiers,
            loading, 
            isSyncing,
            refreshMenu 
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenu = () => useContext(MenuContext);

