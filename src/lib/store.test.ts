import { describe, expect, it } from "vitest";
import { createCachedStore, createMemoryCache, SaveError, type DataStore } from "./store";
import { DEFAULT_SETTINGS, type Scan } from "./types";

function scan(id: string, date: string, createdAt = 1, thumbnail: string | null = "data:image/jpeg;base64,AA"): Scan {
  return { id, date, meal: "lunch", createdAt, thumbnail, items: [] };
}

/** cloud จำลอง: ใช้ memory cache เป็นที่เก็บ และสั่งให้ล่มได้ */
function fakeRemote() {
  const data = createMemoryCache();
  let down = false;
  const guard =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    (...args: A) =>
      down ? Promise.reject(new TypeError("Failed to fetch")) : fn(...args);
  const remote: DataStore = {
    getScansByDate: guard(data.getScansByDate),
    getScansInRange: guard(data.getScansInRange),
    getScan: guard(data.getScan),
    getAllScans: guard(data.getAllScans),
    putScan: guard(data.putScan),
    deleteScan: guard(data.deleteScan),
    getWeights: guard(data.getWeights),
    putWeight: guard(data.putWeight),
    deleteWeight: guard(data.deleteWeight),
    getExercisesByDate: guard(data.getExercisesByDate),
    putExercise: guard(data.putExercise),
    deleteExercise: guard(data.deleteExercise),
    getAllExercises: guard(data.getAllExercises),
    getSettings: guard(data.getSettings),
    saveSettings: guard(data.saveSettings),
    importData: guard(data.importData),
  };
  return { remote, data, setDown: (value: boolean) => (down = value) };
}

function setup() {
  const cloud = fakeRemote();
  const cache = createMemoryCache();
  let online = true;
  const store = createCachedStore(cloud.remote, cache, () => online);
  return {
    cloud,
    cache,
    store,
    goOffline() {
      online = false;
      cloud.setDown(true);
    },
  };
}

describe("createCachedStore: อ่าน", () => {
  it("อ่านจาก cloud แล้วเก็บสำเนาลงเครื่อง", async () => {
    const { cloud, cache, store } = setup();
    await cloud.data.putScan(scan("a", "2026-10-27"));

    expect(await store.getScansByDate("2026-10-27")).toEqual([scan("a", "2026-10-27")]);
    expect(await cache.getScansByDate("2026-10-27")).toEqual([scan("a", "2026-10-27")]);
  });

  it("เน็ตหลุด → ใช้สำเนาในเครื่อง", async () => {
    const { cloud, store, goOffline } = setup();
    await cloud.data.putScan(scan("a", "2026-10-27"));
    await store.getScansByDate("2026-10-27");

    goOffline();
    expect(await store.getScansByDate("2026-10-27")).toEqual([scan("a", "2026-10-27")]);
  });

  it("รายการที่ถูกลบจากเครื่องอื่น หายจากสำเนาด้วย", async () => {
    const { cloud, cache, store } = setup();
    await cache.putScan(scan("deleted-elsewhere", "2026-10-27", 1));
    await cache.putScan(scan("other-day", "2026-10-28", 3));
    await cloud.data.putScan(scan("a", "2026-10-27", 2));

    await store.getScansByDate("2026-10-27");
    expect((await cache.getAllScans()).map((s) => s.id)).toEqual(["a", "other-day"]);
  });

  it("อ่านแบบไม่เอารูปย่อ ไม่ไปทับสำเนาที่มีรูป", async () => {
    const { cloud, cache, store } = setup();
    await cloud.data.putScan(scan("a", "2026-10-27"));
    await cache.putScan(scan("a", "2026-10-27"));

    await store.getScansInRange("2026-10-01", "2026-10-31", { thumbnails: false });
    expect((await cache.getScan("a"))?.thumbnail).not.toBeNull();
  });

  it("น้ำหนักและการตั้งค่า: เก็บสำเนา และใช้สำเนาเมื่อเน็ตหลุด", async () => {
    const { cloud, store, goOffline } = setup();
    await cloud.data.putWeight({ date: "2026-10-27", weightKg: 60 });
    await cloud.data.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1700 });
    await store.getWeights();
    await store.getSettings();

    goOffline();
    expect(await store.getWeights()).toEqual([{ date: "2026-10-27", weightKg: 60 }]);
    expect((await store.getSettings()).dailyGoal).toBe(1700);
  });
});

describe("createCachedStore: บันทึก", () => {
  it("บันทึกขึ้น cloud แล้วอัปเดตสำเนา", async () => {
    const { cloud, cache, store } = setup();
    await store.putScan(scan("a", "2026-10-27"));
    expect(await cloud.data.getScan("a")).toBeDefined();
    expect(await cache.getScan("a")).toBeDefined();

    await store.deleteScan("a");
    expect(await cloud.data.getScan("a")).toBeUndefined();
    expect(await cache.getScan("a")).toBeUndefined();
  });

  it("ไม่มีเน็ต → SaveError แบบ offline และไม่แตะสำเนา", async () => {
    const { cache, store, goOffline } = setup();
    goOffline();

    const error = await store.putScan(scan("a", "2026-10-27")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SaveError);
    expect((error as SaveError).offline).toBe(true);
    expect(await cache.getScan("a")).toBeUndefined();
  });

  it("cloud ตอบ error ทั้งที่มีเน็ต → SaveError ที่ไม่ใช่ offline", async () => {
    const { cloud, store } = setup();
    cloud.setDown(true);

    const error = await store.putWeight({ date: "2026-10-27", weightKg: 60 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SaveError);
    expect((error as SaveError).offline).toBe(false);
  });
});

describe("createCachedStore: การออกกำลังกาย", () => {
  const entry = { id: "e1", date: "2026-10-29", exerciseId: "walk", minutes: 30, kcal: 158 };

  it("บันทึกขึ้น cloud และอ่านได้ตามวัน", async () => {
    const { store, cloud } = setup();
    await store.putExercise(entry);
    expect(await cloud.data.getExercisesByDate("2026-10-29")).toEqual([entry]);
    expect(await store.getExercisesByDate("2026-10-30")).toEqual([]);
  });

  it("เน็ตหลุด: อ่านจากสำเนา", async () => {
    const t = setup();
    await t.store.putExercise(entry);
    t.goOffline();
    expect(await t.store.getExercisesByDate("2026-10-29")).toEqual([entry]);
  });

  it("ลบแล้วหายทั้ง cloud และสำเนา", async () => {
    const t = setup();
    await t.store.putExercise(entry);
    await t.store.deleteExercise("e1");
    expect(await t.cache.getExercisesByDate("2026-10-29")).toEqual([]);
    expect(await t.cloud.data.getExercisesByDate("2026-10-29")).toEqual([]);
  });
});

describe("createCachedStore: นำเข้า/ส่งออกการออกกำลังกาย", () => {
  const entry = { id: "e1", date: "2026-10-29", exerciseId: "walk", minutes: 30, kcal: 158 };

  it("importData รวมการออกกำลังกาย และ getAllExercises อ่านได้ทุกวัน", async () => {
    const { store } = setup();
    await store.importData([], DEFAULT_SETTINGS, [], [entry, { ...entry, id: "e2", date: "2026-10-28" }]);
    expect((await store.getAllExercises()).map((e) => e.id)).toEqual(["e2", "e1"]);
  });
});
