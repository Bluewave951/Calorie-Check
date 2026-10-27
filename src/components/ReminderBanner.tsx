"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { openAddSheet } from "@/lib/addSheet";
import { formatKcal } from "@/lib/format";
import { dateKey } from "@/lib/nutrition";
import { DEFAULT_REMINDER, intakeReminder } from "@/lib/reminder";
import type { ReminderSettings } from "@/lib/types";

/** วันที่ปิดแบนเนอร์ไว้ (จำในเครื่องนี้ ไม่ต้องขึ้น cloud) */
const DISMISS_KEY = "calorie-check:reminder-dismissed";

interface Props {
  eaten: number;
  goal: number;
  now: Date;
  reminder?: ReminderSettings;
}

/** เตือนเมื่อเลยเวลาที่ตั้งไว้แล้วยังกินไม่ครบเป้า — ปิดได้ทีละวัน */
export function ReminderBanner({ eaten, goal, now, reminder = DEFAULT_REMINDER }: Props) {
  const [dismissedOn, setDismissedOn] = useState<string | null | undefined>(undefined);

  // อ่านหลัง mount เพื่อไม่ให้ค่าจาก server กับ client ไม่ตรงกัน
  useEffect(() => setDismissedOn(localStorage.getItem(DISMISS_KEY)), []);

  if (dismissedOn === undefined) return null;
  const result = intakeReminder({ eaten, goal, now, reminder, dismissedOn });
  if (!result) return null;

  const dismiss = () => {
    const today = dateKey(now);
    localStorage.setItem(DISMISS_KEY, today);
    setDismissedOn(today);
  };

  return (
    <section role="status" aria-label="แจ้งเตือนแคลอรี่" className="card flex items-start gap-3 border-warn/40 bg-warn-bg p-3">
      <BellRing aria-hidden size={22} className="mt-0.5 shrink-0 text-warn-text" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {eaten === 0 ? "วันนี้ยังไม่ได้บันทึกอาหารเลย" : `วันนี้ยังขาดอีก ${formatKcal(result.remaining)} kcal`}
        </p>
        <p className="text-muted">กินน้อยกว่าเป้ามากเกินไปอาจทำให้หิวจัดและร่างกายเผาผลาญช้าลง ถ้ากินแล้วอย่าลืมบันทึก</p>
        <button
          type="button"
          onClick={() => openAddSheet()}
          className="pressable mt-2 min-h-11 rounded-full bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover"
        >
          บันทึกอาหาร
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="ปิดการเตือนของวันนี้"
        className="pressable -m-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-text/5"
      >
        <X aria-hidden size={20} />
      </button>
    </section>
  );
}
