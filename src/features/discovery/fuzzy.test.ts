import { describe, expect, it } from "vitest";
import { fuzzyMatch } from "@/features/discovery/fuzzy";

describe("fuzzyMatch", () => {
  it("returns null for an empty query", () => {
    expect(fuzzyMatch("Sippin Cafe", "")).toBeNull();
    expect(fuzzyMatch("Sippin Cafe", "   ")).toBeNull();
  });

  it("matches exact substrings with the highest score", () => {
    expect(fuzzyMatch("Sippin Cafe", "sippin")).toBe(100);
    expect(fuzzyMatch("xy sippin", "sippin")).toBe(97);
    // Thai substring beats every weaker strategy but its exact score depends
    // on UTF-16 code-unit positions of combining marks — keep it bounded.
    expect(fuzzyMatch("บ้านบานน์ ริมกว๊าน", "ริมกว๊าน")).toBeGreaterThan(80);
  });

  it("prefers earlier occurrences", () => {
    const early = fuzzyMatch("abca", "a");
    const late = fuzzyMatch("bcaa", "a");
    expect(early).toBeGreaterThan(late!);
  });

  it("is case-insensitive and collapses whitespace on both sides", () => {
    expect(fuzzyMatch("SIPPIN   CAFE", " sippin ")).toBe(100);
    expect(fuzzyMatch("sippin cafe", "Sippin")).toBe(100);
  });

  it("scores whole-word token prefixes at 80", () => {
    // "บ้าน" and "ริม" are prefixes of hay tokens but not a contiguous substring
    expect(fuzzyMatch("บ้านบานน์ ริมกว๊าน", "บ้าน ริม")).toBe(80);
  });

  it("scores in-order subsequences (>=3 chars) at 55", () => {
    expect(fuzzyMatch("sippin cafe", "sipn")).toBe(55);
    expect(fuzzyMatch("coffee corner", "cofcor")).toBe(55);
  });

  it("does not use subsequence matching for very short queries", () => {
    // "sn" is a subsequence of "sippin cafe" but too short to qualify
    expect(fuzzyMatch("sippin cafe", "sn")).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(fuzzyMatch("sippin cafe", "zzz")).toBeNull();
    expect(fuzzyMatch("คาเฟ่ริมกว๊าน", "โรงแรม")).toBeNull();
  });

  it("ranks exact above token-prefix above subsequence", () => {
    const exact = fuzzyMatch("moonlight", "moon")!;
    const prefix = fuzzyMatch("moonbeam light", "moon light")!;
    const subseq = fuzzyMatch("moonlight", "moligt")!;
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(subseq);
  });
});
