import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { createProxy } from "./proxy";

const ALLOWED = "mom@gmail.com, dad@gmail.com";

/** session จำลอง: ล็อกอินด้วยอีเมลที่กำหนด และ Supabase ต่ออายุ cookie ให้ */
function proxyFor(email: string | undefined, allowedEmails: string | undefined = ALLOWED) {
  return createProxy({
    allowedEmails,
    resolveSession: async (request) => {
      const response = NextResponse.next({ request });
      response.cookies.set("sb-refreshed", "1");
      return { email, response };
    },
  });
}

function request(path: string) {
  return new NextRequest(`https://app.example${path}`);
}

describe("proxy", () => {
  it("ยังไม่ล็อกอินเปิดหน้าเว็บ → พาไปหน้า login พร้อมจำหน้าที่จะกลับไป", async () => {
    const res = await proxyFor(undefined)(request("/history?d=1"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/history?d=1");
  });

  it("ยังไม่ล็อกอินเรียก API → 401 แบบ JSON", async () => {
    const res = await proxyFor(undefined)(request("/api/analyze"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "auth" });
  });

  it("อีเมลไม่ได้รับอนุญาต: หน้าเว็บ → หน้า login แจ้ง not_allowed, API → 403", async () => {
    const page = await proxyFor("stranger@gmail.com")(request("/"));
    expect(new URL(page.headers.get("location") ?? "").searchParams.get("error")).toBe("not_allowed");

    const api = await proxyFor("stranger@gmail.com")(request("/api/analyze"));
    expect(api.status).toBe(403);
  });

  it("อีเมลที่อนุญาต → ปล่อยผ่าน พร้อม cookie ที่ต่ออายุแล้ว", async () => {
    const res = await proxyFor("Mom@gmail.com")(request("/"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.cookies.get("sb-refreshed")?.value).toBe("1");
  });

  it("ส่งไปหน้า login ก็ต้องพา cookie ที่ต่ออายุไปด้วย", async () => {
    const res = await proxyFor("stranger@gmail.com")(request("/"));
    expect(res.cookies.get("sb-refreshed")?.value).toBe("1");
  });

  it("ยังไม่ได้ตั้งค่า Supabase (resolveSession = null) → เปิดได้ทุกหน้าแบบเดิม", async () => {
    const proxy = createProxy({ allowedEmails: undefined, resolveSession: null });
    const res = await proxy(request("/api/analyze"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
