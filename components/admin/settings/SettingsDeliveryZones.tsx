import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Trash, Pencil, X } from 'lucide-react';
import { useAdmin } from '../../../context/AdminContext';

interface DeliveryZone {
    id: string;
    zone_name: string;
    postcode_prefix: string;
    min_order_amount: number;
    max_order_amount: number;
    delivery_fee: number;
}

const SettingsDeliveryZones: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New Zone State
    const [newZone, setNewZone] = useState({
        zone_name: '',
        postcode_prefix: '',
        min_order_amount: '',
        max_order_amount: '',
        delivery_fee: ''
    });

    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchZones();
        }
    }, [selectedRestaurantId]);

    const fetchZones = async () => {
        setLoading(true);
        if (!selectedRestaurantId) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('delivery_zones')
            .select('*')
            .eq('restaurant_id', selectedRestaurantId)
            .order('postcode_prefix', { ascending: true });

        if (error) {
            console.error('Error fetching zones:', error);
            setError('Failed to fetch delivery zones');
        } else {
            setZones(data || []);
        }
        setLoading(false);
    };

    const handleAddZone = async () => {
        if (!newZone.postcode_prefix || !newZone.zone_name) {
            alert('Please enter a Zone Name and Postcode');
            return;
        }

        if (!selectedRestaurantId) return;

        const { data, error } = await supabase
            .from('delivery_zones')
            .insert([{
                restaurant_id: selectedRestaurantId,
                zone_name: newZone.zone_name,
                postcode_prefix: newZone.postcode_prefix.replace(/\s+/g, '').toUpperCase(),
                min_order_amount: parseFloat(newZone.min_order_amount) || 0,
                max_order_amount: parseFloat(newZone.max_order_amount) || 0,
                delivery_fee: parseFloat(newZone.delivery_fee) || 0
            }])
            .select();

        if (error) {
            console.error('Error adding zone:', error);
            alert('Failed to add zone');
        } else if (data) {
            setZones([...zones, data[0]]);
            resetForm();
        }
    };

    const handleUpdateZone = async () => {
        if (!editingId) return;
        if (!newZone.postcode_prefix || !newZone.zone_name) {
            alert('Please enter a Zone Name and Postcode');
            return;
        }

        const { data, error } = await supabase
            .from('delivery_zones')
            .update({
                zone_name: newZone.zone_name,
                postcode_prefix: newZone.postcode_prefix.replace(/\s+/g, '').toUpperCase(),
                min_order_amount: parseFloat(newZone.min_order_amount) || 0,
                max_order_amount: parseFloat(newZone.max_order_amount) || 0,
                delivery_fee: parseFloat(newZone.delivery_fee) || 0
            })
            .eq('id', editingId)
            .select();

        if (error) {
            console.error('Error updating zone:', error);
            alert('Failed to update zone');
        } else if (data) {
            setZones(zones.map(z => z.id === editingId ? data[0] : z));
            resetForm();
        }
    };

    const handleDeleteZone = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this zone?')) return;
        const { error } = await supabase
            .from('delivery_zones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting zone:', error);
            alert('Failed to delete zone');
        } else {
            setZones(zones.filter(z => z.id !== id));
            if (editingId === id) resetForm();
        }
    };

    const handleEdit = (zone: DeliveryZone) => {
        setNewZone({
            zone_name: zone.zone_name,
            postcode_prefix: zone.postcode_prefix,
            min_order_amount: zone.min_order_amount.toString(),
            max_order_amount: zone.max_order_amount.toString(),
            delivery_fee: zone.delivery_fee.toString()
        });
        setEditingId(zone.id);
    };

    const resetForm = () => {
        setNewZone({
            zone_name: '',
            postcode_prefix: '',
            min_order_amount: '',
            max_order_amount: '',
            delivery_fee: ''
        });
        setEditingId(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-xl font-serif font-bold text-gray-800 mb-6">Postcode Delivery Zones</h3>
            <p className="text-sm text-gray-500 mb-6">
                Define specific rules for postcode areas. Matches are based on fixed postcode (e.g., "BA215LW").
                These rules take precedence over general radius settings.
            </p>

            {/* Add/Edit Zone Form */}
            <div className={`grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 p-4 rounded-lg transition-colors ${editingId ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Postcode (e.g. BA215LW)</label>
                    <input
                        type="text"
                        value={newZone.postcode_prefix}
                        onChange={e => setNewZone({ ...newZone, postcode_prefix: e.target.value.toUpperCase() })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-gold"
                        placeholder="BA21"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min Order (£)</label>
                    <input
                        type="number"
                        value={newZone.min_order_amount}
                        onChange={e => setNewZone({ ...newZone, min_order_amount: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-gold"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max Order (£)</label>
                    <input
                        type="number"
                        value={newZone.max_order_amount}
                        onChange={e => setNewZone({ ...newZone, max_order_amount: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-gold"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Fee (£)</label>
                    <input
                        type="number"
                        value={newZone.delivery_fee}
                        onChange={e => setNewZone({ ...newZone, delivery_fee: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-gold"
                        placeholder="0.00"
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Zone Name</label>
                    <input
                        type="text"
                        value={newZone.zone_name}
                        onChange={e => setNewZone({ ...newZone, zone_name: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-gold"
                        placeholder="e.g. Zone A"
                    />
                </div>
                <div className="md:col-span-1 flex items-end space-x-2">
                    {editingId ? (
                        <>
                            <button
                                onClick={handleUpdateZone}
                                className="flex-1 py-2 bg-brand-gold text-white rounded hover:bg-opacity-90 transition-colors font-semibold text-sm"
                            >
                                Update
                            </button>
                            <button
                                onClick={resetForm}
                                className="p-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                                title="Cancel Edit"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleAddZone}
                            className="w-full py-2 bg-brand-dark-gray text-white rounded hover:bg-black transition-colors font-semibold text-sm"
                        >
                            Add Zone
                        </button>
                    )}
                </div>
            </div>

            {/* Zones List */}
            {loading ? (
                <div className="text-center py-4">Loading zones...</div>
            ) : zones.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg">
                    No delivery zones configured yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                                <th className="py-3 px-2">Postcode</th>
                                <th className="py-3 px-2">Name</th>
                                <th className="py-3 px-2">Min Order</th>
                                <th className="py-3 px-2">Max Order</th>
                                <th className="py-3 px-2">Fee</th>
                                <th className="py-3 px-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {zones.map(zone => (
                                <tr key={zone.id} className={`hover:bg-gray-50 ${editingId === zone.id ? 'bg-amber-50' : ''}`}>
                                    <td className="py-3 px-2 font-mono font-bold text-brand-dark-gray">{zone.postcode_prefix}</td>
                                    <td className="py-3 px-2">{zone.zone_name}</td>
                                    <td className="py-3 px-2">£{zone.min_order_amount.toFixed(2)}</td>
                                    <td className="py-3 px-2">
                                        {zone.max_order_amount > 0 ? `£${zone.max_order_amount.toFixed(2)}` : <span className="text-gray-400">No Limit</span>}
                                    </td>
                                    <td className="py-3 px-2">£{zone.delivery_fee.toFixed(2)}</td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(zone)}
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteZone(zone.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Delete"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SettingsDeliveryZones;
