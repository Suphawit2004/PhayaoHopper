"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useUi } from "@/i18n/UiText";

export default function PasswordResetRequest() {
  const ui = useUi();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Supabase is not configured");
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/auth/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      if (error) {
        setMessage(ui(error.status === 429 ? "ส่งบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง" : "ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
        return;
      }
      setMessage(ui("หากอีเมลนี้มีบัญชี ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่"));
    } catch {
      setMessage(ui("ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="feature-card">
      <form className="feature-form" onSubmit={submit}>
        <label>{ui("อีเมล")}
          <input name="email" type="email" autoComplete="email" required disabled={pending} />
        </label>
        <button className="feature-button" type="submit" disabled={pending}>
          {pending ? ui("กำลังดำเนินการ…") : ui("ส่งลิงก์ตั้งรหัสผ่าน")}
        </button>
        <p role="status" aria-live="polite" className="text-sm">{message}</p>
      </form>
    </section>
  );
}
