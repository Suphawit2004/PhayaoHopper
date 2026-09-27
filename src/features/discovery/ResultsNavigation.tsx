"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";
import { useLang } from "@/i18n/LangProvider";

const RESULTS_RETURN_KEY = "cafe-results-return";
const RESULTS_RESTORE_KEY = "cafe-results-restore";

export function ResultLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (["/cafes", "/map"].includes(window.location.pathname)) {
      try {
        sessionStorage.setItem(RESULTS_RETURN_KEY, JSON.stringify({ path: window.location.pathname + window.location.search, y: window.scrollY }));
      } catch {}
    }
  }} />;
}

export function RestoreResults({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    try {
      if (sessionStorage.getItem(RESULTS_RESTORE_KEY) === "1") {
        const saved = JSON.parse(sessionStorage.getItem(RESULTS_RETURN_KEY) || "null");
        if (saved?.path === window.location.pathname + window.location.search) {
          sessionStorage.removeItem(RESULTS_RESTORE_KEY);
          frame = requestAnimationFrame(() => window.scrollTo(0, Number(saved.y) || 0));
        }
      }
    } catch {}
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  return null;
}

export function BackToResults() {
  const router = useRouter();
  const { t } = useLang();
  return <Link href="/cafes" className="ui-secondary inline-block" onClick={event => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULTS_RETURN_KEY) || "null");
      if (saved && /^\/(cafes|map)(\?|$)/.test(saved.path)) {
        event.preventDefault();
        sessionStorage.setItem(RESULTS_RESTORE_KEY, "1");
        router.push(saved.path, { scroll: false });
      }
    } catch {}
  }}>{t("detail.back")}</Link>;
}
