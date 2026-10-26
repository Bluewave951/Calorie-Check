"use client";

import Link from "next/link";
import { Coffee, Cookie, Moon, Plus, Sun, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openAddSheet } from "@/lib/addSheet";
import { formatKcal } from "@/lib/format";
import { sumItems } from "@/lib/nutrition";
import { MEAL_LABEL, MEAL_LABEL_EN, type MealType, type Scan } from "@/lib/types";

export const MEAL_ICON: Record<MealType, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

interface Props {
  meal: MealType;
  scans: Scan[];
  date: string;
}

/** มื้อหนึ่งมื้อ: หัวข้อ + ยอดรวม + ปุ่มเพิ่ม + รูปย่อของแต่ละการสแกน */
export function MealCard({ meal, scans, date }: Props) {
  const total = scans.reduce((sum, scan) => sum + sumItems(scan.items), 0);
  const label = MEAL_LABEL[meal];
  const add = () => openAddSheet({ meal, date });

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label={`มื้อ${label}`}>
      <header className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1">
          <span className="block font-heading text-[17px] leading-tight">มื้อ{label}</span>
          <span lang="en" className="block text-[11px] text-muted">
            {MEAL_LABEL_EN[meal]}
          </span>
        </h2>
        {scans.length > 0 ? (
          <>
            <span className="font-heading text-xl tabular-nums">
              {formatKcal(total)} <small className="font-sans text-xs text-muted">kcal</small>
            </span>
            <button
              type="button"
              onClick={add}
              aria-label={`เพิ่มอาหารมื้อ${label}`}
              className="pressable flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong hover:bg-nav-pill"
            >
              <Plus aria-hidden size={20} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={add}
            aria-label={`เพิ่มอาหารมื้อ${label}`}
            className="pressable min-h-11 rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary-strong hover:bg-nav-pill"
          >
            + เพิ่ม
          </button>
        )}
      </header>

      {scans.length > 0 && (
        <ul className="flex flex-wrap gap-2.5">
          {scans.map((scan) => (
            <li key={scan.id}>
              <Link
                href={`/scan?id=${scan.id}`}
                aria-label={`${scan.items.map((item) => item.name_th).join(", ") || "ไม่มีรายการ"} ${formatKcal(sumItems(scan.items))} kcal`}
                className="pressable flex flex-col items-center gap-1 text-xs text-muted tabular-nums"
              >
                <span className="block size-[60px] overflow-hidden rounded-[20px]">
                  {scan.thumbnail ? (
                    <img src={scan.thumbnail} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-info-soft text-info-text" aria-hidden>
                      <UtensilsCrossed size={20} />
                    </span>
                  )}
                </span>
                {formatKcal(sumItems(scan.items))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
