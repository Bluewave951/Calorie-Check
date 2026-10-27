/**
 * กฎการเข้าแอป: ล็อกอินด้วย Google (Supabase Auth) และอีเมลต้องอยู่ใน ALLOWED_EMAILS
 * ไม่จำกัดอีเมล = ใครมีบัญชี Google ก็เข้ามาใช้โควตา AI ได้
 */

/** "a@x.com, b@x.com" หรือบรรทัดละอีเมล → ["a@x.com", "b@x.com"] */
export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\n]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | undefined, allowed: string[]): boolean {
  return email !== undefined && allowed.includes(email.toLowerCase());
}

/** หน้าที่จะกลับไปหลังล็อกอิน: เฉพาะ path ภายในแอป กันลิงก์หลอกพาไปเว็บอื่น */
export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value === "/login" || value.startsWith("/login?")) return "/";
  return value;
}

/** หน้าที่ต้องเปิดได้ก่อนล็อกอิน (หน้า login, ที่ Google ส่งกลับมา และไฟล์ที่ระบบติดตั้ง PWA ดึงโดยไม่ส่ง cookie) */
const PUBLIC_PATHS = new Set(["/login", "/auth/callback", "/manifest.webmanifest", "/sw.js", "/icon.svg", "/icon-maskable.svg"]);

export type Access = "allow" | "login" | "not_allowed" | "unauthorized" | "forbidden";

export function decideAccess({ pathname, email, allowed }: { pathname: string; email: string | undefined; allowed: string[] }): Access {
  if (PUBLIC_PATHS.has(pathname)) return "allow";
  const isApi = pathname.startsWith("/api/");
  if (email === undefined) return isApi ? "unauthorized" : "login";
  if (!isEmailAllowed(email, allowed)) return isApi ? "forbidden" : "not_allowed";
  return "allow";
}
