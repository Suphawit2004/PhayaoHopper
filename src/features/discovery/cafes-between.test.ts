import { describe, expect, it } from "vitest";
import {
  filterByMaxDistance,
  getCafesBetweenAreas,
  isInTransitionZone,
  sortByProximityToLakeside,
} from "@/features/discovery/cafes-between";
import {
  MAX_DISTANCE_KM,
  calculateDistancesFromRoad,
  haversineKm,
  pointToSegmentKm,
} from "@/features/discovery/distance";
import type { Cafe } from "@/features/cafes/data/cafes";

function makeCafe(overrides: Partial<Cafe> = {}): Cafe {
  return {
    slug: "test-cafe",
    name: { th: "ทดสอบ", en: "Test" },
    description: { th: "", en: "" },
    address: { th: "", en: "" },
    openTime: "08:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 1,
    tags: [],
    lifestyleTags: [],
    area: "lakeside",
    lat: 19.16,
    lng: 99.89,
    menuHighlights: [],
    baseRating: 4.5,
    ...overrides,
  };
}

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(19.17, 99.9, 19.17, 99.9)).toBe(0);
  });

  it("matches the known length of one degree of latitude", () => {
    // 0.01° of latitude ≈ 1.11 km (R = 6371 km)
    expect(haversineKm(19, 100, 19.01, 100)).toBeCloseTo(1.11, 1);
  });

  it("is symmetric", () => {
    const ab = haversineKm(19.17, 99.9, 19.05, 99.93);
    const ba = haversineKm(19.05, 99.93, 19.17, 99.9);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

describe("pointToSegmentKm", () => {
  const A: [number, number] = [0, 0];
  const B: [number, number] = [0, 1];

  it("is zero on the segment", () => {
    expect(pointToSegmentKm(0, 0.5, A, B)).toBeCloseTo(0, 6);
    expect(pointToSegmentKm(0, 0, A, B)).toBeCloseTo(0, 6);
  });

  it("measures perpendicular offset from the middle of the segment", () => {
    // 0.01° of latitude ≈ 1.106 km
    expect(pointToSegmentKm(0.01, 0.5, A, B)).toBeCloseTo(1.106, 1);
  });

  it("clamps to the nearest endpoint past the segment ends", () => {
    // (0.5, 0) projects past A, so distance is to A itself: 0.5° lat × 110.574 km/°
    expect(pointToSegmentKm(0.5, 0, A, B)).toBeCloseTo(55.29, 0);
  });

  it("handles degenerate zero-length segments", () => {
    expect(pointToSegmentKm(0.01, 0, A, A)).toBeCloseTo(1.106, 1);
  });
});

describe("calculateDistancesFromRoad", () => {
  const lakeside: [number, number] = [19, 100];
  const university: [number, number] = [19, 100.02];

  it("marks cafes closer to the lakeside end", () => {
    const [atLakeside] = calculateDistancesFromRoad([makeCafe({ slug: "a", lat: 19, lng: 100 })], lakeside, university);
    expect(atLakeside.fromLakeside).toBe(true);
    expect(atLakeside.distanceKm).toBe(0);
  });

  it("marks cafes closer to the university end", () => {
    const [atUniversity] = calculateDistancesFromRoad(
      [makeCafe({ slug: "b", lat: 19, lng: 100.02 })],
      lakeside,
      university
    );
    expect(atUniversity.fromLakeside).toBe(false);
    expect(atUniversity.distanceKm).toBe(0);
  });

  it("rounds the road distance to two decimals", () => {
    const [mid] = calculateDistancesFromRoad(
      [makeCafe({ lat: 18.995, lng: 100.01 })],
      lakeside,
      university
    );
    expect(mid.distanceKm).toBe(Number(mid.distanceKm.toFixed(2)));
  });
});

describe("transition zone with real Phayao centers", () => {
  const MID_ROAD = { lat: 19.11, lng: 99.915 };

  it("includes cafes within the corridor", () => {
    expect(isInTransitionZone(makeCafe(MID_ROAD))).toBe(true);
    // ~3.3 km perpendicular offset
    expect(isInTransitionZone(makeCafe({ ...MID_ROAD, lat: 19.14 }))).toBe(true);
  });

  it("excludes cafes far from the road", () => {
    // The road runs mostly north-south, so east-west offsets are near-perpendicular:
    // +0.03° lng ≈ 3.2 km (inside), +0.06° lng ≈ 6.3 km (outside)
    expect(isInTransitionZone(makeCafe({ ...MID_ROAD, lng: 99.945 }))).toBe(true);
    expect(isInTransitionZone(makeCafe({ ...MID_ROAD, lng: 99.975 }))).toBe(false);
    // The lakeside anchor itself sits on the road
    expect(isInTransitionZone(makeCafe({ lat: 19.17, lng: 99.9 }))).toBe(true);
  });

  it("returns corridor cafes for the between-areas query", () => {
    const cafes = [
      makeCafe({ slug: "on-road", ...MID_ROAD }),
      makeCafe({ slug: "off-road", lat: 19.3, lng: 99.915 }),
    ];
    const kept = filterByMaxDistance(getCafesBetweenAreas(cafes));
    expect(kept.map((d) => d.cafe.slug)).toEqual(["on-road"]);
  });
});

describe("filterByMaxDistance", () => {
  const distances = getCafesBetweenAreas([
    makeCafe({ slug: "near", ...{ lat: 19.11, lng: 99.915 } }),
    makeCafe({ slug: "far", lat: 19.16, lng: 99.915 }),
  ]);

  it("defaults to MAX_DISTANCE_KM", () => {
    const kept = filterByMaxDistance(distances);
    expect(kept.every((d) => d.distanceKm <= MAX_DISTANCE_KM)).toBe(true);
    expect(kept.some((d) => d.distanceKm > MAX_DISTANCE_KM)).toBe(false);
  });

  it("honours an explicit limit", () => {
    expect(filterByMaxDistance(distances, 0.01).length).toBeLessThanOrEqual(1);
  });
});

describe("sortByProximityToLakeside", () => {
  it("groups lakeside-side entries first without losing any", () => {
    const sorted = sortByProximityToLakeside([
      { cafe: makeCafe({ slug: "uni" }), distanceKm: 1, fromLakeside: false },
      { cafe: makeCafe({ slug: "lake" }), distanceKm: 3, fromLakeside: true },
      { cafe: makeCafe({ slug: "uni2" }), distanceKm: 2, fromLakeside: false },
      { cafe: makeCafe({ slug: "lake2" }), distanceKm: 4, fromLakeside: true },
    ]);
    expect(sorted.map((d) => d.cafe.slug)).toEqual(["lake", "lake2", "uni", "uni2"]);
  });
});
