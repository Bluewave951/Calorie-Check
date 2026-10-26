"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, ShieldAlert, Target } from "lucide-react";
import { CalorieRing } from "@/components/CalorieRing";
import { DayList } from "@/components/DayList";
import { MacroBars } from "@/components/MacroBars";
import { WeightCard } from "@/components/WeightCard";
import { backupReminder } from "@/lib/backup";
import { formatKcal, formatThaiDate, greeting } from "@/lib/format";
import { useFrequentFoods, useNow, useScansByDate, useSettings, useWeights } from "@/lib/hooks";
import { dateKey, itemFromReference, itemKcal, sumMacros, sumScans } from "@/lib/nutrition";
import { macroTargets } from "@/lib/tdee";

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="กำลังโหลด">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-44 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <h2 id={id} className="mb-3 flex items-baseline gap-2">
      <span className="font-heading text-lg font-medium">{title}</span>
      <span lang="en" className="text-[11px] text-muted">
        {subtitle}
      </span>
    </h2>
  );
}

export default function HomePage() {
  const router = useRouter();
  const now = useNow();
  const today = now ? dateKey(now) : undefined;
  const settings = useSettings();
  const scans = useScansByDate(today);
  const frequent = useFrequentFoods(today);
  const weights = useWeights();

  if (!now || !today || !settings || !scans) return <Skeleton />;
  const unbackedDays = backupReminder(settings.unbackedSince, now.getTime());
  const { unknown, ...macros } = sumMacros(scans.flatMap((scan) => scan.items));

  return (
    <main className="flex flex-col gap-[18px]">
      <header>
        <p className="mb-1.5 font-heading text-sm text-primary">Calorie&amp;Check</p>
        <h1 className="mb-0.5 font-heading text-[30px] font-medium leading-tight">{greeting(now)}</h1>
        <p className="text-muted">{formatThaiDate(now)}</p>
      </header>

      {!settings.goalConfirmed && (
        <Link
          href="/settings"
          className="pressable flex min-h-12 items-center gap-3 rounded-full bg-info-soft px-4 py-3 font-semibold text-info-text hover:opacity-90"
        >
          <Target aria-hidden size={20} className="shrink-0" />
          <span className="flex-1">ตั้งเป้าแคลอรี่ของคุณ</span>
          <ChevronRight aria-hidden size={20} className="shrink-0" />
        </Link>
      )}

      {unbackedDays !== null && (
        <Link href="/settings#backup-title" className="pressable card flex items-center gap-3 border-warn/40 bg-warn-bg p-3 hover:opacity-90">
          <ShieldAlert aria-hidden size={22} className="shrink-0 text-warn-text" />
          <span className="flex-1 text-sm">
            <span className="block font-medium">ยังไม่ได้สำรองข้อมูล {unbackedDays} วัน</span>
            <span className="text-muted">ข้อมูลอยู่ในเครื่องนี้เท่านั้น ส่งออกเก็บไว้กันหาย</span>
          </span>
          <span className="text-sm font-medium text-warn-text">สำรอง</span>
        </Link>
      )}

      <section aria-label="แคลอรี่วันนี้" className="card flex flex-col gap-4 px-4 pb-5 pt-6">
        <CalorieRing eaten={sumScans(scans)} goal={settings.dailyGoal} />
        {scans.length > 0 && <MacroBars eaten={macros} target={macroTargets(settings.dailyGoal, settings.profile)} unknown={unknown} />}
      </section>

      {frequent && frequent.length > 0 && (
        <section aria-labelledby="quick-title">
          <SectionTitle id="quick-title" title="บันทึกด่วน" subtitle="Quick log" />
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {frequent.map(({ food }) => (
              <li key={food.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => router.push(`/scan?quick=${food.key}`)}
                  aria-label={`บันทึก${food.name_th} ${formatKcal(itemKcal(itemFromReference(food)))} kcal`}
                  className="pressable flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-4 text-sm hover:bg-text/5"
                >
                  <Plus aria-hidden size={16} />
                  {food.name_th}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="meals-title">
        <SectionTitle id="meals-title" title="มื้อวันนี้" subtitle="Meals" />
        <DayList date={today} scans={scans} />
      </section>

      {weights && <WeightCard entries={weights} today={today} profile={settings.profile} />}

      {scans.length === 0 && (
        <p className="px-2 text-center text-sm text-muted">ยังไม่มีบันทึกวันนี้ · กด “บันทึกอาหาร” ด้านล่างเพื่อเริ่ม</p>
      )}
    </main>
  );
}
