import React, { useEffect, useState } from 'react';
import { useSip } from '../../context/SipContext';
import { supabase } from '../../supabaseClient';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerInfo {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

export const IncomingCallModal: React.FC = () => {
    const { callState: sipCallState } = useSip();
    const [realtimeCall, setRealtimeCall] = useState<{ callerId: string } | null>(null);
    const [customer, setCustomer] = useState<CustomerInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const navigate = useNavigate();

    // Supabase Realtime Listener
    useEffect(() => {
        const channel = supabase
            .channel('call_logs_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'call_logs',
                filter: 'direction=eq.inbound'
            }, (payload: any) => {
                console.log('New incoming call detected via Realtime:', payload);
                setRealtimeCall({ callerId: payload.new.caller_number });
                setIsDismissed(false); // Reset dismiss state for new call
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Derived State: Is there any ringing call?
    const isRinging = sipCallState.isRinging || (realtimeCall !== null && !isDismissed);
    const currentCallerId = sipCallState.callerId || realtimeCall?.callerId;

    useEffect(() => {
        const fetchCustomer = async () => {
            if (isRinging && currentCallerId) {
                setLoading(true);
                try {
                    // Attempt to find customer in profiles by phone number
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('id, full_name, phone, email')
                        .eq('phone', currentCallerId)
                        .single();

                    if (!error && data) {
                        setCustomer({
                            id: data.id,
                            name: data.full_name || 'Guest',
                            phone: data.phone || currentCallerId
                        });
                    } else {
                        setCustomer(null);
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

        if (!isRinging) {
            setIsDismissed(false);
            setRealtimeCall(null);
        }

        fetchCustomer();
    }, [isRinging, currentCallerId]);

    // Web Audio Ringtone - Limited to 5 seconds
    useEffect(() => {
        if (!isRinging || isDismissed) return;

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
            interval = setInterval(playRing, 2000); // Repeat more frequently for the 5s window

            // Hard stop after 5 seconds
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
    }, [isRinging, isDismissed]);

    if (!isRinging || isDismissed) {
        return null;
    }

    const handleStartOrder = () => {
        setIsDismissed(true);
        navigate('/pos/phone-setup', {
            state: {
                customer: customer || { phone: currentCallerId, full_name: 'Guest Caller' },
                isPhoneOrder: true
            }
        });
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setRealtimeCall(null);
    };

    return (
        <div className="fixed top-20 right-4 md:right-8 z-[100] flex flex-col items-end pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border-2 border-brand-gold pointer-events-auto transform transition-all translate-x-0">
                <div className="flex flex-col items-center">
                    <div className="h-14 w-14 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <Phone size={28} />
                    </div>

                    <h2 className="text-xl font-bold mb-1 text-center text-gray-800 dark:text-white">Incoming Call</h2>

                    <div className="text-center mb-6 w-full">
                        <p className="text-lg font-mono text-gray-600 dark:text-gray-300 font-bold tracking-wider">{currentCallerId}</p>
                        {loading ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Looking up customer...</p>
                        ) : customer ? (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center gap-2 text-green-800 dark:text-green-300 w-full overflow-hidden">
                                <User size={18} className="flex-shrink-0" />
                                <span className="font-semibold truncate">{customer.name}</span>
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg inline-block w-full text-center">Unknown Caller</p>
                        )}
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 px-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleStartOrder}
                            className="flex-1 py-3 px-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 text-sm"
                        >
                            <User size={18} className="animate-pulse" />
                            Start Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

