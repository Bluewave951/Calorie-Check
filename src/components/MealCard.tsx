"use client";

import Link from "next/link";
import { ChevronRight, Coffee, Cookie, Moon, Plus, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { openAddSheet } from "@/lib/addSheet";
import { formatKcal } from "@/lib/format";
import { sumItems } from "@/lib/nutrition";
import { MEAL_LABEL, type MealType, type Scan } from "@/lib/types";

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

/** มื้อหนึ่งมื้อ: หัวข้อ + ยอดรวม + การสแกนในมื้อ + ปุ่มเพิ่ม */
export function MealCard({ meal, scans, date }: Props) {
  const Icon = MEAL_ICON[meal];
  const total = scans.reduce((sum, scan) => sum + sumItems(scan.items), 0);
  const label = MEAL_LABEL[meal];

  return (
    <section className="card overflow-hidden" aria-label={`มื้อ${label}`}>
      <header className="flex items-center gap-3 py-2 pl-4 pr-2">
        <Icon aria-hidden size={20} className="shrink-0 text-muted" />
        <h2 className="flex-1 font-semibold">{label}</h2>
        {scans.length > 0 && (
          <span className="text-sm font-semibold tabular-nums">
            {formatKcal(total)} <span className="font-normal text-muted">kcal</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => openAddSheet({ meal, date })}
          aria-label={`เพิ่มอาหารมื้อ${label}`}
          className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-soft"
        >
          <Plus aria-hidden size={22} />
        </button>
      </header>

      {scans.length > 0 ? (
        <ul className="border-t border-border">
          {scans.map((scan) => (
            <li key={scan.id} className="border-b border-border last:border-b-0">
              <Link href={`/scan?id=${scan.id}`} className="pressable flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-surface-2">
                {scan.thumbnail ? (
                  <img src={scan.thumbnail} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted" aria-hidden>
                    <Icon size={18} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm">{scan.items.map((item) => item.name_th).join(", ") || "ไม่มีรายการ"}</span>
                  <span className="text-xs text-muted">
                    {new Date(scan.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. · {scan.items.length} รายการ
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatKcal(sumItems(scan.items))}</span>
                <ChevronRight aria-hidden size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted">ยังไม่ได้บันทึก</p>
      )}
    </section>
  );
}
