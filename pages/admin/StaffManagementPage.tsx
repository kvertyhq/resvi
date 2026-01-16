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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        if (selectedRestaurantId) {
            setCurrentPage(1);
            fetchStaff();
        }
    }, [selectedRestaurantId]);

    useEffect(() => {
        if (selectedRestaurantId) {
            fetchStaff();
        }
    }, [currentPage]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            // Fetch from view which joins profiles + auth.users to get email
            const { data, error, count } = await supabase
                .from('staff_profiles_view')
                .select('*', { count: 'exact' })
                .eq('restaurant_id', selectedRestaurantId)
                .neq('role', 'super_admin')
                .neq('role', 'customer')
                .order('full_name')
                .range(from, to);

            if (error) throw error;
            setStaff(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching staff:', error);
            setStaff([]);
            setTotalCount(0);
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

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(page => Math.min(page + 1, Math.ceil(totalCount / itemsPerPage)))}
                                disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                                    <span className="font-medium">{totalCount}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === page
                                                ? 'bg-brand-gold text-white focus:z-20'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(page => Math.min(page + 1, Math.ceil(totalCount / itemsPerPage)))}
                                        disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
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
