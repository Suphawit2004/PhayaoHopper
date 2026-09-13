"use client";
import Icon from "./Icon";
import { useCatalog } from "@/components/CatalogProvider";

import Link from "next/link";
import CafeSearch from "./CafeSearch";
import { TAG_META, TAG_ORDER } from "@/data/cafes";
import { useLang } from "@/i18n/LangProvider";
import CafeThumb from "./CafeThumb";
import CafeCard from "./CafeCard";
import MapBlock from "./map/MapBlock";

export default function HomeView() {
  const CAFES = useCatalog();
  const { t, tr, lang } = useLang();
  const featured = [...CAFES].sort((a, b) => b.baseRating - a.baseRating).slice(0, 4);

  return (
    <div>
      <section className="home-hero relative overflow-hidden text-cream">
        <div className="hero-inner mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="hero-copy"><span className="inline-flex items-center gap-1.5 rounded-full border border-cream/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
            📍 {t("home.badge")}
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            {t("home.heroTitle1")}
            <br />
            <span>{t("home.heroTitle2")}</span>
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-cream/80">{t("home.heroDesc")}</p>
          <div className="hero-search mt-6"><CafeSearch /><p className="mt-2 text-sm">{lang==="th"?"ลองค้นหา: ริมกว๊าน / อ่านหนังสือ / เปิดดึก":"Try: lakeside / study / open late"}</p></div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/cafes"
              className="rounded-full bg-latte px-7 py-3 text-sm font-bold text-espresso shadow-lg transition hover:brightness-105"
            >
              <Icon name="coffee" /> {t("home.ctaExplore")}
            </Link>
            <Link
              href="/map"
              className="rounded-full border border-cream/40 px-7 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              <Icon name="map" /> {t("home.ctaMap")}
            </Link>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            {[
              [String(CAFES.length), t("home.stat1")],
              [String(TAG_ORDER.length), t("home.stat2")],
              ["฿0", t("home.stat3")],
            ].map(([num, label]) => (
              <div key={label}>
                <dt className="text-2xl font-bold text-[#dcc09a]">{num}</dt>
                <dd className="text-cream/70">{label}</dd>
              </div>
            ))}
          </dl></div>
          {featured[0] && <Link href={`/cafes/${featured[0].slug}`} className="hero-photo">
            <CafeThumb preload cafe={featured[0]} sizes="(max-width: 800px) 100vw, 45vw" />
            <div><span>{t("home.featured")}</span><strong>{tr(featured[0].name)}</strong><span>{featured[0].openTime} – {featured[0].closeTime}</span></div>
          </Link>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-espresso">✨ {t("home.featured")}</h2>
            <p className="mt-1 text-sm text-espresso/70">{lang==="th"?"เรียงตามคะแนนตั้งต้นของร้าน ข้อมูลคะแนนแยกจากรีวิวผู้ใช้":"Sorted by reference rating, separately from visitor reviews"}</p>
          </div>
          <Link href="/cafes" className="text-sm font-bold text-coffee underline-offset-4 hover:underline">
            {t("home.viewAll")} →
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(1).map((cafe) => (
            <CafeCard key={cafe.slug} cafe={cafe} />
          ))}
        </div>
      </section>

      <section className="bg-sand/50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-espresso">{t("home.categories")}</h2>
          <p className="mt-1 text-sm text-espresso/60">{t("home.categoriesDesc")}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {TAG_ORDER.map((tag) => (
              <Link
                key={tag}
                href={`/cafes?tag=${tag}`}
                className="rounded-2xl border border-[#e8dcc8] bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-latte hover:shadow-md"
              >
                <span className="block text-4xl" aria-hidden>
                  {TAG_META[tag].emoji}
                </span>
                <span className="mt-2 block font-semibold text-espresso">{tr(TAG_META[tag].label)}</span>
                <span className="mt-0.5 block text-xs text-espresso/70">
                  {CAFES.filter((c) => c.tags.includes(tag)).length} {t("home.cafesInTag")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-espresso">🗺️ {t("home.mapPreview")}</h2>
            <p className="mt-1 text-sm text-espresso/70">{t("home.mapPreviewDesc")}</p>
          </div>
          <Link href="/map" className="rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]">
            {t("home.openMap")}
          </Link>
        </div>
        <MapBlock cafes={CAFES} className="mt-6 h-64 md:h-[420px]" />
      </section>
    </div>
  );
}
