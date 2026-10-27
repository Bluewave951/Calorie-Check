"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Plus, ShieldAlert, Target } from "lucide-react";
import { CalorieRing } from "@/components/CalorieRing";
import { DayList } from "@/components/DayList";
import { MacroBars } from "@/components/MacroBars";
import { MealBreakdown } from "@/components/MealBreakdown";
import { ProgramLink } from "@/components/ProgramLink";
import { ReminderBanner } from "@/components/ReminderBanner";
import { panelId, tabId, TodayTabs } from "@/components/TodayTabs";
import { WeightCard } from "@/components/WeightCard";
import { backupReminder } from "@/lib/backup";
import { formatKcal, formatThaiDate, greeting } from "@/lib/format";
import { useFrequentFoods, useNow, useScansByDate, useSettings, useWeights } from "@/lib/hooks";
import { dateKey, itemFromReference, itemKcal, kcalByMeal, sumMacros, sumScans } from "@/lib/nutrition";
import { macroTargets } from "@/lib/tdee";
import { DEFAULT_TODAY_TAB, parseTodayTab, type TodayTab } from "@/lib/todayTabs";

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="กำลังโหลด">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-72 animate-pulse rounded-[28px] bg-surface-2" />
      <div className="h-12 animate-pulse rounded-full bg-surface-2" />
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

/** กล่องเนื้อหาของแท็บ: ซ่อนแท็บอื่นไว้ (ไม่ถอดออก) เพื่อให้ฟอร์มที่กรอกค้างยังอยู่ */
function TabPanel({ tab, active, children }: { tab: TodayTab; active: TodayTab; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} hidden={tab !== active} className="flex flex-col gap-[18px]">
      {children}
    </div>
  );
}

const MACRO_CHIPS = [
  { key: "protein", label: "โปรตีน", color: "var(--macro-protein)" },
  { key: "carb", label: "คาร์บ", color: "var(--macro-carb)" },
  { key: "fat", label: "ไขมัน", color: "var(--macro-fat)" },
] as const;

export default function HomePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Today />
    </Suspense>
  );
}

function Today() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = parseTodayTab(params.get("tab"));
  const selectTab = (next: TodayTab) => router.replace(next === DEFAULT_TODAY_TAB ? "/" : `/?tab=${next}`, { scroll: false });
  const now = useNow();
  const today = now ? dateKey(now) : undefined;
  const settings = useSettings();
  const scans = useScansByDate(today);
  const frequent = useFrequentFoods(today);
  const weights = useWeights();

  if (!now || !today || !settings || !scans) return <Skeleton />;
  const unbackedDays = backupReminder(settings.unbackedSince, now.getTime());
  const { unknown, ...macros } = sumMacros(scans.flatMap((scan) => scan.items));
  const eaten = sumScans(scans);

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

      <ReminderBanner eaten={eaten} goal={settings.dailyGoal} now={now} reminder={settings.reminder} />

      <section aria-label="แคลอรี่วันนี้" className="hero flex items-center gap-3 p-4" data-over={eaten > settings.dailyGoal}>
        <CalorieRing eaten={eaten} goal={settings.dailyGoal} />
        <dl className="flex min-w-0 flex-1 flex-col gap-2">
          {MACRO_CHIPS.map(({ key, label, color }) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded-2xl bg-white/15 px-3 py-2">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <span aria-hidden className="size-2 rounded-full ring-2 ring-white/70" style={{ background: color }} />
                {label}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {macros[key]}
                <span className="text-xs font-normal text-muted"> ก.</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <TodayTabs value={tab} onChange={selectTab} />

      <TabPanel tab="meals" active={tab}>
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
                    className="pressable flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-surface py-1 pl-1 pr-4 text-sm font-medium shadow-card hover:bg-surface-2"
                  >
                    <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
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

        {scans.length === 0 && (
          <p className="px-2 text-center text-sm text-muted">ยังไม่มีบันทึกวันนี้ · กด “บันทึกอาหาร” ด้านล่างเพื่อเริ่ม</p>
        )}
      </TabPanel>

      <TabPanel tab="nutrients" active={tab}>
        <section aria-labelledby="macro-title" className="card p-4">
          <SectionTitle id="macro-title" title="สารอาหารหลัก" subtitle="Macros" />
          <MacroBars eaten={macros} target={macroTargets(settings.dailyGoal, settings.profile)} unknown={unknown} />
        </section>
        <section aria-labelledby="by-meal-title" className="card p-4">
          <SectionTitle id="by-meal-title" title="แคลอรี่แต่ละมื้อ" subtitle="By meal" />
          <MealBreakdown totals={kcalByMeal(scans)} />
        </section>
      </TabPanel>

      <TabPanel tab="weight" active={tab}>
        {weights && <WeightCard entries={weights} today={today} profile={settings.profile} />}
        {weights && <ProgramLink program={settings.program} weights={weights} today={today} />}
      </TabPanel>
    </main>
  );
}
