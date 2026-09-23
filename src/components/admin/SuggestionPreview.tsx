"use client";

import { useRef, useState } from "react";
import { useLang } from "@/i18n/LangProvider";
import { suggestionFormAction } from "@/app/actions/admin";
import type { AdminSuggestion } from "./AdminDashboard";
import AdminMutation from "./AdminMutation";
import styles from "./AdminDashboard.module.css";
import { isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";

export default function SuggestionPreview({ suggestion: s }: { suggestion: AdminSuggestion }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { lang } = useLang();
  const c = (th: string, en: string) => lang === "th" ? th : en;
  const [imageFailed, setImageFailed] = useState(false);
  const timeValid = (value: string | null) => !!value && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
  const locationValid = isSupportedCafeCoordinate(s.lat, s.lng);
  const missing = [!s.name.trim() && c("ชื่อร้าน", "Name"), !s.address?.trim() && c("ที่อยู่", "Address"), !timeValid(s.openTime) && c("เวลาเปิด", "Opening time"), !timeValid(s.closeTime) && c("เวลาปิด", "Closing time"), !locationValid && c("พิกัดนอกพื้นที่ที่รองรับ", "Coordinates outside the supported area")].filter(Boolean);
  return <>
    <button type="button" className="feature-button" onClick={() => dialog.current?.showModal()}>{c("ดูตัวอย่างและตรวจอนุมัติ", "Preview and review")}</button>
    <dialog ref={dialog} className={styles.previewDialog} aria-labelledby={`preview-${s.id}`}>
      <header className={styles.previewHeader}>
        <div><h2 id={`preview-${s.id}`}>{c("ตัวอย่างหน้าร้านก่อนเผยแพร่", "Cafe preview before publishing")}</h2><p>{c("แสดงข้อมูลที่บันทึกไว้ล่าสุด ยังไม่เปิดให้ผู้ใช้เห็น", "Saved details only. This cafe is not public yet.")}</p></div>
        <button type="button" className="ui-secondary" onClick={() => dialog.current?.close()}>{c("ปิดตัวอย่าง", "Close preview")}</button>
      </header>
      <div className={styles.previewBody}>
        <div className={styles.previewCafe}>
          <div className={styles.previewPhoto}>
            {s.photoUrl && !imageFailed ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.photoUrl} alt={s.name} onError={() => setImageFailed(true)} />
              <a href={s.photoUrl} target="_blank" rel="noopener noreferrer">{c("เปิดรูปเต็ม", "Open full photo")}</a>
            </> : <p>{c(imageFailed ? "โหลดรูปไม่สำเร็จ กรุณาตรวจรูปก่อนเผยแพร่" : "ยังไม่มีรูปหน้าร้าน", imageFailed ? "Photo failed to load. Check it before publishing." : "No cafe photo yet")}</p>}
          </div>
          <div><h3>{s.name || c("ยังไม่ระบุชื่อร้าน", "Cafe name missing")}</h3><span className="rounded-full bg-sand px-3 py-1 text-sm">{(s.priceRange ?? 1) === 1 ? c("฿ ประหยัด", "฿ Budget") : c("฿฿ ปานกลาง", "฿฿ Mid-range")}</span>
            <p className="mt-4 whitespace-pre-wrap">{s.note || c("ยังไม่มีคำอธิบายร้าน", "No cafe description yet")}</p>
            <dl><div><dt>{c("เวลาเปิด–ปิด", "Opening hours")}</dt><dd>{s.openTime?.slice(0,5) || "—"} – {s.closeTime?.slice(0,5) || "—"}</dd></div><div><dt>{c("ที่อยู่", "Address")}</dt><dd>{s.address || "—"}</dd></div><div><dt>{c("พิกัดร้าน", "Cafe coordinates")}</dt><dd>{locationValid ? <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer" className="underline">{s.lat.toFixed(5)}, {s.lng.toFixed(5)} · {c("เปิดแผนที่", "Open map")}</a> : "—"}</dd></div></dl>
          </div>
        </div>
        <section className={styles.previewChecklist} aria-label={c("ตรวจความพร้อม", "Publication checks")}>
          <h3>{c("ตรวจข้อมูลก่อนอนุมัติ", "Check before approving")}</h3>
          <p>{missing.length ? c("กรุณาเติมข้อมูล: ", "Complete: ") + missing.join(", ") : c("ชื่อ ที่อยู่ เวลา และรูปแบบพิกัดครบแล้ว", "Name, address, hours and coordinate format are complete")}</p>
          {(!s.photoUrl || imageFailed) && <p>{c("รูปภาพยังไม่พร้อม: เผยแพร่ได้ แต่ร้านจะแสดงภาพสำรอง", "Photo unavailable: the public page will use a fallback")}</p>}
          <p>{c("ตรวจตำแหน่งบนแผนที่จริง เวลาเปิด–ปิด และความเหมาะสมของรูปด้วยตนเองก่อนยืนยัน", "Verify the actual map location, hours and photo suitability before confirming.")}</p>
          {missing.length === 0 ? <AdminMutation action={suggestionFormAction} label={c("อนุมัติและเผยแพร่ร้าน", "Approve and publish cafe")}>
            <input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value="approved" />
            <label className={styles.checkRow}><input type="checkbox" name="inDistrict" required />{c("ตรวจพิกัดแล้ว ร้านอยู่ในอำเภอเมืองพะเยา", "Verified the cafe is in Mueang Phayao district")}</label>
            <label className={styles.checkRow}><input type="checkbox" required />{c("ตรวจรูปและเวลาเปิด–ปิดจากตัวอย่างนี้แล้ว", "I have checked the photo and hours in this preview")}</label>
          </AdminMutation> : <button className="ui-secondary" type="button" onClick={() => dialog.current?.close()}>{c("กลับไปเติมข้อมูล", "Back to edit details")}</button>}
        </section>
      </div>
    </dialog>
  </>;
}
