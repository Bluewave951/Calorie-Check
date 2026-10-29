"use client";

import { useState } from "react";
import { DayList } from "@/components/DayList";
import { ExerciseHistory } from "@/components/ExerciseHistory";
import { MonthView } from "@/components/MonthView";
import { WeekStrip } from "@/components/WeekStrip";
import { YearView } from "@/components/YearView";
import { formatKcal, formatThaiDate } from "@/lib/format";
import { useNow, useScansInRange, useSettings } from "@/lib/hooks";
import { addDays, dateKey, parseDateKey } from "@/lib/nutrition";
import { dailyTotals } from "@/lib/stats";

type Period = "day" | "month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "วัน" },
  { id: "month", label: "เดือน" },
  { id: "year", label: "ปี" },
];

function Loading() {
  return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;
}

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
  /** undefined = ยังโหลดการตั้งค่าไม่เสร็จ */
  goal: number | undefined;
  onSelect: (date: string) => void;
  onShift: (weeks: number) => void;
}) {
  const startDate = dateKey(addDays(parseDateKey(endDate), -6));
  const scans = useScansInRange(startDate, endDate);
  const loaded = scans !== undefined && goal !== undefined;
  const totals = scans ? dailyTotals(scans) : {};
  const dayTotal = totals[selected] ?? 0;
  const over = goal !== undefined && dayTotal > goal;

  // หัวข้อวันที่และส่วนออกกำลังกายแสดง/เริ่มโหลดทันที ไม่ต้องรอรายการอาหาร
  return (
    <>
      {loaded ? (
        <WeekStrip endDate={endDate} selected={selected} today={today} totals={totals} goal={goal} onSelect={onSelect} onShift={onShift} />
      ) : (
        <div className="h-[200px] animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />
      )}

      <section className="flex items-end justify-between px-1" aria-live="polite">
        <div>
          <h2 className="font-heading text-lg font-semibold">{formatThaiDate(parseDateKey(selected))}</h2>
          {loaded ? (
            <p className={`text-sm ${over ? "text-over-text" : "text-muted"}`}>
              {over ? `เกินเป้า ${formatKcal(dayTotal - goal)} kcal` : `ต่ำกว่าเป้า ${formatKcal(goal - dayTotal)} kcal`}
            </p>
          ) : (
            <p className="mt-1 h-4 w-28 animate-pulse rounded bg-surface-2" />
          )}
        </div>
        {loaded && (
          <p className="font-heading text-2xl font-bold tabular-nums">
            {formatKcal(dayTotal)} <span className="text-sm font-normal text-muted">kcal</span>
          </p>
        )}
      </section>

      {loaded ? <DayList date={selected} scans={scans.filter((scan) => scan.date === selected)} /> : <Loading />}

      <ExerciseHistory
        range={{ kind: "week", selected, dates: Array.from({ length: 7 }, (_, i) => dateKey(addDays(parseDateKey(startDate), i))) }}
      />
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

  // ไม่รอการตั้งค่าก่อน → ข้อมูลแต่ละส่วนโหลดพร้อมกัน
  const goal = settings?.dailyGoal;
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
        <DayView selected={selected} endDate={endDate} today={today} goal={goal} onSelect={setSelected} onShift={shiftWeek} />
      )}
      {period === "month" && (
        <>
          {goal === undefined ? (
            <Loading />
          ) : (
            <MonthView year={cursor.year} month={cursor.month} today={today} goal={goal} onShift={shiftMonth} onPickDay={openDay} />
          )}
          <ExerciseHistory range={{ kind: "month", year: cursor.year, month: cursor.month }} />
        </>
      )}
      {period === "year" && (
        <>
          {goal === undefined ? (
            <Loading />
          ) : (
            <YearView
              year={cursor.year}
              today={today}
              goal={goal}
              onShift={(years) => setCursor(({ year, month }) => ({ year: year + years, month }))}
              onPickMonth={(month) => {
                setCursor(({ year }) => ({ year, month }));
                setPeriod("month");
              }}
            />
          )}
          <ExerciseHistory range={{ kind: "year", year: cursor.year }} />
        </>
      )}
    </main>
  );
}

export default function HistoryPage() {
  const now = useNow();
  if (!now) return <Loading />;
  return <History today={dateKey(now)} />;
}
