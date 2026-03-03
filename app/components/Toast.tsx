"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";

type ToastItem = { id: number; message: string };

type ToastContextValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 1800;
const FADE_MS = 300;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none sm:left-auto sm:right-6 sm:max-w-sm"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            durationMs={TOAST_DURATION_MS}
            fadeMs={FADE_MS}
            onRemove={() => remove(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  id,
  message,
  durationMs,
  fadeMs,
  onRemove,
}: {
  id: number;
  message: string;
  durationMs: number;
  fadeMs: number;
  onRemove: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    const startLeave = setTimeout(() => setLeaving(true), durationMs - fadeMs);
    return () => clearTimeout(startLeave);
  }, [id, durationMs, fadeMs]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(onRemove, fadeMs);
    return () => clearTimeout(t);
  }, [leaving, fadeMs, onRemove]);

  return (
    <div
      className={`
        rounded-lg border border-emerald-800/50 bg-emerald-950/90 px-4 py-2.5 text-sm text-emerald-200 shadow-lg
        transition-opacity duration-[300ms] ease-out
        ${visible && !leaving ? "opacity-100" : "opacity-0"}
      `}
    >
      {message}
    </div>
  );
}
