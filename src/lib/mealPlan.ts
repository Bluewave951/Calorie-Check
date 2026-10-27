// ตัวอย่างเมนูต่อวัน: แบ่งเป้าแคลอรี่ตามมื้อ แล้วเลือกชุดเมนูจากเมนูอ้างอิงที่ปรับปริมาณให้ใกล้เป้า
import { computeKcal, getReference, parseDateKey } from "./nutrition";
import { MEAL_TYPES, type MealType, type ReferenceFood } from "./types";

/** สัดส่วนแคลอรี่ของแต่ละมื้อ */
export const MEAL_SHARE: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

/** ชุดเมนูที่เหมาะกับการลดน้ำหนัก (key ของเมนูอ้างอิง) — เน้นต้ม นึ่ง ย่าง ผัก และโปรตีน */
export const MEAL_OPTIONS: Record<MealType, string[][]> = {
  breakfast: [
    ["rice_porridge", "boiled_egg"],
    ["khao_tom"],
    ["bread_white", "boiled_egg", "milk_plain"],
    ["rice_brown", "boiled_egg", "kaeng_jued"],
    ["soy_milk", "salapao"],
  ],
  lunch: [
    ["kuay_teow_nam"],
    ["rice_brown", "kaprao_kai"],
    ["yen_ta_fo"],
    ["sticky_rice", "kai_yang", "som_tam"],
    ["rice_white", "pla_nueng_manao", "pad_pak_ruam"],
    ["khao_man_kai"],
    ["kuay_teow_tom_yum"],
  ],
  dinner: [
    ["rice_brown", "tom_yum_kung", "pad_pak_bung"],
    ["chicken_breast", "salad_veg", "rice_brown"],
    ["rice_white", "kaeng_som", "boiled_egg"],
    ["larb_moo", "rice_brown"],
    ["suki_nam"],
    ["salmon", "salad_veg"],
    ["rice_brown", "kaeng_jued", "kai_yang"],
  ],
  snack: [["banana"], ["apple"], ["guava"], ["milk_plain"], ["papaya"], ["dragon_fruit"], ["orange"]],
};

export const PORTION_STEP = 0.5;
export const MIN_PORTION = 0.5;
export const MAX_PORTION = 2;
/** ชุดเมนูที่ปรับปริมาณแล้วห่างจากเป้ามื้อไม่เกินนี้ = ใช้ได้ */
const FIT_TOLERANCE = 0.15;
const DAY_MS = 86_400_000;

export interface PlannedItem {
  food: ReferenceFood;
  /** จำนวนที่เสิร์ฟ เช่น 1.5 จาน */
  portion: number;
  kcal: number;
}

export interface PlannedMeal {
  meal: MealType;
  target: number;
  items: PlannedItem[];
  kcal: number;
}

export interface MealPlan {
  meals: PlannedMeal[];
  total: number;
}

function planOption(keys: string[], target: number): Omit<PlannedMeal, "meal" | "target"> {
  const foods = keys.map((key) => getReference(key)!);
  const base = foods.reduce((sum, food) => sum + computeKcal(food.servingGrams, food.kcalPer100g), 0);
  const portion = Math.min(MAX_PORTION, Math.max(MIN_PORTION, Math.round(target / base / PORTION_STEP) * PORTION_STEP));
  const items = foods.map((food) => ({ food, portion, kcal: computeKcal(food.servingGrams * portion, food.kcalPer100g) }));
  return { items, kcal: items.reduce((sum, item) => sum + item.kcal, 0) };
}

/** เมนูตัวอย่างของวันหนึ่ง: วันเดียวกันได้เมนูเดิม วันถัดไปหมุนเวียนชุดที่ปริมาณพอดีกับเป้า */
export function mealPlan(goal: number, date: string): MealPlan {
  const day = Math.round(parseDateKey(date).getTime() / DAY_MS);
  const meals = MEAL_TYPES.map((meal, index): PlannedMeal => {
    const target = Math.round(goal * MEAL_SHARE[meal]);
    const planned = MEAL_OPTIONS[meal].map((keys) => planOption(keys, target));
    const error = (p: { kcal: number }) => Math.abs(p.kcal - target) / target;
    const fitting = planned.filter((p) => error(p) <= FIT_TOLERANCE);
    const chosen = fitting.length
      ? fitting[(day + index) % fitting.length]
      : planned.reduce((best, p) => (error(p) < error(best) ? p : best));
    return { meal, target, ...chosen };
  });
  return { meals, total: meals.reduce((sum, meal) => sum + meal.kcal, 0) };
}
