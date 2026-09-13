"use client";
import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { useCatalog } from "./CatalogProvider";
import { useSearch } from "./SearchProvider";
import { filtersToQuery } from "@/lib/filters-url";
import { scoreCafe } from "@/lib/cafe-search";
import CafeThumb from "./CafeThumb";
export default function CafeSearch() {
  const { filters, patch } = useSearch(); const cafes = useCatalog(); const { t, tr, lang } = useLang(); const router = useRouter();
  const [open, setOpen] = useState(false), [index, setIndex] = useState(-1); const id = useId(); const input = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => !filters.query.trim() ? [] : cafes.map(cafe => ({cafe,score:scoreCafe(cafe,filters.query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.cafe),[cafes,filters.query]);
  const all = `/cafes?${filtersToQuery(filters)}`;
  return <div className="cafe-search" onBlur={e => {if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);}}>
    <form onSubmit={e => {e.preventDefault(); setOpen(false); router.push(index >= 0 && matches[index] ? `/cafes/${matches[index].slug}` : all);}}>
      <input ref={input} type="search" role="combobox" aria-expanded={open && !!filters.query.trim()} aria-controls={id} aria-autocomplete="list" aria-activedescendant={open && index >= 0 ? `${id}-${index}` : undefined} aria-label={t("cafes.searchPlaceholder")} placeholder={t("cafes.searchPlaceholder")} value={filters.query}
        onChange={e => {patch({query:e.target.value});setIndex(-1);setOpen(true);}} onFocus={()=>setOpen(true)}
        onKeyDown={e => {if(e.key==="Escape"){setOpen(false);setIndex(-1);} if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();setOpen(true);setIndex(n=>matches.length ? n<0 ? (e.key==="ArrowDown"?0:matches.length-1) : (n+(e.key==="ArrowDown"?1:-1)+matches.length)%matches.length : -1);}}} />
      <button type="submit" className="feature-button">{lang === "th" ? "ค้นหา" : "Search"}</button>
    </form>
    {open && filters.query.trim() && <div className="search-results"><ul id={id} role="listbox" aria-label={lang==="th"?"ร้านที่ตรงกับคำค้น":"Matching cafes"}>{matches.map((c,i)=><li key={c.slug} id={`${id}-${i}`} role="option" aria-selected={i===index}><Link tabIndex={-1} href={`/cafes/${c.slug}`} onClick={()=>setOpen(false)} className={i===index?"is-selected":""}><span className="relative w-12 h-12 shrink-0 overflow-hidden rounded-lg"><CafeThumb cafe={c} sizes="48px"/></span>{tr(c.name)}</Link></li>)}</ul>
      {!matches.length && <p className="p-4">{t("cafes.empty")}</p>}<Link className="block p-4 font-semibold underline" href={all} onClick={()=>setOpen(false)}>{lang==="th"?"ดูผลการค้นหาทั้งหมด":"View all search results"}</Link></div>}
  </div>;
}
