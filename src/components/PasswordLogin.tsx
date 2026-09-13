"use client";
import {useUi} from "@/i18n/UiText";
import PasswordField from "./PasswordField";
import { useLang } from "@/i18n/LangProvider";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
export default function PasswordLogin() {
  const ui=useUi();
  const { lang } = useLang();
  const copy = (th:string,en:string) => lang==="th"?th:en;
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  return <div className="password-login"><h2 className="font-bold mb-3">{ui("ใช้อีเมลและรหัสผ่าน")}</h2><div className="auth-tabs">{(["login", "signup"] as const).map(key => <button key={key} disabled={pending} aria-pressed={mode === key} className={mode === key ? "is-selected" : ""} onClick={() => { setMode(key); setMessage(""); }}>{key === "login" ? ui("เข้าสู่ระบบ") : key === "signup" ? ui("สมัครสมาชิก") : ui("ลืมรหัสผ่าน")}</button>)}</div>
    <form className="feature-form" onSubmit={async e => {
      e.preventDefault(); const data = new FormData(e.currentTarget); const email = String(data.get("email")), password = String(data.get("password") ?? ""); setPending(true); setMessage("");
      try { const sb = getSupabaseBrowser(); if (!sb) throw Error();
        const raw = new URLSearchParams(window.location.search).get("next");
        const next = raw?.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/profile";
        const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(mode === "reset" ? "/profile" : next)}`;
        if (mode === "reset") { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callback }); if (error) throw Error(); setMessage(ui("หากอีเมลนี้มีบัญชี ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่")); }
        else if (mode === "signup") { const { data: result, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callback } }); if (error) throw Error(); if (result.session) window.location.assign(next); else setMessage(ui("กรุณาตรวจอีเมลเพื่อยืนยันบัญชี")); }
        else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) { setMessage(ui("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล")); return; } window.location.assign(next); }
      } catch { setMessage(ui("ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่")); } finally { setPending(false); }
    }}><label>{ui("อีเมล")}<input name="email" type="email" autoComplete="email" required disabled={pending} /></label>{mode !== "reset" && <label>{ui("รหัสผ่าน")}<PasswordField name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} maxLength={128} required disabled={pending} />{mode==="signup"&&<small>{copy(ui("อย่างน้อย 8 ตัวอักษร"),"Use at least 8 characters")}</small>}</label>}{mode!=="signup"&&<button type="button" className="text-left underline" onClick={()=>{setMode(mode==="reset"?"login":"reset");setMessage("");}}>{copy(mode==="reset"?ui("กลับไปเข้าสู่ระบบ"):ui("ลืมรหัสผ่าน?"),mode==="reset"?"Back to sign in":"Forgot password?")}</button>}<button className="feature-button" disabled={pending}>{pending ? ui("กำลังดำเนินการ…") : mode === "login" ? ui("เข้าสู่ระบบ") : mode === "signup" ? ui("สมัครสมาชิก") : ui("ส่งลิงก์ตั้งรหัสผ่าน")}</button><p role="status" className="text-sm">{message}</p></form>
  </div>;
}
