"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { safeNextPath } from "@/lib/auth";
import { CLOUD_ENABLED, getSupabase } from "@/lib/supabase/client";

const ERROR_TEXT: Record<string, string> = {
  not_allowed: "บัญชี Google นี้ยังไม่ได้รับอนุญาตให้ใช้แอป ลองบัญชีอื่น หรือขอให้ผู้ดูแลเพิ่มอีเมลของคุณ",
  auth_failed: "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง",
};

/** ล็อกอินด้วยบัญชี Google (ผ่าน Supabase Auth) */
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(ERROR_TEXT[code] ?? ERROR_TEXT.auth_failed);
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    // ล็อกอินด้วยบัญชีที่ไม่ได้รับอนุญาตอยู่ → ออกก่อน แล้วให้เลือกบัญชีใหม่
    await supabase.auth.signOut().catch(() => {});
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.href, queryParams: { prompt: "select_account" } },
    });
    // สำเร็จ = เบราว์เซอร์กำลังไปหน้า Google จึงไม่ต้องปิด busy
    if (oauthError) {
      setError(ERROR_TEXT.auth_failed);
      setBusy(false);
    }
  };

  return (
    <main className="pt-16">
      <h1 className="mb-1 font-heading text-[30px] font-medium leading-tight">Calorie&amp;Check</h1>
      <p className="mb-6 text-muted">เข้าสู่ระบบเพื่อดูและบันทึกข้อมูลของคุณได้จากทุกเครื่อง</p>
      <div className="card p-4">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn-text">
            {error}
          </p>
        )}
        {CLOUD_ENABLED ? (
          <button
            type="button"
            onClick={signIn}
            disabled={busy}
            className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-on-accent hover:opacity-90 disabled:opacity-40"
          >
            {busy && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            เข้าสู่ระบบด้วย Google
          </button>
        ) : (
          <p className="text-sm text-muted">ยังไม่ได้ตั้งค่า Supabase แอปจึงเก็บข้อมูลในเครื่องนี้และไม่ต้องล็อกอิน</p>
        )}
      </div>
    </main>
  );
}
