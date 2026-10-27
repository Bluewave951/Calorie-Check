import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, isPasswordCorrect, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const runtime = "nodejs";

/** หน่วงเมื่อรหัสผิด ให้การสุ่มเดารหัสช้าลง */
const WRONG_PASSWORD_DELAY_MS = 500;

const requestSchema = z.object({ password: z.string().max(200) });

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const password = process.env.APP_PASSWORD ?? "";
  if (!isPasswordCorrect(body.data.password, password)) {
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return NextResponse.json({ message: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

/** ออกจากระบบ */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
