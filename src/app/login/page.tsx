"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { isValidEmail, safeNextPath, toLoginEmail } from "@/lib/auth";
import { CLOUD_ENABLED, getSupabase } from "@/lib/supabase/client";

const NOT_ALLOWED_TEXT = "บัญชีนี้ยังไม่ได้รับอนุญาตให้ใช้แอป ขอให้ผู้ดูแลเพิ่มอีเมลของคุณใน ALLOWED_EMAILS";

const inputClass = "mt-1.5 min-h-12 w-full rounded-xl border border-border bg-bg px-4 text-lg outline-none focus:border-primary";

/** ล็อกอินด้วยบัญชีที่ผู้ดูแลสร้างใน Supabase (อีเมลหรือชื่อผู้ใช้ + รหัสผ่าน) — ไม่มีหน้าสมัครเอง */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "not_allowed") return;
    setError(NOT_ALLOWED_TEXT);
    // บอกบัญชีที่ล็อกอินอยู่ และจำนวนใน ALLOWED_EMAILS ที่เซิร์ฟเวอร์อ่านได้ ให้เทียบกับค่าใน Vercel ได้ง่าย
    getSupabase()
      .auth.getUser()
      .then(({ data }) => {
        const lines = [NOT_ALLOWED_TEXT, `ล็อกอินอยู่ด้วย: ${data.user?.email ?? "ไม่ทราบ"}`];
        const count = params.get("allowed");
        if (count !== null) lines.push(`ALLOWED_EMAILS ที่เซิร์ฟเวอร์อ่านได้: ${count} อีเมล`);
        setError(lines.join("\n"));
      })
      .catch(() => {});
  }, []);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = toLoginEmail(identifier);
    if (!isValidEmail(email)) return setError("กรอกอีเมลหรือชื่อผู้ใช้ให้ถูกต้อง");
    setBusy(true);
    setError(null);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (signInError) {
      setBusy(false);
      setError(signInError.status === 429 ? "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่" : "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    // โหลดใหม่ทั้งหน้า เพื่อให้ proxy เห็น cookie ของ session
    window.location.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")));
  };

  return (
    <main className="pt-16">
      <h1 className="mb-1 font-heading text-[30px] font-medium leading-tight">Calorie&amp;Check</h1>
      <p className="mb-6 text-muted">เข้าสู่ระบบเพื่อดูและบันทึกข้อมูลของคุณได้จากทุกเครื่อง</p>

      {!CLOUD_ENABLED ? (
        <p className="card p-4 text-sm text-muted">ยังไม่ได้ตั้งค่า Supabase แอปจึงเก็บข้อมูลในเครื่องนี้และไม่ต้องล็อกอิน</p>
      ) : (
        <form onSubmit={signIn} className="card p-4" noValidate>
          <label htmlFor="identifier" className="text-sm font-medium">
            อีเมลหรือชื่อผู้ใช้
          </label>
          <input
            id="identifier"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error ? "login-error" : undefined}
            className={inputClass}
          />

          <label htmlFor="password" className="mt-4 block text-sm font-medium">
            รหัสผ่าน
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error !== null}
              aria-describedby={error ? "login-error" : undefined}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex size-11 -translate-y-[calc(50%-3px)] items-center justify-center rounded-xl text-muted hover:bg-surface-2"
            >
              {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          </div>

          {error && (
            <p id="login-error" role="alert" className="mt-3 whitespace-pre-line rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-text">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || identifier.trim() === "" || password === ""}
            className="pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            {busy && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            เข้าสู่ระบบ
          </button>
          <p className="mt-3 text-center text-sm text-muted">ยังไม่มีบัญชี หรือลืมรหัสผ่าน ติดต่อผู้ดูแลแอป</p>
        </form>
      )}
    </main>
  );
}
