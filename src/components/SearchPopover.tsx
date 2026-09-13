"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import {
  AREA_META,
  AREA_ORDER,
  LIFESTYLE_META,
  LIFESTYLE_ORDER,
  TAG_META,
  TAG_ORDER,
  type CafeArea,
  type CafeTag,
  type LifeStyleTag,
} from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";

interface SearchPopoverProps {
  open: boolean;
  onClose: () => void;
}

const chipBase =
  "rounded-chip inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition";
const chipOff = `${chipBase} border border-[#e8dcc8] bg-white text-espresso/80 hover:border-latte hover:bg-sand/60`;
const chipOn = `${chipBase} border-coffee bg-coffee text-cream`;

export default function SearchPopover({ open, onClose }: SearchPopoverProps) {
  const { t, tr, lang } = useLang();
  const { filters, patch, reset } = useSearch();

  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; panel.current?.focus(); return () => {document.body.style.overflow = previous;}; }, [open]);
  if (!open) return null;

  const toggleTag = (tag: CafeTag) =>
    patch({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((tg) => tg !== tag)
        : [...filters.tags, tag],
    });

  const toggleLife = (life: LifeStyleTag) =>
    patch({
      life: filters.life.includes(life)
        ? filters.life.filter((lt) => lt !== life)
        : [...filters.life, life],
    });

  const dirty =
    filters.query !== "" ||
    filters.tags.length > 0 ||
    filters.life.length > 0 ||
    filters.area !== null ||
    filters.maxPrice !== 0 ||
    filters.openNow ||
    filters.transitionZone;

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-espresso/70";

  return createPortal(
    <div className="filter-overlay" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}><div
      className="filter-dialog"
      ref={panel} tabIndex={-1}
      onKeyDown={e => {if(e.key==="Escape"){e.preventDefault();onClose();} if(e.key==="Tab"){const els=panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input,select,[href]");if(!els?.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}
      role="dialog" aria-modal="true"
      aria-label={t("filter.open")}
    >
      <div className="flex justify-between items-center mb-4"><h2>{t("filter.open")}</h2><button className="ui-secondary" onClick={onClose}>{lang==="th"?"ปิด":"Close"}</button></div>
      <div>
        <span className={sectionTitle}>{t("cafes.tagsLabel")}</span><p className="text-sm">{lang==="th"?"ตรงอย่างน้อยหนึ่งข้อ":"Match any selected category"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAG_ORDER.map((tag) => {
            const active = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                <span aria-hidden>{TAG_META[tag].emoji}</span> {tr(TAG_META[tag].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.lifestyleLabel")}</span><p className="text-sm">{lang==="th"?"ต้องมีครบทุกข้อที่เลือก":"Must include all selected facilities"}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LIFESTYLE_ORDER.map((life) => {
            const active = filters.life.includes(life);
            return (
              <button
                key={life}
                type="button"
                onClick={() => toggleLife(life)}
                aria-pressed={active}
                className={
                  active ? `${chipBase} border-emerald-700 bg-emerald-700 text-white` : chipOff
                }
              >
                <span aria-hidden>{LIFESTYLE_META[life].emoji}</span>{" "}
                {tr(LIFESTYLE_META[life].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.areaLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patch({ area: null })}
            aria-pressed={filters.area === null}
            className={filters.area === null ? chipOn : chipOff}
          >
            {t("cafes.areaAll")}
          </button>
          {AREA_ORDER.map((a) => {
            const active = filters.area === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => patch({ area: a as CafeArea })}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                <span aria-hidden>{AREA_META[a].emoji}</span> {tr(AREA_META[a].label)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.priceLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([0, 1, 2] as const).map((p) => {
            const active = filters.maxPrice === p;
            const label =
              p === 0
                ? t("cafes.priceAll")
                : t(p === 2 ? "cafes.priceMid" : "cafes.priceBudget");
            return (
              <button
                key={p}
                type="button"
                onClick={() => patch({ maxPrice: p })}
                aria-pressed={active}
                className={active ? chipOn : chipOff}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className={sectionTitle}>{t("cafes.statusLabel")}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => patch({ openNow: !filters.openNow })}
            aria-pressed={filters.openNow}
            className={
              filters.openNow
                ? `${chipBase} border-emerald-700 bg-emerald-700 text-white`
                : chipOff
            }
          >
            🟢 {t("cafes.openNow")}
          </button>
          <button
            type="button"
            onClick={() => patch({ transitionZone: !filters.transitionZone })}
            aria-pressed={filters.transitionZone}
            className={filters.transitionZone ? chipOn : chipOff}
          >
            🛣️ {t("cafes.zone")}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="mt-5 border-t border-[#eee3d2] pt-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-4 py-2 text-sm font-medium text-coffee underline-offset-2 hover:underline"
          >
            ✕ {t("cafes.reset")}
          </button>
        </div>
      )}
      <button className="feature-button mt-4 w-full" onClick={onClose}>{lang==="th"?"ดูผลลัพธ์":"Show results"}</button>
    </div></div>, document.body
  );
}
