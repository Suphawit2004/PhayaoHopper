"use client";
import { useCatalog } from "@/components/CatalogProvider";

import Link from "next/link";

import { useAuth } from "./AuthProvider";
import { useFavorites } from "./FavoritesProvider";
import { useLang } from "@/i18n/LangProvider";
import CafeCard from "./CafeCard";

export default function FavoritesView() {
  const CAFES = useCatalog();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { slugs, wantedSlugs, wantedReady, visitsError, retryVisits } = useFavorites();

  const cafes = wantedSlugs
    .map((slug) => CAFES.find((c) => c.slug === slug))
    .filter((c): c is (typeof CAFES)[number] => Boolean(c));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-espresso">❤️ {t("fav.title")}</h1>
        <p className="mt-1 text-espresso/60">
          {t("cafes.found").replaceAll("{n}", String(cafes.length))}
        </p>
      </header>

      {!user && wantedReady && slugs.length > 0 && (
        <p className="mb-5 rounded-xl bg-sand/60 px-4 py-3 text-sm text-espresso/80">
          🔑 {t("fav.guestNote")}{" "}
          <Link
            href="/login?next=/favorites"
            className="font-semibold text-coffee underline underline-offset-2"
          >
            {t("profile.signInCta")}
          </Link>
        </p>
      )}

      {visitsError ? (
        <div role="alert" className="rounded-xl border border-[#d9c9ac] bg-white/60 px-6 py-8 text-center">
          <p>{lang === "th" ? "โหลดประวัติร้านที่เคยไปไม่สำเร็จ" : "Could not load your visited cafes."}</p>
          <button type="button" className="ui-secondary mt-4" onClick={retryVisits}>{lang === "th" ? "ลองอีกครั้ง" : "Retry"}</button>
        </div>
      ) : !wantedReady ? (
        <div className="py-24 text-center text-sm text-espresso/60">⏳ …</div>
      ) : cafes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9c9ac] bg-white/60 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-espresso/80">{t("fav.empty")}</p>
          <p className="mt-1 text-sm text-espresso/70">{user && slugs.length > 0
            ? <>{lang === "th" ? "ร้านที่กดหัวใจไว้และเคยไปแล้วอยู่ใน" : "Your heart-saved visited cafes are in "}<Link href="/visited#favorite-visited" className="font-semibold underline underline-offset-2">{lang === "th" ? "ร้านโปรด" : "Favorites"}</Link></>
            : t("fav.emptyHint")}</p>
          <Link
            href="/cafes"
            className="mt-5 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
          >
            ☕ {t("fav.explore")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} />
          ))}
        </div>
      )}
    </div>
  );
}
