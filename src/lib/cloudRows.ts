/**
 * แปลงข้อมูลในแอป ↔ แถวในตาราง Supabase (โครงตารางอยู่ใน supabase/schema.sql)
 * ไม่มี user_id เพราะฐานข้อมูลใส่ auth.uid() ให้เอง และ RLS กรองให้เห็นเฉพาะของตัวเอง
 */
import { DEFAULT_SETTINGS, type FoodItem, type MealType, type Scan, type Settings, type WeightEntry } from "./types";

export interface ScanRow {
  id: string;
  date: string;
  meal: MealType;
  created_at: number;
  /** ไม่ได้ select มา (เช่น หาเมนูที่กินบ่อย) = ไม่มีช่องนี้ */
  thumbnail?: string | null;
  items: FoodItem[];
}

export interface WeightRow {
  date: string;
  weight_kg: number;
}

export interface SettingsRow {
  data: Partial<Settings>;
}

export function scanToRow(scan: Scan): ScanRow {
  return { id: scan.id, date: scan.date, meal: scan.meal, created_at: scan.createdAt, thumbnail: scan.thumbnail, items: scan.items };
}

export function rowToScan(row: ScanRow): Scan {
  return { id: row.id, date: row.date, meal: row.meal, createdAt: row.created_at, thumbnail: row.thumbnail ?? null, items: row.items };
}

export function weightToRow(entry: WeightEntry): WeightRow {
  return { date: entry.date, weight_kg: entry.weightKg };
}

export function rowToWeight(row: WeightRow): WeightEntry {
  return { date: row.date, weightKg: row.weight_kg };
}

export function settingsToRow(settings: Settings): SettingsRow {
  const { unbackedSince: _local, ...data } = settings;
  return { data };
}

export function rowToSettings(row: SettingsRow | null): Settings {
  return { ...DEFAULT_SETTINGS, ...row?.data };
}
