"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLang } from "@/i18n/LangProvider";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-6xl place-items-center px-4 py-24">
      <div className="max-w-md rounded-2xl border border-[#eee3d2] bg-white p-10 text-center shadow-sm">
        <span className="block text-6xl select-none" aria-hidden>
          🙈
        </span>
        <h1 className="mt-4 text-2xl font-bold text-espresso">{t("err.title")}</h1>
        <p className="mt-2 leading-relaxed text-espresso/70">{t("err.desc")}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          ↻ {t("err.retry")}
        </button><Link href="/" className="ui-secondary mt-3">{t("nf.back")}</Link>
      </div>
    </div>
  );
}
