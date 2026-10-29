"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Info, Trash2 } from "lucide-react";
import { BodyFatPicker, FatAreaPicker } from "@/components/BodyShapePicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteExercise, putExercise, saveSettings } from "@/lib/db";
import { caloriesBurned, EXERCISES, findExercise, leanMassKg, planWarnings, recommendPlan, type PlanDay } from "@/lib/exercise";
import { formatKcal } from "@/lib/format";
import { useExercisesByDate, useNow, useSettings } from "@/lib/hooks";
import { dateKey } from "@/lib/nutrition";
import { showToast } from "@/lib/toast";
import { WEIGHT_GOAL_LABEL, type BodyProfile, type ExerciseEntry, type Settings } from "@/lib/types";

const DAY_LABEL = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const KIND_LABEL: Record<PlanDay["kind"], string> = { cardio: "คาร์ดิโอ", strength: "เวท/เสริมกล้ามเนื้อ", flexibility: "ยืดเหยียด", rest: "พัก" };
const FAT_LEVEL_LABEL = { athletic: "นักกีฬา", fit: "ฟิต", average: "ปานกลาง", high: "ค่อนข้างสูง", obese: "สูงมาก" } as const;
const inputClass = "min-h-12 w-full rounded-xl border border-border bg-surface px-3";

export default function ExercisePage() {
  const now = useNow();
  const today = now ? dateKey(now) : undefined;
  const settings = useSettings();
  const entries = useExercisesByDate(today);

  if (!today || !settings || !entries) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">ออกกำลังกาย</h1>
        <p className="text-sm text-muted">โปรแกรมตามรูปร่างและเป้าหมายของคุณ แคลอรี่ที่เผาผลาญจะบวกเข้าเป้าของวันนั้น</p>
      </header>
      {settings.profile ? (
        <>
          <ShapeCard settings={settings} profile={settings.profile} />
          <PlanCard profile={settings.profile} />
          <LogCard profile={settings.profile} entries={entries} today={today} />
        </>
      ) : (
        <Link href="/settings" className="pressable card flex items-center gap-3 p-4 font-medium">
          <span className="flex-1">กรอกข้อมูลร่างกายในหน้าตั้งค่าก่อน เพื่อออกแบบโปรแกรมให้คุณ</span>
          <ChevronRight aria-hidden size={20} />
        </Link>
      )}
      <p className="px-2 text-center text-xs text-muted">ค่าทั้งหมดเป็นการประมาณ ไม่ใช่คำแนะนำทางการแพทย์ หากมีโรคประจำตัวควรปรึกษาแพทย์ก่อน</p>
    </main>
  );
}

function ShapeCard({ settings, profile }: { settings: Settings; profile: BodyProfile }) {
  const save = (next: Partial<BodyProfile>) => saveSettings({ ...settings, profile: { ...profile, ...next } });
  const lean = leanMassKg(profile);
  return (
    <section aria-label="รูปร่าง" className="card flex flex-col gap-4 p-4">
      <BodyFatPicker sex={profile.sex} value={profile.bodyFatPercent} onChange={(bodyFatPercent) => save({ bodyFatPercent })} />
      {lean !== null && <p className="text-sm text-muted">มวลกายไม่รวมไขมันประมาณ {lean} กก.</p>}
      <FatAreaPicker
        sex={profile.sex}
        percent={profile.bodyFatPercent ?? 30}
        value={profile.fatAreas ?? []}
        onChange={(fatAreas) => save({ fatAreas })}
      />
    </section>
  );
}

function PlanCard({ profile }: { profile: BodyProfile }) {
  const plan = recommendPlan(profile);
  const warnings = planWarnings(profile);
  const weekKcal = plan.days.reduce((s, d) => s + d.kcal, 0);
  return (
    <section aria-labelledby="plan-title" className="card flex flex-col gap-3 p-4">
      <h2 id="plan-title" className="text-lg font-semibold">
        แผนสัปดาห์นี้ · {WEIGHT_GOAL_LABEL[profile.weightGoal]}
      </h2>
      <p className="text-sm text-muted">
        {plan.fatLevel && `ระดับไขมัน: ${FAT_LEVEL_LABEL[plan.fatLevel]} · `}
        {plan.lowImpact ? "เน้นท่าแรงกระแทกต่ำ ถนอมข้อเข่า · " : ""}เผาผลาญรวม ~{formatKcal(weekKcal)} kcal/สัปดาห์
      </p>
      {warnings.includes("underweight_losing") && (
        <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-text">น้ำหนักต่ำกว่าเกณฑ์อยู่แล้ว ไม่แนะนำให้ลดน้ำหนักเพิ่ม</p>
      )}
      {warnings.includes("see_doctor") && (
        <p className="rounded-xl bg-warn-bg p-3 text-sm text-warn-text">ควรปรึกษาแพทย์ก่อนเริ่ม และค่อย ๆ เพิ่มเวลาทุก 2 สัปดาห์</p>
      )}
      <ol className="flex flex-col gap-2">
        {plan.days.map((day) => (
          <li key={day.day} className="rounded-2xl bg-surface-2 p-3">
            <div className="flex items-baseline gap-2">
              <span className="w-8 font-semibold">{DAY_LABEL[day.day - 1]}</span>
              <span className="flex-1">
                {KIND_LABEL[day.kind]}
                {day.exerciseId && ` · ${findExercise(day.exerciseId)?.label} ${day.minutes} นาที`}
              </span>
              {day.kcal > 0 && <span className="text-sm tabular-nums text-muted">~{formatKcal(day.kcal)} kcal</span>}
            </div>
            {day.moves.length > 0 && (
              <ul className="mt-1.5 pl-10 text-sm text-muted">
                {day.moves.map((m) => (
                  <li key={m.name}>
                    {m.name} {m.sets} เซ็ต × {m.reps}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="flex gap-2 text-xs text-muted">
        <Info aria-hidden size={16} className="shrink-0" />
        ไขมันลดเฉพาะจุดไม่ได้ ร่างกายลดไขมันทั้งตัวจากการกินน้อยกว่าที่ใช้ร่วมกับคาร์ดิโอ ส่วนท่าเฉพาะส่วนช่วยกระชับกล้ามเนื้อตรงนั้นให้รูปร่างดูดีขึ้นเมื่อไขมันลดลง
      </p>
    </section>
  );
}

function LogCard({ profile, entries, today }: { profile: BodyProfile; entries: ExerciseEntry[]; today: string }) {
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const [minutesText, setMinutesText] = useState("30");
  const [removing, setRemoving] = useState<ExerciseEntry | null>(null);
  const minutes = Number(minutesText);
  const valid = Number.isInteger(minutes) && minutes > 0 && minutes <= 600;
  const kcal = valid ? caloriesBurned(findExercise(exerciseId)!.met, profile.weightKg, minutes) : 0;

  const add = async () => {
    if (!valid) return;
    await putExercise({ id: `${Date.now()}`, date: today, exerciseId, minutes, kcal });
    showToast({ message: `บันทึกแล้ว +${formatKcal(kcal)} kcal เข้าเป้าวันนี้` });
  };

  return (
    <section aria-labelledby="log-title" className="card flex flex-col gap-3 p-4">
      <h2 id="log-title" className="text-lg font-semibold">
        บันทึกวันนี้
      </h2>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <select aria-label="กิจกรรม" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className={inputClass}>
          {EXERCISES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <input
          aria-label="นาที"
          inputMode="numeric"
          value={minutesText}
          onChange={(e) => setMinutesText(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!valid}
          className={inputClass}
        />
      </div>
      <button
        type="button"
        disabled={!valid}
        onClick={add}
        className="pressable min-h-12 rounded-full bg-accent font-semibold text-on-accent disabled:opacity-50"
      >
        บันทึก {valid && `(~${formatKcal(kcal)} kcal)`}
      </button>
      {entries.length > 0 && (
        <ul className="flex flex-col gap-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <span className="flex-1">
                {findExercise(entry.exerciseId)?.label ?? entry.exerciseId} {entry.minutes} นาที
              </span>
              <span className="text-sm tabular-nums text-muted">{formatKcal(entry.kcal)} kcal</span>
              <button type="button" aria-label="ลบ" onClick={() => setRemoving(entry)} className="pressable p-2 text-muted">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <ConfirmDialog
          title="ลบรายการนี้?"
          confirmLabel="ลบ"
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteExercise(removing.id);
            setRemoving(null);
          }}
        >
          {findExercise(removing.exerciseId)?.label} {removing.minutes} นาที
        </ConfirmDialog>
      )}
    </section>
  );
}
