import React from 'react';
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
    Shield,
    Coins,
    Phone
} from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { session, loading, logout, selectedRestaurantId, setSelectedRestaurantId, restaurants, role } = useAdmin();
    const navigate = useNavigate();
    const location = useLocation();

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [smsBalance, setSmsBalance] = React.useState<number | null>(null);

    React.useEffect(() => {
        const fetchCredits = async () => {
            if (!selectedRestaurantId) return;
            const { data } = await import('../../supabaseClient').then(mod =>
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

    // Close sidebar on route change (for mobile)
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

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

    const isActiveLink = (path: string) => location.pathname.startsWith(path);

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">

            {/* Mobile Header (Top Bar) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-brand-dark-gray text-white flex items-center justify-between px-4 z-40 shadow-md">
                <h1 className="text-lg font-serif font-bold tracking-wider">Admin Panel</h1>
                {/* Restaurant Selector Quick View for Mobile */}
                <div className="relative w-40">
                    <select
                        value={selectedRestaurantId || ''}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        className="w-full bg-gray-800 text-white text-xs pl-2 pr-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-brand-gold appearance-none truncate"
                    >
                        <option value="" disabled>Select Restaurant</option>
                        {restaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sidebar Overlay for Mobile (when "More" is clicked or Sidebar is toggled) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar (Desktop & Mobile Slide-out) */}
            <aside className={`
                fixed md:relative z-50 h-full w-64 bg-brand-dark-gray text-white flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-gray-700 hidden md:block">
                    <h1 className="text-2xl font-serif font-bold tracking-wider">Admin Panel</h1>
                </div>

                {/* Mobile Close Button */}
                <div className="md:hidden p-4 flex justify-between items-center border-b border-gray-700 bg-gray-900">
                    <span className="font-serif font-bold">Menu</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Restaurant Selector (Desktop) */}
                <div className="px-6 py-4 border-b border-gray-700 hidden md:block">
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
                                to="/admin/messages"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <MessageSquare size={20} className="h-5 w-5 mr-3" />
                                <span className="font-medium">Messages</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/credits"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Coins className="h-5 w-5 mr-3" />
                                SMS Credits
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/staff"
                                className={({ isActive }) => `flex items-center px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-gold text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <Users className="h-5 w-5 mr-3" />
                                Staff & PINs
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
            <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0 pb-24 md:pb-8">
                {smsBalance !== null && smsBalance < 10 && role === 'admin' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 flex justify-between items-center shadow-sm">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Shield className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">
                                    <span className="font-bold">Low SMS Balance:</span> You have only {smsBalance} credits remaining.
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

            {/* Bottom Navigation Bar (Mobile Only) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-2 pb-safe z-40 shadow-lg h-16">
                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) => `flex flex-col items-center justify-center p-1 w-16 ${isActive ? 'text-brand-gold' : 'text-gray-500'}`}
                >
                    <LayoutDashboard className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-medium">Home</span>
                </NavLink>

                <NavLink
                    to="/admin/orders"
                    className={({ isActive }) => `flex flex-col items-center justify-center p-1 w-16 ${isActive ? 'text-brand-gold' : 'text-gray-500'}`}
                >
                    <ShoppingBag className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-medium">Orders</span>
                </NavLink>

                <NavLink
                    to="/admin/bookings"
                    className={({ isActive }) => `flex flex-col items-center justify-center p-1 w-16 ${isActive ? 'text-brand-gold' : 'text-gray-500'}`}
                >
                    <CalendarDays className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-medium">Bookings</span>
                </NavLink>

                <NavLink
                    to="/admin/menu"
                    className={({ isActive }) => `flex flex-col items-center justify-center p-1 w-16 ${isActive ? 'text-brand-gold' : 'text-gray-500'}`}
                >
                    <UtensilsCrossed className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-medium">Menu</span>
                </NavLink>

                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`flex flex-col items-center justify-center p-1 w-16 ${isSidebarOpen ? 'text-brand-gold' : 'text-gray-500'}`}
                >
                    <Menu className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-medium">More</span>
                </button>
            </div>
        </div>
    );
};

export default AdminLayout;

