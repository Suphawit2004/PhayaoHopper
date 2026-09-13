"use client";
import Icon from "./Icon";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useSearch } from "./SearchProvider";
import { filtersToQuery } from "@/lib/filters-url";
import SearchPopover from "./SearchPopover";
import ActiveFilterChips from "./ActiveFilterChips";

export default function FilterBar({ className = "" }: { className?: string }) {
  const { t, lang } = useLang();
  const { filters } = useSearch();
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {setOpen(false); trigger.current?.focus();};
  const rootRef = useRef<HTMLDivElement>(null);

  const activeCount =
    (filters.query.trim() ? 1 : 0) +
    filters.tags.length +
    filters.life.length +
    (filters.area !== null ? 1 : 0) +
    (filters.maxPrice !== 0 ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (filters.transitionZone ? 1 : 0);

  // Close the popover on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {setOpen(false); trigger.current?.focus();}
    };

    window.addEventListener("keydown", onKey);
    return () => {

      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleCopyLink = async () => {
    const qs = filtersToQuery(filters);
    const url = qs ? `${window.location.origin}/cafes?${qs}` : `${window.location.origin}/cafes`;
    try { await navigator.clipboard.writeText(url); setCopyStatus("copied"); }
    catch { setCopyStatus("error"); }
    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  return (
    <div ref={rootRef} className={`relative flex flex-wrap items-center gap-2 ${className}`}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t("filter.open")} (${activeCount})`}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
          open || activeCount > 0
            ? "bg-coffee text-cream hover:bg-[#684a37]"
            : "border border-[#e8dcc8] bg-white text-espresso hover:bg-sand"
        }`}
      >
        <Icon name="filter" /> {t("filter.open")}
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-latte px-1.5 text-xs font-extrabold text-espresso">
            {activeCount}
          </span>
        )}
      </button>

      {copyStatus === "error" && <p role="status" className="w-full text-sm text-rose-700">{lang === "th" ? "คัดลอกไม่สำเร็จ กรุณาคัดลอกจากแถบที่อยู่" : "Copy failed. Copy the address from your browser."}</p>}
      <SearchPopover open={open} onClose={close} />
      <ActiveFilterChips />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={copyStatus === "copied" ? t("filter.copied") : t("filter.copyLink")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
            copyStatus === "copied"
              ? "bg-emerald-100 text-emerald-800"
              : "border border-[#e8dcc8] bg-white text-espresso hover:bg-sand"
          }`}
        >
          {copyStatus === "copied" ? "✓" : <Icon name="link" />} {t("filter.copyLink")}
        </button>
      )}
    </div>
  );
}
