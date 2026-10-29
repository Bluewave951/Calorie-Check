import type { SupabaseClient } from "@supabase/supabase-js";
import { exerciseToRow, rowToExercise, type ExerciseRow, rowToScan, rowToSettings, rowToWeight, scanToRow, settingsToRow, weightToRow, type ScanRow, type SettingsRow, type WeightRow } from "./cloudRows";
import type { DataStore } from "./store";

const SCAN_COLUMNS = "id,date,meal,created_at,thumbnail,items";
const SCAN_COLUMNS_NO_THUMBNAIL = "id,date,meal,created_at,items";
/** ส่งทีละชุดตอนนำเข้า (มีรูปย่อ ~15 KB ต่อรายการ) ไม่ให้คำขอใหญ่เกินไป */
const IMPORT_BATCH = 50;

/** supabase-js ไม่ throw เอง แต่คืน { error } → แปลงเป็น throw */
function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message, { cause: error });
  return data;
}

function chunks<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

/** ข้อมูลบน Supabase (โครงตารางและ RLS อยู่ใน supabase/schema.sql) — เห็นเฉพาะของผู้ที่ล็อกอิน */
export function createSupabaseStore(client: SupabaseClient): DataStore {
  const scans = () => client.from("scans");
  const weights = () => client.from("weights");
  const settings = () => client.from("settings");
  const exercises = () => client.from("exercises");

  const upsertScans = async (rows: ScanRow[]) => void check(await scans().upsert(rows, { onConflict: "user_id,id" }));
  const upsertWeights = async (rows: WeightRow[]) => void check(await weights().upsert(rows, { onConflict: "user_id,date" }));
  const upsertSettings = async (row: SettingsRow) => void check(await settings().upsert(row, { onConflict: "user_id" }));

  async function getScansInRange(from: string, to: string, query?: { thumbnails?: boolean }) {
    const columns = query?.thumbnails === false ? SCAN_COLUMNS_NO_THUMBNAIL : SCAN_COLUMNS;
    const rows = check(await scans().select(columns).gte("date", from).lte("date", to).order("created_at"));
    return (rows as unknown as ScanRow[]).map(rowToScan);
  }

  return {
    getScansByDate: async (date) => {
      const rows = check(await scans().select(SCAN_COLUMNS).eq("date", date).order("created_at"));
      return (rows as ScanRow[]).map(rowToScan);
    },
    getScansInRange,
    getScan: async (id) => {
      const row = check(await scans().select(SCAN_COLUMNS).eq("id", id).maybeSingle());
      return row ? rowToScan(row as ScanRow) : undefined;
    },
    getAllScans: async () => {
      const rows = check(await scans().select(SCAN_COLUMNS).order("created_at"));
      return (rows as ScanRow[]).map(rowToScan);
    },
    putScan: (scan) => upsertScans([scanToRow(scan)]).then(() => {}),
    deleteScan: async (id) => void check(await scans().delete().eq("id", id)),
    getWeights: async () => {
      const rows = check(await weights().select("date,weight_kg").order("date"));
      return (rows as WeightRow[]).map(rowToWeight);
    },
    putWeight: (entry) => upsertWeights([weightToRow(entry)]),
    deleteWeight: async (date) => void check(await weights().delete().eq("date", date)),
    getExercisesByDate: async (date) => {
      const rows = check(await exercises().select("id,date,exercise_id,minutes,kcal").eq("date", date).order("id"));
      return (rows as ExerciseRow[]).map(rowToExercise);
    },
    getAllExercises: async () => {
      const rows = check(await exercises().select("id,date,exercise_id,minutes,kcal").order("date").order("id"));
      return (rows as ExerciseRow[]).map(rowToExercise);
    },
    putExercise: async (entry) => void check(await exercises().upsert(exerciseToRow(entry), { onConflict: "user_id,id" })),
    deleteExercise: async (id) => void check(await exercises().delete().eq("id", id)),
    getSettings: async () => rowToSettings(check(await settings().select("data").maybeSingle()) as SettingsRow | null),
    saveSettings: (value) => upsertSettings(settingsToRow(value)),
    importData: async (newScans, newSettings, newWeights, newExercises = []) => {
      for (const batch of chunks(newExercises.map(exerciseToRow), IMPORT_BATCH)) {
        check(await exercises().upsert(batch, { onConflict: "user_id,id" }));
      }
      for (const batch of chunks(newScans.map(scanToRow), IMPORT_BATCH)) await upsertScans(batch);
      if (newWeights.length) await upsertWeights(newWeights.map(weightToRow));
      await upsertSettings(settingsToRow(newSettings));
    },
  };
}
