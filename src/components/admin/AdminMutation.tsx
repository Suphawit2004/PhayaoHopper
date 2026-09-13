"use client";
import { useActionState, type ReactNode } from "react";
import { useLang } from "@/i18n/LangProvider";
type Result={ok:true}|{ok:false;error:string};
export default function AdminMutation({action,label,children,confirm}:{action:(prev:Result|undefined,data:FormData)=>Promise<Result>;label:string;children:ReactNode;confirm?:string}){
 const [state,submit,pending]=useActionState(action,undefined);const {lang}=useLang();
 return <form action={submit} onSubmit={e=>{if(confirm&&!window.confirm(confirm))e.preventDefault();}} className="feature-form"><fieldset disabled={pending}>{children}<button disabled={pending} className="ui-secondary">{pending?(lang==="th"?"กำลังบันทึก…":"Saving…"):label}</button></fieldset>{state&&<p role="status" className={state.ok?"text-emerald-800":"text-rose-800"}>{state.ok?(lang==="th"?"บันทึกเรียบร้อยแล้ว":"Saved"):(lang==="th"?"ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่":"Could not save. Check the details and retry.")}</p>}</form>;
}
