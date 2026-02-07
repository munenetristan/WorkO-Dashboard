"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = {
  id: string;
  message: string;
  tone?: "success" | "error" | "info";
};

type ToastContextValue = {
  toasts: Toast[];
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => removeToast(id), 3000);
    },
    [removeToast]
  );

  const value = useMemo(
    () => ({ toasts, pushToast, removeToast }),
    [toasts, pushToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === "success"
                ? "bg-emerald-600 text-white"
                : toast.tone === "error"
                ? "bg-rose-600 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};
