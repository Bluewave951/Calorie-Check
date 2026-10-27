"use client";

import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { WeeklyBars, WeightChartCard } from "./ProgramCharts";
import { saveSettings } from "@/lib/db";
import { formatKcal, formatThaiDate } from "@/lib/format";
import { mealPlan } from "@/lib/mealPlan";
import { parseDateKey, servingUnitOf } from "@/lib/nutrition";
import {
  PROGRAM_STATUS_LABEL,
  programEndDate,
  programProgress,
  weeklySummary,
  type ProgramStatus,
  type WeeklyTip,
} from "@/lib/program";
import { showToast } from "@/lib/toast";
import { weightTrend } from "@/lib/weights";
import { MEAL_LABEL, type Settings, type WeightEntry, type WeightProgram } from "@/lib/types";
import type { DailyTotals } from "@/lib/stats";

const STATUS_CLASS: Record<ProgramStatus, string> = {
  done: "bg-primary-soft text-primary",
  ahead: "bg-primary-soft text-primary",
  on_track: "bg-info-soft text-info-text",
  behind: "bg-warn-bg text-warn-text",
};

const TIP_TEXT: Record<WeeklyTip, string> = {
  log_more: "บันทึกให้ได้อย่างน้อย 5 วันต่อสัปดาห์ จะสรุปผลได้แม่นขึ้น",
  eat_less: "เฉลี่ยเกินเป้า ลองลดของทอด ของว่าง และเครื่องดื่มหวาน",
  eat_more: "เฉลี่ยน้อยกว่าเป้ามาก ระวังหิวจัดและเผาผลาญช้าลง เพิ่มโปรตีนหรือผลไม้อีกนิด",
  keep_going: "ทำได้ดี กินใกล้เป้าเกือบทุกวัน รักษาไว้แบบนี้",
};

const shortDate = (key: string) => formatThaiDate(parseDateKey(key), { weekday: undefined });

function formatPortion(portion: number): string {
  return portion === 0.5 ? "½" : portion === 1.5 ? "1½" : String(portion);
}

function ProgressCard({ program, latestKg, today }: { program: WeightProgram; latestKg: number; today: string }) {
  const progress = programProgress(program, latestKg, today);
  const totalKg = program.startWeightKg - program.targetWeightKg;
  return (
    <section aria-labelledby="progress-title" className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="progress-title" className="font-heading text-[17px]">
          ความคืบหน้า
        </h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[progress.status]}`}>{PROGRAM_STATUS_LABEL[progress.status]}</span>
      </div>
      <div>
        <p className="tabular-nums">
          <span className="text-2xl font-semibold">{Math.max(0, progress.lostKg).toFixed(1)}</span> / {totalKg.toFixed(1)} กก.
          <span className="ml-2 text-sm text-muted">{progress.percent}%</span>
        </p>
        <div
          role="progressbar"
          aria-label="ลดน้ำหนักไปแล้ว"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--track)]"
        >
          <div className="h-full rounded-full bg-[var(--ring)] transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-muted">ตอนนี้</dt>
          <dd className="font-medium tabular-nums">{latestKg.toFixed(1)} กก.</dd>
        </div>
        <div>
          <dt className="text-muted">ตามแผนวันนี้</dt>
          <dd className="font-medium tabular-nums">{progress.expectedKg.toFixed(1)} กก.</dd>
        </div>
        <div>
          <dt className="text-muted">เป้าหมาย</dt>
          <dd className="font-medium tabular-nums">{program.targetWeightKg.toFixed(1)} กก.</dd>
        </div>
      </dl>
      <p className="text-sm text-muted">
        เริ่ม {shortDate(program.startDate)} · ลดสัปดาห์ละ {program.ratePerWeek} กก. · คาดว่าถึงเป้า {shortDate(programEndDate(program))}
      </p>
    </section>
  );
}

function WeeklyCard({ totals, goal, today }: { totals: DailyTotals; goal: number; today: string }) {
  const summary = weeklySummary(totals, goal, today);
  return (
    <section aria-labelledby="weekly-title" className="card flex flex-col gap-3 p-4">
      <h2 id="weekly-title">
        <span className="block font-heading text-[17px]">สรุป 7 วันที่ผ่านมา</span>
        <span className="block text-xs text-muted">
          {shortDate(summary.from)} – {shortDate(summary.to)}
        </span>
      </h2>
      <WeeklyBars summary={summary} goal={goal} />
      <dl className="grid grid-cols-4 gap-2 text-center text-sm">
        <div className="rounded-xl bg-surface-2 py-2">
          <dt className="text-xs text-muted">บันทึก</dt>
          <dd className="font-semibold tabular-nums">{summary.loggedDays}/7</dd>
        </div>
        <div className="rounded-xl bg-surface-2 py-2">
          <dt className="text-xs text-muted">ตามเป้า</dt>
          <dd className="font-semibold tabular-nums">{summary.onTargetDays}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 py-2">
          <dt className="text-xs text-muted">น้อยไป</dt>
          <dd className="font-semibold tabular-nums">{summary.underDays}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 py-2">
          <dt className="text-xs text-muted">เกิน</dt>
          <dd className="font-semibold tabular-nums">{summary.overDays}</dd>
        </div>
      </dl>
      {summary.loggedDays > 0 && (
        <p className="text-sm tabular-nums">
          เฉลี่ย <strong>{formatKcal(summary.average)}</strong> kcal/วัน{" "}
          <span className="text-muted">
            (เป้า {formatKcal(goal)}, {summary.average >= goal ? "+" : "−"}
            {formatKcal(Math.abs(summary.average - goal))})
          </span>
        </p>
      )}
      <p className="rounded-xl bg-info-soft px-3 py-2 text-sm text-info-text">{TIP_TEXT[summary.tip]}</p>
    </section>
  );
}

function MealPlanCard({ goal, today }: { goal: number; today: string }) {
  const plan = mealPlan(goal, today);
  return (
    <section aria-labelledby="plan-title" className="card flex flex-col gap-3 p-4">
      <h2 id="plan-title">
        <span className="block font-heading text-[17px]">ตัวอย่างเมนูวันนี้</span>
        <span className="block text-xs text-muted">รวมราว {formatKcal(plan.total)} kcal · เปลี่ยนเมนูให้ทุกวัน ใช้เป็นแนวทาง ไม่ต้องตามเป๊ะ</span>
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {plan.meals.map((meal) => (
          <li key={meal.meal} className="flex items-start gap-3 py-2.5">
            <span className="w-16 shrink-0 text-sm font-medium text-muted">{MEAL_LABEL[meal.meal]}</span>
            <span className="min-w-0 flex-1 text-sm">
              {meal.items.map((item) => `${item.food.name_th} ${formatPortion(item.portion)} ${servingUnitOf(item.food)}`).join(" + ")}
            </span>
            <span className="shrink-0 text-sm tabular-nums">{formatKcal(meal.kcal)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** หน้าหลักของโปรแกรมที่เริ่มแล้ว: ความคืบหน้า สรุปรายสัปดาห์ และตัวอย่างเมนู */
export function ProgramDashboard({
  settings,
  program,
  weights,
  totals,
  today,
}: {
  settings: Settings;
  program: WeightProgram;
  weights: WeightEntry[];
  totals: DailyTotals | undefined;
  today: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const latestKg = weightTrend(weights, today)?.latest.weightKg ?? program.startWeightKg;

  const end = async () => {
    setConfirming(false);
    const { program: _ended, ...rest } = settings;
    await saveSettings(rest);
    showToast({ message: "จบโปรแกรมแล้ว เป้าแคลอรี่ยังเป็นค่าเดิม แก้ได้ที่หน้าตั้งค่า" });
  };

  return (
    <>
      <ProgressCard program={program} latestKg={latestKg} today={today} />
      <WeightChartCard program={program} weights={weights} today={today} />
      {totals ? <WeeklyCard totals={totals} goal={settings.dailyGoal} today={today} /> : <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy />}
      <MealPlanCard goal={settings.dailyGoal} today={today} />
      <p className="px-2 text-sm text-muted">ชั่งน้ำหนักที่หน้า “วันนี้” สัปดาห์ละครั้ง ช่วงเวลาเดิม (เช่น ตื่นนอนก่อนกินข้าว) เพื่อให้ติดตามได้แม่น</p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="pressable min-h-12 w-full rounded-xl border border-border font-medium hover:bg-surface-2"
      >
        จบโปรแกรม / เริ่มใหม่
      </button>
      {confirming && (
        <ConfirmDialog title="จบโปรแกรมลดน้ำหนัก?" confirmLabel="จบโปรแกรม" onConfirm={end} onCancel={() => setConfirming(false)}>
          บันทึกอาหารและน้ำหนักยังอยู่ครบ หลังจบแล้วตั้งโปรแกรมใหม่ได้ทันที
        </ConfirmDialog>
      )}
    </>
  );
}
