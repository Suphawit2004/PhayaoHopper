"use client";
import Link from "next/link";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import { TAG_META, TAG_ORDER, AREA_META } from "@/data/cafes";
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
  const lead = featured[0];
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.intro}>
        <h1>{t("home.heroTitle1")}<span>{t("home.heroTitle2")}</span></h1>
        <p>{t("home.heroDesc")}</p>
        <div className={styles.search}><CafeSearch /></div>
        <div className={styles.heroLinks}><Link href="/cafes">{t("home.ctaExplore")}</Link><Link href="/map">{t("home.ctaMap")}</Link></div>
      </div>
      {lead && <figure className={styles.lead}>
        <Link href={`/cafes/${lead.slug}`} className={styles.leadImage} aria-label={tr(lead.name)}><CafeThumb preload cafe={lead} sizes="(max-width: 760px) 100vw, 55vw" /></Link>
        <figcaption><Link href={`/cafes/${lead.slug}`}>{tr(lead.name)}</Link><span>{lead.openTime} - {lead.closeTime}</span></figcaption>
      </figure>}
    </section>
    <section className={styles.browse}>
      <header><h2>{t("home.categories")}</h2><p>{t("home.categoriesDesc")}</p></header>
      <div className={styles.categories}>{TAG_ORDER.map(tag => <Link key={tag} href={`/cafes?tag=${tag}`}><strong>{tr(TAG_META[tag].label)}</strong><span>{cafes.filter(c => c.tags.includes(tag)).length} {t("home.cafesInTag")}</span></Link>)}</div>
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
          <div className={styles.tags}>{cafe.tags.map(tag => <Link key={tag} href={`/cafes?tag=${tag}`}>{tr(TAG_META[tag].label)}</Link>)}</div>
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
