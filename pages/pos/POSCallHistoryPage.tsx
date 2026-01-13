import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { format } from 'date-fns';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, UserPlus, ShoppingCart, Search, Delete, User, Users, GripHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

const POSCallHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialer & Customer State
    const [activeTab, setActiveTab] = useState<'dialer' | 'contacts'>('dialer');
    const [dialNumber, setDialNumber] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [isDialing, setIsDialing] = useState(false);

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

    const simulateIncomingCall = async () => {
        const mockNumbers = ['+15550101', '+15550102', '+15550199', '+15559999'];
        const number = mockNumbers[Math.floor(Math.random() * mockNumbers.length)];

        const { error } = await supabase.from('call_logs').insert({
            caller_number: number,
            direction: 'inbound',
            status: Math.random() > 0.3 ? 'answered' : 'missed',
            duration: Math.floor(Math.random() * 300),
            notes: 'Simulated Incoming',
            restaurant_id: settings?.id
        });

        if (error) alert('Simulation failed');
    };

    const handleCall = async (numberToCall = dialNumber) => {
        if (!numberToCall) return;
        setIsDialing(true);

        const customer = customers.find(c => c.phone === numberToCall);

        const { error } = await supabase.from('call_logs').insert({
            caller_number: numberToCall,
            direction: 'outbound',
            status: 'answered',
            duration: 0,
            notes: 'Manual Outbound Call',
            restaurant_id: settings?.id
        });

        if (error) {
            alert('Call failed');
            setIsDialing(false);
        } else {
            setTimeout(() => {
                alert(`Calling ${customer ? customer.full_name : numberToCall}...`);
                setIsDialing(false);
                setDialNumber('');
            }, 500);
        }
    };

    const handleCreateOrder = (callOrCustomer: any) => {
        navigate('/pos');
    };

    const filteredCustomers = customers.filter(c =>
        (c.full_name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
        (c.phone || '').includes(customerSearch)
    );

    const DialerKey = ({ val, sub }: { val: string, sub?: string }) => (
        <button
            onClick={() => setDialNumber(prev => prev + val)}
            className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm"
        >
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{val}</span>
            {sub && <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">{sub}</span>}
        </button>
    );

    return (
        <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">

            {/* Left Panel: Tabs & Content */}
            <div className="w-full md:w-[450px] flex flex-col border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 transition-colors duration-300 flex-shrink-0 h-full">

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('dialer')}
                        className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'dialer'
                            ? 'text-[var(--theme-color)] border-b-2 border-[var(--theme-color)] bg-gray-50 dark:bg-gray-900/50'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <GripHorizontal size={18} />
                        Keypad
                    </button>
                    <button
                        onClick={() => setActiveTab('contacts')}
                        className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'contacts'
                            ? 'text-[var(--theme-color)] border-b-2 border-[var(--theme-color)] bg-gray-50 dark:bg-gray-900/50'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Users size={18} />
                        Contacts
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden relative">

                    {/* Dialer Tab */}
                    {activeTab === 'dialer' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 animate-fadeIn">
                            <div className="w-full mb-8 flex items-center justify-center relative">
                                <input
                                    value={dialNumber}
                                    onChange={e => setDialNumber(e.target.value)}
                                    className="bg-transparent text-center text-4xl font-bold text-gray-900 dark:text-white w-full outline-none placeholder-gray-300 dark:placeholder-gray-700"
                                    placeholder="Enter Number"
                                />
                                {dialNumber && (
                                    <button
                                        onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                                        className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2"
                                    >
                                        <Delete size={28} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <DialerKey val="1" sub="" />
                                <DialerKey val="2" sub="ABC" />
                                <DialerKey val="3" sub="DEF" />
                                <DialerKey val="4" sub="GHI" />
                                <DialerKey val="5" sub="JKL" />
                                <DialerKey val="6" sub="MNO" />
                                <DialerKey val="7" sub="PQRS" />
                                <DialerKey val="8" sub="TUV" />
                                <DialerKey val="9" sub="WXYZ" />
                                <DialerKey val="*" sub="" />
                                <DialerKey val="0" sub="+" />
                                <DialerKey val="#" sub="" />
                            </div>

                            <button
                                onClick={() => handleCall()}
                                disabled={!dialNumber || isDialing}
                                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/30 text-white flex items-center justify-center transform active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Phone size={32} />
                            </button>
                        </div>
                    )}

                    {/* Contacts Tab */}
                    {activeTab === 'contacts' && (
                        <div className="absolute inset-0 flex flex-col p-4 animate-fadeIn">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search Name or Number..."
                                    className="w-full bg-gray-100 dark:bg-gray-700 border-none rounded-xl pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--theme-color)] outline-none transition-all"
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {filteredCustomers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                        <Users size={48} className="mb-2 opacity-50" />
                                        <p>No contacts found</p>
                                    </div>
                                ) : (
                                    filteredCustomers.map(c => (
                                        <div
                                            key={c.id}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)] flex items-center justify-center font-bold">
                                                {c.full_name?.charAt(0) || <User size={20} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900 dark:text-white truncate">{c.full_name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.phone}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setDialNumber(c.phone || '');
                                                    setActiveTab('dialer');
                                                }}
                                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="Call"
                                            >
                                                <Phone size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Right Panel: Call History List */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800 transition-colors duration-300 shadow-sm z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call History</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Recent incoming and outgoing calls</p>
                    </div>
                    <button
                        onClick={simulateIncomingCall}
                        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium text-sm transition-all"
                    >
                        <PhoneIncoming size={16} />
                        Simulate
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
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

                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => {
                                                setDialNumber(call.caller_number);
                                                setActiveTab('dialer');
                                            }}
                                            className="flex-1 py-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                                        >
                                            <Phone size={18} />
                                            Call Back
                                        </button>
                                        <button
                                            onClick={() => handleCreateOrder(call)}
                                            className="flex-1 py-2 bg-[var(--theme-color)] text-white rounded-lg flex items-center justify-center gap-2 font-bold shadow hover:brightness-110 active:scale-95 transition-all"
                                        >
                                            <ShoppingCart size={18} />
                                            Order
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
