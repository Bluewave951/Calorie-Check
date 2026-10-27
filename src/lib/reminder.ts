import { dateKey } from "./nutrition";
import type { ReminderSettings } from "./types";

export const DEFAULT_REMINDER: ReminderSettings = { enabled: true, hour: 19 };

/** กินถึงสัดส่วนนี้ของเป้าแล้ว = ถือว่าใกล้ครบ ไม่ต้องเตือน */
export const REMINDER_RATIO = 0.8;

export interface ReminderInput {
  eaten: number;
  goal: number;
  now: Date;
  reminder: ReminderSettings;
  /** วันที่ (YYYY-MM-DD) ที่ผู้ใช้ปิดแบนเนอร์ไว้ */
  dismissedOn?: string | null;
}

/** เตือนเมื่อเลยเวลาที่ตั้งไว้แล้วยังกินไม่ถึง REMINDER_RATIO ของเป้า; ไม่ต้องเตือน = null */
export function intakeReminder({ eaten, goal, now, reminder, dismissedOn }: ReminderInput): { remaining: number } | null {
  if (!reminder.enabled || now.getHours() < reminder.hour) return null;
  if (dismissedOn === dateKey(now)) return null;
  if (eaten >= goal * REMINDER_RATIO) return null;
  return { remaining: goal - eaten };
}
