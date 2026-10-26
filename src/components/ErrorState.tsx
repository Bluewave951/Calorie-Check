import Link from "next/link";
import { KeyRound, Timer, WifiOff } from "lucide-react";
import type { AiProvider, AnalyzeErrorCode } from "@/lib/types";

interface Props {
  message: string;
  code?: AnalyzeErrorCode;
  provider?: AiProvider;
  onRetry: () => void;
}

function content(code: AnalyzeErrorCode | undefined, provider: AiProvider | undefined) {
  if (code === "auth") {
    return {
      Icon: KeyRound,
      title: "API key ใช้ไม่ได้",
      hints: [
        "สมัครหรือสร้าง key ใหม่ที่ openrouter.ai/keys",
        "ใส่ใน .env.local เป็น OPENROUTER_API_KEY=sk-or-...",
        "ปิดแล้วรันแอปใหม่ (npm run dev)",
      ],
    };
  }
  if (code === "rate_limited") {
    return {
      Icon: Timer,
      title: "เกินโควตาฟรีชั่วคราว",
      hints: [
        "โมเดลฟรีจำกัดจำนวนครั้งต่อนาทีและต่อวัน รอสักครู่แล้วลองใหม่",
        "หรือเลือกโมเดลฟรีตัวอื่นในหน้าตั้งค่า",
      ],
    };
  }
  if (provider === "openrouter") {
    return {
      Icon: WifiOff,
      title: "เชื่อมต่อ AI ไม่ได้",
      hints: [
        "ตรวจว่าคอมพิวเตอร์ที่รันแอปต่ออินเทอร์เน็ตอยู่",
        "ตรวจว่ามือถืออยู่ใน Wi‑Fi เดียวกับคอมพิวเตอร์",
        "ตรวจสถานะได้ที่หน้าตั้งค่า → ทดสอบการเชื่อมต่อ",
      ],
    };
  }
  return {
    Icon: WifiOff,
    title: "เชื่อมต่อ AI ไม่ได้",
    hints: [
      "เปิดโปรแกรม Ollama บนคอมพิวเตอร์ที่รันแอปนี้",
      "ตรวจว่ามือถืออยู่ใน Wi‑Fi เดียวกับคอมพิวเตอร์",
      "ตรวจสถานะได้ที่หน้าตั้งค่า → ทดสอบการเชื่อมต่อ",
    ],
  };
}

export function ErrorState({ message, code, provider, onRetry }: Props) {
  const { Icon, title, hints } = content(code, provider);

  return (
    <div role="alert" className="flex flex-col items-center px-2 pt-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface-2 text-over-text">
        <Icon aria-hidden size={36} />
      </span>
      <h1 className="mt-5 font-heading text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{message}</p>

      <ol className="mt-6 w-full card p-4 text-left text-sm">
        {hints.map((hint, i) => (
          <li key={hint} className="flex gap-2 py-1">
            <span aria-hidden>{i + 1}.</span> {hint}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="pressable min-h-12 rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90"
        >
          ลองใหม่
        </button>
        <Link href="/" className="pressable flex min-h-12 items-center justify-center rounded-xl border border-border font-medium hover:bg-surface-2">
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
