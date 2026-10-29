"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { findExercise } from "@/lib/exercise";
import { exerciseByDay, exerciseByMonth, summarizeExercises } from "@/lib/exerciseStats";
import { formatKcal, formatShortWeekday, formatThaiDate } from "@/lib/format";
import { useExercisesInRange } from "@/lib/hooks";
import { parseDateKey } from "@/lib/nutrition";
import { daysInMonth, yearRange } from "@/lib/stats";

const MONTH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const BAR_HEIGHT = 100;

export type ExerciseRange =
  | { kind: "week"; dates: string[]; selected: string }
  | { kind: "month"; year: number; month: number }
  | { kind: "year"; year: number };

interface Bar {
  key: string;
  /** ป้ายใต้แท่ง (ว่าง = ไม่แสดง เพื่อไม่ให้แน่นเกินไป) */
  label: string;
  /** ชื่อเต็มใน aria-label และกล่องรายละเอียด */
  title: string;
  minutes: number;
  kcal: number;
}

function rangeOf(range: ExerciseRange): { from: string; to: string } {
  if (range.kind === "week") return { from: range.dates[0], to: range.dates.at(-1)! };
  if (range.kind === "month") {
    const days = daysInMonth(range.year, range.month);
    return { from: days[0], to: days.at(-1)! };
  }
  return yearRange(range.year);
}

function shortDate(date: string) {
  return formatThaiDate(parseDateKey(date), { weekday: "short", day: "numeric", month: "short", year: undefined });
}

/** สรุปการออกกำลังกายของช่วงที่ดูในหน้าประวัติ: ตัวเลขรวม + กราฟแท่ง kcal + แยกตามกิจกรรม */
export function ExerciseHistory({ range }: { range: ExerciseRange }) {
  const { from, to } = rangeOf(range);
  const entries = useExercisesInRange(from, to);

  if (!entries) return <div className="h-48 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  const bars: Bar[] =
    range.kind === "year"
      ? exerciseByMonth(entries, range.year).map((m) => ({
          key: String(m.month),
          label: MONTH_SHORT[m.month],
          title: `${MONTH_SHORT[m.month]} ${range.year + 543}`,
          minutes: m.minutes,
          kcal: m.kcal,
        }))
      : exerciseByDay(entries, range.kind === "week" ? range.dates : daysInMonth(range.year, range.month)).map((d, i) => ({
          key: d.date,
          label: range.kind === "week" ? formatShortWeekday(parseDateKey(d.date)) : i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : "",
          title: shortDate(d.date),
          minutes: d.minutes,
          kcal: d.kcal,
        }));

  // มุมมองวัน: ตัวเลขรวมและรายการเป็นของวันที่เลือก ส่วนกราฟเป็นทั้งสัปดาห์
  const shown = range.kind === "week" ? entries.filter((e) => e.date === range.selected) : entries;
  const summary = summarizeExercises(shown);

  return (
    <section aria-labelledby="exercise-history-title" className="card flex flex-col gap-3 p-4">
      <h2 id="exercise-history-title" className="flex items-center gap-2 font-heading text-lg font-medium">
        <Dumbbell aria-hidden size={20} className="text-primary" />
        ออกกำลังกาย
      </h2>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: range.kind === "week" ? "ครั้ง" : "วันที่ออก", value: range.kind === "week" ? summary.sessions : summary.activeDays },
          { label: "นาที", value: summary.minutes },
          { label: "kcal", value: summary.kcal },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface-2 p-2">
            <dd className="font-heading text-xl font-semibold tabular-nums">{formatKcal(s.value)}</dd>
            <dt className="text-xs text-muted">
              {s.label}
            </dt>
          </div>
        ))}
      </dl>

      <ExerciseBars bars={bars} selected={range.kind === "week" ? range.selected : undefined} />

      {summary.byExercise.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {summary.byExercise.map((x) => (
            <li key={x.exerciseId} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span className="flex-1">{findExercise(x.exerciseId)?.label ?? x.exerciseId}</span>
              <span className="text-muted tabular-nums">
                {x.sessions} ครั้ง · {x.minutes} นาที · {formatKcal(x.kcal)} kcal
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">ยังไม่มีการออกกำลังกาย{range.kind === "week" ? "ในวันที่เลือก" : range.kind === "month" ? "ในเดือนนี้" : "ในปีนี้"}</p>
      )}
    </section>
  );
}

function ExerciseBars({ bars, selected }: { bars: Bar[]; selected?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.kcal));
  const detail = bars.find((b) => b.key === active);
  const thin = bars.length > 12;

  return (
    <div>
      <div className="relative" style={{ height: BAR_HEIGHT + 22 }}>
        <div className="absolute inset-x-0 bottom-[22px] border-t border-border" aria-hidden />
        <div className="absolute inset-0 grid gap-px" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((bar) => {
            const on = bar.key === active || bar.key === selected;
            return (
              <button
                key={bar.key}
                type="button"
                onClick={() => setActive(bar.key)}
                onMouseEnter={() => setActive(bar.key)}
                aria-pressed={bar.key === active}
                aria-label={`${bar.title}: ${bar.kcal ? `${bar.minutes} นาที ${bar.kcal} kcal` : "ไม่ได้ออกกำลังกาย"}`}
                className={`group flex flex-col items-center justify-end rounded-md ${on ? "bg-surface-2" : ""}`}
              >
                <span className="flex w-full flex-1 items-end justify-center px-px">
                  {bar.kcal > 0 && (
                    <span
                      className={`w-full rounded-t-[3px] bg-primary transition-[height] duration-300 ${thin ? "" : "max-w-6"} ${
                        on ? "" : "opacity-75 group-hover:opacity-100"
                      }`}
                      style={{ height: Math.max(3, (bar.kcal / max) * BAR_HEIGHT) }}
                    />
                  )}
                </span>
                <span className={`flex h-[22px] items-center whitespace-nowrap text-[10px] ${on ? "font-semibold text-text" : "text-muted"}`}>
                  {bar.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 min-h-10 content-center rounded-2xl bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        {detail ? (
          <>
            <span className="font-medium">{detail.title}</span>
            {detail.kcal ? ` · ${detail.minutes} นาที · ${formatKcal(detail.kcal)} kcal` : <span className="text-muted"> · ไม่ได้ออกกำลังกาย</span>}
          </>
        ) : (
          <span className="text-muted">แตะแท่งกราฟเพื่อดูรายละเอียด (kcal ที่เผาผลาญ)</span>
        )}
      </p>
    </div>
  );
}
