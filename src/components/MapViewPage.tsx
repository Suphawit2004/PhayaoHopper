"use client";
import { useMemo, useState } from "react";
import Link from "./ResultLink";
import RestoreResults from "./RestoreResults";
import { useCatalog } from "./CatalogProvider";
import { useSearch } from "./SearchProvider";
import { useNowTick } from "./OpenBadge";
import { filterCafes } from "@/lib/filter-cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import MapBlock from "./map/MapBlock";
import ExplorerControls from "./ExplorerControls";
export default function MapViewPage() {
  const cafes = useCatalog(); const { filters } = useSearch(); const { t, tr, lang } = useLang(); const now = useNowTick();
  const [selected, setSelected] = useState<string | null>(null);
  const [bounds,setBounds] = useState<[number,number,number,number] | null>(null);
  const matching = useMemo(() => filterCafes(cafes, filters, new Date(now), lang), [cafes, filters, now, lang]);
  const results = bounds ? matching.filter(c=>c.lat>=bounds[0] && c.lng>=bounds[1] && c.lat<=bounds[2] && c.lng<=bounds[3]) : matching;
  const active = results.some(c => c.slug === selected) ? selected : null;
  const chosen = results.find(c => c.slug === active) ?? results[0];
  return <div className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-bold">{t("map.title")}</h1><p>{t("map.subtitle")}</p>
    <RestoreResults ready={now > 0} /><ExplorerControls count={results.length} map />
    {bounds && <button className="ui-secondary mb-4" onClick={()=>setBounds(null)}>{lang==="th"?"แสดงทุกพื้นที่ที่ตรงตัวกรอง":"Show all matching areas"}</button>}
    <div className="map-results"><div className="map-list">{results.map(c => <article key={c.slug} className={active === c.slug ? "is-selected" : ""}>
      <button aria-pressed={active === c.slug} onClick={() => setSelected(c.slug)} className="map-select"><span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg"><CafeThumb cafe={c} sizes="96px" /></span><span><strong>{tr(c.name)}</strong><span className="block text-sm">{tr(c.address)}</span></span></button>
      <Link href={`/cafes/${c.slug}`} className="inline-block underline px-3 py-2">{t("detail.viewCafe")}</Link>
    </article>)}</div><MapBlock onSearchArea={setBounds} areaActive={!!bounds} cafes={results} selectedSlug={active} onSelect={setSelected} className="map-canvas" /></div>
    {chosen && <section className="mobile-selected-cafe" aria-label={lang === "th" ? "ร้านที่เลือก" : "Selected cafe"}>
      <label>{lang === "th" ? "เลือกร้านบนแผนที่" : "Select a cafe on the map"}<select value={chosen.slug} onChange={e=>setSelected(e.target.value)}>{results.map(c=><option key={c.slug} value={c.slug}>{tr(c.name)}</option>)}</select></label>
      <strong>{tr(chosen.name)}</strong><p className="text-sm my-2">{tr(chosen.address)}</p><Link href={`/cafes/${chosen.slug}`} className="feature-button">{t("detail.viewCafe")}</Link>
    </section>}
    {!results.length && <p role="status">{t("cafes.emptyHint")}</p>}
    <p className="mt-3">{lang === "th" ? "เลือกร้านจากรายการเพื่อเน้นหมุดบนแผนที่" : "Select a cafe in the list to focus its pin"}</p>
  </div>;
}
