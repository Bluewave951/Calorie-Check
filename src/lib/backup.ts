import { z } from "zod";
import { BODY_LIMITS } from "./tdee";
import {
  ACTIVITY_LEVELS,
  LOSS_RATES,
  MAX_GOAL,
  MEAL_TYPES,
  MIN_GOAL,
  SWEETNESS_LEVELS,
  WEIGHT_GOALS,
  FAT_AREAS,
  type Scan,
  type Settings,
  type WeightEntry,
  type ExerciseEntry,
} from "./types";

const BACKUP_APP = "calorie-check";
const BACKUP_VERSION = 1;

const foodItemSchema = z.object({
  id: z.string().min(1),
  name_th: z.string(),
  name_en: z.string(),
  refKey: z.string().nullable(),
  grams: z.number().nonnegative().finite(),
  servingGrams: z.number().nonnegative().finite(),
  servingUnit: z.string().optional(),
  kcalPer100g: z.number().nonnegative().finite(),
  proteinPer100g: z.number().nonnegative().finite().optional(),
  carbPer100g: z.number().nonnegative().finite().optional(),
  fatPer100g: z.number().nonnegative().finite().optional(),
  estimated: z.boolean(),
  confidence: z.number().min(0).max(1),
  kind: z.enum(["food", "drink"]).optional(),
  sugarKcalPer100g: z.number().nonnegative().finite().optional(),
  sweetness: z.enum(SWEETNESS_LEVELS).optional(),
});

const scanSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal: z.enum(MEAL_TYPES),
  createdAt: z.number().finite(),
  thumbnail: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .nullable(),
  items: z.array(foodItemSchema),
});

const between = ([min, max]: readonly [number, number]) => z.number().min(min).max(max);

const profileSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: between(BODY_LIMITS.age),
  heightCm: between(BODY_LIMITS.heightCm),
  weightKg: between(BODY_LIMITS.weightKg),
  activity: z.enum(ACTIVITY_LEVELS),
  weightGoal: z.enum(WEIGHT_GOALS),
  bodyFatPercent: z.number().min(3).max(70).optional(),
  fatAreas: z.array(z.enum(FAT_AREAS)).optional(),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const reminderSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
});

const programSchema = z.object({
  startDate: dateSchema,
  startWeightKg: between(BODY_LIMITS.weightKg),
  targetWeightKg: between(BODY_LIMITS.weightKg),
  ratePerWeek: z.literal(LOSS_RATES),
});

const settingsSchema = z.object({
  dailyGoal: z.number().int().min(MIN_GOAL).max(MAX_GOAL),
  model: z.string(),
  profile: profileSchema.optional(),
  reminder: reminderSchema.optional(),
  program: programSchema.optional(),
});

const weightSchema = z.object({
  date: dateSchema,
  weightKg: between(BODY_LIMITS.weightKg),
});

const exerciseSchema = z.object({
  id: z.string().min(1),
  date: dateSchema,
  exerciseId: z.string().min(1),
  minutes: z.number().int().min(1).max(1440),
  kcal: z.number().min(0),
});

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  settings: settingsSchema,
  scans: z.array(scanSchema),
  /** ไฟล์ก่อนมีบันทึกน้ำหนัก = ไม่มีช่องนี้ */
  weights: z.array(weightSchema).default([]),
  /** ไฟล์ก่อนมีบันทึกออกกำลังกาย = ไม่มีช่องนี้ */
  exercises: z.array(exerciseSchema).default([]),
});

export type Backup = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

export function buildBackup(scans: Scan[], settings: Settings, weights: WeightEntry[] = [],
  exercises: ExerciseEntry[] = [],
  now = new Date(),
): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), settings, scans, weights, exercises };
}

export function backupFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `calorie-check-backup-${y}-${m}-${d}.json`;
}

/** อ่านไฟล์สำรองและตรวจทุกช่องก่อนนำเข้า เพื่อไม่ให้ข้อมูลเสียปนเข้าฐานข้อมูล */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Calorie&Check (อ่าน JSON ไม่ได้)");
  }
  if (!data || typeof data !== "object" || (data as { app?: unknown }).app !== BACKUP_APP) {
    throw new BackupError("ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Calorie&Check");
  }
  if ((data as { version?: unknown }).version !== BACKUP_VERSION) {
    throw new BackupError("ไฟล์สำรองนี้มาจากแอปเวอร์ชันอื่น นำเข้าไม่ได้");
  }
  const result = backupSchema.safeParse(data);
  if (!result.success) throw new BackupError("ไฟล์สำรองเสียหรือถูกแก้ไข นำเข้าไม่ได้");
  return result.data;
}

export interface BackupSummary {
  scans: number;
  days: number;
  from: string | null;
  to: string | null;
}

export function summarize(scans: Pick<Scan, "date">[]): BackupSummary {
  const dates = [...new Set(scans.map((s) => s.date))].sort();
  return { scans: scans.length, days: dates.length, from: dates[0] ?? null, to: dates.at(-1) ?? null };
}

/** เตือนเมื่อมีข้อมูลที่ยังไม่ได้สำรองนานเกินนี้ */
export const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** จำนวนวันที่มีข้อมูลค้างไม่ได้สำรอง ถ้าถึงเกณฑ์เตือน; ไม่ถึงหรือไม่มีข้อมูลค้าง = null */
export function backupReminder(unbackedSince: number | undefined, now: number): number | null {
  if (unbackedSince === undefined) return null;
  const days = Math.floor((now - unbackedSince) / DAY_MS);
  return days >= BACKUP_REMINDER_DAYS ? days : null;
}
