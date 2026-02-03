import React from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, type, title, message }) => {
    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle className="h-16 w-16 text-green-500" />,
        error: <XCircle className="h-16 w-16 text-red-500" />,
        info: <AlertCircle className="h-16 w-16 text-blue-500" />
    };

    const colors = {
        success: 'bg-green-50 dark:bg-green-900/20',
        error: 'bg-red-50 dark:bg-red-900/20',
        info: 'bg-blue-50 dark:bg-blue-900/20'
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`p-8 ${colors[type]}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4">
                            {icons[type]}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {title}
                        </h3>
                        {message && (
                            <p className="text-gray-600 dark:text-gray-400">
                                {message}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: 'var(--theme-color)' }}
                        className="w-full py-3 rounded-xl text-white font-bold hover:brightness-110 transition-all shadow-lg"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
