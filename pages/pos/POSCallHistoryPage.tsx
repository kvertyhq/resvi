import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, UserPlus, ShoppingCart, Search, Delete, User, Users, GripHorizontal, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useSip } from '../../context/SipContext';

const POSCallHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { callState } = useSip();
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Contact & Mobile State
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [mobileView, setMobileView] = useState<'history' | 'contacts'>('history');

    useEffect(() => {
        if (settings?.id) {
            fetchCalls();
            fetchCustomers();
        }

        const subscription = supabase
            .channel('calls_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, (payload) => {
                fetchCalls();
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [settings?.id]);

    const fetchCalls = async () => {
        if (!settings?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('call_logs')
            .select(`
                *,
                profiles ( full_name, email, phone )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) console.error(error);
        else setCalls(data || []);
        setLoading(false);
    };

    const fetchCustomers = async () => {
        if (!settings?.id) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('restaurant_id', settings.id)
            .eq('role', 'customer');

        if (data) setCustomers(data);
    };




    const handleCreateOrder = (callOrCustomer: any) => {
        // Extract phone number from either call log or customer object
        const phone = callOrCustomer.caller_number || callOrCustomer.phone || '';
        const name = callOrCustomer.profiles?.full_name || callOrCustomer.full_name || '';

        navigate('/pos/order/walk-in', {
            state: {
                customer: {
                    id: callOrCustomer.profiles?.id || callOrCustomer.id,
                    name: name,
                    phone: phone,
                    full_name: name // for consistency
                },
                isPhoneOrder: true
            }
        });
    };

    const filteredCustomers = customers.filter(c =>
        (c.full_name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch)
    );

    const DialerKey = () => null; // Kept to avoid syntax errors if missed anywhere

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-white dark:bg-gray-900 transition-colors duration-300 overflow-hidden relative">

            {/* Mobile Tab Toggle */}
            <div className="md:hidden flex p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                    onClick={() => setMobileView('history')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileView === 'history' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Clock size={16} />
                    History
                </button>
                <button
                    onClick={() => setMobileView('contacts')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileView === 'contacts' ? 'bg-white dark:bg-gray-700 shadow text-[var(--theme-color)]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Users size={16} />
                    Contacts
                </button>
            </div>

            {/* Left Panel: Contacts Sidebar */}
            <div className={`${mobileView === 'contacts' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-col border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 transition-colors duration-300 flex-shrink-0 h-full z-10`}>

                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
                    <h2 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-3">
                        <Users size={24} className="text-[var(--theme-color)]" />
                        Contacts
                    </h2>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 bg-white dark:bg-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Name or Number..."
                                className="w-full bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-[var(--theme-color)] rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:ring-4 focus:ring-[var(--theme-color)]/10 outline-none transition-all"
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filteredCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <Users size={40} className="mb-3 opacity-20" />
                                <p className="text-sm font-medium">No contacts found</p>
                            </div>
                        ) : (
                            filteredCustomers.map(c => (
                                <div
                                    key={c.id}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-gray-700/50 rounded-xl transition-all group border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)] flex items-center justify-center font-bold text-lg flex-shrink-0">
                                        {c.full_name?.charAt(0) || <User size={24} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 dark:text-white truncate text-[15px]">{c.full_name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.phone}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Call History List */}
            <div className={`${mobileView === 'history' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-gray-50 dark:bg-gray-900/50`}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 w-full flex-shrink-0 z-10 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Call History</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Recent incoming and outgoing calls</p>
                </div>

                {/* Calls Grid */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {Number(calls.length) === 0 ? (
                            <div className="text-center p-12 text-gray-400 flex flex-col items-center col-span-full">
                                <PhoneMissed size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">No calls recorded yet.</p>
                            </div>
                        ) : (
                            calls.map(call => (
                                <div key={call.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between group hover:border-[var(--theme-color)] hover:shadow-md transition-all h-full">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${call.direction === 'inbound'
                                            ? (call.status === 'missed' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30')
                                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                            }`}>
                                            {call.direction === 'inbound'
                                                ? <PhoneIncoming size={20} />
                                                : <PhoneOutgoing size={20} />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2 flex-wrap">
                                                {call.profiles?.full_name || formatPhoneNumber(call.caller_number)}
                                                {call.profiles && <span className="text-[10px] px-2 py-0.5 bg-[var(--theme-color)]/10 text-[var(--theme-color)] rounded-full font-bold uppercase tracking-wide">Customer</span>}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                                <span>{format(new Date(call.created_at), 'MMM d, h:mm a')}</span>
                                            </div>
                                            <div className={`text-sm mt-1 font-medium capitalize ${call.status === 'missed' ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {call.status} {call.duration > 0 && `• ${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
                                        <button
                                            onClick={() => handleCreateOrder(call)}
                                            className="flex-1 py-2.5 bg-[var(--theme-color)] text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg active:scale-95 transition-all w-full"
                                        >
                                            <ShoppingCart size={18} />
                                            Start Order
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper for formatting
const formatPhoneNumber = (str: string) => {
    // Simple mock formatting or return as is
    return str;
};

export default POSCallHistoryPage;
