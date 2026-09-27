import { describe, it, expect } from "vitest";
import { CAFES } from "@/features/cafes/data/cafes";
import { cafeFromRow, cafeToRow } from "@/features/cafes/cafe-row";
import { scoreCafe, rankCafes } from "@/features/discovery/cafe-search";
import { localRecommendations, validatedSlugs } from "@/features/assistant/cafe-assistant";
import { fuzzyMatch } from "@/features/discovery/fuzzy";
describe("cafe feature boundaries", () => {
  it("preserves existing fields through the SQL mapper", () => {
    for (const cafe of CAFES) expect(cafeFromRow(cafeToRow(cafe))).toEqual({ ...cafe, phone: cafe.phone });
  });
  it("finds Thai late-opening intent through stored tags", () => {
    const results = rankCafes(CAFES, "ร้านเปิดดึก");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(c => c.lifestyleTags.includes("open-late"))).toBe(true);
  });
  it("matches work and relaxation queries", () => {
    expect(rankCafes(CAFES, "คาเฟ่เหมาะอ่านหนังสือ").length).toBeGreaterThan(0);
    expect(rankCafes(CAFES, "อยากพักผ่อนฮีลใจ").length).toBeGreaterThan(0);
  });
  it("does not claim pet-friendly shops are animal cafes", () => {
    expect(rankCafes(CAFES, "คาเฟ่แมว")).toEqual([]);
  });
  it("accepts one-letter typos without unrelated names", () => {
    expect(fuzzyMatch("Sippin Cafe", "sippim")).toBe(45);
    expect(fuzzyMatch("Sippin Cafe", "library")).toBeNull();
  });
  it("ranks exact names above lifestyle matches", () => {
    expect(scoreCafe(CAFES[0], CAFES[0].name.th)).toBeGreaterThan(scoreCafe(CAFES[0], "ทำงาน"));
  });
  it("answers named-cafe opening-hour questions", () => {
    expect(localRecommendations(CAFES, "บ้านบานน์เปิดกี่โมง")[0].slug).toBe("baan-baann");
  });
  it("declines another province and unrelated topics", () => {
    expect(localRecommendations(CAFES, "ร้านอ่านหนังสือเชียงใหม่")).toEqual([]);
    expect(localRecommendations(CAFES, "ช่วยเขียนโปรแกรมให้หน่อย")).toEqual([]);
  });
  it("rejects model-generated unknown slugs and duplicates", () => {
    expect(validatedSlugs(["fake", CAFES[0].slug, CAFES[0].slug, 42], CAFES)).toEqual([CAFES[0].slug]);
    expect(validatedSlugs({ slug: CAFES[0].slug }, CAFES)).toEqual([]);
  });
});
