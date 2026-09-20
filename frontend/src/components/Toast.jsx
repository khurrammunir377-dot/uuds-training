import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          let border = 'border-blue-500/40 bg-slate-900/95 text-blue-200';
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;

          if (t.type === 'success') {
            border = 'border-emerald-500/50 bg-slate-900/95 text-emerald-200 shadow-glow-valid';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (t.type === 'error') {
            border = 'border-red-500/50 bg-slate-900/95 text-red-200 shadow-glow-overdue';
            icon = <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
          } else if (t.type === 'warning') {
            border = 'border-amber-500/50 bg-slate-900/95 text-amber-200 shadow-glow-warning';
            icon = <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-scale-in ${border}`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <span className="text-sm font-medium">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
