"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Plus, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AddFoodSheet } from "./AddFoodSheet";
import { onOpenAddSheet, openAddSheet, type AddSheetRequest } from "@/lib/addSheet";

interface Tab {
  href: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: Tab[] = [
  { href: "/", label: "วันนี้", Icon: House },
  { href: "/history", label: "ประวัติ", Icon: CalendarDays },
  { href: "/settings", label: "ตั้งค่า", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** แถบเมนูล่าง 3 ช่องเท่ากัน + ปุ่มลอย "บันทึกอาหาร" + แผ่นเลือกวิธีบันทึก */
export function BottomNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<AddSheetRequest | null>(null);

  useEffect(() => onOpenAddSheet(setSheet), []);
  // เปลี่ยนหน้าแล้วต้องไม่มีแผ่นค้างอยู่
  useEffect(() => setSheet(null), [pathname]);

  // หน้าสแกนมีแถบบันทึกของตัวเองด้านล่าง
  if (pathname.startsWith("/scan")) return null;
  const showFab = pathname === "/" || pathname.startsWith("/history");

  return (
    <>
      {showFab && (
        <button
          type="button"
          onClick={() => openAddSheet()}
          className="pressable fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-215px+1rem))] z-30 flex h-14 items-center gap-2 rounded-2xl bg-primary pl-4 pr-5 font-semibold text-on-primary shadow-float hover:opacity-90"
        >
          <Plus aria-hidden size={22} strokeWidth={2.5} />
          บันทึกอาหาร
        </button>
      )}

      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-[430px] grid-cols-3">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  active ? "text-primary" : "text-muted hover:text-text"
                }`}
              >
                <span className={`flex h-7 w-14 items-center justify-center rounded-full ${active ? "bg-primary-soft" : ""}`}>
                  <tab.Icon aria-hidden size={22} strokeWidth={active ? 2.25 : 1.75} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {sheet && <AddFoodSheet meal={sheet.meal} date={sheet.date} onClose={() => setSheet(null)} />}
    </>
  );
}
