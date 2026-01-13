import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import { UserPlus } from 'lucide-react';
import UserManagementModal from '../../components/admin/UserManagementModal';

interface Profile {
    id: string;
    full_name: string;
    email: string;
    role: string;
    pin_code: string;
    // ... other fields
}

const StaffManagementPage: React.FC = () => {
    const { selectedRestaurantId } = useAdmin();
    const [staff, setStaff] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ role: string, pin_code: string, full_name: string }>({ role: '', pin_code: '', full_name: '' });

    useEffect(() => {
        if (selectedRestaurantId) fetchStaff();
    }, [selectedRestaurantId]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            // Fetch from view which joins profiles + auth.users to get email
            const { data, error } = await supabase
                .from('staff_profiles_view')
                .select('*')
                .eq('restaurant_id', selectedRestaurantId)
                .neq('role', 'super_admin')
                .neq('role', 'customer')
                .order('full_name');

            if (error) throw error;
            setStaff(data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (profile: Profile) => {
        setEditingId(profile.id);
        setEditForm({
            role: profile.role || 'staff',
            pin_code: profile.pin_code || '',
            full_name: profile.full_name || ''
        });
    };

    const handleSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    role: editForm.role,
                    pin_code: editForm.pin_code,
                    full_name: editForm.full_name
                })
                .eq('id', id);

            if (error) throw error;

            alert('Staff updated successfully');
            setEditingId(null);
            fetchStaff();
        } catch (error: any) {
            if (error.message && error.message.includes('idx_profiles_restaurant_pin')) {
                alert('Error: This PIN is already assigned to another staff member. Please choose a unique PIN.');
            } else {
                alert('Error updating staff: ' + error.message);
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
                >
                    <UserPlus size={18} />
                    Create New Staff
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIN Code</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : staff.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center">No staff found</td></tr>
                        ) : (
                            staff.map(person => (
                                <tr key={person.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {editingId === person.id ? (
                                            <input
                                                type="text"
                                                value={editForm.full_name}
                                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                className="border rounded p-1 w-full"
                                                placeholder="Full Name"
                                            />
                                        ) : (
                                            person.full_name || 'No Name'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {person.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {editingId === person.id ? (
                                            <select
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                className="border rounded p-1"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="staff">Staff/Waiter</option>
                                                <option value="kitchen">Kitchen</option>
                                                <option value="driver">Driver</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${person.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {person.role || 'staff'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {editingId === person.id ? (
                                            <input
                                                type="text"
                                                maxLength={4}
                                                value={editForm.pin_code}
                                                onChange={(e) => setEditForm({ ...editForm, pin_code: e.target.value.replace(/\D/g, '') })}
                                                className="border rounded p-1 w-20"
                                                placeholder="0000"
                                            />
                                        ) : (
                                            payloadObfuscate(person.pin_code)
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {editingId === person.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSave(person.id)} className="text-green-600 hover:text-green-900">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900">Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEdit(person)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>


            <UserManagementModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchStaff(); // Refresh list after closing
                }}
                restaurantId={selectedRestaurantId || ''}
                restaurantName="Restaurant"
            />
        </div >
    );
};

// Helper to hide PIN
const payloadObfuscate = (pin?: string) => {
    if (!pin) return <span className="text-gray-300">Set PIN</span>;
    return '****';
};

export default StaffManagementPage;
