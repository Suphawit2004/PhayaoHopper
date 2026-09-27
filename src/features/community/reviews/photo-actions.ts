"use server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { validateImageUpload } from "@/lib/image-upload-validation";

export async function stageReviewPhoto(form: FormData): Promise<{ id?: string; error?: string }> {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return { error: "กรุณาเข้าสู่ระบบก่อนแนบรูป / Please sign in" };
  const file = form.get("photo"), slug = String(form.get("slug") ?? ""), batch = String(form.get("batch") ?? "");
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(batch) || !(file instanceof File)) return { error: "ใช้ JPG/PNG/WebP ไม่เกิน 5 MB ต่อรูป" };
  const image = await validateImageUpload(file);
  if (!image) return { error: "ไฟล์รูปไม่ถูกต้อง กรุณาใช้ JPG/PNG/WebP ที่เปิดได้ ขนาดไม่เกิน 5 MB" };
  const { data: visit } = await sb.from("cafe_visits").select("cafe_slug").eq("user_id", user.id).eq("cafe_slug", slug).maybeSingle();
  const { data: cafe } = await sb.from("cafes").select("slug").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!visit || !cafe) return { error: "ต้องบันทึกว่าเคยไปร้านนี้ก่อน / Mark this cafe as visited first" };
  const path = `${user.id}/${crypto.randomUUID()}.${image.extension}`;
  const { error: uploadError } = await sb.storage.from("cafe-community").upload(path, file, { contentType: image.contentType });
  if (uploadError) return { error: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่ / Upload failed. Retry." };
  const { data, error } = await sb.from("cafe_photos").insert({ user_id: user.id, cafe_slug: slug, path, caption: "", is_public: false, review_batch: batch }).select("id").single();
  if (error || !data) {
    await sb.storage.from("cafe-community").remove([path]);
    return { error: "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่ / Could not save photo" };
  }
  return { id: data.id };
}

export async function discardReviewPhotos(batch: string) {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return;
  // Only unsubmitted drafts can be removed; a retry after a successful commit is harmless.
  const { data } = await sb.from("cafe_photos").delete().eq("user_id", user.id).eq("review_batch", batch).is("review_id", null).select("path");
  if (data?.length) await sb.storage.from("cafe-community").remove(data.map(p => p.path));
}
