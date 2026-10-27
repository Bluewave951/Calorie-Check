import { describe, expect, it } from "vitest";
import { rowToScan, rowToSettings, rowToWeight, scanToRow, settingsToRow, weightToRow } from "./cloudRows";
import { DEFAULT_SETTINGS, type Scan, type Settings } from "./types";

const scan: Scan = {
  id: "scan-1",
  date: "2026-10-27",
  meal: "lunch",
  createdAt: 1_793_000_000_000,
  thumbnail: "data:image/jpeg;base64,AAAA",
  items: [
    {
      id: "item-1",
      name_th: "ข้าวสวย",
      name_en: "Steamed rice",
      refKey: "rice_white",
      grams: 180,
      servingGrams: 180,
      kcalPer100g: 130,
      estimated: false,
      confidence: 0.9,
    },
  ],
};

describe("scan rows", () => {
  it("แปลงไปกลับได้ข้อมูลเดิม", () => {
    expect(rowToScan(scanToRow(scan))).toEqual(scan);
  });

  it("ใช้ชื่อคอลัมน์แบบ snake_case และไม่ส่ง user_id (ฐานข้อมูลใส่ให้จากผู้ที่ล็อกอิน)", () => {
    const row = scanToRow(scan);
    expect(row).toMatchObject({ id: "scan-1", date: "2026-10-27", meal: "lunch", created_at: scan.createdAt });
    expect(row).not.toHaveProperty("user_id");
  });

  it("แถวที่ไม่ได้ดึงรูปย่อมา → thumbnail เป็น null", () => {
    const { thumbnail: _omit, ...row } = scanToRow(scan);
    expect(rowToScan(row).thumbnail).toBeNull();
  });
});

describe("weight rows", () => {
  it("แปลงไปกลับได้ข้อมูลเดิม", () => {
    const entry = { date: "2026-10-27", weightKg: 63.4 };
    expect(weightToRow(entry)).toEqual({ date: "2026-10-27", weight_kg: 63.4 });
    expect(rowToWeight(weightToRow(entry))).toEqual(entry);
  });
});

describe("settings rows", () => {
  it("ไม่เก็บ unbackedSince บน cloud (เป็นเรื่องของเครื่องนั้น)", () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, dailyGoal: 1800, goalConfirmed: true, unbackedSince: 123 };
    expect(settingsToRow(settings)).toEqual({ data: { ...DEFAULT_SETTINGS, dailyGoal: 1800, goalConfirmed: true } });
  });

  it("ไม่มีแถว หรือข้อมูลขาดบางช่อง → เติมค่าเริ่มต้น", () => {
    expect(rowToSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(rowToSettings({ data: { dailyGoal: 1500 } })).toEqual({ ...DEFAULT_SETTINGS, dailyGoal: 1500 });
  });
});
