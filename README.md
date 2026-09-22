# PhayaoHopper ☕

รวมคาเฟ่น่านั่งในเมืองพะเยา ทั้งริมกว๊านถึงโซนมหาวิทยาลัย พร้อมพิกัด เวลาเปิด-ปิด เมนูแนะนำ แผนที่ และรีวิว
A curated guide to cafes in Phayao, Thailand — with map, reviews, filters and fuzzy search.

## Features

- 🏪 **ทำเลคาเฟ่** — 12+ ร้านใน 2 โซน (Lakeside & Old Town / Mae Ka & University) พร้อมตำแหน่งที่ตรวจสอบแล้วบน Leaflet map
- 🔍 **ค้นหาแบบ fuzzy** — พิมพ์ชื่อไม่ครบ/สะกดเพี้ยนก็เจอ จาก search bar บน navbar ทุกหน้า
- 🎛️ **ตัวกรอง** — แท็กบรรยากาศ, ไลฟ์สไตล์, โซน, ช่วงราคา, เปิดตอนนี้, โซนระหว่างกลาง (ระยะจากแนวถนนกว๊าน–ม.พะเยา)
- 🔗 **Shareable URL** — สถานะตัวกรอง sync กับ query params ของ `/cafes` ก๊อปลิงก์ส่งต่อได้
- ❤️ **รายการโปรด** — guest เก็บใน localStorage, login แล้ว merge เข้าฐานข้อมูลอัตโนมัติ
- ⭐ **รีวิว + กันสแปม** — รีวิวสาธารณะ จำกัดความถี่ต่อ IP (in-memory sliding window) และ admin ลบได้
- 📮 **แนะนำร้านใหม่ / รายงานข้อมูล** — ฟอร์มแนะนำพร้อม pin picker + อัปโหลดรูป, dialog รายงานข้อมูลไม่ถูกต้องในหน้าร้าน
- 🛠️ **Admin panel (`/admin`)** — อนุมัติ/ปฏิเสธร้านที่แนะนำ, ปิดรายงาน, ลบรีวิว (สิทธิ์ผ่าน RLS `is_admin()`)
- 👤 สมัครและเข้าสู่ระบบด้วยอีเมล/รหัสผ่านหรือ Magic Link พร้อมแก้โปรไฟล์ รูป และรหัสผ่าน
- ☕ **เจ้าของร้าน (`/owner`)** — แก้รายละเอียด เวลาเปิดปิด รูป เมนู ราคา และสถานะหมด พร้อมสิทธิ์แยกตามร้าน
- 📷 รูปสมาชิกเลือกเผยแพร่หรือเก็บส่วนตัวได้ ผู้ดูแลจัดการรูปได้
- 🎫 **สมาชิก (`/membership`)** — บัตรสมาชิกและส่วนลดจำลอง 10% ที่ระบุชัดเจนว่าใช้กับร้านจริงไม่ได้
- 💬 **ผู้ช่วย (`/chat`)** — แนะนำจากข้อมูลคาเฟ่ในเมืองพะเยา รองรับ AI เมื่อกำหนดค่าฝั่งเซิร์ฟเวอร์
- 🌐 **สองภาษา th/en** · 📱 responsive มือถือ–แท็บเล็ต · SEO (sitemap, robots, OG image)

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth Magic Link + Storage + RLS)
- Leaflet / react-leaflet
- Vitest + GitHub Actions CI

## Getting Started

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าของโปรเจกต์คุณ
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL สำหรับ metadata/sitemap |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ไม่บังคับ; ใช้เปิด Gemini ฝั่งเซิร์ฟเวอร์ ห้ามตั้งเป็น NEXT_PUBLIC |

### ตั้งค่า Supabase

1. สำหรับฐานข้อมูลใหม่เท่านั้น: SQL Editor → รัน `supabase/schema.sql`
   สร้างตาราง: `reviews`, `profiles`, `favorites`, `cafe_suggestions`, `data_reports`, `admins`
   + RLS policies + storage bucket `cafe-suggestions`
   จากนั้นรัน migrations ตามลำดับ: `20260825000000_profile_avatar_and_review_deletion.sql` และ `20260907083438_complete_cafe_features.sql` อย่างละหนึ่งครั้ง
   สำหรับฐานข้อมูลที่ใช้งานอยู่ ให้ตรวจ schema เดิมและประวัติ migration ก่อน ห้ามรัน schema.sql ทับค่าจริงโดยตรง
2. Authentication → Providers → Email → เปิดการสมัครด้วยอีเมล และตั้งค่าการยืนยันอีเมล
3. Authentication → URL Configuration → เพิ่ม Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.example/auth/callback`

### เพิ่ม Admin

```sql
insert into public.admins (email) values ('you@example.com')
on conflict do nothing;
```

อีเมลนี้ต้อง login ผ่าน Magic Link แล้วจึงเข้า `/admin` ได้ (สิทธิ์ตรวจฝั่ง server ทุก action)

## Content Workflow — เพิ่มคาเฟ่ใหม่

1. ผู้ใช้ส่งผ่านหน้า `/suggest` → ข้อมูลเข้าตาราง `cafe_suggestions` (+ รูปใน storage)
2. Admin ตรวจที่อยู่และเวลาเปิดปิดใน `/admin` และยืนยันว่าร้านอยู่ในอำเภอเมืองพะเยาก่อนอนุมัติ
3. การอนุมัติเพิ่มร้านใน `cafes` และเปลี่ยนสถานะใน transaction เดียว ร้านปรากฏบนเว็บโดยไม่ต้อง deploy ใหม่
4. Admin เปิดหน้าจัดการร้านเพื่อแก้ข้อมูล/รูป/เมนู หรือให้สิทธิ์เจ้าของร้านด้วยรหัสสมาชิก

ข้อมูลหลักมาจาก Supabase; `src/data/cafes.ts` ใช้เป็น seed และโหมดที่ยังไม่ตั้งค่า Supabase เท่านั้น
AI แนะนำเฉพาะ slug ที่มีใน catalogue และจำกัดสมาชิก 30 ครั้งต่อวัน หากไม่มี key หรือบริการขัดข้องจะใช้การค้นหาจากข้อมูลร้านพร้อมแสดงโหมดให้ผู้ใช้เห็น
รูปส่วนตัวใช้ private bucket และ signed URL อายุ 60 วินาที หลังซ่อนรูป URL ที่ออกไปแล้วอาจยังเปิดได้จนหมดอายุ

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest (unit tests) |
| `npm run test:db` | ทดสอบ SQL จริงและ RLS ด้วย PGlite ในฐานข้อมูลจำลอง |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run cafes:pins` | Sync pins.txt → enriched cafe data |

## Deployment

Deploy บน [Vercel](https://vercel.com/new) โดยเลือก Framework Preset เป็น **Next.js**, root เป็นราก repository, build command `npm run build` และ output directory ใช้ค่าเริ่มต้น
ใช้ env vars 3 ตัวข้างบนที่ตรงกับ Supabase project เดียวกัน ตั้ง Site URL และ `<domain>/auth/callback` ใน Supabase ให้เป็นโดเมนจริง
รัน migration ให้สำเร็จก่อนเผยแพร่โค้ด จากนั้นตรวจ `/cafes`, `/chat`, `/membership`, `/login`, `/owner` และ `/admin` ด้วยบัญชีที่มีสิทธิ์
ข้อ 4.5 ในเอกสารขอบเขตถูกขีดฆ่า จึงไม่มีระบบแนะนำข้ามจังหวัดจากประวัติส่วนตัว ส่วนสิทธิประโยชน์สมาชิกเป็นข้อมูลจำลองตามข้อ 4.6

## Project Structure

```
src/
├── app/            # App Router pages + server actions
│   ├── actions/    # submitReview, admin mutations
│   ├── admin/      # moderation panel (dynamic, guarded)
│   └── ...
├── components/     # UI components (client)
├── data/cafes.ts   # ข้อมูลคาเฟ่หลัก (static, typed)
├── i18n/           # th/en dictionaries + LangProvider
└── lib/            # pure logic (hours, fuzzy, filters-url, rate-limit, distance) + supabase clients
supabase/schema.sql # Bootstrap สำหรับฐานข้อมูลใหม่ ตามด้วย migrations ตามลำดับ
pins.txt            # พิกัดร้านสำหรับ apply-pins script
```

### Gemini cafe assistant

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in Vercel Environment Variables for each deployment environment, then redeploy. Use a Gemini model ID available to your Google AI Studio project that supports structured JSON output. Do not prefix either variable with `NEXT_PUBLIC_` or commit a key. The old OpenAI variables are no longer used.

The server calls Google Gemini `generateContent` with approved cafe data. Signed-in accounts retain the database-enforced quota of 30 calls/day. Missing configuration, exhausted quota, timeout, blocked/truncated output, provider errors or invalid cafe references use catalogue search, visibly labelled in the chat. API credentials and live model access must be configured before real AI answers can be verified.

API reference: https://ai.google.dev/api/generate-content
