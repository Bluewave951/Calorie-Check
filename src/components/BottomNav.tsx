"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, Plus, Settings, Sun, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AddFoodSheet } from "./AddFoodSheet";
import { onOpenAddSheet, openAddSheet, type AddSheetRequest } from "@/lib/addSheet";

interface Tab {
  href: string;
  label: string;
  labelEn: string;
  Icon: LucideIcon;
}

const TABS: Tab[] = [
  { href: "/", label: "วันนี้", labelEn: "Today", Icon: Sun },
  { href: "/history", label: "ประวัติ", labelEn: "History", Icon: CalendarDays },
  { href: "/program", label: "โปรแกรม", labelEn: "Program", Icon: TrendingDown },
  { href: "/exercise", label: "ออกกำลัง", labelEn: "Exercise", Icon: Dumbbell },
  { href: "/settings", label: "ตั้งค่า", labelEn: "Settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** แถบเมนูล่าง 5 ช่องเท่ากัน + ปุ่มลอย "บันทึกอาหาร" + แผ่นเลือกวิธีบันทึก */
export function BottomNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<AddSheetRequest | null>(null);

  useEffect(() => onOpenAddSheet(setSheet), []);
  // เปลี่ยนหน้าแล้วต้องไม่มีแผ่นค้างอยู่
  useEffect(() => setSheet(null), [pathname]);

  // หน้าสแกนมีแถบบันทึกของตัวเองด้านล่าง / หน้า login ยังใช้เมนูไม่ได้
  if (pathname.startsWith("/scan") || pathname === "/login") return null;
  const showFab = pathname === "/" || pathname.startsWith("/history");

  return (
    <>
      {showFab && (
        <button
          type="button"
          onClick={() => openAddSheet()}
          className="pressable fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-[max(16px,calc(50%-199px))] z-30 flex min-h-[52px] items-center gap-2 whitespace-nowrap rounded-full bg-accent px-[22px] font-semibold text-on-accent shadow-float hover:bg-accent-hover"
        >
          <Plus aria-hidden size={20} strokeWidth={2.5} />
          บันทึกอาหาร
        </button>
      )}

      <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-[430px] grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex min-h-16 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[13px] ${
                  active ? "font-semibold text-primary" : "text-muted hover:text-text"
                }`}
              >
                <span className={`flex h-[26px] w-[52px] items-center justify-center rounded-full ${active ? "bg-nav-pill" : ""}`}>
                  <tab.Icon aria-hidden size={20} />
                </span>
                {tab.label}
                <span lang="en" className="text-[10px] leading-tight text-muted" aria-hidden>
                  {tab.labelEn}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {sheet && <AddFoodSheet meal={sheet.meal} date={sheet.date} onClose={() => setSheet(null)} />}
    </>
  );
}
