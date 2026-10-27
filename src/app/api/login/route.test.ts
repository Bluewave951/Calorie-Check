import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { DELETE, POST } from "./route";

function loginRequest(body: unknown) {
  return new Request("https://app.example/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/login", () => {
  beforeEach(() => {
    vi.stubEnv("APP_PASSWORD", "family-2026");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("รหัสถูก → ตั้ง cookie แบบ HttpOnly ที่มี session token", async () => {
    const res = await POST(loginRequest({ password: "family-2026" }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=${await createSessionToken("family-2026")}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("รหัสผิด → 401 และไม่ตั้ง cookie", async () => {
    const res = await POST(loginRequest({ password: "wrong" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("ข้อมูลไม่ถูกต้อง → 400", async () => {
    const res = await POST(loginRequest({ pass: 123 }));
    expect(res.status).toBe(400);
  });

  it("ออกจากระบบ → ลบ cookie", async () => {
    const res = await DELETE();
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });
});
