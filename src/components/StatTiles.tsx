import { formatKcal } from "@/lib/format";
import type { PeriodSummary } from "@/lib/stats";

interface Props {
  summary: PeriodSummary;
  goal: number;
}

function Tile({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: "over" }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${tone === "over" ? "text-over-text" : ""}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function StatTiles({ summary, goal }: Props) {
  const avgOver = summary.loggedDays > 0 && summary.average > goal;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile label="เฉลี่ยต่อวัน" value={summary.loggedDays ? formatKcal(summary.average) : "–"} unit="kcal" tone={avgOver ? "over" : undefined} />
      <Tile label="รวมทั้งหมด" value={formatKcal(summary.total)} unit="kcal" />
      <Tile label="วันที่บันทึก" value={String(summary.loggedDays)} unit="วัน" />
      <Tile label="วันที่เกินเป้า" value={String(summary.overDays)} unit="วัน" tone={summary.overDays ? "over" : undefined} />
    </div>
  );
}
