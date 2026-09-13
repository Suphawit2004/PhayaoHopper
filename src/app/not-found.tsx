"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="mx-auto grid max-w-6xl place-items-center px-4 py-24">
      <div className="max-w-md rounded-2xl border border-[#eee3d2] bg-white p-10 text-center shadow-sm">
        <span className="block text-6xl select-none" aria-hidden>
          ☕
        </span>
        <h1 className="mt-4 text-2xl font-bold text-espresso">{t("nf.title")}</h1>
        <p className="mt-2 leading-relaxed text-espresso/70">{t("nf.desc")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          ← {t("nf.back")}
        </Link>
        <Link href="/cafes" className="ui-secondary mt-3">{t("nav.cafes")}</Link>
      </div>
      <p className="mt-6 text-sm font-medium text-espresso/40">404</p>
    </div>
  );
}
