import { describe, expect, it } from "vitest";
import { exerciseByDay, exerciseByMonth, summarizeExercises } from "./exerciseStats";
import type { ExerciseEntry } from "./types";

const e = (id: string, date: string, exerciseId: string, minutes: number, kcal: number): ExerciseEntry => ({ id, date, exerciseId, minutes, kcal });

const entries = [
  e("1", "2026-10-01", "walk", 30, 150),
  e("2", "2026-10-01", "weights", 40, 200),
  e("3", "2026-10-05", "walk", 20, 100),
  e("4", "2026-11-02", "run", 30, 300),
];

describe("summarizeExercises", () => {
  it("รวมครั้ง นาที kcal และวันที่ออกกำลังกาย", () => {
    const s = summarizeExercises(entries);
    expect([s.sessions, s.minutes, s.kcal, s.activeDays]).toEqual([4, 120, 750, 3]);
  });
  it("แยกตามกิจกรรม เรียงจาก kcal มากไปน้อย", () => {
    expect(summarizeExercises(entries).byExercise).toEqual([
      { exerciseId: "run", sessions: 1, minutes: 30, kcal: 300 },
      { exerciseId: "walk", sessions: 2, minutes: 50, kcal: 250 },
      { exerciseId: "weights", sessions: 1, minutes: 40, kcal: 200 },
    ]);
  });
  it("ไม่มีข้อมูล = ศูนย์ทั้งหมด", () => {
    expect(summarizeExercises([])).toEqual({ sessions: 0, minutes: 0, kcal: 0, activeDays: 0, byExercise: [] });
  });
});

describe("exerciseByMonth", () => {
  it("ได้ 12 เดือน เดือนที่ไม่มีข้อมูลเป็นศูนย์", () => {
    const months = exerciseByMonth(entries, 2026);
    expect(months).toHaveLength(12);
    expect(months[9]).toEqual({ month: 9, sessions: 3, minutes: 90, kcal: 450, activeDays: 2 });
    expect(months[10].kcal).toBe(300);
    expect(months[0].kcal).toBe(0);
  });
  it("ไม่นับข้อมูลปีอื่น", () => {
    expect(exerciseByMonth([e("x", "2025-10-01", "walk", 30, 150)], 2026)[9].kcal).toBe(0);
  });
});

describe("exerciseByDay", () => {
  it("นาทีและ kcal ของแต่ละวันตามลำดับที่ขอ วันที่ไม่ได้ออกกำลังกายเป็นศูนย์", () => {
    expect(exerciseByDay(entries, ["2026-10-01", "2026-10-02", "2026-10-05"])).toEqual([
      { date: "2026-10-01", minutes: 70, kcal: 350 },
      { date: "2026-10-02", minutes: 0, kcal: 0 },
      { date: "2026-10-05", minutes: 20, kcal: 100 },
    ]);
  });
});
