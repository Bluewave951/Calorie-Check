import { MAX_GOAL, MIN_GOAL, type ActivityLevel, type BodyProfile, type Sex, type WeightGoal } from "./types";
import type { Macros } from "./nutrition";

/** ตัวคูณระดับกิจกรรม (Harris-Benedict activity factors) */
export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** kcal ที่บวก/ลบจาก TDEE ตามเป้าหมายน้ำหนัก */
export const GOAL_ADJUSTMENT: Record<WeightGoal, number> = { lose: -500, maintain: 0, gain: 300 };

export interface TdeeResult {
  bmr: number;
  tdee: number;
  goal: number;
}

/** ช่วงข้อมูลร่างกายที่สูตรใช้ได้ (รวมขอบ) */
export const BODY_LIMITS = {
  age: [15, 100],
  heightCm: [100, 250],
  weightKg: [30, 300],
} as const;

function inRange(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}

/** BMR ตามสูตร Mifflin-St Jeor แล้วคูณระดับกิจกรรมเป็น TDEE; ข้อมูลนอกช่วง = null */
export function calculateTdee(profile: BodyProfile): TdeeResult | null {
  if (
    !inRange(profile.age, BODY_LIMITS.age) ||
    !inRange(profile.heightCm, BODY_LIMITS.heightCm) ||
    !inRange(profile.weightKg, BODY_LIMITS.weightKg)
  ) {
    return null;
  }
  const sexOffset = profile.sex === "male" ? 5 : -161;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[profile.activity]);
  const goal = Math.min(MAX_GOAL, Math.max(MIN_GOAL, tdee + GOAL_ADJUSTMENT[profile.weightGoal]));
  return { bmr: Math.round(bmr), tdee, goal };
}

/** เป้าแคลอรี่ขั้นต่ำที่ไม่ควรต่ำกว่าโดยไม่มีผู้เชี่ยวชาญดูแล (ไม่ทราบเพศ = ค่าที่ต่ำกว่า) */
export const SAFE_MIN_GOAL: Record<Sex, number> = { female: 1200, male: 1500 };
export const UNDERWEIGHT_BMI = 18.5;

export type GoalWarning = "below_minimum" | "underweight_losing";

export function bmi(profile: Pick<BodyProfile, "heightCm" | "weightKg">): number {
  const meters = profile.heightCm / 100;
  return profile.weightKg / (meters * meters);
}

/** ข้อควรระวังของเป้าแคลอรี่ เทียบกับข้อมูลร่างกาย (ถ้ามี) */
export function goalWarnings(goal: number, profile: BodyProfile | undefined): GoalWarning[] {
  const warnings: GoalWarning[] = [];
  if (goal < (profile ? SAFE_MIN_GOAL[profile.sex] : SAFE_MIN_GOAL.female)) warnings.push("below_minimum");
  if (profile?.weightGoal === "lose" && bmi(profile) < UNDERWEIGHT_BMI) warnings.push("underweight_losing");
  return warnings;
}

/** โปรตีนกรัมต่อน้ำหนักตัว 1 กก. (ลดน้ำหนักต้องการมากขึ้นเพื่อรักษากล้ามเนื้อ) */
const PROTEIN_PER_KG: Record<WeightGoal, number> = { lose: 1.6, maintain: 1.2, gain: 1.2 };
const FAT_SHARE = 0.25;
/** ไม่ทราบน้ำหนักตัว → ใช้สัดส่วนพลังงานแทน */
const PROTEIN_SHARE = 0.15;

/** เป้าสารอาหารหลักต่อวัน (กรัม): โปรตีนตามน้ำหนักตัว, ไขมัน 25% ของพลังงาน, คาร์บเป็นส่วนที่เหลือ */
export function macroTargets(goal: number, profile: BodyProfile | undefined): Macros {
  const protein = Math.round(profile ? profile.weightKg * PROTEIN_PER_KG[profile.weightGoal] : (goal * PROTEIN_SHARE) / 4);
  const fatKcal = goal * FAT_SHARE;
  const carb = Math.max(0, (goal - protein * 4 - fatKcal) / 4);
  return { protein, carb: Math.round(carb), fat: Math.round(fatKcal / 9) };
}
