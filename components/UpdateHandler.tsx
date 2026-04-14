import React, { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useAlert } from '../context/AlertContext';
import { RefreshCcw, ArrowUpCircle, X } from 'lucide-react';

const UpdateHandler: React.FC = () => {
    const { showAlert } = useAlert();
    const [updateAvailable, setUpdateAvailable] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const isTauri = !!(window as any).__TAURI_INTERNALS__;

    useEffect(() => {
        if (!isTauri) return;

        const checkForUpdates = async () => {
            try {
                console.log('🔍 Checking for updates...');
                const update = await check();
                
                if (update) {
                    console.log(`✨ New version available: ${update.version}`);
                    setUpdateAvailable(update);
                }
            } catch (error) {
                console.error('❌ Failed to check for updates:', error);
            }
        };

        // Check on mount
        checkForUpdates();

        // Check every 6 hours
        const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [isTauri]);

    const handleUpdate = async () => {
        if (!updateAvailable) return;

        try {
            setIsUpdating(true);
            setDownloadProgress(0);

            console.log('📥 Downloading update...');
            
            let downloaded = 0;
            let contentLength = 0;

            await updateAvailable.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        console.log(`Started downloading ${contentLength} bytes`);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            setDownloadProgress(Math.round((downloaded / contentLength) * 100));
                        }
                        break;
                    case 'Finished':
                        console.log('Download finished');
                        break;
                }
            });

            console.log('✅ Update installed. Relaunching...');
            await relaunch();
        } catch (error) {
            console.error('❌ Update failed:', error);
            setIsUpdating(false);
            showAlert('Update Failed', 'There was an error installing the update. Please try again later or download manually.', 'error');
        }
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-brand-gold/20 p-5 w-80 overflow-hidden relative">
                {/* Background Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold" />
                
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-brand-gold/10 rounded-xl">
                        <ArrowUpCircle className="w-6 h-6 text-brand-gold" />
                    </div>
                    {!isUpdating && (
                        <button 
                            onClick={() => setUpdateAvailable(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Update Available</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        A new version ({updateAvailable.version}) is ready. Update now to get the latest features and bug fixes.
                    </p>
                </div>

                <div className="mt-6">
                    {isUpdating ? (
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-brand-gold uppercase tracking-wider">
                                <span>Downloading...</span>
                                <span>{downloadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-gold transition-all duration-300 ease-out"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleUpdate}
                            className="w-full bg-brand-gold hover:bg-gold-dark text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
                        >
                            <RefreshCcw size={18} className={isUpdating ? 'animate-spin' : ''} />
                            Update & Restart
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateHandler;
