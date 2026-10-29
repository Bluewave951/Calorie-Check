import { describe, expect, it } from "vitest";
import { backupFileName, BackupError, backupReminder, buildBackup, parseBackup, summarize } from "./backup";
import { DEFAULT_SETTINGS, type BodyProfile, type Scan } from "./types";

const scan = (over: Partial<Scan> = {}): Scan => ({
  id: "s1",
  date: "2026-10-26",
  meal: "lunch",
  createdAt: 1793000000000,
  thumbnail: "data:image/jpeg;base64,AAAA",
  items: [
    {
      id: "i1",
      name_th: "ชาเย็น",
      name_en: "Thai iced tea",
      refKey: "thai_tea",
      grams: 300,
      servingGrams: 350,
      kcalPer100g: 85,
      estimated: false,
      confidence: 1,
      kind: "drink",
      sugarKcalPer100g: 45,
      sweetness: "less",
    },
  ],
  ...over,
});

const settings = { dailyGoal: 1800, model: "nvidia/nemotron-3.5-super-vl:free" };

describe("ไฟล์สำรอง", () => {
  it("ส่งออกแล้วนำเข้าได้ข้อมูลเหมือนเดิม", () => {
    const backup = buildBackup([scan(), scan({ id: "s2", date: "2026-10-20", meal: "dinner" })], settings, [], [], new Date("2026-10-26T10:00:00Z"));
    const restored = parseBackup(JSON.stringify(backup));
    expect(restored).toEqual(backup);
    expect(restored.exportedAt).toBe("2026-10-26T10:00:00.000Z");
  });

  it("เก็บข้อมูลร่างกายสำหรับคำนวณ TDEE ไว้ในไฟล์สำรอง และไฟล์เก่าที่ไม่มีก็ยังนำเข้าได้", () => {
    const profile = { sex: "female", age: 25, heightCm: 165, weightKg: 60, activity: "moderate", weightGoal: "lose" } as const;
    const withProfile = buildBackup([], { ...settings, profile });
    expect(parseBackup(JSON.stringify(withProfile)).settings.profile).toEqual(profile);
    const shaped: BodyProfile = { ...profile, bodyFatPercent: 32, fatAreas: ["belly", "thighs"] };
    expect(parseBackup(JSON.stringify(buildBackup([], { ...settings, profile: shaped }))).settings.profile).toEqual(shaped);
    expect(parseBackup(JSON.stringify(buildBackup([], settings))).settings.profile).toBeUndefined();
    const broken = { ...withProfile, settings: { ...settings, profile: { ...profile, activity: "couch" } } };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(BackupError);
  });

  it("เก็บการตั้งค่าการเตือนและโปรแกรมลดน้ำหนักไว้ในไฟล์สำรอง", () => {
    const reminder = { enabled: false, hour: 20 };
    const program = { startDate: "2026-10-27", startWeightKg: 80, targetWeightKg: 75, ratePerWeek: 0.5 } as const;
    const backup = buildBackup([], { ...settings, reminder, program });
    expect(parseBackup(JSON.stringify(backup)).settings).toMatchObject({ reminder, program });
    const badRate = { ...backup, settings: { ...backup.settings, program: { ...program, ratePerWeek: 2 } } };
    expect(() => parseBackup(JSON.stringify(badRate))).toThrow(BackupError);
    const badHour = { ...backup, settings: { ...backup.settings, reminder: { enabled: true, hour: 24 } } };
    expect(() => parseBackup(JSON.stringify(badHour))).toThrow(BackupError);
  });

  it("เก็บบันทึกน้ำหนักไว้ในไฟล์สำรอง และไฟล์เก่าที่ไม่มีได้รายการว่าง", () => {
    const weights = [{ date: "2026-10-20", weightKg: 70.4 }];
    expect(parseBackup(JSON.stringify(buildBackup([], settings, weights))).weights).toEqual(weights);
    const { weights: _w, ...old } = buildBackup([], settings);
    expect(parseBackup(JSON.stringify(old)).weights).toEqual([]);
    const bad = { ...buildBackup([], settings), weights: [{ date: "2026-10-20", weightKg: 5 }] };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(BackupError);
  });

  it("เก็บสารอาหารหลักของรายการอาหาร", () => {
    const item = { ...scan().items[0], proteinPer100g: 1.2, carbPer100g: 14.5, fatPer100g: 2.6 };
    const restored = parseBackup(JSON.stringify(buildBackup([scan({ items: [item] })], settings)));
    expect(restored.scans[0].items[0]).toMatchObject({ proteinPer100g: 1.2, carbPer100g: 14.5, fatPer100g: 2.6 });
  });

  it("ข้อมูลเก่าที่ไม่มีช่องเครื่องดื่มและรูปย่อยังนำเข้าได้", () => {
    const old = scan({ thumbnail: null });
    const { kind: _k, sugarKcalPer100g: _s, sweetness: _w, ...legacyItem } = old.items[0];
    const backup = buildBackup([{ ...old, items: [legacyItem] }], settings);
    expect(parseBackup(JSON.stringify(backup)).scans[0].items[0].kind).toBeUndefined();
  });

  it("ปฏิเสธไฟล์ที่ไม่ใช่ไฟล์สำรอง", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError);
    expect(() => parseBackup('{"hello": 1}')).toThrow("ไม่ใช่ไฟล์สำรอง");
    expect(() => parseBackup(JSON.stringify({ ...buildBackup([], settings), version: 99 }))).toThrow("เวอร์ชันอื่น");
  });

  it("ปฏิเสธไฟล์ที่ข้อมูลข้างในเสีย", () => {
    const bad = (s: unknown) => JSON.stringify({ ...buildBackup([], settings), scans: [s] });
    expect(() => parseBackup(bad({ ...scan(), meal: "brunch" }))).toThrow("เสียหรือถูกแก้ไข");
    expect(() => parseBackup(bad({ ...scan(), date: "26/10/2026" }))).toThrow(BackupError);
    expect(() => parseBackup(bad({ ...scan(), thumbnail: "javascript:alert(1)" }))).toThrow(BackupError);
    expect(() => parseBackup(bad({ ...scan(), items: [{ ...scan().items[0], grams: -1 }] }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ ...buildBackup([], settings), settings: { dailyGoal: 50, model: "" } }))).toThrow(BackupError);
  });

  it("สรุปจำนวนการสแกนและช่วงวันที่", () => {
    expect(summarize([scan(), scan({ id: "s2", date: "2026-10-20" }), scan({ id: "s3" })])).toEqual({
      scans: 3,
      days: 2,
      from: "2026-10-20",
      to: "2026-10-26",
    });
    expect(summarize([])).toEqual({ scans: 0, days: 0, from: null, to: null });
  });

  it("ชื่อไฟล์มีวันที่", () => {
    expect(backupFileName(new Date(2026, 9, 5))).toBe("calorie-check-backup-2026-10-05.json");
  });
});

describe("เตือนให้สำรองข้อมูล", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = new Date(2026, 9, 26, 12).getTime();

  it("ไม่มีข้อมูลใหม่ตั้งแต่สำรองล่าสุด → ไม่เตือน", () => {
    expect(backupReminder(undefined, now)).toBeNull();
  });

  it("มีข้อมูลที่ยังไม่สำรองครบ 14 วัน → เตือนพร้อมจำนวนวัน", () => {
    expect(backupReminder(now - 13 * DAY, now)).toBeNull();
    expect(backupReminder(now - 14 * DAY, now)).toBe(14);
    expect(backupReminder(now - 20.5 * DAY, now)).toBe(20);
  });
});

describe("สำรองประวัติการออกกำลังกาย", () => {
  const entry = { id: "e1", date: "2026-10-29", exerciseId: "walk", minutes: 30, kcal: 158 };

  it("ส่งออกแล้วนำเข้าได้ข้อมูลเดิม", () => {
    const backup = buildBackup([], DEFAULT_SETTINGS, [], [entry]);
    expect(parseBackup(JSON.stringify(backup)).exercises).toEqual([entry]);
  });

  it("ไฟล์เก่าที่ไม่มีช่อง exercises = รายการว่าง", () => {
    const { exercises: _, ...old } = buildBackup([], DEFAULT_SETTINGS);
    expect(parseBackup(JSON.stringify(old)).exercises).toEqual([]);
  });

  it("ข้อมูลเสีย (นาทีติดลบ) นำเข้าไม่ได้", () => {
    const backup = buildBackup([], DEFAULT_SETTINGS, [], [{ ...entry, minutes: -5 }]);
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(BackupError);
  });
});
