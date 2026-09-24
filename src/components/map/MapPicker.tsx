"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useLang } from "@/i18n/LangProvider";
import { DEFAULT_CENTER } from "@/lib/map";
import { CAFE_COORDINATE_BOUNDS, isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";

const pinIcon = L.divIcon({
  className: "coffee-marker",
  html: `<div class="pin-wrap" style="--pin:#3f6c72"><div class="pin-head"><span>📍</span></div><div class="pin-tail"></div></div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ value }: { value: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView(value, Math.max(map.getZoom(), 16));
  }, [map, value]);
  return null;
}

interface MapPickerProps {
  value: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export default function MapPicker({ value, onChange, className }: MapPickerProps) {
  const { t } = useLang();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [outsideArea, setOutsideArea] = useState(false);

  const round = (n: number) => Number(n.toFixed(6));
  const pick = (lat: number, lng: number) => {
    if (!isSupportedCafeCoordinate(lat, lng)) {
      setOutsideArea(true);
      return;
    }
    setOutsideArea(false);
    onChange(round(lat), round(lng));
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <MapContainer
        center={value ?? DEFAULT_CENTER}
        zoom={14}
        maxBounds={[[CAFE_COORDINATE_BOUNDS.minLat, CAFE_COORDINATE_BOUNDS.minLng], [CAFE_COORDINATE_BOUNDS.maxLat, CAFE_COORDINATE_BOUNDS.maxLng]]}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="absolute inset-0 z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture onPick={pick} />
        <Recenter value={value} />
        {value && (
          <Marker
            position={value}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = e.target.getLatLng();
                pick(ll.lat, ll.lng);
              },
            }}
          />
        )}
      </MapContainer>

      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        aria-label={t("suggest.locate")}
        title={t("suggest.locate")}
        className="absolute right-2 top-2 z-[900] flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-bold text-espresso shadow-md transition hover:bg-white disabled:opacity-60"
      >
        {locating ? (
          <>⏳ {t("suggest.locating")}</>
        ) : (
          <>
            <span aria-hidden>🎯</span> {t("suggest.locate")}
          </>
        )}
      </button>

      {geoError && (
        <p className="absolute inset-x-2 bottom-2 z-[900] rounded-lg bg-rose-50/95 px-3 py-2 text-xs font-medium text-rose-700 shadow">
          ⚠️ {t("suggest.locationError")}
        </p>
      )}
      {outsideArea && (
        <p role="alert" className="absolute inset-x-2 bottom-2 z-[900] rounded-lg bg-amber-50/95 px-3 py-2 text-xs font-medium text-amber-900 shadow">
          {t("suggest.locationOutside")}
        </p>
      )}
    </div>
  );
}
