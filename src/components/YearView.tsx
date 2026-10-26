"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PeriodNav } from "./PeriodNav";
import { StatTiles } from "./StatTiles";
import { formatKcal } from "@/lib/format";
import { useDailyTotals } from "@/lib/hooks";
import { summarize, summarizeYear, yearRange } from "@/lib/stats";

interface Props {
  year: number;
  today: string;
  goal: number;
  onShift: (years: number) => void;
  onPickMonth: (month: number) => void;
}

const CHART_HEIGHT = 160;

export function YearView({ year, today, goal, onShift, onPickMonth }: Props) {
  const { from, to } = yearRange(year);
  const totals = useDailyTotals(from, to);
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const isCurrentYear = Number(today.slice(0, 4)) === year;
  const [selected, setSelected] = useState<number | null>(isCurrentYear ? currentMonth : null);

  const shortMonth = new Intl.DateTimeFormat("th-TH", { month: "short" });
  const longMonth = new Intl.DateTimeFormat("th-TH", { month: "long" });
  const yearLabel = new Intl.DateTimeFormat("th-TH", { year: "numeric" }).format(new Date(year, 0, 1));

  if (!totals) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy />;

  const months = summarizeYear(totals, goal, year);
  const scaleMax = Math.max(goal * 1.25, ...months.map((m) => m.average));
  const y = (kcal: number) => (kcal / scaleMax) * CHART_HEIGHT;
  const detail = selected === null ? null : months[selected];

  return (
    <div className="flex flex-col gap-3">
      <section className="card p-3" aria-label={`ค่าเฉลี่ยต่อวันรายเดือน ปี ${yearLabel}`}>
        <PeriodNav
          label={yearLabel}
          onPrev={() => {
            setSelected(null);
            onShift(-1);
          }}
          onNext={() => {
            setSelected(null);
            onShift(1);
          }}
          canNext={to < today}
          prevLabel="ปีก่อน"
          nextLabel="ปีถัดไป"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted">
          <span>เฉลี่ย kcal ต่อวัน แยกรายเดือน</span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-chart-base" aria-hidden /> ไม่เกินเป้า
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-over" aria-hidden /> เกินเป้า
          </span>
        </div>

        <div className="relative mt-3 px-1" style={{ height: CHART_HEIGHT + 24 }}>
          {/* เส้นเป้า */}
          <div className="pointer-events-none absolute inset-x-1 border-t border-dashed border-muted" style={{ bottom: 24 + y(goal) }} aria-hidden>
            <span className="absolute -top-4 right-0 bg-surface px-1 text-[11px] text-muted">เป้า {formatKcal(goal)}</span>
          </div>
          <div className="absolute inset-x-1 bottom-6 border-t border-border" aria-hidden />

          <div className="absolute inset-x-1 bottom-0 top-0 grid grid-cols-12 gap-0.5">
            {months.map((m) => {
              const future = isCurrentYear && m.month > currentMonth;
              const over = m.loggedDays > 0 && m.average > goal;
              const active = selected === m.month;
              return (
                <button
                  key={m.month}
                  type="button"
                  disabled={future}
                  onClick={() => setSelected(m.month)}
                  onMouseEnter={() => setSelected(m.month)}
                  aria-pressed={active}
                  aria-label={`${longMonth.format(new Date(year, m.month, 1))}: ${
                    m.loggedDays ? `เฉลี่ย ${m.average} kcal ต่อวัน${over ? " เกินเป้า" : ""}` : "ไม่ได้บันทึก"
                  }`}
                  className={`group flex flex-col items-center justify-end rounded-lg pb-0 disabled:opacity-30 ${active ? "bg-surface-2" : ""}`}
                >
                  <span className="flex w-full flex-1 items-end justify-center px-[2px]">
                    {m.loggedDays > 0 && (
                      <span
                        className={`w-full max-w-5 rounded-t-[4px] transition-[height] duration-300 ${over ? "bg-over" : "bg-chart-base"} ${
                          active ? "" : "opacity-80 group-hover:opacity-100"
                        }`}
                        style={{ height: Math.max(3, y(m.average)) }}
                      />
                    )}
                  </span>
                  <span className={`flex h-6 items-center text-[11px] ${active ? "font-semibold text-text" : "text-muted"}`}>
                    {shortMonth.format(new Date(year, m.month, 1))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 min-h-14 rounded-2xl bg-surface-2 px-3 py-2" aria-live="polite">
          {detail ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm">
                <p className="font-medium">{longMonth.format(new Date(year, detail.month, 1))}</p>
                <p className="text-muted">
                  {detail.loggedDays
                    ? `เฉลี่ย ${formatKcal(detail.average)} kcal/วัน · บันทึก ${detail.loggedDays} วัน · เกินเป้า ${detail.overDays} วัน`
                    : "ไม่ได้บันทึก"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPickMonth(detail.month)}
                className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-3 text-sm font-medium text-primary hover:bg-surface"
              >
                ดูเดือนนี้ <ChevronRight aria-hidden size={16} />
              </button>
            </div>
          ) : (
            <p className="py-2 text-sm text-muted">แตะแท่งกราฟเพื่อดูรายละเอียดของเดือน</p>
          )}
        </div>
      </section>

      <StatTiles summary={summarize(totals, goal)} goal={goal} />

      <details className="rounded-2xl bg-surface p-3 text-sm shadow-card">
        <summary className="min-h-11 cursor-pointer content-center font-medium">ดูเป็นตาราง</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 text-left font-normal">เดือน</th>
              <th className="py-1 text-right font-normal">เฉลี่ย/วัน</th>
              <th className="py-1 text-right font-normal">บันทึก</th>
              <th className="py-1 text-right font-normal">เกินเป้า</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-t border-border">
                <td className="py-1.5">{longMonth.format(new Date(year, m.month, 1))}</td>
                <td className={`py-1.5 text-right ${m.loggedDays && m.average > goal ? "font-semibold text-over-text" : ""}`}>
                  {m.loggedDays ? formatKcal(m.average) : "–"}
                </td>
                <td className="py-1.5 text-right">{m.loggedDays} วัน</td>
                <td className="py-1.5 text-right">{m.overDays} วัน</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="px-1 text-xs text-muted">เทียบกับเป้าปัจจุบัน {formatKcal(goal)} kcal · เฉลี่ยคิดเฉพาะวันที่บันทึก</p>
    </div>
  );
}
