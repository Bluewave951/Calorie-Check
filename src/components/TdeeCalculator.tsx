"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatKcal } from "@/lib/format";
import { BODY_LIMITS, calculateTdee } from "@/lib/tdee";
import {
  ACTIVITY_LABEL,
  ACTIVITY_LEVELS,
  SEX_LABEL,
  WEIGHT_GOAL_LABEL,
  WEIGHT_GOALS,
  type ActivityLevel,
  type BodyProfile,
  type Sex,
  type WeightGoal,
} from "@/lib/types";

const inputClass =
  "min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-lg font-semibold tabular-nums outline-none focus:border-primary";

function choiceClass(active: boolean) {
  return `pressable min-h-11 rounded-xl border text-sm font-medium ${
    active ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"
  }`;
}

function NumberField({ id, label, unit, value, onChange }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          className={inputClass}
        />
        <span className="text-sm text-muted">{unit}</span>
      </div>
    </div>
  );
}

/** ตัวช่วยตั้งเป้า: คำนวณ TDEE จากข้อมูลร่างกาย แล้วส่งเป้าที่แนะนำกลับไปให้ช่องเป้าแคลอรี่ */
export function TdeeCalculator({ initial, onApply }: { initial?: BodyProfile; onApply: (goal: number, profile: BodyProfile) => void }) {
  const [open, setOpen] = useState(false);
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "male");
  const [age, setAge] = useState(initial ? String(initial.age) : "");
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : "");
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity ?? "sedentary");
  const [weightGoal, setWeightGoal] = useState<WeightGoal>(initial?.weightGoal ?? "maintain");

  const filled = age !== "" && height !== "" && weight !== "";
  const profile: BodyProfile = { sex, age: Number(age), heightCm: Number(height), weightKg: Number(weight), activity, weightGoal };
  const result = filled ? calculateTdee(profile) : null;
  const { age: ageRange, heightCm: heightRange, weightKg: weightRange } = BODY_LIMITS;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="tdee-body"
        className="pressable flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-surface-2"
      >
        <span className="flex-1">
          <span className="block text-sm font-medium">ไม่แน่ใจ? คำนวณจาก TDEE</span>
          <span className="block text-xs text-muted">พลังงานที่ร่างกายใช้ต่อวัน จากเพศ อายุ ส่วนสูง น้ำหนัก และกิจกรรม</span>
        </span>
        <ChevronDown aria-hidden size={18} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id="tdee-body" className="flex flex-col gap-3 border-t border-border p-3">
          <div role="radiogroup" aria-label="เพศ" className="grid grid-cols-2 gap-1.5">
            {(["male", "female"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sex === s} onClick={() => setSex(s)} className={choiceClass(sex === s)}>
                {SEX_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberField id="tdee-age" label="อายุ" unit="ปี" value={age} onChange={setAge} />
            <NumberField id="tdee-height" label="ส่วนสูง" unit="ซม." value={height} onChange={setHeight} />
            <NumberField id="tdee-weight" label="น้ำหนัก" unit="กก." value={weight} onChange={setWeight} />
          </div>

          <div>
            <label htmlFor="tdee-activity" className="text-sm font-medium">
              ระดับกิจกรรม
            </label>
            <select
              id="tdee-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-primary"
            >
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {ACTIVITY_LABEL[level]}
                </option>
              ))}
            </select>
          </div>

          <div role="radiogroup" aria-label="เป้าหมายน้ำหนัก" className="grid grid-cols-3 gap-1.5">
            {WEIGHT_GOALS.map((g) => (
              <button key={g} type="button" role="radio" aria-checked={weightGoal === g} onClick={() => setWeightGoal(g)} className={choiceClass(weightGoal === g)}>
                {WEIGHT_GOAL_LABEL[g]}
              </button>
            ))}
          </div>

          <div aria-live="polite" className="rounded-xl bg-surface-2 p-3 text-sm">
            {result ? (
              <>
                <p className="text-muted">
                  BMR {formatKcal(result.bmr)} · TDEE {formatKcal(result.tdee)} kcal
                </p>
                <p className="mt-0.5">
                  เป้าที่แนะนำ <span className="text-xl font-semibold tabular-nums">{formatKcal(result.goal)}</span> kcal
                </p>
              </>
            ) : (
              <p className="text-muted">
                {filled
                  ? `กรอกอายุ ${ageRange[0]}–${ageRange[1]} ปี ส่วนสูง ${heightRange[0]}–${heightRange[1]} ซม. น้ำหนัก ${weightRange[0]}–${weightRange[1]} กก.`
                  : "กรอกอายุ ส่วนสูง และน้ำหนัก เพื่อดูเป้าที่แนะนำ"}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!result}
            onClick={() => result && onApply(result.goal, profile)}
            className="pressable min-h-11 rounded-xl border border-primary text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-40"
          >
            ใช้เป็นเป้า
          </button>
        </div>
      )}
    </div>
  );
}
