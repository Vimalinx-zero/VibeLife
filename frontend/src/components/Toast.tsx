import { motion } from "framer-motion";

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Icons = {
  Success: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  Error: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  ),
};

const ToastStyles: Record<ToastType, { icon: string; border: string; bg: string }> = {
  success: {
    icon: 'text-green-500 dark:text-green-400',
    border: 'border-green-500/30 dark:border-green-400/30',
    bg: 'bg-green-50/90 dark:bg-green-900/20'
  },
  error: {
    icon: 'text-red-500 dark:text-red-400',
    border: 'border-red-500/30 dark:border-red-400/30',
    bg: 'bg-red-50/90 dark:bg-red-900/20'
  },
  info: {
    icon: 'text-blue-500 dark:text-blue-400',
    border: 'border-blue-500/30 dark:border-blue-400/30',
    bg: 'bg-blue-50/90 dark:bg-blue-900/20'
  },
  warning: {
    icon: 'text-yellow-500 dark:text-yellow-400',
    border: 'border-yellow-500/30 dark:border-yellow-400/30',
    bg: 'bg-yellow-50/90 dark:bg-yellow-900/20'
  },
};

const Toast = ({ message, type = 'info', duration = 3000, onClose }: ToastProps) => {
  const style = ToastStyles[type] || ToastStyles.info;
  const iconName = type.charAt(0).toUpperCase() + type.slice(1) as keyof typeof Icons;
  const Icon = Icons[iconName] || Icons.Info;

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => {
      onClose();
    }, duration);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${style.border} ${style.bg} backdrop-blur-md shadow-lg max-w-md`}
    >
      <span className={style.icon}>
        <Icon />
      </span>
      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
        {message}
      </span>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <Icons.Close />
      </button>
    </motion.div>
  );
};

export default Toast;
