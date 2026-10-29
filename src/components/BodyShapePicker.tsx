"use client";

import { FAT_AREA_LABEL, FAT_AREAS, type FatArea, type Sex } from "@/lib/types";

/** % ไขมันที่ให้เลือก (เรียงจากมากไปน้อย ตามภาพเทียบรูปร่าง) */
export const BODY_FAT_OPTIONS: Record<Sex, number[]> = {
  female: [45, 40, 35, 30, 25, 20, 15],
  male: [35, 30, 25, 20, 15, 12, 8],
};

/** ซิลูเอตด้านหน้าแบบเรียบ: ยิ่งไขมันมาก ลำตัว/สะโพก/ขายิ่งกว้าง ส่วนที่เลือกเป็นสีเน้น */
function Silhouette({ percent, sex, areas = [] }: { percent: number; sex: Sex; areas?: FatArea[] }) {
  const w = 1 + (percent - 15) / 45;
  const hip = sex === "female" ? 1.15 : 1;
  const fill = (area: FatArea) => (areas.includes(area) ? "var(--accent)" : "currentColor");
  const ul = 30 - 9 * w;
  const ur = 30 + 9 * w;
  const bl = 30 - 8.5 * w;
  const br = 30 + 8.5 * w;
  const hl = 30 - 9 * w * hip;
  const hr = 30 + 9 * w * hip;
  const arm = 3 * w;
  const leg = (hr - hl) / 2 - 1.5;
  return (
    <svg viewBox="0 0 60 110" className="h-24 w-full" aria-hidden>
      <circle cx="30" cy="10" r="7" fill="currentColor" />
      <rect x={ul - arm - 1} y="20" width={arm} height="30" rx={arm / 2} fill={fill("arms")} />
      <rect x={ur + 1} y="20" width={arm} height="30" rx={arm / 2} fill={fill("arms")} />
      <path d={`M${ul},19 L${ur},19 L${br},36 L${bl},36 Z`} fill={fill("upper")} />
      <path d={`M${bl},36 L${br},36 L${hr},54 L${hl},54 Z`} fill={fill("flank")} />
      <ellipse cx="30" cy="45" rx={6 * w} ry="8" fill={fill("belly")} />
      <path d={`M${hl},54 L${hr},54 L${hr - 1},64 L${hl + 1},64 Z`} fill={fill("hips")} />
      <rect x={hl + 1} y="64" width={leg} height="44" rx="3" fill={fill("thighs")} />
      <rect x={30.5} y="64" width={leg} height="44" rx="3" fill={fill("thighs")} />
    </svg>
  );
}

export function BodyFatPicker({ sex, value, onChange }: { sex: Sex; value?: number; onChange: (percent: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">รูปร่างใกล้เคียงคุณที่สุด (% ไขมันโดยประมาณ)</legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {BODY_FAT_OPTIONS[sex].map((percent) => (
          <button
            key={percent}
            type="button"
            aria-pressed={value === percent}
            onClick={() => onChange(percent)}
            className={`pressable flex flex-col items-center rounded-2xl border p-1.5 text-sm ${
              value === percent ? "border-primary bg-nav-pill font-semibold text-primary" : "border-border text-muted"
            }`}
          >
            <Silhouette percent={percent} sex={sex} />
            {percent}%
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FatAreaPicker({
  sex,
  percent,
  value,
  onChange,
}: {
  sex: Sex;
  percent: number;
  value: FatArea[];
  onChange: (areas: FatArea[]) => void;
}) {
  const toggle = (area: FatArea) => onChange(value.includes(area) ? value.filter((a) => a !== area) : [...value, area]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">อยากให้ส่วนไหนกระชับขึ้น (เลือกได้หลายส่วน)</legend>
      <div className="flex items-center gap-3">
        <div className="w-24 shrink-0 text-muted">
          <Silhouette percent={percent} sex={sex} areas={value} />
        </div>
        <div className="flex flex-wrap gap-2">
          {FAT_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              aria-pressed={value.includes(area)}
              onClick={() => toggle(area)}
              className={`pressable min-h-10 rounded-full border px-3 text-sm ${
                value.includes(area) ? "border-accent bg-accent text-on-accent" : "border-border"
              }`}
            >
              {FAT_AREA_LABEL[area]}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
