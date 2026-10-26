"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Search, X } from "lucide-react";
import { formatKcal } from "@/lib/format";
import { useFrequentFoods, useNow } from "@/lib/hooks";
import { dateKey, itemFromReference, itemKcal } from "@/lib/nutrition";
import { setPendingPhoto } from "@/lib/pendingScan";
import type { MealType } from "@/lib/types";

interface Props {
  /** มื้อที่เลือกไว้ล่วงหน้า (เช่น กดเพิ่มจากการ์ดมื้อ) */
  meal?: MealType;
  date?: string;
  onClose: () => void;
}

function Option({ icon: Icon, title, hint, onClick }: { icon: typeof Camera; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex min-h-16 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon aria-hidden size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
}

/** แผ่นเลือกวิธีบันทึกอาหาร: ถ่ายรูป / เลือกรูป / ค้นหา / เมนูที่กินบ่อย */
export function AddFoodSheet({ meal, date, onClose }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const now = useNow();
  const frequent = useFrequentFoods(now ? dateKey(now) : undefined);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const go = (params: Record<string, string>) => {
    const query = new URLSearchParams({ ...(meal ? { meal } : {}), ...(date ? { date } : {}), ...params });
    // ปิดผ่าน onClose โดยตรง: เปลี่ยนหน้าแล้ว dialog ถูกถอดออกก่อน event "close" จะมาถึง
    onClose();
    router.push(`/scan?${query}`);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingPhoto(file);
    go({ photo: "1" });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="add-title"
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none bg-transparent p-0"
    >
      <div className="sheet-in mx-auto max-w-[430px] rounded-t-3xl border border-b-0 border-border bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] text-text">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
        <header className="flex items-center px-4 pt-2">
          <h2 id="add-title" className="flex-1 text-lg font-semibold">
            บันทึกอาหาร
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="ปิด"
            className="pressable flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <X aria-hidden size={22} />
          </button>
        </header>

        <div className="px-2">
          <Option icon={Camera} title="ถ่ายรูป" hint="AI แยกเมนูและคำนวณแคลอรี่ให้" onClick={() => cameraRef.current?.click()} />
          <Option icon={ImageUp} title="เลือกรูปจากคลังภาพ" hint="ใช้รูปที่ถ่ายไว้แล้ว" onClick={() => galleryRef.current?.click()} />
          <Option icon={Search} title="ค้นหาเมนู" hint="ไม่ต้องถ่ายรูป เลือกจาก 139 เมนู" onClick={() => go({ manual: "1" })} />
        </div>

        {frequent && frequent.length > 0 && (
          <section className="mt-2 border-t border-border px-4 pt-3" aria-labelledby="frequent-title">
            <h3 id="frequent-title" className="text-sm font-medium text-muted">
              กินบ่อย · แตะเพื่อบันทึกเลย
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {frequent.map(({ food }) => (
                <li key={food.key}>
                  <button
                    type="button"
                    onClick={() => go({ quick: food.key })}
                    className="pressable flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm hover:bg-surface-2"
                  >
                    {food.name_th}
                    <span className="text-xs text-muted tabular-nums">{formatKcal(itemKcal(itemFromReference(food)))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </dialog>
  );
}
