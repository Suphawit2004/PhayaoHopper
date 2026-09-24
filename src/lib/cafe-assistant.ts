import type { Cafe, Lang } from "@/data/cafes";
import { rankCafes } from "./cafe-search";

const generalRecommendation = /^(แนะนำคาเฟ่|แนะนำร้าน|คาเฟ่เมืองพะเยา|cafe recommendations)[?!\s]*$/i;

export function localRecommendations(cafes: Cafe[], query: string): Cafe[] {
  if (/เชียงใหม่|เชียงราย|กรุงเทพ|ลำปาง|bangkok|chiang mai|chiang rai/i.test(query)) return [];
  if (generalRecommendation.test(query.trim())) return [...cafes].sort((a, b) => b.baseRating - a.baseRating).slice(0, 5);
  const results = rankCafes(cafes, query);
  if (results.length) return results.slice(0, 5);
  // A named cafe may appear inside a question such as "บ้านบานน์เปิดกี่โมง".
  return cafes.filter(c => [c.name.th, c.name.en].some(n => n.length > 2 && query.toLowerCase().includes(n.toLowerCase()))).slice(0, 5);
}

export function isGeneralRecommendation(query: string): boolean {
  return generalRecommendation.test(query.trim());
}

export function catalogueFactAnswer(cafes: Cafe[], query: string, lang: Lang): string | null {
  if (!/เปิด|ปิด|เวลา|กี่โมง|open|clos|hours?/i.test(query)) return null;
  const named = cafes.filter(cafe => [cafe.name.th, cafe.name.en].some(name => name.length > 2 && query.toLocaleLowerCase().includes(name.toLocaleLowerCase())));
  if (named.length !== 1) return null;
  const cafe = named[0];
  const name = cafe.name[lang];
  if (!cafe.openTime || !cafe.closeTime) return lang === "th"
    ? `ยังไม่มีเวลาเปิด–ปิดของ ${name} ในระบบ`
    : `Opening hours for ${name} are not listed in the catalogue.`;
  const days = lang === "th" ? ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const closed = cafe.closedDays.map(day => days[day]).filter(Boolean);
  return lang === "th"
    ? `${name} บันทึกเวลาเปิดไว้ ${cafe.openTime}–${cafe.closeTime} น. ${closed.length ? `หยุดวัน${closed.join(" และวัน")}` : "ระบบไม่ได้ระบุวันหยุด"} เวลาอาจเปลี่ยนได้ ควรตรวจสอบกับร้านก่อนเดินทาง`
    : `${name} is listed as open ${cafe.openTime}–${cafe.closeTime}. ${closed.length ? `Closed on ${closed.join(" and ")}.` : "No closed days are listed."} Hours may change; please check with the cafe before visiting.`;
}

export function validatedSlugs(value: unknown, cafes: Cafe[]): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(cafes.map(c => c.slug));
  return [...new Set(value.filter((slug): slug is string => typeof slug === "string" && known.has(slug)))].slice(0, 5);
}

// Never render model-provided URLs. Only server-built catalogue links are exposed.
export function validatedAnswer(value: unknown, cafes: Cafe[]): {answer: string; slugs: string[]} | null {
  if (!value || typeof value !== "object" || !("answer" in value) || !("slugs" in value)) return null;
  if (typeof value.answer !== "string" || !value.answer.trim() || value.answer.length > 3000 || /https?:|www\.|\]\s*\(|\/cafes\//i.test(value.answer)) return null;
  if (!Array.isArray(value.slugs) || value.slugs.length > 5) return null;
  const slugs = validatedSlugs(value.slugs, cafes);
  if (slugs.length !== value.slugs.length) return null;
  return { answer: value.answer.trim(), slugs };
}
