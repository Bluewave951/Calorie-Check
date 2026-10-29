// การออกกำลังกาย: แคลอรี่ที่เผาผลาญ (MET), ระดับไขมัน และแผนรายสัปดาห์เฉพาะบุคคล
import { bmi, UNDERWEIGHT_BMI } from "./tdee";
import type { BodyProfile, ExerciseEntry, FatArea, Sex, WeightGoal } from "./types";

/** kcal = MET × 3.5 × น้ำหนัก (กก.) ÷ 200 × นาที */
export function caloriesBurned(met: number, weightKg: number, minutes: number): number {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

export type FatLevel = "athletic" | "fit" | "average" | "high" | "obese";

/** ขอบบน (ไม่รวม) ของ % ไขมันแต่ละระดับ ตามเกณฑ์ ACE */
const FAT_LEVEL_LIMITS: Record<Sex, [FatLevel, number][]> = {
  male: [["athletic", 14], ["fit", 18], ["average", 25], ["high", 30]],
  female: [["athletic", 21], ["fit", 25], ["average", 32], ["high", 38]],
};

export function fatLevel(sex: Sex, bodyFatPercent: number): FatLevel {
  return FAT_LEVEL_LIMITS[sex].find(([, max]) => bodyFatPercent < max)?.[0] ?? "obese";
}

export type ExerciseKind = "cardio" | "strength" | "flexibility";

export interface Exercise {
  id: string;
  label: string;
  met: number;
  kind: ExerciseKind;
  /** แรงกระแทกสูง: เลี่ยงสำหรับคนอ้วนมากหรือสูงอายุ */
  highImpact?: boolean;
}

export const EXERCISES: Exercise[] = [
  { id: "walk", label: "เดินเร็ว", met: 4.3, kind: "cardio" },
  { id: "run", label: "วิ่ง", met: 8, kind: "cardio", highImpact: true },
  { id: "cycle", label: "ปั่นจักรยาน", met: 6.8, kind: "cardio" },
  { id: "swim", label: "ว่ายน้ำ", met: 6, kind: "cardio" },
  { id: "hiit", label: "HIIT", met: 8, kind: "cardio", highImpact: true },
  { id: "weights", label: "เวทเทรนนิ่ง", met: 5, kind: "strength" },
  { id: "bodyweight", label: "บอดี้เวท", met: 3.8, kind: "strength" },
  { id: "yoga", label: "โยคะ/ยืดเหยียด", met: 2.5, kind: "flexibility" },
];

export function findExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export interface Move {
  name: string;
  area: FatArea | "full";
  sets: number;
  reps: string;
}

type MoveTemplate = Omit<Move, "sets">;

/** ท่ากระชับกล้ามเนื้อแต่ละส่วน */
export const TARGETED_MOVES: Record<FatArea, MoveTemplate[]> = {
  upper: [{ name: "ดัมเบลโรว์", area: "upper", reps: "12 ครั้ง" }, { name: "พุชอัพ (คุกเข่าได้)", area: "upper", reps: "10 ครั้ง" }],
  belly: [{ name: "แพลงก์", area: "belly", reps: "30 วินาที" }, { name: "เดดบั๊ก", area: "belly", reps: "10 ครั้ง/ข้าง" }],
  flank: [{ name: "ไซด์แพลงก์", area: "flank", reps: "20 วินาที/ข้าง" }, { name: "รัสเซียนทวิสต์", area: "flank", reps: "12 ครั้ง/ข้าง" }],
  hips: [{ name: "ฮิปบริดจ์", area: "hips", reps: "15 ครั้ง" }, { name: "สควอท", area: "hips", reps: "12 ครั้ง" }],
  thighs: [{ name: "ลันจ์", area: "thighs", reps: "10 ครั้ง/ข้าง" }, { name: "สเต็ปอัพ", area: "thighs", reps: "12 ครั้ง/ข้าง" }],
  arms: [{ name: "ไตรเซ็ปดิป (เก้าอี้)", area: "arms", reps: "10 ครั้ง" }, { name: "ไบเซ็ปเคิร์ล", area: "arms", reps: "12 ครั้ง" }],
};

const FULL_BODY: MoveTemplate[] = [
  { name: "สควอท", area: "full", reps: "12 ครั้ง" },
  { name: "พุชอัพ (คุกเข่าได้)", area: "full", reps: "10 ครั้ง" },
  { name: "ดัมเบลโรว์", area: "full", reps: "12 ครั้ง" },
  { name: "แพลงก์", area: "full", reps: "30 วินาที" },
];

export interface PlanDay {
  /** 1 = จันทร์ … 7 = อาทิตย์ */
  day: number;
  kind: ExerciseKind | "rest";
  exerciseId: string | null;
  minutes: number;
  kcal: number;
  moves: Move[];
}

export interface WeeklyPlan {
  days: PlanDay[];
  /** ระดับไขมันที่ใช้ตัดสิน (null = ไม่ได้กรอก % ไขมัน) */
  fatLevel: FatLevel | null;
  lowImpact: boolean;
}

const SENIOR_AGE = 60;
const OBESE_BMI = 30;
const SEDENTARY_SCALE = 0.6;

/** ตารางวัน (จ.–อา.) ตามเป้าหมายน้ำหนัก: [ชนิด, นาที] */
const SCHEDULE: Record<WeightGoal, [PlanDay["kind"], number][]> = {
  lose: [["cardio", 45], ["strength", 40], ["cardio", 45], ["cardio", 45], ["strength", 40], ["cardio", 50], ["cardio", 30]],
  maintain: [["cardio", 30], ["strength", 40], ["rest", 0], ["cardio", 30], ["strength", 40], ["cardio", 30], ["flexibility", 30]],
  gain: [["strength", 50], ["strength", 50], ["cardio", 20], ["strength", 50], ["strength", 50], ["flexibility", 20], ["rest", 0]],
};

export function leanMassKg(profile: BodyProfile): number | null {
  if (profile.bodyFatPercent === undefined) return null;
  return Math.round(profile.weightKg * (1 - profile.bodyFatPercent / 100) * 10) / 10;
}

/** อ้วนมาก: ใช้ % ไขมันถ้ามี ไม่งั้นใช้ BMI */
function isObese(profile: BodyProfile): boolean {
  return profile.bodyFatPercent !== undefined
    ? fatLevel(profile.sex, profile.bodyFatPercent) === "obese"
    : bmi(profile) >= OBESE_BMI;
}

function pickCardio(index: number, lowImpact: boolean): string {
  const ids = lowImpact ? ["walk", "swim", "cycle"] : ["walk", "run", "cycle", "swim", "hiit"];
  return ids[index % ids.length];
}

function strengthMoves(areas: FatArea[], strengthIndex: number, sets: number): Move[] {
  if (areas.length === 0) return FULL_BODY.map((m) => ({ ...m, sets }));
  // หมุนเวียนทีละไม่เกิน 3 ส่วนต่อวัน + สควอทเป็นท่าหลักทั้งตัว
  const perDay = Math.min(3, areas.length);
  const todays = Array.from({ length: perDay }, (_, i) => areas[(strengthIndex * perDay + i) % areas.length]);
  return todays.flatMap((a) => TARGETED_MOVES[a]).map((m) => ({ ...m, sets }));
}

export function recommendPlan(profile: BodyProfile): WeeklyPlan {
  const level = profile.bodyFatPercent !== undefined ? fatLevel(profile.sex, profile.bodyFatPercent) : null;
  const lowImpact = isObese(profile) || profile.age >= SENIOR_AGE;
  const scale = profile.activity === "sedentary" ? SEDENTARY_SCALE : 1;
  const sets = lowImpact || profile.activity === "sedentary" ? 2 : 3;
  const areas = profile.fatAreas ?? [];
  let cardioIndex = 0;
  let strengthIndex = 0;

  const days = SCHEDULE[profile.weightGoal].map(([kind, baseMinutes], i): PlanDay => {
    const minutes = Math.round((baseMinutes * scale) / 5) * 5;
    let exerciseId: string | null = null;
    let moves: Move[] = [];
    if (kind === "cardio") exerciseId = pickCardio(cardioIndex++, lowImpact);
    else if (kind === "strength") {
      exerciseId = lowImpact ? "bodyweight" : "weights";
      moves = strengthMoves(areas, strengthIndex++, sets);
    } else if (kind === "flexibility") exerciseId = "yoga";
    const met = exerciseId ? findExercise(exerciseId)!.met : 0;
    return { day: i + 1, kind, exerciseId, minutes, kcal: caloriesBurned(met, profile.weightKg, minutes), moves };
  });
  return { days, fatLevel: level, lowImpact };
}

export type PlanWarning = "underweight_losing" | "see_doctor";

export function planWarnings(profile: BodyProfile): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  if (profile.weightGoal === "lose" && bmi(profile) < UNDERWEIGHT_BMI) warnings.push("underweight_losing");
  if (profile.age >= SENIOR_AGE || isObese(profile)) warnings.push("see_doctor");
  return warnings;
}

/** เป้าแคลอรี่ของวัน = เป้าที่ตั้ง + kcal ที่เผาผลาญจากการออกกำลังกายวันนั้น */
export function dailyBudget(goal: number, exercises: ExerciseEntry[], date: string): number {
  return goal + exercises.filter((e) => e.date === date).reduce((sum, e) => sum + e.kcal, 0);
}
