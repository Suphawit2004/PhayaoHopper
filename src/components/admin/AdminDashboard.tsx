"use client";
import { useState } from "react";
import {useUi} from "@/i18n/UiText";
import { useCatalog } from "@/components/CatalogProvider";

import { useSearchParams, useRouter } from "next/navigation";
import SuggestionPreview from "./SuggestionPreview";
import AdminMutation from "./AdminMutation";
import styles from "./AdminDashboard.module.css";
import { isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";
import TimeInput from "@/components/TimeInput";
import CafeCoordinatePicker from "@/components/CafeCoordinatePicker";
import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import CafeEditorView from "@/components/CafeEditorView";
import type { Cafe } from "@/data/cafes";
import type { EditableMenu } from "@/components/MenuManager";

import { useLang } from "@/i18n/LangProvider";
import type { DictKey } from "@/i18n/dictionaries";
import {
  deleteReviewFormAction,
  reportFormAction,
  suggestionFormAction,
  saveSuggestionDetails,
} from "@/app/actions/admin";

export interface AdminSuggestion {
  publishedSlug?: string | null;
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  openTime: string | null;
  closeTime: string | null;
  priceRange: number | null;
  note: string | null;
  photoUrl: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  cafeSlug: string;
  field: string;
  message: string;
  suggestedValue: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  cafe_slug: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

type Mode = "ready" | "login" | "forbidden" | "not-configured";
type SystemStatus = {
  level: "ready" | "partial" | "failed";
  issues: Array<"catalog" | "members" | "workQueue" | "currentView">;
  checkedAt: string;
};

const REPORT_FIELD_KEY: Record<string, string> = {
  hours: "report.field.hours",
  phone: "report.field.phone",
  address: "report.field.address",
  location: "report.field.location",
  closed_days: "report.field.closedDays",
  other: "report.field.other",
};

function StatusBadge({ status, tk }: { status: string; tk: (k: string) => string }) {
  const tone =
    status === "pending"
      ? "bg-amber-100 text-amber-800"
      : status === "approved" || status === "resolved"
        ? "bg-emerald-100 text-emerald-800"
        : "bg-stone-200 text-stone-600";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {tk(`admin.status.${status}`)}
    </span>
  );
}

export default function AdminDashboard({
  mode,
  suggestions = [],
  reports = [],
  reviews = [],
  queueCounts = { suggestions: null, reports: null, reviews: null },
  itemCounts = { reports: null, reviews: null },
  loadError = false,
  overview,
  cafeLinks = [],
  selectedCafe,
  pageInfo,
  partialError = false,
  systemStatus,
}: {
  mode: Mode;
  systemStatus?: SystemStatus;
  queueCounts?: { suggestions: number | null; reports: number | null; reviews: number | null };
  itemCounts?: { reports: number | null; reviews: number | null };
  loadError?: boolean;
  suggestions?: AdminSuggestion[];
  reports?: AdminReport[];
  reviews?: AdminReview[];
  overview?: { publishedCafes: number | null; totalCafes: number | null; members: number | null; pendingRequests: number | null };
  cafeLinks?: { slug: string; nameTh: string; nameEn: string }[];
  selectedCafe?: { cafe: Cafe; isActive: boolean; menu: EditableMenu[]; menuError: boolean; ownerId: string };
  pageInfo?: { page: number; totalPages: number };
  partialError?: boolean;
}) {
  const ui=useUi();
  const CAFES = useCatalog();
  const { t, tr, lang } = useLang();
  const tk = (k: string) => t(k as DictKey);
  const params = useSearchParams(); const router = useRouter();
  const rawTab = params.get("tab"); const tab = rawTab==="reports" || rawTab==="reviews" || rawTab==="cafes" ? rawTab : "suggestions";
  const requestedCafe = params.get("cafe");
  const pendingOnly = params.get("filter") === "pending" || (params.get("filter") !== "all" && tab === "suggestions");
  const [cafeSearch, setCafeSearch] = useState("");
  const changeView = (nextTab:string, pending:boolean) => router.replace(nextTab === "cafes" ? "/admin?tab=cafes" : `/admin?page=0&tab=${nextTab}&filter=${pending?"pending":"all"}`,{scroll:false});
  const copy = lang === "th" ? {
    back: ui("กลับไปหน้าเว็บไซต์"), workspace: ui("จัดการข้อมูลคาเฟ่"), loaded: ui("รายการที่โหลดมา"),
    queue: ui("รอตรวจสอบ"), recent: ui("รีวิวล่าสุด"), all: ui("รายการทั้งหมด"), pending: ui("แสดงเฉพาะที่รอตรวจสอบ"),
    manage: ui("เลือกหมวดที่ต้องการจัดการ"), done: ui("ไม่มีรายการรอตรวจสอบในหมวดนี้"),
    adminLabel: ui("พื้นที่ผู้ดูแลระบบ"), overview: ui("ภาพรวมระบบ"), overviewHint: ui("สถานะข้อมูลสำคัญของแพลตฟอร์ม"),
    published: ui("ร้านที่เผยแพร่ / ร้านทั้งหมด"), members: ui("สมาชิกทั้งหมด"), requests: ui("คำขอรอดำเนินการทั้งหมด"),
    cafes: ui("จัดการข้อมูลและรูปภาพร้าน"), cafesHint: "เลือกร้านเพื่อแก้ไขข้อมูลและรูปภาพ", cafeSearch: "ค้นหาชื่อร้านหรือรหัสร้าน", cafeEmpty: "ไม่พบร้านที่ตรงกับคำค้นหา", cafeOpen: "เปิดหน้าจัดการร้าน",
    page: ui("หน้า"), perPage: ui("สูงสุด 50 รายการต่อหน้า"),
    previous: ui("หน้าก่อน"), next: ui("หน้าถัดไป"), partialError: ui("ข้อมูลภาพรวมบางส่วนโหลดไม่สำเร็จ กรุณาโหลดหน้าใหม่"),
    suggestions: ui("ตรวจสอบข้อมูลร้าน ก่อนอนุมัติหรือส่งกลับ"), reports: ui("ตรวจสอบคำขอแก้ไขข้อมูลจากผู้ใช้"),
    reviews: ui("ดูความคิดเห็นและจัดการรีวิวที่ไม่เหมาะสม"),
  } : {
    back: "Back to website", workspace: "Cafe management", loaded: "Loaded records",
    queue: "Awaiting review", recent: "Latest reviews", all: "All records", pending: "Show pending only",
    manage: "Choose a section to manage", done: "No pending items in this section",
    adminLabel: "Administrator workspace", overview: "System overview", overviewHint: "Key platform operations at a glance",
    published: "Published cafes / total cafes", members: "Total members", requests: "Requests awaiting action",
    cafes: "Manage cafe details and photos", cafesHint: "Choose a cafe to edit its details and photos", cafeSearch: "Search cafe name or slug", cafeEmpty: "No cafe matches your search", cafeOpen: "Open cafe editor",
    page: "Page", perPage: "Up to 50 items per page",
    previous: "Previous page", next: "Next page", partialError: "Some overview data could not be loaded. Refresh the page.",
    suggestions: "Review cafe details before approving or rejecting", reports: "Check corrections submitted by visitors",
    reviews: "Read feedback and moderate inappropriate reviews",
  };

  if (mode !== "ready") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-sand text-coffee" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4.5" y="10" width="15" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" />
          </svg>
        </span>
        <h1 className="mt-4 text-xl font-bold">{tk(`admin.gate.${mode}`)}</h1>
        {(mode === "login" || mode === "not-configured") && (
          <a
            href="/login?next=/admin"
            className="mt-6 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
          >
            {t("nav.login")}
          </a>
        )}
        {mode === "forbidden" && (
          <p className="mt-3 text-sm text-espresso/60">{t("admin.gate.forbiddenHint")}</p>
        )}
      </div>
    );
  }

  const cafeName = (slug: string) => {
    const cafe = CAFES.find((c) => c.slug === slug);
    return cafe ? tr(cafe.name) : slug;
  };

  // Pin the timezone so SSR and client hydration render identical strings.
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });

  const pendingSuggestions = queueCounts.suggestions;

  const tabs = [
    { key: "suggestions" as const, label: t("admin.tab.suggestions"), badge: pendingSuggestions },
    { key: "reports" as const, label: t("admin.tab.reports"), badge: itemCounts.reports },
    { key: "reviews" as const, label: t("admin.tab.reviews"), badge: itemCounts.reviews },
    { key: "cafes" as const, label: copy.cafes, badge: overview?.totalCafes ?? null },
  ];
  const searchTerm = cafeSearch.trim().toLocaleLowerCase();
  const visibleCafes = searchTerm
    ? cafeLinks.filter(cafe => `${cafe.nameTh} ${cafe.nameEn} ${cafe.slug}`.toLocaleLowerCase().includes(searchTerm))
    : cafeLinks;
  const statusCopy = lang === "th" ? {
    heading: "สถานะข้อมูลบนเว็บ", ready: "พร้อมใช้งาน", partial: "ข้อมูลบางส่วนมีปัญหา", failed: "โหลดข้อมูลไม่สำเร็จ",
    checked: "ตรวจล่าสุด", retry: "ตรวจอีกครั้ง", issues: "ส่วนที่มีปัญหา",
    catalog: "ข้อมูลร้าน", members: "ข้อมูลสมาชิก", workQueue: "คิวงาน", currentView: "รายการที่กำลังดู",
    note: "แสดงผลจากข้อมูลที่ dashboard โหลดครั้งนี้",
  } : {
    heading: "Website data status", ready: "Available", partial: "Some data is unavailable", failed: "Data could not be loaded",
    checked: "Last checked", retry: "Check again", issues: "Affected areas",
    catalog: "Cafe data", members: "Member data", workQueue: "Work queue", currentView: "Current view",
    note: "Based on data loaded by this dashboard",
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>{copy.adminLabel}</span>
          <h1>{t("admin.title")}</h1>
          <p>{t("admin.desc")}</p>
        </div>
        <Link href="/" className={styles.backLink}>{copy.back} <span aria-hidden>↗</span></Link>
      </header>
      {systemStatus && <section className={styles.systemStatus} data-level={systemStatus.level} aria-label={statusCopy.heading}>
        <span className={styles.statusIcon} aria-hidden="true">
          {systemStatus.level === "ready"
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 7v6m0 4h.01" /><circle cx="12" cy="12" r="9" /></svg>}
        </span>
        <div className={styles.statusBody}>
          <span className={styles.statusHeading}>{statusCopy.heading}</span>
          <strong role="status">{statusCopy[systemStatus.level]}</strong>
          {systemStatus.issues.length > 0 && <p>{statusCopy.issues}: {systemStatus.issues.map(issue => statusCopy[issue]).join(" · ")}</p>}
          <small>{statusCopy.note}</small>
        </div>
        <div className={styles.statusActions}>
          <span>{statusCopy.checked} <time dateTime={systemStatus.checkedAt}>{fmt(systemStatus.checkedAt)}</time></span>
          <button type="button" onClick={() => router.refresh()}>{statusCopy.retry}</button>
        </div>
      </section>}
      {overview && <section className={styles.overview} aria-label={copy.overview}>
        <div className={styles.sectionHeading}>
          <h2>{copy.overview}</h2>
          <p>{copy.overviewHint}</p>
        </div>
        <div className={styles.summary}>
          <article className={styles.metric}>
            <span>{copy.published}</span>
            <strong>{overview.publishedCafes == null || overview.totalCafes == null ? "—" : `${overview.publishedCafes} / ${overview.totalCafes}`}</strong>
            <small>{lang === "th" ? "สถานะรายการคาเฟ่ในระบบ" : "Current cafe catalog"}</small>
          </article>
          <article className={styles.metric}>
            <span>{copy.members}</span>
            <strong>{overview.members ?? "—"}</strong>
            <small>{lang === "th" ? "บัญชีผู้ใช้ที่ลงทะเบียน" : "Registered user accounts"}</small>
          </article>
          <article className={`${styles.metric} ${styles.metricAccent}`}>
            <span>{copy.requests}</span>
            <strong>{overview.pendingRequests ?? "—"}</strong>
            <small>{lang === "th" ? "ร้านใหม่และรายงานข้อมูล" : "New cafes and data reports"}</small>
          </article>
        </div>
      </section>}
      <div id="admin-workspace" className={styles.workspace}>
        <aside className={styles.sidebar}>
          <span className={styles.sidebarEyebrow}>{lang === "th" ? "พื้นที่ทำงาน" : "WORKSPACE"}</span>
          <h2>{lang === "th" ? "งานที่ควรจัดการ" : "Work to review"}</h2>
          <p>{copy.manage}</p>
          <nav aria-label={t("admin.title")} className={styles.navigation}>
            {tabs.map(({ key, label, badge }) => (
              <button key={key} type="button" aria-pressed={tab === key}
                onClick={() => { changeView(key,key === "suggestions"); }}
                className={`${key === "cafes" ? styles.manageTab : ""} ${tab === key ? styles.active : ""}`}>
                <span>{label}</span><span className={styles.count}>{badge ?? "—"}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div><h2>{tabs.find((item) => item.key === tab)?.label}</h2><p>{tab === "cafes" ? copy.cafesHint : copy[tab]}</p></div>
            {tab === "cafes" ? (selectedCafe ? null : <label className={styles.cafeSearch}>
              <span className="sr-only">{copy.cafeSearch}</span>
              <input type="search" value={cafeSearch} onChange={event => setCafeSearch(event.target.value)} placeholder={copy.cafeSearch} />
            </label>) : <label className={styles.filter}>
              <input type="checkbox" checked={pendingOnly} onChange={(e) => changeView(tab,e.target.checked)} />
              {tab === "reviews" ? (lang === "th" ? "เฉพาะคะแนน 1–2 ดาว" : "Only 1–2 star reviews") : copy.pending}
            </label>}
          </div>
      {loadError && <p role="alert" className="status-message" data-error="true">{lang === "th" ? "โหลดรายการไม่สำเร็จ กรุณาลองใหม่" : "Could not load records. Please retry."} <button className="ui-secondary" onClick={() => router.refresh()}>{lang === "th" ? "ลองใหม่" : "Retry"}</button></p>}
      {!loadError && tab === "suggestions" && (
        <section className={styles.list}>
          {suggestions.filter((s) => !pendingOnly || s.status === "pending").length === 0 && <EmptyRow label={pendingOnly ? copy.done : t("admin.empty.suggestions")} />}
          {suggestions.filter((s) => !pendingOnly || s.status === "pending").map((s) => (
            <article
              key={s.id}
              className={styles.card}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{s.name}</h3>
                <StatusBadge status={s.status} tk={tk} />
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {s.address && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.field.address")}: </dt>
                    <dd className="inline">{s.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("detail.hours")}: </dt>
                  <dd className="inline">
                    {s.openTime ?? "--:--"} – {s.closeTime ?? "--:--"}
                  </dd>
                </div>
                {s.priceRange != null && (
                  <div>
                    <dt className="inline text-espresso/50">{t("cafes.priceLabel")}: </dt>
                    <dd className="inline">
                      {s.priceRange === 1 ? t("cafes.priceBudget") : t("cafes.priceMid")}
                    </dd>
                  </div>
                )}
                {s.contact && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.contact")}: </dt>
                    <dd className="inline">{s.contact}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("admin.suggest.location")}: </dt>
                  <dd className="inline">
                    <a
                      className="text-coffee underline underline-offset-2 hover:text-espresso"
                      href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.lat.toFixed(5)}, {s.lng.toFixed(5)} ↗
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="inline text-espresso/50">{t("admin.sentAt")}: </dt>
                  <dd className="inline">{fmt(s.createdAt)}</dd>
                </div>
              </dl>

              {s.note && <p className={`${styles.message} mt-3`}>{s.note}</p>}
              {s.photoUrl && (
                <a
                  href={s.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-coffee underline underline-offset-2 hover:text-espresso"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.photoUrl} alt={s.name} className="max-h-48 max-w-full rounded-xl object-contain" />
                  {t("admin.suggest.photo")}
                </a>
              )}

              {s.status !== "approved" && <p className="mt-3 text-sm">{lang==="th"?ui("ข้อมูลที่ยังขาด: "):"Missing information: "}{[!s.address&&(lang==="th"?ui("ที่อยู่"):"Address"),!s.openTime&&(lang==="th"?ui("เวลาเปิด"):"Opening time"),!s.closeTime&&(lang==="th"?ui("เวลาปิด"):"Closing time")].filter(Boolean).join(", ") || (lang==="th"?ui("ข้อมูลหลักครบแล้ว"):"Core details complete")}</p>}
              {s.status !== "approved" && !isSupportedCafeCoordinate(s.lat, s.lng) && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{lang === "th" ? "พิกัดอยู่นอกพื้นที่ที่ระบบรองรับ กรุณาตรวจตำแหน่งจริงและแก้พิกัดก่อนอนุมัติ" : "Coordinates are outside the supported area. Verify the actual location and correct them before approval."}</p>}
              {s.status !== "approved" && <details className="mt-4 rounded-xl border border-[#eadfcd] p-4"><summary className="cursor-pointer text-sm font-semibold">{ui("ตรวจและเติมข้อมูลก่อนเผยแพร่")}</summary><div className="mt-4"><ActionForm action={saveSuggestionDetails}>
                <input type="hidden" name="id" value={s.id} />
                <label>{ui("ชื่อร้าน")}<input name="name" defaultValue={s.name} maxLength={120} required /></label>
                <label>{ui("ที่อยู่")}<input name="address" defaultValue={s.address ?? ""} maxLength={300} required /></label>
                <div className="feature-grid"><TimeInput label={ui("เวลาเปิด")} name="openTime" defaultValue={s.openTime ?? ""} required chooseLabel={lang === "th" ? "เลือก" : "Select"} /><TimeInput label={ui("เวลาปิด")} name="closeTime" defaultValue={s.closeTime ?? ""} required chooseLabel={lang === "th" ? "เลือก" : "Select"} /></div>
                <CafeCoordinatePicker key={`${s.id}-${s.lat}-${s.lng}`} initialLat={s.lat} initialLng={s.lng} />
              </ActionForm></div></details>}
              <div className={styles.actions}>
                {s.status !== "approved" && (
                  <SuggestionPreview key={JSON.stringify(s)} suggestion={s} />
                )}
                {s.status !== "rejected" && s.status !== "approved" && (
                  <AdminMutation action={suggestionFormAction} label={t("admin.reject")}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="rejected" />
                    
                  </AdminMutation>
                )}
                {(s.status === "rejected" || (s.status === "approved" && s.publishedSlug === null)) && (
                  <AdminMutation action={suggestionFormAction} label={t("admin.reopen")}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="pending" />
                    
                  </AdminMutation>
                )}
                
              </div>
              {s.status === "approved" && s.publishedSlug === null && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{ui("รายการนี้เคยอนุมัติในระบบเดิม แต่ยังไม่มีหน้าร้าน กดส่งกลับเพื่อตรวจสอบข้อมูลและอนุมัติให้เผยแพร่ได้")}</p>}
              {s.publishedSlug && <Link className="mt-3 inline-block text-sm underline" href={`/owner/${s.publishedSlug}`}>{ui("จัดการร้านที่เผยแพร่ →")}</Link>}
            </article>
          ))}
        </section>
      )}

      {!loadError && tab === "reports" && (
        <section className={styles.list}>
          {reports.filter((r) => !pendingOnly || r.status === "pending").length === 0 && <EmptyRow label={pendingOnly ? copy.done : t("admin.empty.reports")} />}
          {reports.filter((r) => !pendingOnly || r.status === "pending").map((r) => (
            <article
              key={r.id}
              className={styles.card}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  <a href={`/owner/${r.cafeSlug}`} className="hover:text-coffee hover:underline">
                    {cafeName(r.cafeSlug)} ↗
                  </a>
                </h3>
                <StatusBadge status={r.status} tk={tk} />
              </div>

              <p className="mt-2 text-sm">
                <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                  {REPORT_FIELD_KEY[r.field] ? tk(REPORT_FIELD_KEY[r.field]) : r.field}
                </span>
              </p>
              <p className={`${styles.message} mt-2`}>{r.message}</p>

              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {r.suggestedValue && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.suggested")}: </dt>
                    <dd className="inline">{r.suggestedValue}</dd>
                  </div>
                )}
                {r.contact && (
                  <div>
                    <dt className="inline text-espresso/50">{t("report.contact")}: </dt>
                    <dd className="inline">{r.contact}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-espresso/50">{t("admin.sentAt")}: </dt>
                  <dd className="inline">{fmt(r.createdAt)}</dd>
                </div>
              </dl>

              {r.status === "pending" ? (
                <div className={styles.actions}>
                  <AdminMutation action={reportFormAction} label={t("admin.resolve")}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="resolved" />
                    
                  </AdminMutation>
                  <AdminMutation action={reportFormAction} label={t("admin.dismiss")}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    
                  </AdminMutation>
                  
                </div>
              ) : (
                <p className="mt-4 text-xs text-espresso/40">{fmt(r.createdAt)}</p>
              )}
            </article>
          ))}
        </section>
      )}

      {!loadError && tab === "reviews" && (
        <section className={styles.list}>
          {reviews.length === 0 && <EmptyRow label={t("admin.empty.reviews")} />}
          {reviews.map((rv) => (
            <article
              key={rv.id}
              className={styles.card}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  <a href={`/cafes/${rv.cafe_slug}`} className="hover:text-coffee hover:underline">
                    {cafeName(rv.cafe_slug)} ↗
                  </a>
                </h3>
                <span className="text-sm text-amber-500" aria-label={`${rv.rating}/5`}>
                  {"★".repeat(rv.rating)}
                  <span className="text-espresso/20">{"★".repeat(5 - rv.rating)}</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-espresso/50">
                {t("admin.review.by").replace("{name}", rv.author_name)} · {fmt(rv.created_at)}
              </p>
              {rv.comment && <p className={`${styles.message} mt-2`}>{rv.comment}</p>}
              <AdminMutation action={deleteReviewFormAction} label={t("admin.delete")} confirm={t("admin.confirmDeleteReview")}>
                <input type="hidden" name="id" value={rv.id} />
                
                
              </AdminMutation>
            </article>
          ))}
        </section>
      )}
      {!loadError && tab === "cafes" && selectedCafe && <div className={styles.embeddedEditor}>
        <CafeEditorView cafe={selectedCafe.cafe} admin isActive={selectedCafe.isActive} menu={selectedCafe.menu} error={selectedCafe.menuError} ownerId={selectedCafe.ownerId} embedded />
      </div>}
      {!loadError && tab === "cafes" && !selectedCafe && <section className={styles.cafeList} aria-label={copy.cafes}>
        {requestedCafe && <p role="alert" className={styles.partialError}>{lang === "th" ? "ไม่พบร้านที่เลือก กรุณาเลือกร้านจากรายการ" : "Cafe not found. Please choose one from the list."}</p>}
        <p className={styles.cafeCount}>{lang === "th" ? `แสดง ${visibleCafes.length} จาก ${cafeLinks.length} ร้าน` : `Showing ${visibleCafes.length} of ${cafeLinks.length} cafes`}</p>
        {visibleCafes.length === 0 ? <EmptyRow label={copy.cafeEmpty} /> : <div className={styles.cafeGrid}>
          {visibleCafes.map(cafe => <Link key={cafe.slug} href={`/admin?tab=cafes&cafe=${encodeURIComponent(cafe.slug)}`} className={styles.cafeLink}>
            <span><strong>{lang === "th" ? cafe.nameTh : cafe.nameEn}</strong><small>{cafe.slug}</small></span>
            <span className={styles.cafeOpen}>{copy.cafeOpen} <span aria-hidden="true">↗</span></span>
          </Link>)}
        </div>}
      </section>}
      {pageInfo && <nav className={styles.pagination} aria-label={lang === "th" ? "หน้ารายการแอดมิน" : "Admin list pages"}>
        {pageInfo.page > 0 ? <Link href={`/admin?page=${pageInfo.page - 1}&tab=${tab}&filter=${pendingOnly ? "pending" : "all"}`}>← {copy.previous}</Link> : <span />}
        <span>{copy.page} {pageInfo.page + 1} / {pageInfo.totalPages}<small>{copy.perPage}</small></span>
        {pageInfo.page + 1 < pageInfo.totalPages ? <Link href={`/admin?page=${pageInfo.page + 1}&tab=${tab}&filter=${pendingOnly ? "pending" : "all"}`}>{copy.next} →</Link> : <span />}
      </nav>}
      {partialError && <p role="alert" className={styles.partialError}>{copy.partialError}</p>}
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#e0d3bc] bg-white/50 p-10 text-center text-sm text-espresso/50">
      {label}
    </p>
  );
}
