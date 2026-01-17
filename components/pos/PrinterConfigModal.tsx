import React, { useState, useEffect } from 'react';
import { X, Save, Printer, Bluetooth, Wifi, Monitor } from 'lucide-react';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
    paperWidth: '58mm' | '80mm';
}

interface PrinterConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrinterConfigModal: React.FC<PrinterConfigModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<PrinterSettings>({
        type: 'browser',
        networkIp: '',
        paperWidth: '80mm'
    });

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('pos_printer_settings');
            if (saved) {
                try {
                    setSettings(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse printer settings', e);
                }
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('pos_printer_settings', JSON.stringify(settings));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-slideUp md:animate-none">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Printer Configuration
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Printer Type Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            onClick={() => setSettings(s => ({ ...s, type: 'browser' }))}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${settings.type === 'browser'
                                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold font-bold'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <Monitor className="w-6 h-6 mb-2" />
                            <span className="text-xs">Browser</span>
                        </button>
                        <button
                            onClick={() => setSettings(s => ({ ...s, type: 'bluetooth' }))}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${settings.type === 'bluetooth'
                                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold font-bold'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <Bluetooth className="w-6 h-6 mb-2" />
                            <span className="text-xs">Bluetooth</span>
                        </button>
                        <button
                            onClick={() => setSettings(s => ({ ...s, type: 'network' }))}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${settings.type === 'network'
                                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold font-bold'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <Wifi className="w-6 h-6 mb-2" />
                            <span className="text-xs">Network</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Paper Width */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paper Width</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={settings.paperWidth === '58mm'}
                                        onChange={() => setSettings(s => ({ ...s, paperWidth: '58mm' }))}
                                        className="text-brand-gold focus:ring-brand-gold"
                                    />
                                    <span className="text-gray-900 dark:text-gray-200">58mm (Receipt)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={settings.paperWidth === '80mm'}
                                        onChange={() => setSettings(s => ({ ...s, paperWidth: '80mm' }))}
                                        className="text-brand-gold focus:ring-brand-gold"
                                    />
                                    <span className="text-gray-900 dark:text-gray-200">80mm (Wide)</span>
                                </label>
                            </div>
                        </div>

                        {/* Network IP Input */}
                        {settings.type === 'network' && (
                            <div className="animate-fadeIn">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Printer IP Address</label>
                                <input
                                    type="text"
                                    value={settings.networkIp}
                                    onChange={(e) => setSettings(s => ({ ...s, networkIp: e.target.value }))}
                                    placeholder="192.168.1.200"
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                    Note: Direct IP printing from browser requires a local proxy or a printer supporting WebSockets.
                                </p>
                            </div>
                        )}

                        {/* Bluetooth Info */}
                        {settings.type === 'bluetooth' && (
                            <div className="animate-fadeIn text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                You will be prompted to pair a Bluetooth device when you print. Supports ESC/POS.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-brand-dark-gray text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrinterConfigModal;
