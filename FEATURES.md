# ฟีเจอร์และโครงสร้างไฟล์ PhayaoHopper

โครงสร้างแยกตามฟีเจอร์ โดย `src/app` เก็บหน้าเว็บและ API ส่วน UI, logic, Server Actions และ tests อยู่ใน `src/features` การจัดโครงสร้างไม่เปลี่ยน URL, API หรือฐานข้อมูล

## ตารางฟีเจอร์

ตำแหน่งโฟลเดอร์ในตารางอ้างอิงจาก `src/features/`

| ฟีเจอร์ | หน้าที่ | โฟลเดอร์ | ไฟล์หลัก |
|---|---|---|---|
| หน้าแรก | ร้านแนะนำและทางเข้าสำรวจร้าน | [home/](src/features/home/) | `HomeView.tsx`, `HomeView.module.css` |
| เกี่ยวกับเว็บ | ข้อมูลและรายละเอียดโครงการ | [about/](src/features/about/) | `AboutView.tsx` |
| ข้อมูลร้าน | การ์ดร้าน รายละเอียด เวลาเปิด และเมนู | [cafes/](src/features/cafes/) | `CafeCard.tsx`, `DetailView.tsx`, `catalog.ts`, `hours.ts`, `LiveMenu.tsx` |
| ค้นหาและตัวกรอง | ค้นหาชื่อ กรองร้าน และจัดการผลค้นหา | [discovery/](src/features/discovery/) | `CafesExplorer.tsx`, `CafeSearch.tsx`, `FilterBar.tsx`, `filter-cafes.ts`, `ResultsNavigation.tsx` |
| แผนที่และพิกัด | แสดงร้าน เลือกพิกัดจากแผนที่หรือกรอกเอง | [map/](src/features/map/) | `MapView.tsx`, `MapViewPage.tsx`, `CafeCoordinatePicker.tsx`, `cafe-coordinates.ts` |
| ร้านที่บันทึก | ร้านที่เคยไป ร้านที่อยากไป และร้านโปรด | [saved-cafes/](src/features/saved-cafes/) | `SavedCafesView.tsx`, `FavoriteButton.tsx`, `FavoritesProvider.tsx`, `visits.ts` |
| รีวิว | ส่งและลบรีวิว ตรวจสิทธิ์ และแนบรูป | [community/reviews/](src/features/community/reviews/) | `ReviewSection.tsx`, `actions.ts`, `photo-actions.ts` |
| รูปภาพ | รูปร้าน รูปของฉัน และล้างรูปอัปโหลดค้าง | [community/photos/](src/features/community/photos/) | `CafeCommunity.tsx`, `actions.ts`, `cleanup-review-photos.ts` |
| คูปอง | แสดงคูปองและยืนยันใช้ | [community/coupons/](src/features/community/coupons/) | `CouponsView.tsx`, `actions.ts` |
| บัญชีผู้ใช้ | เข้าสู่ระบบ สมัครสมาชิก และแก้ชื่อกับรูปโปรไฟล์ | [account/](src/features/account/) | `AuthProvider.tsx`, `AccountProfileActions.tsx`, `PasswordLogin.tsx` |
| ผู้ช่วยค้นหาร้าน | หน้าแชตและการตอบจากข้อมูลร้าน | [assistant/](src/features/assistant/) | `CafeChat.tsx`, `cafe-assistant.ts` |
| ข้อมูลจากสมาชิก | แนะนำร้านและแจ้งข้อมูลผิด | [submissions/](src/features/submissions/) | `SuggestView.tsx`, `ReportDialog.tsx`, `suggestion-actions.ts`, `report-actions.ts` |
| จัดการร้าน | แก้ข้อมูล รูป เมนู และเจ้าของร้าน | [owner/](src/features/owner/) | `CafeEditorView.tsx`, `MediaPicker.tsx`, `MenuManager.tsx`, `OwnerAssignment.tsx`, `actions.ts` |
| แอดมิน | ภาพรวม สถานะข้อมูล และคิวตรวจสอบ | [admin/](src/features/admin/) | `AdminDashboard.tsx`, `AdminMutation.tsx`, `SuggestionPreview.tsx`, `actions.ts` |

## ไฟล์ที่ใช้ร่วมกันและไฟล์ระบบ

| ตำแหน่ง | สิ่งที่เก็บ |
|---|---|
| [src/app/](src/app/) | `page.tsx`, `route.ts`, layout, หน้า error และ CSS กลาง |
| [src/components/layout/](src/components/layout/) | `Navbar.tsx`, `Footer.tsx`, `BrandMark.tsx`, `FeatureNav.tsx` |
| [src/components/ui/](src/components/ui/) | `ActionForm.tsx`, `Icon.tsx`, `RatingStars.tsx`, `TimeInput.tsx` |
| [src/lib/](src/lib/) | Supabase client/server, ตัวตรวจไฟล์รูป, rate limit, URL และ types กลาง |
| [src/i18n/](src/i18n/) | คำแปลไทย/อังกฤษและสถานะภาษาปัจจุบัน |
| [supabase/](supabase/) | Schema และ migrations ของฐานข้อมูล |
| [tests/e2e/](tests/e2e/) | Browser tests สำหรับเส้นทางหลัก มือถือ และภาพหน้าจอ |
| [scripts/](scripts/) | สคริปต์ดูแลข้อมูลและทดสอบฐานข้อมูล |
| [public/](public/) | รูปภาพ ไอคอน และไฟล์สาธารณะ |

## แนวทางหาไฟล์

- ต้องการแก้หน้าเว็บ: เริ่มจาก `src/app/<เส้นทาง>/page.tsx` แล้วตาม import ไปยังฟีเจอร์
- ต้องการแก้ UI หรือ logic: ดูใน `src/features/<ชื่อฟีเจอร์>/`
- ต้องการแก้การบันทึกข้อมูล: ดู `actions.ts` หรือไฟล์ที่ลงท้ายด้วย `-actions.ts` ของฟีเจอร์
- ต้องการแก้ส่วนกลาง: ดู `src/components/`, `src/lib/` และ `src/i18n/`
- ไฟล์ทดสอบ `*.test.ts` และ `*.test.tsx` อยู่ใกล้โค้ดที่ทดสอบ ส่วน Browser E2E อยู่ใน `tests/e2e/`

## เส้นทางร้านที่บันทึก

| URL | รายการที่แสดง |
|---|---|
| `/visited` | ร้านที่เคยไปทั้งหมด |
| `/favorites` | ร้านที่อยากไป: กดหัวใจและยังไม่เคยไป |
| `/favorite-cafes` | ร้านโปรด: เคยไปแล้วและกดหัวใจ |

ดูข้อมูลโครงการเพิ่มเติมใน [README.md](README.md)
