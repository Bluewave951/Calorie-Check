import { formatKcal } from "@/lib/format";

interface Props {
  eaten: number;
  goal: number;
}

const VIEW = 200;
const STROKE = 16;
const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** สรุปแคลอรี่วันนี้: วงแหวนใหญ่กลางการ์ด + บรรทัด กินไป / เป้า */
export function CalorieRing({ eaten, goal }: Props) {
  const over = eaten > goal;
  const progress = goal > 0 ? Math.min(1, eaten / goal) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-square w-40">
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="block size-full -rotate-90" aria-hidden>
          <circle cx={VIEW / 2} cy={VIEW / 2} r={RADIUS} fill="none" stroke={over ? "var(--over-soft)" : "var(--track)"} strokeWidth={STROKE} />
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={RADIUS}
            fill="none"
            stroke={over ? "var(--over)" : "var(--ring)"}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted">{over ? "เกินเป้า" : "เหลืออีก"}</span>
          <span className={`font-heading text-[34px] leading-[1.05] tabular-nums ${over ? "text-over" : ""}`}>
            {formatKcal(Math.abs(goal - eaten))}
          </span>
          <span className="text-xs text-muted">kcal</span>
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        กินไป <b className="tabular-nums text-text">{formatKcal(eaten)}</b> / เป้า <b className="tabular-nums text-text">{formatKcal(goal)}</b> kcal
      </p>
    </div>
  );
}
