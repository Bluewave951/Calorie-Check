import { describe, expect, it } from "vitest";
import { dailyTotals, daysInMonth, monthKey, monthRange, summarize, summarizeYear, yearRange } from "./stats";
import type { FoodItem, Scan } from "./types";

describe("ช่วงวันที่", () => {
  it("วันในเดือน รวมปีอธิกสุรทิน", () => {
    expect(daysInMonth(2026, 9)).toHaveLength(31);
    expect(daysInMonth(2026, 1)).toHaveLength(28);
    expect(daysInMonth(2028, 1)).toHaveLength(29);
    expect(daysInMonth(2026, 9)[0]).toBe("2026-10-01");
  });
  it("ช่วงของเดือนและปี", () => {
    expect(monthRange(2026, 10)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(yearRange(2026)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(monthKey(2026, 0)).toBe("2026-01");
  });
});

describe("summarize", () => {
  const totals = { "2026-10-01": 1500, "2026-10-02": 2300, "2026-10-05": 1900, "2026-11-01": 3000 };

  it("เฉลี่ยเฉพาะวันที่บันทึก และนับวันเกินเป้า", () => {
    expect(summarize(totals, 2000, daysInMonth(2026, 9))).toEqual({ loggedDays: 3, total: 5700, average: 1900, overDays: 1 });
  });
  it("เท่ากับเป้าไม่นับว่าเกิน", () => {
    expect(summarize({ a: 2000 }, 2000).overDays).toBe(0);
  });
  it("ไม่มีข้อมูล = ศูนย์ทั้งหมด", () => {
    expect(summarize({}, 2000)).toEqual({ loggedDays: 0, total: 0, average: 0, overDays: 0 });
  });
  it("สรุปรายปีได้ 12 เดือน", () => {
    const year = summarizeYear(totals, 2000, 2026);
    expect(year).toHaveLength(12);
    expect(year[9]).toMatchObject({ month: 9, loggedDays: 3, average: 1900 });
    expect(year[10]).toMatchObject({ loggedDays: 1, average: 3000, overDays: 1 });
    expect(year[0].loggedDays).toBe(0);
  });
});

describe("dailyTotals", () => {
  // 100 กรัม → kcal เท่ากับ kcalPer100g
  const item = (kcal: number): FoodItem => ({
    id: String(kcal),
    name_th: "ข้าว",
    name_en: "rice",
    refKey: null,
    grams: 100,
    servingGrams: 100,
    kcalPer100g: kcal,
    estimated: false,
    confidence: 1,
  });
  const scan = (date: string, ...kcal: number[]): Scan => ({ id: date + kcal.join(), date, meal: "lunch", createdAt: 1, thumbnail: null, items: kcal.map(item) });

  it("รวม kcal ทุกมื้อของแต่ละวัน วันที่ไม่มีการสแกน = ไม่มี key", () => {
    expect(dailyTotals([scan("2026-10-28", 300, 200), scan("2026-10-28", 100), scan("2026-10-29", 450)])).toEqual({
      "2026-10-28": 600,
      "2026-10-29": 450,
    });
    expect(dailyTotals([])).toEqual({});
  });
});
