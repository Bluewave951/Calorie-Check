"use client";

import { useState } from "react";
import { formatKcal, formatShortWeekday, formatThaiDate } from "@/lib/format";
import { parseDateKey } from "@/lib/nutrition";
import { REMINDER_RATIO } from "@/lib/reminder";
import { expectedWeight, weightChart, type DayStatus, type WeeklySummary } from "@/lib/program";
import type { WeightEntry, WeightProgram } from "@/lib/types";

const DAY_MS = 86_400_000;
const shortDate = (key: string) => formatThaiDate(parseDateKey(key), { weekday: undefined, month: "short" });

// ขนาดใน viewBox (ย่อขยายตามความกว้างการ์ด)
const W = 320;
const H = 180;
const PAD = { left: 34, right: 12, top: 12, bottom: 22 };

/** ขีดแกนน้ำหนักเป็นจำนวนเต็ม ไม่เกิน 4 ขีด */
function kgTicks(min: number, max: number): number[] {
  const step = Math.max(1, Math.ceil((max - min) / 3));
  const ticks: number[] = [];
  for (let kg = Math.ceil(min); kg <= max; kg += step) ticks.push(kg);
  return ticks;
}

/** น้ำหนักจริง (เส้นทึบ + จุด) เทียบเส้นแผน (เส้นประ) ตั้งแต่เริ่มโปรแกรม */
export function WeightChartCard({ program, weights, today }: { program: WeightProgram; weights: WeightEntry[]; today: string }) {
  const chart = weightChart(program, weights, today);
  const [selected, setSelected] = useState<string | null>(chart.actual.at(-1)?.date ?? null);

  const start = parseDateKey(chart.from).getTime();
  const span = Math.max(DAY_MS, parseDateKey(chart.to).getTime() - start);
  const x = (date: string) => PAD.left + ((parseDateKey(date).getTime() - start) / span) * (W - PAD.left - PAD.right);
  const y = (kg: number) => PAD.top + ((chart.maxKg - kg) / (chart.maxKg - chart.minKg)) * (H - PAD.top - PAD.bottom);
  const [planStart, planEnd] = chart.plan;
  const detail = chart.actual.find((w) => w.date === selected);

  return (
    <section aria-labelledby="weight-chart-title" className="card flex flex-col gap-2 p-4">
      <h2 id="weight-chart-title" className="font-heading text-[17px]">
        กราฟน้ำหนัก
      </h2>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <svg aria-hidden width="18" height="8">
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--chart-line)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="9" cy="4" r="3" fill="var(--chart-line)" />
          </svg>
          น้ำหนักจริง
        </span>
        <span className="flex items-center gap-1.5">
          <svg aria-hidden width="18" height="8">
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--muted)" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          ตามแผน (เป้า {program.targetWeightKg} กก.)
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="กราฟน้ำหนักจริงเทียบกับแผน (ดูตัวเลขได้ในตารางด้านล่าง)">
        {kgTicks(chart.minKg, chart.maxKg).map((kg) => (
          <g key={kg}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(kg)} y2={y(kg)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(kg)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--muted)">
              {kg}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--muted)">
          {shortDate(chart.from)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="10" fill="var(--muted)">
          {shortDate(chart.to)}
        </text>

        <line
          x1={x(planStart.date)}
          y1={y(planStart.weightKg)}
          x2={x(planEnd.date)}
          y2={y(planEnd.weightKg)}
          stroke="var(--muted)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />

        {chart.actual.length > 1 && (
          <polyline
            points={chart.actual.map((w) => `${x(w.date).toFixed(1)},${y(w.weightKg).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {chart.actual.map((w) => {
          const active = w.date === selected;
          return (
            <g
              key={w.date}
              tabIndex={0}
              role="button"
              aria-label={`${shortDate(w.date)} ${w.weightKg.toFixed(1)} กก.`}
              aria-pressed={active}
              onClick={() => setSelected(w.date)}
              onMouseEnter={() => setSelected(w.date)}
              onFocus={() => setSelected(w.date)}
              className="cursor-pointer outline-none"
            >
              <circle cx={x(w.date)} cy={y(w.weightKg)} r="12" fill="transparent" />
              <circle
                cx={x(w.date)}
                cy={y(w.weightKg)}
                r={active ? 5.5 : 4}
                fill="var(--chart-line)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>

      <div className="min-h-11 rounded-2xl bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        {detail ? (
          <p>
            <span className="font-medium">{shortDate(detail.date)}</span> · {detail.weightKg.toFixed(1)} กก.
            <span className="text-muted"> · ตามแผน {expectedWeight(program, detail.date).toFixed(1)} กก.</span>
          </p>
        ) : (
          <p className="text-muted">ยังไม่มีน้ำหนักตั้งแต่เริ่มโปรแกรม ชั่งที่หน้า “วันนี้” แล้วจุดจะขึ้นที่นี่</p>
        )}
      </div>

      {chart.actual.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-medium">ดูเป็นตาราง</summary>
          <table className="w-full tabular-nums">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 text-left font-normal">วันที่</th>
                <th className="py-1 text-right font-normal">น้ำหนัก</th>
                <th className="py-1 text-right font-normal">ตามแผน</th>
              </tr>
            </thead>
            <tbody>
              {chart.actual.map((w) => (
                <tr key={w.date} className="border-t border-border">
                  <td className="py-1.5">{shortDate(w.date)}</td>
                  <td className="py-1.5 text-right">{w.weightKg.toFixed(1)}</td>
                  <td className="py-1.5 text-right text-muted">{expectedWeight(program, w.date).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

const STATUS_TEXT: Record<DayStatus, string> = {
  none: "ไม่ได้บันทึก",
  under: "น้อยกว่าเป้ามาก",
  on_target: "ตามเป้า",
  over: "เกินเป้า",
};

const BAR_HEIGHT = 120;

/** แท่ง kcal 7 วันเทียบเส้นเป้าและเส้นขั้นต่ำ 80% — แท่งเกินเป้าเป็นสีแดง */
export function WeeklyBars({ summary, goal }: { summary: WeeklySummary; goal: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const scaleMax = Math.max(goal * 1.25, ...summary.days.map((d) => d.kcal ?? 0));
  const h = (kcal: number) => (kcal / scaleMax) * BAR_HEIGHT;
  const detail = summary.days.find((d) => d.date === selected);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-chart-base" aria-hidden /> ไม่เกินเป้า
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-over" aria-hidden /> เกินเป้า
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-muted" aria-hidden /> เป้า {formatKcal(goal)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dotted border-muted" aria-hidden /> {Math.round(REMINDER_RATIO * 100)}% ของเป้า
        </span>
      </div>
      <div className="relative mt-3" style={{ height: BAR_HEIGHT + 24 }}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted" style={{ bottom: 24 + h(goal) }} aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dotted border-muted/70"
          style={{ bottom: 24 + h(goal * REMINDER_RATIO) }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-6 border-t border-border" aria-hidden />

        <div className="absolute inset-0 grid grid-cols-7 gap-0.5">
          {summary.days.map((day) => {
            const active = day.date === selected;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day.date)}
                onMouseEnter={() => setSelected(day.date)}
                aria-pressed={active}
                aria-label={`${shortDate(day.date)}: ${day.kcal === null ? "ไม่ได้บันทึก" : `${day.kcal} kcal ${STATUS_TEXT[day.status]}`}`}
                className={`group flex flex-col items-center justify-end rounded-lg ${active ? "bg-surface-2" : ""}`}
              >
                <span className="flex w-full flex-1 items-end justify-center px-[2px]">
                  {day.kcal !== null && (
                    <span
                      className={`w-full max-w-6 rounded-t-[4px] transition-[height] duration-300 ${day.status === "over" ? "bg-over" : "bg-chart-base"} ${
                        active ? "" : "opacity-80 group-hover:opacity-100"
                      }`}
                      style={{ height: Math.max(3, h(day.kcal)) }}
                    />
                  )}
                </span>
                <span className={`flex h-6 items-center text-[11px] ${active ? "font-semibold text-text" : "text-muted"}`}>
                  {formatShortWeekday(parseDateKey(day.date))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 min-h-11 content-center rounded-2xl bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        {detail ? (
          <>
            <span className="font-medium">{shortDate(detail.date)}</span>
            {detail.kcal === null ? <span className="text-muted"> · ไม่ได้บันทึก</span> : ` · ${formatKcal(detail.kcal)} kcal · ${STATUS_TEXT[detail.status]}`}
          </>
        ) : (
          <span className="text-muted">แตะแท่งกราฟเพื่อดูรายละเอียดของวัน</span>
        )}
      </p>
    </div>
  );
}
