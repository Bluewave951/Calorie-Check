// แยกจาก client.ts เพื่อให้เช็กว่าเปิด cloud หรือไม่ได้ โดยไม่ต้องโหลด Supabase SDK (ไฟล์ใหญ่)
// ต้องเขียนชื่อเต็ม process.env.NEXT_PUBLIC_... เพื่อให้ Next.js ฝังค่าลงโค้ดฝั่งเบราว์เซอร์
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** ไม่ได้ตั้งค่า Supabase = เก็บข้อมูลในเครื่องอย่างเดียว และไม่ต้องล็อกอิน (แบบเดิม) */
export const CLOUD_ENABLED = SUPABASE_URL !== "" && SUPABASE_KEY !== "";
