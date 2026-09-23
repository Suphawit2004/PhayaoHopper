"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { updateMyProfile } from "@/app/actions/profile";
import { useUi } from "@/i18n/UiText";
import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/types";
import Icon from "./Icon";

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
  const avatarInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const currentName = profile?.display_name || accountUser.email?.split("@")[0] || ui("สมาชิก");
  const shownAvatar = preview || profile?.avatar_url || null;

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  function setAvatarPreview(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setPreview(previewUrl.current);
  }

  async function persistProfile(formData: FormData, successMessage: string, pendingMessage: string) {
    setPending(true);
    setMessage(pendingMessage);
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
        return false;
      }
      window.dispatchEvent(new CustomEvent("profile-updated", { detail: { userId: accountUser.id, profile: result.profile } }));
      setAvatarPreview(null);
      setNameEditing(false);
      setMessage(successMessage);
      return true;
    } catch {
      setMessage(ui("บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่"));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("displayName", displayName);
    await persistProfile(formData, ui("บันทึกข้อมูลโปรไฟล์แล้ว"), ui("กำลังบันทึก…"));
  }

  async function changeAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage(ui("รูปใหญ่เกินไป (สูงสุด 5MB)"));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage(ui("รองรับเฉพาะไฟล์ JPG, PNG, WEBP"));
      return;
    }

    setAvatarPreview(file);
    const formData = new FormData();
    formData.set("displayName", currentName);
    formData.set("avatar", file);
    await persistProfile(formData, ui("อัปเดตรูปโปรไฟล์แล้ว"), ui("กำลังอัปโหลดรูปโปรไฟล์…"));
  }

  async function copyMemberId() {
    try {
      await navigator.clipboard.writeText(accountUser.id);
      setCopied(true);
      setMessage(ui("คัดลอกรหัสสมาชิกแล้ว"));
    } catch {
      setCopied(false);
      setMessage(ui("คัดลอกรหัสไม่สำเร็จ กรุณาลองใหม่"));
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
      <input
        ref={avatarInput}
        className="sr-only"
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        aria-label={ui("เลือกรูปโปรไฟล์ใหม่")}
        tabIndex={-1}
        onChange={changeAvatar}
      />
      <div className="account-identity">
        <button
          className="account-avatar account-avatar-large account-avatar-edit-button"
          type="button"
          aria-label={ui("เปลี่ยนรูปโปรไฟล์")}
          title={ui("เปลี่ยนรูปโปรไฟล์")}
          disabled={pending}
          onClick={() => avatarInput.current?.click()}
        >
          {shownAvatar ? <Image src={shownAvatar} alt="" width={48} height={48} unoptimized /> : <span aria-hidden="true">{currentName.trim().slice(0, 1).toUpperCase()}</span>}
          <span className="account-avatar-edit-indicator" aria-hidden="true"><Icon name="edit" width={13} height={13} /></span>
        </button>
        <div className="account-identity-copy">
          {!nameEditing ? (
            <div className="account-name-display">
              <strong>{currentName}</strong>
              <button
                className="account-icon-button account-name-edit-button"
                type="button"
                aria-label={ui("แก้ไขชื่อ")}
                title={ui("แก้ไขชื่อ")}
                disabled={pending}
                onClick={() => { setDisplayName(currentName); setMessage(""); setNameEditing(true); }}
              >
                <Icon name="edit" width={16} height={16} />
              </button>
            </div>
          ) : (
            <form className="account-name-edit-form" onSubmit={saveDisplayName}>
              <label className="sr-only" htmlFor="account-display-name">{ui("ชื่อที่แสดง")}</label>
              <input
                id="account-display-name"
                name="displayName"
                value={displayName}
                maxLength={60}
                autoComplete="nickname"
                autoFocus
                required
                disabled={pending}
                onChange={event => setDisplayName(event.target.value)}
              />
              <div className="account-name-edit-actions">
                <button className="account-inline-save" type="submit" disabled={pending}>{pending ? ui("กำลังบันทึก…") : ui("บันทึก")}</button>
                <button className="account-inline-cancel" type="button" disabled={pending} onClick={() => { setNameEditing(false); setMessage(""); }}>{ui("ยกเลิก")}</button>
              </div>
            </form>
          )}
          <small>{accountUser.email}</small>
          <div className="account-member-id">
            <span className="account-member-id-label">{ui("รหัสสมาชิก")}</span>
            <div className="account-member-id-value">
              <code>{accountUser.id}</code>
              <button
                className="account-icon-button account-copy-button"
                type="button"
                aria-label={copied ? ui("คัดลอกรหัสสมาชิกแล้ว") : ui("คัดลอกรหัสสมาชิก")}
                title={copied ? ui("คัดลอกรหัสสมาชิกแล้ว") : ui("คัดลอกรหัสสมาชิก")}
                onClick={copyMemberId}
              >
                <Icon name={copied ? "check" : "copy"} width={17} height={17} />
              </button>
            </div>
          </div>
        </div>
      </div>

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
