import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth";

/** Google ส่งกลับมาพร้อม ?code= → แลกเป็น session (cookie) แล้วพาไปหน้าที่ตั้งใจจะเปิด */
export async function handleAuthCallback(request: Request, exchangeCode: (code: string) => Promise<boolean>): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // ใช้ NextResponse (headers แก้ได้) เพื่อให้ Next.js แนบ cookie ของ session ที่ตั้งผ่าน cookies() ได้
  if (!code || !(await exchangeCode(code))) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin), 303);
  }
  return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), url.origin), 303);
}
