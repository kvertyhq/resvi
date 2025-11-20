import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Plus, Edit, Trash2, XCircle } from 'lucide-react';

interface MenuCategory {
    id: string;
    name: string;
    description: string;
    order_index: number;
    created_at?: string;
    updated_at?: string;
}

const CategoryManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

    const [categoryForm, setCategoryForm] = useState<Partial<MenuCategory>>({
        name: '',
        description: '',
        order_index: 0
    });

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchCategories();
        }
    }, [selectedRestaurantId]);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('menu_categories')
            .select('*')
            .order('order_index', { ascending: true });
        if (data) setCategories(data);
        if (error) console.error('Error fetching categories:', error);
        setLoading(false);
    };

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
            setCategoryForm({ name: '', description: '', order_index: categories.length });
        }
        setIsModalOpen(true);
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...categoryForm };

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

    if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Category Management</h2>
                <button
                    onClick={() => openCategoryModal()}
                    className="bg-brand-gold text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-600 transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Category
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
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
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingCategory ? 'Edit Category' : 'Add Category'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
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
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Category</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryManagementPage;
