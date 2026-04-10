import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, User, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSip } from '../../context/SipContext';
import { supabase } from '../../supabaseClient';
import { usePOS } from '../../context/POSContext';

interface CustomerInfo {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

export const IncomingCallModal: React.FC = () => {
    const { callState: sipCallState } = useSip();
    const { staff } = usePOS();
    
    // Multi-call stack
    const [activeCalls, setActiveCalls] = useState<any[]>([]);
    const [customer, setCustomer] = useState<CustomerInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // current call being viewed
    const currentCall = activeCalls[0] || null;

    // Supabase Realtime Listener
    useEffect(() => {
        if (!staff?.restaurant_id) return;

        const channel = supabase
            .channel('call_logs_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'call_logs',
                filter: `restaurant_id=eq.${staff.restaurant_id}`
            }, (payload: any) => {
                const newLog = payload.new;

                if (newLog.direction === 'inbound' && (newLog.status === 'missed' || newLog.status === 'called')) {
                    setActiveCalls(prev => {
                        // Avoid duplicates
                        if (prev.some(c => c.callLogId === newLog.id || (c.callerId === newLog.caller_number && Date.now() - c.timestamp < 10000))) {
                            return prev;
                        }
                        return [...prev, {
                            callerId: newLog.caller_number,
                            callLogId: newLog.id,
                            timestamp: Date.now()
                        }];
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [staff?.restaurant_id]);

    // SIP Integration
    useEffect(() => {
        if (sipCallState.isRinging && sipCallState.callerId) {
            setActiveCalls(prev => {
                // Avoid duplicates with realtime logs (check callerId and recent time)
                if (prev.some(c => c.callerId === sipCallState.callerId && Date.now() - c.timestamp < 10000)) {
                    return prev;
                }
                return [...prev, {
                    callerId: sipCallState.callerId,
                    callLogId: sipCallState.callId || null,
                    timestamp: Date.now()
                }];
            });
        }
    }, [sipCallState.isRinging, sipCallState.callerId, sipCallState.callId]);

    // Fetch customer info for top call
    useEffect(() => {
        const fetchCustomer = async () => {
            if (currentCall) {
                setLoading(true);
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, full_name, phone')
                        .eq('phone', currentCall.callerId)
                        .eq('restaurant_id', staff?.restaurant_id)
                        .maybeSingle();

                    if (!error && data) {
                        setCustomer({
                            id: data.id,
                            name: data.full_name || 'Guest',
                            phone: data.phone || currentCall.callerId
                        });
                    } else if (!data) {
                        // Create a new guest profile instantly for this caller
                        const { data: newProfile, error: insertError } = await supabase
                            .from('profiles')
                            .insert({
                                full_name: 'Guest',
                                phone: currentCall.callerId,
                                restaurant_id: staff?.restaurant_id
                            })
                            .select('id, full_name, phone')
                            .maybeSingle();

                        if (!insertError && newProfile) {
                            setCustomer({
                                id: newProfile.id,
                                name: newProfile.full_name || 'Guest',
                                phone: newProfile.phone || currentCall.callerId
                            });
                        } else {
                            setCustomer(null);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching customer info:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setCustomer(null);
            }
        };

        fetchCustomer();
    }, [currentCall?.callerId, staff?.restaurant_id]);

    // Ringtone - Plays if ANY call is active
    useEffect(() => {
        if (activeCalls.length === 0) return;

        let ctx: AudioContext | null = null;
        let interval: NodeJS.Timeout;
        const startTime = Date.now();
        const DURATION = 5000; // 5 seconds

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            ctx = new AudioContextClass();

            const playRing = () => {
                if (!ctx) return;
                if (Date.now() - startTime > DURATION) {
                    if (interval) clearInterval(interval);
                    if (ctx) ctx.close().catch(e => console.error(e));
                    return;
                }
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.setValueAtTime(480, ctx.currentTime + 0.05);
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
                gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.4);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.41);
                gain.gain.setValueAtTime(0, ctx.currentTime + 0.6);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.61);
                gain.gain.setValueAtTime(0.3, ctx.currentTime + 1.0);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.01);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.1);
            };

            playRing();
            interval = setInterval(playRing, 2000);
            const timeout = setTimeout(() => {
                if (interval) clearInterval(interval);
                if (ctx && ctx.state !== 'closed') ctx.close().catch(e => console.error(e));
            }, DURATION);

            return () => {
                clearTimeout(timeout);
                if (interval) clearInterval(interval);
                if (ctx && ctx.state !== 'closed') ctx.close().catch(e => console.error(e));
            };
        } catch (e) {
            console.error("Web Audio API failed:", e);
        }
    }, [activeCalls.length > 0]);

    if (activeCalls.length === 0) {
        return null;
    }

    const handleStartOrder = () => {
        if (!currentCall) return;
        const callToProcess = currentCall;
        // Remove from queue
        setActiveCalls(prev => prev.filter(c => c !== callToProcess));
        
        navigate('/pos/phone-setup', {
            state: {
                customer: customer || { phone: callToProcess.callerId, full_name: 'Guest Caller' },
                isPhoneOrder: true,
                callLogId: callToProcess.callLogId
            }
        });
    };

    const handleDismiss = () => {
        setActiveCalls(prev => prev.slice(1)); // Remove top call
    };

    return (
        <div className="fixed top-24 right-6 md:right-10 z-[300] flex flex-col items-end pointer-events-none">
            <div className="relative pointer-events-auto group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-gold/40 to-[var(--theme-color)]/40 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                
                <div key={currentCall?.timestamp} className="relative bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-[320px] border border-white/10 overflow-hidden animate-slide-in-right">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[var(--theme-color)]/5 rounded-full blur-3xl"></div>
                    
                    <div className="flex flex-col items-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-[var(--theme-color)]/30 rounded-full animate-pulse-ring"></div>
                            <div className="relative h-16 w-16 bg-[var(--theme-color)] text-white rounded-full flex items-center justify-center shadow-lg shadow-[var(--theme-color)]/20">
                                <Phone size={32} className="animate-bounce" style={{ animationDuration: '2s' }} />
                                {activeCalls.length > 1 && (
                                    <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-gray-900 shadow-lg">
                                        +{activeCalls.length - 1}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-center w-full space-y-1 mb-6">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <p className="text-[10px] font-black text-[var(--theme-color)] uppercase tracking-[0.2em] opacity-80">
                                    {activeCalls.length > 1 ? `Incoming Call (1 of ${activeCalls.length})` : 'Incoming Order Call'}
                                </p>
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{currentCall?.callerId}</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                Received at {new Date(currentCall?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            
                            {loading ? (
                                <div className="flex items-center justify-center gap-2 mt-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                    <div className="w-4 h-4 border-2 border-[var(--theme-color)] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-xs text-gray-400 font-medium">Identifying...</p>
                                </div>
                            ) : customer ? (
                                <div className="mt-4 p-3 bg-gradient-to-br from-white/10 to-transparent rounded-xl border border-white/10 flex items-center gap-3 text-left w-full shadow-inner animate-fade-in">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--theme-color)]/20 text-[var(--theme-color)] flex items-center justify-center flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-[var(--theme-color)] font-bold uppercase tracking-wider">Identified</p>
                                        <p className="text-sm font-bold text-white truncate">{customer.name}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 text-left w-full animate-fade-in">
                                    <div className="w-10 h-10 rounded-lg bg-gray-700 text-gray-400 flex items-center justify-center flex-shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">New Caller</p>
                                        <p className="text-sm font-bold text-gray-300">Guest Order</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button
                                onClick={handleStartOrder}
                                className="relative group w-full h-14 bg-[var(--theme-color)] hover:opacity-90 text-white font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-[var(--theme-color)]/20 active:scale-[0.97]"
                            >
                                <ShoppingCart size={20} className="group-hover:translate-x-1 transition-transform" />
                                <span className="uppercase tracking-widest text-xs">Start New Order</span>
                            </button>
                            
                            <button
                                onClick={handleDismiss}
                                className="w-full h-12 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs border border-white/5 group"
                            >
                                <PhoneOff size={16} className="group-hover:rotate-12 transition-transform" />
                                <span className="uppercase tracking-widest">
                                    {activeCalls.length > 1 ? 'Next Call' : 'Dismiss Call'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
