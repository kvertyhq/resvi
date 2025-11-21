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
    Users // Added Users icon
} from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { session, loading, logout, selectedRestaurantId, setSelectedRestaurantId, restaurants } = useAdmin();
    const navigate = useNavigate();

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
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-dark-gray text-white flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <h1 className="text-2xl font-serif font-bold tracking-wider">Daniel Sushi Admin</h1>
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
                        <li>
                            <NavLink
                                to="/admin/dashboard"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <LayoutDashboard className="h-5 w-5 mr-3" />
                                Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/menu"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <UtensilsCrossed className="h-5 w-5 mr-3" />
                                Menu Management
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/orders"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <ShoppingBag className="h-5 w-5 mr-3" />
                                Orders
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/bookings"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <CalendarDays className="h-5 w-5 mr-3" />
                                Bookings
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/customers"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Users className="h-5 w-5 mr-3" />
                                Customers
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/settings"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Settings className="h-5 w-5 mr-3" />
                                Settings
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
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
