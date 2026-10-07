"use client";

/**
 * Minimal toast system (no dependency).
 *
 * Usage: `const toast = useToast(); toast.success("Added to wishlist")`.
 * Toasts auto-dismiss and stack in the bottom-center, Airbnb-style.
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, variant }]);
    // Auto-dismiss after 3.5s.
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (message) => show(message, "success"),
    error: (message) => show(message, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport: fixed, bottom-center, above everything. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-modal"
          >
            <span
              className={
                toast.variant === "error" ? "text-rausch" : "text-emerald-400"
              }
              aria-hidden
            >
              ●
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
