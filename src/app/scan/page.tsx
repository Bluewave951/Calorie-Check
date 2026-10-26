"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Info, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { ErrorState } from "@/components/ErrorState";
import { FoodItemCard } from "@/components/FoodItemCard";
import { MealPicker } from "@/components/MealPicker";
import { ReferenceFoodPicker } from "@/components/ReferenceFoodPicker";
import { ScanProgress, type ScanStep } from "@/components/ScanProgress";
import { deleteScan, getScan, getSettings, putScan } from "@/lib/db";
import { formatKcal, formatThaiDate } from "@/lib/format";
import {
  dateKey,
  getReference,
  guessMeal,
  itemFromReference,
  newId,
  parseDateKey,
  replaceWithReference,
  sumItems,
} from "@/lib/nutrition";
import { takePendingPhoto } from "@/lib/pendingScan";
import { prepareImage, type PreparedImage } from "@/lib/resizeImage";
import { showToast } from "@/lib/toast";
import { MEAL_LABEL, MEAL_TYPES, type AnalyzeError, type AnalyzeResponse, type FoodItem, type MealType, type Scan } from "@/lib/types";

type Phase =
  | { name: "loading" }
  | { name: "pick" }
  | { name: "analyzing"; step: ScanStep; previewUrl: string | null }
  | { name: "review" }
  | { name: "error"; message: string; code?: AnalyzeError["error"]; provider?: AnalyzeError["provider"] };

/** ร่างการสแกนที่กำลังแก้ไข (ยังไม่บันทึก) */
interface Draft {
  id: string;
  date: string;
  meal: MealType;
  createdAt: number;
  thumbnail: string | null;
  items: FoodItem[];
  isNew: boolean;
}

type PickerTarget = { mode: "add" } | { mode: "rename"; itemId: string };

function isMeal(value: string | null): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

function ScanScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("id");
  const quickKey = params.get("quick");
  const manual = params.get("manual") === "1";
  const fromSheet = params.get("photo") === "1";
  const [phase, setPhase] = useState<Phase>(editId || fromSheet || quickKey || manual ? { name: "loading" } : { name: "pick" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [analyzedBy, setAnalyzedBy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const imageRef = useRef<PreparedImage | null>(null);

  // แก้ไขการสแกนที่บันทึกแล้ว
  useEffect(() => {
    if (!editId) return;
    getScan(editId).then((scan) => {
      if (!scan) {
        router.replace("/scan");
        setPhase({ name: "pick" });
        return;
      }
      setDraft({ ...scan, isNew: false });
      setPhase({ name: "review" });
    });
  }, [editId, router]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** ร่างการสแกนใหม่ ใช้มื้อ/วันที่จากลิงก์ ถ้ามี ไม่งั้นเดาจากเวลา */
  const newDraft = (thumbnail: string | null, items: FoodItem[]): Draft => {
    const now = new Date();
    const paramDate = params.get("date");
    const paramMeal = params.get("meal");
    return {
      id: newId(),
      date: paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : dateKey(now),
      meal: isMeal(paramMeal) ? paramMeal : guessMeal(now),
      createdAt: now.getTime(),
      thumbnail,
      items,
      isNew: true,
    };
  };

  // เข้ามาจากแผ่น "บันทึกอาหาร": รูปที่เลือก / เมนูที่กินบ่อย / ค้นหาเมนู
  const started = useRef(false);
  useEffect(() => {
    if (started.current || editId) return;
    started.current = true;
    if (fromSheet) {
      const file = takePendingPhoto();
      if (file) onFile(file);
      else setPhase({ name: "pick" });
      return;
    }
    if (quickKey || manual) {
      const ref = quickKey ? getReference(quickKey) : undefined;
      setDraft(newDraft(null, ref ? [itemFromReference(ref)] : []));
      setPhase({ name: "review" });
      if (!ref) setPicker({ mode: "add" });
    }
  }, []); // ทำครั้งเดียวตอนเปิดหน้า

  const analyze = async (image: PreparedImage) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ name: "analyzing", step: "analyze", previewUrl: image.previewUrl });
    try {
      const { model } = await getSettings();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: image.base64, model }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as AnalyzeError | null;
        setPhase({
          name: "error",
          message: err?.message ?? `เกิดข้อผิดพลาด (${res.status})`,
          code: err?.error,
          provider: err?.provider,
        });
        return;
      }
      const data = (await res.json()) as AnalyzeResponse;
      setAnalyzedBy(data.model);
      setPhase({ name: "analyzing", step: "compute", previewUrl: image.previewUrl });

      setDraft(newDraft(image.thumbnail, data.items));
      setTimeout(() => setPhase({ name: "review" }), 400);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase({
        name: "error",
        message: error instanceof Error && error.name !== "TypeError" ? error.message : "เชื่อมต่อเซิร์ฟเวอร์ของแอปไม่ได้",
      });
    }
  };

  const onFile = async (file: File) => {
    setPhase({ name: "analyzing", step: "resize", previewUrl: null });
    try {
      const image = await prepareImage(file);
      imageRef.current = image;
      await analyze(image);
    } catch {
      setPhase({ name: "error", message: "เปิดรูปนี้ไม่ได้ ลองเลือกรูปอื่น" });
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    setPhase({ name: "pick" });
  };

  const retry = () => {
    if (imageRef.current) analyze(imageRef.current);
    else setPhase({ name: "pick" });
  };

  const updateItems = (fn: (items: FoodItem[]) => FoodItem[]) =>
    setDraft((d) => (d ? { ...d, items: fn(d.items) } : d));

  const save = async () => {
    if (!draft || draft.items.length === 0) return;
    const { isNew, ...scan } = draft;
    const before = isNew ? undefined : await getScan(scan.id);
    await putScan(scan satisfies Scan);
    const summary = `${formatKcal(sumItems(scan.items))} kcal · มื้อ${MEAL_LABEL[scan.meal]}`;
    showToast({
      message: isNew ? `บันทึกแล้ว ${summary}` : `บันทึกการแก้ไขแล้ว ${summary}`,
      action: {
        label: "เลิกทำ",
        onClick: () => (before ? putScan(before) : deleteScan(scan.id)),
      },
    });
    if (isNew) router.push("/");
    else router.back();
  };

  // ลบได้ทันทีแล้วให้กด "เลิกทำ" แทนการถามยืนยันก่อน
  const remove = async () => {
    if (!draft || draft.isNew) return;
    const saved = await getScan(draft.id);
    await deleteScan(draft.id);
    showToast({
      message: `ลบการสแกนมื้อ${MEAL_LABEL[draft.meal]}แล้ว`,
      action: saved ? { label: "เลิกทำ", onClick: () => putScan(saved) } : undefined,
    });
    router.back();
  };

  if (phase.name === "loading") {
    return <div className="mt-14 h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy aria-label="กำลังโหลด" />;
  }

  if (phase.name === "error") {
    return <ErrorState message={phase.message} code={phase.code} provider={phase.provider} onRetry={retry} />;
  }

  const header = (title: string) => (
    <header className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => (phase.name === "analyzing" ? cancel() : router.back())}
        aria-label="ย้อนกลับ"
        className="-ml-2 flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <ArrowLeft aria-hidden size={24} />
      </button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );

  if (phase.name === "pick") {
    return (
      <main>
        {header("สแกนอาหาร")}
        <CameraCapture onFile={onFile} />
      </main>
    );
  }

  if (phase.name === "analyzing") {
    return (
      <main>
        {header("กำลังวิเคราะห์")}
        <ScanProgress previewUrl={phase.previewUrl} step={phase.step} onCancel={cancel} />
      </main>
    );
  }

  if (!draft) return null;
  const total = sumItems(draft.items);
  const fromPhoto = draft.thumbnail !== null;
  const title = !draft.isNew ? "แก้ไขรายการ" : fromPhoto ? "ผลการสแกน" : "เพิ่มอาหาร";

  return (
    <main className="pb-24">
      {header(title)}

      <div className="card flex items-center gap-3 p-3">
        {draft.thumbnail ? (
          <img src={draft.thumbnail} alt="รูปอาหาร" className="size-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted" aria-hidden>
            <UtensilsCrossed size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{formatThaiDate(parseDateKey(draft.date))}</p>
          <p className="font-semibold">
            {draft.items.length} รายการ · {formatKcal(total)} kcal
          </p>
          {draft.isNew && fromPhoto && analyzedBy && <p className="truncate text-xs text-muted">วิเคราะห์โดย {analyzedBy}</p>}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-muted" id="meal-label">
          มื้อ
        </p>
        <MealPicker value={draft.meal} onChange={(meal) => setDraft({ ...draft, meal })} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {draft.items.map((item) => (
          <FoodItemCard
            key={item.id}
            item={item}
            onChange={(next) => updateItems((items) => items.map((i) => (i.id === next.id ? next : i)))}
            onRename={() => setPicker({ mode: "rename", itemId: item.id })}
            onDelete={() => updateItems((items) => items.filter((i) => i.id !== item.id))}
          />
        ))}

        {draft.items.length === 0 && (
          <div className="card flex flex-col items-center p-6 text-center">
            <UtensilsCrossed aria-hidden size={28} className="text-muted" />
            <p className="mt-2 font-medium">{fromPhoto ? "ไม่พบอาหารในรูป" : "ยังไม่มีรายการ"}</p>
            <p className="text-sm text-muted">กด “เพิ่มรายการ” เพื่อค้นหาเมนู</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPicker({ mode: "add" })}
          className="pressable flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface font-medium text-primary hover:bg-primary-soft"
        >
          <Plus aria-hidden size={20} /> เพิ่มรายการ
        </button>
      </div>

      <p className="mt-4 flex gap-2 px-1 text-xs text-muted">
        <Info aria-hidden size={14} className="mt-0.5 shrink-0" />
        ค่าแคลอรี่เป็นค่าประมาณ อาจคลาดเคลื่อน ±20–30% · รายการ “ประมาณการ” ใช้ตัวเลขที่ AI เดา
      </p>

      {!draft.isNew && (
        <button
          type="button"
          onClick={remove}
          className="pressable mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-over-text hover:bg-surface-2"
        >
          <Trash2 aria-hidden size={18} /> ลบรายการนี้
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-[430px] items-center gap-3 px-4 py-3">
          <div className="flex-1" aria-live="polite">
            <span className="text-xs text-muted">รวม</span>
            <p className="text-2xl font-bold leading-tight tabular-nums">
              {formatKcal(total)} <span className="text-sm font-normal text-muted">kcal</span>
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={draft.items.length === 0}
            className="pressable min-h-12 rounded-xl bg-accent px-8 font-semibold text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>

      {picker && (
        <ReferenceFoodPicker
          title={picker.mode === "add" ? "เพิ่มรายการ" : "เปลี่ยนเมนู"}
          onClose={() => setPicker(null)}
          onPick={(food) => {
            if (picker.mode === "add") updateItems((items) => [...items, itemFromReference(food)]);
            else
              updateItems((items) =>
                items.map((i) => (i.id === picker.itemId ? replaceWithReference(i, food) : i)),
              );
          }}
        />
      )}
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanScreen />
    </Suspense>
  );
}
