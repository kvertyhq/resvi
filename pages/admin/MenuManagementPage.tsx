import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../supabaseClient';
import { Plus, Edit, Trash2, Image as ImageIcon, CheckCircle, XCircle, Loader2, Layers, Utensils, ChevronDown, ChevronRight, Settings2, Copy, Search, RefreshCw } from 'lucide-react';
import { Station, StationService } from '../../services/StationService';

// Interfaces based on user schema
interface MenuCategory {
    id: string;
    name: string;
    description: string;
    order_index: number;
    tax_rate: number;
    station_id?: string;

    created_at?: string;
    updated_at?: string;
}

interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    is_available: boolean;
    image_url: string;
    tags: string[];
    vegetarian: boolean;
    spicy_level: number;
    station_id?: string;
    created_at?: string;
    updated_at?: string;
}

interface Addon {
    id: string;
    restaurant_id: string;
    name: string;
    description: string;
    price: number;
    is_available: boolean;
}

interface MenuItemAddon {
    menu_item_id: string;
    addon_id: string;
    order_index: number;
}

interface ModifierGroup {
    id: string;
    restaurant_id: string;
    name: string;
    is_required: boolean;
    is_multiple: boolean;
    min_selection: number;
    max_selection: number | null;
    items?: ModifierItem[];
}

interface ModifierItem {
    id: string;
    modifier_group_id: string;
    name: string;
    price_adjustment: number;
    price_matrix: Record<string, number>;
    is_available: boolean;
}

const MenuManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const { showAlert, showConfirm } = useAlert();
    const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'addons' | 'modifiers'>('items');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    // Pagination State
    const itemsPerPage = 10;
    const [itemsPage, setItemsPage] = useState(1);
    const [itemsTotalCount, setItemsTotalCount] = useState(0);
    const [categoriesPage, setCategoriesPage] = useState(1);
    const [categoriesTotalCount, setCategoriesTotalCount] = useState(0);
    const [addonsPage, setAddonsPage] = useState(1);
    const [addonsTotalCount, setAddonsTotalCount] = useState(0);

    // Data State
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [allCategories, setAllCategories] = useState<MenuCategory[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

    // Modifier Group Modal State
    const [isModifierGroupModalOpen, setIsModifierGroupModalOpen] = useState(false);
    const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
    const [modifierGroupForm, setModifierGroupForm] = useState<Partial<ModifierGroup>>({
        name: '', is_required: false, is_multiple: true, min_selection: 0, max_selection: null
    });

    // Modifier Item Modal State
    const [isModifierItemModalOpen, setIsModifierItemModalOpen] = useState(false);
    const [editingModifierItem, setEditingModifierItem] = useState<ModifierItem | null>(null);
    const [modifierItemForm, setModifierItemForm] = useState<Partial<ModifierItem>>({
        name: '', price_adjustment: 0, is_available: true, price_matrix: {}
    });
    const [modifierItemGroupId, setModifierItemGroupId] = useState<string>('');

    // For size-based price matrix input (variant names derived from item being edited)
    const [priceMatrixVariants, setPriceMatrixVariants] = useState<string[]>([]);

    // Linked modifier groups: groupId -> order_index
    const [selectedModifierOrders, setSelectedModifierOrders] = useState<Map<string, number>>(new Map());

    // Default toppings that come pre-loaded with this item (array of modifier_item IDs)
    const [defaultToppingIds, setDefaultToppingIds] = useState<Set<string>>(new Set());

    // Size variants state for item edit modal
    const [priceVariants, setPriceVariants] = useState<{ name: string; price: number }[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());

    // Form State
    const [categoryForm, setCategoryForm] = useState<Partial<MenuCategory>>({
        name: '',
        description: '',
        order_index: 0,
        tax_rate: 0,
        station_id: ''

    });

    const [selectedCatModifierOrders, setSelectedCatModifierOrders] = useState<Map<string, number>>(new Map());

    const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
        name: '',
        description: '',
        price: 0,
        category_id: '',
        is_available: true,
        image_url: '',
        tags: [],
        vegetarian: false,
        spicy_level: 0,
        station_id: ''
    });

    const [addonForm, setAddonForm] = useState<Partial<Addon>>({
        name: '',
        description: '',
        price: 0,
        is_available: true
    });

    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [aiCheckStatus, setAiCheckStatus] = useState<'idle' | 'checking' | 'approved' | 'rejected'>('idle');
    const [aiFeedback, setAiFeedback] = useState<string>('');
    const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);
    const [isRefreshingItems, setIsRefreshingItems] = useState(false);

    useEffect(() => {
        if (selectedRestaurantId) {
            // Reset all pages when restaurant changes
            setItemsPage(1);
            setCategoriesPage(1);
            setAddonsPage(1);
            fetchData();
        }
    }, [selectedRestaurantId]);

    useEffect(() => {
        if (selectedRestaurantId) {
            // Reset page when switching tabs
            if (activeTab === 'items') setItemsPage(1);
            else if (activeTab === 'categories') setCategoriesPage(1);
            else if (activeTab === 'addons') setAddonsPage(1);
        }
    }, [activeTab]);

    useEffect(() => {
        if (selectedRestaurantId) fetchItems();
    }, [itemsPage, selectedCategoryId]);

    useEffect(() => {
        if (selectedRestaurantId) fetchCategories();
    }, [categoriesPage, categorySearchQuery]);

    useEffect(() => {
        if (selectedRestaurantId) fetchAddons();
    }, [addonsPage]);

    const fetchData = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);
        await Promise.all([fetchCategories(), fetchAllCategories(), fetchItems(), fetchAddons(), fetchStations(), fetchModifierGroups()]);
        setLoading(false);
    };

    const handleRefresh = async () => {
        if (!selectedRestaurantId) return;
        setIsRefreshingItems(true);
        await Promise.all([
            fetchCategories(), 
            fetchAllCategories(), 
            fetchItems(), 
            fetchAddons(), 
            fetchStations(), 
            fetchModifierGroups()
        ]);
        setIsRefreshingItems(false);
    };

    const fetchStations = async () => {
        if (!selectedRestaurantId) return;
        try {
            const data = await StationService.getStations(selectedRestaurantId);
            setStations(data);
        } catch (error) {
            console.error('Error fetching stations:', error);
        }
    };

    const fetchModifierGroups = async () => {
        if (!selectedRestaurantId) return;
        try {
            const { data: groups } = await supabase
                .from('menu_modifiers')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .order('name');

            if (groups) {
                // Load items for each group
                const { data: allItems } = await supabase
                    .from('menu_modifier_items')
                    .select('*')
                    .in('modifier_group_id', groups.map(g => g.id));

                const groupsWithItems = groups.map(g => ({
                    ...g,
                    items: (allItems || []).filter(i => i.modifier_group_id === g.id)
                }));
                setModifierGroups(groupsWithItems);
            }
        } catch (error) {
            console.error('Error fetching modifier groups:', error);
        }
    };

    const openModifierGroupModal = (group?: ModifierGroup) => {
        if (group) {
            setEditingModifierGroup(group);
            setModifierGroupForm(group);
        } else {
            setEditingModifierGroup(null);
            setModifierGroupForm({ name: '', is_required: false, is_multiple: true, min_selection: 0, max_selection: null });
        }
        setIsModifierGroupModalOpen(true);
    };

    const handleModifierGroupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;
        const payload = { ...modifierGroupForm, restaurant_id: selectedRestaurantId };
        if (editingModifierGroup) {
            await supabase.from('menu_modifiers').update(payload).eq('id', editingModifierGroup.id);
        } else {
            await supabase.from('menu_modifiers').insert([payload]);
        }
        setIsModifierGroupModalOpen(false);
        fetchModifierGroups();
    };

    const handleDeleteModifierGroup = async (id: string) => {
        const confirmed = await showConfirm(
            'Confirm Delete',
            'This will delete the group and ALL its items. Continue?',
            'warning'
        );
        if (confirmed) {
            await supabase.from('menu_modifiers').delete().eq('id', id);
            fetchModifierGroups();
        }
    };

    const handleDuplicateModifierGroup = async (group: ModifierGroup) => {
        if (!selectedRestaurantId) return;

        const newName = window.prompt('Enter name for the duplicated copy:', `${group.name} (Copy)`);
        if (!newName) return;

        try {
            // 1. Insert the new group
            const groupPayload = {
                restaurant_id: selectedRestaurantId,
                name: newName,
                is_required: group.is_required,
                is_multiple: group.is_multiple,
                min_selection: group.min_selection,
                max_selection: group.max_selection
            };

            const { data: newGroupData, error: groupError } = await supabase
                .from('menu_modifiers')
                .insert([groupPayload])
                .select()
                .single();

            if (groupError) throw groupError;
            if (!newGroupData) throw new Error('Failed to create new group');

            const newGroupId = newGroupData.id;

            // 2. Insert the copied items associated with the group
            if (group.items && group.items.length > 0) {
                const itemsPayload = group.items.map(item => ({
                    modifier_group_id: newGroupId,
                    name: item.name,
                    price_adjustment: item.price_adjustment,
                    price_matrix: item.price_matrix,
                    is_available: item.is_available
                }));

                const { error: itemsError } = await supabase
                    .from('menu_modifier_items')
                    .insert(itemsPayload);

                if (itemsError) throw itemsError;
            }

            showAlert('Success', 'Modifier group duplicated successfully.', 'success');
            fetchModifierGroups();
        } catch (error) {
            console.error('Error duplicating modifier group:', error);
            showAlert('Error', 'Failed to duplicate modifier group.', 'error');
        }
    };

    const openModifierItemModal = (groupId: string, item?: ModifierItem, variantNames?: string[]) => {
        setModifierItemGroupId(groupId);
        setPriceMatrixVariants(variantNames || []);
        if (item) {
            setEditingModifierItem(item);
            setModifierItemForm(item);
        } else {
            setEditingModifierItem(null);
            const emptyMatrix: Record<string, number> = {};
            (variantNames || []).forEach(v => { emptyMatrix[v] = 0; });
            setModifierItemForm({ name: '', price_adjustment: 0, is_available: true, price_matrix: emptyMatrix });
        }
        setIsModifierItemModalOpen(true);
    };

    const handleModifierItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...modifierItemForm, modifier_group_id: modifierItemGroupId };
        if (editingModifierItem) {
            await supabase.from('menu_modifier_items').update(payload).eq('id', editingModifierItem.id);
        } else {
            await supabase.from('menu_modifier_items').insert([payload]);
        }
        setIsModifierItemModalOpen(false);
        fetchModifierGroups();
    };

    const handleDeleteModifierItem = async (id: string) => {
        const confirmed = await showConfirm(
            'Confirm Delete',
            'Delete this modifier item?',
            'warning'
        );
        if (confirmed) {
            await supabase.from('menu_modifier_items').delete().eq('id', id);
            fetchModifierGroups();
        }
    };

    const fetchAllCategories = async () => {
        if (!selectedRestaurantId) return;
        setIsRefreshingCategories(true);
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', selectedRestaurantId)
            .order('order_index', { ascending: true });

        if (data) setAllCategories(data);
        if (error) console.error('Error fetching all categories:', error);
        setIsRefreshingCategories(false);
    };

    const fetchCategories = async () => {
        if (!selectedRestaurantId) return;
        const from = (categoriesPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let query = supabase
            .from('menu_categories')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('order_index', { ascending: true });

        if (categorySearchQuery) {
            query = query.ilike('name', `%${categorySearchQuery}%`);
        }

        const { data, error, count } = await query.range(from, to);

        if (data) setCategories(data);
        if (count !== null) setCategoriesTotalCount(count);
        if (error) console.error('Error fetching categories:', error);
    };

    const fetchItems = async () => {
        if (!selectedRestaurantId) return;
        setIsRefreshingItems(true);
        const from = (itemsPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let query = supabase
            .from('menu_items')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('name', { ascending: true });

        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
        }

        if (selectedCategoryId) {
            query = query.eq('category_id', selectedCategoryId);
        }

        const { data, error, count } = await query.range(from, to);

        if (data) setItems(data);
        if (count !== null) setItemsTotalCount(count);
        if (error) console.error('Error fetching items:', error);
        setIsRefreshingItems(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedRestaurantId && activeTab === 'items') {
                setItemsPage(1);
                fetchItems();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategoryId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedRestaurantId && activeTab === 'categories') {
                setCategoriesPage(1);
                fetchCategories();
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [categorySearchQuery]);

    const fetchAddons = async () => {
        if (!selectedRestaurantId) return;
        const from = (addonsPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
            .from('addons')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('name', { ascending: true })
            .range(from, to);

        if (data) setAddons(data);
        if (count !== null) setAddonsTotalCount(count);
        if (error) console.error('Error fetching addons:', error);
    };

    // --- Handlers for Categories ---

    const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setCategoryForm(prev => ({
            ...prev,
            [name]: type === 'number' ? (name === 'tax_rate' ? parseFloat(value) : parseInt(value)) : value
        }));

    };

    const openCategoryModal = async (category?: MenuCategory) => {
        setSelectedCatModifierOrders(new Map());
        if (category) {
            setEditingCategory(category);
            setCategoryForm(category);

            // Fetch linked modifier groups for category
            const { data: modsData } = await supabase
                .from('menu_category_modifiers')
                .select('modifier_group_id, order_index')
                .eq('category_id', category.id);

            if (modsData) {
                const map = new Map<string, number>();
                modsData.forEach(m => map.set(m.modifier_group_id, m.order_index ?? 0));
                setSelectedCatModifierOrders(map);
            }
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', description: '', order_index: categories.length, tax_rate: 0, station_id: '' });
        }
        setIsModalOpen(true);
    };


    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;
        const payload = {
            ...categoryForm,
            restaurant_id: selectedRestaurantId,
            station_id: categoryForm.station_id === '' ? null : categoryForm.station_id // Handle empty string
        };

        let catId = editingCategory?.id;

        if (editingCategory) {
            const { error } = await supabase.from('menu_categories').update(payload).eq('id', editingCategory.id);
            if (error) console.error("Error updating category:", error);
        } else {
            const { data, error } = await supabase.from('menu_categories').insert([payload]).select().single();
            if (error) console.error("Error inserting category:", error);
            if (data) catId = data.id;
        }

        // Update Linking Tables for Category
        if (catId) {
            await supabase.from('menu_category_modifiers').delete().eq('category_id', catId);
            if (selectedCatModifierOrders.size > 0) {
                const modifiersToInsert = Array.from(selectedCatModifierOrders.entries()).map(([groupId, orderIdx]) => ({
                    category_id: catId,
                    modifier_group_id: groupId,
                    order_index: orderIdx
                }));
                const { error } = await supabase.from('menu_category_modifiers').insert(modifiersToInsert);
                if (error) console.error("Error updating category modifiers:", error);
            }
        }

        setIsModalOpen(false);
        fetchCategories();
    };

    const handleDeleteCategory = async (id: string) => {
        const confirmed = await showConfirm(
            'Confirm Delete',
            'Are you sure? This might affect items linked to this category.',
            'warning'
        );
        if (confirmed) {
            await supabase.from('menu_categories').delete().eq('id', id);
            fetchCategories();
        }
    };

    // --- Handlers for Items ---

    const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setItemForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setItemForm(prev => ({ ...prev, [name]: checked }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        setItemForm(prev => ({ ...prev, tags }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setAiCheckStatus('idle');
            setAiFeedback('');

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const checkImageWithAI = async () => {
        if (!imageFile) return;
        setAiCheckStatus('checking');
        // Simulate AI Check
        setTimeout(() => {
            const isAppropriate = Math.random() > 0.2;
            setAiCheckStatus(isAppropriate ? 'approved' : 'rejected');
            setAiFeedback(isAppropriate ? "AI Analysis: Approved." : "AI Analysis: Rejected.");
        }, 1500);
    };

    const openItemModal = async (item?: MenuItem) => {
        setImageFile(null);
        setAiCheckStatus('idle');
        setAiFeedback('');
        setSelectedAddonIds(new Set());
        setSelectedModifierOrders(new Map());
        setDefaultToppingIds(new Set());
        setPriceVariants([]);

        if (item) {
            setEditingItem(item);
            setItemForm(item);
            setImagePreview(item.image_url || '');

            // Load default toppings
            const dtIds: string[] = (item as any).default_topping_ids || [];
            setDefaultToppingIds(new Set(dtIds));

            // Use item.price_variants if available (we need to cast or access it if added to interface)
            const itemWithVariants = item as any;
            if (itemWithVariants.price_variants && Array.isArray(itemWithVariants.price_variants)) {
                setPriceVariants(itemWithVariants.price_variants);
            }

            // Fetch linked addons
            const { data: addonsData } = await supabase
                .from('menu_item_addons')
                .select('addon_id')
                .eq('menu_item_id', item.id);

            if (addonsData) {
                setSelectedAddonIds(new Set(addonsData.map(a => a.addon_id)));
            }

            // Fetch linked modifier groups (with order_index)
            const { data: modsData } = await supabase
                .from('menu_item_modifiers')
                .select('modifier_group_id, order_index')
                .eq('menu_item_id', item.id);

            if (modsData) {
                const map = new Map<string, number>();
                modsData.forEach(m => map.set(m.modifier_group_id, m.order_index ?? 0));
                setSelectedModifierOrders(map);
            }
        } else {
            // Opening modal for a NEW item — reset all fields
            setEditingItem(null);
            setSelectedModifierOrders(new Map());
            setDefaultToppingIds(new Set());
            setItemForm({
                name: '',
                description: '',
                price: 0,
                category_id: categories.length > 0 ? categories[0].id : '',
                is_available: true,
                image_url: '',
                tags: [],
                vegetarian: false,
                spicy_level: 0,
                station_id: ''
            });
            setImagePreview('');
        }
        setIsModalOpen(true);
    };

    const handleItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;

        if (aiCheckStatus === 'rejected') {
            showAlert('Rejected', "Cannot save: Image was rejected by AI.", 'error');
            return;
        }

        let imageUrl = itemForm.image_url;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            // Use 'images' bucket as requested
            const { data } = await supabase.storage.from('images').upload(fileName, imageFile);
            if (data) {
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }
        }

        const payload = {
            ...itemForm,
            image_url: imageUrl,
            restaurant_id: selectedRestaurantId,
            station_id: itemForm.station_id === '' ? null : itemForm.station_id,
            price_variants: priceVariants,
            default_topping_ids: Array.from(defaultToppingIds)
        };

        let itemId = editingItem?.id;

        if (editingItem) {
            await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        } else {
            const { data, error } = await supabase.from('menu_items').insert([payload]).select().single();
            if (data) itemId = data.id;
        }

        // Update Linking Tables
        if (itemId) {
            // Update Addons
            await supabase.from('menu_item_addons').delete().eq('menu_item_id', itemId);
            if (selectedAddonIds.size > 0) {
                const addonsToInsert = Array.from(selectedAddonIds).map(addonId => ({
                    menu_item_id: itemId,
                    addon_id: addonId
                }));
                await supabase.from('menu_item_addons').insert(addonsToInsert);
            }

            // Update Modifiers
            await supabase.from('menu_item_modifiers').delete().eq('menu_item_id', itemId);
            if (selectedModifierOrders.size > 0) {
                const modifiersToInsert = Array.from(selectedModifierOrders.entries()).map(([groupId, orderIdx]) => ({
                    menu_item_id: itemId,
                    modifier_group_id: groupId,
                    order_index: orderIdx
                }));
                await supabase.from('menu_item_modifiers').insert(modifiersToInsert);
            }
        }

        setIsModalOpen(false);
        fetchItems();
    };

    const handleDeleteItem = async (id: string) => {
        const confirmed = await showConfirm(
            'Confirm Delete',
            'Delete this item?',
            'warning'
        );
        if (confirmed) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchItems();
        }
    };

    const handleDuplicateItem = async (item: MenuItem) => {
        if (!selectedRestaurantId) return;

        const newName = window.prompt('Enter name for the duplicated copy:', `${item.name} (Copy)`);
        if (!newName) return;

        try {
            // First, fetch relations for the item being copied
            const { data: addonsData } = await supabase.from('menu_item_addons').select('addon_id').eq('menu_item_id', item.id);
            const { data: modsData } = await supabase.from('menu_item_modifiers').select('modifier_group_id, order_index').eq('menu_item_id', item.id);

            // 1. Insert the new item
            const itemWithVariants = item as any;

            const itemPayload = {
                restaurant_id: selectedRestaurantId,
                name: newName,
                description: item.description,
                price: item.price,
                category_id: item.category_id,
                is_available: item.is_available,
                image_url: item.image_url,
                tags: item.tags,
                vegetarian: item.vegetarian,
                spicy_level: item.spicy_level,
                station_id: item.station_id,
                price_variants: itemWithVariants.price_variants || null
            };

            const { data: newItemData, error: itemError } = await supabase
                .from('menu_items')
                .insert([itemPayload])
                .select()
                .single();

            if (itemError) throw itemError;
            if (!newItemData) throw new Error('Failed to create new item');

            const newItemId = newItemData.id;

            // 2. Insert Addons
            if (addonsData && addonsData.length > 0) {
                const addonsToInsert = addonsData.map(a => ({
                    menu_item_id: newItemId,
                    addon_id: a.addon_id
                }));
                const { error: addonsError } = await supabase.from('menu_item_addons').insert(addonsToInsert);
                if (addonsError) console.error("Error copying addons:", addonsError);
            }

            // 3. Insert Modifiers
            if (modsData && modsData.length > 0) {
                const modifiersToInsert = modsData.map(m => ({
                    menu_item_id: newItemId,
                    modifier_group_id: m.modifier_group_id,
                    order_index: m.order_index
                }));
                const { error: modsError } = await supabase.from('menu_item_modifiers').insert(modifiersToInsert);
                if (modsError) console.error("Error copying modifiers:", modsError);
            }

            showAlert('Success', 'Menu item duplicated successfully.', 'success');
            fetchItems();
        } catch (error) {
            console.error('Error duplicating menu item:', error);
            showAlert('Error', 'Failed to duplicate menu item.', 'error');
        }
    };

    // --- Handlers for Addons ---

    const handleAddonInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setAddonForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleAddonCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setAddonForm(prev => ({ ...prev, [name]: checked }));
    };

    const openAddonModal = (addon?: Addon) => {
        if (addon) {
            setEditingAddon(addon);
            setAddonForm(addon);
        } else {
            setEditingAddon(null);
            setAddonForm({
                name: '',
                description: '',
                price: 0,
                is_available: true
            });
        }
        setIsModalOpen(true);
    };

    const handleAddonSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;
        const payload = { ...addonForm, restaurant_id: selectedRestaurantId };

        if (editingAddon) {
            await supabase.from('addons').update(payload).eq('id', editingAddon.id);
        } else {
            await supabase.from('addons').insert([payload]);
        }
        setIsModalOpen(false);
        fetchAddons();
    };

    const handleDeleteAddon = async (id: string) => {
        const confirmed = await showConfirm(
            'Confirm Delete',
            'Delete this add-on?',
            'warning'
        );
        if (confirmed) {
            await supabase.from('addons').delete().eq('id', id);
            fetchAddons();
        }
    };

    if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Menu Management</h2>
                <div className="flex items-center gap-4">
                    {activeTab === 'items' && (
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold outline-none w-48 sm:w-64 transition-all"
                                />
                            </div>
                            <select
                                value={selectedCategoryId}
                                onChange={(e) => {
                                    setSelectedCategoryId(e.target.value);
                                    setItemsPage(1);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold outline-none text-sm transition-all bg-white"
                            >
                                <option value="">All Categories</option>
                                {allCategories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshingItems}
                                className="p-2 text-gray-400 hover:text-brand-gold transition-colors disabled:opacity-50"
                                title="Refresh All Data"
                            >
                                <RefreshCw className={`h-5 w-5 ${isRefreshingItems ? 'animate-spin text-brand-gold' : ''}`} />
                            </button>
                        </div>
                    )}
                    {activeTab === 'categories' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={categorySearchQuery}
                                onChange={(e) => setCategorySearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-brand-gold focus:border-brand-gold outline-none w-64 transition-all"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => activeTab === 'categories' ? openCategoryModal() : activeTab === 'addons' ? openAddonModal() : activeTab === 'modifiers' ? openModifierGroupModal() : openItemModal()}
                        className="bg-brand-gold text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-600 transition-colors"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Add {activeTab === 'categories' ? 'Category' : activeTab === 'addons' ? 'Add-on' : activeTab === 'modifiers' ? 'Modifier Group' : 'Item'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('items')}
                    className={`pb-2 px-4 font-medium text-sm flex items-center ${activeTab === 'items' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Utensils className="h-4 w-4 mr-2" /> Menu Items
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`pb-2 px-4 font-medium text-sm flex items-center ${activeTab === 'categories' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Layers className="h-4 w-4 mr-2" /> Categories
                </button>
                <button
                    onClick={() => setActiveTab('addons')}
                    className={`pb-2 px-4 font-medium text-sm flex items-center ${activeTab === 'addons' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Plus className="h-4 w-4 mr-2" /> Add-ons
                </button>
                <button
                    onClick={() => setActiveTab('modifiers')}
                    className={`pb-2 px-4 font-medium text-sm flex items-center ${activeTab === 'modifiers' ? 'border-b-2 border-brand-gold text-brand-gold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Settings2 className="h-4 w-4 mr-2" /> Modifiers
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <>
                    {activeTab === 'categories' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Tax %</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Station</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>

                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {categories.map((cat) => (
                                            <tr key={cat.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.order_index}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cat.description}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500 text-center font-mono">{cat.tax_rate || 0}%</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{stations.find(s => s.id === cat.station_id)?.name || 'Default'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openCategoryModal(cat)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {categories.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No categories found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls for Categories */}
                            {categoriesTotalCount > 0 && (
                                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setCategoriesPage(page => Math.max(page - 1, 1))}
                                            disabled={categoriesPage === 1}
                                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCategoriesPage(page => Math.min(page + 1, Math.ceil(categoriesTotalCount / itemsPerPage)))}
                                            disabled={categoriesPage === Math.ceil(categoriesTotalCount / itemsPerPage)}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(categoriesPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(categoriesPage * itemsPerPage, categoriesTotalCount)}</span> of{' '}
                                                <span className="font-medium">{categoriesTotalCount}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                <button
                                                    onClick={() => setCategoriesPage(page => Math.max(page - 1, 1))}
                                                    disabled={categoriesPage === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {Array.from({ length: Math.ceil(categoriesTotalCount / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCategoriesPage(page)}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${categoriesPage === page
                                                            ? 'bg-brand-gold text-white focus:z-20'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setCategoriesPage(page => Math.min(page + 1, Math.ceil(categoriesTotalCount / itemsPerPage)))}
                                                    disabled={categoriesPage === Math.ceil(categoriesTotalCount / itemsPerPage)}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'items' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item) => {
                                            const catName = allCategories.find(c => c.id === item.category_id)?.name || 'Unknown';
                                            return (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.name}
                                                        {item.vegetarian && <span className="ml-2 text-xs bg-green-100 text-green-800 px-1 rounded">Veg</span>}
                                                        {item.spicy_level > 0 && <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 rounded">🌶️ {item.spicy_level}</span>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{catName}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">£{item.price.toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {item.is_available ? 'Available' : 'Unavailable'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleDuplicateItem(item)}
                                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                                            title="Duplicate Item"
                                                        >
                                                            <Copy className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openItemModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit Item"><Edit className="h-5 w-5" /></button>
                                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-900" title="Delete Item"><Trash2 className="h-5 w-5" /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {items.length === 0 && <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No items found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls for Items */}
                            {itemsTotalCount > 0 && (
                                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setItemsPage(page => Math.max(page - 1, 1))}
                                            disabled={itemsPage === 1}
                                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setItemsPage(page => Math.min(page + 1, Math.ceil(itemsTotalCount / itemsPerPage)))}
                                            disabled={itemsPage === Math.ceil(itemsTotalCount / itemsPerPage)}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(itemsPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(itemsPage * itemsPerPage, itemsTotalCount)}</span> of{' '}
                                                <span className="font-medium">{itemsTotalCount}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                <button
                                                    onClick={() => setItemsPage(page => Math.max(page - 1, 1))}
                                                    disabled={itemsPage === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {Array.from({ length: Math.ceil(itemsTotalCount / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setItemsPage(page)}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${itemsPage === page
                                                            ? 'bg-brand-gold text-white focus:z-20'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setItemsPage(page => Math.min(page + 1, Math.ceil(itemsTotalCount / itemsPerPage)))}
                                                    disabled={itemsPage === Math.ceil(itemsTotalCount / itemsPerPage)}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'addons' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {addons.map((addon) => (
                                            <tr key={addon.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{addon.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{addon.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">£{addon.price.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${addon.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {addon.is_available ? 'Available' : 'Unavailable'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openAddonModal(addon)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                                    <button onClick={() => handleDeleteAddon(addon.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {addons.length === 0 && <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No add-ons found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls for Add-ons */}
                            {addonsTotalCount > 0 && (
                                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setAddonsPage(page => Math.max(page - 1, 1))}
                                            disabled={addonsPage === 1}
                                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setAddonsPage(page => Math.min(page + 1, Math.ceil(addonsTotalCount / itemsPerPage)))}
                                            disabled={addonsPage === Math.ceil(addonsTotalCount / itemsPerPage)}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(addonsPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(addonsPage * itemsPerPage, addonsTotalCount)}</span> of{' '}
                                                <span className="font-medium">{addonsTotalCount}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                <button
                                                    onClick={() => setAddonsPage(page => Math.max(page - 1, 1))}
                                                    disabled={addonsPage === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                {Array.from({ length: Math.ceil(addonsTotalCount / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setAddonsPage(page)}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${addonsPage === page
                                                            ? 'bg-brand-gold text-white focus:z-20'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setAddonsPage(page => Math.min(page + 1, Math.ceil(addonsTotalCount / itemsPerPage)))}
                                                    disabled={addonsPage === Math.ceil(addonsTotalCount / itemsPerPage)}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'modifiers' && (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settings</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {modifierGroups.map((group) => (
                                            <React.Fragment key={group.id}>
                                                <tr className={expandedGroupId === group.id ? 'bg-gray-50' : ''}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            {expandedGroupId === group.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex space-x-2">
                                                            {group.is_required && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Required</span>}
                                                            {group.is_multiple && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Multiple</span>}
                                                            {!group.is_multiple && <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Single</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {group.items?.length || 0} items
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => openModifierItemModal(group.id)}
                                                            className="text-green-600 hover:text-green-900 mr-4"
                                                            title="Add Item"
                                                        >
                                                            <Plus className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicateModifierGroup(group)}
                                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                                            title="Duplicate Group"
                                                        >
                                                            <Copy className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => openModifierGroupModal(group)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit Group"><Edit className="h-5 w-5" /></button>
                                                        <button onClick={() => handleDeleteModifierGroup(group.id)} className="text-red-600 hover:text-red-900" title="Delete Group"><Trash2 className="h-5 w-5" /></button>
                                                    </td>
                                                </tr>
                                                {/* Expanded Items Drawer */}
                                                {expandedGroupId === group.id && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                                            <div className="pl-10">
                                                                {group.items && group.items.length > 0 ? (
                                                                    <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg overflow-hidden ring-1 ring-black ring-opacity-5">
                                                                        <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price Adj.</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Matrix (Sizes)</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {group.items.map(item => (
                                                                                <tr key={item.id} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-600">£{(item.price_adjustment || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-xs text-gray-500">
                                                                                        {item.price_matrix && Object.keys(item.price_matrix).length > 0 ? (
                                                                                            <div className="flex flex-wrap gap-1">
                                                                                                {Object.entries(item.price_matrix).map(([size, price]) => (
                                                                                                    <span key={size} className="bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                                        {size}: £{Number(price).toFixed(2)}
                                                                                                    </span>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-gray-400 italic">None</span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                                            {item.is_available ? 'Available' : 'Unavailable'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                                                        <button
                                                                                            onClick={() => openModifierItemModal(group.id, item)}
                                                                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                                                        >
                                                                                            <Edit className="h-4 w-4" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteModifierItem(item.id)}
                                                                                            className="text-red-600 hover:text-red-900"
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    <div className="text-sm text-gray-500 italic py-2">No items in this group. Click + to add some.</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                        {modifierGroups.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No modifier groups found. Let's create one.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {activeTab === 'categories'
                                            ? (editingCategory ? 'Edit Category' : 'Add Category')
                                            : activeTab === 'addons'
                                                ? (editingAddon ? 'Edit Add-on' : 'Add Add-on')
                                                : (editingItem ? 'Edit Item' : 'Add Item')}
                                    </h3>
                                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                        <XCircle className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {activeTab === 'categories' ? (
                                        <form onSubmit={handleCategorySubmit} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input type="text" name="name" value={categoryForm.name} onChange={handleCategoryInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                <textarea name="description" rows={3} value={categoryForm.description} onChange={handleCategoryInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Order Index</label>
                                                <input type="number" name="order_index" value={categoryForm.order_index} onChange={handleCategoryInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                                <input type="number" name="tax_rate" step="0.1" value={categoryForm.tax_rate} onChange={handleCategoryInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" placeholder="e.g. 10" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Station (Optional)</label>
                                                <select
                                                    name="station_id"
                                                    value={categoryForm.station_id || ''}
                                                    onChange={handleCategoryInputChange as any}
                                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                                >
                                                    <option value="">Default (Inherit)</option>
                                                    {stations.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-xs text-gray-500 mt-1">Items in this category will be sent to this station by default.</p>
                                            </div>

                                            {/* Category Modifier Groups Selection */}
                                            <div className="border-t border-gray-200 pt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Modifier Groups <span className="text-xs text-gray-400 font-normal">(Applied to ALL items in this category)</span></label>
                                                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                                                    {modifierGroups.map(group => {
                                                        const isChecked = selectedCatModifierOrders.has(group.id);
                                                        const orderVal = selectedCatModifierOrders.get(group.id) ?? 0;
                                                        return (
                                                            <div key={group.id} className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`cat-modgroup-${group.id}`}
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const newMap = new Map(selectedCatModifierOrders);
                                                                        if (e.target.checked) {
                                                                            newMap.set(group.id, newMap.size);
                                                                        } else {
                                                                            newMap.delete(group.id);
                                                                        }
                                                                        setSelectedCatModifierOrders(newMap);
                                                                    }}
                                                                    className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold flex-shrink-0"
                                                                />
                                                                <label htmlFor={`cat-modgroup-${group.id}`} className="text-sm text-gray-700 flex-1">
                                                                    <span className="font-medium">{group.name}</span>
                                                                    <span className="text-xs text-gray-400 ml-1">({group.is_required ? 'Required' : 'Optional'}, {group.is_multiple ? 'Multi' : 'Single'})</span>
                                                                </label>
                                                                {isChecked && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs text-gray-500">Order:</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={orderVal}
                                                                            onChange={(e) => {
                                                                                const newMap = new Map(selectedCatModifierOrders);
                                                                                newMap.set(group.id, parseInt(e.target.value) || 0);
                                                                                setSelectedCatModifierOrders(newMap);
                                                                            }}
                                                                            className="w-14 border border-gray-300 rounded px-2 py-0.5 text-xs text-center focus:ring-brand-gold focus:border-brand-gold"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {modifierGroups.length === 0 && <p className="text-sm text-gray-500">No modifier groups created.</p>}
                                                </div>
                                            </div>

                                            <div className="flex justify-end space-x-3 pt-4">
                                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Category</button>
                                            </div>
                                        </form>
                                    ) : activeTab === 'addons' ? (
                                        <form onSubmit={handleAddonSubmit} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                <input type="text" name="name" value={addonForm.name} onChange={handleAddonInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                <textarea name="description" rows={3} value={addonForm.description} onChange={handleAddonInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"></textarea>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                                                <input type="number" name="price" step="0.01" value={addonForm.price} onChange={handleAddonInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                            </div>
                                            <div className="flex items-center">
                                                <input type="checkbox" id="addon_is_available" name="is_available" checked={addonForm.is_available} onChange={handleAddonCheckboxChange} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                                                <label htmlFor="addon_is_available" className="ml-2 block text-sm text-gray-900">Available</label>
                                            </div>
                                            <div className="flex justify-end space-x-3 pt-4">
                                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Add-on</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleItemSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                    <input type="text" name="name" value={itemForm.name} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-sm font-medium text-gray-700">Category</label>
                                                        <button 
                                                            type="button"
                                                            onClick={fetchAllCategories}
                                                            disabled={isRefreshingCategories}
                                                            className="text-brand-gold hover:text-yellow-600 flex items-center text-xs font-medium disabled:opacity-50"
                                                            title="Refresh Categories"
                                                        >
                                                            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingCategories ? 'animate-spin' : ''}`} /> 
                                                            {isRefreshingCategories ? 'Refreshing...' : 'Refresh'}
                                                        </button>
                                                    </div>
                                                    <select name="category_id" value={itemForm.category_id} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold">
                                                        <option value="">Select Category</option>
                                                        {allCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                                                    <input type="number" name="price" step="0.01" value={itemForm.price} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Spicy Level (0-5)</label>
                                                    <input type="number" name="spicy_level" min="0" max="5" value={itemForm.spicy_level} onChange={handleItemInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Station Override</label>
                                                    <select
                                                        name="station_id"
                                                        value={itemForm.station_id || ''}
                                                        onChange={handleItemInputChange as any}
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                                    >
                                                        <option value="">Use Category Default</option>
                                                        {stations.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                <textarea name="description" rows={3} value={itemForm.description} onChange={handleItemInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"></textarea>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                                                <input type="text" placeholder="e.g. Popular, New, Gluten-Free" value={itemForm.tags?.join(', ')} onChange={handleTagsChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                            </div>

                                            <div className="flex space-x-6">
                                                <div className="flex items-center">
                                                    <input type="checkbox" id="is_available" name="is_available" checked={itemForm.is_available} onChange={handleCheckboxChange} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                                                    <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">Available</label>
                                                </div>
                                                <div className="flex items-center">
                                                    <input type="checkbox" id="vegetarian" name="vegetarian" checked={itemForm.vegetarian} onChange={handleCheckboxChange} className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold" />
                                                    <label htmlFor="vegetarian" className="ml-2 block text-sm text-gray-900">Vegetarian</label>
                                                </div>
                                            </div>

                                            {/* Modifier Groups Selection - shown early for easy access */}
                                            <div className="border-t border-gray-200 pt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Modifier Groups <span className="text-xs text-gray-400">(set order to control display position)</span></label>
                                                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                                                    {modifierGroups.map(group => {
                                                        const isChecked = selectedModifierOrders.has(group.id);
                                                        const orderVal = selectedModifierOrders.get(group.id) ?? 0;
                                                        return (
                                                            <div key={group.id} className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`modgroup-${group.id}`}
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const newMap = new Map(selectedModifierOrders);
                                                                        if (e.target.checked) {
                                                                            newMap.set(group.id, newMap.size);
                                                                        } else {
                                                                            newMap.delete(group.id);
                                                                        }
                                                                        setSelectedModifierOrders(newMap);
                                                                    }}
                                                                    className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold flex-shrink-0"
                                                                />
                                                                <label htmlFor={`modgroup-${group.id}`} className="text-sm text-gray-700 flex-1">
                                                                    <span className="font-medium">{group.name}</span>
                                                                    <span className="text-xs text-gray-400 ml-1">({group.is_required ? 'Required' : 'Optional'}, {group.is_multiple ? 'Multi' : 'Single'})</span>
                                                                </label>
                                                                {isChecked && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs text-gray-500">Order:</span>
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={orderVal}
                                                                            onChange={(e) => {
                                                                                const newMap = new Map(selectedModifierOrders);
                                                                                newMap.set(group.id, parseInt(e.target.value) || 0);
                                                                                setSelectedModifierOrders(newMap);
                                                                            }}
                                                                            className="w-14 border border-gray-300 rounded px-2 py-0.5 text-xs text-center focus:ring-brand-gold focus:border-brand-gold"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {modifierGroups.length === 0 && <p className="text-sm text-gray-500">No modifier groups created.</p>}
                                                </div>
                                            </div>

                                            {/* Default Toppings (pre-loaded on pizza) */}
                                            {(() => {
                                                // Find all multiple-type modifier groups linked to this item
                                                const linkedMultiGroupIds = Array.from(selectedModifierOrders.keys()).filter(gid => {
                                                    const g = modifierGroups.find((mg: any) => mg.id === gid);
                                                    return g && g.is_multiple;
                                                });
                                                const toppingOptions = modifierGroups
                                                    .filter((g: any) => linkedMultiGroupIds.includes(g.id))
                                                    .flatMap((g: any) => g.items || []);
                                                if (toppingOptions.length === 0) return null;
                                                return (
                                                    <div className="border-t border-gray-200 pt-6">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Default Toppings <span className="text-xs text-gray-400 font-normal">(included with this item — customers can exclude/swap in POS)</span>
                                                        </label>
                                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                                                            {toppingOptions.map((ti: any) => {
                                                                const isDefault = defaultToppingIds.has(ti.id);
                                                                return (
                                                                    <button
                                                                        key={ti.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newSet = new Set(defaultToppingIds);
                                                                            if (isDefault) newSet.delete(ti.id);
                                                                            else newSet.add(ti.id);
                                                                            setDefaultToppingIds(newSet);
                                                                        }}
                                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isDefault
                                                                                ? 'bg-green-100 border-green-400 text-green-800'
                                                                                : 'bg-white border-gray-300 text-gray-600 hover:border-brand-gold'
                                                                            }`}
                                                                    >
                                                                        {isDefault && '✓ '}{ti.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">Green chips = included by default. Click to toggle.</p>
                                                    </div>
                                                );
                                            })()}

                                            {/* Size Variants / Price Variants */}
                                            <div className="border-t border-gray-200 pt-6">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="block text-sm font-medium text-gray-700">Size Variants (Prices)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPriceVariants([...priceVariants, { name: '', price: 0 }])}
                                                        className="text-sm text-brand-gold hover:text-yellow-600 flex items-center"
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" /> Add Variant
                                                    </button>
                                                </div>
                                                {priceVariants.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {priceVariants.map((variant, index) => (
                                                            <div key={index} className="flex items-center space-x-3">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Variant Name (e.g. Small)"
                                                                        value={variant.name}
                                                                        onChange={(e) => {
                                                                            const newVariants = [...priceVariants];
                                                                            newVariants[index].name = e.target.value;
                                                                            setPriceVariants(newVariants);
                                                                        }}
                                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                                                    />
                                                                </div>
                                                                <div className="w-32">
                                                                    <div className="relative rounded-md shadow-sm">
                                                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                                            <span className="text-gray-500 sm:text-sm">£</span>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={variant.price}
                                                                            onChange={(e) => {
                                                                                const newVariants = [...priceVariants];
                                                                                newVariants[index].price = parseFloat(e.target.value) || 0;
                                                                                setPriceVariants(newVariants);
                                                                            }}
                                                                            className="block w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newVariants = [...priceVariants];
                                                                        newVariants.splice(index, 1);
                                                                        setPriceVariants(newVariants);
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <p className="text-xs text-gray-500">Note: If size variants are used, the base Item Price (£{itemForm.price}) will be ignored in POS.</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">No variants. Uses base price.</p>
                                                )}
                                            </div>

                                            {/* Add-ons Selection */}
                                            <div className="border-t border-gray-200 pt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Simple Add-ons</label>
                                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                                                    {addons.map(addon => (
                                                        <div key={addon.id} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={`addon-${addon.id}`}
                                                                checked={selectedAddonIds.has(addon.id)}
                                                                onChange={(e) => {
                                                                    const newSet = new Set(selectedAddonIds);
                                                                    if (e.target.checked) newSet.add(addon.id);
                                                                    else newSet.delete(addon.id);
                                                                    setSelectedAddonIds(newSet);
                                                                }}
                                                                className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                                                            />
                                                            <label htmlFor={`addon-${addon.id}`} className="ml-2 text-sm text-gray-700">
                                                                {addon.name} (+£{addon.price.toFixed(2)})
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {addons.length === 0 && <p className="text-sm text-gray-500 col-span-2">No add-ons created yet.</p>}
                                                </div>
                                            </div>

                                            {/* Image Upload & AI Check */}
                                            <div className="border-t border-gray-200 pt-6">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
                                                <div className="flex items-start space-x-4">
                                                    <div className="flex-1">
                                                        <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-gold file:text-white hover:file:bg-yellow-600" />
                                                        <p className="text-xs text-gray-500 mt-1">Upload a high-quality image of the dish.</p>
                                                    </div>

                                                    {imageFile && (
                                                        <button
                                                            type="button"
                                                            onClick={checkImageWithAI}
                                                            disabled={aiCheckStatus === 'checking' || aiCheckStatus === 'approved'}
                                                            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${aiCheckStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                                                aiCheckStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                    'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                                                }`}
                                                        >
                                                            {aiCheckStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                                                                aiCheckStatus === 'approved' ? <CheckCircle className="h-4 w-4 mr-2" /> :
                                                                    aiCheckStatus === 'rejected' ? <XCircle className="h-4 w-4 mr-2" /> :
                                                                        <ImageIcon className="h-4 w-4 mr-2" />}
                                                            {aiCheckStatus === 'checking' ? 'Checking...' :
                                                                aiCheckStatus === 'approved' ? 'AI Approved' :
                                                                    aiCheckStatus === 'rejected' ? 'AI Rejected' :
                                                                        'Check with AI'}
                                                        </button>
                                                    )}
                                                </div>

                                                {aiFeedback && (
                                                    <div className={`mt-3 p-3 rounded-md text-sm ${aiCheckStatus === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {aiFeedback}
                                                    </div>
                                                )}

                                                {/* Image Preview */}
                                                {imagePreview && (
                                                    <div className="mt-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Item</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modifier Group Modal */}
            {isModifierGroupModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingModifierGroup ? 'Edit Modifier Group' : 'Add Modifier Group'}
                            </h3>
                            <button onClick={() => setIsModifierGroupModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleModifierGroupSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                    <input
                                        type="text"
                                        value={modifierGroupForm.name || ''}
                                        onChange={e => setModifierGroupForm({ ...modifierGroupForm, name: e.target.value })}
                                        required
                                        placeholder="e.g. Pizza Toppings, Crust Size"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="mg_required"
                                            checked={modifierGroupForm.is_required || false}
                                            onChange={e => setModifierGroupForm({ ...modifierGroupForm, is_required: e.target.checked })}
                                            className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                                        />
                                        <label htmlFor="mg_required" className="ml-2 block text-sm text-gray-900">Required Selection</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="mg_multiple"
                                            checked={modifierGroupForm.is_multiple || false}
                                            onChange={e => setModifierGroupForm({ ...modifierGroupForm, is_multiple: e.target.checked })}
                                            className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                                        />
                                        <label htmlFor="mg_multiple" className="ml-2 block text-sm text-gray-900">Allow Multiple</label>
                                    </div>
                                </div>
                                {modifierGroupForm.is_multiple && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Selection</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={modifierGroupForm.min_selection !== undefined ? modifierGroupForm.min_selection : 0}
                                                onChange={e => setModifierGroupForm({ ...modifierGroupForm, min_selection: parseInt(e.target.value) || 0 })}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Selection (optional)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={modifierGroupForm.max_selection || ''}
                                                onChange={e => setModifierGroupForm({ ...modifierGroupForm, max_selection: e.target.value ? parseInt(e.target.value) : null })}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => setIsModifierGroupModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Group</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modifier Item Modal */}
            {isModifierItemModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingModifierItem ? 'Edit Modifier Item' : 'Add Modifier Item'}
                            </h3>
                            <button onClick={() => setIsModifierItemModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleModifierItemSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        value={modifierItemForm.name || ''}
                                        onChange={e => setModifierItemForm({ ...modifierItemForm, name: e.target.value })}
                                        required
                                        placeholder="e.g. Pepperoni, Extra Cheese"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price Adjustment (£)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={modifierItemForm.price_adjustment !== undefined ? modifierItemForm.price_adjustment : 0}
                                        onChange={e => setModifierItemForm({ ...modifierItemForm, price_adjustment: parseFloat(e.target.value) || 0 })}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Default price added. Ex: 1.50</p>
                                </div>

                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Per-Size Price Matrix (Optional)</label>
                                    <p className="text-xs text-gray-500 mb-3">If this modifier costs different amounts for different item sizes (e.g. Small vs Large pizza), add sizes below.</p>

                                    <div className="space-y-3">
                                        {Object.entries(modifierItemForm.price_matrix || {}).map(([sizeName, price]) => (
                                            <div key={sizeName} className="flex items-center space-x-3">
                                                <div className="flex-1 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 text-sm">
                                                    {sizeName}
                                                </div>
                                                <div className="w-32">
                                                    <div className="relative rounded-md shadow-sm">
                                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                            <span className="text-gray-500 sm:text-sm">£</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={price}
                                                            onChange={(e) => {
                                                                setModifierItemForm({
                                                                    ...modifierItemForm,
                                                                    price_matrix: {
                                                                        ...(modifierItemForm.price_matrix || {}),
                                                                        [sizeName]: parseFloat(e.target.value) || 0
                                                                    }
                                                                });
                                                            }}
                                                            className="block w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newMatrix = { ...modifierItemForm.price_matrix };
                                                        delete newMatrix[sizeName];
                                                        setModifierItemForm({ ...modifierItemForm, price_matrix: newMatrix });
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add new size to matrix */}
                                        <div className="flex items-center space-x-2 mt-2">
                                            <input
                                                type="text"
                                                id="new_matrix_size"
                                                placeholder="New Size (e.g. Medium)"
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-brand-gold focus:border-brand-gold"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = e.currentTarget.value.trim();
                                                        if (val && !modifierItemForm.price_matrix?.[val]) {
                                                            setModifierItemForm({
                                                                ...modifierItemForm,
                                                                price_matrix: {
                                                                    ...(modifierItemForm.price_matrix || {}),
                                                                    [val]: 0
                                                                }
                                                            });
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('new_matrix_size') as HTMLInputElement;
                                                    const val = input.value.trim();
                                                    if (val && !modifierItemForm.price_matrix?.[val]) {
                                                        setModifierItemForm({
                                                            ...modifierItemForm,
                                                            price_matrix: {
                                                                ...(modifierItemForm.price_matrix || {}),
                                                                [val]: 0
                                                            }
                                                        });
                                                        input.value = '';
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-sm font-medium rounded hover:bg-gray-200"
                                            >
                                                Add Size
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center pt-2 border-t border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="mi_available"
                                        checked={modifierItemForm.is_available !== false}
                                        onChange={e => setModifierItemForm({ ...modifierItemForm, is_available: e.target.checked })}
                                        className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                                    />
                                    <label htmlFor="mi_available" className="ml-2 block text-sm text-gray-900">Available</label>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                    <button type="button" onClick={() => setIsModifierItemModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Item</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuManagementPage;
