import { describe, expect, it } from "vitest";
import { MEAL_OPTIONS, MEAL_SHARE, mealPlan } from "./mealPlan";
import { getReference } from "./nutrition";
import { MEAL_TYPES } from "./types";

describe("MEAL_OPTIONS", () => {
  it("ทุกเมนูในชุดตัวอย่างมีอยู่ในตารางเมนูอ้างอิง", () => {
    for (const meal of MEAL_TYPES) {
      for (const option of MEAL_OPTIONS[meal]) {
        for (const key of option) expect(getReference(key), key).toBeDefined();
      }
    }
  });

  it("สัดส่วนแคลอรี่ของสี่มื้อรวมกันได้ 100%", () => {
    expect(MEAL_TYPES.reduce((sum, meal) => sum + MEAL_SHARE[meal], 0)).toBeCloseTo(1);
  });
});

describe("mealPlan", () => {
  const week = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];

  it("มีครบสี่มื้อ เรียงเช้า กลางวัน เย็น ว่าง", () => {
    expect(mealPlan(1500, "2026-10-27").meals.map((m) => m.meal)).toEqual([...MEAL_TYPES]);
  });

  it.each([1200, 1500, 1800, 2200, 2500])("เป้า %i kcal: ยอดรวมทั้งวันห่างจากเป้าไม่เกิน 15%% ทุกวันในสัปดาห์", (goal) => {
    for (const date of week) {
      const plan = mealPlan(goal, date);
      expect(Math.abs(plan.total - goal) / goal, date).toBeLessThanOrEqual(0.15);
    }
  });

  it("ยอดรวมของมื้อ = ผลรวมของรายการ และยอดทั้งวัน = ผลรวมของมื้อ", () => {
    const plan = mealPlan(1600, "2026-10-27");
    for (const meal of plan.meals) expect(meal.kcal).toBe(meal.items.reduce((s, i) => s + i.kcal, 0));
    expect(plan.total).toBe(plan.meals.reduce((s, m) => s + m.kcal, 0));
  });

  it("ปริมาณเป็นขั้นละครึ่งที่เสิร์ฟ ตั้งแต่ ½ ถึง 2", () => {
    for (const date of week) {
      for (const meal of mealPlan(2500, date).meals) {
        for (const item of meal.items) {
          expect(item.portion * 2).toBe(Math.round(item.portion * 2));
          expect(item.portion).toBeGreaterThanOrEqual(0.5);
          expect(item.portion).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("วันเดียวกันได้เมนูเดิม แต่ไม่ซ้ำกันทุกวันตลอดสัปดาห์", () => {
    const keysOf = (date: string) => JSON.stringify(mealPlan(1500, date).meals.map((m) => m.items.map((i) => i.food.key)));
    expect(keysOf("2026-10-27")).toBe(keysOf("2026-10-27"));
    expect(new Set(week.map(keysOf)).size).toBeGreaterThan(3);
  });
});
