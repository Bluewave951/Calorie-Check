import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createIdbCache } from "./localCache";
import type { LocalCache } from "./store";
import { DEFAULT_SETTINGS, type Scan } from "./types";

function scan(id: string, date: string, createdAt: number): Scan {
  return { id, date, meal: "dinner", createdAt, thumbnail: null, items: [] };
}

let cache: LocalCache;
let dbCounter = 0;

beforeEach(() => {
  // แต่ละ test ใช้ฐานข้อมูลใหม่
  cache = createIdbCache(`calorie-check-test-${dbCounter++}`);
});

describe("createIdbCache", () => {
  it("บันทึก อ่านตามวัน/ช่วง เรียงตามเวลา และลบได้", async () => {
    await cache.putScan(scan("b", "2026-10-27", 2));
    await cache.putScan(scan("a", "2026-10-27", 1));
    await cache.putScan(scan("c", "2026-10-29", 3));

    expect((await cache.getScansByDate("2026-10-27")).map((s) => s.id)).toEqual(["a", "b"]);
    expect((await cache.getScansInRange("2026-10-27", "2026-10-29")).map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(await cache.getScan("c")).toEqual(scan("c", "2026-10-29", 3));

    await cache.deleteScan("a");
    expect((await cache.getAllScans()).map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("แทนข้อมูลทั้งช่วง: ลบของเก่าในช่วงนั้น ไม่แตะวันอื่น", async () => {
    await cache.putScan(scan("old", "2026-10-27", 1));
    await cache.putScan(scan("keep", "2026-10-30", 2));

    await cache.replaceScansInRange("2026-10-27", "2026-10-28", [scan("new", "2026-10-28", 3)]);
    expect((await cache.getAllScans()).map((s) => s.id)).toEqual(["keep", "new"]);
  });

  it("น้ำหนัก: เรียงตามวัน แทนทั้งหมดได้", async () => {
    await cache.putWeight({ date: "2026-10-28", weightKg: 61 });
    await cache.putWeight({ date: "2026-10-27", weightKg: 60 });
    expect(await cache.getWeights()).toEqual([
      { date: "2026-10-27", weightKg: 60 },
      { date: "2026-10-28", weightKg: 61 },
    ]);

    await cache.replaceWeights([{ date: "2026-10-01", weightKg: 59 }]);
    expect(await cache.getWeights()).toEqual([{ date: "2026-10-01", weightKg: 59 }]);
  });

  it("การตั้งค่า: ไม่มีค่า → ค่าเริ่มต้น", async () => {
    expect(await cache.getSettings()).toEqual(DEFAULT_SETTINGS);
    await cache.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1600 });
    expect((await cache.getSettings()).dailyGoal).toBe(1600);
  });

  it("การตั้งค่าที่เก็บไว้จริง: ยังไม่เคยบันทึก → undefined / ล้างแล้ว → undefined", async () => {
    expect(await cache.getStoredSettings()).toBeUndefined();
    await cache.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1600 });
    expect((await cache.getStoredSettings())?.dailyGoal).toBe(1600);
    await cache.clear();
    expect(await cache.getStoredSettings()).toBeUndefined();
  });

  it("นำเข้า: รวมกับของเดิม และแทนการตั้งค่า", async () => {
    await cache.putScan(scan("a", "2026-10-27", 1));
    await cache.importData([scan("b", "2026-10-27", 2)], { ...DEFAULT_SETTINGS, dailyGoal: 1900 }, [{ date: "2026-10-27", weightKg: 60 }]);

    expect((await cache.getAllScans()).map((s) => s.id)).toEqual(["a", "b"]);
    expect((await cache.getSettings()).dailyGoal).toBe(1900);
    expect(await cache.getWeights()).toHaveLength(1);
  });

  it("ล้างทั้งหมด (ออกจากระบบ)", async () => {
    await cache.putScan(scan("a", "2026-10-27", 1));
    await cache.putWeight({ date: "2026-10-27", weightKg: 60 });
    await cache.saveSettings({ ...DEFAULT_SETTINGS, dailyGoal: 1600 });

    await cache.clear();
    expect(await cache.getAllScans()).toEqual([]);
    expect(await cache.getWeights()).toEqual([]);
    expect(await cache.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
