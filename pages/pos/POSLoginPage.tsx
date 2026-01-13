import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { useSettings } from '../../context/SettingsContext';
import { useNavigate } from 'react-router-dom';

const POSLoginPage: React.FC = () => {
    const [pin, setPin] = useState('');
    const { login } = usePOS();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [error, setError] = useState(false);

    // Default to orange if no theme color set
    const themeColor = settings?.theme_color || '#f97316';
    const [processing, setProcessing] = useState(false);

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError(false);
        }
    };

    const handleClear = () => {
        setPin('');
        setError(false);
    };

    const handleEnter = async () => {
        if (pin.length < 4) return;

        setProcessing(true);
        const success = await login(pin);
        setProcessing(false);

        if (success) {
            navigate('/pos'); // Go to dashboard
        } else {
            setError(true);
            setPin('');
            // Shake effect is handled by CSS class conditionally
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 items-center justify-center font-sans text-white" style={{ '--theme-color': themeColor } as React.CSSProperties}>
            <div className="w-full max-w-sm flex flex-col items-center gap-8">

                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-widest uppercase">Staff Access</h1>
                    <p className="text-gray-400 mt-2">Enter your 4-digit PIN</p>
                </div>

                <div className="flex gap-4 mb-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'scale-125' : 'bg-gray-700'}`} style={i < pin.length ? { backgroundColor: 'var(--theme-color)' } : {}} />
                    ))}
                </div>

                {error && <div className="text-red-500 font-bold animate-pulse">Invalid PIN</div>}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 w-full px-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="bg-gray-800 hover:bg-gray-700 active:bg-[var(--theme-color)] rounded-2xl p-6 text-2xl font-bold shadow-lg transition-all"
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        onClick={handleClear}
                        className="bg-gray-800 hover:bg-red-900 rounded-2xl p-6 text-xl font-bold text-red-400 shadow-lg transition-all flex items-center justify-center"
                    >
                        CLR
                    </button>

                    <button
                        onClick={() => handleNumberClick(0)}
                        className="bg-gray-800 hover:bg-gray-700 active:bg-[var(--theme-color)] rounded-2xl p-6 text-2xl font-bold shadow-lg transition-all"
                    >
                        0
                    </button>

                    <button
                        onClick={handleEnter}
                        className="bg-green-600 hover:bg-green-500 rounded-2xl p-6 text-xl font-bold text-white shadow-lg transition-all flex items-center justify-center"
                    >
                        GO
                    </button>
                </div>

                {processing && <div className="text-gray-500">Verifying...</div>}

                <div className="mt-8 text-xs text-gray-600">
                    Resvi POS System v1.0
                </div>
            </div>
        </div>
    );
};

export default POSLoginPage;
