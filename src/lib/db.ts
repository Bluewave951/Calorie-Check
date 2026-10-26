import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { sumItems } from "./nutrition";
import type { DailyTotals } from "./stats";
import { DEFAULT_SETTINGS, type Scan, type Settings } from "./types";

interface CalorieDB extends DBSchema {
  scans: {
    key: string;
    value: Scan;
    indexes: { "by-date": string };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

let dbPromise: Promise<IDBPDatabase<CalorieDB>> | null = null;

function db() {
  dbPromise ??= openDB<CalorieDB>("calorie-check", 1, {
    upgrade(database) {
      const scans = database.createObjectStore("scans", { keyPath: "id" });
      scans.createIndex("by-date", "date");
      database.createObjectStore("settings");
    },
  });
  return dbPromise;
}

const SETTINGS_KEY = "settings";

/** แจ้งหน้าอื่นในแท็บเดียวกันว่าข้อมูลเปลี่ยน */
export const DATA_CHANGED_EVENT = "calorie-check:data-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

function byCreatedAt(a: Scan, b: Scan) {
  return a.createdAt - b.createdAt;
}

export async function getScansByDate(date: string): Promise<Scan[]> {
  return (await (await db()).getAllFromIndex("scans", "by-date", date)).sort(byCreatedAt);
}

/** การสแกนตั้งแต่วันที่ from ถึง to (รวมทั้งสองวัน) */
export async function getScansInRange(from: string, to: string): Promise<Scan[]> {
  return (await (await db()).getAllFromIndex("scans", "by-date", IDBKeyRange.bound(from, to))).sort(byCreatedAt);
}

/** ยอด kcal ต่อวันในช่วงวันที่ — อ่านทีละรายการด้วย cursor ไม่เก็บรูปย่อไว้ในหน่วยความจำ */
export async function getDailyTotals(from: string, to: string): Promise<DailyTotals> {
  const totals: DailyTotals = {};
  let cursor = await (await db()).transaction("scans").store.index("by-date").openCursor(IDBKeyRange.bound(from, to));
  while (cursor) {
    const scan = cursor.value;
    totals[scan.date] = (totals[scan.date] ?? 0) + sumItems(scan.items);
    cursor = await cursor.continue();
  }
  return totals;
}

export async function getScan(id: string): Promise<Scan | undefined> {
  return (await db()).get("scans", id);
}

/** จำเวลาที่มีข้อมูลค้างไม่ได้สำรองครั้งแรก (ไม่แตะ goalConfirmed) */
async function markUnbacked(): Promise<void> {
  const database = await db();
  const stored = await database.get("settings", SETTINGS_KEY);
  if (stored?.unbackedSince !== undefined) return;
  await database.put("settings", { ...DEFAULT_SETTINGS, ...stored, unbackedSince: Date.now() }, SETTINGS_KEY);
}

export async function putScan(scan: Scan): Promise<void> {
  await (await db()).put("scans", scan);
  await markUnbacked();
  notifyChanged();
}

export async function deleteScan(id: string): Promise<void> {
  await (await db()).delete("scans", id);
  await markUnbacked();
  notifyChanged();
}

/** ส่งออกไฟล์สำรองแล้ว → ไม่มีข้อมูลค้าง */
export async function markBackedUp(): Promise<void> {
  const database = await db();
  const { unbackedSince: _done, ...rest } = { ...DEFAULT_SETTINGS, ...(await database.get("settings", SETTINGS_KEY)) };
  await database.put("settings", rest, SETTINGS_KEY);
  notifyChanged();
}

/** ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเมื่อพื้นที่เหลือน้อยหรือไม่ได้เปิดนาน */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}

export async function getAllScans(): Promise<Scan[]> {
  return (await (await db()).getAll("scans")).sort(byCreatedAt);
}

/** นำเข้าข้อมูลสำรอง: รวมกับของเดิม (id เดียวกัน = ใช้ของในไฟล์) และใช้การตั้งค่าจากไฟล์ */
export async function importData(scans: Scan[], settings: Settings): Promise<void> {
  const { unbackedSince } = await getSettings();
  const tx = (await db()).transaction(["scans", "settings"], "readwrite");
  await Promise.all([
    ...scans.map((scan) => tx.objectStore("scans").put(scan)),
    tx.objectStore("settings").put({ ...settings, unbackedSince, goalConfirmed: true }, SETTINGS_KEY),
    tx.done,
  ]);
  notifyChanged();
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await (await db()).get("settings", SETTINGS_KEY)) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put("settings", { ...settings, goalConfirmed: true }, SETTINGS_KEY);
  notifyChanged();
}
