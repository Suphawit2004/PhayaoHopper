import type { Cafe } from "@/data/cafes";
import type { FilterState } from "./filters-url";
import { getOpenStatus } from "./hours";
import { scoreCafe } from "./cafe-search";
import { filterByMaxDistance, getCafesBetweenAreas, MAX_DISTANCE_KM } from "./cafes-between";
export function filterCafes(cafes: Cafe[], filters: FilterState, now: Date, lang: "th" | "en" = "th") {
  let rows = cafes.map(cafe => ({ cafe, score: scoreCafe(cafe, filters.query.trim()) })).filter(({ cafe, score }) =>
    score > 0 && (!filters.tags.length || filters.tags.some(t => cafe.tags.includes(t))) &&
    filters.life.every(t => cafe.lifestyleTags.includes(t)) &&
    (!filters.area || filters.area === cafe.area) && (!filters.maxPrice || cafe.priceRange <= filters.maxPrice) &&
    (!filters.openNow || getOpenStatus(cafe, now).isOpenNow));
  if (filters.transitionZone) {
    const keep = new Set(filterByMaxDistance(getCafesBetweenAreas(rows.map(x => x.cafe)), MAX_DISTANCE_KM).map(x => x.cafe.slug));
    rows = rows.filter(x => keep.has(x.cafe.slug));
  }
  return rows.sort((a,b) => (filters.sort === "name" ? a.cafe.name[lang].localeCompare(b.cafe.name[lang], lang) :
    filters.sort === "rating" ? b.cafe.baseRating - a.cafe.baseRating : b.score - a.score || b.cafe.baseRating - a.cafe.baseRating) ||
    a.cafe.slug.localeCompare(b.cafe.slug)).map(x => x.cafe);
}
