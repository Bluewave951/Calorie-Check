import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { byCreatedAt, type LocalCache } from "./store";
import { DEFAULT_SETTINGS, type Scan, type Settings, type WeightEntry } from "./types";

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
  weights: {
    key: string;
    value: WeightEntry;
  };
}

const SETTINGS_KEY = "settings";

/** ข้อมูลใน IndexedDB ของเบราว์เซอร์: ที่เก็บหลักเมื่อไม่ได้ต่อ Supabase / สำเนาไว้ดูตอนเน็ตหลุดเมื่อต่อแล้ว */
export function createIdbCache(name = "calorie-check"): LocalCache {
  let dbPromise: Promise<IDBPDatabase<CalorieDB>> | null = null;

  function db() {
    dbPromise ??= openDB<CalorieDB>(name, 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const scans = database.createObjectStore("scans", { keyPath: "id" });
          scans.createIndex("by-date", "date");
          database.createObjectStore("settings");
        }
        if (oldVersion < 2) database.createObjectStore("weights", { keyPath: "date" });
      },
    });
    return dbPromise;
  }

  async function getScansInRange(from: string, to: string): Promise<Scan[]> {
    return (await (await db()).getAllFromIndex("scans", "by-date", IDBKeyRange.bound(from, to))).sort(byCreatedAt);
  }

  return {
    getScansByDate: (date) => getScansInRange(date, date),
    getScansInRange,
    getScan: async (id) => (await db()).get("scans", id),
    getAllScans: async () => (await (await db()).getAll("scans")).sort(byCreatedAt),
    putScan: async (scan) => {
      await (await db()).put("scans", scan);
    },
    deleteScan: async (id) => {
      await (await db()).delete("scans", id);
    },
    // key คือวันที่ จึงได้เรียงจากวันเก่าไปใหม่อยู่แล้ว
    getWeights: async () => (await db()).getAll("weights"),
    putWeight: async (entry) => {
      await (await db()).put("weights", entry);
    },
    deleteWeight: async (date) => {
      await (await db()).delete("weights", date);
    },
    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await (await db()).get("settings", SETTINGS_KEY)) }),
    saveSettings: async (settings) => {
      await (await db()).put("settings", settings, SETTINGS_KEY);
    },
    importData: async (scans, settings, weights) => {
      const tx = (await db()).transaction(["scans", "settings", "weights"], "readwrite");
      await Promise.all([
        ...scans.map((scan) => tx.objectStore("scans").put(scan)),
        ...weights.map((entry) => tx.objectStore("weights").put(entry)),
        tx.objectStore("settings").put(settings, SETTINGS_KEY),
        tx.done,
      ]);
    },
    replaceScansInRange: async (from, to, scans) => {
      const tx = (await db()).transaction("scans", "readwrite");
      const oldKeys = await tx.store.index("by-date").getAllKeys(IDBKeyRange.bound(from, to));
      await Promise.all([...oldKeys.map((key) => tx.store.delete(key)), ...scans.map((scan) => tx.store.put(scan)), tx.done]);
    },
    replaceWeights: async (weights) => {
      const tx = (await db()).transaction("weights", "readwrite");
      await Promise.all([tx.store.clear(), ...weights.map((entry) => tx.store.put(entry)), tx.done]);
    },
    clear: async () => {
      const tx = (await db()).transaction(["scans", "settings", "weights"], "readwrite");
      await Promise.all([tx.objectStore("scans").clear(), tx.objectStore("settings").clear(), tx.objectStore("weights").clear(), tx.done]);
    },
  };
}
