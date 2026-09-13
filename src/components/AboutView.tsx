"use client";

import Link from "next/link";
import { useLang } from "@/i18n/LangProvider";



export default function AboutView() {
  const { t, lang } = useLang();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-espresso">{t("about.title")}</h1>
      <div className="mt-5 space-y-4 leading-relaxed text-espresso/80">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>{t("about.p3")}</p>
      </div>

      <section className="feature-card"><h2>{lang==="th"?"พื้นที่และข้อมูลร้าน":"Coverage and cafe information"}</h2><p>{lang==="th"?"ครอบคลุมอำเภอเมืองพะเยา ข้อมูลมาจากรายการร้านตั้งต้น ข้อเสนอแนะที่ผู้ดูแลตรวจสอบ และข้อมูลที่เจ้าของร้านอัปเดต รูปมีเครดิตในหน้าร้าน เวลาเปิดและเมนูอาจเปลี่ยนแปลง แจ้งข้อมูลผิดพลาดได้จากปุ่มแจ้งแก้ไขในหน้าคาเฟ่":"Covers Mueang Phayao district. Information combines the initial cafe catalog, administrator-reviewed suggestions, and cafe owner updates. Photo credits appear on cafe pages. Hours and menus may change; use the report button on the cafe page to request a correction."}</p></section>
      <section className="feature-card">
        <h2>{lang === "th" ? "เริ่มเที่ยวในแบบของคุณ" : "Explore your way"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link className="rounded-xl bg-[#eaf2f0] p-5 font-semibold text-[#285f60]" href="/cafes">{lang === "th" ? "ค้นหาคาเฟ่ตามสไตล์ที่ชอบ" : "Find a cafe for your mood"}</Link>
          <Link className="rounded-xl bg-sand/50 p-5 font-semibold text-coffee" href="/suggest">{lang === "th" ? "แบ่งปันร้านที่คุณรู้จัก" : "Share a cafe you know"}</Link>
        </div>
      </section>
    </div>
  );
}
