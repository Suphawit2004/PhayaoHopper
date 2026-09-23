import { type Cafe, cafeTagMeta, lifestyleTagMeta } from "@/data/cafes";
import { fuzzyMatch } from "./fuzzy";

const intents: [RegExp, string[]][] = [
  [/ทำงาน|อ่านหนังสือ|work|study/i, ["work", "quiet", "wifi"]],
  [/พักผ่อน|ฮีลใจ|ผ่อนคลาย|ชิล|relax|chill/i, ["chill", "quiet"]],
  [/ธรรมชาติ|วิว|nature|scenic/i, ["view"]],
  [/เปิดดึก|ถึงค่ำ|กลางคืน|late/i, ["open-late"]],
  [/พาสัตว์|สัตว์เลี้ยงเข้า|pet.friendly/i, ["pet-friendly"]],
  [/ถ่ายรูป|photo/i, ["photo"]],
  [/ขนม|เค้ก|dessert|cake/i, ["dessert"]],
];

export function scoreCafe(cafe: Cafe, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const tags = [...cafe.tags, ...cafe.lifestyleTags];
  const labels = [...cafe.tags.map(cafeTagMeta).map(meta => meta.label), ...cafe.lifestyleTags.map(lifestyleTagMeta).map(meta => meta.label)];
  const text = [cafe.description.th, cafe.description.en, cafe.address.th, cafe.address.en,
    ...labels.flatMap(l => [l.th, l.en]), ...tags].join(" ").toLowerCase();
  const intent = intents.filter(([re]) => re.test(q)).flatMap(([, names]) => names);
  return Math.max(fuzzyMatch(cafe.name.th, q) ?? -1, fuzzyMatch(cafe.name.en, q) ?? -1,
    text.includes(q) ? 40 : -1, intent.some(t => tags.includes(t as typeof tags[number])) ? 35 : -1);
}

export function rankCafes(cafes: Cafe[], query: string) {
  return cafes.map(cafe => ({ cafe, score: scoreCafe(cafe, query) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.cafe);
}
