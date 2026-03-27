import React, { useState, useEffect } from 'react';
import { X, Save, Printer, Bluetooth, Wifi, Monitor, Search, Loader2, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAlert } from '../../context/AlertContext';

interface PrinterSettings {
    type: 'browser' | 'bluetooth' | 'network';
    networkIp?: string;
    paperWidth: '58mm' | '80mm';
}

interface OrderPrinterSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OrderPrinterSettingsModal: React.FC<OrderPrinterSettingsModalProps> = ({ isOpen, onClose }) => {
    const { showAlert } = useAlert();
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
        showAlert('Success', 'Printer settings saved locally.', 'success');
        onClose();
    };

    const handleScan = async () => {
        if (!(window as any).__TAURI_INTERNALS__) {
            showAlert('Not Available', 'Network scanning is only available in the desktop application.', 'info');
            return;
        }
        setIsScanning(true);
        try {
            const printers = await invoke('scan_network_printers') as any[];
            setDiscoveredPrinters(printers);
        } catch (error) {
            console.error('Scan failed:', error);
            showAlert('Scan Error', 'Failed to scan for network printers.', 'error');
        } finally {
            setIsScanning(false);
        }
    };

    const handleTestPrint = async () => {
        if (!(window as any).__TAURI_INTERNALS__) {
            showAlert('Not Available', 'Direct network printing is only available in the desktop application.', 'info');
            return;
        }
        if (!settings.networkIp) {
            showAlert('Error', 'Please provide a printer IP address.', 'error');
            return;
        }
        setIsPrintingTest(true);
        try {
            const encoder = new TextEncoder();
            const data = [
                ...[27, 64], // Initialize
                ...[27, 97, 1], // Center
                ...encoder.encode("ADMIN TEST PRINT\n"),
                ...encoder.encode("--------------------------------\n"),
                ...encoder.encode("Printer Connection: OK\n"),
                ...encoder.encode(`Width: ${settings.paperWidth}\n`),
                ...encoder.encode("\n\n\n"), // Feed
                ...[29, 86, 66, 0] // Cut
            ];

            await invoke('print_raw_to_network', {
                ip: settings.networkIp,
                port: 9100,
                data: Array.from(new Uint8Array(data))
            });
            showAlert('Success', 'Test print sent to printer.', 'success');
        } catch (error: any) {
            console.error('Test print failed:', error);
            showAlert('Test Failed', `Failed to send print job: ${error.message || error}`, 'error');
        } finally {
            setIsPrintingTest(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Printer className="w-6 h-6 text-brand-gold" />
                            Printer Setup
                        </h3>
                        <p className="text-sm text-gray-500">Configure your local hardware printer</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Printer Type */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Connection Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'browser', icon: Monitor, label: 'Standard' },
                                { id: 'bluetooth', icon: Bluetooth, label: 'Bluetooth' },
                                { id: 'network', icon: Wifi, label: 'LAN' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSettings(s => ({ ...s, type: type.id as any }))}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${settings.type === type.id
                                        ? 'border-brand-gold bg-brand-gold/5 text-brand-gold ring-1 ring-brand-gold'
                                        : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                                        }`}
                                >
                                    <type.icon className="w-6 h-6" />
                                    <span className="text-xs font-bold">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Paper Width */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Paper Width</label>
                        <div className="flex gap-4">
                            {['58mm', '80mm'].map((width) => (
                                <label key={width} className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="radio"
                                        checked={settings.paperWidth === width}
                                        onChange={() => setSettings(s => ({ ...s, paperWidth: width as any }))}
                                        className="w-4 h-4 text-brand-gold border-gray-300 focus:ring-brand-gold"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{width} Width</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Network Configuration */}
                    {settings.type === 'network' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Printer IP Address</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={settings.networkIp}
                                        onChange={(e) => setSettings(s => ({ ...s, networkIp: e.target.value }))}
                                        placeholder="192.168.1.100"
                                        className="flex-1 p-3 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold outline-none transition-all placeholder:text-gray-300"
                                    />
                                    <button
                                        onClick={handleScan}
                                        disabled={isScanning}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200 font-medium"
                                    >
                                        {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        Scan
                                    </button>
                                </div>
                            </div>

                            {discoveredPrinters.length > 0 && (
                                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 max-h-32 overflow-y-auto">
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 px-1">Nearby Printers</p>
                                    <div className="space-y-1">
                                        {discoveredPrinters.map(p => (
                                            <button
                                                key={p.ip}
                                                onClick={() => setSettings(s => ({ ...s, networkIp: p.ip }))}
                                                className="w-full text-left text-sm p-2 hover:bg-blue-100/50 rounded-md flex justify-between items-center transition-colors group"
                                            >
                                                <span className="font-mono text-blue-700">{p.ip}</span>
                                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">SELECT</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleTestPrint}
                                disabled={isPrintingTest || !settings.networkIp}
                                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:border-brand-gold hover:text-brand-gold hover:bg-brand-gold/5 transition-all"
                            >
                                {isPrintingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                Test Printer Connection
                            </button>
                        </div>
                    )}

                    {settings.type === 'browser' && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
                            <span className="text-xl">💡</span>
                            <p className="text-xs text-orange-800 leading-relaxed font-medium">
                                Standard mode uses your browser's print dialog. Best for standard A4 or desktop thermal printers with drivers.
                            </p>
                        </div>
                    )}

                    {settings.type === 'bluetooth' && (
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 animate-in slide-in-from-top-2">
                            <span className="text-xl">📱</span>
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                Bluetooth printing will prompt you to pick a pairable ESC/POS device when you initiate a print.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] flex items-center justify-center gap-2 bg-brand-dark-gray text-white px-4 py-3 rounded-xl hover:bg-gray-900 transition-all font-bold shadow-lg shadow-gray-200"
                    >
                        <Save className="w-5 h-5" />
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderPrinterSettingsModal;
