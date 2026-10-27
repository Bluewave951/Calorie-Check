// โปรแกรมลดน้ำหนัก: เป้าแคลอรี่จากอัตราลด, เส้นแผนน้ำหนัก, ความคืบหน้า และสรุปรายสัปดาห์
import { addDays, dateKey, parseDateKey } from "./nutrition";
import { REMINDER_RATIO } from "./reminder";
import type { DailyTotals } from "./stats";
import { bmi, calculateTdee, SAFE_MIN_GOAL, UNDERWEIGHT_BMI } from "./tdee";
import type { BodyProfile, LossRate, WeightProgram } from "./types";

/** พลังงานในไขมัน 1 กก. โดยประมาณ */
export const KCAL_PER_KG = 7700;
const DAY_MS = 86_400_000;

const round1 = (n: number) => Math.round(n * 10) / 10;

function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / DAY_MS);
}

export interface ProgramGoal {
  tdee: number;
  goal: number;
  /** true = ถูกยกขึ้นเป็นเป้าขั้นต่ำที่ปลอดภัย จึงลดได้ช้ากว่าที่ตั้ง */
  limited: boolean;
}

/** เป้าแคลอรี่ต่อวันสำหรับอัตราลดที่เลือก: TDEE − (อัตรา × 7,700 ÷ 7) แต่ไม่ต่ำกว่าเป้าขั้นต่ำตามเพศ */
export function programGoal(profile: BodyProfile, rate: LossRate): ProgramGoal | null {
  const result = calculateTdee(profile);
  if (!result) return null;
  const raw = result.tdee - Math.round((rate * KCAL_PER_KG) / 7);
  const min = SAFE_MIN_GOAL[profile.sex];
  return { tdee: result.tdee, goal: Math.max(raw, min), limited: raw < min };
}

export type ProgramIssue = "not_lower" | "target_underweight";

export function programIssues(startKg: number, targetKg: number, heightCm: number): ProgramIssue | null {
  if (targetKg >= startKg) return "not_lower";
  if (bmi({ heightCm, weightKg: targetKg }) < UNDERWEIGHT_BMI) return "target_underweight";
  return null;
}

/** วันที่คาดว่าจะถึงน้ำหนักเป้าหมายตามแผน */
export function programEndDate(program: WeightProgram): string {
  const weeks = (program.startWeightKg - program.targetWeightKg) / program.ratePerWeek;
  return dateKey(addDays(parseDateKey(program.startDate), Math.ceil(round1(weeks * 7))));
}

/** น้ำหนักตามแผน ณ วันหนึ่ง (เส้นตรง ไม่ต่ำกว่าเป้าหมาย) */
export function expectedWeight(program: WeightProgram, date: string): number {
  const days = Math.max(0, daysBetween(program.startDate, date));
  return round1(Math.max(program.targetWeightKg, program.startWeightKg - (program.ratePerWeek * days) / 7));
}

/** ห่างจากแผนตั้งแต่เท่านี้ = เร็ว/ช้ากว่าแผน */
export const OFF_PLAN_KG = 0.5;

export type ProgramStatus = "done" | "ahead" | "on_track" | "behind";

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  done: "ถึงเป้าหมายแล้ว",
  ahead: "เร็วกว่าแผน",
  on_track: "ตามแผน",
  behind: "ช้ากว่าแผน",
};

export interface ProgramProgress {
  /** กก. ที่ลดไปแล้ว (ติดลบ = น้ำหนักขึ้น) */
  lostKg: number;
  /** 0–100 ของน้ำหนักที่ต้องลดทั้งหมด */
  percent: number;
  expectedKg: number;
  status: ProgramStatus;
}

export function programProgress(program: WeightProgram, latestKg: number, today: string): ProgramProgress {
  const total = program.startWeightKg - program.targetWeightKg;
  const lostKg = round1(program.startWeightKg - latestKg);
  const percent = Math.round(Math.min(100, Math.max(0, (lostKg / total) * 100)));
  const expectedKg = expectedWeight(program, today);
  const diff = round1(latestKg - expectedKg);
  const status: ProgramStatus =
    latestKg <= program.targetWeightKg ? "done" : diff <= -OFF_PLAN_KG ? "ahead" : diff >= OFF_PLAN_KG ? "behind" : "on_track";
  return { lostKg, percent, expectedKg, status };
}

/** กินไม่เกินสัดส่วนนี้ของเป้า (และไม่ต่ำกว่า REMINDER_RATIO) = ตามเป้า */
export const ON_TARGET_MAX_RATIO = 1.05;
/** ต้องบันทึกอย่างน้อยเท่านี้ใน 7 วัน จึงสรุปค่าเฉลี่ยได้น่าเชื่อถือ */
export const MIN_LOGGED_DAYS = 5;

export type WeeklyTip = "log_more" | "eat_less" | "eat_more" | "keep_going";

export interface WeeklySummary {
  from: string;
  to: string;
  loggedDays: number;
  onTargetDays: number;
  underDays: number;
  overDays: number;
  /** เฉลี่ยต่อวันที่บันทึก */
  average: number;
  tip: WeeklyTip;
}

/** สรุป 7 วันที่ผ่านมา (ไม่รวมวันนี้ที่ยังกินไม่จบ) เทียบกับเป้าแคลอรี่ */
export function weeklySummary(totals: DailyTotals, goal: number, today: string): WeeklySummary {
  const end = addDays(parseDateKey(today), -1);
  const keys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(end, i - 6)));
  const min = goal * REMINDER_RATIO;
  const max = goal * ON_TARGET_MAX_RATIO;

  let loggedDays = 0;
  let onTargetDays = 0;
  let underDays = 0;
  let overDays = 0;
  let total = 0;
  for (const key of keys) {
    const kcal = totals[key];
    if (kcal === undefined) continue;
    loggedDays++;
    total += kcal;
    if (kcal < min) underDays++;
    else if (kcal > max) overDays++;
    else onTargetDays++;
  }
  const average = loggedDays ? Math.round(total / loggedDays) : 0;
  const tip: WeeklyTip =
    loggedDays < MIN_LOGGED_DAYS ? "log_more" : average > max ? "eat_less" : average < min ? "eat_more" : "keep_going";
  return { from: keys[0], to: keys[6], loggedDays, onTargetDays, underDays, overDays, average, tip };
}
