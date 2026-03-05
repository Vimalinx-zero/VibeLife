import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => number;
  removeToast: (id: number) => void;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  info: (message: string, duration?: number) => number;
  warning: (message: string, duration?: number) => number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000): number => {
    const id = Date.now() + Math.random();
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, 'warning', duration), [addToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: number) => void;
}

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: number) => void;
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const icons = {
    success: <FiCheckCircle className="w-5 h-5" />,
    error: <FiAlertCircle className="w-5 h-5" />,
    warning: <FiAlertCircle className="w-5 h-5" />,
    info: <FiInfo className="w-5 h-5" />
  };

  const styles = {
    success: {
      icon: 'text-green-500 dark:text-green-400',
      border: 'border-green-500/30 dark:border-green-400/30',
      bg: 'bg-green-50/95 dark:bg-green-900/20',
      text: 'text-gray-900 dark:text-white'
    },
    error: {
      icon: 'text-red-500 dark:text-red-400',
      border: 'border-red-500/30 dark:border-red-400/30',
      bg: 'bg-red-50/95 dark:bg-red-900/20',
      text: 'text-gray-900 dark:text-white'
    },
    warning: {
      icon: 'text-yellow-500 dark:text-yellow-400',
      border: 'border-yellow-500/30 dark:border-yellow-400/30',
      bg: 'bg-yellow-50/95 dark:bg-yellow-900/20',
      text: 'text-gray-900 dark:text-white'
    },
    info: {
      icon: 'text-blue-500 dark:text-blue-400',
      border: 'border-blue-500/30 dark:border-blue-400/30',
      bg: 'bg-blue-50/95 dark:bg-blue-900/20',
      text: 'text-gray-900 dark:text-white'
    }
  };

  const style = styles[toast.type] || styles.info;

  return (
    <div
      className={`
        pointer-events-auto
        backdrop-blur-md
        border
        rounded-lg
        shadow-lg
        px-4 py-3
        min-w-[300px]
        max-w-md
        flex items-center gap-3
        ${style.bg} ${style.border}
      `}
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {icons[toast.type]}
      </div>
      <div className={`flex-1 text-sm font-medium ${style.text}`}>
        {toast.message}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
};
