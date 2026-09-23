"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { updateMyProfile } from "@/app/actions/profile";
import { useUi } from "@/i18n/UiText";
import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/types";

export default function AccountProfileActions({
  user: accountUser,
  profile,
  signOut,
}: {
  user: Pick<User, "id" | "email">;
  profile: ProfileRow | null;
  signOut: () => Promise<void>;
}) {
  const ui = useUi();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  function selectAvatar(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setPreview(previewUrl.current);
  }

  const shownAvatar = preview || profile?.avatar_url || null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formData = new FormData(event.currentTarget);
    try {
      const result = await updateMyProfile(formData);
      if (!result.ok) {
        const errors = {
          not_signed_in: ui("กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"),
          invalid_name: ui("กรุณาใส่ชื่อที่แสดงไม่เกิน 60 ตัวอักษร"),
          invalid_image: ui("รูปไม่ถูกต้อง ใช้ JPG, PNG หรือ WebP ไม่เกิน 5 MB"),
          storage_error: ui("อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่"),
          database_error: ui("บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่"),
        };
        setMessage(errors[result.reason]);
        return;
      }
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: { userId: accountUser.id, profile: result.profile } }));
      selectAvatar(null);
      setEditing(false);
      setMessage(ui("บันทึกข้อมูลโปรไฟล์แล้ว"));
    } catch {
      setMessage(ui("บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่"));
    } finally {
      setPending(false);
    }
  }

  async function sendPasswordReset() {
    if (!accountUser.email) {
      setMessage(ui("ไม่พบอีเมลของบัญชีนี้"));
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) throw new Error("Supabase is not configured");
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/auth/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(accountUser.email, { redirectTo: callback.toString() });
      if (error) throw error;
      setMessage(ui("ส่งลิงก์ตั้งรหัสผ่านไปยังอีเมลแล้ว หากบัญชีนี้ใช้งานได้กรุณาตรวจกล่องจดหมาย"));
    } catch {
      setMessage(ui("ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    setPending(true);
    setMessage("");
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setMessage(ui("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่"));
      setPending(false);
    }
  }

  return (
    <section className="account-profile-actions" aria-label={ui("ตั้งค่าบัญชี")}>
      {!editing ? (
        <button
          className="account-action-link"
          type="button"
          onClick={() => {
            setDisplayName(profile?.display_name || accountUser.email?.split("@")[0] || "");
            selectAvatar(null);
            setMessage("");
            setEditing(true);
          }}
        >
          {ui("แก้ไขชื่อและรูปโปรไฟล์")}
        </button>
      ) : (
        <form className="account-profile-form" onSubmit={saveProfile}>
          <h2>{ui("แก้ไขโปรไฟล์")}</h2>
          <label>
            <span>{ui("ชื่อที่แสดง")}</span>
            <input
              name="displayName"
              value={displayName}
              maxLength={60}
              onChange={event => setDisplayName(event.target.value)}
              autoComplete="nickname"
              autoFocus
              required
              disabled={pending}
            />
          </label>
          <label>
            <span>{ui("รูปโปรไฟล์ · JPG, PNG หรือ WebP ไม่เกิน 5 MB")}</span>
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending}
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  event.target.value = "";
                  selectAvatar(null);
                  setMessage(ui("รูปใหญ่เกินไป (สูงสุด 5MB)"));
                } else if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  event.target.value = "";
                  selectAvatar(null);
                  setMessage(ui("รองรับเฉพาะไฟล์ JPG, PNG, WEBP"));
                } else {
                  setMessage("");
                  selectAvatar(file);
                }
              }}
            />
          </label>
          {shownAvatar && <Image className="account-avatar-preview" src={shownAvatar} alt={ui("ตัวอย่างรูปโปรไฟล์")} width={64} height={64} unoptimized />}
          <div className="account-profile-form-actions">
            <button className="feature-button" type="submit" disabled={pending}>
              {pending ? ui("กำลังบันทึก…") : ui("บันทึกโปรไฟล์")}
            </button>
            <button className="ui-secondary" type="button" disabled={pending} onClick={() => { setEditing(false); selectAvatar(null); setMessage(""); }}>
              {ui("ยกเลิก")}
            </button>
          </div>
        </form>
      )}

      <div className="account-security-actions">
        <button className="account-action-link" type="button" onClick={sendPasswordReset} disabled={pending}>
          {pending ? ui("กำลังส่งลิงก์รีเซ็ตรหัสผ่าน…") : ui("ส่งลิงก์รีเซ็ตรหัสผ่าน")}
        </button>
        <button className="account-logout-button" type="button" onClick={logout} disabled={pending}>
          {ui("ออกจากระบบ")}
        </button>
      </div>
      {message && <p className="account-action-message" role="status">{message}</p>}
    </section>
  );
}
