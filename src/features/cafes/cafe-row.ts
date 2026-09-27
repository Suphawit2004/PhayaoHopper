import type { Cafe } from "@/features/cafes/data/cafes";

// Explicit boundary between the existing SQL columns and the bilingual UI model.
export function cafeToRow(c: Cafe) {
  return { slug: c.slug, name_th: c.name.th, name_en: c.name.en,
    description_th: c.description.th, description_en: c.description.en,
    address_th: c.address.th, address_en: c.address.en, phone: c.phone ?? null,
    open_time: c.openTime, close_time: c.closeTime, closed_days: c.closedDays,
    price_range: c.priceRange, tags: c.tags, lifestyle_tags: c.lifestyleTags,
    area: c.area, lat: c.lat, lng: c.lng, photo: c.photo ?? null,
    menu_highlights: c.menuHighlights, base_rating: c.baseRating };
}
export type CafeRow = ReturnType<typeof cafeToRow>;
export function cafeFromRow(r: CafeRow): Cafe {
  return { slug: r.slug, name: { th: r.name_th, en: r.name_en ?? r.name_th },
    description: { th: r.description_th ?? "", en: r.description_en ?? "" },
    address: { th: r.address_th ?? "", en: r.address_en ?? "" }, phone: r.phone ?? undefined,
    openTime: r.open_time.slice(0,5), closeTime: r.close_time.slice(0,5), closedDays: r.closed_days ?? [],
    priceRange: r.price_range, tags: r.tags ?? [], lifestyleTags: r.lifestyle_tags ?? [],
    area: r.area, lat: r.lat, lng: r.lng, photo: r.photo ?? undefined,
    menuHighlights: r.menu_highlights ?? [], baseRating: Number(r.base_rating) };
}
