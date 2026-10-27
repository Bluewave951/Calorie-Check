import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export interface SessionResult {
  /** undefined = ยังไม่ได้ล็อกอิน */
  email: string | undefined;
  /** response ที่มี cookie ซึ่ง Supabase ต่ออายุให้แล้ว */
  response: NextResponse;
}

/** อ่าน session จาก cookie (ต่ออายุให้ถ้าใกล้หมด) — ตามแบบที่ @supabase/ssr แนะนำสำหรับ Next.js */
export async function resolveSupabaseSession(request: NextRequest, url: string, key: string): Promise<SessionResult> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  // getClaims ตรวจลายเซ็น JWT จริง (ต่างจาก getSession ที่เชื่อ cookie ตรง ๆ)
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  return { email: typeof email === "string" && email !== "" ? email : undefined, response };
}
