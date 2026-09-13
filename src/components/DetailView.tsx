"use client";
import Icon from "./Icon";

import { useRef, useState } from "react";
import BackToResults from "./BackToResults";
import { LIFESTYLE_META } from "@/data/cafes";
import type { Cafe } from "@/data/cafes";
import { mapsUrl } from "@/data/cafes";
import { DAY_KEYS } from "@/i18n/dictionaries";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import AreaChip from "./AreaChip";
import OpenBadge, { useNowTick } from "./OpenBadge";
import { getOpenStatus } from "@/lib/hours";
import RatingStars from "./RatingStars";
import TagChip from "./TagChip";
import ReviewSection from "./ReviewSection";
import MapBlock from "./map/MapBlock";
import FavoriteButton from "./FavoriteButton";
import ReportDialog from "./ReportDialog";
import CafeCommunity from "./CafeCommunity";
import LiveMenu from "./LiveMenu";
import photoCredits from "@/data/photo-credits.json";

export default function DetailView({ cafe }: { cafe: Cafe }) {
  const { t, tr, lang } = useLang();
  const [reportOpen, setReportOpen] = useState(false);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const now = useNowTick();
  const today = now ? getOpenStatus(cafe, new Date(now)) : null;
  const credit = cafe.photo === `/images/cafes/${cafe.slug}/main.jpg` ? (photoCredits as Record<string, { source: string; credit: string }>)[cafe.slug] : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <BackToResults />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl lg:min-h-full">
          <CafeThumb
            cafe={cafe}
            emojiClassName="select-none text-[7rem] drop-shadow-xl"
            preload
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
          {cafe.photo && <button type="button" onClick={() => photoDialog.current?.showModal()} className="absolute top-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold">{lang === "th" ? "ดูรูปเต็ม" : "View full photo"}</button>}
          {credit && <a href={credit.source} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-xs text-white underline">{lang==="th"?"ภาพ:":"Photo:"} {credit.credit}</a>}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-3xl font-bold text-espresso">{tr(cafe.name)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <OpenBadge cafe={cafe} />
              <span className="flex items-center gap-1 text-sm font-semibold text-coffee">
                <RatingStars value={cafe.baseRating} />
                {cafe.baseRating.toFixed(1)} <span className="font-normal">{lang==="th"?"คะแนนตั้งต้น":"Reference rating"}</span>
              </span>
              <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-espresso">
                {t(cafe.priceRange===1?"cafes.priceBudget":"cafes.priceMid")}
              </span>
              <FavoriteButton slug={cafe.slug} variant="inline" />
            </div>
            <p className="mt-3 leading-relaxed text-espresso/75">{tr(cafe.description)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <AreaChip area={cafe.area} />
              {cafe.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          </div>

          <dl className="grid gap-3 rounded-2xl border border-[#eee3d2] bg-white p-5 text-sm shadow-sm">
            <div>
              <dt className="font-semibold text-espresso">🕒 {t("detail.hours")}</dt>
              <dd className="mt-0.5 text-espresso/70">
                <p>{today ? (lang === "th" ? "วันนี้: " : "Today: ") : ""}{today && !today.isOpenToday ? (lang === "th" ? "วันหยุด" : "Closed") : `${cafe.openTime} – ${cafe.closeTime}`}</p>
                <details className="mt-2"><summary className="cursor-pointer font-medium">{lang === "th" ? "ดูเวลาทั้งสัปดาห์" : "Weekly opening hours"}</summary>
                  <ul className="mt-2 grid gap-2">{DAY_KEYS.map((key, day) => <li key={key} className="flex justify-between gap-4"><span>{t(key)}</span><span>{cafe.closedDays.includes(day) ? (lang === "th" ? "หยุด" : "Closed") : `${cafe.openTime} – ${cafe.closeTime}`}</span></li>)}</ul>
                </details>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-espresso">📌 {t("detail.address")}</dt>
              <dd className="mt-0.5 text-espresso/70">{tr(cafe.address)}</dd>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={mapsUrl(cafe)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
              >
                <Icon name="pin" /> {t("detail.directions")}
              </a>
              {cafe.phone && (
                <a
                  href={`tel:${cafe.phone.replace(/\s/g, "")}`}
                  className="rounded-full border border-latte px-5 py-2.5 text-sm font-semibold text-coffee transition hover:bg-latte/20"
                >
                  <Icon name="phone" /> {t("detail.call")} {cafe.phone}
                </a>
              )}
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="self-start text-xs font-semibold text-espresso/50 underline underline-offset-2 transition hover:text-coffee"
          >
            <Icon name="alert" /> {t("report.open")}
          </button>

          <div className="rounded-2xl border border-[#eee3d2] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-espresso/70">
              ⭐ {t("detail.menu")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cafe.menuHighlights.map((item) => (
                <li
                  key={item.en}
                  className="rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-coffee"
                >
                  {tr(item)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="feature-card"><h2>{t("cafes.lifestyleLabel")}</h2><ul className="flex flex-wrap gap-3 mt-3">{cafe.lifestyleTags.map(tag=><li key={tag} className="rounded-lg bg-[#eaf2f0] px-3 py-2">{LIFESTYLE_META[tag].emoji} {tr(LIFESTYLE_META[tag].label)}</li>)}</ul>{!cafe.lifestyleTags.length&&<p>{lang==="th"?"ยังไม่มีข้อมูลยืนยัน":"No verified facilities listed"}</p>}</section>
      <nav className="section-links" aria-label={lang==="th"?"ข้ามไปส่วนต่าง ๆ":"Jump to section"}>{[["menu",lang==="th"?"เมนู":"Menu"],["photos",lang==="th"?"รูปภาพ":"Photos"],["location",t("nav.map")],["reviews",t("reviews.title")]].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav>
      <div id="menu"><LiveMenu slug={cafe.slug} /></div>
      <div id="photos"><CafeCommunity slug={cafe.slug} /></div>
      <section id="location" className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-espresso">🗺️ {t("detail.onMap")}</h2>
        <MapBlock cafes={[cafe]} className="h-72" />
      </section>

      <div id="reviews" className="mt-8">
        <ReviewSection key={cafe.slug} slug={cafe.slug} baseRating={cafe.baseRating} />
      </div>

      {cafe.photo && <dialog ref={photoDialog} className="m-auto max-h-[90dvh] w-[min(94vw,1100px)] rounded-xl p-4 backdrop:bg-black/70" aria-label={tr(cafe.name)}>
        <form method="dialog" className="mb-3 flex justify-end"><button className="rounded-lg border px-4 py-2">{lang === "th" ? "ปิดรูป" : "Close photo"}</button></form>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cafe.photo} alt={tr(cafe.name)} className="max-h-[72dvh] w-full object-contain" />
        {credit && <a href={credit.source} target="_blank" rel="noopener noreferrer" className="mt-3 block underline">{credit.credit}</a>}
      </dialog>}
      <ReportDialog cafeName={tr(cafe.name)} slug={cafe.slug} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
