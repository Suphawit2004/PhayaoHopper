"use client";

import Link from "next/link";
import type { Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";

interface OwnerPortalViewProps {
  user: { id: string } | null;
  cafes: Cafe[];
  error: boolean;
}

export default function OwnerPortalView({ user, cafes, error }: OwnerPortalViewProps) {
  const { t, tr } = useLang();

  if (!user) {
    return (
      <div className="feature-page">
        <h1>{t("owner.title")}</h1>
        <p>{t("owner.subtitle")}</p>
        <section className="feature-card">
          <h2>{t("owner.readyTitle")}</h2>
          <p className="mb-6">{t("owner.readyDesc")}</p>
          <Link className="feature-button inline-block" href="/login?next=/owner">
            {t("owner.loginCta")}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="feature-page">
      <h1>{t("owner.myTitle")}</h1>
      <p>{t("owner.mySubtitle")}</p>
      {error ? (
        <p role="alert" className="feature-card text-rose-700">
          {t("owner.error")}
        </p>
      ) : cafes.length ? (
        <div className="feature-grid">
          {cafes.map((c) => (
            <Link className="feature-card transition hover:border-coffee" href={`/owner/${c.slug}`} key={c.slug}>
              <h2 className="text-xl font-bold">{tr(c.name)}</h2>
              <span className="text-sm font-semibold text-coffee">{t("owner.manageBtn")}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="feature-card">
          <h2>{t("owner.emptyTitle")}</h2>
          <p>{t("owner.emptyDesc")}</p>
          <code className="mt-2 block break-all rounded-md bg-[#faf8f3] p-2 text-sm text-espresso">
            {user.id}
          </code>
          <p className="mt-4">
            <Link className="text-sm font-semibold text-coffee underline" href="/suggest">
              {t("owner.suggestCta")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
