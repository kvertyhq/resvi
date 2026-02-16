import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Plus, Edit, Trash2, Image as ImageIcon, CheckCircle, XCircle, Loader2, Layers, Utensils } from 'lucide-react';
import { Station, StationService } from '../../services/StationService'; // Added import

// Interfaces based on user schema
interface MenuCategory {
    id: string;
    name: string;
    description: string;
    order_index: number;
    station_id?: string; // Added station_id
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

const MenuManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'addons'>('items');
    const [loading, setLoading] = useState(false);

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
    const [items, setItems] = useState<MenuItem[]>([]);
    const [addons, setAddons] = useState<Addon[]>([]);
    const [stations, setStations] = useState<Station[]>([]); // Added stations state

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
        station_id: '' // Added station_id
    });

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
    }, [itemsPage]);

    useEffect(() => {
        if (selectedRestaurantId) fetchCategories();
    }, [categoriesPage]);

    useEffect(() => {
        if (selectedRestaurantId) fetchAddons();
    }, [addonsPage]);

    const fetchData = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);
        await Promise.all([fetchCategories(), fetchItems(), fetchAddons(), fetchStations()]); // Added fetchStations
        setLoading(false);
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

    const fetchCategories = async () => {
        if (!selectedRestaurantId) return;
        const from = (categoriesPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
            .from('menu_categories')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('order_index', { ascending: true })
            .range(from, to);

        if (data) setCategories(data);
        if (count !== null) setCategoriesTotalCount(count);
        if (error) console.error('Error fetching categories:', error);
    };

    const fetchItems = async () => {
        if (!selectedRestaurantId) return;
        const from = (itemsPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error, count } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact' })
            .eq('restaurant_id', selectedRestaurantId)
            .order('name', { ascending: true })
            .range(from, to);

        if (data) setItems(data);
        if (count !== null) setItemsTotalCount(count);
        if (error) console.error('Error fetching items:', error);
    };

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
            [name]: type === 'number' ? parseInt(value) : value
        }));
    };

    const openCategoryModal = (category?: MenuCategory) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm(category);
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', description: '', order_index: categories.length, station_id: '' }); // Added station_id
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

        if (editingCategory) {
            await supabase.from('menu_categories').update(payload).eq('id', editingCategory.id);
        } else {
            await supabase.from('menu_categories').insert([payload]);
        }
        setIsModalOpen(false);
        fetchCategories();
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm('Are you sure? This might affect items linked to this category.')) {
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

        if (item) {
            setEditingItem(item);
            setItemForm(item);
            setImagePreview(item.image_url || '');

            // Fetch linked addons
            const { data } = await supabase
                .from('menu_item_addons')
                .select('addon_id')
                .eq('menu_item_id', item.id);

            if (data) {
                setSelectedAddonIds(new Set(data.map(a => a.addon_id)));
            }
        } else {
            setEditingItem(null);
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
            alert("Cannot save: Image was rejected by AI.");
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
            station_id: itemForm.station_id === '' ? null : itemForm.station_id // Handle empty string
        };

        let itemId = editingItem?.id;

        if (editingItem) {
            await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        } else {
            const { data, error } = await supabase.from('menu_items').insert([payload]).select().single();
            if (data) itemId = data.id;
        }

        // Update Addons
        if (itemId) {
            // Delete existing
            await supabase.from('menu_item_addons').delete().eq('menu_item_id', itemId);

            // Insert new
            if (selectedAddonIds.size > 0) {
                const addonsToInsert = Array.from(selectedAddonIds).map(addonId => ({
                    menu_item_id: itemId,
                    addon_id: addonId
                }));
                await supabase.from('menu_item_addons').insert(addonsToInsert);
            }
        }

        setIsModalOpen(false);
        fetchItems();
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm('Delete this item?')) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchItems();
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
        if (confirm('Delete this add-on?')) {
            await supabase.from('addons').delete().eq('id', id);
            fetchAddons();
        }
    };

    if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Menu Management</h2>
                <button
                    onClick={() => activeTab === 'categories' ? openCategoryModal() : openItemModal()}
                    className="bg-brand-gold text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-600 transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add {activeTab === 'categories' ? 'Category' : activeTab === 'addons' ? 'Add-on' : 'Item'}
                </button>
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
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {categories.map((cat) => (
                                            <tr key={cat.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.order_index}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openCategoryModal(cat)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {categories.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No categories found.</td></tr>}
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
                                            const catName = categories.find(c => c.id === item.category_id)?.name || 'Unknown';
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
                                                        <button onClick={() => openItemModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Station</label>
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                                    <select name="category_id" value={itemForm.category_id} onChange={handleItemInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold">
                                                        <option value="">Select Category</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

                                            {/* Add-ons Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Available Add-ons</label>
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
        </div>
    );
};

export default MenuManagementPage;
