// สรุปประวัติการออกกำลังกายรายวัน / รายเดือน / รายปี
import type { ExerciseEntry } from "./types";

export interface ExerciseTotals {
  sessions: number;
  minutes: number;
  kcal: number;
}

export interface ExerciseSummary extends ExerciseTotals {
  /** จำนวนวันที่ออกกำลังกายอย่างน้อยหนึ่งครั้ง */
  activeDays: number;
  /** แยกตามกิจกรรม เรียงจาก kcal มากไปน้อย */
  byExercise: (ExerciseTotals & { exerciseId: string })[];
}

const add = (t: ExerciseTotals, e: ExerciseEntry) => {
  t.sessions += 1;
  t.minutes += e.minutes;
  t.kcal += e.kcal;
};

export function summarizeExercises(entries: ExerciseEntry[]): ExerciseSummary {
  const total: ExerciseTotals = { sessions: 0, minutes: 0, kcal: 0 };
  const byId = new Map<string, ExerciseTotals & { exerciseId: string }>();
  for (const e of entries) {
    add(total, e);
    if (!byId.has(e.exerciseId)) byId.set(e.exerciseId, { exerciseId: e.exerciseId, sessions: 0, minutes: 0, kcal: 0 });
    add(byId.get(e.exerciseId)!, e);
  }
  return {
    ...total,
    activeDays: new Set(entries.map((e) => e.date)).size,
    byExercise: [...byId.values()].sort((a, b) => b.kcal - a.kcal),
  };
}

export interface DayExercise {
  date: string;
  minutes: number;
  kcal: number;
}

/** ค่าของแต่ละวันตามลำดับ dates (ใช้วาดกราฟ) */
export function exerciseByDay(entries: ExerciseEntry[], dates: string[]): DayExercise[] {
  return dates.map((date) => {
    const day = entries.filter((e) => e.date === date);
    return { date, minutes: day.reduce((s, e) => s + e.minutes, 0), kcal: day.reduce((s, e) => s + e.kcal, 0) };
  });
}

export interface MonthExercise extends ExerciseTotals {
  /** 0–11 */
  month: number;
  activeDays: number;
}

export function exerciseByMonth(entries: ExerciseEntry[], year: number): MonthExercise[] {
  return Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const { sessions, minutes, kcal, activeDays } = summarizeExercises(entries.filter((e) => e.date.startsWith(prefix)));
    return { month, sessions, minutes, kcal, activeDays };
  });
}
