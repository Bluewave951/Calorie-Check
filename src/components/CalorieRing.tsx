import { formatKcal } from "@/lib/format";

interface Props {
  eaten: number;
  goal: number;
}

const SIZE = 148;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Stat({ label, value, tone }: { label: string; value: number; tone?: "over" }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${tone === "over" ? "text-over-text" : ""}`}>
        {formatKcal(value)} <span className="text-xs font-normal text-muted">kcal</span>
      </dd>
    </div>
  );
}

/** สรุปแคลอรี่วันนี้: วงแหวน + ตัวเลข กินไป / เป้า / เหลือ */
export function CalorieRing({ eaten, goal }: Props) {
  const over = eaten > goal;
  const progress = goal > 0 ? Math.min(1, eaten / goal) : 0;
  const percent = goal > 0 ? Math.round((eaten / goal) * 100) : 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-xs font-medium ${over ? "text-over-text" : "text-muted"}`}>{over ? "เกินเป้า" : "เหลืออีก"}</span>
          <span className={`text-3xl font-bold leading-tight tabular-nums ${over ? "text-over-text" : ""}`}>
            {formatKcal(Math.abs(goal - eaten))}
          </span>
          <span className="text-xs text-muted">kcal</span>
        </div>
      </div>

      <dl className="flex min-w-0 flex-1 flex-col gap-2.5" aria-label="สรุปแคลอรี่วันนี้">
        <Stat label="กินไปแล้ว" value={eaten} tone={over ? "over" : undefined} />
        <Stat label="เป้าวันนี้" value={goal} />
        <div>
          <dt className="sr-only">ความคืบหน้า</dt>
          <dd className="text-xs text-muted">{percent}% ของเป้า</dd>
        </div>
      </dl>
    </div>
  );
}
