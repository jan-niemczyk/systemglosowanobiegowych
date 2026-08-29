"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "danger";
type ToastItem = { id: number; kind: ToastKind; text: string };

const ToastContext = createContext<{ success: (text: string) => void; error: (text: string) => void } | null>(null);

/** Komunikaty sukcesu/porażki (klasyczny Bootstrap alert-success/alert-danger) jako
 * pływający stos w rogu ekranu - działa niezależnie od tego, gdzie w drzewie znajduje
 * się przycisk wywołujący akcję, i przetrwa nawigację w obrębie tego samego layoutu. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((kind: ToastKind, text: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const ctx = useMemo(() => ({
    success: (text: string) => show("success", text),
    error: (text: string) => show("danger", text),
  }), [show]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toasts.length > 0 && (
        <div className="position-fixed top-0 end-0 p-3 d-flex flex-column gap-2" style={{ zIndex: 1080, maxWidth: 380 }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`alert alert-${t.kind} alert-dismissible shadow-sm slide-in mb-0`}
              role="alert"
              style={{ whiteSpace: "pre-line" }}
            >
              {t.text}
              <button type="button" className="btn-close" aria-label="Zamknij" onClick={() => dismiss(t.id)} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() musi być użyte wewnątrz <ToastProvider>");
  return ctx;
}
