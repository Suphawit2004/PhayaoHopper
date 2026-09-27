import { describe, expect, it } from "vitest";
import { suggestionPublication } from "@/features/submissions/suggestion-publication";

describe("legacy suggestion publication", () => {
  it("does not invent a management link for an approved legacy suggestion", () => {
    expect(suggestionPublication("legacy-id", [{ slug: "baan-baann" }])).toBeNull();
  });
  it("keeps a real published cafe manageable, including an inactive cafe", () => {
    const rows = [{ slug: "cafe-existing-id", is_active: false }];
    expect(suggestionPublication("existing-id", rows)).toBe("cafe-existing-id");
  });
  it("does not offer recovery when publication state cannot be checked", () => {
    expect(suggestionPublication("legacy-id", null)).toBeUndefined();
  });
});
