"use client";

import { saveSettings } from "@/lib/db";
import { DEFAULT_REMINDER, REMINDER_RATIO } from "@/lib/reminder";
import { showToast } from "@/lib/toast";
import type { ReminderSettings, Settings } from "@/lib/types";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 12);

/** เปิด/ปิดการเตือนเมื่อกินยังไม่ครบเป้า และเลือกเวลาที่เริ่มเตือน */
export function ReminderSection({ settings }: { settings: Settings }) {
  const reminder = settings.reminder ?? DEFAULT_REMINDER;

  const update = async (next: ReminderSettings) => {
    await saveSettings({ ...settings, reminder: next });
    showToast({ message: next.enabled ? `จะเตือนตั้งแต่ ${next.hour}:00 น. ถ้ายังกินไม่ครบเป้า` : "ปิดการเตือนแล้ว" });
  };

  return (
    <section aria-labelledby="reminder-title" className="card flex flex-col gap-3 p-[18px]">
      <div className="flex items-center gap-3">
        <h2 id="reminder-title" className="flex-1">
          <span className="block font-heading text-[17px] leading-tight">เตือนเมื่อกินยังไม่ครบ</span>
          <span className="block text-xs text-muted">
            แสดงบนหน้า “วันนี้” เมื่อเลยเวลาที่ตั้งแล้วยังกินไม่ถึง {Math.round(REMINDER_RATIO * 100)}% ของเป้า
          </span>
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={reminder.enabled}
          aria-labelledby="reminder-title"
          onClick={() => update({ ...reminder, enabled: !reminder.enabled })}
          className={`pressable relative h-8 w-14 shrink-0 rounded-full transition-colors ${reminder.enabled ? "bg-accent" : "bg-[var(--track)]"}`}
        >
          <span
            aria-hidden
            className={`absolute top-1 size-6 rounded-full bg-surface shadow transition-[left] ${reminder.enabled ? "left-7" : "left-1"}`}
          />
        </button>
      </div>
      {reminder.enabled && (
        <label className="flex items-center gap-3 text-sm">
          <span className="flex-1">เริ่มเตือนตั้งแต่</span>
          <select
            value={reminder.hour}
            onChange={(e) => update({ ...reminder, hour: Number(e.target.value) })}
            className="min-h-11 rounded-xl border border-border bg-bg px-3 tabular-nums outline-none focus:border-primary"
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}:00 น.
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
