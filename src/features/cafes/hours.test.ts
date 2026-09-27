import { describe, expect, it } from "vitest";
import { getOpenStatus, minutesOf, type OpenStatus } from "@/features/cafes/hours";
import type { Cafe } from "@/features/cafes/data/cafes";

function makeCafe(overrides: Partial<Cafe> = {}): Cafe {
  return {
    slug: "test-cafe",
    name: { th: "ทดสอบ", en: "Test" },
    description: { th: "", en: "" },
    address: { th: "", en: "" },
    openTime: "08:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 1,
    tags: [],
    lifestyleTags: [],
    area: "lakeside",
    lat: 19.16,
    lng: 99.89,
    menuHighlights: [],
    baseRating: 4.5,
    ...overrides,
  };
}

// Bangkok is UTC+7 year-round, so Bangkok wall-clock time maps to UTC-7.
// Mon = 2026-08-24, Tue = 2026-08-25, Sun = 2026-08-23 (JS getDay: Sun=0)
function bangkok(day: number, hour: number, minute = 0): Date {
  const date = 23 + day; // day: 0=Sun … 2=Tue
  return new Date(Date.UTC(2026, 7, date, hour - 7, minute));
}

const MON = 1;
const TUE = 2;
const SUN = 0;

describe("minutesOf", () => {
  it("converts HH:MM to minutes", () => {
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("08:30")).toBe(510);
    expect(minutesOf("23:59")).toBe(1439);
  });
});

describe("getOpenStatus — same-day session", () => {
  const cafe = makeCafe(); // 08:00–17:00, never closed

  it("is open mid-session", () => {
    expect(getOpenStatus(cafe, bangkok(MON, 11))).toEqual({
      isOpenToday: true,
      isOpenNow: true,
    } satisfies OpenStatus);
  });

  it("is not open before opening time", () => {
    expect(getOpenStatus(cafe, bangkok(MON, 6, 30)).isOpenNow).toBe(false);
  });

  it("opens exactly at opening time", () => {
    expect(getOpenStatus(cafe, bangkok(MON, 8)).isOpenNow).toBe(true);
  });

  it("closes exactly at closing time", () => {
    expect(getOpenStatus(cafe, bangkok(MON, 17)).isOpenNow).toBe(false);
  });

  it("is not open after closing time", () => {
    const status = getOpenStatus(cafe, bangkok(MON, 20));
    expect(status.isOpenToday).toBe(true);
    expect(status.isOpenNow).toBe(false);
  });
});

describe("getOpenStatus — closed days", () => {
  const cafe = makeCafe({ closedDays: [MON] }); // closes every Monday

  it("reports closed all day on its closing weekday", () => {
    const status = getOpenStatus(cafe, bangkok(MON, 12));
    expect(status).toEqual({ isOpenToday: false, isOpenNow: false });
  });

  it("operates normally on other days", () => {
    const status = getOpenStatus(cafe, bangkok(TUE, 12));
    expect(status.isOpenToday).toBe(true);
    expect(status.isOpenNow).toBe(true);
  });
});

describe("getOpenStatus — overnight session (20:00 → 02:00)", () => {
  const cafe = makeCafe({ openTime: "20:00", closeTime: "02:00" });

  it("is open during the evening part before midnight", () => {
    expect(getOpenStatus(cafe, bangkok(MON, 23)).isOpenNow).toBe(true);
  });

  it("is open during the spillover part after midnight", () => {
    expect(getOpenStatus(cafe, bangkok(TUE, 1)).isOpenNow).toBe(true);
  });

  it("is not open in the small hours after the session ends", () => {
    const status = getOpenStatus(cafe, bangkok(TUE, 3));
    expect(status.isOpenToday).toBe(true);
    expect(status.isOpenNow).toBe(false);
  });

  it("blocks the overnight spillover when yesterday was a closed day", () => {
    const cafeClosedMondays = makeCafe({
      openTime: "20:00",
      closeTime: "02:00",
      closedDays: [MON],
    });
    // Tuesday 01:00 — the session that started Monday is cancelled
    expect(getOpenStatus(cafeClosedMondays, bangkok(TUE, 1)).isOpenNow).toBe(false);
  });

  it("still opens on its own evening session after a closed day", () => {
    const cafeClosedMondays = makeCafe({
      openTime: "20:00",
      closeTime: "02:00",
      closedDays: [SUN],
    });
    // Monday 23:00 — today's own session runs even though Sunday was closed
    expect(getOpenStatus(cafeClosedMondays, bangkok(MON, 23)).isOpenNow).toBe(true);
  });
});

describe("getOpenStatus — around-the-clock cafes", () => {
  const cafe = makeCafe({ openTime: "00:00", closeTime: "00:00" });

  it("is open at any hour of an operating day", () => {
    for (const hour of [3, 9, 15, 21]) {
      expect(getOpenStatus(cafe, bangkok(MON, hour)).isOpenNow).toBe(true);
    }
  });

  it("is closed on its closing weekday", () => {
    const cafeClosedSundays = makeCafe({
      openTime: "00:00",
      closeTime: "00:00",
      closedDays: [SUN],
    });
    expect(getOpenStatus(cafeClosedSundays, bangkok(SUN, 12))).toEqual({
      isOpenToday: false,
      isOpenNow: false,
    });
  });
});
