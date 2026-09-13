"use client";

import { useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { useFavorites } from "./FavoritesProvider";

interface FavoriteButtonProps {
  slug: string;
  variant?: "overlay" | "inline";
}

export default function FavoriteButton({ slug, variant = "overlay" }: FavoriteButtonProps) {
  const { t, lang } = useLang();
  const { has, toggle, ready } = useFavorites();
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const active = has(slug);

  const base =
    "grid place-items-center transition hover:scale-110 disabled:opacity-50";
  const style =
    variant === "overlay"
      ? `${base} absolute left-3 top-3 z-10 size-11 rounded-full bg-white/90 shadow-sm`
      : `${base} size-11 shrink-0 self-center rounded-full border border-[#e8dcc8] bg-white`;

  return (
    <><button
      type="button"
      disabled={!ready || pending}
      aria-pressed={active}
      aria-label={active ? t("fav.remove") : t("fav.add")}
      title={active ? t("fav.remove") : t("fav.add")}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPending(true);
        const ok = await toggle(slug);
        setPending(false);
        if (!ok) { setNotice(lang === "th" ? "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not save. Please try again."); return; }
        setNotice(lang === "th" ? (active ? "นำออกจากร้านที่บันทึกแล้ว" : "บันทึกร้านแล้ว") : (active ? "Cafe removed from saved places" : "Cafe saved"));
      }}
      className={style}
    >
      <span className="text-lg leading-none" aria-hidden>
        <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      </span>
    </button><span role="status" className="sr-only">{notice}</span></>
  );
}
