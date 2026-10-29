import { describe, expect, it } from "vitest";
import { createCachedStore, createCachePeek, createLazyStore, createMemoryCache, SaveError, type DataStore } from "./store";
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
    getExercisesInRange: guard(data.getExercisesInRange),
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

describe("createCachedStore: การออกกำลังกายตามช่วงวันที่", () => {
  it("อ่านเฉพาะช่วง รวมวันแรกและวันสุดท้าย และเน็ตหลุดยังอ่านจากสำเนาได้", async () => {
    const t = setup();
    const at = (id: string, date: string) => ({ id, date, exerciseId: "walk", minutes: 30, kcal: 150 });
    await t.store.importData([], DEFAULT_SETTINGS, [], [at("a", "2026-09-30"), at("b", "2026-10-01"), at("c", "2026-10-31"), at("d", "2026-11-01")]);
    expect((await t.store.getExercisesInRange("2026-10-01", "2026-10-31")).map((x) => x.id)).toEqual(["b", "c"]);
    t.goOffline();
    expect((await t.store.getExercisesInRange("2026-10-01", "2026-10-31")).map((x) => x.id)).toEqual(["b", "c"]);
  });
});

describe("createMemoryCache: การตั้งค่าที่เก็บไว้จริง", () => {
  it("ยังไม่เคยบันทึก → undefined / บันทึกหรือนำเข้าแล้วได้ค่า / ล้างแล้ว → undefined", async () => {
    const cache = createMemoryCache();
    expect(await cache.getStoredSettings()).toBeUndefined();
    await cache.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1600 });
    expect((await cache.getStoredSettings())?.dailyGoal).toBe(1600);
    await cache.clear();
    expect(await cache.getStoredSettings()).toBeUndefined();
    await cache.importData([], { ...DEFAULT_SETTINGS, dailyGoal: 1700 }, []);
    expect((await cache.getStoredSettings())?.dailyGoal).toBe(1700);
  });
});

describe("createCachePeek: อ่านสำเนาในเครื่องไว้แสดงก่อนระหว่างรอ cloud", () => {
  it("ไม่มีข้อมูลในสำเนา → undefined (ไม่แสดงว่า 'ว่าง' หลอก ๆ)", async () => {
    const peek = createCachePeek(createMemoryCache());
    expect(await peek.settings()).toBeUndefined();
    expect(await peek.scansByDate("2026-10-29")).toBeUndefined();
    expect(await peek.scansInRange("2026-10-01", "2026-10-31")).toBeUndefined();
    expect(await peek.weights()).toBeUndefined();
    expect(await peek.exercisesByDate("2026-10-29")).toBeUndefined();
    expect(await peek.exercisesInRange("2026-10-01", "2026-10-31")).toBeUndefined();
  });

  it("มีข้อมูลในสำเนา → คืนข้อมูลนั้น", async () => {
    const cache = createMemoryCache();
    const peek = createCachePeek(cache);
    const entry = { id: "e1", date: "2026-10-29", exerciseId: "walk", minutes: 30, kcal: 158 };
    await cache.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1600 });
    await cache.putScan(scan("a", "2026-10-29"));
    await cache.putWeight({ date: "2026-10-29", weightKg: 60 });
    await cache.putExercise(entry);

    expect((await peek.settings())?.dailyGoal).toBe(1600);
    expect((await peek.scansByDate("2026-10-29"))?.map((s) => s.id)).toEqual(["a"]);
    expect((await peek.scansInRange("2026-10-01", "2026-10-31"))?.map((s) => s.id)).toEqual(["a"]);
    expect(await peek.weights()).toEqual([{ date: "2026-10-29", weightKg: 60 }]);
    expect(await peek.exercisesByDate("2026-10-29")).toEqual([entry]);
    expect(await peek.exercisesInRange("2026-10-01", "2026-10-31")).toEqual([entry]);
  });
});

describe("createLazyStore: โหลดโค้ด cloud ทีหลัง ไม่ให้หน้าจอรอ", () => {
  it("ยังไม่ใช้ข้อมูล → ยังไม่โหลด / ใช้หลายครั้ง → โหลดครั้งเดียว", async () => {
    const remote = createMemoryCache();
    await remote.putScan(scan("a", "2026-10-29"));
    let loads = 0;
    const store = createLazyStore(async () => {
      loads++;
      return remote;
    }, createMemoryCache());

    expect(loads).toBe(0);
    expect((await store.getScansByDate("2026-10-29")).map((s) => s.id)).toEqual(["a"]);
    await store.putScan(scan("b", "2026-10-29"));
    expect(loads).toBe(1);
    expect((await remote.getScansByDate("2026-10-29")).map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("โหลดไม่ได้ (เน็ตหลุด) → อ่านจากสำเนาในเครื่อง / บันทึกไม่ได้ (offline) / ครั้งถัดไปลองโหลดใหม่", async () => {
    const cache = createMemoryCache();
    await cache.putScan(scan("local", "2026-10-29"));
    const remote = createMemoryCache();
    let fail = true;
    const store = createLazyStore(async () => {
      if (fail) throw new TypeError("Failed to fetch dynamically imported module");
      return remote;
    }, cache);

    expect((await store.getScansByDate("2026-10-29")).map((s) => s.id)).toEqual(["local"]);
    const error = await store.putScan(scan("b", "2026-10-29")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SaveError);
    expect((error as SaveError).offline).toBe(true);

    fail = false;
    expect(await store.getScansByDate("2026-10-29")).toEqual([]);
  });
});
