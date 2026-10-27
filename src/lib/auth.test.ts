import { describe, expect, it } from "vitest";
import { decideAccess, isEmailAllowed, parseAllowedEmails, safeNextPath } from "./auth";

describe("parseAllowedEmails", () => {
  it("แยกด้วย , หรือขึ้นบรรทัดใหม่ ตัดช่องว่าง และไม่สนตัวพิมพ์เล็ก/ใหญ่", () => {
    expect(parseAllowedEmails(" Mom@Gmail.com, dad@gmail.com\nkid@gmail.com ,")).toEqual(["mom@gmail.com", "dad@gmail.com", "kid@gmail.com"]);
  });

  it("ไม่ได้ตั้งค่า → รายชื่อว่าง", () => {
    expect(parseAllowedEmails(undefined)).toEqual([]);
    expect(parseAllowedEmails("")).toEqual([]);
  });
});

describe("isEmailAllowed", () => {
  const allowed = ["mom@gmail.com", "dad@gmail.com"];

  it("รับเฉพาะอีเมลในรายชื่อ (ไม่สนตัวพิมพ์)", () => {
    expect(isEmailAllowed("Mom@Gmail.com", allowed)).toBe(true);
    expect(isEmailAllowed("stranger@gmail.com", allowed)).toBe(false);
    expect(isEmailAllowed(undefined, allowed)).toBe(false);
  });

  it("รายชื่อว่าง → ไม่ให้ใครเข้า (กันลืมตั้งค่าแล้วเปิดให้ทุกคน)", () => {
    expect(isEmailAllowed("mom@gmail.com", [])).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("รับเฉพาะ path ภายในแอป", () => {
    expect(safeNextPath("/history?d=1")).toBe("/history?d=1");
    expect(safeNextPath("/settings")).toBe("/settings");
  });

  it("ลิงก์ไปเว็บอื่นหรือค่าว่าง → หน้าแรก", () => {
    for (const value of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "evil", "/login"]) {
      expect(safeNextPath(value)).toBe("/");
    }
  });
});

describe("decideAccess", () => {
  const allowed = ["mom@gmail.com"];

  it("หน้า login, callback ของ Google และไฟล์ของ PWA เปิดได้โดยไม่ต้องล็อกอิน", () => {
    for (const pathname of ["/login", "/auth/callback", "/manifest.webmanifest", "/sw.js", "/icon.svg", "/icon-maskable.svg"]) {
      expect(decideAccess({ pathname, email: undefined, allowed })).toBe("allow");
    }
  });

  it("ยังไม่ล็อกอิน: หน้าเว็บ → ไปหน้า login, API → 401", () => {
    expect(decideAccess({ pathname: "/", email: undefined, allowed })).toBe("login");
    expect(decideAccess({ pathname: "/api/analyze", email: undefined, allowed })).toBe("unauthorized");
  });

  it("ล็อกอินด้วยอีเมลที่ไม่ได้รับอนุญาต: หน้าเว็บ → แจ้งในหน้า login, API → 403", () => {
    expect(decideAccess({ pathname: "/", email: "stranger@gmail.com", allowed })).toBe("not_allowed");
    expect(decideAccess({ pathname: "/api/analyze", email: "stranger@gmail.com", allowed })).toBe("forbidden");
  });

  it("ล็อกอินด้วยอีเมลที่อนุญาต → เปิดได้ทุกหน้า", () => {
    expect(decideAccess({ pathname: "/", email: "mom@gmail.com", allowed })).toBe("allow");
    expect(decideAccess({ pathname: "/api/analyze", email: "mom@gmail.com", allowed })).toBe("allow");
  });

  it("path ที่ขึ้นต้นเหมือนแต่ไม่ใช่หน้า public ยังต้องล็อกอิน", () => {
    expect(decideAccess({ pathname: "/login-admin", email: undefined, allowed })).toBe("login");
    expect(decideAccess({ pathname: "/auth/callbackx", email: undefined, allowed })).toBe("login");
  });
});
