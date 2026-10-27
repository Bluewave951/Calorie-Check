import { MEAL_ICON } from "./MealCard";
import { formatKcal } from "@/lib/format";
import { MEAL_LABEL, MEAL_TYPES, type MealType } from "@/lib/types";

const MEAL_COLOR: Record<MealType, string> = {
  breakfast: "var(--meal-breakfast)",
  lunch: "var(--meal-lunch)",
  dinner: "var(--meal-dinner)",
  snack: "var(--meal-snack)",
};

/** แคลอรี่วันนี้แบ่งตามมื้อ: แถบสัดส่วนหนึ่งเส้น + รายการตัวเลข (ตัวเลขอยู่ในรายการ แถบเป็นภาพประกอบ) */
export function MealBreakdown({ totals }: { totals: Record<MealType, number> }) {
  const sum = MEAL_TYPES.reduce((acc, meal) => acc + totals[meal], 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-[var(--track)]" aria-hidden>
        {sum > 0 &&
          MEAL_TYPES.filter((meal) => totals[meal] > 0).map((meal) => (
            <div key={meal} style={{ width: `${(totals[meal] / sum) * 100}%`, background: MEAL_COLOR[meal] }} />
          ))}
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {MEAL_TYPES.map((meal) => {
          const Icon = MEAL_ICON[meal];
          return (
            <li key={meal} className="flex items-center gap-2.5 rounded-2xl bg-surface-2 p-3">
              <Icon aria-hidden size={18} style={{ color: MEAL_COLOR[meal] }} className="shrink-0" />
              <span className="min-w-0 flex-1 text-sm">{MEAL_LABEL[meal]}</span>
              <span className="tabular-nums">
                <b>{formatKcal(totals[meal])}</b>
                <span className="text-xs text-muted"> kcal</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
