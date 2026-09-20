"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { saveVisit, removeVisit } from "@/lib/visits";

export default function VisitButton({ slug }: { slug: string }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const th = lang === "th";
  if (loading) return <p role="status" className="text-sm text-espresso/60">{th ? "กำลังโหลดประวัติ…" : "Loading visit history…"}</p>;
  if (!user) return <Link className="ui-secondary self-start" href={`/login?next=${encodeURIComponent(`/cafes/${slug}`)}`}>{th ? "เข้าสู่ระบบเพื่อบันทึกว่าไปมาแล้ว" : "Sign in to mark as visited"}</Link>;
  return <MemberVisitButton key={`${user.id}:${slug}`} userId={user.id} slug={slug} th={th} />;
}

function MemberVisitButton({ userId, slug, th }: { userId: string; slug: string; th: boolean }) {
  const [state, setState] = useState<"loading" | "new" | "saved" | "saving" | "removing" | "error">("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const busy = useRef(false);
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
    return () => { cancelled = true; };
  }, [userId, slug, retry]);

  async function markVisited() {
    if (busy.current || state !== "new") return;
    busy.current = true;
    setState("saving"); setMessage("");
    try {
      const client = getSupabaseBrowser();
      if (!client) throw new Error("Unavailable");
      await saveVisit(client, userId, slug);
      setState("saved");
      setMessage(th ? "บันทึกแล้ว ดูร้านนี้ได้ในหมวดเคยไปแล้ว" : "Saved to your visited cafes.");
    } catch (error) {
      setState("new");
      const code = (error as { code?: string }).code;
      setMessage(code === "23503" || code === "42501"
        ? (th ? "บันทึกไม่ได้ กรุณาตรวจสอบว่าล็อกอินอยู่และร้านยังเปิดให้เข้าชม" : "Please check your sign-in and that this cafe is still available.")
        : (th ? "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not save. Please try again."));
    } finally { busy.current = false; }
  }

  async function cancelVisit() {
    if (busy.current || state !== "saved") return;
    if (!window.confirm(th ? "ยกเลิกการบันทึกว่าคุณเคยไปร้านนี้แล้ว? คุณสามารถบันทึกใหม่ได้ภายหลัง" : "Remove this cafe from your visited history? You can save it again later.")) return;
    busy.current = true;
    setState("removing"); setMessage("");
    try {
      const client = getSupabaseBrowser();
      if (!client) throw new Error("Unavailable");
      await removeVisit(client, userId, slug);
      setState("new");
      setMessage(th ? "ยกเลิกแล้ว สามารถกดไปมาแล้วเพื่อบันทึกใหม่ได้" : "Visit removed. You can mark this cafe as visited again.");
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
        </> : <button type="button" className="feature-button" disabled={state !== "new"} onClick={markVisited}>
          {state === "loading" ? (th ? "กำลังโหลด…" : "Loading…") : state === "saving" ? (th ? "กำลังบันทึก…" : "Saving…") : (th ? "ไปมาแล้ว" : "I've been here")}
        </button>}
      {state === "saved" && <Link href="/visited" className="text-sm font-semibold underline underline-offset-4">{th ? "ดูร้านที่เคยไปแล้ว" : "View visited cafes"} →</Link>}
    </div>
    <p role="status" className="text-sm text-espresso/70">{message}</p>
  </div>;
}
