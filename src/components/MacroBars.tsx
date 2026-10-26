import type { Macros } from "@/lib/nutrition";

const ROWS: { key: keyof Macros; label: string }[] = [
  { key: "protein", label: "โปรตีน" },
  { key: "carb", label: "คาร์บ" },
  { key: "fat", label: "ไขมัน" },
];

/** สารอาหารหลักวันนี้เทียบกับเป้า (กรัม) */
export function MacroBars({ eaten, target, unknown }: { eaten: Macros; target: Macros; unknown: number }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <dl className="flex flex-col gap-2">
        {ROWS.map(({ key, label }) => {
          const progress = target[key] > 0 ? Math.min(1, eaten[key] / target[key]) : 0;
          return (
            <div key={key} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-[var(--track)]" aria-hidden>
                <div className="h-full rounded-full bg-[var(--ring)] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
              </dd>
              <dd className="tabular-nums">
                {eaten[key]} <span className="text-muted">/ {target[key]} ก.</span>
              </dd>
            </div>
          );
        })}
      </dl>
      {unknown > 0 && <p className="mt-2 text-xs text-muted">ไม่รวม {unknown} รายการที่เป็นค่าประมาณการ (ไม่มีข้อมูลสารอาหาร)</p>}
    </div>
  );
}
