"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useProfile } from "@/lib/use-profile";
import { useLang } from "@/i18n/LangProvider";
export default function MembershipView(){
 const {user,loading}=useAuth();const {profile}=useProfile();const {lang}=useLang();const [notice,setNotice]=useState("");
 const c=(th:string,en:string)=>lang==="th"?th:en;
 return <div className="feature-page"><h1>{c("สมาชิกPhayaoHopper","PhayaoHopper membership")}</h1><p>{c("เก็บร้านโปรดและแบ่งปันประสบการณ์","Save cafes and share your experiences")}</p>
 <section className="feature-card !bg-[#285f60] text-white"><h2>{loading?c("กำลังโหลดสมาชิก…","Loading membership…"):profile?.display_name||c("บัตรสมาชิกของคุณ","Your membership card")}</h2>
 {user?<><p>{c("สถานะ: สมาชิก","Status: Member")}</p><p className="mt-4">{c("รหัสสมาชิก","Member ID")}</p><code>{user.id.slice(0,8)}…{user.id.slice(-4)}</code><button className="ui-secondary ml-3" onClick={async()=>{try{await navigator.clipboard.writeText(user.id);setNotice(c("คัดลอกรหัสสมาชิกเต็มแล้ว","Full member ID copied"));}catch{setNotice(c("คัดลอกไม่สำเร็จ กรุณาลองใหม่","Could not copy. Please retry."));}}}>{c("คัดลอกรหัสเต็ม","Copy full ID")}</button><p role="status">{notice}</p></>:!loading&&<Link className="ui-secondary" href="/login?next=/membership">{c("สมัครหรือเข้าสู่ระบบ","Sign up or sign in")}</Link>}</section>
 <section className="feature-card"><h2>{c("คูปองจากประสบการณ์ของคุณ","Rewards for your experiences")}</h2><p>{c("อัปโหลดรูปจากร้านเพื่อบันทึกว่าเคยไปแล้ว จากนั้นรีวิวเพื่อรับคูปองทดลอง 5 บาท หรือแนบรูปสาธารณะกับรีวิวอย่างน้อย 3 รูปเพื่อรับ 10% แทน อายุ 30 วัน เฉพาะร้านที่รีวิว รับได้ครั้งเดียวต่อบัญชีต่อร้าน","Upload a cafe photo to record your visit, then review for a demo ฿5 coupon, or attach at least 3 public review photos for 10% instead. Valid for 30 days at that cafe. One reward per account per cafe.")}</p><p className="mt-3 font-semibold">{c("ใช้สาธิตเท่านั้น ไม่สามารถแลกส่วนลดจริง","Demo only. Not redeemable for real discounts.")}</p><Link className="feature-button mt-5" href="/coupons">{c("คูปองของฉัน","My coupons")} →</Link></section></div>;
}
