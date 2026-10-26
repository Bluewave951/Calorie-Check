"use client";

export interface ToastOptions {
  message: string;
  /** ปุ่มบนข้อความ เช่น "เลิกทำ" */
  action?: { label: string; onClick: () => void };
  tone?: "default" | "error";
}

export interface ToastItem extends ToastOptions {
  id: number;
}

const TOAST_EVENT = "calorie-check:toast";
let nextId = 1;

/** แสดงข้อความแจ้งผลชั่วคราว (หายเองใน ~5 วินาที) — อยู่ข้ามการเปลี่ยนหน้าได้ */
export function showToast(options: ToastOptions) {
  window.dispatchEvent(new CustomEvent<ToastItem>(TOAST_EVENT, { detail: { ...options, id: nextId++ } }));
}

export function onToast(listener: (toast: ToastItem) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<ToastItem>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
}
