"use client";
import Icon from "./Icon";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCatalog } from "@/components/CatalogProvider";
import { filtersToQuery } from "@/lib/filters-url";
import { filterCafes } from "@/lib/filter-cafes";
import RestoreResults from "./RestoreResults";
import ExplorerControls from "./ExplorerControls";

import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";

import CafeCard from "./CafeCard";

import { useNowTick } from "./OpenBadge";

export default function CafesExplorer() {
  const CAFES = useCatalog();
  const { t, lang } = useLang();
  const { filters, reset } = useSearch();
  const nowTick = useNowTick();

  // Debounce the search text so typing doesn't re-filter on every keystroke
  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const results = useMemo(() => filterCafes(CAFES, {...filters, query:debouncedQuery}, new Date(nowTick), lang), [CAFES, filters, debouncedQuery, nowTick, lang]);
  const [visible, setVisible] = useState(24);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-espresso">{t("cafes.title")}</h1>
        <p className="mt-1 text-espresso/60">{t("cafes.subtitle")}</p>
      </header>

      <RestoreResults ready={nowTick > 0} /><ExplorerControls count={results.length} />
      <Link href="/chat" className="my-4 inline-block text-sm underline">{lang === "th" ? "ลองให้ผู้ช่วยค้นหาร้านตามความต้องการ" : "Ask the assistant to find a cafe for you"}</Link>
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
          {results.slice(0,visible).map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} />
          ))}
        </div>
      )}

      {results.length > visible && <button className="ui-secondary mt-5" onClick={() => setVisible(n => n+24)}>{lang === "th" ? "โหลดเพิ่ม" : "Load more"}</button>}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-center">
        <Link
          href={`/map?${filtersToQuery(filters)}`}
          className="inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          <Icon name="map" /> {t("home.openMap")}
        </Link>
        <Link
          href="/suggest"
          className="inline-block rounded-full border border-coffee/40 bg-white px-6 py-2.5 text-sm font-semibold text-coffee transition hover:bg-sand"
        >
          <Icon name="plus" /> {t("cafes.suggest")}
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
