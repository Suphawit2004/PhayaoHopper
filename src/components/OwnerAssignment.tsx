"use client";
import {useState} from "react";
import {useLang} from "@/i18n/LangProvider";
import {lookupOwner,assignOwner} from "@/app/actions/cafe-management";
import ActionForm from "./ActionForm";
export default function OwnerAssignment({slug,currentId}:{slug:string;currentId:string}){
 const {lang}=useLang();const [id,setId]=useState(currentId);const [verified,setVerified]=useState<{id:string;name:string}|null>(null);const [pending,setPending]=useState(false);const [error,setError]=useState("");
 return <section className="feature-card"><h2>{lang==="th"?"กำหนดเจ้าของร้าน":"Assign cafe owner"}</h2><p>{lang==="th"?"ตรวจชื่อบัญชีก่อนบันทึกสิทธิ์ รหัสสมาชิกดูได้จากบัตรสมาชิก":"Check the account name before assigning access. Find the member ID on the membership card."}</p>
 <label className="grid gap-2 mt-3">{lang==="th"?"รหัสสมาชิก":"Member ID"}<input className="border rounded-lg p-3" value={id} maxLength={36} onChange={e=>{setId(e.target.value.trim());setVerified(null);setError("");}}/></label>
 <button className="ui-secondary mt-3" disabled={pending||!id} onClick={async()=>{setPending(true);setError("");const r=await lookupOwner(slug,id);setPending(false);if(r.ok&&r.id)setVerified({id:r.id,name:r.name||"Member"});else setError(lang==="th"?"ไม่พบบัญชี หรือไม่มีสิทธิ์ตรวจสอบ":"Account not found or access denied");}}>{pending?(lang==="th"?"กำลังตรวจ…":"Checking…"):(lang==="th"?"ตรวจสอบบัญชี":"Check account")}</button><p role="status">{error}</p>
 {verified&&verified.id===id&&<div className="mt-4"><p className="status-message">{lang==="th"?"บัญชีที่จะได้รับสิทธิ์: ":"Account receiving access: "}{verified.name}</p><ActionForm action={assignOwner}><input type="hidden" name="slug" value={slug}/><input type="hidden" name="userId" value={verified.id}/></ActionForm></div>}
 {currentId&&<details className="mt-5"><summary>{lang==="th"?"ยกเลิกสิทธิ์เจ้าของเดิม":"Remove current owner's access"}</summary><ActionForm label={lang==="th"?"ยกเลิกสิทธิ์":"Remove access"} action={assignOwner}><input type="hidden" name="slug" value={slug}/><input type="hidden" name="userId" value=""/><label><span><input type="checkbox" required/>{lang==="th"?" ยืนยันยกเลิกสิทธิ์จัดการร้าน":" Confirm removing cafe management access"}</span></label></ActionForm></details>}</section>;
}
