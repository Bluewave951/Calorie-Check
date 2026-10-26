"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { BackupSection } from "@/components/BackupSection";
import { TdeeCalculator } from "@/components/TdeeCalculator";
import { saveSettings } from "@/lib/db";
import { useSettings } from "@/lib/hooks";
import { formatKcal } from "@/lib/format";
import { showToast } from "@/lib/toast";
import type { AiHealth } from "@/lib/aiCore";
import { MAX_GOAL, MIN_GOAL, type BodyProfile, type Settings } from "@/lib/types";

const GOAL_PRESETS = [1500, 1800, 2000, 2500];

const PROVIDER_LABEL = { ollama: "Ollama (บนเครื่อง)", openrouter: "OpenRouter (ออนไลน์)" } as const;

function SectionTitle({ id, children, hint }: { id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 px-1">
      <h2 id={id} className="text-sm font-semibold text-muted">
        {children}
      </h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function GoalSection({ initial }: { initial: Settings }) {
  const [goalText, setGoalText] = useState(String(initial.dailyGoal));
  const [profile, setProfile] = useState<BodyProfile | undefined>(initial.profile);
  const goal = Number(goalText);
  const valid = Number.isInteger(goal) && goal >= MIN_GOAL && goal <= MAX_GOAL;
  const savedProfileKey = JSON.stringify(initial.profile ?? null);
  const dirty = goal !== initial.dailyGoal || JSON.stringify(profile ?? null) !== savedProfileKey || !initial.goalConfirmed;

  // การตั้งค่าเปลี่ยนจากที่อื่น (เช่น นำเข้าไฟล์สำรอง) → แสดงค่าใหม่
  useEffect(() => setGoalText(String(initial.dailyGoal)), [initial.dailyGoal]);
  // เทียบข้อมูลร่างกายด้วยค่า เพราะอ่านจากฐานข้อมูลแล้วได้ object ใหม่ทุกครั้ง
  useEffect(() => setProfile(initial.profile), [savedProfileKey]);

  const save = async () => {
    if (!valid) return;
    await saveSettings({ ...initial, dailyGoal: goal, profile });
    showToast({ message: `ตั้งเป้าเป็น ${formatKcal(goal)} kcal ต่อวันแล้ว` });
  };

  return (
    <section aria-labelledby="goal-title">
      <SectionTitle id="goal-title">เป้าแคลอรี่ต่อวัน</SectionTitle>
      <div className="card p-4">
        <label htmlFor="goal" className="text-sm font-medium">
          จำนวนกิโลแคลอรี่
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="goal"
            inputMode="numeric"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value.replace(/[^\d]/g, ""))}
            aria-invalid={!valid}
            aria-describedby="goal-help"
            className="min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-2xl font-semibold tabular-nums outline-none focus:border-primary"
          />
          <span className="text-muted">kcal</span>
        </div>
        <p id="goal-help" className={`mt-1.5 text-sm ${valid ? "text-muted" : "text-over-text"}`}>
          {valid ? "ผู้ใหญ่ทั่วไปอยู่ราว 1,600–2,500 kcal" : `กรอกตัวเลข ${formatKcal(MIN_GOAL)}–${formatKcal(MAX_GOAL)}`}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="ค่าที่ใช้บ่อย">
          {GOAL_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={goal === preset}
              onClick={() => setGoalText(String(preset))}
              className={`pressable min-h-11 rounded-xl border text-sm font-medium tabular-nums ${
                goal === preset ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"
              }`}
            >
              {formatKcal(preset)}
            </button>
          ))}
        </div>
        <TdeeCalculator
          key={savedProfileKey}
          initial={initial.profile}
          onApply={(suggested, next) => {
            setGoalText(String(suggested));
            setProfile(next);
          }}
        />
        <button
          type="button"
          onClick={save}
          disabled={!valid || !dirty}
          className="pressable mt-4 min-h-12 w-full rounded-xl bg-primary font-semibold text-on-primary hover:opacity-90 disabled:opacity-40"
        >
          {dirty ? "บันทึกเป้า" : "บันทึกแล้ว"}
        </button>
      </div>
    </section>
  );
}

function AdvancedSection({ initial }: { initial: Settings }) {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [testing, setTesting] = useState(false);

  const test = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth((await res.json()) as AiHealth);
    } catch {
      setHealth({ provider: "ollama", mock: false, reachable: false, message: "เชื่อมต่อเซิร์ฟเวอร์ของแอปไม่ได้", models: [], defaultModel: "" });
    } finally {
      setTesting(false);
    }
  }, []);

  useEffect(() => {
    if (open && !health) test();
  }, [open, health, test]);

  // โมเดลที่บันทึกไว้อาจเป็นของผู้ให้บริการอื่น → ใช้ค่าเริ่มต้นแทน
  const selected = health && health.models.includes(initial.model) ? initial.model : health?.defaultModel;

  const choose = async (model: string) => {
    await saveSettings({ ...initial, model });
    showToast({ message: `เลือกโมเดล ${model} แล้ว` });
  };

  const status = health === null
    ? "กำลังตรวจสอบ…"
    : health.mock
      ? "โหมดจำลอง (AI_MOCK=1) ไม่ได้ใช้ AI จริง"
      : health.reachable
        ? (health.message ?? "เชื่อมต่อได้")
        : health.message;

  return (
    <section aria-labelledby="advanced-title">
      <SectionTitle id="advanced-title">ขั้นสูง</SectionTitle>
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="advanced-body"
          className="pressable flex min-h-14 w-full items-center gap-3 px-4 text-left hover:bg-surface-2"
        >
          <span className="flex-1">
            <span className="block font-medium">การเชื่อมต่อ AI และโมเดล</span>
            <span className="block text-sm text-muted">สำหรับผู้ดูแลเครื่อง — ปกติไม่ต้องเปลี่ยน</span>
          </span>
          <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div id="advanced-body" className="border-t border-border p-4">
            <p className="text-sm text-muted">
              ผู้ให้บริการ: {health ? PROVIDER_LABEL[health.provider] : "…"}
              {health?.provider === "openrouter" && " · รูปจะถูกส่งไปวิเคราะห์บนอินเทอร์เน็ต"}
            </p>
            <div className="mt-2 flex items-center gap-3" aria-live="polite">
              <span
                className={`size-2.5 shrink-0 rounded-full ${health === null ? "bg-border" : health.reachable ? "bg-ok" : "bg-over"}`}
                aria-hidden
              />
              <span className="flex-1 text-sm">{status}</span>
              <button
                type="button"
                onClick={test}
                disabled={testing}
                className="pressable flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-60"
              >
                {testing && <LoaderCircle aria-hidden size={16} className="animate-spin" />} ทดสอบ
              </button>
            </div>

            <h3 className="mt-4 text-sm font-medium">โมเดล AI</h3>
            {health?.provider === "openrouter" && <p className="text-xs text-muted">โมเดลฟรีที่ดูรูปได้ตอนนี้ (รายชื่อเปลี่ยนตาม OpenRouter)</p>}
            {health === null ? (
              <div className="mt-2 h-24 animate-pulse rounded-xl bg-surface-2" aria-busy />
            ) : health.models.length === 0 ? (
              <p className="mt-2 text-sm text-muted">ไม่พบโมเดลให้เลือก</p>
            ) : (
              <div role="radiogroup" aria-label="โมเดล AI" className="mt-2 flex flex-col gap-1.5">
                {health.models.map((name) => (
                  <label
                    key={name}
                    className={`pressable flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${
                      selected === name ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={name}
                      checked={selected === name}
                      onChange={() => choose(name)}
                      className="size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1 break-all font-mono text-xs">{name}</span>
                    {name === health.defaultModel && <span className="shrink-0 text-xs text-muted">แนะนำ</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  if (!settings) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">ตั้งค่า</h1>
      <GoalSection initial={settings} />
      <section aria-labelledby="backup-title">
        <SectionTitle id="backup-title" hint="ข้อมูลเก็บในมือถือเครื่องนี้เท่านั้น ควรส่งออกเก็บไว้เป็นระยะ">
          สำรองข้อมูล
        </SectionTitle>
        <BackupSection />
      </section>
      <AdvancedSection initial={settings} />
      <p className="px-2 text-center text-xs text-muted">ค่าแคลอรี่จากรูปเป็นค่าประมาณ (±20–30%) ไม่ใช่คำแนะนำทางการแพทย์</p>
    </main>
  );
}
