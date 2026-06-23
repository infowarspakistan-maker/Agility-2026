import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
    url?: string;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastMessage['action']) => void;
  success: (message: string, duration?: number, action?: ToastMessage['action']) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number, action?: ToastMessage['action']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration = 5000,
      action?: ToastMessage['action']
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type, duration, action }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, duration = 5000, action?: ToastMessage['action']) => {
      showToast(message, 'success', duration, action);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration = 6000) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration = 5000, action?: ToastMessage['action']) => {
      showToast(message, 'info', duration, action);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, removeToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-full bg-white text-slate-800 rounded-2xl shadow-xl shadow-slate-100/50 border border-slate-100 p-4.5 flex gap-3.5 relative overflow-hidden group"
            >
              {/* Type Indicator Accent Bar */}
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  toast.type === 'success' ? 'bg-emerald-500' :
                  toast.type === 'error' ? 'bg-rose-500' :
                  'bg-orange-500'
                }`}
              />

              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-orange-500" />}
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0 pr-4">
                <p className="text-xs font-semibold leading-relaxed text-slate-800">
                  {toast.message}
                </p>

                {toast.action && (
                  <div className="mt-2.5">
                    {toast.action.url ? (
                      <a
                        href={toast.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-all hover:opacity-85 ${
                          toast.type === 'success' ? 'text-emerald-600' :
                          toast.type === 'error' ? 'text-rose-600' :
                          'text-orange-600'
                        }`}
                      >
                        <span>{toast.action.label}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          toast.action?.onClick();
                          removeToast(toast.id);
                        }}
                        className={`text-[11px] font-bold uppercase tracking-wider hover:opacity-85 ${
                          toast.type === 'success' ? 'text-emerald-600' :
                          toast.type === 'error' ? 'text-rose-600' :
                          'text-orange-600'
                        }`}
                      >
                        {toast.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 self-start text-slate-300 hover:text-slate-600 p-0.5 transition-colors rounded-lg hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
