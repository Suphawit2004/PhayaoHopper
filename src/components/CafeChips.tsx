"use client";

import { AREA_META, cafeTagMeta, type CafeArea, type CafeTag } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";

export function AreaChip({ area }: { area: CafeArea }) {
  const { tr } = useLang();
  const meta = AREA_META[area];
  return (
    <span className="area-chip inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-coffee">
      <span aria-hidden>{meta.emoji}</span>
      {tr(meta.label)}
    </span>
  );
}

export function TagChip({ tag }: { tag: CafeTag }) {
  const { tr } = useLang();
  const meta = cafeTagMeta(tag);
  return (
    <span className="tag-chip inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-coffee">
      <span aria-hidden>{meta.emoji}</span>
      {tr(meta.label)}
    </span>
  );
}
