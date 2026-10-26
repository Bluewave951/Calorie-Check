"use client";

/**
 * ส่งรูปที่เลือกจากแผ่น "บันทึกอาหาร" ไปหน้าสแกน
 * (เก็บในหน่วยความจำของแท็บ เพราะ File ส่งผ่าน URL ไม่ได้)
 */
let pending: File | null = null;

export function setPendingPhoto(file: File) {
  pending = file;
}

export function takePendingPhoto(): File | null {
  const file = pending;
  pending = null;
  return file;
}
