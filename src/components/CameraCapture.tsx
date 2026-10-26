"use client";

import { useRef } from "react";
import { Camera, ImageUp } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
}

/** ถ่ายรูปด้วยกล้องหลัง หรือเลือกรูปจากคลังภาพ */
export function CameraCapture({ onFile }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="pressable flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface text-primary shadow-card hover:bg-surface-2"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-primary text-on-primary">
          <Camera aria-hidden size={36} />
        </span>
        <span className="font-display text-xl font-semibold text-text">ถ่ายรูปอาหาร</span>
        <span className="text-sm text-muted">ถ่ายให้เห็นทุกจานในเฟรมเดียว</span>
      </button>
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="pressable flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface font-medium hover:bg-surface-2"
      >
        <ImageUp aria-hidden size={20} /> เลือกจากคลังภาพ
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={handle} />
    </div>
  );
}
