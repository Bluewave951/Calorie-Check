"use client";

import { createSupabaseStore } from "./cloudStore";
import { createIdbCache } from "./localCache";
import { sumItems } from "./nutrition";
import type { DailyTotals } from "./stats";
import { createCachedStore, createMemoryCache, SaveError, type DataStore, type LocalCache, type ScanQuery } from "./store";
import { CLOUD_ENABLED, getSupabase } from "./supabase/client";
import { showToast } from "./toast";
import type { ExerciseEntry, Scan, Settings, WeightEntry } from "./types";

/**
 * จุดเดียวที่หน้าจอใช้อ่าน/เขียนข้อมูล
 * - ตั้งค่า Supabase แล้ว: เก็บบน cloud + สำเนาในเครื่องไว้ดูตอนเน็ตหลุด
 * - ไม่ได้ตั้งค่า: เก็บใน IndexedDB อย่างเดียว (แบบเดิม)
 */
let cache: LocalCache | null = null;
let store: DataStore | null = null;

function localCache(): LocalCache {
  cache ??= typeof indexedDB === "undefined" ? createMemoryCache() : createIdbCache();
  return cache;
}

function data(): DataStore {
  store ??= CLOUD_ENABLED ? createCachedStore(createSupabaseStore(getSupabase()), localCache(), () => navigator.onLine) : localCache();
  return store;
}

/** แจ้งหน้าอื่นในแท็บเดียวกันว่าข้อมูลเปลี่ยน */
export const DATA_CHANGED_EVENT = "calorie-check:data-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

/** บันทึกแล้วแจ้งหน้าอื่น / บันทึกไม่สำเร็จ → แจ้งผู้ใช้ แล้ว throw ต่อให้หน้าจอหยุดทำขั้นถัดไป */
async function save(action: () => Promise<void>, { markUnbacked = true } = {}): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof SaveError) showToast({ message: error.message, tone: "error" });
    throw error;
  }
  if (markUnbacked) await markUnbackedLocally();
  notifyChanged();
}

/** จำเวลาที่มีข้อมูลค้างไม่ได้สำรองครั้งแรก — ใช้เฉพาะโหมดเก็บในเครื่อง (บน cloud ไม่ต้องสำรองเอง) */
async function markUnbackedLocally(): Promise<void> {
  if (CLOUD_ENABLED) return;
  const stored = await localCache().getSettings();
  if (stored.unbackedSince !== undefined) return;
  await localCache().saveSettings({ ...stored, unbackedSince: Date.now() });
}

export function getScansByDate(date: string): Promise<Scan[]> {
  return data().getScansByDate(date);
}

/** การสแกนตั้งแต่วันที่ from ถึง to (รวมทั้งสองวัน) */
export function getScansInRange(from: string, to: string, query?: ScanQuery): Promise<Scan[]> {
  return data().getScansInRange(from, to, query);
}

/** ยอด kcal ต่อวันในช่วงวันที่ — ไม่ดึงรูปย่อ */
export async function getDailyTotals(from: string, to: string): Promise<DailyTotals> {
  const totals: DailyTotals = {};
  for (const scan of await getScansInRange(from, to, { thumbnails: false })) {
    totals[scan.date] = (totals[scan.date] ?? 0) + sumItems(scan.items);
  }
  return totals;
}

export function getScan(id: string): Promise<Scan | undefined> {
  return data().getScan(id);
}

export function getAllScans(): Promise<Scan[]> {
  return data().getAllScans();
}

export function putScan(scan: Scan): Promise<void> {
  return save(() => data().putScan(scan));
}

export function deleteScan(id: string): Promise<void> {
  return save(() => data().deleteScan(id));
}

/** น้ำหนักทั้งหมด เรียงจากวันเก่าไปใหม่ */
export function getWeights(): Promise<WeightEntry[]> {
  return data().getWeights();
}

/** บันทึกน้ำหนักของวัน (ชั่งซ้ำวันเดียวกัน = แทนค่าเดิม) */
export function putWeight(entry: WeightEntry): Promise<void> {
  return save(() => data().putWeight(entry));
}

export function deleteWeight(date: string): Promise<void> {
  return save(() => data().deleteWeight(date));
}

export function getExercisesByDate(date: string): Promise<ExerciseEntry[]> {
  return data().getExercisesByDate(date);
}

export function getAllExercises(): Promise<ExerciseEntry[]> {
  return data().getAllExercises();
}

export function putExercise(entry: ExerciseEntry): Promise<void> {
  return save(() => data().putExercise(entry));
}

export function deleteExercise(id: string): Promise<void> {
  return save(() => data().deleteExercise(id));
}

export function getSettings(): Promise<Settings> {
  return data().getSettings();
}

export function saveSettings(settings: Settings): Promise<void> {
  return save(() => data().saveSettings({ ...settings, goalConfirmed: true }), { markUnbacked: false });
}

/** นำเข้าข้อมูลสำรอง: รวมกับของเดิม (id เดียวกัน = ใช้ของในไฟล์) และใช้การตั้งค่าจากไฟล์ */
export async function importData(scans: Scan[], settings: Settings, weights: WeightEntry[], exercises: ExerciseEntry[] = []): Promise<void> {
  const { unbackedSince } = await getSettings();
  await save(() => data().importData(scans, { ...settings, unbackedSince, goalConfirmed: true }, weights, exercises), { markUnbacked: false });
}

/** ส่งออกไฟล์สำรองแล้ว → ไม่มีข้อมูลค้าง */
export async function markBackedUp(): Promise<void> {
  if (CLOUD_ENABLED) return;
  const { unbackedSince: _done, ...rest } = await localCache().getSettings();
  await localCache().saveSettings(rest);
  notifyChanged();
}

/** ออกจากระบบ: ลบสำเนาในเครื่อง ไม่ให้คนถัดไปที่ใช้เครื่องนี้เห็น */
export async function clearLocalData(): Promise<void> {
  await localCache().clear();
}

/** ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเมื่อพื้นที่เหลือน้อยหรือไม่ได้เปิดนาน */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
