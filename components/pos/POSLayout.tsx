import React, { useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { usePOS } from '../../context/POSContext';
import { useOffline } from '../../context/OfflineContext';
import { useAdmin } from '../../context/AdminContext';
import { useSettings } from '../../context/SettingsContext';
import { LogOut, Clock, PhoneIncoming, Printer, BarChart3, Phone, Menu, X, User } from 'lucide-react';
import PrinterConfigModal from './PrinterConfigModal';
import { IncomingCallModal } from './IncomingCallModal';
import VirtualKeyboard from './VirtualKeyboard';
const POSLayout: React.FC = () => {
    const { user, loading: adminLoading } = useAdmin();
    const { staff, logout, loading: posLoading, clockIn, clockOut, activeShift } = usePOS();
    const { isOnline, queueLength, sync } = useOffline();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [showPrinterModal, setShowPrinterModal] = React.useState(false);
    const [showMobileMenu, setShowMobileMenu] = React.useState(false);

    // Default to orange if no theme color set
    const themeColor = settings?.theme_color || '#f97316';

    // Theme Managment
    const [isDarkMode, setIsDarkMode] = React.useState(() => {
        const saved = localStorage.getItem('pos-theme');
        return saved ? saved === 'dark' : true; // Default to dark for POS if not set
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('pos-theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('pos-theme', 'light');
        }

        // Cleanup on unmount (ensure admin is not affected)
        return () => {
            root.classList.remove('dark');
        };
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);



    // 2. POS Staff Check (Must be logged in with PIN)
    useEffect(() => {
        if (!adminLoading && !posLoading && !staff) {
            // Only redirect if we are not loading anything
            navigate('/pos/login');
        }
    }, [staff, posLoading, adminLoading, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/pos/login');
    };

    if (adminLoading || posLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading POS...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden font-sans transition-colors duration-300" style={{ '--theme-color': themeColor } as React.CSSProperties}>
            {/* POS Sidebar (Desktop) */}
            <aside className="hidden md:flex w-24 bg-white dark:bg-gray-900 flex-col items-center py-6 border-r border-gray-200 dark:border-gray-800 relative transition-colors duration-300 z-20">
                {!isOnline && (
                    <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] text-center py-1 font-bold animate-pulse">
                        OFFLINE
                    </div>
                )}
                <div className="mb-8 font-bold text-xl" style={{ color: 'var(--theme-color)' }}>POS</div>

                <nav className="flex-1 w-full flex flex-col items-center gap-6">
                    <NavLink to="/pos" end style={({ isActive }) => isActive ? { backgroundColor: 'var(--theme-color)' } : {}} className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-white shadow-lg scale-110' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                        <span className="sr-only">Tables</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    </NavLink>

                    <NavLink
                        to="/pos/walk-in"
                        style={({ isActive }) => isActive ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        title="Walk-In Orders"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </NavLink>

                    <NavLink
                        to="/pos/kds"
                        style={({ isActive }) => isActive ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        title="Kitchen Display"
                    >
                        <span className="font-bold text-lg">KDS</span>
                    </NavLink>

                    <NavLink
                        to="/pos/reports"
                        style={({ isActive }) => isActive ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        title="Reports & History"
                    >
                        <BarChart3 size={24} />
                    </NavLink>

                    <NavLink
                        to="/pos/calls"
                        style={({ isActive }) => isActive ? { backgroundColor: 'var(--theme-color)' } : {}}
                        className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        title="Call History"
                    >
                        <PhoneIncoming size={24} />
                    </NavLink>
                </nav>

                {/* User Profile / Logout */}
                <div className="p-2 w-full flex justify-center border-t border-gray-200 dark:border-gray-700 pt-4">
                    {staff ? (
                        <div className="flex flex-col items-center gap-2 group">
                            {/* Shift Status */}
                            <button
                                onClick={activeShift ? clockOut : clockIn}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${activeShift ? 'bg-green-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-green-600 hover:text-white'}`}
                                title={activeShift ? "Clock Out" : "Clock In"}
                            >
                                <Clock size={16} />
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDarkMode ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                )}
                            </button>




                            {/* Printer Settings Button */}
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--theme-color)' }}>
                                {staff.full_name.charAt(0)}
                            </div>

                            <button
                                onClick={() => setShowPrinterModal(true)}
                                className="p-3 bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all mt-4 hover:bg-gray-700"
                                title="Printer Settings"
                            >
                                <Printer size={24} />
                            </button>

                            <button
                                onClick={handleLogout}
                                className="p-3 bg-gray-800 rounded-xl text-gray-400 hover:bg-red-600 hover:text-white transition-all mt-4"
                                title="Logout"
                            >
                                <LogOut size={24} />
                            </button>





                            {/* Sync Button */}
                            {(queueLength > 0 || !isOnline) && (
                                <button
                                    onClick={sync}
                                    disabled={!isOnline}
                                    className="mt-2 text-[10px] text-gray-400 flex flex-col items-center"
                                >
                                    <div className={`w-3 h-3 rounded-full mb-1 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    {queueLength} Pending
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500">?</div>
                    )}
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center p-1 sm:p-2 z-50 overflow-x-auto hide-scrollbar">
                <NavLink to="/pos" end style={({ isActive }) => isActive ? { color: 'var(--theme-color)' } : {}} className={({ isActive }) => `flex flex-col items-center p-1 sm:p-2 rounded-lg flex-shrink-0 min-w-[3.5rem] ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">Tables</span>
                </NavLink>

                <NavLink to="/pos/walk-in" style={({ isActive }) => isActive ? { color: 'var(--theme-color)' } : {}} className={({ isActive }) => `flex flex-col items-center p-1 sm:p-2 rounded-lg flex-shrink-0 min-w-[3.5rem] ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">Walk-In</span>
                </NavLink>

                <NavLink to="/pos/kds" style={({ isActive }) => isActive ? { color: 'var(--theme-color)' } : {}} className={({ isActive }) => `flex flex-col items-center p-1 sm:p-2 rounded-lg flex-shrink-0 min-w-[3.5rem] ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    <span className="font-bold text-lg sm:text-xl leading-none">KDS</span>
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">Kitchen</span>
                </NavLink>

                <NavLink to="/pos/reports" style={({ isActive }) => isActive ? { color: 'var(--theme-color)' } : {}} className={({ isActive }) => `flex flex-col items-center p-1 sm:p-2 rounded-lg flex-shrink-0 min-w-[3.5rem] ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">Reports</span>
                </NavLink>

                <NavLink to="/pos/calls" style={({ isActive }) => isActive ? { color: 'var(--theme-color)' } : {}} className={({ isActive }) => `flex flex-col items-center p-1 sm:p-2 rounded-lg flex-shrink-0 min-w-[3.5rem] ${isActive ? '' : 'text-gray-500 dark:text-gray-400'}`}>
                    <PhoneIncoming className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">Calls</span>
                </NavLink>

                {/* Mobile Menu/Profile Trigger */}
                <button onClick={() => setShowMobileMenu(true)} className="flex flex-col items-center p-1 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-[var(--theme-color)] flex-shrink-0 min-w-[3.5rem]">
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-[9px] sm:text-[10px] mt-1 font-bold">More</span>
                </button>
            </nav>

            {/* Mobile More Options Menu */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowMobileMenu(false)}>
                    <div
                        className="bg-white dark:bg-gray-800 w-full rounded-t-3xl p-6 shadow-2xl transform transition-transform duration-300 translate-y-0"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-[var(--theme-color)] shadow-sm">
                                    {staff?.full_name.charAt(0) || <User size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{staff?.full_name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{staff?.role}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMobileMenu(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                onClick={() => {
                                    activeShift ? clockOut() : clockIn();
                                    setShowMobileMenu(false);
                                }}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-gray-700/50 ${activeShift ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-green-50 hover:text-green-600'}`}
                            >
                                <Clock size={28} className="mb-2" />
                                <span className="font-bold text-sm">{activeShift ? "Clock Out" : "Clock In"}</span>
                            </button>

                            <button
                                onClick={() => {
                                    toggleTheme();
                                    setShowMobileMenu(false);
                                }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-100 dark:border-gray-700/50"
                            >
                                {isDarkMode ? <svg className="w-7 h-7 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-7 h-7 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                                <span className="font-bold text-sm">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setShowPrinterModal(true);
                                    setShowMobileMenu(false);
                                }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-100 dark:border-gray-700/50"
                            >
                                <Printer size={28} className="mb-2" />
                                <span className="font-bold text-sm">Printers</span>
                            </button>

                            <button
                                onClick={() => {
                                    handleLogout();
                                    setShowMobileMenu(false);
                                }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-all shadow-sm border border-red-100 dark:border-red-900/30"
                            >
                                <LogOut size={28} className="mb-2" />
                                <span className="font-bold text-sm">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative mb-16 md:mb-0">
                <Outlet />
            </main>
            {/* Printer Configuration Modal */}
            <PrinterConfigModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />
            {/* Global Incoming Call Modal */}
            <IncomingCallModal />
            {/* Floating Virtual Keyboard */}
            <VirtualKeyboard />
        </div >
    );
};

export default POSLayout;
