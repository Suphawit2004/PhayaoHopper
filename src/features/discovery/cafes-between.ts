import type { Cafe } from "@/features/cafes/data/cafes";
import {
  LAKESIDE_CENTER,
  UNIVERSITY_CENTER,
  MAX_DISTANCE_KM,
  pointToSegmentKm,
  calculateDistancesFromRoad,
  DistanceFromRoad,
} from "@/features/discovery/distance";

export function isInTransitionZone(cafe: Cafe): boolean {
  return pointToSegmentKm(cafe.lat, cafe.lng, LAKESIDE_CENTER, UNIVERSITY_CENTER) <= MAX_DISTANCE_KM;
}

export function getCafesBetweenAreas(cafes: Cafe[]): DistanceFromRoad[] {
  return calculateDistancesFromRoad(cafes, LAKESIDE_CENTER, UNIVERSITY_CENTER);
}

export function filterByMaxDistance(
  distances: DistanceFromRoad[],
  maxKm: number = MAX_DISTANCE_KM
): DistanceFromRoad[] {
  return distances.filter((d) => d.distanceKm <= maxKm);
}

export function sortByProximityToLakeside(
  distances: DistanceFromRoad[]
): DistanceFromRoad[] {
  // Stable partition: lakeside entries first, order otherwise preserved.
  return [...distances].sort((a, b) =>
    a.fromLakeside === b.fromLakeside ? 0 : a.fromLakeside ? -1 : 1
  );
}

// Export for use in other modules
export { MAX_DISTANCE_KM };