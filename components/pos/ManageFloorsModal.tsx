import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAlert } from '../../context/AlertContext';

interface Floor {
    id: string;
    name: string;
    order_index: number;
}

interface ManageFloorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    floors: Floor[];
    settingsId: string;
    onUpdate: () => void;
}

const ManageFloorsModal: React.FC<ManageFloorsModalProps> = ({ isOpen, onClose, floors, settingsId, onUpdate }) => {
    const { showAlert } = useAlert();
    const [newFloorName, setNewFloorName] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    if (!isOpen) return null;

    const handleAddFloor = async () => {
        if (!newFloorName.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('restaurant_floors')
                .insert({
                    restaurant_id: settingsId,
                    name: newFloorName.trim(),
                    order_index: floors.length
                });

            if (error) throw error;
            setNewFloorName('');
            onUpdate();
        } catch (error) {
            console.error('Error adding floor:', error);
            showAlert('Error', 'Failed to add floor', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFloor = async (id: string, name: string) => {
        showAlert(
            'Confirm Delete',
            `Are you sure you want to delete "${name}"? Tables on this floor will be unassigned.`,
            'warning',
            {
                showCancel: true,
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        const { error } = await supabase
                            .from('restaurant_floors')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;
                        onUpdate();
                    } catch (error) {
                        console.error('Error deleting floor:', error);
                        showAlert('Error', 'Failed to delete floor', 'error');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        );
    };

    const startEdit = (floor: Floor) => {
        setEditingId(floor.id);
        setEditName(floor.name);
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('restaurant_floors')
                .update({ name: editName.trim() })
                .eq('id', editingId);

            if (error) throw error;
            setEditingId(null);
            onUpdate();
        } catch (error) {
            console.error('Error updating floor:', error);
            showAlert('Error', 'Failed to update floor', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scaleIn">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Floors</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
                    {floors.map(floor => (
                        <div key={floor.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group">
                            {editingId === floor.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500"
                                        autoFocus
                                    />
                                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium text-gray-900 dark:text-white">{floor.name}</span>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(floor)} className="text-blue-500 hover:text-blue-600 p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteFloor(floor.id, floor.name)} className="text-red-500 hover:text-red-600 p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="New Floor Name"
                        value={newFloorName}
                        onChange={(e) => setNewFloorName(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-color)] outline-none"
                    />
                    <button
                        onClick={handleAddFloor}
                        disabled={loading || !newFloorName.trim()}
                        className="px-4 py-2 bg-[var(--theme-color)] text-white font-bold rounded-lg disabled:opacity-50 hover:brightness-110"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageFloorsModal;
