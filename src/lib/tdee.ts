import { MAX_GOAL, MIN_GOAL, type ActivityLevel, type BodyProfile, type WeightGoal } from "./types";

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
