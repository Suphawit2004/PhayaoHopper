"use client";
import {useUi} from "@/i18n/UiText";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { listPhotos, listMyPhotos, uploadPhoto, changePhoto, type CommunityPhoto } from "@/app/actions/photos";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import ActionForm from "./ActionForm";
import styles from "./CafeCommunity.module.css";
export default function CafeCommunity({ slug, admin = false }: { slug: string; admin?: boolean }) {
  const { user } = useAuth();
  return <PhotoGallery key={`${slug}:${user?.id ?? "guest"}`} slug={slug} admin={admin} />;
}
export function MyPhotos() {
  const { user } = useAuth();
  if (!user) return null;
  return <PhotoGallery key={user.id} admin={false} />;
}
function PhotoGallery({ slug, admin }: { slug?: string; admin: boolean }) {
  const ui=useUi();
  const { user, loading, isAdmin } = useAuth();
  const cafes = useCatalog();
  const { tr,lang } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const refreshLock = useRef(false);
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]), [message, setMessage] = useState(ui("กำลังโหลดรูป…"));
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true; setRefreshing(true);
    try { const result = await (slug === undefined ? listMyPhotos() : listPhotos(slug)); setPhotos(result.photos); setMessage(result.error ?? ""); }
    catch { setMessage(ui("โหลดรูปไม่สำเร็จ กรุณาลองใหม่")); }
    finally {refreshLock.current=false;setRefreshing(false);}
  }, [slug,ui]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try { const result = await (slug === undefined ? listMyPhotos() : listPhotos(slug)); if (active) { setPhotos(result.photos); setMessage(result.error ?? ""); } }
      catch { if (active) setMessage(ui("โหลดรูปไม่สำเร็จ กรุณาลองใหม่")); }
    };
    void load(); window.addEventListener("focus", load); const timer = setInterval(load, 45000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", load); };
  }, [slug, user?.id,ui]);
  return <section className={`feature-card ${styles.section}`}>
    <header className={styles.header}>
      <div><h2>{slug ? ui("ภาพจากผู้มาเยือน") : ui("รูปที่ฉันโพสต์")}</h2>
        <p>{slug ? ui("แบ่งปันมุมโปรด เครื่องดื่ม และบรรยากาศของร้าน") : ui("เก็บภาพคาเฟ่ที่คุณแบ่งปันไว้ในที่เดียว")}</p></div>
      {!slug && <Link href="/cafes" className="feature-button">{ui("เลือกร้านเพื่อเพิ่มรูป")}</Link>}
    </header>
    {slug && (loading ? <p role="status">{ui("กำลังตรวจสอบการเข้าสู่ระบบ…")}</p> : user ?
      <details className="photo-composer-toggle"><summary className="ui-secondary mt-5">{ui("เพิ่มรูป")}</summary><PhotoComposer slug={slug} onUploaded={refresh} /></details> :
      <div className={styles.signIn}><div><strong>{ui("มีมุมโปรดของร้านนี้ไหม?")}</strong><p>{ui("เข้าสู่ระบบเพื่อเพิ่มรูปและเก็บไว้ในโปรไฟล์ของคุณ")}</p></div>
        <Link href={`/login?next=/cafes/${slug}`} className="feature-button">{ui("เข้าสู่ระบบเพื่อเพิ่มรูป")}</Link></div>)}
    <div className={styles.toolbar}><h3>{slug ? ui("แกลเลอรีของร้าน") : ui("แกลเลอรีของฉัน")} <span>{photos.length} {lang==="th"?"รูป":"photos"}</span></h3>
      <button type="button" disabled={refreshing} onClick={refresh}>{refreshing ? ui("กำลังโหลดรูป…") : ui("รีเฟรชรูป")}</button></div>
    {message && <p role="status" className={styles.notice}>{ui(message)}</p>}
    <div className={styles.gallery}>{photos.map(photo => {
      const cafe = cafes.find(c => c.slug === photo.cafe_slug);
      const canManage = photo.user_id === user?.id || admin || isAdmin;
      return <figure key={photo.id} className={styles.photo}>
        <div className={styles.imageWrap}>
          <PhotoViewer photo={photo} />
          {canManage && <span className={photo.is_public ? styles.publicBadge : styles.privateBadge}>{photo.is_public ? ui("สาธารณะ") : ui("ส่วนตัว")}</span>}
        </div>
        <figcaption className={styles.caption}>
          {!slug && <Link href={`/cafes/${photo.cafe_slug}`}>{cafe ? tr(cafe.name) : ui("ดูหน้าคาเฟ่")}</Link>}
          <p>{photo.caption || ui("ภาพบรรยากาศจากผู้มาเยือน")}</p>
        </figcaption>
        {canManage && <div className={styles.actions}>
          <ActionForm label={photo.is_public ? ui("เก็บเป็นส่วนตัว") : ui("เผยแพร่")} action={async () => { const result = await changePhoto(photo.id, photo.is_public ? "private" : "public"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm>
          <div className={styles.deleteAction}><ActionForm label={ui("ลบรูป")} action={async () => { if (!window.confirm(ui("ลบรูปนี้? รูปจะถูกนำออกจากหน้าร้านและโปรไฟล์"))) return { ok: false, message: ui("ยกเลิกการลบ") }; const result = await changePhoto(photo.id, "delete"); if (result.ok) await refresh(); return result; }}>{null}</ActionForm></div>
        </div>}
      </figure>;
    })}</div>
    {!photos.length && !message && <div className={styles.empty}><strong>{slug ? ui("เป็นคนแรกที่แบ่งปันมุมโปรด") : ui("เริ่มเก็บความทรงจำจากคาเฟ่")}</strong><p>{slug ? (user ? ui("เพิ่มภาพของคุณผ่านแบบฟอร์มด้านบนได้เลย") : ui("เข้าสู่ระบบเพื่อเพิ่มรูป")) : ui("เลือกร้านที่คุณไป แล้วเพิ่มรูปจากหน้าคาเฟ่ รูปจะมาอยู่ที่นี่ด้วย")}</p></div>}
    <p className={styles.privacyNote}>{ui("รูปสาธารณะแสดงในหน้าร้านและโปรไฟล์ ส่วนรูปส่วนตัวเห็นได้เฉพาะคุณและผู้ดูแลระบบ")}</p>
  </section>;
}

function PhotoComposer({ slug, onUploaded }: { slug: string; onUploaded: () => Promise<void> }) {
  const ui=useUi();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  return <div className={styles.composer}>
    <h3>{ui("เพิ่มรูปของคุณ")}</h3>
    <ActionForm reset label={ui("โพสต์รูป")} action={async form => {
      const result = await uploadPhoto(form);
      if (result.ok) { setFile(null); setPreview(""); setIsPublic(true); setError(""); await onUploaded(); }
      return result;
    }}>
      <input type="hidden" name="slug" value={slug} />
      <div className={styles.composeGrid}>
        <label className={styles.picker}>
          {preview ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={ui("ตัวอย่างรูปที่เลือกก่อนโพสต์")} />
          </> : <span className={styles.placeholder}><span aria-hidden="true">＋</span><strong>{ui("เลือกรูปจากอุปกรณ์")}</strong><small>{ui("JPG, PNG หรือ WebP ไม่เกิน 5 MB")}</small></span>}
          <span>{file ? ui("เปลี่ยนรูป") : ui("เลือกรูปภาพ")}</span>
          <input ref={inputRef} required type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={e => {
            const selected = e.target.files?.[0];
            setPreview(""); setFile(null); setError("");
            if (!selected) return;
            if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
              setError(ui("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB")); e.target.value = ""; return;
            }
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
          }} />
          {file && <small className={styles.filename}>{file.name}</small>}
        </label>
        <div className={styles.fields}>
          {file && <button type="button" className="ui-secondary" onClick={() => {setFile(null);setPreview("");setError("");if(inputRef.current)inputRef.current.value="";}}>{ui("นำรูปออก")}</button>}
          <label>{ui("คำบรรยาย")}<span className={styles.optional}>{ui("(ไม่บังคับ)")}</span><textarea name="caption" maxLength={300} rows={4} placeholder={ui("มุมที่ชอบ เมนูที่ลอง หรือบรรยากาศของร้าน…")} /></label>
          <fieldset className={styles.visibility}><legend>{ui("ผู้ที่เห็นรูปนี้")}</legend><div className="flex flex-wrap gap-4"><label><span><input type="radio" name="isPublic" value="on" checked={isPublic} onChange={()=>setIsPublic(true)}/>{ui("สาธารณะ")}</span></label><label><span><input type="radio" name="isPublic" value="private" checked={!isPublic} onChange={()=>setIsPublic(false)}/>{ui("ส่วนตัว")}</span></label></div><small>{isPublic ? ui("ทุกคนเห็นรูปนี้ในหน้าร้าน และรูปจะอยู่ในโปรไฟล์ของคุณด้วย") : ui("เก็บในโปรไฟล์ของคุณ เห็นได้เฉพาะคุณและผู้ดูแลระบบ")}</small></fieldset>
        </div>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </ActionForm>
  </div>;
}

function PhotoViewer({photo}:{photo:CommunityPhoto}) {
  const ui=useUi();
 const dialog=useRef<HTMLDialogElement>(null); const {lang}=useLang();
 return <><button type="button" className="photo-open" aria-label={lang==="th"?ui("ดูรูปใหญ่"):"View full photo"} onClick={()=>dialog.current?.showModal()}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={photo.url} alt={photo.caption || (lang==="th"?ui("ภาพจากผู้มาเยือน"):"Visitor photo")} loading="lazy" />
 </button><dialog ref={dialog} className="photo-lightbox" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
 <div><button type="button" className="ui-secondary" autoFocus onClick={()=>dialog.current?.close()}>{lang==="th"?ui("ปิดรูป"):"Close photo"}</button>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={photo.url} alt={photo.caption || (lang==="th"?ui("ภาพจากผู้มาเยือน"):"Visitor photo")} /><p>{photo.caption}</p></div>
 </dialog></>;
}
