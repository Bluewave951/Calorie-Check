import { addDays, dateKey, parseDateKey } from "./nutrition";
import type { BodyProfile, WeightEntry } from "./types";

export const TREND_DAYS = 30;

export interface WeightTrend {
  latest: WeightEntry;
  /** กก. ที่เปลี่ยนจากค่าแรกในช่วง; มีค่าเดียว = null */
  change: number | null;
}

function byDate(a: WeightEntry, b: WeightEntry) {
  return a.date.localeCompare(b.date);
}

/** น้ำหนักล่าสุด และการเปลี่ยนแปลงเทียบกับค่าแรกใน TREND_DAYS วันที่ผ่านมา */
export function weightTrend(entries: WeightEntry[], today: string): WeightTrend | null {
  const sorted = [...entries].sort(byDate);
  const latest = sorted.at(-1);
  if (!latest) return null;
  const from = dateKey(addDays(parseDateKey(today), -TREND_DAYS));
  const first = sorted.find((e) => e.date >= from);
  const change = first && first !== latest ? Math.round((latest.weightKg - first.weightKg) * 10) / 10 : null;
  return { latest, change };
}

/** น้ำหนักเปลี่ยนตั้งแต่เท่านี้จากค่าที่ใช้คำนวณ TDEE → แนะนำให้คำนวณใหม่ */
export const TDEE_RECALC_KG = 2;

export function needsTdeeUpdate(profile: BodyProfile | undefined, latestKg: number): boolean {
  return profile !== undefined && Math.abs(latestKg - profile.weightKg) >= TDEE_RECALC_KG;
}
