import React from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    ShoppingBag,
    CalendarDays,
    Settings,
    LogOut,
    Store,
    Layers,
    Users,
    MessageSquare,
    Menu,
    X,
    Shield
} from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { session, loading, logout, selectedRestaurantId, setSelectedRestaurantId, restaurants, role } = useAdmin();
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [smsBalance, setSmsBalance] = React.useState<number | null>(null);

    React.useEffect(() => {
        const fetchCredits = async () => {
            if (!selectedRestaurantId) return;
            // Lazy import supabase to avoid circular dep issues if any, or just use context if available? 
            // Better to use imported supabase client.
            const { data, error } = await import('../../supabaseClient').then(mod =>
                mod.supabase.from('restaurant_credits').select('balance').eq('restaurant_id', selectedRestaurantId).maybeSingle()
            );

            if (data) {
                setSmsBalance(data.balance);
            } else {
                setSmsBalance(null);
            }
        };
        fetchCredits();
    }, [selectedRestaurantId]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100">Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-dark-gray text-white flex items-center justify-between px-4 z-40 shadow-md">
                <h1 className="text-lg font-serif font-bold tracking-wider">Admin Panel</h1>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-md hover:bg-gray-700 focus:outline-none"
                >
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:relative z-50 h-full w-64 bg-brand-dark-gray text-white flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-700 hidden md:block">
                    <h1 className="text-2xl font-serif font-bold tracking-wider">Admin Panel</h1>
                </div>

                {/* Mobile Close Button (Optional, but good for UX) */}
                <div className="md:hidden p-4 flex justify-end border-b border-gray-700">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
                        Close Menu
                    </button>
                </div>

                {/* Restaurant Selector */}
                <div className="px-6 py-4 border-b border-gray-700">
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Restaurant Context</label>
                    <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={selectedRestaurantId || ''}
                            onChange={(e) => setSelectedRestaurantId(e.target.value)}
                            className="w-full bg-gray-800 text-white text-sm pl-9 pr-3 py-2 rounded border border-gray-700 focus:outline-none focus:border-brand-gold appearance-none"
                        >
                            <option value="" disabled>Select Restaurant</option>
                            {restaurants.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {role === 'super_admin' && (
                            <li className="mb-4 border-b border-gray-700 pb-2">
                                <NavLink
                                    to="/admin/super"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'}`}
                                >
                                    <Shield className="h-5 w-5 mr-3" />
                                    Super Admin
                                </NavLink>
                            </li>
                        )}
                        <li>
                            <NavLink
                                to="/admin/dashboard"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <LayoutDashboard className="h-5 w-5 mr-3" />
                                Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/menu"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <UtensilsCrossed className="h-5 w-5 mr-3" />
                                Menu Management
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/orders"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <ShoppingBag className="h-5 w-5 mr-3" />
                                Orders
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/bookings"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <CalendarDays className="h-5 w-5 mr-3" />
                                Bookings
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/customers"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Users className="h-5 w-5 mr-3" />
                                Customers
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/messages"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <MessageSquare className="h-5 w-5 mr-3" />
                                Messages
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/settings"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Settings className="h-5 w-5 mr-3" />
                                Settings
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/credits"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <MessageSquare className="h-5 w-5 mr-3" />
                                SMS Credits
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0">
                {smsBalance !== null && smsBalance < 10 && role === 'admin' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex justify-between items-center shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Shield className="h-5 w-5 text-red-500" /> {/* Using Shield as placeholder if AlertTriangle not imported, let me check imports */}
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    <span className="font-bold">Low SMS Balance:</span> You have only {smsBalance} credits remaining.
                                    Top up now to ensure notifications are sent.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/admin/credits')}
                            className="bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium py-1 px-3 rounded transition-colors"
                        >
                            Top Up
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
