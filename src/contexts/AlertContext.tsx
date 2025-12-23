import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CustomAlert } from '../components/CustomAlert';

type AlertType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<AlertOptions | null>(null);

    const showAlert = useCallback((opts: AlertOptions) => {
        setOptions(opts);
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            {options && (
                <CustomAlert
                    visible={visible}
                    title={options.title}
                    message={options.message}
                    type={options.type}
                    confirmText={options.confirmText}
                    cancelText={options.cancelText}
                    onConfirm={options.onConfirm}
                    onCancel={options.onCancel}
                    onClose={hideAlert}
                />
            )}
        </AlertContext.Provider>
    );
};
