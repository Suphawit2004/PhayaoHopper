"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";

const MapPicker = dynamic(() => import("./map/MapPicker"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-sand text-sm text-espresso/70">⏳ …</div>,
});

export default function CafeCoordinatePicker({
  initialLat,
  initialLng,
  className = "h-72",
}: {
  initialLat: number;
  initialLng: number;
  className?: string;
}) {
  const { lang } = useLang();
  const validInitial = isSupportedCafeCoordinate(initialLat, initialLng);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    validInitial ? [initialLat, initialLng] : null,
  );
  const display = coordinates
    ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
    : lang === "th" ? "ยังไม่ได้เลือกตำแหน่ง" : "No location selected";

  return (
    <section className="grid gap-2">
      <div>
        <h3 className="font-semibold">{lang === "th" ? "กำหนดพิกัดจากแผนที่" : "Set location on the map"}</h3>
        <p className="text-sm text-espresso/70">
          {lang === "th" ? "คลิกตำแหน่งร้านบนแผนที่ หรือลากหมุดเพื่อปรับตำแหน่ง" : "Click the cafe location on the map or drag the pin to adjust it."}
        </p>
      </div>
      <div className={`relative overflow-hidden rounded-xl border border-[#e8dcc8] ${className}`}>
        <MapPicker value={coordinates} onChange={(lat, lng) => setCoordinates([lat, lng])} className="h-full w-full" />
      </div>
      <p aria-live="polite" className="text-sm text-espresso/70">
        {lang === "th" ? "พิกัดที่เลือก:" : "Selected coordinates:"} <span className="font-mono font-semibold text-coffee">{display}</span>
      </p>
      <input type="hidden" name="lat" value={coordinates?.[0] ?? ""} />
      <input type="hidden" name="lng" value={coordinates?.[1] ?? ""} />
    </section>
  );
}
