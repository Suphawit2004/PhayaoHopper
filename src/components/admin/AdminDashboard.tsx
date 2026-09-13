"use client";
import {useUi} from "@/i18n/UiText";
import { useCatalog } from "@/components/CatalogProvider";

import { useSearchParams, useRouter } from "next/navigation";
import AdminMutation from "./AdminMutation";
import styles from "./AdminDashboard.module.css";
import Link from "next/link";
import ActionForm from "@/components/ActionForm";

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
}: {
  mode: Mode;
  suggestions?: AdminSuggestion[];
  reports?: AdminReport[];
  reviews?: AdminReview[];
}) {
  const ui=useUi();
  const CAFES = useCatalog();
  const { t, tr, lang } = useLang();
  const tk = (k: string) => t(k as DictKey);
  const params = useSearchParams(); const router = useRouter();
  const rawTab = params.get("tab"); const tab = rawTab==="reports" || rawTab==="reviews" ? rawTab : "suggestions";
  const pendingOnly = params.get("filter") !== "all";
  const changeView = (nextTab:string, pending:boolean) => router.replace(`/admin?page=${params.get("page") || "0"}&tab=${nextTab}&filter=${pending?"pending":"all"}`,{scroll:false});
  const copy = lang === "th" ? {
    back: ui("กลับไปหน้าเว็บไซต์"), workspace: ui("จัดการข้อมูลคาเฟ่"), loaded: ui("รายการที่โหลดมา"),
    queue: ui("รอตรวจสอบ"), recent: ui("รีวิวล่าสุด"), all: ui("รายการทั้งหมด"), pending: ui("แสดงเฉพาะที่รอตรวจสอบ"),
    manage: ui("เลือกหมวดที่ต้องการจัดการ"), done: ui("ไม่มีรายการรอตรวจสอบในหมวดนี้"),
    suggestions: ui("ตรวจสอบข้อมูลร้าน ก่อนอนุมัติหรือส่งกลับ"), reports: ui("ตรวจสอบคำขอแก้ไขข้อมูลจากผู้ใช้"),
    reviews: ui("ดูความคิดเห็นและจัดการรีวิวที่ไม่เหมาะสม"),
  } : {
    back: "Back to website", workspace: "Cafe management", loaded: "Loaded records",
    queue: "Awaiting review", recent: "Latest reviews", all: "All records", pending: "Show pending only",
    manage: "Choose a section to manage", done: "No pending items in this section",
    suggestions: "Review cafe details before approving or rejecting", reports: "Check corrections submitted by visitors",
    reviews: "Read feedback and moderate inappropriate reviews",
  };

  if (mode !== "ready") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
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

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending").length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  const tabs = [
    { key: "suggestions" as const, label: t("admin.tab.suggestions"), badge: pendingSuggestions },
    { key: "reports" as const, label: t("admin.tab.reports"), badge: pendingReports },
    { key: "reviews" as const, label: t("admin.tab.reviews"), badge: 0 },
  ];

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div><h1>{t("admin.title")}</h1><p>{t("admin.desc")}</p></div>
        <Link href="/" className={styles.backLink}>{copy.back} <span aria-hidden>↗</span></Link>
      </header>
      <div className={styles.summary} aria-label={copy.loaded}>
        <div><span>{t("admin.tab.suggestions")}</span><strong>{suggestions.length}</strong><small>{pendingSuggestions} {copy.queue}</small></div>
        <div><span>{t("admin.tab.reports")}</span><strong>{reports.length}</strong><small>{pendingReports} {copy.queue}</small></div>
        <div><span>{copy.recent}</span><strong>{reviews.length}</strong><small>{copy.loaded}</small></div>
      </div>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <h2>{copy.workspace}</h2>
          <p>{copy.manage}</p>
          <nav aria-label={t("admin.title")} className={styles.navigation}>
            {tabs.map(({ key, label, badge }) => (
              <button key={key} type="button" aria-pressed={tab === key}
                onClick={() => { changeView(key,true); }}
                className={tab === key ? styles.active : undefined}>
                <span>{label}</span><span className={styles.count}>{key === "reviews" ? reviews.length : badge}</span>
              </button>
            ))}
          </nav>
        </aside>
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div><h2>{tabs.find((item) => item.key === tab)?.label}</h2><p>{copy[tab]}</p></div>
            {tab !== "reviews" && <label className={styles.filter}>
              <input type="checkbox" checked={pendingOnly} onChange={(e) => changeView(tab,e.target.checked)} />
              {copy.pending}
            </label>}
          </div>
      {tab === "suggestions" && (
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

              {s.note && <p className="mt-3 rounded-xl bg-sand/50 p-3 text-sm">💬 {s.note}</p>}
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
              {s.status !== "approved" && <details className="mt-4 rounded-xl border border-[#eadfcd] p-4"><summary className="cursor-pointer text-sm font-semibold">{ui("ตรวจและเติมข้อมูลก่อนเผยแพร่")}</summary><div className="mt-4"><ActionForm action={saveSuggestionDetails}>
                <input type="hidden" name="id" value={s.id} />
                <label>{ui("ชื่อร้าน")}<input name="name" defaultValue={s.name} maxLength={120} required /></label>
                <label>{ui("ที่อยู่")}<input name="address" defaultValue={s.address ?? ""} maxLength={300} required /></label>
                <div className="feature-grid"><label>{ui("เวลาเปิด")}<input type="time" name="openTime" defaultValue={s.openTime ?? ""} required /></label><label>{ui("เวลาปิด")}<input type="time" name="closeTime" defaultValue={s.closeTime ?? ""} required /></label></div>
              </ActionForm></div></details>}
              <div className={styles.actions}>
                {s.status !== "approved" && (
                  <AdminMutation action={suggestionFormAction} label={t("admin.approve")}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="approved" />
                    <label className="mb-3 block text-xs"><input type="checkbox" name="inDistrict" required />{ui("ตรวจแล้วว่าร้านอยู่ในอำเภอเมืองพะเยา")}</label>
                    
                  </AdminMutation>
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

      {tab === "reports" && (
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
              <p className="mt-2 text-sm">💬 {r.message}</p>

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

      {tab === "reviews" && (
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
              {rv.comment && <p className="mt-2 text-sm">💬 {rv.comment}</p>}
              <AdminMutation action={deleteReviewFormAction} label={t("admin.delete")} confirm={t("admin.confirmDeleteReview")}>
                <input type="hidden" name="id" value={rv.id} />
                
                
              </AdminMutation>
            </article>
          ))}
        </section>
      )}
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
