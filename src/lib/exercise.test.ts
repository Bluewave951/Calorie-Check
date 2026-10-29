import { describe, expect, it } from "vitest";
import { caloriesBurned, fatLevel } from "./exercise";

describe("caloriesBurned (MET)", () => {
  it("เดินเร็ว MET 4.3, 70 กก., 30 นาที", () => {
    // 4.3 × 3.5 × 70 / 200 × 30 = 158.0
    expect(caloriesBurned(4.3, 70, 30)).toBe(158);
  });
  it("นาทีเป็น 0 = 0 kcal", () => {
    expect(caloriesBurned(8, 70, 0)).toBe(0);
  });
});

describe("fatLevel", () => {
  it("แบ่งระดับตามเพศ", () => {
    expect(fatLevel("male", 8)).toBe("athletic");
    expect(fatLevel("male", 20)).toBe("average");
    expect(fatLevel("male", 30)).toBe("obese");
    expect(fatLevel("female", 22)).toBe("fit");
    expect(fatLevel("female", 30)).toBe("average");
    expect(fatLevel("female", 40)).toBe("obese");
  });
});

import { recommendPlan, planWarnings, leanMassKg } from "./exercise";
import type { BodyProfile } from "./types";

const profile = (over: Partial<BodyProfile> = {}): BodyProfile => ({
  sex: "male",
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activity: "moderate",
  weightGoal: "maintain",
  ...over,
});

const count = (p: BodyProfile, kind: string) => recommendPlan(p).days.filter((d) => d.kind === kind).length;
const minutes = (p: BodyProfile) => recommendPlan(p).days.reduce((s, d) => s + d.minutes, 0);

describe("recommendPlan", () => {
  it("แผน 7 วันเสมอ", () => {
    expect(recommendPlan(profile()).days).toHaveLength(7);
  });
  it("ลดน้ำหนัก: คาร์ดิโอ 5 วัน เวท 2 วัน", () => {
    const p = profile({ weightGoal: "lose" });
    expect(count(p, "cardio")).toBe(5);
    expect(count(p, "strength")).toBe(2);
  });
  it("คงน้ำหนัก: คาร์ดิโอ 3 เวท 2 ยืดเหยียด 1 และรวม ≥ 150 นาที", () => {
    const p = profile();
    expect([count(p, "cardio"), count(p, "strength"), count(p, "flexibility")]).toEqual([3, 2, 1]);
    expect(minutes(p)).toBeGreaterThanOrEqual(150);
  });
  it("เพิ่มน้ำหนัก: เวท 4 วัน", () => {
    expect(count(profile({ weightGoal: "gain" }), "strength")).toBe(4);
  });
  it("แต่ละวันคำนวณ kcal จากน้ำหนักตัว", () => {
    const day = recommendPlan(profile({ weightGoal: "lose" })).days.find((d) => d.kind === "cardio")!;
    expect(day.kcal).toBeGreaterThan(0);
  });
  it("อ้วนมาก (ไขมันสูง) หรืออายุ ≥ 60: ไม่มีวิ่ง/HIIT", () => {
    for (const p of [profile({ weightGoal: "lose", bodyFatPercent: 35 }), profile({ weightGoal: "lose", age: 65 })]) {
      const ids = recommendPlan(p).days.map((d) => d.exerciseId);
      expect(ids).not.toContain("run");
      expect(ids).not.toContain("hiit");
    }
  });
  it("ไม่มี % ไขมัน ใช้ BMI ≥ 30 เป็นเกณฑ์อ้วน", () => {
    const ids = recommendPlan(profile({ weightGoal: "lose", weightKg: 100 })).days.map((d) => d.exerciseId);
    expect(ids).not.toContain("run");
  });
  it("ไม่ค่อยขยับตัว: เวลาสั้นลง", () => {
    expect(minutes(profile({ activity: "sedentary" }))).toBeLessThan(minutes(profile()));
  });
  it("ใส่ท่าเฉพาะส่วนที่เลือกในวันเวท", () => {
    const plan = recommendPlan(profile({ weightGoal: "lose", fatAreas: ["belly", "thighs"] }));
    const areas = plan.days.flatMap((d) => d.moves.map((m) => m.area));
    expect(areas).toContain("belly");
    expect(areas).toContain("thighs");
  });
  it("ไม่เลือกส่วนใด = ท่าทั้งตัว", () => {
    const plan = recommendPlan(profile());
    expect(plan.days.find((d) => d.kind === "strength")!.moves.length).toBeGreaterThan(0);
  });
});

describe("leanMassKg", () => {
  it("น้ำหนัก × (1 − %ไขมัน)", () => {
    expect(leanMassKg(profile({ weightKg: 80, bodyFatPercent: 25 }))).toBe(60);
  });
  it("ไม่มี % ไขมัน = null", () => {
    expect(leanMassKg(profile())).toBeNull();
  });
});

describe("planWarnings", () => {
  it("ผอมแต่จะลดน้ำหนัก", () => {
    expect(planWarnings(profile({ weightGoal: "lose", weightKg: 50 }))).toContain("underweight_losing");
  });
  it("อายุ ≥ 60 หรือ อ้วนมาก แนะนำปรึกษาแพทย์", () => {
    expect(planWarnings(profile({ age: 65 }))).toContain("see_doctor");
    expect(planWarnings(profile({ bodyFatPercent: 35 }))).toContain("see_doctor");
  });
  it("ปกติไม่มีคำเตือน", () => {
    expect(planWarnings(profile())).toEqual([]);
  });
});

import { dailyBudget } from "./exercise";

describe("dailyBudget", () => {
  it("เป้าแคลอรี่ + kcal ที่เผาผลาญของวันนั้น", () => {
    const e = (date: string, kcal: number) => ({ id: date + kcal, date, exerciseId: "walk", minutes: 30, kcal });
    expect(dailyBudget(2000, [e("2026-10-29", 150), e("2026-10-29", 100), e("2026-10-28", 999)], "2026-10-29")).toBe(2250);
  });
});
