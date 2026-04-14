import React from 'react';
import { Layout, Monitor, ClipboardList, PhoneIncoming } from 'lucide-react';

interface POSSettings {
    show_tables: boolean;
    show_kds: boolean;
    show_reports: boolean;
    show_calls: boolean;
    auto_complete_minutes?: number;
}

interface SettingsPOSProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const SettingsPOS: React.FC<SettingsPOSProps> = ({ formData, setFormData }) => {
    const posSettings: POSSettings = formData.pos_settings || {
        show_tables: true,
        show_kds: true,
        show_reports: true,
        show_calls: true
    };

    const handleToggle = (key: keyof POSSettings) => {
        setFormData((prev: any) => ({
            ...prev,
            pos_settings: {
                ...posSettings,
                [key]: !posSettings[key]
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-brand-gold" />
                    POS Feature Visibility
                </h4>
                <p className="text-sm text-gray-500 mb-6 font-medium">
                    Control which features are visible in the POS application interface for this restaurant.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    {/* Tables Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-brand-gold/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                                <Layout size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold dark:text-white">Dine-In / Floor Plan</p>
                                <p className="text-xs text-gray-500">Show/Hide table management and floor plans</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('show_tables')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${posSettings.show_tables !== false ? 'bg-brand-gold' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${posSettings.show_tables !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* KDS Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-brand-gold/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                <Layout size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold dark:text-white">Kitchen Display System (KDS)</p>
                                <p className="text-xs text-gray-500">Show/Hide the KDS kitchen ticket interface</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('show_kds')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${posSettings.show_kds ? 'bg-brand-gold' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${posSettings.show_kds ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Reports Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-brand-gold/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                <ClipboardList size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold dark:text-white">POS Reports & History</p>
                                <p className="text-xs text-gray-500">Enable access to daily reports and order history in POS</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('show_reports')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${posSettings.show_reports ? 'bg-brand-gold' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${posSettings.show_reports ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Calls Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-brand-gold/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                                <PhoneIncoming size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold dark:text-white">Call History</p>
                                <p className="text-xs text-gray-500">Show incoming call logs and customer lookup</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleToggle('show_calls')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${posSettings.show_calls ? 'bg-brand-gold' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${posSettings.show_calls ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Automation Section */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-brand-gold" />
                    Automation
                </h4>
                <p className="text-sm text-gray-500 mb-6 font-medium">
                    Automate order management workflows to keep the dashboard clean.
                </p>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold dark:text-white">Auto-complete Orders</p>
                            <p className="text-xs text-gray-500">Mark orders as completed after a chosen duration (minutes). 0 to disable.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={posSettings.auto_complete_minutes || 0}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        pos_settings: {
                                            ...posSettings,
                                            auto_complete_minutes: val
                                        }
                                    }));
                                }}
                                className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-brand-gold outline-none"
                                min="0"
                            />
                            <span className="text-xs font-medium text-gray-500">minutes</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPOS;
