"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale } from "lucide-react";
import { putWeight } from "@/lib/db";
import { formatThaiDate } from "@/lib/format";
import { addDays, dateKey, parseDateKey } from "@/lib/nutrition";
import { BODY_LIMITS } from "@/lib/tdee";
import { showToast } from "@/lib/toast";
import { needsTdeeUpdate, TREND_DAYS, weightTrend } from "@/lib/weights";
import type { BodyProfile, WeightEntry } from "@/lib/types";

const WIDTH = 120;
const HEIGHT = 36;

/** เส้นแนวโน้มน้ำหนักใน TREND_DAYS วัน (ตกแต่ง — ตัวเลขอยู่ในข้อความแล้ว) */
function Sparkline({ entries, today }: { entries: WeightEntry[]; today: string }) {
  const from = dateKey(addDays(parseDateKey(today), -TREND_DAYS));
  const recent = entries.filter((e) => e.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  if (recent.length < 2) return null;
  const kgs = recent.map((e) => e.weightKg);
  const min = Math.min(...kgs);
  const span = Math.max(Math.max(...kgs) - min, 0.5);
  const start = parseDateKey(from).getTime();
  const range = parseDateKey(today).getTime() - start;
  const points = recent
    .map((e) => {
      const x = ((parseDateKey(e.date).getTime() - start) / range) * WIDTH;
      const y = HEIGHT - 3 - ((e.weightKg - min) / span) * (HEIGHT - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg aria-hidden width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatChange(change: number): string {
  if (change === 0) return "คงที่";
  return `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} กก.`;
}

export function WeightCard({ entries, today, profile }: { entries: WeightEntry[]; today: string; profile?: BodyProfile }) {
  const trend = weightTrend(entries, today);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const kg = Number(text);
  const [min, max] = BODY_LIMITS.weightKg;
  const valid = text !== "" && kg >= min && kg <= max;

  const save = async () => {
    if (!valid) return;
    await putWeight({ date: today, weightKg: Math.round(kg * 10) / 10 });
    setEditing(false);
    showToast({ message: `บันทึกน้ำหนัก ${kg.toFixed(1)} กก. แล้ว` });
  };

  const open = () => {
    setText(trend ? String(trend.latest.weightKg) : profile ? String(profile.weightKg) : "");
    setEditing(true);
  };

  return (
    <section aria-labelledby="weight-title" className="card p-4">
      <div className="flex items-center gap-3">
        <Scale aria-hidden size={20} className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h2 id="weight-title" className="text-sm font-medium text-muted">
            น้ำหนักตัว
          </h2>
          {trend ? (
            <p className="tabular-nums">
              <span className="text-lg font-semibold">{trend.latest.weightKg.toFixed(1)}</span> กก.
              <span className="ml-2 text-sm text-muted">
                {trend.change !== null ? `${formatChange(trend.change)} ใน ${TREND_DAYS} วัน` : formatThaiDate(parseDateKey(trend.latest.date), { weekday: undefined })}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted">ชั่งน้ำหนักสัปดาห์ละครั้ง เพื่อดูว่าเป้าแคลอรี่ได้ผลไหม</p>
          )}
        </div>
        {trend && <Sparkline entries={entries} today={today} />}
      </div>

      {trend && needsTdeeUpdate(profile, trend.latest.weightKg) && (
        <Link href="/settings" className="pressable mt-3 block rounded-xl bg-primary-soft px-3 py-2 text-sm text-primary hover:opacity-90">
          น้ำหนักเปลี่ยนจากตอนคำนวณ TDEE ({profile!.weightKg} กก.) แล้ว · คำนวณเป้าใหม่
        </Link>
      )}

      {editing ? (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor="weight-input" className="sr-only">
            น้ำหนักวันนี้ (กก.)
          </label>
          <input
            id="weight-input"
            inputMode="decimal"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={text !== "" && !valid}
            className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-lg font-semibold tabular-nums outline-none focus:border-primary"
          />
          <span className="text-sm text-muted">กก.</span>
          <button type="submit" disabled={!valid} className="pressable min-h-11 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-40">
            บันทึก
          </button>
          <button type="button" onClick={() => setEditing(false)} className="pressable min-h-11 rounded-xl px-3 text-sm text-muted hover:bg-surface-2">
            ยกเลิก
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={open}
          className="pressable mt-3 min-h-11 w-full rounded-xl border border-border text-sm font-medium hover:bg-surface-2"
        >
          {trend?.latest.date === today ? "แก้น้ำหนักวันนี้" : "บันทึกน้ำหนักวันนี้"}
        </button>
      )}
    </section>
  );
}
