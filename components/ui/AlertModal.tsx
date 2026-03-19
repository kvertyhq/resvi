import React from 'react';

export type AlertType = 'info' | 'error' | 'success' | 'warning';

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, title, message, type, isConfirm, onConfirm, onClose }) => {
  if (!isOpen) return null;

  const mode = import.meta.env.VITE_APP_MODE;
  const isPos = mode === 'pos';

  const typeConfig = {
    info: { icon: 'ℹ️', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    error: { icon: '❌', bg: 'bg-red-50 dark:bg-red-900/20' },
    success: { icon: '✅', bg: 'bg-green-50 dark:bg-green-900/20' },
    warning: { icon: '⚠️', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  };

  const config = typeConfig[type] || typeConfig.info;

  // Render different styles based on POS mode
  if (isPos) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all animate-slide-up">
          <div className="flex flex-col items-center text-center p-8 bg-gray-900">
            <div className="text-6xl mb-4">{config.icon}</div>
            <h3 className={`text-3xl font-black uppercase tracking-wider mb-2 ${
                type === 'error' ? 'text-red-400' :
                type === 'warning' ? 'text-yellow-400' :
                type === 'success' ? 'text-green-400' : 'text-blue-400'
              }`}>{title}</h3>
            {message && <p className="text-gray-300 text-lg leading-relaxed">{message}</p>}
          </div>
          <div className="p-4 bg-gray-800 flex gap-4">
            {isConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-700 text-white font-bold text-2xl py-4 rounded-xl shadow-lg active:scale-95 transition-all text-center uppercase tracking-wider focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  style={{ backgroundColor: 'var(--theme-color)' }}
                  className="flex-[2] text-white font-bold text-2xl py-4 rounded-xl shadow-lg active:scale-95 transition-all text-center uppercase tracking-wider focus:outline-none"
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                style={{ backgroundColor: 'var(--theme-color)' }}
                className="w-full text-white font-bold text-2xl py-4 rounded-xl shadow-lg active:scale-95 transition-all text-center uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-gray-500"
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin / Web Mode (Standard look)
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden w-full max-w-sm transform transition-all animate-slide-up border border-gray-200 dark:border-gray-700">
        <div className="flex items-start p-5 gap-4">
          <div className="text-2xl mt-0.5 flex-shrink-0">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 break-words">{title}</h3>
            {message && <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{message}</p>}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-3 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          {isConfirm ? (
            <>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 font-medium px-6 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                style={{ backgroundColor: 'var(--theme-color, #c9a96e)' }}
                className="text-white font-medium px-6 py-2 rounded-lg shadow hover:brightness-110 active:scale-95 transition-all focus:outline-none"
              >
                Confirm
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{ backgroundColor: 'var(--theme-color, #c9a96e)' }}
              className="text-white font-medium px-6 py-2 rounded-lg shadow hover:brightness-110 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
