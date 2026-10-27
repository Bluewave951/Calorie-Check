"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { clearLocalData } from "@/lib/db";
import { getSupabase } from "@/lib/supabase/client";
import { showToast } from "@/lib/toast";

/** บัญชีที่ล็อกอินอยู่ + ออกจากระบบ (แสดงเฉพาะเมื่อเก็บข้อมูลบน cloud) */
export function AccountSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);

  const signOut = async () => {
    setBusy(true);
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      showToast({ message: "ออกจากระบบไม่สำเร็จ ลองใหม่อีกครั้ง", tone: "error" });
      setBusy(false);
      return;
    }
    // ลบสำเนาในเครื่อง ไม่ให้คนถัดไปที่ใช้เครื่องนี้เห็นข้อมูล
    await clearLocalData().catch(() => {});
    window.location.replace("/login");
  };

  return (
    <section aria-labelledby="account-title">
      <h2 id="account-title" className="mb-2 px-1 text-sm font-semibold text-muted">
        บัญชี
      </h2>
      <div className="card flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">ล็อกอินด้วยอีเมล</p>
          <p className="truncate font-medium">{email ?? "…"}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          className="pressable flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
        >
          <LogOut aria-hidden className="size-4" />
          ออกจากระบบ
        </button>
      </div>
    </section>
  );
}
