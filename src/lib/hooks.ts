"use client";

import { useCallback, useEffect, useState } from "react";
import { DATA_CHANGED_EVENT, getDailyTotals, getExercisesByDate, getExercisesInRange, getScansByDate, getScansInRange, getSettings, getWeights } from "./db";
import { addDays, dateKey, parseDateKey } from "./nutrition";
import { frequentFoods, type FrequentFood } from "./recents";
import type { DailyTotals } from "./stats";
import type { ExerciseEntry, Scan, Settings, WeightEntry } from "./types";

/** โหลดข้อมูล (cloud หรือในเครื่อง) และโหลดใหม่เมื่อมีการบันทึก/ลบ */
function useDbQuery<T>(query: () => Promise<T>): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let active = true;
    const load = () => {
      query().then((result) => {
        if (active) setData(result);
      });
    };
    load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(DATA_CHANGED_EVENT, load);
    };
  }, [query]);

  return data;
}

export function useSettings(): Settings | undefined {
  return useDbQuery(getSettings);
}

export function useWeights(): WeightEntry[] | undefined {
  return useDbQuery(getWeights);
}

export function useScansByDate(date: string | undefined): Scan[] | undefined {
  const query = useCallback(() => (date ? getScansByDate(date) : Promise.resolve([])), [date]);
  return useDbQuery(query);
}

export function useExercisesByDate(date: string | undefined): ExerciseEntry[] | undefined {
  const query = useCallback(() => (date ? getExercisesByDate(date) : Promise.resolve([])), [date]);
  return useDbQuery(query);
}

export function useExercisesInRange(from: string, to: string): ExerciseEntry[] | undefined {
  const query = useCallback(() => getExercisesInRange(from, to), [from, to]);
  return useDbQuery(query);
}

export function useScansInRange(from: string, to: string): Scan[] | undefined {
  const query = useCallback(() => getScansInRange(from, to), [from, to]);
  return useDbQuery(query);
}

/** เมนูที่กินบ่อยใน 30 วันล่าสุด */
export function useFrequentFoods(today: string | undefined): FrequentFood[] | undefined {
  const query = useCallback(async () => {
    if (!today) return [];
    const from = dateKey(addDays(parseDateKey(today), -30));
    return frequentFoods(await getScansInRange(from, today, { thumbnails: false }));
  }, [today]);
  return useDbQuery(query);
}

export function useDailyTotals(from: string, to: string): DailyTotals | undefined {
  const query = useCallback(() => getDailyTotals(from, to), [from, to]);
  return useDbQuery(query);
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
