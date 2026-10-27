import { describe, expect, it } from "vitest";
import { DEFAULT_TODAY_TAB, parseTodayTab, stepTodayTab, TODAY_TABS } from "./todayTabs";

describe("parseTodayTab", () => {
  it("ไม่มีค่า = แท็บเริ่มต้น (มื้ออาหาร)", () => {
    expect(parseTodayTab(null)).toBe("meals");
    expect(DEFAULT_TODAY_TAB).toBe("meals");
  });

  it("รับค่าแท็บที่รู้จัก", () => {
    for (const tab of TODAY_TABS) expect(parseTodayTab(tab)).toBe(tab);
  });

  it("ค่าที่ไม่รู้จัก = แท็บเริ่มต้น", () => {
    expect(parseTodayTab("hack")).toBe("meals");
    expect(parseTodayTab("")).toBe("meals");
  });
});

describe("stepTodayTab", () => {
  it("เลื่อนไปแท็บถัดไป/ก่อนหน้า", () => {
    expect(stepTodayTab("meals", 1)).toBe("nutrients");
    expect(stepTodayTab("nutrients", -1)).toBe("meals");
  });

  it("วนรอบที่ปลายทั้งสองด้าน", () => {
    expect(stepTodayTab("weight", 1)).toBe("meals");
    expect(stepTodayTab("meals", -1)).toBe("weight");
  });
});
