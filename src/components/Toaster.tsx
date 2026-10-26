"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { onToast, type ToastItem } from "@/lib/toast";

const DURATION_MS = 5000;

export function Toaster() {
  const [toast, setToast] = useState<ToastItem | null>(null);

  useEffect(() => onToast(setToast), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className="toast-in pointer-events-auto flex w-full max-w-[398px] items-center gap-3 rounded-2xl bg-toast-bg py-2 pl-4 pr-2 text-toast-text shadow-float"
        >
          {toast.tone === "error" ? (
            <CircleAlert aria-hidden size={20} className="shrink-0 text-toast-error" />
          ) : (
            <CircleCheck aria-hidden size={20} className="shrink-0 text-toast-ok" />
          )}
          <p className="min-w-0 flex-1 py-1.5 text-sm">{toast.message}</p>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.onClick();
                setToast(null);
              }}
              className="pressable min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-toast-accent hover:bg-toast-text/10"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="ปิดข้อความ"
            className="pressable flex size-11 shrink-0 items-center justify-center rounded-xl opacity-70 hover:bg-toast-text/10"
          >
            <X aria-hidden size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
