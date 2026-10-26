"use client";

import type { MealType } from "./types";

const OPEN_EVENT = "calorie-check:open-add";

export interface AddSheetRequest {
  meal?: MealType;
  date?: string;
}

/** เปิดแผ่น "บันทึกอาหาร" จากที่ใดก็ได้ (ปุ่มลอย, การ์ดมื้อ) */
export function openAddSheet(request: AddSheetRequest = {}) {
  window.dispatchEvent(new CustomEvent<AddSheetRequest>(OPEN_EVENT, { detail: request }));
}

export function onOpenAddSheet(listener: (request: AddSheetRequest) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<AddSheetRequest>).detail);
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
