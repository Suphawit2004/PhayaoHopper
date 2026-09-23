"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { removeVisit } from "@/lib/visits";
import { uploadPhoto } from "@/app/actions/photos";
import ActionForm from "./ActionForm";

export default function VisitButton({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const th = lang === "th";
  if (loading) return <p role="status" className="text-sm text-espresso/60">{th ? "กำลังโหลดประวัติ…" : "Loading visit history…"}</p>;
  if (!user) return <Link className="ui-secondary self-start" href={`/login?next=${encodeURIComponent(`/cafes/${slug}`)}`}>{th ? "เข้าสู่ระบบเพื่ออัปโหลดรูปและบันทึกว่าเคยไปแล้ว" : "Sign in to upload a visit photo"}</Link>;
  return <MemberVisitButton key={`${user.id}:${slug}`} userId={user.id} slug={slug} th={th} />;
}

function MemberVisitButton({ userId, slug, th }: { userId: string; slug: string; th: boolean }) {
  const [state, setState] = useState<"loading" | "new" | "saved" | "removing" | "error">("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState("");
  const busy = useRef(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const client = getSupabaseBrowser();
        if (!client) throw new Error("Unavailable");
        const { data, error } = await client.from("cafe_visits").select("cafe_slug")
          .eq("user_id", userId).eq("cafe_slug", slug).maybeSingle();
        if (error) throw error;
        if (!cancelled) setState(data ? "saved" : "new");
      } catch { if (!cancelled) setState("error"); }
    }
    void load();
    window.addEventListener("cafe-visit-changed", load);
    return () => { cancelled = true; window.removeEventListener("cafe-visit-changed", load); };
  }, [userId, slug, retry]);

  async function cancelVisit() {
    if (busy.current || state !== "saved") return;
    if (!window.confirm(th ? "ยกเลิกการบันทึกว่าคุณเคยไปร้านนี้แล้ว? คุณสามารถบันทึกใหม่ได้ภายหลัง" : "Remove this cafe from your visited history? You can save it again later.")) return;
    busy.current = true;
    setState("removing"); setMessage("");
    try {
      const client = getSupabaseBrowser();
      if (!client) throw new Error("Unavailable");
      await removeVisit(client, userId, slug);
      window.dispatchEvent(new Event("cafe-visit-changed"));
      setState("new");
      setMessage(th ? "ยกเลิกแล้ว หากต้องการบันทึกใหม่ให้อัปโหลดรูปอีกครั้ง" : "Visit removed. Upload another photo to record a new visit.");
    } catch {
      setState("saved");
      setMessage(th ? "ยกเลิกไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not remove the visit. Please try again.");
    } finally { busy.current = false; }
  }

  return <div className="flex flex-col items-start gap-2">
    <div className="flex flex-wrap items-center gap-3">
      {state === "error" ? <button className="ui-secondary" onClick={() => { setState("loading"); setRetry(n => n + 1); }}>{th ? "โหลดประวัติไม่สำเร็จ · ลองอีกครั้ง" : "Could not load history · Retry"}</button> :
        state === "saved" || state === "removing" ? <>
          <span className="inline-flex items-center gap-2 rounded-lg border border-[#bdd3c7] bg-[#edf5ef] px-4 py-3 font-semibold text-[#28543e]"><span aria-hidden="true">✓</span>{th ? "เคยไปแล้ว" : "Visited"}</span>
          <button type="button" className="ui-secondary text-sm" disabled={state === "removing"} onClick={cancelVisit}>{state === "removing" ? (th ? "กำลังยกเลิก…" : "Removing…") : (th ? "ยกเลิกเคยไปแล้ว" : "Remove visit")}</button>
        </> : state === "loading" ? <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p> : <div className="w-full max-w-sm border-l-2 border-[#b39259] pl-4">
          <p className="mb-3 text-sm text-espresso/75">{th ? "อัปโหลดรูปจากร้านนี้เพื่อบันทึกว่าเคยไปแล้ว รูปจะปรากฏในหน้าร้านและรูปของฉัน" : "Upload a photo from this cafe to record your visit. It will appear at the cafe and in My photos."}</p>
          <ActionForm reset label={th ? "อัปโหลดรูป" : "Upload photo"} action={async form => {
            const result = await uploadPhoto(form);
            if (result.ok) {
              setPreview(""); setState("saved");
              setMessage(th ? "บันทึกว่าเคยไปแล้ว รูปแสดงในหน้าร้านและรูปของฉัน" : "Visit recorded. Your photo is in the cafe gallery and My photos.");
              window.dispatchEvent(new Event("cafe-visit-changed"));
              window.dispatchEvent(new Event("cafe-photos-changed"));
            }
            return result;
          }}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="isPublic" value="on" />
            <label className="grid gap-2 text-sm font-medium">{th ? "เลือกรูปจากร้าน" : "Choose a cafe photo"}
              <input required type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={event => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : "");
              }} />
            </label>
            {preview && <div className="h-36 w-48 overflow-hidden rounded-lg bg-sand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={th ? "ตัวอย่างรูปก่อนอัปโหลด" : "Selected photo preview"} className="h-full w-full object-cover" />
            </div>}
            <p className="text-xs text-espresso/70">{th ? "JPG, PNG หรือ WebP ไม่เกิน 5 MB · รูปนี้เป็นสาธารณะ" : "JPG, PNG or WebP, up to 5 MB · This photo is public"}</p>
          </ActionForm>
        </div>}
      {state === "saved" && <Link href="/visited" className="text-sm font-semibold underline underline-offset-4">{th ? "ดูร้านที่เคยไปแล้ว" : "View visited cafes"} →</Link>}
    </div>
    <p role="status" className="text-sm text-espresso/70">{message}</p>
  </div>;
}
