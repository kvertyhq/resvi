import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Trash2, Plus, Layout } from 'lucide-react';
import { useAdmin } from '../../../context/AdminContext';
import { useAlert } from '../../../context/AlertContext';

interface TableInfo {
    id: string;
    table_name: string;
    count: number;
    floor_id?: string;
}

interface Floor {
    id: string;
    name: string;
    order_index: number;
}

const SettingsTableManagement: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const { showAlert } = useAlert();
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Inputs
    const [newTable, setNewTable] = useState({ table_name: '', count: 4 });
    const [newFloorName, setNewFloorName] = useState('');

    const [isAddingTable, setIsAddingTable] = useState(false);
    const [isAddingFloor, setIsAddingFloor] = useState(false);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchData();
        }
    }, [selectedRestaurantId]);

    const fetchData = async () => {
        if (!selectedRestaurantId) return;
        setLoading(true);
        try {
            // Fetch Floors
            const { data: floorData, error: floorError } = await supabase
                .from('restaurant_floors')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .order('order_index', { ascending: true });

            if (floorError) throw floorError;
            const loadedFloors = floorData || [];
            setFloors(loadedFloors);

            // Fetch Tables
            const { data: tableData, error: tableError } = await supabase
                .from('table_info')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .order('table_name');

            if (tableError) throw tableError;
            setTables(tableData || []);

            // Set default floor if needed
            if (!selectedFloorId && loadedFloors.length > 0) {
                setSelectedFloorId(loadedFloors[0].id);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFloor = async () => {
        if (!newFloorName.trim() || !selectedRestaurantId) return;
        setIsAddingFloor(true);
        try {
            const { error } = await supabase
                .from('restaurant_floors')
                .insert({
                    restaurant_id: selectedRestaurantId,
                    name: newFloorName.trim(),
                    order_index: floors.length
                });

            if (error) throw error;
            setNewFloorName('');
            await fetchData();
        } catch (error) {
            console.error('Error adding floor:', error);
            showAlert('Error', 'Failed to add floor', 'error');
        } finally {
            setIsAddingFloor(false);
        }
    };

    const handleDeleteFloor = async (floorId: string) => {
        // Check if floor has tables
        const hasTables = tables.some(t => t.floor_id === floorId);
        const message = hasTables 
            ? 'This floor contains tables. Deleting it will delete all tables on it. Continue?'
            : 'Delete this floor?';

        showAlert(
            'Confirm Delete',
            message,
            'warning',
            {
                showCancel: true,
                onConfirm: async () => {
                    try {
                        if (hasTables) {
                            const { error: tableDelError } = await supabase
                                .from('table_info')
                                .delete()
                                .eq('floor_id', floorId);
                            if (tableDelError) throw tableDelError;
                        }

                        const { error } = await supabase
                            .from('restaurant_floors')
                            .delete()
                            .eq('id', floorId);

                        if (error) throw error;

                        if (selectedFloorId === floorId) {
                            setSelectedFloorId(null);
                        }
                        await fetchData();
                    } catch (error) {
                        console.error('Error deleting floor:', error);
                        showAlert('Error', 'Failed to delete floor', 'error');
                    }
                }
            }
        );
    };

    const handleAddTable = async () => {
        if (!newTable.table_name || !selectedRestaurantId) return;
        if (floors.length > 0 && !selectedFloorId) {
            showAlert('Required', 'Please select a floor first.', 'warning');
            return;
        }

        setIsAddingTable(true);
        try {
            const floor = floors.find(f => f.id === selectedFloorId);

            const { error } = await supabase
                .from('table_info')
                .insert([{
                    restaurant_id: selectedRestaurantId,
                    table_name: newTable.table_name,
                    count: newTable.count,
                    floor_id: selectedFloorId,
                    zone: floor ? floor.name : 'Main Hall', // Legacy support
                    x: 50, // Default position
                    y: 50
                }]);

            if (error) throw error;

            setNewTable({ table_name: '', count: 4 });
            fetchData();
        } catch (error) {
            console.error('Error adding table:', error);
            showAlert('Error', 'Failed to add table', 'error');
        } finally {
            setIsAddingTable(false);
        }
    };

    const handleDeleteTable = async (id: string) => {
        showAlert(
            'Confirm Delete',
            'Are you sure you want to delete this table?',
            'warning',
            {
                showCancel: true,
                onConfirm: async () => {
                    try {
                        const { error } = await supabase
                            .from('table_info')
                            .delete()
                            .eq('id', id);

                        if (error) throw error;
                        fetchData();
                    } catch (error) {
                        console.error('Error deleting table:', error);
                        showAlert('Error', 'Failed to delete table', 'error');
                    }
                }
            }
        );
    };

    // Derived state
    const currentFloorName = floors.find(f => f.id === selectedFloorId)?.name;
    const displayedTables = selectedFloorId
        ? tables.filter(t => t.floor_id === selectedFloorId)
        : tables.filter(t => !t.floor_id); // Show unassigned if no floor selected, OR logic?
    // Better logic: If we have floors, we MUST select one. 
    // If we have floors but selection is somehow null, show nothing or prompt to select.
    // If NO floors exist (legacy), show all tables.

    const finalDisplayedTables = floors.length === 0
        ? tables
        : (selectedFloorId ? tables.filter(t => t.floor_id === selectedFloorId) : []);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Floor & Table Management</h3>
            <p className="text-sm text-gray-500 mb-6">
                Organize your restaurant layout by Floors and Tables.
            </p>

            {/* Floor Management */}
            <div className="mb-8 border-b border-gray-100 pb-8">
                <div className="flex items-end gap-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Add New Floor</label>
                        <input
                            type="text"
                            value={newFloorName}
                            onChange={(e) => setNewFloorName(e.target.value)}
                            placeholder="e.g. Ground Floor, Patio"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <button
                        onClick={handleAddFloor}
                        disabled={isAddingFloor || !newFloorName}
                        className="flex items-center justify-center bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm font-medium h-10"
                    >
                        <Plus size={16} className="mr-1" /> Add Floor
                    </button>
                </div>

                {floors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {floors.map(floor => (
                            <div
                                key={floor.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-colors ${selectedFloorId === floor.id
                                        ? 'bg-brand-gold text-white border-brand-gold'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                onClick={() => setSelectedFloorId(floor.id)}
                            >
                                <Layout size={14} />
                                <span>{floor.name}</span>
                                {selectedFloorId === floor.id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFloor(floor.id); }}
                                        className="ml-1 p-0.5 hover:bg-white/20 rounded-full"
                                        title="Delete Floor"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Table Management */}
            <div>
                <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">
                    {floors.length > 0 ? (currentFloorName ? `Tables in ${currentFloorName}` : 'Select a Floor') : 'All Tables'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-gray-50 p-4 rounded-md mb-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Table Name</label>
                        <input
                            type="text"
                            value={newTable.table_name}
                            onChange={(e) => setNewTable({ ...newTable, table_name: e.target.value })}
                            placeholder="e.g. Table 5"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
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
                        disabled={isAddingTable || !newTable.table_name || (floors.length > 0 && !selectedFloorId)}
                        className="flex items-center justify-center bg-brand-gold text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium h-10"
                    >
                        <Plus size={16} className="mr-1" /> Add Table
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-md">
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
                                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td>
                                </tr>
                            ) : finalDisplayedTables.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                                        {floors.length > 0 && !selectedFloorId ? 'Select a floor to view tables.' : 'No tables found.'}
                                    </td>
                                </tr>
                            ) : (
                                finalDisplayedTables.map((table) => (
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
        </div>
    );
};

export default SettingsTableManagement;
