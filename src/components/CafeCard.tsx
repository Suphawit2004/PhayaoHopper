"use client";

import Link from "./ResultLink";
import type { Cafe } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import AreaChip from "./AreaChip";
import RatingStars from "./RatingStars";
import OpenBadge from "./OpenBadge";
import TagChip from "./TagChip";
import FavoriteButton from "./FavoriteButton";

export default function CafeCard({ cafe }: { cafe: Cafe }) {
  const { tr, t, lang } = useLang();

  return (
    <article
      className="cafe-card relative group flex flex-col overflow-hidden rounded-2xl border border-[#eee3d2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex h-52 items-center justify-center overflow-hidden">
        <FavoriteButton slug={cafe.slug} variant="overlay" />
        <CafeThumb
          cafe={cafe}
          emojiClassName="text-5xl drop-shadow-lg transition group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-xs font-bold text-espresso">
          {t(cafe.priceRange === 1 ? "cafes.priceBudget" : "cafes.priceMid")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-col items-start gap-2">
          <h3 className="font-semibold text-espresso group-hover:text-coffee"><Link href={`/cafes/${cafe.slug}`} className="cafe-title-link line-clamp-2">{tr(cafe.name)}</Link></h3>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-coffee">
            <RatingStars value={cafe.baseRating} />
            {cafe.baseRating.toFixed(1)} <span className="font-normal">{lang === "th" ? "คะแนนตั้งต้น" : "Reference rating"}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <OpenBadge cafe={cafe} />
          <AreaChip area={cafe.area} />
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-espresso/70">{tr(cafe.description)}</p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {cafe.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      </div>
    </article>
  );
}
