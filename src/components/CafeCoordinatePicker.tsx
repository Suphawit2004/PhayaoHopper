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
  value,
  onChange,
  includeHiddenInputs = true,
  className = "h-72",
}: {
  initialLat?: number;
  initialLng?: number;
  value?: [number, number] | null;
  onChange?: (coordinates: [number, number] | null) => void;
  includeHiddenInputs?: boolean;
  className?: string;
}) {
  const { lang } = useLang();
  const validInitial = initialLat !== undefined && initialLng !== undefined && isSupportedCafeCoordinate(initialLat, initialLng);
  const [internalCoordinates, setInternalCoordinates] = useState<[number, number] | null>(validInitial ? [initialLat, initialLng] : null);
  const coordinates = value === undefined ? internalCoordinates : value;
  const [draft, setDraft] = useState({
    lat: coordinates ? String(coordinates[0]) : "",
    lng: coordinates ? String(coordinates[1]) : "",
  });
  const [coordinateError, setCoordinateError] = useState("");

  const selectCoordinates = (next: [number, number] | null) => {
    setInternalCoordinates(next);
    onChange?.(next);
  };

  const pickFromMap = (lat: number, lng: number) => {
    const next: [number, number] = [lat, lng];
    setDraft({ lat: String(lat), lng: String(lng) });
    setCoordinateError("");
    selectCoordinates(next);
  };

  const updateCoordinate = (field: "lat" | "lng", nextValue: string) => {
    const nextDraft = { ...draft, [field]: nextValue };
    setDraft(nextDraft);
    setCoordinateError("");
    if (!nextDraft.lat.trim() || !nextDraft.lng.trim()) {
      selectCoordinates(null);
      return;
    }

    const lat = Number(nextDraft.lat);
    const lng = Number(nextDraft.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      selectCoordinates(null);
      setCoordinateError(lang === "th" ? "กรุณากรอกละติจูดและลองจิจูดเป็นตัวเลข" : "Enter latitude and longitude as numbers.");
      return;
    }
    if (!isSupportedCafeCoordinate(lat, lng)) {
      selectCoordinates(null);
      setCoordinateError(lang === "th" ? "พิกัดอยู่นอกพื้นที่ที่รองรับ กรุณาเลือกจุดในเขตพะเยาบนแผนที่" : "Coordinates are outside the supported area. Choose a point in Phayao.");
      return;
    }
    selectCoordinates([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  };

  const display = coordinates
    ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`
    : lang === "th" ? "ยังไม่ได้เลือกตำแหน่ง" : "No location selected";

  return (
    <section className="grid gap-2">
      <div>
        <h3 className="font-semibold">{lang === "th" ? "กำหนดพิกัดจากแผนที่" : "Set location on the map"}</h3>
        <p className="text-sm text-espresso/70">
          {lang === "th" ? "คลิกแผนที่หรือลากหมุด หรือกรอกพิกัดด้านล่าง" : "Click the map, drag the pin, or enter coordinates below."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-espresso">
          {lang === "th" ? "ละติจูด" : "Latitude"}
          <input type="text" inputMode="decimal" autoComplete="off" value={draft.lat} onChange={(event) => updateCoordinate("lat", event.target.value)} placeholder="19.123456" className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2 text-sm text-espresso focus:border-coffee focus:outline-none focus:ring-2 focus:ring-latte/50" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-espresso">
          {lang === "th" ? "ลองจิจูด" : "Longitude"}
          <input type="text" inputMode="decimal" autoComplete="off" value={draft.lng} onChange={(event) => updateCoordinate("lng", event.target.value)} placeholder="99.890000" className="w-full rounded-xl border border-[#d9cdbb] bg-white px-3 py-2 text-sm text-espresso focus:border-coffee focus:outline-none focus:ring-2 focus:ring-latte/50" />
        </label>
      </div>
      {coordinateError && <p role="alert" className="text-sm font-medium text-rose-700">{coordinateError}</p>}
      <div className={`relative overflow-hidden rounded-xl border border-[#e8dcc8] ${className}`}>
        <MapPicker value={coordinates} onChange={pickFromMap} className="h-full w-full" />
      </div>
      <p aria-live="polite" className="text-sm text-espresso/70">
        {lang === "th" ? "พิกัดที่เลือก:" : "Selected coordinates:"} <span className="font-mono font-semibold text-coffee">{display}</span>
      </p>
      {includeHiddenInputs && <>
        <input type="hidden" name="lat" value={coordinates?.[0] ?? ""} />
        <input type="hidden" name="lng" value={coordinates?.[1] ?? ""} />
      </>}
    </section>
  );
}
