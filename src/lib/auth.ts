/**
 * กฎการเข้าแอป: ล็อกอินด้วยรหัสทางอีเมล (Supabase Auth) และอีเมลต้องอยู่ใน ALLOWED_EMAILS
 * ไม่จำกัดอีเมล = ใครมีอีเมลก็สมัครเข้ามาใช้โควตา AI ได้
 */

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** ตรวจรูปแบบคร่าว ๆ ก่อนส่งรหัส (Supabase ตรวจซ้ำอีกชั้น) */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** รหัสในอีเมลจาก Supabase: ตัวเลข 6 หลักโดยปกติ (ตั้งได้ถึง 10) */
export function isValidOtpCode(value: string): boolean {
  return /^\d{6,10}$/.test(value);
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
  if (!isEmailAllowed(email, allowed)) return isApi ? "forbidden" : "not_allowed";
  return "allow";
}
