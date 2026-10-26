"use client";

import { useEffect, useState } from "react";
import { applyTheme, loadTheme, saveTheme, THEME_LABEL, THEMES, type Theme } from "@/lib/theme";

/** เลือกธีม อัตโนมัติ / สว่าง / มืด — มีผลทันทีและจำไว้ในเครื่องนี้ */
export function ThemeSection() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // อ่านหลัง mount เพื่อไม่ให้ค่าจาก server กับ client ไม่ตรงกัน
  useEffect(() => setTheme(loadTheme()), []);

  function choose(next: Theme) {
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  }

  return (
    <section aria-labelledby="theme-title" className="card flex flex-col gap-3 p-[18px]">
      <h2 id="theme-title">
        <span className="block font-heading text-[17px] leading-tight">ธีม</span>
        <span lang="en" className="block text-[11px] text-muted">
          Appearance
        </span>
      </h2>
      <div role="radiogroup" aria-labelledby="theme-title" className="flex gap-2">
        {THEMES.map((option) => {
          const on = option === theme;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(option)}
              className={`pressable flex min-h-11 flex-1 items-center justify-center rounded-full border px-4 text-sm ${
                on ? "border-accent bg-nav-pill font-semibold text-primary-strong" : "border-border hover:bg-text/5"
              }`}
            >
              {THEME_LABEL[option]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
