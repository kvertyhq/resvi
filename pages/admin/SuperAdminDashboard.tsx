import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import { useAlert } from '../../context/AlertContext';
import UserManagementModal from '../../components/admin/UserManagementModal';
import OnboardRestaurantModal from '../../components/admin/OnboardRestaurantModal';
import SuperAdminSMSManagement from '../../components/admin/SuperAdminSMSManagement';
import { Plus, CreditCard, MessageSquare, Shield, Users, Building2, Copy, Lock, Unlock } from 'lucide-react';

interface Restaurant {
    id: string;
    name: string;
    subscription_plan: string;
    sms_credits: number;
    created_at: string;
    is_disabled?: boolean;
    stats?: {
        admins: number;
        staff: number;
    };
}

const SuperAdminDashboard: React.FC = () => {
    const { role } = useAdmin();
    const { showAlert } = useAlert();
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'restaurants' | 'sms'>('restaurants');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

    // User Management Modal
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedRestaurantForUsers, setSelectedRestaurantForUsers] = useState<Restaurant | null>(null);

    // Form States
    const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
    const [creditsAmount, setCreditsAmount] = useState(0);

    useEffect(() => {
        if (role === 'super_admin') {
            fetchRestaurants();
        }
    }, [role]);

    const fetchRestaurants = async () => {
        setLoading(true);
        const { data: restaurantsData, error: restaurantError } = await supabase
            .from('restaurant_settings')
            .select('*')
            .order('id', { ascending: true });

        if (restaurantError) {
            console.error('Error fetching restaurants:', restaurantError);
            setLoading(false);
            return;
        }

        // Fetch User Stats
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('restaurant_id, role')
            .in('role', ['admin', 'staff']);

        if (profilesError) console.error('Error fetching profile stats:', profilesError);

        const statsMap: Record<string, { admins: number; staff: number }> = {};

        if (profiles) {
            profiles.forEach(p => {
                if (!p.restaurant_id) return;
                if (!statsMap[p.restaurant_id]) {
                    statsMap[p.restaurant_id] = { admins: 0, staff: 0 };
                }
                if (p.role === 'admin') statsMap[p.restaurant_id].admins++;
                if (p.role === 'staff') statsMap[p.restaurant_id].staff++;
            });
        }

        const dataWithStats = (restaurantsData || []).map(r => ({
            ...r,
            stats: statsMap[r.id] || { admins: 0, staff: 0 }
        }));

        setRestaurants(dataWithStats);
        setLoading(false);
    };

    const handleToggleLock = async (restaurant: Restaurant) => {
        try {
            const { error } = await supabase
                .from('restaurant_settings')
                .update({ is_disabled: !restaurant.is_disabled })
                .eq('id', restaurant.id);
            if (error) throw error;
            showAlert('Success', `Workspace ${restaurant.is_disabled ? 'unlocked' : 'locked'} successfully`, 'success');
            fetchRestaurants();
        } catch (error: any) {
            showAlert('Error', error.message, 'error');
        }
    };

    const handleAddCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurant) return;

        try {
            // Optimistic update locally? No, let's call the function or update directly
            // We'll update the row directly since we are super admin
            const newCredits = (selectedRestaurant.sms_credits || 0) + parseInt(creditsAmount.toString());

            const { error } = await supabase
                .from('restaurant_settings')
                .update({ sms_credits: newCredits })
                .eq('id', selectedRestaurant.id);

            if (error) throw error;

            // Log transaction
            await supabase.from('sms_credit_transactions').insert({
                restaurant_id: selectedRestaurant.id,
                amount: creditsAmount,
                description: 'Admin added credits manually'
            });

            setIsCreditsModalOpen(false);
            setCreditsAmount(0);
            setSelectedRestaurant(null);
            fetchRestaurants();
        } catch (error: any) {
            console.error('Error adding credits:', error);
            showAlert('Error', 'Failed to add credits: ' + error.message, 'error');
        }
    };

    if (role !== 'super_admin') {
        return <div className="p-8 text-center text-red-600">Access Denied. Super Admin only.</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-800 flex items-center">
                        <Shield className="h-8 w-8 mr-3 text-brand-gold" />
                        Super Admin Dashboard
                    </h2>
                    <p className="text-gray-500 mt-1">Manage restaurants, subscriptions, and global settings.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setActiveTab('restaurants')}
                        className={`px-4 py-2 rounded-md font-medium text-sm flex items-center ${activeTab === 'restaurants' ? 'bg-brand-dark-gray text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                    >
                        <Building2 className="w-4 h-4 mr-2" />
                        Restaurants
                    </button>
                    <button
                        onClick={() => setActiveTab('sms')}
                        className={`px-4 py-2 rounded-md font-medium text-sm flex items-center ${activeTab === 'sms' ? 'bg-brand-dark-gray text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        SMS & Coupons
                    </button>

                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'sms' ? (
                <SuperAdminSMSManagement />
            ) : (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium uppercase">Total Restaurants</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{restaurants.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-gray-500 text-sm font-medium uppercase">Total SMS Credits</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {restaurants.reduce((acc, r) => acc + (r.sms_credits || 0), 0)}
                            </p>
                        </div>
                    </div>

                    {/* Restaurants List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">All Restaurants</h3>
                            {activeTab === 'restaurants' && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="bg-brand-gold text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Restaurant
                                </button>
                            )}
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading restaurants...</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS Credits</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {restaurants.map(restaurant => (
                                        <tr key={restaurant.id} className={`${restaurant.is_disabled ? 'opacity-60 bg-gray-50 grayscale-[50%]' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                        {restaurant.name}
                                                        {restaurant.is_disabled && <span className="bg-red-100 text-red-800 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Locked</span>}
                                                    </div>
                                                    <div className="flex items-center mt-1 group">
                                                        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-1.5 font-mono">
                                                            {restaurant.id.slice(0, 8)}...
                                                        </code>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(restaurant.id);
                                                                showAlert('Success', 'Restaurant ID copied', 'success');
                                                            }}
                                                            className="text-gray-400 hover:text-brand-gold focus:opacity-100 opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Copy Full ID"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${restaurant.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                                                        restaurant.subscription_plan === 'pro' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {restaurant.subscription_plan || 'basic'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <MessageSquare className="h-4 w-4 mr-2 text-gray-400" />
                                                    {restaurant.sms_credits || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center">
                                                        <span className="w-16 text-xs text-gray-400 uppercase">Admins:</span>
                                                        <span className="font-medium text-gray-900">{restaurant.stats?.admins || 0}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="w-16 text-xs text-gray-400 uppercase">Staff:</span>
                                                        <span className="font-medium text-gray-900">{restaurant.stats?.staff || 0}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-3 items-center">
                                                    <button
                                                        onClick={() => handleToggleLock(restaurant)}
                                                        className={`${restaurant.is_disabled ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'} flex items-center`}
                                                        title={restaurant.is_disabled ? "Unlock Workspace" : "Lock Workspace"}
                                                    >
                                                        {restaurant.is_disabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRestaurantForUsers(restaurant);
                                                            setIsUserModalOpen(true);
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-900 flex items-center mr-2"
                                                        title="Manage Users"
                                                    >
                                                        <Users className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRestaurant(restaurant);
                                                            setCreditsAmount(100);
                                                            setIsCreditsModalOpen(true);
                                                        }}
                                                        className="text-brand-gold hover:text-yellow-600 flex items-center"
                                                        title="Add Credits"
                                                    >
                                                        <CreditCard className="h-4 w-4" />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}

            {/* Create Modal */}
            <OnboardRestaurantModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    fetchRestaurants();
                    showAlert('Success', 'Restaurant and Admin User provisioned successfully', 'success');
                }}
            />

            {/* Credits Modal */}
            {isCreditsModalOpen && selectedRestaurant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                        <h3 className="text-lg font-bold mb-4">Add SMS Credits</h3>
                        <p className="text-sm text-gray-500 mb-4">Adding credits for <strong>{selectedRestaurant.name}</strong></p>
                        <form onSubmit={handleAddCredits}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={creditsAmount}
                                    onChange={e => setCreditsAmount(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded p-2 focus:ring-brand-gold focus:border-brand-gold"
                                    min="1"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreditsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Add Credits
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Management Modal */}
            {selectedRestaurantForUsers && (
                <UserManagementModal
                    isOpen={isUserModalOpen}
                    onClose={() => {
                        setIsUserModalOpen(false);
                        setSelectedRestaurantForUsers(null);
                        // Refresh main list in case counts changed
                        fetchRestaurants();
                    }}
                    restaurantId={selectedRestaurantForUsers.id}
                    restaurantName={selectedRestaurantForUsers.name}
                />
            )}
        </div>
    );
};

export default SuperAdminDashboard;
