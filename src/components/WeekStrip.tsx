"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dateKey, parseDateKey } from "@/lib/nutrition";
import { formatShortWeekday } from "@/lib/format";

interface Props {
  /** วันสุดท้ายของช่วง 7 วันที่แสดง */
  endDate: string;
  selected: string;
  today: string;
  totals: Record<string, number>;
  goal: number;
  onSelect: (date: string) => void;
  onShift: (weeks: number) => void;
}

export function WeekStrip({ endDate, selected, today, totals, goal, onSelect, onShift }: Props) {
  const touchX = useRef<number | null>(null);
  const end = parseDateKey(endDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  const canGoForward = endDate < today;
  const range = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

  return (
    <section
      aria-label="7 วันย้อนหลัง"
      className="card p-3"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > 60) onShift(-1);
        else if (dx < -60 && canGoForward) onShift(1);
      }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onShift(-1)}
          aria-label="สัปดาห์ก่อน"
          className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ChevronLeft aria-hidden size={22} />
        </button>
        <span className="text-sm font-medium">
          {range.format(days[0])} – {range.format(days[6])}
        </span>
        <button
          type="button"
          onClick={() => onShift(1)}
          disabled={!canGoForward}
          aria-label="สัปดาห์ถัดไป"
          className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronRight aria-hidden size={22} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = dateKey(day);
          const total = totals[key] ?? 0;
          const over = total > goal;
          const ratio = goal > 0 ? Math.min(1, total / goal) : 0;
          const isSelected = key === selected;
          const future = key > today;
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={`${new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" }).format(day)} ${total} kcal${over ? " เกินเป้า" : ""}`}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors duration-150 disabled:opacity-30 ${
                isSelected ? "bg-surface-2" : "hover:bg-surface-2"
              }`}
            >
              <span className="text-xs text-muted">{formatShortWeekday(day)}</span>
              <span className="flex h-14 w-3 items-end overflow-hidden rounded-full bg-track" aria-hidden>
                <span
                  className={`w-full rounded-full ${over ? "bg-over" : "bg-chart-base"}`}
                  style={{ height: `${Math.max(total > 0 ? 8 : 0, ratio * 100)}%` }}
                />
              </span>
              <span
                className={`flex size-7 items-center justify-center rounded-full text-sm tabular-nums ${
                  isSelected ? "bg-primary font-semibold text-on-primary" : key === today ? "font-semibold text-primary" : ""
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
