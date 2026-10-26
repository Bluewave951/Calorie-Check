"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

export type ScanStep = "resize" | "analyze" | "compute";

const STEPS: { id: ScanStep; label: string }[] = [
  { id: "resize", label: "กำลังย่อรูป…" },
  { id: "analyze", label: "AI กำลังดูจาน…" },
  { id: "compute", label: "คำนวณแคลอรี่…" },
];

interface Props {
  previewUrl: string | null;
  step: ScanStep;
  onCancel: () => void;
}

export function ScanProgress({ previewUrl, step, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0);
  const current = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center pt-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-2">
        {previewUrl && <img src={previewUrl} alt="รูปอาหารที่กำลังวิเคราะห์" className="size-full object-cover" />}
        <div className="scanline absolute inset-x-0 h-[3px] bg-ring shadow-[0_0_16px_4px_var(--ring)]" aria-hidden />
      </div>

      <ol className="mt-6 flex w-full flex-col gap-3" aria-live="polite">
        {STEPS.map((s, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={s.id} className={`flex items-center gap-3 ${done || active ? "text-text" : "text-muted"}`}>
              <span
                className={`flex size-7 items-center justify-center rounded-full ${
                  done ? "bg-ok text-surface" : active ? "bg-surface-2 text-primary" : "bg-surface-2"
                }`}
              >
                {done ? (
                  <Check aria-hidden size={16} strokeWidth={3} />
                ) : active ? (
                  <LoaderCircle aria-hidden size={18} className="animate-spin" />
                ) : null}
              </span>
              <span className={active ? "font-medium" : ""}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-sm text-muted tabular-nums" role="timer">
        ผ่านไป {seconds} วินาที · อาจใช้เวลา 10–40 วินาที
      </p>

      <button
        type="button"
        onClick={onCancel}
        className="pressable mt-4 min-h-12 rounded-xl border border-border px-8 font-medium hover:bg-surface-2"
      >
        ยกเลิก
      </button>
    </div>
  );
}
