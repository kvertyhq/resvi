import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface MessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, title, message, type = 'info' }) => {
    if (!isOpen) return null;

    const getColor = () => {
        switch (type) {
            case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-8 h-8" />;
            case 'error': return <AlertCircle className="w-8 h-8" />;
            default: return <AlertCircle className="w-8 h-8" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${getColor()}`}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-serif">
                        {title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-[var(--brand-gold,theme('colors.yellow.600'))] hover:opacity-90 text-white font-bold rounded-lg transition-all"
                    >
                        Okay
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
