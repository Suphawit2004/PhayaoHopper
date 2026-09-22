"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/i18n/LangProvider";

export default function PasswordLogin() {
  const { t } = useLang();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const tabLabels = {
    login: t("pwd.tabLogin"),
    signup: t("pwd.tabSignup"),
    reset: t("pwd.tabReset"),
  } as const;

  return (
    <div className="password-login">
      <h2 className="mb-3 font-bold text-espresso">{t("pwd.title")}</h2>
      <div className="auth-tabs" role="tablist" aria-label={t("pwd.title")}>
        {(["login", "signup", "reset"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            disabled={pending}
            aria-selected={mode === key}
            className={mode === key ? "is-selected" : ""}
            onClick={() => {
              setMode(key);
              setMessage("");
            }}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>

      <form
        className="feature-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const email = String(data.get("email"));
          const password = String(data.get("password") ?? "");
          setPending(true);
          setMessage("");

          try {
            const sb = getSupabaseBrowser();
            if (!sb) throw new Error();
            const raw = new URLSearchParams(window.location.search).get("next");
            const next =
              raw?.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")
                ? raw
                : "/profile";
            const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              mode === "reset" ? "/profile" : next
            )}`;

            if (mode === "reset") {
              const { error } = await sb.auth.resetPasswordForEmail(email, {
                redirectTo: callback,
              });
              if (error) throw error;
              setMessage(t("pwd.resetSent"));
            } else if (mode === "signup") {
              const { data: result, error } = await sb.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: callback },
              });
              if (error) throw error;
              if (result.session) window.location.assign(next);
              else setMessage(t("pwd.confirmEmail"));
            } else {
              const { error } = await sb.auth.signInWithPassword({ email, password });
              if (error) {
                setMessage(t("pwd.invalidCredentials"));
                return;
              }
              window.location.assign(next);
            }
          } catch {
            setMessage(t("pwd.genericError"));
          } finally {
            setPending(false);
          }
        }}
      >
        <label>
          {t("pwd.email")}
          <input name="email" type="email" autoComplete="email" required disabled={pending} />
        </label>
        {mode !== "reset" && (
          <label>
            {t("pwd.password")}
            <input
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              maxLength={128}
              required
              disabled={pending}
            />
          </label>
        )}
        <button className="feature-button" disabled={pending}>
          {pending
            ? t("pwd.pending")
            : mode === "login"
            ? t("pwd.submitLogin")
            : mode === "signup"
            ? t("pwd.submitSignup")
            : t("pwd.submitReset")}
        </button>
        {message && (
          <p role="status" className="text-sm font-medium text-coffee">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
