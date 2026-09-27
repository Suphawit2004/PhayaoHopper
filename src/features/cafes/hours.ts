import type { Cafe } from "@/features/cafes/data/cafes";

export interface OpenStatus {
  isOpenToday: boolean;
  isOpenNow: boolean;
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function getOpenStatus(cafe: Cafe, dateObj: Date = new Date()): OpenStatus {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(dateObj);
  let dayStr = "", h = 0, m = 0;
  for (const p of parts) {
    if (p.type === "weekday") dayStr = p.value;
    else if (p.type === "hour") h = parseInt(p.value, 10);
    else if (p.type === "minute") m = parseInt(p.value, 10);
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIndex = days.indexOf(dayStr);
  const prevDayIndex = (dayIndex + 6) % 7;

  const cur = h * 60 + m;
  const start = minutesOf(cafe.openTime);
  const end = minutesOf(cafe.closeTime);

  const closedToday = cafe.closedDays.includes(dayIndex);
  const closedYesterday = cafe.closedDays.includes(prevDayIndex);

  // Equal open/close times are treated as open around the clock
  if (!closedToday && start === end) {
    return { isOpenToday: true, isOpenNow: true };
  }

  const crossesMidnight = end < start;

  let isOpenNow = false;
  // Overnight session spilling over from yesterday (e.g. yesterday 20:00 -> today 02:00)
  if (crossesMidnight && !closedYesterday && cur < end) {
    isOpenNow = true;
  }
  // Today's own session
  if (!closedToday && (crossesMidnight ? cur >= start : cur >= start && cur < end)) {
    isOpenNow = true;
  }

  return { isOpenToday: !closedToday, isOpenNow };
}
