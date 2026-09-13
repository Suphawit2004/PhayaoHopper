"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { submitReport } from "@/app/actions/reports";

const FIELDS = [
  { id: "hours", key: "report.field.hours", emoji: "🕒" },
  { id: "phone", key: "report.field.phone", emoji: "📞" },
  { id: "address", key: "report.field.address", emoji: "📌" },
  { id: "location", key: "report.field.location", emoji: "🗺️" },
  { id: "closed_days", key: "report.field.closedDays", emoji: "🗓️" },
  { id: "other", key: "report.field.other", emoji: "💬" },
] as const;

type FieldId = (typeof FIELDS)[number]["id"];

interface ReportDialogProps {
  slug: string;
  cafeName?: string;
  open: boolean;
  onClose: () => void;
}

export default function ReportDialog({ slug, cafeName, open, onClose }: ReportDialogProps) {
  const { t } = useLang();
  const supabaseReady = getSupabaseBrowser() !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [field, setField] = useState<FieldId>("hours");
  const [message, setMessage] = useState("");
  const [suggested, setSuggested] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [rateLimited, setRateLimited] = useState(false);

  // Store previously focused element when dialog opens
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog after a brief delay to ensure it's rendered
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 0);
    } else if (previousFocusRef.current) {
      // Restore focus to the element that opened the dialog
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Focus trap: keep focus within the dialog
  useEffect(() => {
    if (!open) return;

    const previousOverflow=document.body.style.overflow; document.body.style.overflow="hidden";
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow=previousOverflow;
      dialog.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Reset all dialog state whenever the dialog opens (or opens for a
  // different cafe) so a draft — or the success screen — from a previous
  // session never leaks into this one. Render-phase adjustment: React
  // discards the in-progress render and re-renders with fresh state before
  // committing anything.
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const sessionKey = slug;
  if (sessionKey !== prevKey) {
    setPrevKey(sessionKey);
    if (open) {
      setField("hours");
      setMessage("");
      setSuggested("");
      setContact("");
      setStatus("idle");
      setRateLimited(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resetAndClose = () => {
    setField("hours");
    setMessage("");
    setSuggested("");
    setContact("");
    setStatus("idle");
    setRateLimited(false);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setStatus("sending");
    setRateLimited(false);
    const res = await submitReport({
      slug,
      field,
      message: message.trim(),
      suggestedValue: suggested.trim() || null,
      contact: contact.trim() || null,
    }).catch(() => ({ ok: false, error: "failed" } as const));
    if (!res.ok && res.error === "rate_limited") {
      setRateLimited(true);
      setStatus("error");
      return;
    }
    setStatus(res.ok ? "sent" : "error");
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("report.title")}
      className="fixed inset-0 z-[1600] flex items-end justify-center bg-espresso/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-espresso">{t("report.title")}</h2>{cafeName && <p className="font-semibold">{cafeName}</p>}
            <p className="mt-1 text-xs leading-relaxed text-espresso/60">{t("report.desc")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-lg leading-none text-espresso/60 transition hover:bg-sand hover:text-espresso"
          >
            ✕
          </button>
        </div>

        {!supabaseReady && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⚠️ {t("db.notConfigured")}
          </p>
        )}

        {status === "sent" ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm font-semibold text-emerald-800">{t("report.success")}</p>
            <button
              type="button"
              onClick={resetAndClose}
              className="mt-4 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <div>
              <span className="block text-sm font-semibold text-espresso">{t("report.field")}</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FIELDS.map((f) => {
                  const active = field === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setField(f.id)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-coffee bg-coffee text-cream"
                          : "border-[#e8dcc8] bg-white text-espresso/80 hover:border-latte hover:bg-sand/60"
                      }`}
                    >
                      <span aria-hidden>{f.emoji}</span> {t(f.key)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="rp-message" className="block text-sm font-semibold text-espresso">
                {t("report.message")}
              </label>
              <textarea
                id="rp-message"
                rows={3}
                required
                minLength={1}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("report.messagePh")}
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="rp-suggested" className="block text-sm font-semibold text-espresso">
                {t("report.suggested")}
              </label>
              <input
                id="rp-suggested"
                type="text"
                maxLength={300}
                value={suggested}
                onChange={(e) => setSuggested(e.target.value)}
                placeholder={field==="hours" ? "09:00–18:00" : field==="phone" ? "054-xxx-xxx" : t("report.suggestedPh")}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="rp-contact" className="block text-sm font-semibold text-espresso">
                {t("report.contact")}
              </label>
              <input
                id="rp-contact"
                type="text"
                maxLength={120}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t("suggest.contactPh")}
                className={inputClass}
              />
            </div>

            {rateLimited && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                ⏳ {t("report.rateLimited")}
              </p>
            )}

            {status === "error" && !rateLimited && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
                ⚠️ {t("report.error")}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !supabaseReady}
              className="rounded-full bg-coffee px-6 py-3 text-sm font-bold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
            >
              {status === "sending" ? `⏳ ${t("report.sending")}` : `📮 ${t("report.submit")}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
