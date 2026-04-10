import React from 'react';
import { PhoneIncoming, Globe } from 'lucide-react';

interface CallerIDConfig {
    did?: string;
    domain?: string;
}

interface SettingsCallerIDProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const SettingsCallerID: React.FC<SettingsCallerIDProps> = ({ formData, setFormData }) => {
    const callerIdConfig: CallerIDConfig = formData.caller_id_config || {
        did: '',
        domain: ''
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            caller_id_config: {
                ...callerIdConfig,
                [name]: value
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <PhoneIncoming className="w-4 h-4 text-brand-gold" />
                    Caller ID Configuration
                </h4>
                <p className="text-sm text-gray-500 mb-6 font-medium">
                    Configure your SIP trunk settings for incoming calls and caller identification.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* DID Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-wide">
                            DID Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <PhoneIncoming className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="did"
                                value={callerIdConfig.did || ''}
                                onChange={handleChange}
                                placeholder="e.g. 441234567890"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors"
                            />
                        </div>
                        <p className="text-xs text-gray-400">The direct inward dialing number for this restaurant.</p>
                    </div>

                    {/* Domain Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-wide">
                            SIP Domain
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Globe className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="domain"
                                value={callerIdConfig.domain || ''}
                                onChange={handleChange}
                                placeholder="e.g. sip.provider.com"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-brand-gold focus:border-brand-gold sm:text-sm bg-white dark:bg-gray-800 dark:text-white transition-colors"
                            />
                        </div>
                        <p className="text-xs text-gray-400">The SIP domain or server address for call routing.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsCallerID;
