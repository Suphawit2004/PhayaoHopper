// City centre through Mae Ka / University of Phayao, with a small margin around both.
export const CAFE_COORDINATE_BOUNDS = {
  minLat: 19,
  maxLat: 19.25,
  minLng: 99.75,
  maxLng: 100.05,
} as const;

// Coordinates inside this box still need a human district check before publication.
export function isSupportedCafeCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= CAFE_COORDINATE_BOUNDS.minLat && lat <= CAFE_COORDINATE_BOUNDS.maxLat
    && lng >= CAFE_COORDINATE_BOUNDS.minLng && lng <= CAFE_COORDINATE_BOUNDS.maxLng;
}
