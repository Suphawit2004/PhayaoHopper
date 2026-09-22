import type { Cafe } from "@/data/cafes";
import { rankCafes } from "./cafe-search";

export function localRecommendations(cafes: Cafe[], query: string): Cafe[] {
  if (/เชียงใหม่|เชียงราย|กรุงเทพ|ลำปาง|bangkok|chiang mai|chiang rai/i.test(query)) return [];
  const results = rankCafes(cafes, query);
  if (results.length) return results.slice(0, 5);
  if (/^(แนะนำคาเฟ่|แนะนำร้าน|คาเฟ่เมืองพะเยา|cafe recommendations)[?!\s]*$/i.test(query.trim())) return cafes.slice(0, 5);
  // A named cafe may appear inside a question such as "บ้านบานน์เปิดกี่โมง".
  return cafes.filter(c => [c.name.th, c.name.en].some(n => n.length > 2 && query.toLowerCase().includes(n.toLowerCase()))).slice(0, 5);
}

export function validatedSlugs(value: unknown, cafes: Cafe[]): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(cafes.map(c => c.slug));
  return [...new Set(value.filter((slug): slug is string => typeof slug === "string" && known.has(slug)))].slice(0, 5);
}

// Never render model-provided URLs. Only server-built catalogue links are exposed.
export function validatedAnswer(value: unknown, cafes: Cafe[]): { answer: string; slugs: string[] } | null {
  if (!value || typeof value !== "object" || !("answer" in value) || !("slugs" in value)) return null;
  if (typeof value.answer !== "string" || !value.answer.trim() || value.answer.length > 3000 || /https?:|www\.|\]\s*\(|\/cafes\//i.test(value.answer)) return null;
  if (!Array.isArray(value.slugs) || value.slugs.length > 5) return null;
  const slugs = validatedSlugs(value.slugs, cafes);
  if (slugs.length !== value.slugs.length) return null;
  return { answer: value.answer.trim(), slugs };
}

