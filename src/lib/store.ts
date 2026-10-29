/**
 * ที่เก็บข้อมูลของแอป: cloud (Supabase) + สำเนาในเครื่อง (IndexedDB) ไว้เปิดดูตอนเน็ตหลุด
 * - อ่าน: cloud ก่อน สำเร็จแล้วเก็บสำเนา / ไม่สำเร็จใช้สำเนา
 * - บันทึก: ต้องขึ้น cloud ได้ก่อนจึงอัปเดตสำเนา (ไม่มีคิวรอส่งทีหลัง กันข้อมูลชนกันระหว่างเครื่อง)
 */
import { DEFAULT_SETTINGS, type Scan, type Settings, type WeightEntry, type ExerciseEntry } from "./types";

export interface ScanQuery {
  /** false = ไม่ดึงรูปย่อ (ใช้ตอนต้องการแค่รายการอาหาร ประหยัดเน็ต) */
  thumbnails?: boolean;
}

export interface DataStore {
  getScansByDate(date: string): Promise<Scan[]>;
  /** from ถึง to รวมทั้งสองวัน เรียงตามเวลาที่บันทึก */
  getScansInRange(from: string, to: string, query?: ScanQuery): Promise<Scan[]>;
  getScan(id: string): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  putScan(scan: Scan): Promise<void>;
  deleteScan(id: string): Promise<void>;
  /** เรียงจากวันเก่าไปใหม่ */
  getWeights(): Promise<WeightEntry[]>;
  putWeight(entry: WeightEntry): Promise<void>;
  deleteWeight(date: string): Promise<void>;
  /** เรียงตาม id (สร้างจากเวลาที่บันทึก) */
  getExercisesByDate(date: string): Promise<ExerciseEntry[]>;
  getAllExercises(): Promise<ExerciseEntry[]>;
  putExercise(entry: ExerciseEntry): Promise<void>;
  deleteExercise(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  /** รวมกับของเดิม (id เดียวกัน = ใช้ของใหม่) และแทนการตั้งค่า */
  importData(scans: Scan[], settings: Settings, weights: WeightEntry[], exercises?: ExerciseEntry[]): Promise<void>;
}

/** สำเนาในเครื่อง: ต้องแทนข้อมูลทั้งช่วงได้ เพื่อลบรายการที่ถูกลบจากเครื่องอื่น */
export interface LocalCache extends DataStore {
  replaceScansInRange(from: string, to: string, scans: Scan[]): Promise<void>;
  replaceWeights(weights: WeightEntry[]): Promise<void>;
  replaceExercisesByDate(date: string, entries: ExerciseEntry[]): Promise<void>;
  replaceAllExercises(entries: ExerciseEntry[]): Promise<void>;
  clear(): Promise<void>;
}

/** บันทึกไม่สำเร็จ: offline = ไม่มีอินเทอร์เน็ต */
export class SaveError extends Error {
  constructor(
    readonly offline: boolean,
    options?: ErrorOptions,
  ) {
    super(offline ? "ไม่มีอินเทอร์เน็ต ยังบันทึกไม่ได้ ลองใหม่เมื่อต่อเน็ตแล้ว" : "บันทึกขึ้น cloud ไม่สำเร็จ ลองใหม่อีกครั้ง", options);
    this.name = "SaveError";
  }
}

const ALL_DATES = ["0000-01-01", "9999-12-31"] as const;

export function byCreatedAt(a: Scan, b: Scan) {
  return a.createdAt - b.createdAt;
}

export function byDateThenId(a: ExerciseEntry, b: ExerciseEntry) {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

export function createCachedStore(remote: DataStore, cache: LocalCache, isOnline: () => boolean): DataStore {
  /** อ่าน cloud แล้วเก็บสำเนา ถ้าอ่านไม่ได้ใช้สำเนา */
  async function read<T>(fromRemote: () => Promise<T>, saveCopy: (value: T) => Promise<void>, fromCache: () => Promise<T>): Promise<T> {
    let value: T;
    try {
      value = await fromRemote();
    } catch {
      return fromCache();
    }
    await saveCopy(value).catch(() => {});
    return value;
  }

  async function write(toRemote: () => Promise<void>, toCache: () => Promise<void>): Promise<void> {
    if (!isOnline()) throw new SaveError(true);
    try {
      await toRemote();
    } catch (error) {
      throw new SaveError(!isOnline(), { cause: error });
    }
    await toCache().catch(() => {});
  }

  return {
    getScansByDate: (date) =>
      read(
        () => remote.getScansByDate(date),
        (scans) => cache.replaceScansInRange(date, date, scans),
        () => cache.getScansByDate(date),
      ),
    getScansInRange: (from, to, query) =>
      read(
        () => remote.getScansInRange(from, to, query),
        // ข้อมูลที่ไม่มีรูปย่อ ห้ามทับสำเนาที่มีรูป
        (scans) => (query?.thumbnails === false ? Promise.resolve() : cache.replaceScansInRange(from, to, scans)),
        () => cache.getScansInRange(from, to, query),
      ),
    getScan: (id) =>
      read(
        () => remote.getScan(id),
        (scan) => (scan ? cache.putScan(scan) : cache.deleteScan(id)),
        () => cache.getScan(id),
      ),
    getAllScans: () =>
      read(
        () => remote.getAllScans(),
        (scans) => cache.replaceScansInRange(...ALL_DATES, scans),
        () => cache.getAllScans(),
      ),
    putScan: (scan) =>
      write(
        () => remote.putScan(scan),
        () => cache.putScan(scan),
      ),
    deleteScan: (id) =>
      write(
        () => remote.deleteScan(id),
        () => cache.deleteScan(id),
      ),
    getWeights: () =>
      read(
        () => remote.getWeights(),
        (weights) => cache.replaceWeights(weights),
        () => cache.getWeights(),
      ),
    putWeight: (entry) =>
      write(
        () => remote.putWeight(entry),
        () => cache.putWeight(entry),
      ),
    deleteWeight: (date) =>
      write(
        () => remote.deleteWeight(date),
        () => cache.deleteWeight(date),
      ),
    getExercisesByDate: (date) =>
      read(
        () => remote.getExercisesByDate(date),
        (entries) => cache.replaceExercisesByDate(date, entries),
        () => cache.getExercisesByDate(date),
      ),
    getAllExercises: () =>
      read(
        () => remote.getAllExercises(),
        (entries) => cache.replaceAllExercises(entries),
        () => cache.getAllExercises(),
      ),
    putExercise: (entry) =>
      write(
        () => remote.putExercise(entry),
        () => cache.putExercise(entry),
      ),
    deleteExercise: (id) =>
      write(
        () => remote.deleteExercise(id),
        () => cache.deleteExercise(id),
      ),
    getSettings: () =>
      read(
        () => remote.getSettings(),
        (settings) => cache.saveSettings(settings),
        () => cache.getSettings(),
      ),
    saveSettings: (settings) =>
      write(
        () => remote.saveSettings(settings),
        () => cache.saveSettings(settings),
      ),
    importData: (scans, settings, weights, exercises = []) =>
      write(
        () => remote.importData(scans, settings, weights, exercises),
        () => cache.importData(scans, settings, weights, exercises),
      ),
  };
}

/** ที่เก็บในหน่วยความจำ: ใช้ใน test และเป็นสำรองเมื่อเบราว์เซอร์ไม่มี IndexedDB */
export function createMemoryCache(): LocalCache {
  const scans = new Map<string, Scan>();
  const weights = new Map<string, WeightEntry>();
  const exercises = new Map<string, ExerciseEntry>();
  let settings: Settings = DEFAULT_SETTINGS;

  const inRange = (from: string, to: string) => [...scans.values()].filter((s) => s.date >= from && s.date <= to).sort(byCreatedAt);

  return {
    getScansByDate: async (date) => inRange(date, date),
    getScansInRange: async (from, to) => inRange(from, to),
    getScan: async (id) => scans.get(id),
    getAllScans: async () => inRange(...ALL_DATES),
    putScan: async (scan) => void scans.set(scan.id, scan),
    deleteScan: async (id) => void scans.delete(id),
    getWeights: async () => [...weights.values()].sort((a, b) => a.date.localeCompare(b.date)),
    putWeight: async (entry) => void weights.set(entry.date, entry),
    deleteWeight: async (date) => void weights.delete(date),
    getExercisesByDate: async (date) => [...exercises.values()].filter((e) => e.date === date).sort((a, b) => a.id.localeCompare(b.id)),
    getAllExercises: async () => [...exercises.values()].sort(byDateThenId),
    putExercise: async (entry) => void exercises.set(entry.id, entry),
    deleteExercise: async (id) => void exercises.delete(id),
    getSettings: async () => settings,
    saveSettings: async (next) => void (settings = next),
    importData: async (newScans, newSettings, newWeights, newExercises = []) => {
      for (const entry of newExercises) exercises.set(entry.id, entry);
      for (const scan of newScans) scans.set(scan.id, scan);
      for (const entry of newWeights) weights.set(entry.date, entry);
      settings = newSettings;
    },
    replaceScansInRange: async (from, to, next) => {
      for (const scan of inRange(from, to)) scans.delete(scan.id);
      for (const scan of next) scans.set(scan.id, scan);
    },
    replaceWeights: async (next) => {
      weights.clear();
      for (const entry of next) weights.set(entry.date, entry);
    },
    replaceAllExercises: async (next) => {
      exercises.clear();
      for (const entry of next) exercises.set(entry.id, entry);
    },
    replaceExercisesByDate: async (date, next) => {
      for (const entry of exercises.values()) if (entry.date === date) exercises.delete(entry.id);
      for (const entry of next) exercises.set(entry.id, entry);
    },
    clear: async () => {
      scans.clear();
      exercises.clear();
      weights.clear();
      settings = DEFAULT_SETTINGS;
    },
  };
}
