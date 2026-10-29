"use client";

import { createIdbCache } from "./localCache";
import { dailyTotals, type DailyTotals } from "./stats";
import { createQueryCache } from "./queryCache";
import { createCachedStore, createCachePeek, createLazyStore, createMemoryCache, SaveError, type DataStore, type LocalCache, type ScanQuery } from "./store";
import { CLOUD_ENABLED } from "./supabase/config";
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

/** โหลด Supabase SDK เมื่อใช้ข้อมูลครั้งแรก (ไม่อยู่ใน JS ที่หน้าจอต้องรอก่อนแสดงผล) */
async function loadCloudStore(): Promise<DataStore> {
  const [{ createSupabaseStore }, { getSupabase }] = await Promise.all([import("./cloudStore"), import("./supabase/client")]);
  return createCachedStore(createSupabaseStore(getSupabase()), localCache(), () => navigator.onLine);
}

function data(): DataStore {
  store ??= CLOUD_ENABLED ? createLazyStore(loadCloudStore, localCache()) : localCache();
  return store;
}

/** ค่าที่หน้าจอโหลดล่าสุด: สลับหน้าแล้วแสดงทันที แล้วค่อยโหลดใหม่เบื้องหลัง */
export const queryCache = createQueryCache();

/**
 * สำเนาในเครื่องไว้แสดงก่อนระหว่างรอ cloud (ตอนเปิดแอปครั้งแรก)
 * ไม่ได้ต่อ cloud = อ่านจากเครื่องอยู่แล้ว ไม่ต้องใช้
 */
let peek: ReturnType<typeof createCachePeek> | null = null;

export function cachePeek(): ReturnType<typeof createCachePeek> | null {
  if (!CLOUD_ENABLED) return null;
  peek ??= createCachePeek(localCache());
  return peek;
}

/** แจ้งหน้าอื่นในแท็บเดียวกันว่าข้อมูลเปลี่ยน */
export const DATA_CHANGED_EVENT = "calorie-check:data-changed";

function notifyChanged() {
  queryCache.invalidate();
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
  return dailyTotals(await getScansInRange(from, to, { thumbnails: false }));
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

export function getExercisesInRange(from: string, to: string): Promise<ExerciseEntry[]> {
  return data().getExercisesInRange(from, to);
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
  queryCache.clear();
  await localCache().clear();
}

/** ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเมื่อพื้นที่เหลือน้อยหรือไม่ได้เปิดนาน */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
