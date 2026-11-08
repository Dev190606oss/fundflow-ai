import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirmModal: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  };

  const confirmModal = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    try {
      setConfirmLoading(true);
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirmModal }}>
      {children}

      {/* Accessible Toast Container */}
      <div
        aria-live="polite"
        role="status"
        className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg transition-all transform duration-200 text-xs font-medium ${
              t.type === 'success'
                ? 'bg-white text-emerald-900 border-emerald-200'
                : t.type === 'error'
                ? 'bg-white text-rose-900 border-rose-200'
                : 'bg-white text-neutral-900 border-neutral-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />}
              {t.type === 'error' && <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />}
              {t.type === 'info' && <Info size={16} className="text-teal-600 flex-shrink-0" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-neutral-700 ml-3 p-0.5 rounded transition"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Accessible Confirmation Modal */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
        >
          <div className="fintech-card w-full max-w-sm p-5 space-y-4 bg-white shadow-xl">
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-neutral-900">
              {confirmState.title}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmState.message}</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={confirmLoading}
                onClick={() => setConfirmState(null)}
                className="btn-secondary"
              >
                {confirmState.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={confirmLoading}
                onClick={handleConfirmAction}
                className={`btn-primary ${
                  confirmState.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
                    : ''
                }`}
              >
                {confirmLoading ? 'Processing...' : confirmState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
