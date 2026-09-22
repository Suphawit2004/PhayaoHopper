"use client";

import { useSyncExternalStore } from "react";
import type { Cafe } from "@/data/cafes";
import { getOpenStatus } from "@/lib/hours";
import { useLang } from "@/i18n/LangProvider";

let currentTs = 0;
const subscribers = new Set<() => void>();
let intervalId: number | undefined;

function subscribeTick(onChange: () => void): () => void {
  subscribers.add(onChange);
  if (subscribers.size === 1) {
    currentTs = Date.now();
    intervalId = window.setInterval(() => {
      currentTs = Date.now();
      subscribers.forEach((cb) => cb());
    }, 30_000);
  }
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0) {
      window.clearInterval(intervalId);
      intervalId = undefined;
      currentTs = 0;
    }
  };
}

function getSnapshot(): number {
  return currentTs;
}

function getServerSnapshot(): number {
  return 0;
}

export function useNowTick(): number {
  return useSyncExternalStore(subscribeTick, getSnapshot, getServerSnapshot);
}

export default function OpenBadge({ cafe }: { cafe: Cafe }) {
  const { t } = useLang();
  const ts = useNowTick();

  if (ts === 0) {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-sand px-2.5 text-xs font-semibold text-espresso/70">
        {cafe.openTime}–{cafe.closeTime}
      </span>
    );
  }

  const status = getOpenStatus(cafe, new Date(ts));
  let cls = "bg-emerald-100 text-emerald-800";
  let label = `${t("status.open")} · ${cafe.closeTime}`;
  if (status.isOpenNow) {
    cls = "bg-emerald-100 text-emerald-800";
    label = `${t("status.open")} · ${cafe.closeTime}`;
  } else if (!status.isOpenToday) {
    cls = "bg-gray-200 text-gray-600";
    label = t("status.closedToday");
  } else {
    cls = "bg-rose-100 text-rose-700";
    label = t("status.closedNow");
  }

  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${cls}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
