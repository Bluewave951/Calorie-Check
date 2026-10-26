import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
  prevLabel: string;
  nextLabel: string;
}

/** แถบเลื่อนช่วงเวลา (เดือนก่อน/ถัดไป, ปีก่อน/ถัดไป) */
export function PeriodNav({ label, onPrev, onNext, canNext, prevLabel, nextLabel }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onPrev} aria-label={prevLabel} className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
        <ChevronLeft aria-hidden size={22} />
      </button>
      <h2 className="font-heading text-lg font-semibold" aria-live="polite">
        {label}
      </h2>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label={nextLabel}
        className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
      >
        <ChevronRight aria-hidden size={22} />
      </button>
    </div>
  );
}
