import type { Macros } from "@/lib/nutrition";

const ROWS: { key: keyof Macros; label: string; color: string }[] = [
  { key: "protein", label: "โปรตีน", color: "var(--macro-protein)" },
  { key: "carb", label: "คาร์บ", color: "var(--macro-carb)" },
  { key: "fat", label: "ไขมัน", color: "var(--macro-fat)" },
];

/** สารอาหารหลักวันนี้เทียบกับเป้า (กรัม) — แต่ละตัวมีสีของตัวเอง */
export function MacroBars({ eaten, target, unknown }: { eaten: Macros; target: Macros; unknown: number }) {
  return (
    <div>
      <dl className="flex flex-col gap-4">
        {ROWS.map(({ key, label, color }) => {
          const progress = target[key] > 0 ? Math.min(1, eaten[key] / target[key]) : 0;
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="flex items-center gap-2 font-medium">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </dt>
                <dd className="tabular-nums">
                  <b>{eaten[key]}</b> <span className="text-sm text-muted">/ {target[key]} ก.</span>
                </dd>
              </div>
              <dd className="h-3 overflow-hidden rounded-full bg-[var(--track)]" aria-hidden>
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${progress * 100}%`, background: color }} />
              </dd>
            </div>
          );
        })}
      </dl>
      {unknown > 0 && <p className="mt-3 text-xs text-muted">ไม่รวม {unknown} รายการที่เป็นค่าประมาณการ (ไม่มีข้อมูลสารอาหาร)</p>}
    </div>
  );
}
