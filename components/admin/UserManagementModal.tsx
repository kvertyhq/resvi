import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, UserPlus, Mail, Lock, RotateCcw, Shield, User } from 'lucide-react';

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantId: string;
    restaurantName: string;
}

interface Profile {
    id: string;
    email: string; // We might need to join/rpc this if profiles table doesn't have email?
    // Profiles usually doesn't have email if it references auth.users. 
    // But let's check schema.
    // Wait, schema usually copies email or we fetch from auth?
    // Client cannot fetch from auth.users.
    // So profiles SHOULD have email or we rely on a view.
    // Let's assume for now profiles has email or we need to add it?
    // Standard Starter kits usually add email to profiles on trigger.
    // If not, we have a problem displaying emails.
    // Super Admin CAN fetch from auth.users via Edge Function!
    // But for the list, we want to be fast.
    // Let's check 'profiles' table schema first? 
    // I'll assume it might not have it.
    // I'll assume we might need to fetch it via Edge Function too? 
    // OR just assume 'email' column exists for now.
    role: string;
    restaurant_id: string;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, restaurantId, restaurantName }) => {
    const [activeTab, setActiveTab] = useState<'list' | 'invite' | 'create'>('list');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isOpen && restaurantId) {
            fetchUsers();
            setActiveTab('list');
            setMessage(null);
            setEmail('');
            setPassword('');
        }
    }, [isOpen, restaurantId]);

    const fetchUsers = async () => {
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'get-users',
                    restaurantId
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setUsers(data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            // Fallback to local profile query if edge function fails? 
            // Ideally not, as we need emails.
        }
        setLoading(false);
    };

    const handleAction = async (action: 'invite-admin' | 'create-staff' | 'reset-password', payload: any = {}) => {
        setActionLoading(true);
        setMessage(null);

        try {
            const { data, error } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action,
                    restaurantId,
                    ...payload
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setMessage({ type: 'success', text: data.message });

            if (action !== 'reset-password') {
                setEmail('');
                setPassword('');
                fetchUsers(); // Refresh list
                if (action === 'invite-admin' || action === 'create-staff') {
                    // Optional: Switch back to list?
                    // setActiveTab('list');
                }
            }
        } catch (err: any) {
            console.error('Action failed:', err);
            setMessage({ type: 'error', text: err.message || 'Operation failed' });
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Manage Users</h2>
                        <p className="text-sm text-gray-500">{restaurantName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Users List
                    </button>
                    <button
                        onClick={() => setActiveTab('invite')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invite' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Invite Admin
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Create Staff
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {message && (
                        <div className={`p-4 rounded-md mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div>
                            {loading ? (
                                <p className="text-center text-gray-500 py-8">Loading users...</p>
                            ) : users.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No users found for this restaurant.</p>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {/* Assuming Profile has email, otherwise we show ID or need to fetch emails */}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {user.email || user.id}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${user.role === 'restaurant_admin' || user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-green-100 text-green-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleAction('reset-password', { email: user.email })}
                                                        disabled={actionLoading}
                                                        className="text-orange-600 hover:text-orange-900 flex items-center justify-end ml-auto disabled:opacity-50"
                                                        title="Send Password Reset Email"
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        Reset Password
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'invite' && (
                        <div className="max-w-md mx-auto py-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Admin</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Sends an email invitation to a new administrator for <strong>{restaurantName}</strong>.
                                They will be able to manage orders, menus, and settings.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border"
                                        placeholder="admin@restaurant.com"
                                    />
                                </div>
                                <button
                                    onClick={() => handleAction('invite-admin', { email })}
                                    disabled={actionLoading || !email}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="max-w-md mx-auto py-4">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Staff Account</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Manually create a staff account. Staff can view orders and bookings but cannot change sensitive settings.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border"
                                        placeholder="staff@restaurant.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-gold focus:border-brand-gold p-2 border"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                                <button
                                    onClick={() => handleAction('create-staff', { email, password })}
                                    disabled={actionLoading || !email || !password}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagementModal;
