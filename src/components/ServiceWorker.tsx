"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker เฉพาะ production (ใช้ได้บน localhost หรือ HTTPS เท่านั้น) */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // http://<IP> ไม่ใช่ secure context จึงลงทะเบียนไม่ได้ — แอปยังใช้งานได้ตามปกติ
    });
  }, []);
  return null;
}
