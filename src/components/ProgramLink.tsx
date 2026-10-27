import Link from "next/link";
import { ChevronRight, TrendingDown } from "lucide-react";
import { PROGRAM_STATUS_LABEL, programProgress } from "@/lib/program";
import { weightTrend } from "@/lib/weights";
import type { WeightEntry, WeightProgram } from "@/lib/types";

/** ทางลัดจากหน้าแรกไปโปรแกรมลดน้ำหนัก: ยังไม่เริ่ม = ชวนเริ่ม, เริ่มแล้ว = ความคืบหน้าย่อ */
export function ProgramLink({ program, weights, today }: { program?: WeightProgram; weights: WeightEntry[]; today: string }) {
  const latestKg = weightTrend(weights, today)?.latest.weightKg ?? program?.startWeightKg;
  const progress = program && latestKg !== undefined ? programProgress(program, latestKg, today) : null;

  return (
    <Link href="/program" className="pressable card flex items-center gap-3 p-4 hover:bg-surface-2">
      <TrendingDown aria-hidden size={20} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-muted">โปรแกรมลดน้ำหนัก</span>
        {program && progress ? (
          <span className="block tabular-nums">
            ลดไปแล้ว {Math.max(0, progress.lostKg).toFixed(1)} จาก {(program.startWeightKg - program.targetWeightKg).toFixed(1)} กก.
            <span className="ml-2 text-sm text-muted">{PROGRAM_STATUS_LABEL[progress.status]}</span>
          </span>
        ) : (
          <span className="block text-sm">ตั้งน้ำหนักเป้าหมาย แล้วให้แอปคำนวณเป้าแคลอรี่และเมนูให้</span>
        )}
      </span>
      <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
    </Link>
  );
}
