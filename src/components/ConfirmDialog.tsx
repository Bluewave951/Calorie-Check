"use client";

import { useEffect, useRef } from "react";

interface Props {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** กล่องยืนยันของแอป (แทน window.confirm) — โฟกัสปุ่มยกเลิกก่อน กด Esc เพื่อปิด */
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = "ยกเลิก", onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="confirm-title"
      className="sheet-in m-auto w-[calc(100%-2rem)] max-w-[360px] rounded-2xl border border-border bg-surface p-0 text-text shadow-float"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <button
          type="button"
          autoFocus
          onClick={() => ref.current?.close()}
          className="pressable min-h-11 flex-1 rounded-xl border border-border font-medium hover:bg-surface-2"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            ref.current?.close();
          }}
          className="pressable min-h-11 flex-1 rounded-xl bg-primary font-medium text-on-primary hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
