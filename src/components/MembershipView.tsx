"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useProfile } from "@/lib/use-profile";
import { useLang } from "@/i18n/LangProvider";
export default function MembershipView(){
 const {user,loading}=useAuth();const {profile}=useProfile();const {lang}=useLang();const [notice,setNotice]=useState("");
 const c=(th:string,en:string)=>lang==="th"?th:en;
 return <div className="feature-page"><h1>{c("สมาชิกเที่ยวไหนดี","Thiao Nai Dee membership")}</h1><p>{c("เก็บร้านโปรดและแบ่งปันประสบการณ์","Save cafes and share your experiences")}</p>
 <section className="feature-card !bg-[#285f60] text-white"><h2>{loading?c("กำลังโหลดสมาชิก…","Loading membership…"):profile?.display_name||c("บัตรสมาชิกของคุณ","Your membership card")}</h2>
 {user?<><p>{c("สถานะ: สมาชิก","Status: Member")}</p><p className="mt-4">{c("รหัสสมาชิก","Member ID")}</p><code>{user.id.slice(0,8)}…{user.id.slice(-4)}</code><button className="ui-secondary ml-3" onClick={async()=>{try{await navigator.clipboard.writeText(user.id);setNotice(c("คัดลอกรหัสสมาชิกเต็มแล้ว","Full member ID copied"));}catch{setNotice(c("คัดลอกไม่สำเร็จ กรุณาลองใหม่","Could not copy. Please retry."));}}}>{c("คัดลอกรหัสเต็ม","Copy full ID")}</button><p role="status">{notice}</p></>:!loading&&<Link className="ui-secondary" href="/login?next=/membership">{c("สมัครหรือเข้าสู่ระบบ","Sign up or sign in")}</Link>}</section>
 <section className="feature-card"><h2>{c("สิทธิประโยชน์ทดลอง","Demo benefit")}</h2><span className="inline-block rounded-lg bg-amber-100 text-amber-900 px-3 py-2 font-semibold">{c("ใช้สาธิตเท่านั้น","Demo only")}</span><h3 className="mt-4">{c("คาเฟ่ทดลองริมกว๊าน","Lakeside demo cafe")}</h3><p className="text-3xl font-bold">{c("ลด 10% — ใช้สาธิตเท่านั้น","10% off — demo only")}</p>
 <h3 className="mt-5">{c("เงื่อนไข","Terms")}</h3><p>{c("ข้อมูลจำลอง ใช้แลกสินค้าหรือส่วนลดกับร้านจริงไม่ได้ ทดลองส่วนลดเครื่องดื่ม 1 แก้วเมื่อแสดงบัตรสมาชิก ไม่รวมโปรโมชั่นอื่น","Mock data, not redeemable at real cafes. Demonstrates a discount on one drink when showing a member card, excluding other promotions.")}</p></section></div>;
}
