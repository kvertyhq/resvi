import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Web } from 'sip.js';

export interface CallState {
    isRinging: boolean;
    isInCall: boolean;
    callerId: string | null;
    direction: 'inbound' | 'outbound' | null;
}

interface SipContextType {
    isConnected: boolean;
    callState: CallState;
    remoteAudioRef: React.RefObject<HTMLAudioElement>;
    connect: (domain: string, wsUrl: string, username: string, authPass: string) => Promise<void>;
    disconnect: () => Promise<void>;
    error: string | null;
}

const SipContext = createContext<SipContextType | undefined>(undefined);

export const SipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallState>({
        isRinging: false,
        isInCall: false,
        callerId: null,
        direction: null,
    });

    const simpleUserRef = useRef<Web.SimpleUser | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    const connect = async (domain: string, wsUrl: string, username: string, authPass: string) => {
        try {
            const server = `sip:${username}@${domain}`;
            const aor = `sip:${username}@${domain}`;

            const options: Web.SimpleUserOptions = {
                aor,
                media: {
                    remote: {
                        audio: remoteAudioRef.current || undefined,
                    }
                },
                userAgentOptions: {
                    authorizationUsername: username,
                    authorizationPassword: authPass,
                }
            };

            const simpleUser = new Web.SimpleUser(wsUrl, options);

            const delegate: Web.SimpleUserDelegate = {
                onCallReceived: () => {
                    console.log('Incoming call received');
                    // simpleUser.session contains the invitation, but SimpleUser abstracts this
                    // We can access it using an 'any' cast to get the remote identity.
                    const session = (simpleUser as any).session;
                    let remoteNumber = 'Unknown';
                    if (session && session.remoteIdentity) {
                        remoteNumber = session.remoteIdentity.uri.user || 'Unknown';
                    }

                    setCallState({
                        isRinging: true,
                        isInCall: false,
                        callerId: remoteNumber,
                        direction: 'inbound',
                    });
                },
                onCallAnswered: () => {
                    setCallState(s => ({ ...s, isRinging: false, isInCall: true }));
                },
                onCallCreated: () => {
                    // Outbound call created
                    setCallState(s => ({ ...s, isRinging: false, isInCall: true, direction: 'outbound' }));
                },
                onCallHangup: () => {
                    setCallState({ isRinging: false, isInCall: false, callerId: null, direction: null });
                },
                onRegistered: () => {
                    setIsConnected(true);
                    setError(null);
                },
                onUnregistered: () => {
                    setIsConnected(false);
                },
                onServerDisconnect: () => {
                    setIsConnected(false);
                    setError('Lost connection to PBX server');
                }
            };

            simpleUser.delegate = delegate;
            await simpleUser.connect();
            await simpleUser.register();
            simpleUserRef.current = simpleUser;

        } catch (err: any) {
            console.error('SIP Connect error:', err);
            setError(err.message || 'Failed to connect to PBX');
            setIsConnected(false);
        }
    };

    const disconnect = async () => {
        if (simpleUserRef.current) {
            await simpleUserRef.current.unregister();
            await simpleUserRef.current.disconnect();
            simpleUserRef.current = null;
            setIsConnected(false);
        }
    };



    useEffect(() => {
        // Cleanup on unmount
        return () => {
            disconnect();
        };
    }, []);

    return (
        <SipContext.Provider
            value={{
                isConnected,
                callState,
                remoteAudioRef,
                connect,
                disconnect,
                error
            }}
        >
            <audio ref={remoteAudioRef} autoPlay />
            {children}
        </SipContext.Provider>
    );
};

export const useSip = () => {
    const context = useContext(SipContext);
    if (context === undefined) {
        throw new Error('useSip must be used within an SipProvider');
    }
    return context;
};
