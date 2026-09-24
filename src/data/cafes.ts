export type Lang = "th" | "en";

export interface LocalText {
  th: string;
  en: string;
}

export type CafeTag = string;
export type LifeStyleTag = string;

export type CafeArea = "lakeside" | "maeka-uni";

export const AREA_META: Record<CafeArea, { label: LocalText; emoji: string }> = {
  lakeside: { label: { th: "ริมกว๊าน–ในเมือง", en: "Lakeside & Old Town" }, emoji: "🌊" },
  "maeka-uni": { label: { th: "แม่กา–ม.พะเยา", en: "Mae Ka & University of Phayao" }, emoji: "🎓" },
};

export const AREA_ORDER: CafeArea[] = ["lakeside", "maeka-uni"];

export interface Cafe {
  slug: string;
  name: LocalText;
  description: LocalText;
  address: LocalText;
  phone?: string;
  openTime: string;
  closeTime: string;
  closedDays: number[];
  priceRange: 1 | 2;
  tags: CafeTag[];
  lifestyleTags: LifeStyleTag[];
  area: CafeArea;
  lat: number;
  lng: number;
  photo?: string;
  menuHighlights: LocalText[];
  baseRating: number;
}

export const TAG_META: Record<string, { label: LocalText; emoji: string }> = {
  work: { label: { th: "เหมาะทำงาน", en: "Good for work" }, emoji: "💻" },
  chill: { label: { th: "นั่งชิล", en: "Chill" }, emoji: "🌿" },
  view: { label: { th: "วิวสวย", en: "Scenic view" }, emoji: "🌅" },
  dessert: { label: { th: "ขนมหวาน", en: "Desserts" }, emoji: "🍰" },
};

export const TAG_ORDER: CafeTag[] = ["work", "chill", "view", "dessert"];

export function cafeTagMeta(tag: CafeTag) {
  return TAG_META[tag] ?? { label: { th: tag, en: tag }, emoji: "☕" };
}

export const LIFESTYLE_META: Record<string, { label: LocalText; emoji: string }> = {
  quiet: { label: { th: "เงียบสงบ", en: "Quiet" }, emoji: "🤫" },
  wifi: { label: { th: "Wi-Fi แรง", en: "Strong Wi-Fi" }, emoji: "📶" },
  "pet-friendly": { label: { th: "พาสัตว์เลี้ยงได้", en: "Pet friendly" }, emoji: "🐾" },
  parking: { label: { th: "มีที่จอดรถ", en: "Parking" }, emoji: "🅿️" },
  "open-late": { label: { th: "เปิดถึงค่ำ", en: "Open late" }, emoji: "🌙" },
  photo: { label: { th: "มุมถ่ายรูป", en: "Photogenic" }, emoji: "📸" },
  family: { label: { th: "เหมาะครอบครัว", en: "Family friendly" }, emoji: "👨‍👩‍👧" },
};

export const LIFESTYLE_ORDER: LifeStyleTag[] = [
  "quiet",
  "wifi",
  "pet-friendly",
  "parking",
  "open-late",
  "photo",
  "family",
];

export function lifestyleTagMeta(tag: LifeStyleTag) {
  return LIFESTYLE_META[tag] ?? { label: { th: tag, en: tag }, emoji: "✓" };
}

import enriched from "./cafes.enriched.json";
import baseRegistry from "./cafes.base.json";

interface EnrichedEntry {
  lat?: number;
  lng?: number;
  photo?: string;
}

const BASE = baseRegistry as Record<string, { lat: number; lng: number }>;

const OVERRIDES = enriched as Record<string, EnrichedEntry>;

function applyOverrides(cafe: Cafe): Cafe {
  const o = OVERRIDES[cafe.slug];
  if (!o) return cafe;
  return {
    ...cafe,
    ...(o.lat !== undefined && { lat: o.lat }),
    ...(o.lng !== undefined && { lng: o.lng }),
    ...(o.photo !== undefined && { photo: o.photo }),
  };
}

export function mapsUrl(cafe: Cafe): string {
  return `https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lng}`;
}

const RAW_CAFES: Omit<Cafe, "lat" | "lng">[] = [
  {
    slug: "baan-baann",
    name: { th: "บ้านบานน์", en: "Baan Baann" },
    description: {
      th: "คาเฟ่บ้านไม้เก่าริมกว๊านพะเยา ตกแต่งวินเทจผสมร่วมสมัย เลือกเมล็ดกาแฟ specialty ได้หลากหลาย บรรยากาศเงียบสงบ เหมาะทั้งนั่งทำงานและนั่งเล่น",
      en: "A renovated wooden house cafe by Kwan Phayao lake, blending vintage and contemporary decor with a wide selection of specialty beans and a calm atmosphere.",
    },
    address: {
      th: "ถนนชายกว๊าน ตำบลเวียง (ติดโรงแรมชายกว๊าน)",
      en: "Chai Kwan Rd, Wiang (next to Chai Kwan Hotel)",
    },
    openTime: "07:00",
    closeTime: "16:00",
    closedDays: [2],
    priceRange: 2,
    tags: ["chill", "work", "dessert"],
    lifestyleTags: ["quiet", "wifi", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "อเมริกาโน่เย็น เลือกเมล็ดได้", en: "Iced Americano with bean choice" },
      { th: "เบเกอรี่โฮมเมด", en: "Homemade bakery" },
    ],
    baseRating: 4.6,
  },
  {
    slug: "lakeland-cafe",
    name: { th: "LakeLand Cafe", en: "LakeLand Cafe" },
    description: {
      th: "คาเฟ่ในซอยใกล้ถนนริมกว๊าน การตกแต่งภายในดีมาก เหมาะกับนั่งทำงานหรือนั่งชิลทั้งวัน",
      en: "A cafe tucked in a lane off the lakeside road with lovely interior design — great for working or lounging all day.",
    },
    address: { th: "ถนนริมกว๊าน ตำบลเวียง", en: "Rim Kwan Rd, Wiang" },
    openTime: "10:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["work", "chill"],
    lifestyleTags: ["wifi", "quiet", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "ลาเต้", en: "Latte" },
      { th: "ชีสเค้ก", en: "Cheesecake" },
    ],
    baseRating: 4.4,
  },
  {
    slug: "sippin-cafe",
    name: { th: "Sippin Cafe", en: "Sippin Cafe" },
    description: {
      th: "คาเฟ่เล็ก ๆ กลางเมืองพะเยา บรรยากาศเงียบ เจ้าของชงกาแฟใส่ใจ แนะนำเมนูตามรสนิยมได้เป็นอย่างดี",
      en: "A small cozy cafe in central Phayao where the owner brews with care and happily recommends drinks to suit your taste.",
    },
    address: { th: "ในเมืองพะเยา ใกล้ถนนริมกว๊าน", en: "Central Phayao, near Rim Kwan Rd" },
    openTime: "09:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["work", "chill"],
    lifestyleTags: ["quiet", "wifi"],
    area: "lakeside",
    menuHighlights: [
      { th: "ลาเต้ร้อน", en: "Hot latte" },
      { th: "โฮมเมดโกโก้", en: "Homemade cocoa" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "at-home-cafe",
    name: { th: "At Home Cafe", en: "At Home Cafe" },
    description: {
      th: "คาเฟ่อบอุ่นใจกลางเมือง ให้อารมณ์เหมือนนั่งเล่นบ้านเพื่อน เค้กโฮมเมดและของหวานราคาเข้าถึงง่าย",
      en: "A warm little cafe in the city centre that feels like sitting in a friend's home, with affordable homemade cakes and sweets.",
    },
    address: { th: "ในเมืองพะเยา", en: "Central Phayao" },
    openTime: "08:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 1,
    tags: ["dessert", "chill"],
    lifestyleTags: ["family", "photo"],
    area: "lakeside",
    menuHighlights: [
      { th: "เค้กโฮมเมด", en: "Homemade cakes" },
      { th: "กาแฟดำโฮลซีล", en: "Black coffee" },
    ],
    baseRating: 4.3,
  },
  {
    slug: "nitan-ban-tonmai",
    name: { th: "นิทานบ้านต้นไม้", en: "Nitan Ban Ton Mai" },
    description: {
      th: "สวนกลางเมืองพะเยา ร่มรื่นด้วยต้นไม้ มีทั้งโซนแอร์และเอ้าท์ดอร์ ขึ้นชื่อเรื่องไอศครีมโฮมเมดและบราวนี่",
      en: "A leafy garden cafe in the middle of town with air-conditioned and outdoor zones, famous for homemade ice cream and brownies.",
    },
    address: { th: "ในเมืองพะเยา ไม่ไกลจากริมกว๊าน", en: "Central Phayao, near the lakefront" },
    openTime: "09:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "chill"],
    lifestyleTags: ["family", "photo", "pet-friendly"],
    area: "lakeside",
    menuHighlights: [
      { th: "ไอศครีมโฮมเมด", en: "Homemade ice cream" },
      { th: "บราวนี่ + ไอศครีม", en: "Brownie with ice cream" },
      { th: "บิงซูผลไม้รวม", en: "Mixed fruit bingsu" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "sweet-cycle",
    name: { th: "Sweet Cycle", en: "Sweet Cycle" },
    description: {
      th: "คาเฟ่น่ารักบนถนนราชวงศ์ เปิดแต่เช้า เจ้าของใส่ใจลูกค้า กาแฟรสชาติดี มุมถ่ายรูปสวย",
      en: "A charming cafe on Ratchawong Road opening early in the morning, with attentive owners, tasty coffee and pretty photo corners.",
    },
    address: { th: "ถนนราชวงศ์ ตำบลเวียง", en: "Ratchawong Rd, Wiang" },
    openTime: "07:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["chill", "dessert"],
    lifestyleTags: ["photo", "quiet"],
    area: "lakeside",
    menuHighlights: [
      { th: "กาแฟโอเลี้ยง", en: "Oliang (Thai iced coffee)" },
      { th: "โรตี", en: "Roti" },
    ],
    baseRating: 4.6,
  },
  {
    slug: "bestpart-cafe",
    name: { th: "BestPart.cafe", en: "BestPart.cafe" },
    description: {
      th: "คาเฟ่มินิมอลโฮมมี่ แสงสวย มุมถ่ายรูปเยอะ กาแฟอร่อยราคาน่ารัก มีขนมให้เลือกทุกวัน",
      en: "A minimal, homey cafe full of photogenic corners and beautiful light, serving tasty coffee at friendly prices with daily bakes.",
    },
    address: {
      th: "โครงการศิรประภาโฮม 3 อำเภอเมือง",
      en: "Siraprapha Home 3 village, Mueang district",
    },
    openTime: "07:30",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "work", "chill"],
    lifestyleTags: ["photo", "wifi", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "คุกกี้เนยสด", en: "Butter cookies" },
      { th: "ลาเต้เย็น", en: "Iced latte" },
    ],
    baseRating: 4.7,
  },
  {
    slug: "scene-cafe",
    name: { th: "Scene Cafe", en: "Scene Cafe" },
    description: {
      th: "คาเฟ่โทนอบอุ่นในซอยสวนดอก ขึ้นชื่อเรื่องบราวนี่และซอฟคุกกี้ เครื่องดื่มราคาดี ถ่ายรูปสวยทุกมุม",
      en: "A warmly toned cafe in Suan Dok lane known for brownies and soft cookies, fairly priced drinks and photo-worthy corners.",
    },
    address: { th: "ซอยสวนดอก ในเมืองพะเยา", en: "Suan Dok lane, central Phayao" },
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "work"],
    lifestyleTags: ["photo", "wifi"],
    area: "lakeside",
    menuHighlights: [
      { th: "บราวนี่ซอฟคุกกี้", en: "Brownie soft cookie" },
      { th: "ชานมไข่มุก", en: "Bubble milk tea" },
    ],
    baseRating: 4.4,
  },
  {
    slug: "the-lake-cafe",
    name: { th: "The Lake Cafe", en: "The Lake Cafe" },
    description: {
      th: "คาเฟ่ริมกว๊านวิวเปิดกว้างเต็มตา เห็นพระอาทิตย์ตกสะท้อนผิวน้ำ มีทั้งโซนอินดอร์และเอ้าท์ดอร์ พร้อมอาหารคาว-หวาน",
      en: "Lakeside cafe with an open panoramic view of Kwan Phayao — catch the sunset reflecting on the water from indoor or outdoor seats.",
    },
    address: { th: "ถนนริมกว๊าน ตำบลเวียง", en: "Rim Kwan Rd, Wiang" },
    openTime: "09:00",
    closeTime: "20:00",
    closedDays: [],
    priceRange: 2,
    tags: ["view", "chill"],
    lifestyleTags: ["photo", "open-late"],
    area: "lakeside",
    menuHighlights: [
      { th: "กาแฟริมน้ำ", en: "Coffee by the water" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "baan-ing-kwan",
    name: { th: "บ้านอิงกว๊าน Bar & Cafe", en: "Baan Ing Kwan Bar & Cafe" },
    description: {
      th: "บ้านรีโนเวทสไตล์มิดเซนจูรี่ริมกว๊าน มุมบาร์ชมวิว เปิดถึงห้าทุ่ม มีเมนูอาหารครบ ทั้งคาวและของหวาน",
      en: "A mid-century renovated house by the lake with a view bar, open until late evening and serving a full menu of food and desserts.",
    },
    address: { th: "306 ถนนพหลโยธิน ตำบลเวียง", en: "306 Phahonyothin Rd, Wiang" },
    phone: "081 615 2705",
    openTime: "10:00",
    closeTime: "22:00",
    closedDays: [],
    priceRange: 2,
    tags: ["view", "chill"],
    lifestyleTags: ["open-late", "photo", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "ค็อกเทล/กาแฟ", en: "Cocktails & coffee" },
      { th: "อาหารเหนือ", en: "Northern Thai dishes" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "norbulingka-coffee",
    name: { th: "Norbulingka Coffee", en: "Norbulingka Coffee" },
    description: {
      th: "ร้านกาแฟสไตล์ทิเบตผสมความเป็นไทย ประดับธงมนต์และภาพวาดเนปาล เปิดตั้งแต่เช้าตรู่ บรรยากาศแปลกตาน่าค้นหา",
      en: "A Tibetan-style Thai coffee shop decorated with prayer flags and Nepalese murals, open from early morning with a unique vibe.",
    },
    address: { th: "637/2 ถนนพหลโยธิน", en: "637/2 Phahonyothin Rd" },
    openTime: "07:00",
    closeTime: "19:00",
    closedDays: [],
    priceRange: 1,
    tags: ["chill", "work"],
    lifestyleTags: ["photo", "quiet", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "กาแฟโบราณ", en: "Traditional Thai coffee" },
      { th: "ชานม", en: "Milk tea" },
    ],
    baseRating: 4.3,
  },
  {
    slug: "mr-handsome-cafe",
    name: { th: "Mr. Handsome Cafe", en: "Mr. Handsome Cafe" },
    description: {
      th: "คาเฟ่สไตล์อินดัสเทรียลลอฟท์แถวมหาวิทยาลัยพะเยา ตกแต่งเอกลักษณ์ มีทั้งกาแฟ ขนม และอาหารจัดเต็ม",
      en: "An industrial-loft style cafe near the University of Phayao with distinctive decor, serving coffee, bakes and proper food.",
    },
    address: { th: "332/1 หมู่ 2 ตำบลแม่กา", en: "332/1 Moo 2, Mae Ka" },
    phone: "086 408 6852",
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [3],
    priceRange: 2,
    tags: ["work", "chill"],
    lifestyleTags: ["wifi", "parking", "family"],
    area: "maeka-uni",
    menuHighlights: [
      { th: "กาแฟสด", en: "Specialty coffee" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    baseRating: 4.6,
  },
  {
    slug: "phayao-coffee-roaster",
    name: { th: "โรงคั่วกาแฟพะเยา", en: "Phayao Coffee Roaster" },
    description: {
      th: "โรงคั่วและคาเฟ่ที่มีเครื่องดื่ม อาหาร และเบเกอรี่ พร้อมพื้นที่สวน ที่จอดรถ และ Wi-Fi",
      en: "A local roastery and cafe serving drinks, food, and bakery, with a garden, parking, and Wi-Fi.",
    },
    address: { th: "59/1 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมืองพะเยา", en: "59/1 Moo 17, Ban Tom, Mueang Phayao" },
    phone: "087-433-9449",
    openTime: "07:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["work", "chill"],
    lifestyleTags: ["wifi", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "กาแฟคั่วสด", en: "Freshly roasted coffee" },
      { th: "อาหารและเบเกอรี่", en: "Food and bakery" },
    ],
    baseRating: 0,
  },
  {
    slug: "premm-cafe",
    name: { th: "เปรม คาเฟ่", en: "PREMM CAFE" },
    description: {
      th: "คาเฟ่โทนขาวดำ มีเครื่องดื่ม กาแฟ เค้ก และอาหารจานเดียว วันอังคารเปิด 10:00–19:00 น. วันอื่น 09:00–17:00 น.",
      en: "A black-and-white themed cafe serving coffee, drinks, cakes, and Thai meals. Open 10:00–19:00 on Tuesdays and 09:00–17:00 on other days.",
    },
    address: { th: "ตำบลบ้านต๋อม อำเภอเมืองพะเยา", en: "Ban Tom, Mueang Phayao" },
    phone: "088-318-9669",
    openTime: "09:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["chill", "dessert"],
    lifestyleTags: ["photo", "wifi", "pet-friendly", "parking"],
    area: "lakeside",
    menuHighlights: [
      { th: "ข้าวซอยไก่เปรม", en: "Premm chicken khao soi" },
      { th: "บลูเบอร์รีชีสเค้ก", en: "Blueberry cheesecake" },
    ],
    baseRating: 5,
  },
  {
    slug: "see-u-again",
    name: { th: "ซียูอะเกน", en: "See U Again" },
    description: {
      th: "คาเฟ่และร้านอาหารใกล้วัดศรีโคมคำ มีทั้งของหวาน เครื่องดื่ม และอาหารจานด่วน",
      en: "A cafe and restaurant near Wat Si Khom Kham, serving desserts, drinks, and quick meals.",
    },
    address: { th: "ถนนพหลโยธิน ตำบลเวียง ใกล้วัดศรีโคมคำ", en: "Phahonyothin Road, Wiang, near Wat Si Khom Kham" },
    phone: "093-150-5001",
    openTime: "10:30",
    closeTime: "20:00",
    closedDays: [],
    priceRange: 1,
    tags: ["chill", "dessert"],
    lifestyleTags: [],
    area: "lakeside",
    menuHighlights: [
      { th: "บิงซู", en: "Bingsu" },
      { th: "ฮันนี่โทสต์", en: "Honey toast" },
    ],
    baseRating: 3.9,
  },
  {
    slug: "baan-ton-tao-coffee-food",
    name: { th: "บ้านต้นเต๊า Coffee&food", en: "Baan Ton Tao Coffee & Food" },
    description: {
      th: "คาเฟ่ในสวนริมลำธารที่บ้านบัว มีเครื่องดื่ม ขนม และอาหาร",
      en: "A garden cafe beside a stream in Ban Bua, serving drinks, desserts, and meals.",
    },
    address: { th: "บ้านบัว ตำบลบ้านตุ่น อำเภอเมืองพะเยา (เลี้ยวขวาก่อนถึงสะพานข้ามลำน้ำ)", en: "Ban Bua, Ban Tun, Mueang Phayao (turn right before the river bridge)" },
    phone: "094-719-2653",
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["chill", "view", "dessert"],
    lifestyleTags: ["family"],
    area: "lakeside",
    menuHighlights: [
      { th: "น้ำผึ้งมะนาวโซดา", en: "Honey lime soda" },
      { th: "อาหารเหนือและเค้ก", en: "Northern Thai dishes and cake" },
    ],
    baseRating: 4.2,
  },
  {
    slug: "one-pastry-bakery",
    name: { th: "One Pastry Bakery Homemade", en: "One Pastry Bakery Homemade" },
    description: {
      th: "ร้านเบเกอรี่โฮมเมดในตำบลแม่กา เปิดช่วงเย็นถึงดึก",
      en: "A homemade bakery in Mae Ka, open from late afternoon into the evening.",
    },
    address: { th: "ตำบลแม่กา อำเภอเมืองพะเยา", en: "Mae Ka, Mueang Phayao" },
    openTime: "16:00",
    closeTime: "23:59",
    closedDays: [],
    priceRange: 1,
    tags: ["dessert"],
    lifestyleTags: [],
    area: "maeka-uni",
    menuHighlights: [
      { th: "เบเกอรี่โฮมเมด", en: "Homemade bakery" },
    ],
    baseRating: 0,
  },
  {
    slug: "baan-matcha-mae-ka",
    name: { th: "Baan Matcha หน้า ม.พะเยา", en: "Baan Matcha (Matcha House)" },
    description: {
      th: "ร้านกาแฟและชาหน้ามหาวิทยาลัยพะเยา มีเมนูมัทฉะและเครื่องดื่ม วันเสาร์เปิด 13:00–17:00 น. วันอื่น 10:00–18:00 น.",
      en: "A coffee and tea cafe near the University of Phayao, with matcha and other drinks. Open 13:00–17:00 on Saturdays and 10:00–18:00 on other days.",
    },
    address: { th: "436/16 ตำบลแม่กา อำเภอเมืองพะเยา", en: "436/16, Mae Ka, Mueang Phayao" },
    phone: "090-607-0335",
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["chill"],
    lifestyleTags: [],
    area: "maeka-uni",
    menuHighlights: [
      { th: "มัทฉะ", en: "Matcha" },
      { th: "กาแฟและชา", en: "Coffee and tea" },
    ],
    baseRating: 0,
  },
];

function withBaseCoords(cafe: Omit<Cafe, "lat" | "lng">): Cafe {
  const base = BASE[cafe.slug];
  if (!base) {
    throw new Error(`cafes.base.json is missing an entry for slug "${cafe.slug}"`);
  }
  return { ...cafe, lat: base.lat, lng: base.lng };
}

export const CAFES: Cafe[] = RAW_CAFES.map(withBaseCoords).map(applyOverrides);
