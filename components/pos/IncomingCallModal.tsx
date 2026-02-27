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
    const { callState } = useSip();
    const [customer, setCustomer] = useState<CustomerInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCustomer = async () => {
            if (callState.isRinging && callState.direction === 'inbound' && callState.callerId) {
                setLoading(true);
                try {
                    // Attempt to find customer by phone number
                    const { data, error } = await supabase
                        .from('customers')
                        .select('id, name, phone, email')
                        .eq('phone', callState.callerId)
                        .single();

                    if (!error && data) {
                        setCustomer(data);
                    } else {
                        setCustomer(null); // Unknown customer
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

        if (!callState.isRinging) {
            setIsDismissed(false); // Reset dismiss state when ringing stops
        }

        fetchCustomer();
    }, [callState.isRinging, callState.direction, callState.callerId]);

    if (!callState.isRinging || callState.direction !== 'inbound' || isDismissed) {
        return null;
    }

    const handleStartOrder = () => {
        // Just hide locally - do not accept audio. 
        // The desk phone will handle the actual audio call.
        setIsDismissed(true);
        navigate('/pos/order/walk-in', {
            state: {
                customer: customer || { phone: callState.callerId, name: '' },
                isPhoneOrder: true
            }
        });
    };

    const handleDismiss = () => {
        // Locally hide the popup so the user can continue POS tasks.
        // It does not reject the SIP call, so desk phones keep ringing.
        setIsDismissed(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-2 border-brand-gold">
                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <Phone size={32} />
                    </div>

                    <h2 className="text-2xl font-bold mb-1 text-center text-gray-800">Incoming Call</h2>

                    <div className="text-center mb-6">
                        <p className="text-xl font-mono text-gray-600">{callState.callerId}</p>
                        {loading ? (
                            <p className="text-sm text-gray-500 mt-2">Looking up customer...</p>
                        ) : customer ? (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center justify-center gap-2 text-green-800">
                                <User size={18} />
                                <span className="font-semibold">{customer.name}</span>
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-500 mt-2 bg-gray-100 p-2 rounded-lg inline-block">Unknown Caller</p>
                        )}
                    </div>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={handleStartOrder}
                            className="flex-1 py-3 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                        >
                            <User size={20} className="animate-pulse" />
                            Start Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
