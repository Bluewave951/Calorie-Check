"use client";

import { useState } from "react";
import { DayList } from "@/components/DayList";
import { MonthView } from "@/components/MonthView";
import { WeekStrip } from "@/components/WeekStrip";
import { YearView } from "@/components/YearView";
import { formatKcal, formatThaiDate } from "@/lib/format";
import { useNow, useScansInRange, useSettings } from "@/lib/hooks";
import { addDays, dateKey, parseDateKey, sumItems } from "@/lib/nutrition";

type Period = "day" | "month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "วัน" },
  { id: "month", label: "เดือน" },
  { id: "year", label: "ปี" },
];

function DayView({
  selected,
  endDate,
  today,
  goal,
  onSelect,
  onShift,
}: {
  selected: string;
  endDate: string;
  today: string;
  goal: number;
  onSelect: (date: string) => void;
  onShift: (weeks: number) => void;
}) {
  const startDate = dateKey(addDays(parseDateKey(endDate), -6));
  const scans = useScansInRange(startDate, endDate);

  if (!scans) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  const totals: Record<string, number> = {};
  for (const scan of scans) totals[scan.date] = (totals[scan.date] ?? 0) + sumItems(scan.items);
  const dayScans = scans.filter((scan) => scan.date === selected);
  const dayTotal = totals[selected] ?? 0;
  const over = dayTotal > goal;

  return (
    <>
      <WeekStrip endDate={endDate} selected={selected} today={today} totals={totals} goal={goal} onSelect={onSelect} onShift={onShift} />

      <section className="flex items-end justify-between px-1" aria-live="polite">
        <div>
          <h2 className="font-display text-lg font-semibold">{formatThaiDate(parseDateKey(selected))}</h2>
          <p className={`text-sm ${over ? "text-over-text" : "text-muted"}`}>
            {over ? `เกินเป้า ${formatKcal(dayTotal - goal)} kcal` : `ต่ำกว่าเป้า ${formatKcal(goal - dayTotal)} kcal`}
          </p>
        </div>
        <p className="font-display text-2xl font-bold tabular-nums">
          {formatKcal(dayTotal)} <span className="text-sm font-normal text-muted">kcal</span>
        </p>
      </section>

      <DayList date={selected} scans={dayScans} />
    </>
  );
}

function History({ today }: { today: string }) {
  const settings = useSettings();
  const [period, setPeriod] = useState<Period>("day");
  const [selected, setSelected] = useState(today);
  const [endDate, setEndDate] = useState(today);
  // เดือน/ปีที่กำลังดู
  const [cursor, setCursor] = useState(() => {
    const d = parseDateKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  if (!settings) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;

  const clamp = (key: string) => (key > today ? today : key);

  const shiftWeek = (weeks: number) => {
    const next = clamp(dateKey(addDays(parseDateKey(endDate), weeks * 7)));
    setEndDate(next);
    setSelected(next);
  };

  const openDay = (date: string) => {
    setSelected(date);
    // แสดงวันที่เลือกอยู่ในแถบ 7 วัน (ให้อยู่กลางสัปดาห์ถ้าทำได้)
    setEndDate(clamp(dateKey(addDays(parseDateKey(date), 3))));
    setPeriod("day");
  };

  const shiftMonth = (months: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + months, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">ประวัติ</h1>

      <div role="tablist" aria-label="ช่วงเวลา" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            onClick={() => {
              if (p.id !== "day") {
                const d = parseDateKey(selected);
                setCursor({ year: d.getFullYear(), month: d.getMonth() });
              }
              setPeriod(p.id);
            }}
            className={`pressable min-h-11 rounded-lg text-sm font-medium ${
              period === p.id ? "bg-surface font-semibold text-text shadow-sm ring-1 ring-border" : "text-muted hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "day" && (
        <DayView selected={selected} endDate={endDate} today={today} goal={settings.dailyGoal} onSelect={setSelected} onShift={shiftWeek} />
      )}
      {period === "month" && (
        <MonthView year={cursor.year} month={cursor.month} today={today} goal={settings.dailyGoal} onShift={shiftMonth} onPickDay={openDay} />
      )}
      {period === "year" && (
        <YearView
          year={cursor.year}
          today={today}
          goal={settings.dailyGoal}
          onShift={(years) => setCursor(({ year, month }) => ({ year: year + years, month }))}
          onPickMonth={(month) => {
            setCursor(({ year }) => ({ year, month }));
            setPeriod("month");
          }}
        />
      )}
    </main>
  );
}

export default function HistoryPage() {
  const now = useNow();
  if (!now) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;
  return <History today={dateKey(now)} />;
}
