import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';
import { Plus, Edit, Trash2, Image as ImageIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface MenuItem {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url?: string;
    is_available: boolean;
}

const MenuManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        name: '',
        description: '',
        price: 0,
        category: '',
        is_available: true
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [aiCheckStatus, setAiCheckStatus] = useState<'idle' | 'checking' | 'approved' | 'rejected'>('idle');
    const [aiFeedback, setAiFeedback] = useState<string>('');

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchMenuItems();
        }
    }, [selectedRestaurantId]);

    const fetchMenuItems = async () => {
        setLoading(true);
        // In real app, filter by restaurant_id
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('category', { ascending: true });

        if (data) setItems(data);
        setLoading(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setAiCheckStatus('idle');
            setAiFeedback('');
        }
    };

    const checkImageWithAI = async () => {
        if (!imageFile) return;

        setAiCheckStatus('checking');

        // Simulate AI Check delay
        setTimeout(() => {
            const isAppropriate = Math.random() > 0.2; // 80% chance of approval
            setAiCheckStatus(isAppropriate ? 'approved' : 'rejected');
            setAiFeedback(isAppropriate
                ? "AI Analysis: Image looks great! High quality food photography detected."
                : "AI Analysis: Image rejected. Low quality or non-food content detected.");
        }, 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (aiCheckStatus === 'rejected') {
            alert("Cannot save: Image was rejected by AI.");
            return;
        }

        let imageUrl = formData.image_url;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { data, error } = await supabase.storage
                .from('menu-items')
                .upload(fileName, imageFile);

            if (data) {
                const { data: { publicUrl } } = supabase.storage
                    .from('menu-items')
                    .getPublicUrl(fileName);
                imageUrl = publicUrl;
            }
        }

        const itemData = { ...formData, image_url: imageUrl };

        if (editingItem) {
            await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
        } else {
            await supabase.from('menu_items').insert([itemData]);
        }

        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ name: '', description: '', price: 0, category: '', is_available: true });
        setImageFile(null);
        setAiCheckStatus('idle');
        fetchMenuItems();
    };

    const openEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchMenuItems();
        }
    };

    if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-gray-800">Menu Management</h2>
                <button
                    onClick={() => { setEditingItem(null); setFormData({ name: '', description: '', price: 0, category: '', is_available: true }); setIsModalOpen(true); }}
                    className="bg-brand-gold text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-600 transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" /> Add Item
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading menu items...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
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
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">£{item.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.is_available ? 'Available' : 'Unavailable'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openEditModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input type="text" name="category" value={formData.category} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (£)</label>
                                    <input type="number" name="price" step="0.01" value={formData.price} onChange={handleInputChange} required className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select name="is_available" value={String(formData.is_available)} onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'true' })} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold">
                                        <option value="true">Available</option>
                                        <option value="false">Unavailable</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea name="description" rows={3} value={formData.description} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-brand-gold focus:border-brand-gold"></textarea>
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
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-brand-dark-gray text-white rounded-md hover:bg-gray-800">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuManagementPage;
