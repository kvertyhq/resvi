import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AlertModal, { AlertType } from '../components/ui/AlertModal';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  isConfirm?: boolean;
  isPrompt?: boolean;
  inputType?: string;
  resolve?: (value: boolean) => void;
  promptResolve?: (value: string | null) => void;
}

interface AlertContextProps {
  showAlert: (title: string, message?: string, type?: AlertType) => void;
  showConfirm: (title: string, message?: string, type?: AlertType) => Promise<boolean>;
  showPrompt: (title: string, message?: string, type?: AlertType, inputType?: string) => Promise<string | null>;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextProps | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = useCallback((title: string, message: string = '', type: AlertType = 'info') => {
    setAlert({ isOpen: false, title: '', message: '', type: 'info' }); // Reset first
    setTimeout(() => {
        setAlert({ isOpen: true, title, message, type, isConfirm: false });
    }, 10);
  }, []);

  const showConfirm = useCallback((title: string, message: string = '', type: AlertType = 'warning'): Promise<boolean> => {
    return new Promise((resolve) => {
      setAlert({
        isOpen: true,
        title,
        message,
        type,
        isConfirm: true,
        resolve
      });
    });
  }, []);

  const showPrompt = useCallback((title: string, message: string = '', type: AlertType = 'info', inputType: string = 'text'): Promise<string | null> => {
    return new Promise((resolve) => {
      setAlert({
        isOpen: true,
        title,
        message,
        type,
        isPrompt: true,
        inputType,
        promptResolve: resolve
      });
    });
  }, []);

  const hideAlert = useCallback(() => {
    if (alert.isConfirm && alert.resolve) {
      alert.resolve(false);
    }
    if (alert.isPrompt && alert.promptResolve) {
      alert.promptResolve(null);
    }
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, [alert]);

  const handleConfirm = useCallback(() => {
    if (alert.resolve) {
      alert.resolve(true);
    }
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, [alert]);

  const handlePromptConfirm = useCallback((value: string) => {
    if (alert.promptResolve) {
      alert.promptResolve(value);
    }
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, [alert]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showPrompt, hideAlert }}>
      {children}
      <AlertModal
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        isConfirm={alert.isConfirm}
        isPrompt={alert.isPrompt}
        inputType={alert.inputType}
        onConfirm={handleConfirm}
        onPromptConfirm={handlePromptConfirm}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
