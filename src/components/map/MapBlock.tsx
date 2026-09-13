"use client";

import dynamic from "next/dynamic";
import UiText from "@/i18n/UiText";
import type { Cafe } from "@/data/cafes";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-xl bg-sand text-sm font-medium text-espresso/70">
      <span role="status"><UiText text="กำลังโหลดแผนที่…" en="Loading map…" /></span>
    </div>
  ),
});

interface MapBlockProps {
  cafes: Cafe[];
  className?: string;
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
  onSearchArea?: (bounds: [number,number,number,number]) => void;
  areaActive?: boolean;
}

export default function MapBlock({ cafes, className, selectedSlug, onSelect, onSearchArea, areaActive }: MapBlockProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#eee3d2] shadow-sm ${className ?? ""}`}>
      <MapView onSearchArea={onSearchArea} areaActive={areaActive} selectedSlug={selectedSlug} onSelect={onSelect} cafes={cafes} className="h-full w-full" />
    </div>
  );
}
