import { describe, expect, it } from "vitest";
import { calculateTdee, goalWarnings, macroTargets } from "./tdee";
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

describe("goalWarnings", () => {
  it("เป้าต่ำกว่าขั้นต่ำที่ปลอดภัย: หญิง 1,200 / ชาย 1,500 / ไม่ทราบเพศ 1,200", () => {
    expect(goalWarnings(1199, profile({ sex: "female" }))).toEqual(["below_minimum"]);
    expect(goalWarnings(1200, profile({ sex: "female" }))).toEqual([]);
    expect(goalWarnings(1499, profile())).toEqual(["below_minimum"]);
    expect(goalWarnings(1500, profile())).toEqual([]);
    expect(goalWarnings(1199, undefined)).toEqual(["below_minimum"]);
    expect(goalWarnings(1200, undefined)).toEqual([]);
  });

  it("BMI ต่ำกว่า 18.5 แต่เลือกลดน้ำหนัก", () => {
    // 50 / 1.75² = 16.3
    expect(goalWarnings(1800, profile({ weightKg: 50, weightGoal: "lose" }))).toEqual(["underweight_losing"]);
    expect(goalWarnings(1800, profile({ weightKg: 50, weightGoal: "maintain" }))).toEqual([]);
    // 57 / 1.75² = 18.6
    expect(goalWarnings(1800, profile({ weightKg: 57, weightGoal: "lose" }))).toEqual([]);
  });
});

describe("macroTargets", () => {
  it("ลดน้ำหนัก: โปรตีน 1.6 ก./กก., ไขมัน 25% ของเป้า, คาร์บเป็นส่วนที่เหลือ", () => {
    // โปรตีน 60 × 1.6 = 96 ก. · ไขมัน 1,585 × 0.25 / 9 = 44.0 ก. · คาร์บ (1,585 − 384 − 396.25) / 4 = 201.2 ก.
    const p = profile({ sex: "female", weightKg: 60, weightGoal: "lose" });
    expect(macroTargets(1585, p)).toEqual({ protein: 96, carb: 201, fat: 44 });
  });

  it("คงหรือเพิ่มน้ำหนัก: โปรตีน 1.2 ก./กก.", () => {
    // โปรตีน 84 · ไขมัน 2,000 × 0.25 / 9 = 55.6 · คาร์บ (2,000 − 336 − 500) / 4 = 291
    expect(macroTargets(2000, profile())).toEqual({ protein: 84, carb: 291, fat: 56 });
  });

  it("ยังไม่มีข้อมูลร่างกาย: โปรตีน 15% ของเป้า", () => {
    // โปรตีน 2,000 × 0.15 / 4 = 75 · ไขมัน 55.6 · คาร์บ (2,000 − 300 − 500) / 4 = 300
    expect(macroTargets(2000, undefined)).toEqual({ protein: 75, carb: 300, fat: 56 });
  });
});
