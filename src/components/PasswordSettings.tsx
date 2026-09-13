"use client";
import {useUi} from "@/i18n/UiText";
import PasswordField from "./PasswordField";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
export default function PasswordSettings() {
  const ui=useUi();
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  return <section className="feature-card"><h2>{ui("ตั้งหรือเปลี่ยนรหัสผ่าน")}</h2><p className="text-sm mb-4">{ui("บัญชีที่เข้าด้วยลิงก์อีเมลสามารถตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบได้")}</p>
    <form className="feature-form" onSubmit={async e => {
      e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
      const password = String(data.get("password"));
      if (password !== data.get("confirm")) { setMessage(ui("รหัสผ่านทั้งสองช่องไม่ตรงกัน")); return; }
      setPending(true); setMessage("");
      try { const sb = getSupabaseBrowser(); if (!sb) throw Error();
        const { error } = await sb.auth.updateUser({ password });
        if (error) setMessage(ui("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง หรือใช้รหัสผ่านที่รัดกุมขึ้น"));
        else { setMessage(ui("บันทึกรหัสผ่านใหม่แล้ว")); form.reset(); }
      } catch { setMessage(ui("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่")); } finally { setPending(false); }
    }}><label>{ui("รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)")}<PasswordField name="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} /></label><label>{ui("ยืนยันรหัสผ่าน")}<PasswordField name="confirm" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} /></label><button className="feature-button" disabled={pending}>{pending ? ui("กำลังบันทึก…") : ui("บันทึกรหัสผ่าน")}</button><p role="status">{message}</p></form>
  </section>;
}
