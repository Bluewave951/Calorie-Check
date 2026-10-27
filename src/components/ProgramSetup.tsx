"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { putWeight, saveSettings } from "@/lib/db";
import { formatKcal, formatThaiDate } from "@/lib/format";
import { parseDateKey } from "@/lib/nutrition";
import { programEndDate, programGoal, programIssues, type ProgramIssue } from "@/lib/program";
import { BODY_LIMITS } from "@/lib/tdee";
import { showToast } from "@/lib/toast";
import { LOSS_RATES, type LossRate, type Settings, type WeightEntry, type WeightProgram } from "@/lib/types";

const ISSUE_TEXT: Record<ProgramIssue, string> = {
  not_lower: "น้ำหนักเป้าหมายต้องน้อยกว่าน้ำหนักตอนนี้",
  target_underweight: "น้ำหนักนี้ทำให้ BMI ต่ำกว่า 18.5 (ผอมเกินไป) ลองตั้งให้สูงขึ้น",
};

const RATE_HINT: Record<LossRate, string> = { 0.25: "สบาย ๆ", 0.5: "แนะนำ", 0.75: "เร่ง" };

const inputClass =
  "min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-xl font-semibold tabular-nums outline-none focus:border-primary";

function kgValue(text: string): number | null {
  const kg = Number(text);
  const [min, max] = BODY_LIMITS.weightKg;
  return text !== "" && kg >= min && kg <= max ? Math.round(kg * 10) / 10 : null;
}

/** ตั้งโปรแกรมลดน้ำหนัก: น้ำหนักตอนนี้ น้ำหนักเป้าหมาย และอัตราลด → เป้าแคลอรี่และวันที่คาดว่าจะถึง */
export function ProgramSetup({ settings, weights, today }: { settings: Settings; weights: WeightEntry[]; today: string }) {
  const latest = weights.at(-1);
  const profile = settings.profile;
  const [currentText, setCurrentText] = useState(String(latest?.weightKg ?? profile?.weightKg ?? ""));
  const [targetText, setTargetText] = useState("");
  const [rate, setRate] = useState<LossRate>(0.5);

  if (!profile) {
    return (
      <div className="card p-4">
        <p className="font-medium">กรอกข้อมูลร่างกายก่อน</p>
        <p className="mt-1 text-sm text-muted">แอปต้องใช้เพศ อายุ ส่วนสูง และระดับกิจกรรม เพื่อคำนวณพลังงานที่ร่างกายใช้ต่อวัน (TDEE)</p>
        <Link
          href="/settings"
          className="pressable mt-3 flex min-h-12 items-center justify-center rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90"
        >
          ไปกรอกที่หน้าตั้งค่า
        </Link>
      </div>
    );
  }

  const current = kgValue(currentText);
  const target = kgValue(targetText);
  const issue = current !== null && target !== null ? programIssues(current, target, profile.heightCm) : null;
  const body = current !== null ? { ...profile, weightKg: current } : null;
  const ready = current !== null && target !== null && issue === null && body !== null;
  const program: WeightProgram | null = ready
    ? { startDate: today, startWeightKg: current, targetWeightKg: target, ratePerWeek: rate }
    : null;
  const chosen = body ? programGoal(body, rate) : null;

  const start = async () => {
    if (!program || !chosen || !body) return;
    if (latest?.date !== today || latest.weightKg !== program.startWeightKg) {
      await putWeight({ date: today, weightKg: program.startWeightKg });
    }
    await saveSettings({
      ...settings,
      profile: { ...body, weightGoal: "lose" },
      dailyGoal: chosen.goal,
      goalConfirmed: true,
      program,
    });
    showToast({ message: `เริ่มโปรแกรมแล้ว เป้าใหม่ ${formatKcal(chosen.goal)} kcal ต่อวัน` });
  };

  return (
    <div className="card flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          น้ำหนักตอนนี้ (กก.)
          <input
            inputMode="decimal"
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={currentText !== "" && current === null}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="text-sm font-medium">
          น้ำหนักเป้าหมาย (กก.)
          <input
            inputMode="decimal"
            value={targetText}
            onChange={(e) => setTargetText(e.target.value.replace(/[^\d.]/g, ""))}
            aria-invalid={issue !== null}
            aria-describedby="target-issue"
            className={`${inputClass} mt-1.5`}
          />
        </label>
      </div>
      {issue && (
        <p id="target-issue" role="status" className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-text">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          {ISSUE_TEXT[issue]}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-medium">ลดสัปดาห์ละ</legend>
        <div role="radiogroup" className="mt-1.5 grid grid-cols-3 gap-1.5">
          {LOSS_RATES.map((option) => {
            const result = body ? programGoal(body, option) : null;
            const on = option === rate;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setRate(option)}
                className={`pressable flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm ${
                  on ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"
                }`}
              >
                <span className="font-semibold tabular-nums">{option} กก.</span>
                <span className="text-xs text-muted">{RATE_HINT[option]}</span>
                {result && <span className="text-xs tabular-nums">{formatKcal(result.goal)} kcal</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      {chosen?.limited && (
        <p role="status" className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-text">
          <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
          เป้าถูกยกขึ้นเป็น {formatKcal(chosen.goal)} kcal ซึ่งเป็นขั้นต่ำที่ปลอดภัย จึงอาจลดได้ช้ากว่าที่เลือก
        </p>
      )}

      {program && chosen && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
          กินวันละ <strong className="tabular-nums">{formatKcal(chosen.goal)} kcal</strong> (TDEE {formatKcal(chosen.tdee)}) คาดว่าจะถึง{" "}
          {program.targetWeightKg} กก. ราว <strong>{formatThaiDate(parseDateKey(programEndDate(program)), { weekday: undefined, year: "numeric" })}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={!program}
        className="pressable min-h-12 w-full rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90 disabled:opacity-40"
      >
        เริ่มโปรแกรม
      </button>
    </div>
  );
}
