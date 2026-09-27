"use client";

import { useState } from "react";
import { useUi } from "@/i18n/UiText";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import PasswordField from "@/features/account/PasswordField";

export default function PasswordLogin() {
  const ui = useUi();
  const { lang } = useLang();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="password-login">
      <h2 className="font-bold mb-3">{ui("ใช้อีเมลและรหัสผ่าน")}</h2>
      <div className="auth-tabs">
        {(["login", "signup"] as const).map(key => (
          <button
            key={key}
            type="button"
            disabled={pending}
            aria-pressed={mode === key}
            className={mode === key ? "is-selected" : ""}
            onClick={() => { setMode(key); setMessage(""); }}
          >
            {ui(key === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก")}
          </button>
        ))}
      </div>
      <form className="feature-form" onSubmit={async event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = String(data.get("email"));
        const password = String(data.get("password") ?? "");
        setPending(true);
        setMessage("");
        try {
          const supabase = getSupabaseBrowser();
          if (!supabase) throw Error();
          const raw = new URLSearchParams(window.location.search).get("next");
          const next = raw?.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/";
          if (mode === "signup") {
            const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
            const { data: result, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
            if (error) throw Error();
            if (result.session) window.location.assign(next);
            else setMessage(ui("กรุณาตรวจอีเมลเพื่อยืนยันบัญชี"));
          } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
              setMessage(ui("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล"));
              return;
            }
            window.location.assign(next);
          }
        } catch {
          setMessage(ui("ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่"));
        } finally {
          setPending(false);
        }
      }}>
        <label>{ui("อีเมล")}<input name="email" type="email" autoComplete="email" required disabled={pending} /></label>
        <label>
          {ui("รหัสผ่าน")}
          <PasswordField name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} maxLength={128} required disabled={pending} />
          {mode === "signup" && <small>{lang === "th" ? ui("อย่างน้อย 8 ตัวอักษร") : "Use at least 8 characters"}</small>}
        </label>
        <button className="feature-button" disabled={pending}>{pending ? ui("กำลังดำเนินการ…") : ui(mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก")}</button>
        <p role="status" className="text-sm">{message}</p>
      </form>
    </div>
  );
}
