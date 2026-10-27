/** error จาก supabase.auth.signInWithPassword → ข้อความที่บอกสาเหตุจริง (ไม่เหมารวมว่ารหัสผิด) */
export interface AuthErrorLike {
  code?: string;
  status?: number;
  message: string;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง",
  email_not_confirmed: "บัญชีนี้ยังไม่ได้ยืนยัน ผู้ดูแลต้องยืนยันใน Supabase (หรือสร้างใหม่โดยติ๊ก Auto Confirm User)",
  email_provider_disabled: "ล็อกอินด้วยอีเมลถูกปิดอยู่ ผู้ดูแลต้องเปิด Email provider ใน Supabase",
  user_banned: "บัญชีนี้ถูกระงับ ติดต่อผู้ดูแลแอป",
};

const RATE_LIMITED = "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่";

export function loginErrorMessage(error: AuthErrorLike): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429 || error.code === "over_request_rate_limit") return RATE_LIMITED;
  const detail = error.code ? `${error.code}: ${error.message}` : error.message;
  return `เข้าสู่ระบบไม่สำเร็จ (${detail})`;
}
