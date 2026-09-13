"use client";
import Link from "next/link";
import { AREA_META, AREA_ORDER, type CafeArea } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import { filtersToQuery } from "@/lib/filters-url";
import { useSearch } from "./SearchProvider";
import FilterBar from "./FilterBar";
export default function ExplorerControls({ count, map = false }: { count: number; map?: boolean }) {
  const { t, tr, lang } = useLang(); const { filters, patch } = useSearch();
  const query = filtersToQuery(filters);
  return <div className="explorer-controls">
    <label className="search-visible"><span>{lang === "th" ? "ค้นหาร้าน" : "Find a cafe"}</span><input type="search" value={filters.query} onChange={e => patch({query:e.target.value})} placeholder={t("cafes.searchPlaceholder")} /></label>
    <div className="quick-filters"><button aria-pressed={filters.openNow} className={filters.openNow ? "feature-button" : "ui-secondary"} onClick={() => patch({openNow:!filters.openNow})}>{t("cafes.openNow")}</button>
      <label>{t("cafes.areaLabel")}<select value={filters.area ?? ""} onChange={e => patch({area:e.target.value as CafeArea || null})}><option value="">{t("cafes.areaAll")}</option>{AREA_ORDER.map(a => <option key={a} value={a}>{tr(AREA_META[a].label)}</option>)}</select></label>
      <label>{t("cafes.priceLabel")}<select value={filters.maxPrice} onChange={e => patch({maxPrice:Number(e.target.value) as 0|1|2})}><option value="0">{t("cafes.priceAll")}</option><option value="1">{t("cafes.priceBudget")}</option><option value="2">{t("cafes.priceMid")}</option></select></label>
    </div>
    <FilterBar />
    <div className="results-toolbar"><p role="status">{t("cafes.found").replaceAll("{n}",String(count))}</p><label>{lang === "th" ? "เรียงตาม" : "Sort by"}<select value={filters.sort ?? "relevance"} onChange={e => patch({sort:e.target.value as "relevance"|"name"|"rating"})}><option value="relevance">{lang === "th" ? "เกี่ยวข้องที่สุด" : "Relevance"}</option><option value="rating">{lang === "th" ? "คะแนนตั้งต้นสูง" : "Reference rating"}</option><option value="name">{lang === "th" ? "ชื่อร้าน" : "Name"}</option></select></label>
      <nav aria-label={lang === "th" ? "รูปแบบผลลัพธ์" : "Results view"}><Link aria-current={!map ? "page" : undefined} href={`/cafes?${query}`}>{lang === "th" ? "รายการ" : "List"}</Link><Link aria-current={map ? "page" : undefined} href={`/map?${query}`}>{t("nav.map")}</Link></nav>
    </div>
  </div>;
}
