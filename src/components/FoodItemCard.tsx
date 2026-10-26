"use client";

import { useId, useState } from "react";
import { ChevronDown, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { formatKcal } from "@/lib/format";
import {
  canAdjustSweetness,
  isDrink,
  itemKcal,
  PORTIONS,
  servingUnitOf,
  withGrams,
  withPortion,
  withSweetness,
} from "@/lib/nutrition";
import { SWEETNESS_LABEL, SWEETNESS_LEVELS, type FoodItem } from "@/lib/types";

interface Props {
  item: FoodItem;
  onChange: (item: FoodItem) => void;
  onRename: () => void;
  onDelete: () => void;
}

const LOW_CONFIDENCE = 0.5;
const PORTION_LABEL: Record<number, string> = { 0.5: "½", 1: "1", 1.5: "1½" };

export function FoodItemCard({ item, onChange, onRename, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sliderId = useId();
  const lowConfidence = item.confidence < LOW_CONFIDENCE;
  const drink = isDrink(item);
  const portionUnit = servingUnitOf(item);
  const amountUnit = drink ? "มล." : "กรัม";
  const amountShort = drink ? "มล." : "ก.";
  const maxGrams = Math.max(50, Math.ceil((item.servingGrams * 3) / 10) * 10, item.grams);

  return (
    <article
      className={`card p-4 ${lowConfidence ? "border-2 border-warn" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onRename}
          className="-m-1 flex min-h-11 flex-1 items-start gap-1.5 rounded-xl p-1 text-left hover:bg-surface-2"
          aria-label={`เปลี่ยนเมนู ${item.name_th}`}
        >
          <span className="flex-1">
            <span className="block font-heading text-lg font-semibold leading-tight">{item.name_th}</span>
            {item.name_en && <span className="block text-xs text-muted">{item.name_en}</span>}
          </span>
          <Pencil aria-hidden size={16} className="mt-1 shrink-0 text-muted" />
        </button>
        <div className="text-right">
          <span className="font-heading text-xl font-bold tabular-nums">{formatKcal(itemKcal(item))}</span>
          <span className="block text-xs text-muted">kcal</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.estimated && (
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">ประมาณการ</span>
        )}
        {lowConfidence && (
          <span className="flex items-center gap-1 rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-medium text-warn-text">
            <TriangleAlert aria-hidden size={14} /> ลองตรวจดูอีกที
          </span>
        )}
      </div>

      {canAdjustSweetness(item) && (
        <div role="radiogroup" aria-label={`ระดับความหวานของ ${item.name_th}`} className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
          {SWEETNESS_LEVELS.map((level) => {
            const active = (item.sweetness ?? "normal") === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(withSweetness(item, level))}
                className={`pressable min-h-11 rounded-lg text-xs font-medium ${
                  active ? "bg-surface font-semibold text-text shadow-sm ring-1 ring-border" : "text-muted hover:text-text"
                }`}
              >
                {SWEETNESS_LABEL[level]}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5">
        {PORTIONS.map((portion) => {
          const active = item.grams === Math.round(item.servingGrams * portion);
          return (
            <button
              key={portion}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(withPortion(item, portion))}
              className={`pressable min-h-11 flex-1 rounded-xl border text-sm font-medium ${
                active ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border hover:bg-surface-2"
              }`}
            >
              {PORTION_LABEL[portion]} {portionUnit}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`ลบ ${item.name_th}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-over-text"
        >
          <Trash2 aria-hidden size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={sliderId}
        className="mt-2 flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-sm text-muted hover:text-text"
      >
        <span>
          ปริมาณ <strong className="font-semibold text-text tabular-nums">{item.grams}</strong> {amountUnit}
          {drink && <span className="text-xs"> (ไม่รวมน้ำแข็ง)</span>}
        </span>
        <span className="flex items-center gap-1">
          {drink ? "ปรับ มล." : "ปรับกรัม"}
          <ChevronDown aria-hidden size={18} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      {expanded && (
        <div id={sliderId} className="px-1 pb-1">
          <label className="sr-only" htmlFor={`${sliderId}-range`}>
            ปริมาณเป็น{amountUnit}
          </label>
          <input
            id={`${sliderId}-range`}
            type="range"
            min={0}
            max={maxGrams}
            step={5}
            value={item.grams}
            onChange={(e) => onChange(withGrams(item, Number(e.target.value)))}
            className="h-11 w-full"
          />
          <div className="flex justify-between text-xs text-muted tabular-nums">
            <span>0 {amountShort}</span>
            <span>
              {maxGrams} {amountShort}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
