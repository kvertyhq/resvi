import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAlert } from '../../context/AlertContext';

interface POSTableEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: any;
    onUpdate: () => void;
}

const POSTableEditModal: React.FC<POSTableEditModalProps> = ({ isOpen, onClose, table, onUpdate }) => {
    const { showAlert } = useAlert();
    const [tableName, setTableName] = useState('');
    const [seatCount, setSeatCount] = useState(4);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (table) {
            setTableName(table.table_name || '');
            setSeatCount(table.count || 4);
        }
    }, [table]);

    if (!isOpen || !table) return null;

    const handleSave = async () => {
        if (!tableName.trim()) {
            showAlert('Required', 'Table name is required', 'warning');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('table_info')
                .update({
                    table_name: tableName.trim(),
                    count: seatCount
                })
                .eq('id', table.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating table:', error);
            showAlert('Error', 'Failed to update table details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        showAlert(
            'Confirm Delete',
            `Are you sure you want to delete ${tableName}? This action cannot be undone.`,
            'warning',
            {
                showCancel: true,
                onConfirm: async () => {
                    setLoading(true);
                    try {
                        const { error } = await supabase
                            .from('table_info')
                            .delete()
                            .eq('id', table.id);

                        if (error) throw error;
                        onUpdate();
                        onClose();
                    } catch (error) {
                        console.error('Error deleting table:', error);
                        showAlert('Error', 'Failed to delete table. Check if there are active orders linked to it.', 'error');
                    } finally {
                        setLoading(false);
                    }
                }
            }
        );
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scaleIn">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Table</h3>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Table Name</label>
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-color)] outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Seats</label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={seatCount}
                            onChange={(e) => setSeatCount(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-color)] outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-2 flex-col">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-3 bg-[var(--theme-color)] text-white rounded-xl font-bold hover:brightness-110 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="w-full py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                        Delete Table
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POSTableEditModal;
