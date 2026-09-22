"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useProfile } from "@/lib/use-profile";
import { useLang } from "@/i18n/LangProvider";

export default function MembershipView() {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const { profile } = useProfile();

  return (
    <div className="feature-page">
      <h1>{t("membership.title")}</h1>
      <p>{t("membership.desc")}</p>
      <div className="feature-grid">
        <section className="feature-card !bg-[#3e2c23] text-[#fff5e4]">
          <p className="text-sm tracking-widest">{t("membership.badge")}</p>
          <h2 className="mt-8 text-xl font-bold">
            {loading
              ? "…"
              : user
              ? profile?.display_name || t("membership.defaultName")
              : t("membership.cardTitle")}
          </h2>
          {user ? (
            <>
              <p className="text-sm opacity-75">{t("membership.memberId")}</p>
              <code className="break-all text-sm">{user.id}</code>
              <p className="mt-6 text-sm">{t("membership.cardNote")}</p>
            </>
          ) : (
            !loading && (
              <Link className="mt-4 inline-block underline" href="/login?next=/membership">
                {t("membership.signInCta")}
              </Link>
            )
          )}
        </section>
        <section className="feature-card">
          <h2>{t("membership.perksTitle")}</h2>
          <p>{t("membership.perksDesc")}</p>
        </section>
      </div>
      <section className="feature-card">
        <p className="text-sm font-semibold text-coffee">{t("membership.mockBadge")}</p>
        <h2 className="mt-3">{t("membership.sampleName")}</h2>
        <p className="text-4xl font-bold text-coffee">{t("membership.discountValue")}</p>
        <p className="mt-4">{t("membership.discountDetail")}</p>
        <p className="mt-3 text-sm">
          {user ? t("membership.hasCardNotice") : t("membership.noCardNotice")}
        </p>
      </section>
    </div>
  );
}
