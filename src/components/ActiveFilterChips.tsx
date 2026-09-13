"use client";

import {
  AREA_META,
  LIFESTYLE_META,
  TAG_META,
} from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";

export default function ActiveFilterChips() {
  const { t, tr } = useLang();
  const { filters, patch, reset } = useSearch();

  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [
    ...filters.tags.map((tg) => ({
      id: `tag-${tg}`,
      label: `${TAG_META[tg].emoji} ${tr(TAG_META[tg].label)}`,
      onRemove: () =>
        patch({ tags: filters.tags.filter((x) => x !== tg) }),
    })),
    ...filters.life.map((lf) => ({
      id: `life-${lf}`,
      label: `${LIFESTYLE_META[lf].emoji} ${tr(LIFESTYLE_META[lf].label)}`,
      onRemove: () => patch({ life: filters.life.filter((x) => x !== lf) }),
    })),
  ];
  if (filters.query.trim()) chips.unshift({ id: "query", label: filters.query, onRemove: () => patch({ query: "" }) });
  if (filters.area) {
    chips.push({
      id: "area",
      label: `${AREA_META[filters.area].emoji} ${tr(AREA_META[filters.area].label)}`,
      onRemove: () => patch({ area: null }),
    });
  }
  if (filters.maxPrice !== 0) {
    chips.push({
      id: "price",
      label: `${t(
        filters.maxPrice === 2 ? "cafes.priceMid" : "cafes.priceBudget"
      )}`,
      onRemove: () => patch({ maxPrice: 0 }),
    });
  }
  if (filters.openNow) {
    chips.push({
      id: "open",
      label: `🟢 ${t("cafes.openNow")}`,
      onRemove: () => patch({ openNow: false }),
    });
  }
  if (filters.transitionZone) {
    chips.push({
      id: "zone",
      label: `🛣️ ${t("cafes.zone")}`,
      onRemove: () => patch({ transitionZone: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          aria-label={`${chip.label} — ${t("filter.remove")}`}
          title={`${chip.label} — ${t("filter.remove")}`}
          className="rounded-chip group inline-flex items-center gap-1.5 rounded-full border border-coffee/30 bg-sand/50 py-1 pl-3 pr-2 text-xs font-semibold text-espresso transition hover:border-coffee hover:bg-sand"
        >
          {chip.label}
          <span className="text-espresso/40 group-hover:text-coffee" aria-hidden>
            ✕
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={reset}
        className="rounded-full px-2 py-1 text-xs font-semibold text-coffee underline underline-offset-2"
      >
        {t("cafes.reset")}
      </button>
    </div>
  );
}
