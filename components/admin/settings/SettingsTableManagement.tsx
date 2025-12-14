import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Trash2, Plus } from 'lucide-react';

interface TableInfo {
    id: string;
    table_name: string;
    count: number;
}

const SettingsTableManagement: React.FC = () => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTable, setNewTable] = useState({ table_name: '', count: 4 });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('table_info')
                .select('*')
                .eq('restaurant_id', import.meta.env.VITE_RESTAURANT_ID)
                .order('table_name');

            if (error) throw error;
            setTables(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTable = async () => {
        if (!newTable.table_name) return;

        setIsAdding(true);
        try {
            const { error } = await supabase
                .from('table_info')
                .insert([{
                    restaurant_id: import.meta.env.VITE_RESTAURANT_ID,
                    table_name: newTable.table_name,
                    count: newTable.count
                }]);

            if (error) throw error;

            setNewTable({ table_name: '', count: 4 });
            fetchTables();
        } catch (error) {
            console.error('Error adding table:', error);
            alert('Failed to add table');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteTable = async (id: string) => {
        if (!confirm('Are you sure you want to delete this table?')) return;

        try {
            const { error } = await supabase
                .from('table_info')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTables();
        } catch (error) {
            console.error('Error deleting table:', error);
            alert('Failed to delete table');
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Table Management</h3>
            <p className="text-sm text-gray-500 mb-6">
                Manage your restaurant tables and their capacities. This affects the maximum guest size allowed for bookings.
            </p>

            <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50 p-4 rounded-md">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Table Name</label>
                        <input
                            type="text"
                            value={newTable.table_name}
                            onChange={(e) => setNewTable({ ...newTable, table_name: e.target.value })}
                            placeholder="e.g. Table 5 or Family Booth"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Capacity (Seats)</label>
                        <input
                            type="number"
                            min="1"
                            value={newTable.count}
                            onChange={(e) => setNewTable({ ...newTable, count: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <button
                        onClick={handleAddTable}
                        disabled={isAdding || !newTable.table_name}
                        className="flex items-center justify-center bg-brand-gold text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium h-10"
                    >
                        <Plus size={16} className="mr-1" /> Add Table
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Table Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Capacity
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading && tables.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Loading tables...</td>
                            </tr>
                        ) : tables.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No tables found. Add one above.</td>
                            </tr>
                        ) : (
                            tables.map((table) => (
                                <tr key={table.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {table.table_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {table.count} guests
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDeleteTable(table.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete Table"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SettingsTableManagement;
