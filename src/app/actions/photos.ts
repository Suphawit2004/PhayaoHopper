"use server";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { MutationResult } from "./cafe-management";
export type CommunityPhoto = { id: string; user_id: string; cafe_slug: string; caption: string; is_public: boolean; review_id: string | null; url: string };

async function readPhotos(slug?: string, photoId?: string, reviewIds?: string[]): Promise<{ photos: CommunityPhoto[]; error?: string }> {
  const sb = await getSupabaseServer();
  if (!sb) return { photos: [], error: "ยังไม่ได้เชื่อมต่อระบบรูปภาพ" };
  let query = sb.from("cafe_photos").select("id, user_id, cafe_slug, path, caption, is_public, review_id").is("review_batch", null);
  if (slug !== undefined) query = query.eq("cafe_slug", slug);
  else {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return { photos: [], error: "กรุณาเข้าสู่ระบบ" };
    query = query.eq("user_id", user.id);
  }
  if (reviewIds) query = query.in("review_id", reviewIds.slice(0, 50));
  const { data, error } = await query.order("created_at", { ascending: false }).limit(reviewIds ? 250 : 100);
  if (error) return { photos: [], error: "โหลดรูปไม่สำเร็จ กรุณาลองใหม่" };
  const rows = data ?? [];
  // Include a linked older photo without bypassing the cafe filter or the caller's RLS.
  if (slug !== undefined && photoId && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(photoId) && !rows.some(row => row.id === photoId)) {
    const { data: linked, error: linkedError } = await sb.from("cafe_photos")
      .select("id, user_id, cafe_slug, path, caption, is_public, review_id").is("review_batch", null).eq("cafe_slug", slug).eq("id", photoId).maybeSingle();
    if (linkedError) return { photos: [], error: "โหลดรูปไม่สำเร็จ กรุณาลองใหม่" };
    if (linked) rows.unshift(linked);
  }
  const photos = await Promise.all(rows.map(async row => {
    const { data: signed } = await sb.storage.from("cafe-community").createSignedUrl(row.path, 60);
    return { id: row.id, user_id: row.user_id, cafe_slug: row.cafe_slug, caption: row.caption, is_public: row.is_public, review_id: row.review_id, url: signed?.signedUrl ?? "" };
  }));
  return { photos: photos.filter(p => p.url) };
}

export async function listPhotos(slug: string, photoId?: string) { return readPhotos(slug, photoId); }
export async function listReviewPhotos(slug: string, reviewIds: string[]) { return readPhotos(slug, undefined, reviewIds); }
export async function listMyPhotos() { return readPhotos(); }

export async function uploadPhoto(form: FormData): Promise<MutationResult> {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return { ok: false, message: "กรุณาเข้าสู่ระบบ" };
  const file = form.get("photo");
  const slug = String(form.get("slug") ?? "");
  if (!(file instanceof File) || !file.size || file.size > 5242880 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "ใช้รูป JPG, PNG หรือ WebP ไม่เกิน 5 MB" };
  const { data: cafe } = await sb.from("cafes").select("slug").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!cafe) return { ok: false, message: "ไม่พบร้านที่เผยแพร่แล้ว" };
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await sb.storage.from("cafe-community").upload(path, file, { contentType: file.type });
  if (uploadError) return { ok: false, message: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" };
  const { error } = await sb.from("cafe_photos").insert({ cafe_slug: slug, user_id: user.id, path,
    caption: String(form.get("caption") ?? "").trim().slice(0, 300), is_public: form.get("isPublic") === "on" });
  if (error) { await sb.storage.from("cafe-community").remove([path]); return { ok: false, message: "บันทึกรูปไม่สำเร็จ" }; }
  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  return { ok: true, message: form.get("isPublic") === "on" ? "เพิ่มรูปในหน้าคาเฟ่และโปรไฟล์แล้ว" : "บันทึกรูปส่วนตัวในโปรไฟล์แล้ว" };
}

export async function changePhoto(id: string, operation: "public" | "private" | "delete"): Promise<MutationResult> {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return { ok: false, message: "กรุณาเข้าสู่ระบบ" };
  const { data: row } = await sb.from("cafe_photos").select("path, user_id, cafe_slug").eq("id", id).maybeSingle();
  const { data: admin } = await sb.rpc("is_admin");
  if (!row || (row.user_id !== user.id && !admin)) return { ok: false, message: "คุณไม่มีสิทธิ์แก้ไขรูปนี้" };
  if (!["public", "private", "delete"].includes(operation)) return { ok: false, message: "คำสั่งไม่ถูกต้อง" };
  const query = operation === "delete" ? sb.from("cafe_photos").delete() : sb.from("cafe_photos").update({ is_public: operation === "public" });
  const { error, data } = await query.eq("id", id).select("id").single();
  if (error || !data) return { ok: false, message: "แก้ไขรูปไม่สำเร็จ" };
  if (operation === "delete") await sb.storage.from("cafe-community").remove([row.path]);
  revalidatePath(`/cafes/${row.cafe_slug}`);
  revalidatePath("/profile");
  return { ok: true, message: "บันทึกเรียบร้อยแล้ว" };
}
