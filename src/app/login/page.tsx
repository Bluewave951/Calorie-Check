"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isValidEmail, isValidOtpCode, normalizeEmail, safeNextPath } from "@/lib/auth";
import { CLOUD_ENABLED, getSupabase } from "@/lib/supabase/client";

const NOT_ALLOWED_TEXT = "อีเมลนี้ยังไม่ได้รับอนุญาตให้ใช้แอป ลองอีเมลอื่น หรือขอให้ผู้ดูแลเพิ่มอีเมลของคุณ";

const inputClass = "mt-1.5 min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-lg outline-none focus:border-primary";
const buttonClass =
  "pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90 disabled:opacity-40";

/** ล็อกอินด้วยรหัสที่ส่งไปทางอีเมล (Supabase Auth) — ไม่ต้องจำรหัสผ่าน */
export default function LoginPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "not_allowed") return;
    setError(NOT_ALLOWED_TEXT);
    // บอกอีเมลที่ล็อกอินอยู่ และจำนวนใน ALLOWED_EMAILS ที่เซิร์ฟเวอร์อ่านได้ ให้เทียบกับค่าใน Vercel ได้ง่าย
    getSupabase()
      .auth.getUser()
      .then(({ data }) => {
        const count = params.get("allowed");
        const lines = [NOT_ALLOWED_TEXT, `ล็อกอินอยู่ด้วย: ${data.user?.email ?? "ไม่ทราบ"}`];
        if (count !== null) {
          lines.push(count === "0" ? "เซิร์ฟเวอร์ยังไม่เห็นค่า ALLOWED_EMAILS (ตั้งแล้วต้อง Redeploy)" : `ALLOWED_EMAILS ที่เซิร์ฟเวอร์อ่านได้: ${count} อีเมล`);
        }
        setError(lines.join("\n"));
      })
      .catch(() => {});
  }, []);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = normalizeEmail(email);
    if (!isValidEmail(address)) return setError("รูปแบบอีเมลไม่ถูกต้อง");
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    // ล็อกอินด้วยอีเมลที่ไม่ได้รับอนุญาตค้างอยู่ → ออกก่อน
    await supabase.auth.signOut().catch(() => {});
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (sendError) {
      setError(sendError.status === 429 ? "ขอรหัสบ่อยเกินไป รอสักครู่แล้วลองใหม่" : "ส่งรหัสไม่สำเร็จ ตรวจอีเมลแล้วลองใหม่");
      return;
    }
    setEmail(address);
    setCode("");
    setStep("code");
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidOtpCode(code)) return setError("กรอกรหัสตัวเลขจากอีเมลให้ครบ");
    setBusy(true);
    setError(null);
    const { error: verifyError } = await getSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    if (verifyError) {
      setBusy(false);
      setError("รหัสไม่ถูกต้องหรือหมดอายุ ลองใหม่ หรือขอรหัสใหม่");
      return;
    }
    // โหลดใหม่ทั้งหน้า เพื่อให้ proxy เห็น cookie ของ session (อีเมลไม่ได้รับอนุญาต → กลับมาหน้านี้พร้อมข้อความ)
    window.location.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  return (
    <main className="pt-16">
      <h1 className="mb-1 font-heading text-[30px] font-medium leading-tight">Calorie&amp;Check</h1>
      <p className="mb-6 text-muted">เข้าสู่ระบบเพื่อดูและบันทึกข้อมูลของคุณได้จากทุกเครื่อง</p>

      {!CLOUD_ENABLED ? (
        <p className="card p-4 text-sm text-muted">ยังไม่ได้ตั้งค่า Supabase แอปจึงเก็บข้อมูลในเครื่องนี้และไม่ต้องล็อกอิน</p>
      ) : step === "email" ? (
        <form onSubmit={sendCode} className="card p-4" noValidate>
          <label htmlFor="email" className="text-sm font-medium">
            อีเมล
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : "email-help"}
            className={inputClass}
          />
          <p id="email-help" className="mt-1.5 text-sm text-muted">
            เราจะส่งรหัสตัวเลขไปที่อีเมลนี้
          </p>
          <ErrorText error={error} />
          <button type="submit" disabled={busy || email.trim() === ""} className={buttonClass}>
            {busy && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            ส่งรหัสเข้าอีเมล
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="card p-4" noValidate>
          <label htmlFor="code" className="text-sm font-medium">
            รหัสจากอีเมล
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : "code-help"}
            className={`${inputClass} text-center text-2xl tracking-[0.3em] tabular-nums`}
          />
          <p id="code-help" className="mt-1.5 text-sm text-muted">
            ส่งไปที่ <span className="font-medium text-text">{email}</span> แล้ว (ถ้าไม่เห็น ลองดูในจดหมายขยะ)
          </p>
          <ErrorText error={error} />
          <button type="submit" disabled={busy || code.length === 0} className={buttonClass}>
            {busy && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="pressable mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-muted hover:bg-surface-2"
          >
            เปลี่ยนอีเมล / ขอรหัสใหม่
          </button>
        </form>
      )}
    </main>
  );
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p id="login-error" role="alert" className="mt-2 whitespace-pre-line rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-text">
      {error}
    </p>
  );
}
