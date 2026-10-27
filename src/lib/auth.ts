/**
 * กฎการเข้าแอป: ผู้ดูแลสร้างบัญชี (อีเมล/ชื่อผู้ใช้ + รหัสผ่าน) ใน Supabase ให้แต่ละคน แล้วปิดการสมัครเอง
 * ALLOWED_EMAILS ไม่บังคับ: ตั้งไว้ = จำกัดเพิ่มอีกชั้นเฉพาะอีเมลในรายชื่อ
 */

/** โดเมนสมมติของบัญชีที่ใช้ชื่อผู้ใช้แทนอีเมลจริง เช่น mom → mom@family.local */
export const LOGIN_DOMAIN = "family.local";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** ตรวจรูปแบบคร่าว ๆ ก่อนส่งไป Supabase (Supabase ตรวจซ้ำอีกชั้น) */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** ช่อง "อีเมลหรือชื่อผู้ใช้" → อีเมลที่ใช้ล็อกอิน */
export function toLoginEmail(value: string): string {
  const email = normalizeEmail(value);
  if (email === "" || email.includes("@")) return email;
  return `${email}@${LOGIN_DOMAIN}`;
}

/**
 * "a@x.com, b@x.com" → ["a@x.com", "b@x.com"]
 * ดึงเฉพาะส่วนที่เป็นอีเมล จึงทนเครื่องหมายคำพูด ตัวคั่น , ; ช่องว่าง ขึ้นบรรทัด หรือเผลอวาง "ALLOWED_EMAILS=" มาด้วย
 */
export function parseAllowedEmails(value: string | undefined): string[] {
  return (value?.match(/[^\s,;"'=]+@[^\s,;"'=]+/g) ?? []).map(normalizeEmail);
}

export function isEmailAllowed(email: string | undefined, allowed: string[]): boolean {
  return email !== undefined && allowed.includes(normalizeEmail(email));
}

/** หน้าที่จะกลับไปหลังล็อกอิน: เฉพาะ path ภายในแอป กันลิงก์หลอกพาไปเว็บอื่น */
export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value === "/login" || value.startsWith("/login?")) return "/";
  return value;
}

/** หน้าที่ต้องเปิดได้ก่อนล็อกอิน (หน้า login และไฟล์ที่ระบบติดตั้ง PWA ดึงโดยไม่ส่ง cookie) */
const PUBLIC_PATHS = new Set(["/login", "/manifest.webmanifest", "/sw.js", "/icon.svg", "/icon-maskable.svg"]);

export type Access = "allow" | "login" | "not_allowed" | "unauthorized" | "forbidden";

export function decideAccess({ pathname, email, allowed }: { pathname: string; email: string | undefined; allowed: string[] }): Access {
  if (PUBLIC_PATHS.has(pathname)) return "allow";
  const isApi = pathname.startsWith("/api/");
  if (email === undefined) return isApi ? "unauthorized" : "login";
  if (allowed.length > 0 && !isEmailAllowed(email, allowed)) return isApi ? "forbidden" : "not_allowed";
  return "allow";
}
