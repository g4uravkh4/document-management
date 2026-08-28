'use client';

import { createContext, useCallback, useContext, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${counterRef.current++}`;
    const toast: Toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    // auto dismiss after 4s (error stays a bit longer)
    const duration = type === 'error' ? 5000 : 4000;
    setTimeout(() => {
      dismiss(id);
    }, duration);
  }, [dismiss]);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);

  const toast = { success, error, info, warning };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

// Also allow destructured usage: const { toast } = useToastContext()
export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:bottom-4 sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-500',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-500',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${config.bg}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} />
      <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-1 opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
