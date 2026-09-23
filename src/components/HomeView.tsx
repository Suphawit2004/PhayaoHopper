"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import { cafeTagMeta, TAG_META, TAG_ORDER, AREA_META } from "@/data/cafes";
import CafeSearch from "./CafeSearch";
import CafeThumb from "./CafeThumb";
import FavoriteButton from "./FavoriteButton";
import OpenBadge from "./OpenBadge";
import MapBlock from "./map/MapBlock";
import styles from "./HomeView.module.css";

export default function HomeView() {
  const cafes = useCatalog();
  const { t, tr, lang } = useLang();
  const featured = [...cafes].sort((a, b) => b.baseRating - a.baseRating).slice(0, 4);
  const slideTrack = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  function showSlide(index: number) {
    const track = slideTrack.current;
    if (!track || !featured.length) return;
    const next = (index + featured.length) % featured.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}><span aria-hidden="true" />{t("home.badge")}</p>
        <h1>{t("home.heroTitle1")}<span>{t("home.heroTitle2")}</span></h1>
        <p>{t("home.heroDesc")}</p>
        <div className={styles.search}><CafeSearch /></div>
        <div className={styles.heroLinks}>
          <Link className={styles.primaryLink} href="/cafes">{t("home.ctaExplore")}</Link>
          <Link className={styles.secondaryLink} href="/map">{t("home.ctaMap")}</Link>
        </div>
      </div>
      {!!featured.length && <div className={styles.slider} role="region" aria-roledescription="carousel" aria-label={t("home.featured")}>
        <div className={styles.slideTrack} ref={slideTrack} onScroll={e => {
          const track = e.currentTarget;
          setActiveSlide(Math.min(featured.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
        }}>
          {featured.map((cafe, index) => <figure className={styles.lead} key={cafe.slug} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${featured.length}`}>
            <Link href={`/cafes/${cafe.slug}`} className={styles.leadImage} aria-label={tr(cafe.name)}><CafeThumb preload={index === 0} cafe={cafe} sizes="(max-width: 760px) 100vw, 55vw" /></Link>
            <figcaption>
              <span className={styles.slideEyebrow}>{lang === "th" ? "ร้านแนะนำ" : "FEATURED CAFE"}</span>
              <Link href={`/cafes/${cafe.slug}`}>{tr(cafe.name)}</Link>
              <span>{cafe.openTime} - {cafe.closeTime}</span>
            </figcaption>
          </figure>)}
        </div>
        {featured.length > 1 && <div className={styles.slideControls}>
          <button type="button" onClick={() => showSlide(activeSlide - 1)} aria-label={lang === "th" ? "ร้านก่อนหน้า" : "Previous cafe"}>←</button>
          <div className={styles.slideDots}>{featured.map((cafe, index) => <button key={cafe.slug} type="button" aria-label={`${lang === "th" ? "ดูร้าน" : "Show"} ${tr(cafe.name)}`} aria-pressed={index === activeSlide} onClick={() => showSlide(index)}><span /></button>)}</div>
          <span className={styles.slideCount} aria-live="polite">{activeSlide + 1} / {featured.length}</span>
          <button type="button" onClick={() => showSlide(activeSlide + 1)} aria-label={lang === "th" ? "ร้านถัดไป" : "Next cafe"}>→</button>
        </div>}
      </div>}
    </section>
    <section className={styles.browse}>
      <header><div><h2>{t("home.categories")}</h2><p>{t("home.categoriesDesc")}</p></div><Link className={styles.categoryAll} href="/cafes">{t("home.viewAll")}</Link></header>
      <div className={styles.categories}>{TAG_ORDER.map((tag, index) => <Link key={tag} href={`/cafes?tag=${tag}`}><span className={styles.categoryIndex}>0{index + 1}</span><strong>{tr(TAG_META[tag].label)}</strong><span className={styles.categoryCount}>{cafes.filter(c => c.tags.includes(tag)).length} {t("home.cafesInTag")}</span><span className={styles.categoryArrow} aria-hidden="true">↗</span></Link>)}</div>
      <p className={styles.catalogNote}>{cafes.length} {t("home.stat1")} · {TAG_ORDER.length} {t("home.stat2")} · {t("home.stat3")}</p>
    </section>
    <section className={styles.recommendations}>
      <header className={styles.sectionHeading}><h2>{t("home.featured")}</h2><p>{lang === "th" ? "เรียงตามคะแนนตั้งต้นของร้าน ข้อมูลคะแนนแยกจากรีวิวผู้ใช้" : "Sorted by reference rating, separately from visitor reviews"}</p></header>
      <div className={styles.stories}>{featured.slice(1).map(cafe => <article key={cafe.slug} className={styles.story}>
        <Link href={`/cafes/${cafe.slug}`} className={styles.storyImage} aria-label={tr(cafe.name)}><CafeThumb cafe={cafe} sizes="(max-width: 760px) 100vw, 45vw" /></Link>
        <div className={styles.storyBody}>
          <div className={styles.storyTitle}><h3><Link href={`/cafes/${cafe.slug}`}>{tr(cafe.name)}</Link></h3><FavoriteButton slug={cafe.slug} variant="inline" /></div>
          <p className={styles.details}>{cafe.openTime} - {cafe.closeTime}<span>{t(cafe.priceRange === 1 ? "cafes.priceBudget" : "cafes.priceMid")}</span></p>
          <div className={styles.details}><OpenBadge cafe={cafe} /><span>{tr(AREA_META[cafe.area].label)}</span></div>
          <p className={styles.description}>{tr(cafe.description)}</p>
          <p className={styles.rating}>{cafe.baseRating.toFixed(1)} / 5 {lang === "th" ? "คะแนนตั้งต้น" : "Reference rating"}</p>
          <div className={styles.tags}>{cafe.tags.map(tag => {const meta=cafeTagMeta(tag);return tag in TAG_META ? <Link key={tag} href={`/cafes?tag=${tag}`}>{tr(meta.label)}</Link> : <span key={tag}>{tr(meta.label)}</span>;})}</div>
        </div>
      </article>)}</div>
      <Link href="/cafes" className={styles.allCafes}>{t("home.viewAll")}</Link>
    </section>
    <section className={styles.mapSection}>
      <div><h2>{t("home.mapPreview")}</h2><p>{t("home.mapPreviewDesc")}</p><Link href="/map" className="feature-button">{t("home.openMap")}</Link></div>
      <MapBlock cafes={cafes} className={styles.map} />
    </section>
  </div>;
}
