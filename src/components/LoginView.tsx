"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import PasswordLogin from "./PasswordLogin";

function LoginFormInner() {
  const { t, lang } = useLang();
  const [remaining,setRemaining] = useState(0);
  useEffect(()=>{if(remaining<=0)return;const timer=setTimeout(()=>setRemaining(n=>n-1),1000);return()=>clearTimeout(timer);},[remaining]);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");


  const supabaseReady = getSupabaseBrowser() !== null;

  // Where to send the user after the auth callback. Same-origin paths only;
  // /auth/callback enforces this too.
  const nextPath = searchParams.get("next");
  const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\") ? nextPath : "/profile";
  const callbackUrl = () => {
    const cb = new URL(`${window.location.origin}/auth/callback`);
    if (safeNext !== "/profile") cb.searchParams.set("next", safeNext);
    return cb.toString();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !email.trim() || remaining>0) return;
    setStatus("sending");
    try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });
    setStatus(error ? "error" : "sent");
    if(!error)setRemaining(60);
    } catch { setStatus("error"); }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">{t("login.checkEmail")}</p>
        <p className="mt-1 text-sm text-emerald-700/80">{email}</p><button className="ui-secondary mt-4" onClick={()=>setStatus("idle")}>{lang==="th"?"แก้ไขอีเมล":"Edit email"}</button><form onSubmit={submit}><button className="ui-secondary mt-3" disabled={remaining>0}>{remaining>0 ? `${lang==="th"?"ส่งใหม่ได้ใน":"Resend in"} ${remaining}s` : (lang==="th"?"ส่งลิงก์อีกครั้ง":"Resend link")}</button></form>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-semibold text-espresso">
          {t("login.emailLabel")}
        </label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPh")}
          autoComplete="email"
          className="mt-1.5 w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white"
        />
      </div>

      {!supabaseReady && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t("login.notConfigured")}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{t("login.error")}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending" || !supabaseReady || remaining>0}
        className="rounded-full bg-coffee px-6 py-3 text-sm font-bold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
      >
        {status === "sending" ? `⏳ ${t("login.sending")}` : `✉️ ${t("login.submit")}`}
      </button>

    </form>
  );
}

function AuthErrorNotice() {
  const params = useSearchParams();
  const { t } = useLang();
  return params.get("error") === "auth" ? <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{t("login.authError")}</p> : null;
}

export default function LoginView() {
  const { t, lang } = useLang();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-espresso">🔑 {t("login.title")}</h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-espresso/70">{lang === "th" ? "เข้าสู่ระบบเพื่อเก็บร้านโปรดและแบ่งปันประสบการณ์ของคุณ" : "Sign in to save cafes and share your experiences"}</p>

      <div className="mt-8 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <Suspense fallback={<div className="h-40" aria-hidden />}>
          <AuthErrorNotice />
          <PasswordLogin />
          <details className="mt-6 border-t border-[#eee3d2] pt-5"><summary className="cursor-pointer text-sm font-semibold">{lang==="th"?"เข้าสู่ระบบด้วยลิงก์อีเมล ไม่ใช้รหัสผ่าน":"Sign in with an email link, without a password"}</summary><div className="mt-4"><LoginFormInner /></div></details>
          </Suspense>
      </div>
    </div>
  );
}
