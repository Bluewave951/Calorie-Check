import { NextResponse, type NextRequest } from "next/server";
import { decideAccess, parseAllowedEmails } from "@/lib/auth";
import { resolveSupabaseSession, type SessionResult } from "@/lib/supabase/session";

interface ProxyOptions {
  allowedEmails: string | undefined;
  /** null = ยังไม่ได้ตั้งค่า Supabase → ไม่ต้องล็อกอิน (ใช้บนเครื่องตัวเองแบบเดิม) */
  resolveSession: ((request: NextRequest) => Promise<SessionResult>) | null;
}

/** redirect/ตอบ error แล้วต้องพา cookie ที่ Supabase เพิ่งต่ออายุไปด้วย ไม่งั้นหลุดจากระบบ */
function withCookies<T extends NextResponse>(target: T, source: NextResponse): T {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export function createProxy({ allowedEmails, resolveSession }: ProxyOptions) {
  const allowed = parseAllowedEmails(allowedEmails);

  return async function proxy(request: NextRequest): Promise<NextResponse> {
    if (!resolveSession) return NextResponse.next();

    const { email, response } = await resolveSession(request);
    const { pathname, search } = request.nextUrl;
    const access = decideAccess({ pathname, email, allowed });

    if (access === "unauthorized") {
      return withCookies(NextResponse.json({ error: "auth", message: "กรุณาเข้าสู่ระบบใหม่ (เปิดแอปใหม่แล้วล็อกอิน)" }, { status: 401 }), response);
    }
    if (access === "forbidden") {
      return withCookies(NextResponse.json({ error: "auth", message: "บัญชีนี้ไม่ได้รับอนุญาตให้ใช้แอป" }, { status: 403 }), response);
    }
    if (access === "login" || access === "not_allowed") {
      const url = new URL("/login", request.url);
      if (access === "not_allowed") url.searchParams.set("error", "not_allowed");
      else url.searchParams.set("next", pathname + search);
      return withCookies(NextResponse.redirect(url), response);
    }
    return response;
  };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** ตั้งค่า Supabase แล้วทุกหน้าต้องล็อกอิน (รหัสทางอีเมล) และอีเมลต้องอยู่ใน ALLOWED_EMAILS */
export const proxy = createProxy({
  allowedEmails: process.env.ALLOWED_EMAILS,
  resolveSession: url && key ? (request) => resolveSupabaseSession(request, url, key) : null,
});

export const config = {
  // ไม่ต้องตรวจไฟล์ static ของ Next.js (ชื่อไฟล์เป็น hash ไม่มีข้อมูลส่วนตัว)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
