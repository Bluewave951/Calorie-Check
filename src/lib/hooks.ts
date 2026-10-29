"use client";

import { useEffect, useState } from "react";
import { cachePeek, DATA_CHANGED_EVENT, getDailyTotals, getExercisesByDate, getExercisesInRange, getScansByDate, getScansInRange, getSettings, getWeights, queryCache } from "./db";
import { addDays, dateKey, parseDateKey } from "./nutrition";
import { frequentFoods, type FrequentFood } from "./recents";
import { dailyTotals, type DailyTotals } from "./stats";
import type { ExerciseEntry, Scan, Settings, WeightEntry } from "./types";

/**
 * โหลดข้อมูล (cloud หรือในเครื่อง) และโหลดใหม่เมื่อมีการบันทึก/ลบ
 * - เคยโหลด key นี้แล้ว → แสดงค่าเดิมทันที แล้วโหลดใหม่เบื้องหลัง
 * - ยังไม่เคย → แสดงสำเนาในเครื่อง (local) ก่อนถ้ามี
 * - query/local ต้องคืนข้อมูลของ key เดียวกันเสมอ (ไม่ต้องห่อ useCallback)
 */
function useDbQuery<T>(key: string, query: () => Promise<T>, local?: () => Promise<T | undefined>): T | undefined {
  const [state, setState] = useState<{ key: string; data: T | undefined }>(() => ({ key, data: queryCache.peek<T>(key) }));

  useEffect(() => {
    let cancel = () => {};
    const load = () => {
      cancel();
      cancel = queryCache.load({ key, remote: query, local }, (data) => setState({ key, data }));
    };
    load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => {
      cancel();
      window.removeEventListener(DATA_CHANGED_EVENT, load);
    };
    // query/local ผูกกับ key อยู่แล้ว
  }, [key]);

  if (state.key === key) return state.data;
  // เปลี่ยน key (เช่น เลื่อนสัปดาห์): ใช้ค่าที่จำไว้ของ key ใหม่ถ้ามี ไม่งั้นแสดงค่าเดิมไปก่อน
  return queryCache.peek<T>(key) ?? state.data;
}

export function useSettings(): Settings | undefined {
  return useDbQuery("settings", getSettings, () => cachePeek()?.settings() ?? Promise.resolve(undefined));
}

export function useWeights(): WeightEntry[] | undefined {
  return useDbQuery("weights", getWeights, () => cachePeek()?.weights() ?? Promise.resolve(undefined));
}

export function useScansByDate(date: string | undefined): Scan[] | undefined {
  return useDbQuery(
    `scans:${date ?? ""}`,
    () => (date ? getScansByDate(date) : Promise.resolve([])),
    () => (date ? (cachePeek()?.scansByDate(date) ?? Promise.resolve(undefined)) : Promise.resolve([])),
  );
}

export function useExercisesByDate(date: string | undefined): ExerciseEntry[] | undefined {
  return useDbQuery(
    `exercises:${date ?? ""}`,
    () => (date ? getExercisesByDate(date) : Promise.resolve([])),
    () => (date ? (cachePeek()?.exercisesByDate(date) ?? Promise.resolve(undefined)) : Promise.resolve([])),
  );
}

export function useExercisesInRange(from: string, to: string): ExerciseEntry[] | undefined {
  return useDbQuery(
    `exercises:${from}:${to}`,
    () => getExercisesInRange(from, to),
    () => cachePeek()?.exercisesInRange(from, to) ?? Promise.resolve(undefined),
  );
}

export function useScansInRange(from: string, to: string): Scan[] | undefined {
  return useDbQuery(
    `scans:${from}:${to}`,
    () => getScansInRange(from, to),
    () => cachePeek()?.scansInRange(from, to) ?? Promise.resolve(undefined),
  );
}

/** เมนูที่กินบ่อยใน 30 วันล่าสุด */
export function useFrequentFoods(today: string | undefined): FrequentFood[] | undefined {
  return useDbQuery(`frequent:${today ?? ""}`, async () => {
    if (!today) return [];
    const from = dateKey(addDays(parseDateKey(today), -30));
    return frequentFoods(await getScansInRange(from, today, { thumbnails: false }));
  });
}

export function useDailyTotals(from: string, to: string): DailyTotals | undefined {
  return useDbQuery(
    `totals:${from}:${to}`,
    () => getDailyTotals(from, to),
    async () => {
      const scans = await cachePeek()?.scansInRange(from, to);
      return scans && dailyTotals(scans);
    },
  );
}

/** วันนี้ (YYYY-MM-DD) ฝั่ง client เท่านั้น เพื่อไม่ให้ hydration ไม่ตรงกัน */
export function useNow(): Date | undefined {
  const [now, setNow] = useState<Date>();
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
