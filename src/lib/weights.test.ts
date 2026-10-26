import { describe, expect, it } from "vitest";
import { needsTdeeUpdate, weightTrend } from "./weights";
import type { BodyProfile } from "./types";

describe("weightTrend", () => {
  const today = "2026-10-26";

  it("น้ำหนักล่าสุด และเปลี่ยนไปเท่าไรเทียบกับค่าแรกใน 30 วัน", () => {
    const entries = [
      { date: "2026-10-01", weightKg: 72 },
      { date: "2026-10-26", weightKg: 70.4 },
      { date: "2026-09-20", weightKg: 73 }, // เก่ากว่า 30 วัน ไม่นับเป็นจุดเริ่ม
    ];
    expect(weightTrend(entries, today)).toEqual({ latest: { date: "2026-10-26", weightKg: 70.4 }, change: -1.6 });
  });

  it("มีค่าเดียวในช่วง → ยังบอกการเปลี่ยนแปลงไม่ได้", () => {
    expect(weightTrend([{ date: "2026-10-20", weightKg: 65 }], today)).toEqual({
      latest: { date: "2026-10-20", weightKg: 65 },
      change: null,
    });
  });

  it("ยังไม่เคยบันทึก → null", () => {
    expect(weightTrend([], today)).toBeNull();
  });
});

describe("needsTdeeUpdate", () => {
  const profile: BodyProfile = { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "sedentary", weightGoal: "lose" };

  it("น้ำหนักต่างจากที่ใช้คำนวณ TDEE ตั้งแต่ 2 กก. → ควรคำนวณใหม่", () => {
    expect(needsTdeeUpdate(profile, 72)).toBe(true);
    expect(needsTdeeUpdate(profile, 68)).toBe(true);
    expect(needsTdeeUpdate(profile, 71.9)).toBe(false);
    expect(needsTdeeUpdate(profile, 68.1)).toBe(false);
  });

  it("ยังไม่เคยกรอกข้อมูลร่างกาย → ไม่มีอะไรให้คำนวณใหม่", () => {
    expect(needsTdeeUpdate(undefined, 90)).toBe(false);
  });
});
