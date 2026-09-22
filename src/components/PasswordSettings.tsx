"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/i18n/LangProvider";

export default function PasswordSettings() {
  const { t } = useLang();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <section className="feature-card">
      <h2 className="text-xl font-bold text-espresso">{t("pwd.settingsTitle")}</h2>
      <p className="mb-4 text-sm text-espresso/70">{t("pwd.settingsDesc")}</p>
      <form
        className="feature-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const password = String(data.get("password"));
          if (password !== data.get("confirm")) {
            setMessage(t("pwd.mismatch"));
            return;
          }
          setPending(true);
          setMessage("");

          try {
            const sb = getSupabaseBrowser();
            if (!sb) throw new Error();
            const { error } = await sb.auth.updateUser({ password });
            if (error) {
              setMessage(t("pwd.settingsFail"));
            } else {
              setMessage(t("pwd.settingsSuccess"));
              form.reset();
            }
          } catch {
            setMessage(t("pwd.genericError"));
          } finally {
            setPending(false);
          }
        }}
      >
        <label>
          {t("pwd.newPassword")}
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={pending}
          />
        </label>
        <label>
          {t("pwd.confirmPassword")}
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            disabled={pending}
          />
        </label>
        <button className="feature-button" disabled={pending}>
          {pending ? t("pwd.pending") : t("pwd.settingsSuccess")}
        </button>
        {message && <p role="status" className="text-sm font-medium text-coffee">{message}</p>}
      </form>
    </section>
  );
}
