// A broad bounding box for the supported Mueang Phayao catalogue.
// Coordinates inside this box still need a human district check before publication.
export function isSupportedCafeCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 19 && lat <= 20 && lng >= 99.6 && lng <= 100.2;
}
