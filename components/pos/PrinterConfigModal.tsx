import React, { useState, useEffect } from 'react';
import { X, Save, Printer, Bluetooth, Wifi, Monitor, Search, Loader2, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

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
    const [discoveredPrinters, setDiscoveredPrinters] = useState<{ ip: string, port: number }[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isPrintingTest, setIsPrintingTest] = useState(false);

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

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const printers = await invoke('scan_network_printers') as any[];
            setDiscoveredPrinters(printers);
        } catch (error) {
            console.error('Scan failed:', error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleTestPrint = async () => {
        if (!settings.networkIp) return;
        setIsPrintingTest(true);
        try {
            // Simple ESC/POS Test Receipt
            const encoder = new TextEncoder();
            const data = [
                ...[27, 64], // Initialize
                ...[27, 97, 1], // Center
                ...encoder.encode("RESVI TEST PRINT\n"),
                ...encoder.encode("--------------------------------\n"),
                ...encoder.encode("If you see this, your\n"),
                ...encoder.encode("LAN printer is working!\n"),
                ...encoder.encode("\n\n\n"), // Feed
                ...[29, 86, 66, 0] // Cut
            ];

            await invoke('print_raw_to_network', { 
                ip: settings.networkIp, 
                port: 9100, 
                data: Array.from(new Uint8Array(data)) 
            });
        } catch (error) {
            console.error('Test print failed:', error);
        } finally {
            setIsPrintingTest(false);
        }
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
                            <div className="animate-fadeIn space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Printer IP Address</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={settings.networkIp}
                                            onChange={(e) => setSettings(s => ({ ...s, networkIp: e.target.value }))}
                                            placeholder="192.168.1.200"
                                            className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button
                                            onClick={handleScan}
                                            disabled={isScanning}
                                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            Scan
                                        </button>
                                    </div>
                                </div>

                                {discoveredPrinters.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto">
                                        <p className="text-xs font-bold text-gray-500 mb-2">Discovered Printers:</p>
                                        <div className="space-y-1">
                                            {discoveredPrinters.map(p => (
                                                <button
                                                    key={p.ip}
                                                    onClick={() => setSettings(s => ({ ...s, networkIp: p.ip }))}
                                                    className="w-full text-left text-sm p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded flex justify-between items-center"
                                                >
                                                    <span className="font-mono">{p.ip}</span>
                                                    <span className="text-[10px] bg-green-100 text-green-800 px-1.5 rounded">Port 9100</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={handleTestPrint}
                                        disabled={isPrintingTest || !settings.networkIp}
                                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-all"
                                    >
                                        {isPrintingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                        Run Test Print
                                    </button>
                                </div>

                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 italic">
                                    Make sure your printer is on the same network and port 9100 is open.
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
