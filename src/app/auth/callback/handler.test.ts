import { describe, expect, it, vi } from "vitest";
import { handleAuthCallback } from "./handler";

const location = (res: Response) => new URL(res.headers.get("location") ?? "");

describe("handleAuthCallback", () => {
  it("แลก code เป็น session สำเร็จ → กลับไปหน้าที่ตั้งใจจะเปิด", async () => {
    const exchange = vi.fn(async () => true);
    const res = await handleAuthCallback(new Request("https://app.example/auth/callback?code=abc&next=%2Fhistory"), exchange);

    expect(exchange).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(303);
    expect(location(res).href).toBe("https://app.example/history");
  });

  it("next เป็นลิงก์ไปเว็บอื่น → กลับหน้าแรกของแอป", async () => {
    const res = await handleAuthCallback(new Request("https://app.example/auth/callback?code=abc&next=https://evil.example"), async () => true);
    expect(location(res).href).toBe("https://app.example/");
  });

  it("ไม่มี code หรือแลกไม่สำเร็จ → หน้า login แจ้ง auth_failed", async () => {
    const noCode = await handleAuthCallback(new Request("https://app.example/auth/callback"), async () => true);
    expect(location(noCode).pathname).toBe("/login");
    expect(location(noCode).searchParams.get("error")).toBe("auth_failed");

    const failed = await handleAuthCallback(new Request("https://app.example/auth/callback?code=bad"), async () => false);
    expect(location(failed).searchParams.get("error")).toBe("auth_failed");
  });
});
