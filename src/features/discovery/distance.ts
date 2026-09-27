import type { Cafe } from "@/features/cafes/data/cafes";

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DistanceFromRoad {
  cafe: Cafe;
  distanceKm: number;
  fromLakeside: boolean;
}

const KM_PER_DEG_LAT = 110.574;

/**
 * Shortest distance (km) from a point to the road segment between two centers,
 * using a local planar projection — accurate enough over city-scale distances.
 */
export function pointToSegmentKm(
  lat: number,
  lng: number,
  a: [number, number],
  b: [number, number]
): number {
  const meanLatDeg = (a[0] + b[0] + lat) / 3;
  const kx = 111.32 * Math.cos((meanLatDeg * Math.PI) / 180);

  const px = lng * kx;
  const py = lat * KM_PER_DEG_LAT;
  const ax = a[1] * kx;
  const ay = a[0] * KM_PER_DEG_LAT;
  const bx = b[1] * kx;
  const by = b[0] * KM_PER_DEG_LAT;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  const clamped = Math.max(0, Math.min(1, t));

  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
}

export function calculateDistancesFromRoad(
  cafes: Cafe[],
  lakesideCenter: [number, number],
  universityCenter: [number, number],
): DistanceFromRoad[] {
  return cafes.map((cafe) => {
    const d1 = haversineKm(lakesideCenter[0], lakesideCenter[1], cafe.lat, cafe.lng);
    const d2 = haversineKm(universityCenter[0], universityCenter[1], cafe.lat, cafe.lng);
    const fromLakeside = d1 < d2;
    return {
      cafe,
      distanceKm: Number(pointToSegmentKm(cafe.lat, cafe.lng, lakesideCenter, universityCenter).toFixed(2)),
      fromLakeside,
    };
  });
}

export const LAKESIDE_CENTER: [number, number] = [19.17, 99.90];
export const UNIVERSITY_CENTER: [number, number] = [19.05, 99.93];
export const MAX_DISTANCE_KM = 5;