"use client";

import { PeriodNav } from "./PeriodNav";
import { StatTiles } from "./StatTiles";
import { formatKcal } from "@/lib/format";
import { useDailyTotals } from "@/lib/hooks";
import { parseDateKey } from "@/lib/nutrition";
import { daysInMonth, monthRange, summarize } from "@/lib/stats";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface Props {
  year: number;
  month: number;
  today: string;
  goal: number;
  onShift: (months: number) => void;
  onPickDay: (date: string) => void;
}

export function MonthView({ year, month, today, goal, onShift, onPickDay }: Props) {
  const { from, to } = monthRange(year, month);
  const totals = useDailyTotals(from, to);
  const days = daysInMonth(year, month);
  const leading = new Date(year, month, 1).getDay();
  const label = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  const dayLabel = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-3">
      <section className="card p-3" aria-label={`ปฏิทิน ${label}`}>
        <PeriodNav
          label={label}
          onPrev={() => onShift(-1)}
          onNext={() => onShift(1)}
          canNext={to < today}
          prevLabel="เดือนก่อน"
          nextLabel="เดือนถัดไป"
        />
        <div className="mt-2 grid grid-cols-7 gap-1 text-center" role="grid">
          {WEEKDAYS.map((d) => (
            <span key={d} className="pb-1 text-xs text-muted" role="columnheader">
              {d}
            </span>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden />
          ))}
          {days.map((key) => {
            const kcal = totals?.[key];
            const future = key > today;
            const over = kcal !== undefined && kcal > goal;
            const date = parseDateKey(key);
            return (
              <button
                key={key}
                type="button"
                disabled={future}
                onClick={() => onPickDay(key)}
                aria-label={`${dayLabel.format(date)} ${kcal === undefined ? "ไม่ได้บันทึก" : `${kcal} kcal${over ? " เกินเป้า" : ""}`}`}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border transition-colors duration-150 disabled:opacity-30 ${
                  key === today ? "border-primary" : "border-transparent"
                } ${kcal === undefined ? "hover:bg-surface-2" : over ? "bg-over/25 hover:bg-over/35" : "bg-chart-base/30 hover:bg-chart-base/45"}`}
              >
                <span className={`text-sm tabular-nums ${key === today ? "font-semibold text-primary" : ""}`}>{date.getDate()}</span>
                {kcal !== undefined && (
                  <span className={`text-[11px] leading-tight tabular-nums ${over ? "font-semibold text-over-text" : "text-muted"}`}>
                    {kcal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-chart-base/50" aria-hidden /> ไม่เกินเป้า
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-over/45" aria-hidden /> เกินเป้า (ตัวเลขแดงหนา)
          </span>
          <span>ตัวเลข = kcal ทั้งวัน</span>
        </div>
      </section>

      {totals ? <StatTiles summary={summarize(totals, goal)} goal={goal} /> : <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />}
      <p className="px-1 text-xs text-muted">
        เทียบกับเป้าปัจจุบัน {formatKcal(goal)} kcal · เฉลี่ยคิดเฉพาะวันที่บันทึก · แตะวันที่เพื่อดูรายละเอียด
      </p>
    </div>
  );
}
