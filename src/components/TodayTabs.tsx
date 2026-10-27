"use client";

import { useRef } from "react";
import { PieChart, Scale, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { stepTodayTab, TODAY_TABS, type TodayTab } from "@/lib/todayTabs";

const TAB_INFO: Record<TodayTab, { label: string; Icon: LucideIcon }> = {
  meals: { label: "มื้ออาหาร", Icon: UtensilsCrossed },
  nutrients: { label: "สารอาหาร", Icon: PieChart },
  weight: { label: "น้ำหนัก", Icon: Scale },
};

export const tabId = (tab: TodayTab) => `today-tab-${tab}`;
export const panelId = (tab: TodayTab) => `today-panel-${tab}`;

/** แถบแท็บแบบปุ่มแบ่งส่วน ติดด้านบนเมื่อเลื่อนจอ (ปุ่มลูกศรซ้าย/ขวาเปลี่ยนแท็บได้) */
export function TodayTabs({ value, onChange }: { value: TodayTab; onChange: (tab: TodayTab) => void }) {
  const refs = useRef<Partial<Record<TodayTab, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = stepTodayTab(value, event.key === "ArrowRight" ? 1 : -1);
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 bg-bg/80 px-4 py-2 backdrop-blur-md">
      <div role="tablist" aria-label="ส่วนของวันนี้" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1 shadow-card">
        {TODAY_TABS.map((tab) => {
          const { label, Icon } = TAB_INFO[tab];
          const selected = tab === value;
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab)}
              aria-selected={selected}
              aria-controls={panelId(tab)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab)}
              className={`pressable flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold ${
                selected ? "bg-primary text-on-primary" : "text-muted hover:text-text"
              }`}
            >
              <Icon aria-hidden size={17} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
