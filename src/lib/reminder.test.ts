import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDER, intakeReminder } from "./reminder";

const at = (hour: number, minute = 0) => new Date(2026, 9, 27, hour, minute);

describe("intakeReminder", () => {
  const goal = 1800;

  it("ถึงเวลาเตือนแล้วแต่กินไม่ถึง 80% ของเป้า → บอกว่าขาดอีกเท่าไร", () => {
    expect(intakeReminder({ eaten: 900, goal, now: at(19), reminder: DEFAULT_REMINDER })).toEqual({ remaining: 900 });
  });

  it("ยังไม่ถึงเวลาเตือน → ไม่เตือน", () => {
    expect(intakeReminder({ eaten: 0, goal, now: at(18, 59), reminder: DEFAULT_REMINDER })).toBeNull();
  });

  it("กินตั้งแต่ 80% ของเป้าแล้ว → ไม่เตือน", () => {
    expect(intakeReminder({ eaten: 1440, goal, now: at(21), reminder: DEFAULT_REMINDER })).toBeNull();
    expect(intakeReminder({ eaten: 1439, goal, now: at(21), reminder: DEFAULT_REMINDER })).toEqual({ remaining: 361 });
  });

  it("ปิดการเตือนไว้ → ไม่เตือน", () => {
    expect(intakeReminder({ eaten: 0, goal, now: at(22), reminder: { enabled: false, hour: 19 } })).toBeNull();
  });

  it("ตั้งเวลาเตือนเองได้", () => {
    const reminder = { enabled: true, hour: 15 };
    expect(intakeReminder({ eaten: 0, goal, now: at(15), reminder })).toEqual({ remaining: 1800 });
    expect(intakeReminder({ eaten: 0, goal, now: at(14, 30), reminder })).toBeNull();
  });

  it("ปิดแบนเนอร์ของวันนี้แล้ว → ไม่เตือนอีกจนถึงพรุ่งนี้", () => {
    const input = { eaten: 0, goal, now: at(20), reminder: DEFAULT_REMINDER };
    expect(intakeReminder({ ...input, dismissedOn: "2026-10-27" })).toBeNull();
    expect(intakeReminder({ ...input, dismissedOn: "2026-10-26" })).toEqual({ remaining: 1800 });
  });
});
