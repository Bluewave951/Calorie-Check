"use client";

import { useEffect } from "react";
import { requestPersistentStorage } from "@/lib/db";

/** ลงทะเบียน service worker เฉพาะ production (ใช้ได้บน localhost หรือ HTTPS เท่านั้น) */
export function ServiceWorker() {
  useEffect(() => {
    // ข้อมูลทั้งหมดอยู่ในเครื่อง → ขอให้เบราว์เซอร์เก็บไว้ถาวร (เบราว์เซอร์อาจไม่อนุญาต ซึ่งไม่เป็นไร)
    requestPersistentStorage().catch(() => {});
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // http://<IP> ไม่ใช่ secure context จึงลงทะเบียนไม่ได้ — แอปยังใช้งานได้ตามปกติ
    });
  }, []);
  return null;
}
