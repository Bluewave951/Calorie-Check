import { describe, expect, it } from "vitest";
import { calculateTdee } from "./tdee";
import type { BodyProfile } from "./types";

const profile = (over: Partial<BodyProfile> = {}): BodyProfile => ({
  sex: "male",
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activity: "sedentary",
  weightGoal: "maintain",
  ...over,
});

describe("calculateTdee (Mifflin-St Jeor)", () => {
  it("ผู้ชาย ไม่ค่อยออกกำลังกาย คงน้ำหนัก: เป้า = TDEE", () => {
    // BMR = 10×70 + 6.25×175 − 5×30 + 5 = 1,648.75 → TDEE = ×1.2 = 1,978.5
    expect(calculateTdee(profile())).toEqual({ bmr: 1649, tdee: 1979, goal: 1979 });
  });

  it("ผู้หญิง ออกกำลังกายปานกลาง ลดน้ำหนัก: เป้า = TDEE − 500", () => {
    // BMR = 10×60 + 6.25×165 − 5×25 − 161 = 1,345.25 → TDEE = ×1.55 = 2,085.1
    const p = profile({ sex: "female", age: 25, heightCm: 165, weightKg: 60, activity: "moderate", weightGoal: "lose" });
    expect(calculateTdee(p)).toEqual({ bmr: 1345, tdee: 2085, goal: 1585 });
  });

  it("ออกกำลังกายหนัก เพิ่มน้ำหนัก: เป้า = TDEE + 300", () => {
    // BMR = 10×80 + 6.25×180 − 5×35 + 5 = 1,755 → TDEE = ×1.725 = 3,027.4
    const p = profile({ age: 35, heightCm: 180, weightKg: 80, activity: "active", weightGoal: "gain" });
    expect(calculateTdee(p)).toEqual({ bmr: 1755, tdee: 3027, goal: 3327 });
  });

  it("เป้าไม่ต่ำกว่า 800 และไม่เกิน 6,000 kcal ตามที่แอปรองรับ", () => {
    // TDEE 932 − 500 = 432 → 800
    const small = profile({ sex: "female", age: 80, heightCm: 150, weightKg: 40, weightGoal: "lose" });
    expect(calculateTdee(small)).toEqual({ bmr: 777, tdee: 932, goal: 800 });
    // TDEE 7,201 + 300 → 6,000
    const big = profile({ age: 18, heightCm: 220, weightKg: 250, activity: "very_active", weightGoal: "gain" });
    expect(calculateTdee(big)).toEqual({ bmr: 3790, tdee: 7201, goal: 6000 });
  });

  it("ข้อมูลร่างกายนอกช่วงที่สูตรใช้ได้ → null", () => {
    expect(calculateTdee(profile({ age: 14 }))).toBeNull();
    expect(calculateTdee(profile({ age: 101 }))).toBeNull();
    expect(calculateTdee(profile({ heightCm: 99 }))).toBeNull();
    expect(calculateTdee(profile({ weightKg: 301 }))).toBeNull();
    expect(calculateTdee(profile({ weightKg: Number.NaN }))).toBeNull();
    expect(calculateTdee(profile({ age: 15, heightCm: 250, weightKg: 30 }))).not.toBeNull();
  });
});
