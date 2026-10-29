"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { backupFileName, BackupError, buildBackup, parseBackup, summarize, type Backup, type BackupSummary } from "@/lib/backup";
import { DATA_CHANGED_EVENT, getAllExercises, getAllScans, getSettings, getWeights, importData, markBackedUp } from "@/lib/db";
import { formatKcal, formatThaiDate } from "@/lib/format";
import { parseDateKey } from "@/lib/nutrition";
import { CLOUD_ENABLED } from "@/lib/supabase/config";
import { showToast } from "@/lib/toast";

function describe(summary: BackupSummary): string {
  if (summary.scans === 0) return "ยังไม่มีการสแกน";
  const range = (key: string) => formatThaiDate(parseDateKey(key), { weekday: undefined, year: "numeric" });
  const dates = summary.from === summary.to ? range(summary.from!) : `${range(summary.from!)} – ${range(summary.to!)}`;
  return `${summary.scans} การสแกน ใน ${summary.days} วัน (${dates})`;
}

/** ส่งไฟล์ให้ผู้ใช้: มือถือใช้เมนูแชร์ (บันทึกลงไฟล์/ส่ง LINE ได้) ไม่งั้นดาวน์โหลด */
async function deliver(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "ไฟล์สำรอง Calorie&Check" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // แชร์ไม่ได้ → ดาวน์โหลดแทน
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}

export function BackupSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  useEffect(() => {
    const load = () => getAllScans().then((scans) => setSummary(summarize(scans)));
    load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, load);
  }, []);

  const exportData = async () => {
    setBusy("export");
    try {
      const backup = buildBackup(await getAllScans(), await getSettings(), await getWeights(), await getAllExercises());
      const file = new File([JSON.stringify(backup)], backupFileName(), { type: "application/json" });
      if ((await deliver(file)) !== "cancelled") {
        await markBackedUp();
        showToast({ message: `ส่งออกแล้ว: ${file.name}` });
      }
    } catch {
      showToast({ message: "ส่งออกไม่สำเร็จ ลองใหม่อีกครั้ง", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (error) {
      showToast({ message: error instanceof BackupError ? error.message : "อ่านไฟล์ไม่สำเร็จ", tone: "error" });
    }
  };

  const confirmImport = async (backup: Backup) => {
    setBusy("import");
    try {
      await importData(backup.scans, backup.settings, backup.weights, backup.exercises);
      showToast({ message: `นำเข้าแล้ว ${backup.scans.length} การสแกน` });
    } catch {
      showToast({ message: "นำเข้าไม่สำเร็จ ลองใหม่อีกครั้ง", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-4">
      <p className="text-sm">
        <span className="text-muted">{CLOUD_ENABLED ? "บน cloud: " : "ในเครื่องนี้: "}</span>
        <span className="font-medium">{summary ? describe(summary) : "…"}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={exportData}
          disabled={busy !== null || summary?.scans === 0}
          className="pressable flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border font-medium hover:bg-surface-2 disabled:opacity-40"
        >
          {busy === "export" ? <LoaderCircle aria-hidden size={18} className="animate-spin" /> : <Download aria-hidden size={18} />}
          ส่งออก
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="pressable flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border font-medium hover:bg-surface-2 disabled:opacity-40"
        >
          {busy === "import" ? <LoaderCircle aria-hidden size={18} className="animate-spin" /> : <Upload aria-hidden size={18} />}
          นำเข้า
        </button>
      </div>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={onFile} aria-label="เลือกไฟล์สำรอง" />

      {pending && (
        <ConfirmDialog
          title="นำเข้าไฟล์สำรอง?"
          confirmLabel="นำเข้า"
          onConfirm={() => confirmImport(pending)}
          onCancel={() => setPending(null)}
        >
          <p className="font-medium text-text">{describe(summarize(pending.scans))}</p>
          <p className="mt-2">
            จะรวมกับข้อมูลที่มีอยู่ (รายการเดียวกันจะใช้ของในไฟล์) และตั้งเป้าแคลอรี่เป็น {formatKcal(pending.settings.dailyGoal)} kcal
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
