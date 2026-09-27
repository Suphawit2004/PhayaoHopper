import { describe, expect, it } from "vitest";
import { INITIAL_FILTERS, filtersToQuery, parseFilters } from "@/features/discovery/filters-url";
import type { FilterState } from "@/features/discovery/filters-url";

const FULL: FilterState = {
  query: "sippin",
  tags: ["work", "view"],
  life: ["quiet", "pet-friendly"],
  area: "lakeside",
  maxPrice: 2,
  openNow: true,
  transitionZone: true,
};

describe("INITIAL_FILTERS", () => {
  it("has every option cleared", () => {
    expect(INITIAL_FILTERS).toEqual({
      query: "",
      tags: [],
      life: [],
      area: null,
      maxPrice: 0,
      openNow: false,
      transitionZone: false,
    });
  });
});

describe("filtersToQuery", () => {
  it("returns an empty string when nothing is set", () => {
    expect(filtersToQuery(INITIAL_FILTERS)).toBe("");
  });

  it("serializes every active filter", () => {
    const params = new URLSearchParams(filtersToQuery(FULL));
    expect(params.get("q")).toBe("sippin");
    expect(params.get("tag")).toBe("work,view");
    expect(params.get("life")).toBe("quiet,pet-friendly");
    expect(params.get("area")).toBe("lakeside");
    expect(params.get("price")).toBe("2");
    expect(params.get("open")).toBe("1");
    expect(params.get("zone")).toBe("1");
  });

  it("trims the query before serializing", () => {
    expect(filtersToQuery({ ...INITIAL_FILTERS, query: "  sippin  " })).toContain("q=sippin");
    expect(filtersToQuery({ ...INITIAL_FILTERS, query: "   " })).toBe("");
  });
});

describe("parseFilters", () => {
  it("round-trips a serialized filter state", () => {
    expect(parseFilters(`?${filtersToQuery(FULL)}`)).toEqual(FULL);
  });

  it("parses a bare search string", () => {
    const f = parseFilters("?tag=view&q=latte&area=maeka-uni");
    expect(f.tags).toEqual(["view"]);
    expect(f.query).toBe("latte");
    expect(f.area).toBe("maeka-uni");
    expect(f.maxPrice).toBe(0);
    expect(f.openNow).toBe(false);
  });

  it("ignores unknown tag/lifestyle values but keeps valid ones", () => {
    const f = parseFilters("?tag=view,bogus&life=wifi,nope");
    expect(f.tags).toEqual(["view"]);
    expect(f.life).toEqual(["wifi"]);
  });

  it("trims whitespace inside CSV values", () => {
    expect(parseFilters("?tag= view , work ")).toEqual(
      expect.objectContaining({ tags: ["view", "work"] })
    );
  });

  it("rejects unknown areas and prices", () => {
    expect(parseFilters("?area=downtown").area).toBeNull();
    expect(parseFilters("?price=3").maxPrice).toBe(0);
    expect(parseFilters("?price=abc").maxPrice).toBe(0);
  });

  it("treats only '1' as true for boolean flags", () => {
    expect(parseFilters("?open=1").openNow).toBe(true);
    expect(parseFilters("?open=yes").openNow).toBe(false);
    expect(parseFilters("?zone=1").transitionZone).toBe(true);
    expect(parseFilters("?zone=0").transitionZone).toBe(false);
  });
});
