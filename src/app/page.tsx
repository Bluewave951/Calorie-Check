"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { CalorieRing } from "@/components/CalorieRing";
import { DayList } from "@/components/DayList";
import { formatKcal, formatThaiDate, greeting } from "@/lib/format";
import { useFrequentFoods, useNow, useScansByDate, useSettings } from "@/lib/hooks";
import { dateKey, itemFromReference, itemKcal, sumScans } from "@/lib/nutrition";

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="กำลังโหลด">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-surface-2" />
      <div className="h-44 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const now = useNow();
  const today = now ? dateKey(now) : undefined;
  const settings = useSettings();
  const scans = useScansByDate(today);
  const frequent = useFrequentFoods(today);

  if (!now || !today || !settings || !scans) return <Skeleton />;

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <img src="/icon.svg" alt="" className="size-9 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-tight">{greeting(now)}</h1>
          <p className="text-sm text-muted">{formatThaiDate(now)}</p>
        </div>
      </header>

      {!settings.goalConfirmed && (
        <Link href="/settings" className="pressable card flex items-center gap-3 border-primary/30 bg-primary-soft p-3 hover:opacity-90">
          <Target aria-hidden size={22} className="shrink-0 text-primary" />
          <span className="flex-1 text-sm">
            <span className="block font-medium">ตั้งเป้าแคลอรี่ของคุณ</span>
            <span className="text-muted">ตอนนี้ใช้ค่าเริ่มต้น {formatKcal(settings.dailyGoal)} kcal ต่อวัน</span>
          </span>
          <span className="text-sm font-medium text-primary">ตั้งค่า</span>
        </Link>
      )}

      <section aria-label="แคลอรี่วันนี้" className="card p-4">
        <CalorieRing eaten={sumScans(scans)} goal={settings.dailyGoal} />
      </section>

      {frequent && frequent.length > 0 && (
        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="mb-2 text-sm font-medium text-muted">
            บันทึกด่วน · เมนูที่กินบ่อย
          </h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {frequent.map(({ food }) => (
              <li key={food.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => router.push(`/scan?quick=${food.key}`)}
                  className="pressable flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm hover:bg-surface-2"
                >
                  {food.name_th}
                  <span className="text-xs text-muted tabular-nums">{formatKcal(itemKcal(itemFromReference(food)))}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DayList date={today} scans={scans} />

      {scans.length === 0 && (
        <p className="px-2 text-center text-sm text-muted">ยังไม่มีบันทึกวันนี้ · กด “บันทึกอาหาร” ด้านล่างเพื่อเริ่ม</p>
      )}
    </main>
  );
}
