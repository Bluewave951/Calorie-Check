import { dateKey, sumItems } from "./nutrition";
import type { Scan } from "./types";

/** ยอด kcal ต่อวัน: { "2026-10-26": 1850 } (วันที่ไม่มีการสแกน = ไม่มี key) */
export type DailyTotals = Record<string, number>;

export function dailyTotals(scans: Scan[]): DailyTotals {
  const totals: DailyTotals = {};
  for (const scan of scans) totals[scan.date] = (totals[scan.date] ?? 0) + sumItems(scan.items);
  return totals;
}

export interface PeriodSummary {
  /** จำนวนวันที่มีการบันทึก */
  loggedDays: number;
  total: number;
  /** เฉลี่ยต่อวันที่บันทึก (ไม่นับวันที่ไม่ได้บันทึก) */
  average: number;
  overDays: number;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** วันที่ทุกวันในเดือน (month: 0–11) */
export function daysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => dateKey(new Date(year, month, i + 1)));
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const days = daysInMonth(year, month);
  return { from: days[0], to: days.at(-1)! };
}

export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function summarize(totals: DailyTotals, goal: number, keys: string[] = Object.keys(totals)): PeriodSummary {
  let loggedDays = 0;
  let total = 0;
  let overDays = 0;
  for (const key of keys) {
    const kcal = totals[key];
    if (kcal === undefined) continue;
    loggedDays++;
    total += kcal;
    if (kcal > goal) overDays++;
  }
  return { loggedDays, total, average: loggedDays ? Math.round(total / loggedDays) : 0, overDays };
}

export interface MonthSummary extends PeriodSummary {
  month: number;
}

/** สรุปทั้ง 12 เดือนของปี */
export function summarizeYear(totals: DailyTotals, goal: number, year: number): MonthSummary[] {
  return Array.from({ length: 12 }, (_, month) => ({
    month,
    ...summarize(totals, goal, daysInMonth(year, month)),
  }));
}
