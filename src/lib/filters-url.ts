import { AREA_ORDER, LIFESTYLE_ORDER, TAG_ORDER, type CafeArea, type CafeTag, type LifeStyleTag } from "@/data/cafes";

export interface FilterState {
  query: string;
  sort?: "relevance" | "rating" | "name";
  tags: CafeTag[];
  life: LifeStyleTag[];
  area: CafeArea | null;
  maxPrice: 0 | 1 | 2;
  openNow: boolean;
  transitionZone: boolean;
}

export const INITIAL_FILTERS: FilterState = {
  query: "",
  tags: [],
  life: [],
  area: null,
  maxPrice: 0,
  openNow: false,
  transitionZone: false,
};

export function filtersToQuery(f: FilterState): string {
  const params = new URLSearchParams();
  const q = f.query.trim();
  if (q) params.set("q", q);
  if (f.sort && f.sort !== "relevance") params.set("sort", f.sort);
  if (f.tags.length > 0) params.set("tag", f.tags.join(","));
  if (f.life.length > 0) params.set("life", f.life.join(","));
  if (f.area) params.set("area", f.area);
  if (f.maxPrice !== 0) params.set("price", String(f.maxPrice));
  if (f.openNow) params.set("open", "1");
  if (f.transitionZone) params.set("zone", "1");
  return params.toString();
}

function csvParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly string[]
): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => allowed.includes(v));
}

export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  const areaRaw = params.get("area");
  return {
    ...(params.get("sort") === "name" || params.get("sort") === "rating" ? { sort: params.get("sort") as "name" | "rating" } : {}),
    query: (params.get("q") ?? "").trim(),
    tags: csvParam(params, "tag", TAG_ORDER),
    life: csvParam(params, "life", LIFESTYLE_ORDER),
    area:
      areaRaw && AREA_ORDER.includes(areaRaw as CafeArea) ? (areaRaw as CafeArea) : null,
    maxPrice:
      params.get("price") === "1" || params.get("price") === "2"
        ? (Number(params.get("price")) as 1 | 2)
        : 0,
    openNow: params.get("open") === "1",
    transitionZone: params.get("zone") === "1",
  };
}
