import React from 'react';
import { Activity } from 'lucide-react';

interface SettingsIntegrationsProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const SettingsIntegrations: React.FC<SettingsIntegrationsProps> = ({ formData, handleChange }) => {
    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Third-Party Integrations</h3>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <div className="p-3 bg-orange-100 rounded-full">
                            <Activity className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="ml-4 flex-1">
                        <h4 className="text-base font-medium text-gray-900">Google Analytics 4 (GA4)</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            Track website traffic and user behavior. Enter your Measurement ID (starts with "G-").
                        </p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Measurement ID
                            </label>
                            <input
                                type="text"
                                name="google_analytics_id"
                                placeholder="G-XXXXXXXXXX"
                                value={formData.google_analytics_id || ''}
                                onChange={handleChange}
                                className="w-full md:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm p-2 border"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Leave blank to disable tracking. Changes may take a few minutes to propagate after saving.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsIntegrations;
