"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { itemFromReference, itemKcal, searchReferences, servingUnitOf } from "@/lib/nutrition";
import { formatKcal } from "@/lib/format";
import type { ReferenceFood } from "@/lib/types";

interface Props {
  title: string;
  onPick: (food: ReferenceFood) => void;
  onClose: () => void;
}

/** แผ่นค้นหาเมนูอ้างอิง ใช้ทั้งเปลี่ยนชื่อรายการและเพิ่มรายการเอง */
export function ReferenceFoodPicker({ title, onPick, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const results = searchReferences(query);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      aria-label={title}
      className="m-0 mt-auto h-[85dvh] max-h-none w-full max-w-none bg-transparent p-0"
    >
      <div className="sheet-in mx-auto flex h-full max-w-[430px] flex-col rounded-t-3xl border border-b-0 border-border bg-surface text-text">
        <header className="flex items-center gap-2 px-4 pt-4">
          <h2 className="flex-1 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="ปิด"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <X aria-hidden size={22} />
          </button>
        </header>
        <label className="mx-4 mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 focus-within:border-primary">
          <Search aria-hidden size={18} className="text-muted" />
          <span className="sr-only">ค้นหาเมนู</span>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา เช่น ข้าวผัด, ส้มตำ, latte"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
        </label>
        <ul className="mt-2 flex-1 overflow-y-auto px-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {results.map((food) => (
            <li key={food.key}>
              <button
                type="button"
                onClick={() => {
                  onPick(food);
                  dialogRef.current?.close();
                }}
                className="pressable flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2"
              >
                <span className="flex-1">
                  <span className="block">{food.name_th}</span>
                  <span className="block text-xs text-muted">{food.name_en}</span>
                </span>
                <span className="text-right text-sm tabular-nums text-muted">
                  {formatKcal(itemKcal(itemFromReference(food)))} kcal
                  <span className="block text-xs">
                    1 {servingUnitOf(food)} · {food.servingGrams} {food.kind === "drink" ? "มล." : "ก."}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-8 text-center text-muted">ไม่พบเมนูที่ตรงกับ “{query}”</li>}
        </ul>
      </div>
    </dialog>
  );
}
