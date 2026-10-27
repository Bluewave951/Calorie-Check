import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "./loginError";

describe("loginErrorMessage", () => {
  it("รหัสผ่านหรือบัญชีผิด", () => {
    expect(loginErrorMessage({ code: "invalid_credentials", status: 400, message: "Invalid login credentials" })).toBe(
      "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง",
    );
  });

  it("บัญชียังไม่ได้ยืนยัน → บอกผู้ดูแลให้ยืนยันใน Supabase", () => {
    expect(loginErrorMessage({ code: "email_not_confirmed", status: 400, message: "Email not confirmed" })).toContain("ยังไม่ได้ยืนยัน");
  });

  it("ปิดการล็อกอินด้วยอีเมลไว้ใน Supabase", () => {
    expect(loginErrorMessage({ code: "email_provider_disabled", status: 400, message: "Email logins are disabled" })).toContain("Email provider");
  });

  it("ลองบ่อยเกินไป", () => {
    expect(loginErrorMessage({ code: "over_request_rate_limit", status: 429, message: "" })).toContain("รอสักครู่");
    expect(loginErrorMessage({ status: 429, message: "" })).toContain("รอสักครู่");
  });

  it("error อื่น → แสดงรหัสและข้อความจาก Supabase ไว้ใช้หาสาเหตุ", () => {
    expect(loginErrorMessage({ code: "unexpected_failure", status: 500, message: "Database error" })).toBe(
      "เข้าสู่ระบบไม่สำเร็จ (unexpected_failure: Database error)",
    );
    expect(loginErrorMessage({ message: "Failed to fetch" })).toBe("เข้าสู่ระบบไม่สำเร็จ (Failed to fetch)");
  });
});
