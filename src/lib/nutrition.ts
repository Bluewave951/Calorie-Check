import foods from "../data/thai-foods.json";
import type { AiItem } from "./schema";
import { MEAL_TYPES, type FoodItem, type MealType, type ReferenceFood, type Scan, type Sweetness } from "./types";

export const REFERENCE_FOODS = foods as ReferenceFood[];

/** สัดส่วนน้ำตาลที่เติมเทียบกับความหวานปกติ */
export const SWEETNESS_FACTOR: Record<Sweetness, number> = { none: 0, less: 0.5, normal: 1, extra: 1.5 };

/** เครื่องดื่มประมาณการ: สมมติว่าราว 40% ของแคลอรี่มาจากน้ำตาลที่เติม */
const ESTIMATED_SUGAR_SHARE = 0.4;
const MIN_SWEETENABLE_KCAL = 20;

const byKey = new Map(REFERENCE_FOODS.map((f) => [f.key, f]));

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "").trim();
}

const byName = new Map<string, ReferenceFood>();
for (const food of REFERENCE_FOODS) {
  for (const name of [food.name_th, food.name_en, ...food.aliases]) {
    const key = normalize(name);
    if (key && !byName.has(key)) byName.set(key, food);
  }
}

export function getReference(key: string): ReferenceFood | undefined {
  return byKey.get(key);
}

/** จับคู่กับเมนูอ้างอิง: ใช้ matchKey ก่อน แล้วค่อยเทียบชื่อแบบตรงตัว */
export function findReference(matchKey: string | null, nameTh: string, nameEn: string): ReferenceFood | undefined {
  if (matchKey) {
    const hit = byKey.get(matchKey.trim());
    if (hit) return hit;
  }
  return byName.get(normalize(nameTh)) ?? (nameEn ? byName.get(normalize(nameEn)) : undefined);
}

export function searchReferences(query: string, limit = 30): ReferenceFood[] {
  const q = normalize(query);
  if (!q) return REFERENCE_FOODS.slice(0, limit);
  return REFERENCE_FOODS.filter((f) =>
    [f.name_th, f.name_en, ...f.aliases].some((n) => normalize(n).includes(q)),
  ).slice(0, limit);
}

export function computeKcal(grams: number, kcalPer100g: number): number {
  return Math.round((grams * kcalPer100g) / 100);
}

/** kcal ต่อ 100 กรัมหลังปรับระดับความหวาน (kcalPer100g เก็บไว้ที่ความหวานปกติ) */
export function effectiveKcalPer100g(item: FoodItem): number {
  if (item.sugarKcalPer100g === undefined || !item.sweetness) return item.kcalPer100g;
  return item.kcalPer100g - item.sugarKcalPer100g * (1 - SWEETNESS_FACTOR[item.sweetness]);
}

export function itemKcal(item: FoodItem): number {
  return computeKcal(item.grams, effectiveKcalPer100g(item));
}

export interface Macros {
  protein: number;
  carb: number;
  fat: number;
}

/** กรัมของสารอาหารหลักที่กินจริง (คาร์บหักน้ำตาลตามระดับความหวาน); ไม่มีข้อมูล = null */
export function itemMacros(item: FoodItem): Macros | null {
  if (item.proteinPer100g === undefined || item.carbPer100g === undefined || item.fatPer100g === undefined) return null;
  const removedSugarKcal = item.kcalPer100g - effectiveKcalPer100g(item);
  const per = item.grams / 100;
  return {
    protein: item.proteinPer100g * per,
    carb: (item.carbPer100g - removedSugarKcal / 4) * per,
    fat: item.fatPer100g * per,
  };
}

/** รวมสารอาหารเป็นกรัมเต็ม และนับรายการที่ไม่ทราบค่า (ไม่ได้รวมในยอด) */
export function sumMacros(items: FoodItem[]): Macros & { unknown: number } {
  const total = { protein: 0, carb: 0, fat: 0, unknown: 0 };
  for (const item of items) {
    const m = itemMacros(item);
    if (!m) {
      total.unknown += 1;
      continue;
    }
    total.protein += m.protein;
    total.carb += m.carb;
    total.fat += m.fat;
  }
  return { protein: Math.round(total.protein), carb: Math.round(total.carb), fat: Math.round(total.fat), unknown: total.unknown };
}

export function isDrink(item: Pick<FoodItem, "kind">): boolean {
  return item.kind === "drink";
}

/** หน่วยของ 1 ที่เสิร์ฟ สำหรับปุ่มลัด */
export function servingUnitOf(item: Pick<FoodItem, "kind" | "servingUnit">): string {
  return item.servingUnit ?? (isDrink(item) ? "แก้ว" : "จาน");
}

export function canAdjustSweetness(item: FoodItem): boolean {
  return item.sugarKcalPer100g !== undefined;
}

export function sumItems(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + itemKcal(item), 0);
}

export function sumScans(scans: Scan[]): number {
  return scans.reduce((sum, scan) => sum + sumItems(scan.items), 0);
}

/** แคลอรี่รวมของแต่ละมื้อ (มื้อที่ไม่มีบันทึก = 0) */
export function kcalByMeal(scans: Scan[]): Record<MealType, number> {
  const totals = Object.fromEntries(MEAL_TYPES.map((meal) => [meal, 0])) as Record<MealType, number>;
  for (const scan of scans) totals[scan.meal] += sumItems(scan.items);
  return totals;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function referenceFields(ref: ReferenceFood): Pick<
  FoodItem,
  | "name_th"
  | "name_en"
  | "refKey"
  | "servingGrams"
  | "servingUnit"
  | "kcalPer100g"
  | "proteinPer100g"
  | "carbPer100g"
  | "fatPer100g"
  | "estimated"
  | "kind"
  | "sugarKcalPer100g"
  | "sweetness"
> {
  return {
    name_th: ref.name_th,
    name_en: ref.name_en,
    refKey: ref.key,
    servingGrams: ref.servingGrams,
    servingUnit: ref.servingUnit,
    kcalPer100g: ref.kcalPer100g,
    proteinPer100g: ref.proteinPer100g,
    carbPer100g: ref.carbPer100g,
    fatPer100g: ref.fatPer100g,
    estimated: false,
    kind: ref.kind ?? "food",
    sugarKcalPer100g: ref.sugarKcalPer100g,
    sweetness: ref.sugarKcalPer100g !== undefined ? (ref.defaultSweetness ?? "normal") : undefined,
  };
}

/** สร้างรายการอาหารจากผล AI: ตรงกับเมนูอ้างอิง = ตัวเลขคงที่, ไม่ตรง = ค่าประมาณการ */
export function itemFromAi(ai: AiItem): FoodItem {
  const grams = Math.round(ai.grams);
  const ref = findReference(ai.matchKey, ai.name_th, ai.name_en);
  if (ref) return { id: newId(), ...referenceFields(ref), grams, confidence: ai.confidence };

  // เก็บเป็นอัตราต่อ 100 กรัม เพื่อให้ปรับปริมาณแล้วคำนวณต่อได้
  const kcalPer100g = (ai.kcal_estimate / ai.grams) * 100;
  const sweetenable = ai.is_drink && kcalPer100g >= MIN_SWEETENABLE_KCAL;
  return {
    id: newId(),
    name_th: ai.name_th,
    name_en: ai.name_en,
    refKey: null,
    grams,
    servingGrams: grams,
    kcalPer100g,
    estimated: true,
    confidence: ai.confidence,
    kind: ai.is_drink ? "drink" : "food",
    sugarKcalPer100g: sweetenable ? kcalPer100g * ESTIMATED_SUGAR_SHARE : undefined,
    sweetness: sweetenable ? "normal" : undefined,
  };
}

export function itemFromReference(ref: ReferenceFood, grams = ref.servingGrams): FoodItem {
  return { id: newId(), ...referenceFields(ref), grams, confidence: 1 };
}

/** เปลี่ยนรายการอาหารเป็นเมนูอ้างอิงอื่น โดยคงปริมาณที่ AI เห็นไว้ */
export function replaceWithReference(item: FoodItem, ref: ReferenceFood): FoodItem {
  return { ...itemFromReference(ref, item.grams), id: item.id };
}

export const PORTIONS = [0.5, 1, 1.5] as const;

export function withPortion(item: FoodItem, portion: number): FoodItem {
  return { ...item, grams: Math.round(item.servingGrams * portion), confidence: 1 };
}

export function withGrams(item: FoodItem, grams: number): FoodItem {
  return { ...item, grams: Math.max(0, Math.round(grams)), confidence: 1 };
}

export function withSweetness(item: FoodItem, sweetness: Sweetness): FoodItem {
  return canAdjustSweetness(item) ? { ...item, sweetness, confidence: 1 } : item;
}

/** เดามื้อจากเวลา: 05–10 เช้า, 10–14 กลางวัน, 17–21 เย็น, นอกนั้นว่าง */
export function guessMeal(date: Date): MealType {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 10) return "breakfast";
  if (h >= 10 && h < 14) return "lunch";
  if (h >= 17 && h < 21) return "dinner";
  return "snack";
}

/** YYYY-MM-DD ตามเวลาท้องถิ่น */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
