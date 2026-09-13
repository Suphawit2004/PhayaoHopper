import {describe,it,expect} from "vitest";
import {CAFES} from "@/data/cafes";
import {filterCafes} from "./filter-cafes";
import {INITIAL_FILTERS,filtersToQuery,parseFilters} from "./filters-url";
const now=new Date("2026-09-11T05:00:00Z");
describe("shared list and map filters",()=>{
 it("keeps complete filters and sorting in a shareable URL",()=>{const filters={...INITIAL_FILTERS,query:"cafe",tags:[CAFES[0].tags[0]],life:CAFES[0].lifestyleTags.slice(0,1),area:CAFES[0].area,maxPrice:2 as const,openNow:true,sort:"name" as const};expect(parseFilters(filtersToQuery(filters))).toEqual(filters);});
 it("uses any category and all facilities",()=>{const cafe=CAFES.find(c=>c.lifestyleTags.length>0)!;const missing=CAFES.flatMap(c=>c.lifestyleTags).find(t=>!cafe.lifestyleTags.includes(t))!;expect(filterCafes([cafe],{...INITIAL_FILTERS,tags:[cafe.tags[0]],life:[...cafe.lifestyleTags,missing]},now)).toEqual([]);expect(filterCafes([cafe],{...INITIAL_FILTERS,tags:[cafe.tags[0]],life:cafe.lifestyleTags},now)).toEqual([cafe]);});
 it("sorts reference ratings without changing which cafes match",()=>{const a=filterCafes(CAFES,INITIAL_FILTERS,now);const b=filterCafes(CAFES,{...INITIAL_FILTERS,sort:"rating"},now);expect(new Set(b.map(c=>c.slug))).toEqual(new Set(a.map(c=>c.slug)));expect(b.every((c,i)=>i===0||b[i-1].baseRating>=c.baseRating)).toBe(true);});
 it("ignores unrecognized sorting from external URLs",()=>expect(parseFilters("?sort=unsafe").sort).toBeUndefined());
});
