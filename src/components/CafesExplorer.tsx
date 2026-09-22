"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCatalog } from "@/components/CatalogProvider";
import { getOpenStatus } from "@/lib/hours";
import { scoreCafe } from "@/lib/cafe-search";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";
import { filterByMaxDistance, getCafesBetweenAreas, MAX_DISTANCE_KM } from "@/lib/cafes-between";
import CafeCard from "./CafeCard";
import FilterBar from "./FilterBar";
import { useNowTick } from "./OpenBadge";

export default function CafesExplorer() {
  const CAFES = useCatalog();
  const { t, tr, lang } = useLang();
  const { filters, reset } = useSearch();
  const nowTick = useNowTick();

  // Debounce the search text so typing doesn't re-filter on every keystroke
  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    const locale = lang === "th" ? "th" : "en";

    // Score every cafe against the query: name matches (fuzzy) weigh most,
    // address / tag hits act as weaker secondary signals. No query = show all.
    let scored = CAFES.map(cafe => ({ cafe, score: scoreCafe(cafe, q) })).filter(x => x.score > 0);

    scored = scored.filter(({ cafe }) => {
      if (filters.tags.length > 0 && !filters.tags.some((tg) => cafe.tags.includes(tg))) {
        return false;
      }
      if (
        filters.life.length > 0 &&
        !filters.life.every((lt) => cafe.lifestyleTags.includes(lt))
      ) {
        return false;
      }
      if (filters.area !== null && cafe.area !== filters.area) return false;
      if (filters.maxPrice !== 0 && cafe.priceRange > filters.maxPrice) return false;
      if (
        filters.openNow &&
        !getOpenStatus(cafe, nowTick === 0 ? undefined : new Date(nowTick)).isOpenNow
      ) {
        return false;
      }
      return true;
    });

    if (filters.transitionZone) {
      const distances = getCafesBetweenAreas(scored.map((x) => x.cafe));
      const keep = new Set(
        filterByMaxDistance(distances, MAX_DISTANCE_KM).map((d) => d.cafe.slug)
      );
      scored = scored.filter((x) => keep.has(x.cafe.slug));
    }

    // Most relevant match first, then rating, then name
    return scored
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.cafe.baseRating - a.cafe.baseRating ||
          tr(a.cafe.name).localeCompare(tr(b.cafe.name), locale)
      )
      .map((x) => x.cafe);
  }, [
    CAFES,
    debouncedQuery,
    filters.tags,
    filters.life,
    filters.area,
    filters.maxPrice,
    filters.openNow,
    filters.transitionZone,
    nowTick,
    tr,
    lang,
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-espresso">{t("cafes.title")}</h1>
        <p className="mt-1 text-espresso/60">{t("cafes.subtitle")}</p>
      </header>

      <FilterBar className="mb-3" />
      <div className="mb-4">
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 rounded-full bg-sand/60 px-3.5 py-1.5 text-xs font-semibold text-coffee transition hover:bg-sand hover:text-espresso"
        >
          <span>✨</span>
          <span>{t("cafes.assistantLink")}</span>
        </Link>
      </div>

      <p className="text-sm font-semibold text-espresso/70" aria-live="polite">
        {t("cafes.found").replaceAll("{n}", String(results.length))}
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#d9c9ac] bg-white/60 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-espresso/80">{t("cafes.empty")}</p>
          <p className="mt-1 text-sm text-espresso/70">{t("cafes.emptyHint")}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
          >
            {t("cafes.reset")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
        <Link
          href="/map"
          className="inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          📍 {t("home.openMap")}
        </Link>
        <Link
          href="/suggest"
          className="inline-block rounded-full border border-coffee/40 bg-white px-6 py-2.5 text-sm font-semibold text-coffee transition hover:bg-sand"
        >
          ➕ {t("cafes.suggest")}
        </Link>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
