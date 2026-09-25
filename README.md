# PhayaoHopper ☕

เว็บค้นหาคาเฟ่ในอำเภอเมืองพะเยา ตั้งแต่ริมกว๊านถึงโซนมหาวิทยาลัย พร้อมแผนที่ เวลาเปิด-ปิด รีวิว และรายการร้านที่บันทึกไว้

**เว็บจริง:** [phayaohopper.vercel.app](https://phayaohopper.vercel.app/) 

## Features

- 🏪 **ทำเลคาเฟ่** — ร้านในอำเภอเมืองพะเยา ตั้งแต่ในเมืองถึงโซน ม.พะเยา พร้อมพิกัดบนแผนที่ Leaflet
- 🔍 **ค้นหาแบบ fuzzy** — พิมพ์ชื่อไม่ครบ/สะกดเพี้ยนก็เจอ จาก search bar บน navbar ทุกหน้า
- 🎛️ **ตัวกรอง** — แท็กบรรยากาศ, ไลฟ์สไตล์, โซน, ช่วงราคา, เปิดตอนนี้, โซนระหว่างกลาง (ระยะจากแนวถนนกว๊าน–ม.พะเยา)
- 🔗 **Shareable URL** — สถานะตัวกรอง sync กับ query params ของ `/cafes` ก๊อปลิงก์ส่งต่อได้
- ❤️ **รายการร้าน** — แยกเป็นร้านที่เคยไป, ร้านที่อยากไป (กดหัวใจแต่ยังไม่ไป) และร้านโปรด (เคยไปและกดหัวใจ)
- ⭐ **รีวิวและคูปองทดลอง** — สมาชิกต้องบันทึกการไปพร้อมรูปก่อนจึงรีวิวได้; รีวิวอย่างเดียวได้คูปองทดลอง 5 บาท หรือรีวิวพร้อมรูปสาธารณะอย่างน้อย 3 รูปได้ 10% ใช้กับร้านที่รีวิวภายใน 30 วัน ทั้งสองแบบแลกส่วนลดจริงไม่ได้
- 📮 **แนะนำร้านใหม่ / รายงานข้อมูล** — ต้องเข้าสู่ระบบก่อนส่ง; ฟอร์มแนะนำมีตัวเลือกพิกัดจากแผนที่หรือกรอกเองและอัปโหลดรูป
- 🛠️ **Admin panel (`/admin`)** — อนุมัติ/ปฏิเสธร้านที่แนะนำ, ปิดรายงาน, ลบรีวิว (สิทธิ์ผ่าน RLS `is_admin()`)
- 👤 สมัครและเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน, Magic Link หรือ Google OAuth (เมื่อกำหนดค่า) พร้อมแก้ชื่อ รูป และรหัสผ่านจากเมนูบัญชี
- ☕ **เจ้าของร้าน (`/owner`)** — แก้รายละเอียด เวลาเปิดปิด รูป เมนู ราคา และสถานะหมด พร้อมสิทธิ์แยกตามร้าน
- 📷 รูปสมาชิกเลือกเผยแพร่หรือเก็บส่วนตัวได้ ผู้ดูแลจัดการรูปได้
- 🎫 **คูปองของฉัน (`/coupons`)** — ดูสถานะพร้อมใช้/ใช้แล้ว/หมดอายุ/ยกเลิก และกดยืนยันใช้คูปองทดลอง
- 💬 **ผู้ช่วย (`/chat`)** — แนะนำร้านจากข้อมูลที่อนุมัติแล้วได้สูงสุด 5 ร้านต่อคำตอบ; ใช้ Gemini ใน Production เมื่อกำหนดค่า หรือค้นหาจากแคตตาล็อกเมื่อ AI ใช้งานไม่ได้
- 🌐 **สองภาษา th/en** · 📱 responsive มือถือ–แท็บเล็ต · SEO (sitemap, robots, OG image)

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth Magic Link + Storage + RLS)
- Leaflet / react-leaflet
- Vitest + Playwright + GitHub Actions CI

## Getting Started

```sh
git clone https://github.com/Suphawit2004/PhayaoHopper.git
cd PhayaoHopper
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
# กรอกค่าของโปรเจกต์ใน .env.local
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL สำหรับ metadata/sitemap |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ไม่บังคับ; เปิด Gemini ใน Production เมื่อกำหนดทั้งคู่ |
| `CAFE_ASSISTANT_MODE` | ตั้งเป็น `gemini` เฉพาะเมื่อต้องการเรียก AI จริงใน local/Preview; ค่าเริ่มต้นจำลองคำตอบ |
| `CRON_SECRET` | Secret สำหรับยืนยัน Vercel Cron ที่ล้างรูปรีวิวที่อัปโหลดค้าง |
| `SUPABASE_SERVICE_ROLE_KEY` | ใช้เฉพาะ endpoint Cron ฝั่งเซิร์ฟเวอร์เพื่อลบรูปค้าง |

เก็บ `GEMINI_API_KEY`, `CRON_SECRET` และ `SUPABASE_SERVICE_ROLE_KEY` ไว้ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามเติม `NEXT_PUBLIC_` หรือ commit ค่าจริงลง Git

### ตั้งค่า Supabase

1. สำหรับฐานข้อมูลใหม่เท่านั้น: รัน `supabase/schema.sql` แล้วรัน **ทุกไฟล์** ใน `supabase/migrations/` ตามลำดับชื่อไฟล์อย่างละหนึ่งครั้ง สำหรับฐานข้อมูลที่ใช้งานอยู่ ให้ตรวจประวัติ migration ก่อนและรันเฉพาะไฟล์ที่ยังไม่เคยใช้ อย่ารัน `schema.sql` ทับฐานข้อมูลเดิม
2. Authentication → Providers → Email → เปิดการสมัครด้วยอีเมล และตั้งค่าการยืนยันอีเมล
3. Authentication → URL Configuration → เพิ่ม Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://phayaohopper.vercel.app/auth/callback` (หรือโดเมนที่ deploy จริง)

### เพิ่ม Admin

```sql
insert into public.admins (email) values ('you@example.com')
on conflict do nothing;
```

เข้าสู่ระบบด้วยอีเมลนี้แล้วจึงเข้า `/admin` ได้ (สิทธิ์ตรวจฝั่ง server ทุก action)

## Content Workflow — เพิ่มคาเฟ่ใหม่

1. ผู้ใช้ส่งผ่านหน้า `/suggest` → ข้อมูลเข้าตาราง `cafe_suggestions` (+ รูปใน storage)
2. Admin ตรวจที่อยู่และเวลาเปิดปิดใน `/admin` และยืนยันว่าร้านอยู่ในอำเภอเมืองพะเยาก่อนอนุมัติ
3. การอนุมัติเพิ่มร้านใน `cafes` และเปลี่ยนสถานะใน transaction เดียว ร้านปรากฏบนเว็บโดยไม่ต้อง deploy ใหม่
4. Admin เปิดหน้าจัดการร้านเพื่อแก้ข้อมูล/รูป/เมนู หรือให้สิทธิ์เจ้าของร้านด้วยรหัสสมาชิก

ข้อมูลหลักมาจาก Supabase; `src/data/cafes.ts` ใช้เป็น seed และโหมดที่ยังไม่ตั้งค่า Supabase เท่านั้น
AI แนะนำเฉพาะร้านที่มีในแคตตาล็อก จำกัดสมาชิกทั่วไป 30 ครั้งต่อวัน ส่วนแอดมินไม่ติดโควตาระดับบัญชี หากไม่มี key หรือบริการขัดข้องจะค้นหาจากข้อมูลร้านและแสดงโหมดให้ผู้ใช้เห็น
รูปส่วนตัวใช้ private bucket และ signed URL อายุ 60 วินาที หลังซ่อนรูป URL ที่ออกไปแล้วอาจยังเปิดได้จนหมดอายุ

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest (unit tests) |
| `npm run test:db` | ทดสอบ SQL จริงและ RLS ด้วย PGlite ในฐานข้อมูลจำลอง |
| `npm run test:e2e` | Playwright browser tests |
| `npm run test:e2e:visual` | Playwright screenshot checks |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run cafes:pins` | Sync pins.txt → enriched cafe data |

## Deployment

Deploy บน [Vercel](https://vercel.com/new) โดยเลือก Framework Preset เป็น **Next.js**, root เป็นราก repository, build command `npm run build` และ output directory ใช้ค่าเริ่มต้น ตั้ง `NEXT_PUBLIC_SITE_URL=https://phayaohopper.vercel.app` สำหรับเว็บจริง และเพิ่มโดเมนกับ `/auth/callback` ใน Supabase Auth Redirect URLs

รัน migrations ให้สำเร็จก่อนเผยแพร่โค้ด ตั้งค่า `CRON_SECRET` และ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะฝั่งเซิร์ฟเวอร์สำหรับ Cron ล้างรูปรีวิวที่ยังไม่ผูกรีวิวและเก่ากว่า 7 วัน (`vercel.json` กำหนดวันละครั้ง 19:00 UTC) จากนั้นตรวจ `/cafes`, `/chat`, `/coupons`, `/login`, `/owner` และ `/admin` ด้วยบัญชีที่มีสิทธิ์

## Project Structure

```
src/
├── app/            # App Router pages + server actions
│   ├── actions/    # submitReview, admin mutations
│   ├── admin/      # moderation panel (dynamic, guarded)
│   └── ...
├── components/     # UI components (client)
├── data/cafes.ts   # ข้อมูลตั้งต้นและ fallback (static, typed)
├── i18n/           # th/en dictionaries + LangProvider
└── lib/            # pure logic (hours, fuzzy, filters-url, rate-limit, distance) + supabase clients
supabase/schema.sql # Bootstrap สำหรับฐานข้อมูลใหม่ ตามด้วยทุกไฟล์ใน supabase/migrations/
pins.txt            # พิกัดร้านสำหรับ apply-pins script
```

### Gemini cafe assistant

Set `GEMINI_API_KEY` and `GEMINI_MODEL` in Vercel Production Environment Variables, then redeploy. Use a Gemini model ID available to your Google AI Studio project that supports structured JSON output. Do not prefix either variable with `NEXT_PUBLIC_` or commit a key. The old OpenAI variables are no longer used.

The server calls Google Gemini `generateContent` with approved cafe data in Vercel Production. It sends only locally matched cafes for a specific query, or a compact single-language catalogue when none match. Local development, CI, and Vercel Preview use a deterministic, quota-free simulation by default; the chat labels it clearly and uses the approved cafe catalogue without claiming that Gemini answered. To intentionally exercise Gemini in a non-production environment, set the server-only `CAFE_ASSISTANT_MODE=gemini` there and provide a dedicated test-project key. Missing configuration, account or provider rate limits, timeout, provider outage, blocked/truncated output, or invalid cafe references use catalogue search with a distinct explanation in the chat. API credentials and live model access must be configured before real AI answers can be verified.

API reference: https://ai.google.dev/api/generate-content

### Operations checks

- `.github/workflows/monitor-production.yml` checks the public home and cafe-list pages from a GitHub runner twice per hour. A failed run should trigger the repository's GitHub Actions failure notifications; it checks availability and expected page content, not the logged-in experience or historical uptime.
- `.github/workflows/ci.yml` runs Playwright screenshot checks in the `visual` job. The first run establishes snapshots; later runs compare each PR/push against the previous commit on the same Linux runner. Download the `visual-differences` artifact when a comparison fails. Apply the `visual-change-approved` PR label only after reviewing an intentional design change.
- `.github/workflows/database-advisors.yml` reads Supabase Security and Performance Advisors on the first of each month and on manual dispatch. Add a repository secret named `SUPABASE_MANAGEMENT_TOKEN` containing a Supabase Management API token with `advisors_read` permission. The action records `WARN` and `ERROR` findings in its run summary. Never use a service-role key or expose this token to client code.
