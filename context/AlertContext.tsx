import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import AlertModal, { AlertType } from '../components/ui/AlertModal';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
}

interface AlertContextProps {
  showAlert: (title: string, message?: string, type?: AlertType) => void;
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
    setAlert({ isOpen: true, title, message, type });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <AlertModal
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        type={alert.type}
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
