import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { StationService, Station } from '../../services/StationService';
import { Plus, Edit, Trash2, Save, X, Settings } from 'lucide-react';

const StationManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [formData, setFormData] = useState<Partial<Station>>({
        name: '',
        type: 'kitchen',
        is_default: false
    });

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchStations();
        }
    }, [selectedRestaurantId]);

    const fetchStations = async () => {
        if (!selectedRestaurantId) return;
        try {
            setLoading(true);
            const data = await StationService.getStations(selectedRestaurantId);
            setStations(data);
        } catch (error) {
            console.error('Failed to load stations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (station?: Station) => {
        if (station) {
            setEditingStation(station);
            setFormData({
                name: station.name,
                type: station.type,
                is_default: station.is_default
            });
        } else {
            setEditingStation(null);
            setFormData({
                name: '',
                type: 'kitchen',
                is_default: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId) return;

        try {
            const payload = {
                ...formData,
                restaurant_id: selectedRestaurantId
            };

            if (editingStation) {
                await StationService.updateStation(editingStation.id, payload);
            } else {
                await StationService.createStation(payload);
            }

            setIsModalOpen(false);
            fetchStations();
        } catch (error) {
            alert('Failed to save station');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure? This will remove the station. Items assigned to this station may fall back to default routing.')) {
            try {
                await StationService.deleteStation(id);
                fetchStations();
            } catch (error) {
                alert('Failed to delete station');
            }
        }
    };

    if (!selectedRestaurantId) return <div className="text-center py-10 text-gray-500">Select a restaurant context</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-800">Station Management</h2>
                    <p className="text-gray-500 mt-1">Configure kitchen and bar preparation areas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-brand-gold text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-600 transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Station
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stations.map((station) => (
                                <tr key={station.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{station.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{station.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {station.is_default && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Default</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleOpenModal(station)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(station.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))}
                            {stations.length === 0 && <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No stations found. Create one to get started.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingStation ? 'Edit Station' : 'Add Station'}
                                </h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Station Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                        placeholder="e.g. Main Kitchen"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    >
                                        <option value="kitchen">Kitchen</option>
                                        <option value="bar">Bar</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={formData.is_default}
                                        onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                        className="h-4 w-4 text-brand-gold border-gray-300 rounded focus:ring-brand-gold"
                                    />
                                    <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                                        Set as Default Station
                                    </label>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-gold hover:bg-yellow-600"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StationManagementPage;
