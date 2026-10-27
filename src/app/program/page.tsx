"use client";

import { ProgramDashboard } from "@/components/ProgramDashboard";
import { ProgramSetup } from "@/components/ProgramSetup";
import { useDailyTotals, useNow, useSettings, useWeights } from "@/lib/hooks";
import { addDays, dateKey } from "@/lib/nutrition";

export default function ProgramPage() {
  const now = useNow();
  const today = now ? dateKey(now) : "";
  const settings = useSettings();
  const weights = useWeights();
  // สรุป 7 วันก่อนวันนี้
  const totals = useDailyTotals(now ? dateKey(addDays(now, -7)) : "", now ? dateKey(addDays(now, -1)) : "");

  if (!now || !settings || !weights) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  return (
    <main className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">โปรแกรมลดน้ำหนัก</h1>
        {!settings.program && <p className="text-sm text-muted">ตั้งน้ำหนักเป้าหมาย แอปจะคำนวณเป้าแคลอรี่ วันที่คาดว่าจะถึง และเมนูตัวอย่างให้</p>}
      </header>
      {settings.program ? (
        <ProgramDashboard settings={settings} program={settings.program} weights={weights} totals={totals} today={today} />
      ) : (
        <ProgramSetup settings={settings} weights={weights} today={today} />
      )}
      <p className="px-2 text-center text-xs text-muted">ค่าทั้งหมดเป็นการประมาณ ไม่ใช่คำแนะนำทางการแพทย์ หากมีโรคประจำตัวควรปรึกษาแพทย์ก่อน</p>
    </main>
  );
}
