"use client";

import { cafeTagMeta, type CafeTag } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";

export default function TagChip({ tag }: { tag: CafeTag }) {
  const { tr } = useLang();
  const meta = cafeTagMeta(tag);
  return (
    <span className="tag-chip inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-coffee">
      <span aria-hidden>{meta.emoji}</span>
      {tr(meta.label)}
    </span>
  );
}
