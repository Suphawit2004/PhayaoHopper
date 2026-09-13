"use client";
import { useState, type InputHTMLAttributes } from "react";
import { useLang } from "@/i18n/LangProvider";
export default function PasswordField(props: InputHTMLAttributes<HTMLInputElement>) { const [show,setShow]=useState(false);const {lang}=useLang();return <span className="flex gap-2 items-center"><input {...props} type={show?"text":"password"} /><button type="button" className="ui-secondary shrink-0" aria-pressed={show} aria-label={lang==="th"?(show?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน"):(show?"Hide password":"Show password")} onClick={()=>setShow(v=>!v)}>{lang==="th"?(show?"ซ่อน":"แสดง"):(show?"Hide":"Show")}</button></span>; }
