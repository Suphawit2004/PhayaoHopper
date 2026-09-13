"use server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { Cafe } from "@/data/cafes";
import { cafeFromRow, cafeToRow } from "@/lib/cafe-row";

export type MutationResult = { ok: boolean; message: string };
const done = (): MutationResult => ({ ok: true, message: "บันทึกเรียบร้อยแล้ว" });

async function manager(slug: string) {
  const sb = await getSupabaseServer();
  if (!sb) throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const { data: admin } = await sb.rpc("is_admin");
  const { data: owner } = await sb.from("cafe_owners").select("user_id").eq("cafe_slug", slug).eq("user_id", user.id).maybeSingle();
  if (!admin && !owner) throw new Error("คุณไม่มีสิทธิ์จัดการร้านนี้");
  return { sb, user, admin: admin === true };
}

async function run(task: () => Promise<void>): Promise<MutationResult> {
  try { await task(); revalidatePath("/", "layout"); return done(); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่" }; }
}

function text(form: FormData, field: string, max = 500) {
  return String(form.get(field) ?? "").trim().slice(0, max);
}

async function uploadMedia(sb: NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>, slug: string, form: FormData) {
  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) return undefined;
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) throw new Error("ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
  const path = `${slug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("cafe-media").upload(path, file, { contentType: file.type });
  if (error) throw new Error("อัปโหลดรูปไม่สำเร็จ");
  return { path, url: sb.storage.from("cafe-media").getPublicUrl(path).data.publicUrl };
}

export async function saveCafe(form: FormData) {
  return run(async () => {
    const slug = text(form, "slug", 101);
    const { sb, admin } = await manager(slug);
    const { data: row, error: readError } = await sb.from("cafes").select("*").eq("slug", slug).single();
    if (readError || !row) throw new Error("ไม่พบข้อมูลร้าน");
    const current = cafeFromRow(row);
    const data: Cafe = { ...current, slug,
      name: { th: text(form, "name", 160), en: text(form, "nameEn", 160) },
      description: { th: text(form, "description", 2000), en: text(form, "descriptionEn", 2000) },
      address: { th: text(form, "address"), en: text(form, "addressEn") },
      phone: text(form, "phone", 40), openTime: text(form, "openTime", 5), closeTime: text(form, "closeTime", 5),
      lat: admin ? Number(form.get("lat")) : current.lat, lng: admin ? Number(form.get("lng")) : current.lng,
      area: admin ? text(form, "area") as Cafe["area"] : current.area, priceRange: Number(form.get("priceRange")) as 1 | 2,
      closedDays: form.getAll("closedDays").map(Number), tags: form.getAll("tags") as Cafe["tags"],
      lifestyleTags: form.getAll("lifestyleTags") as Cafe["lifestyleTags"],
    };
    if (!data.name.th || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.openTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.closeTime)) throw new Error("กรุณาตรวจชื่อร้านและเวลาเปิดปิด");
    const media = await uploadMedia(sb, slug, form);
    if (media) data.photo = media.url;
    const values = cafeToRow(data);
    const { slug: immutableSlug, ...patch } = values;
    const { data: saved, error } = await sb.from("cafes").update({ ...patch, ...(admin ? { is_active: form.get("isActive") === "on" } : {}) }).eq("slug", immutableSlug).select("slug").single();
    if (error || !saved) {
      if (media) await sb.storage.from("cafe-media").remove([media.path]);
      throw new Error("บันทึกไม่สำเร็จ ตรวจข้อมูลและพิกัดในเมืองพะเยา");
    }
  });
}

export async function saveMenu(form: FormData) {
  return run(async () => {
    const slug = text(form, "slug", 101);
    const { sb } = await manager(slug);
    const id = text(form, "id", 36);
    const name = text(form, "name", 120), price = Number(form.get("price"));
    if (!name || !Number.isFinite(price) || price < 0 || price > 100000) throw new Error("ตรวจชื่อเมนูและราคา");
    const media = await uploadMedia(sb, slug, form);
    const values = { cafe_slug: slug, name_th: name, name_en: text(form, "nameEn", 120) || name, price, is_available: form.get("available") === "on", ...(media ? { photo_url: media.url } : {}) };
    const query = id ? sb.from("menu_items").update(values).eq("id", id).eq("cafe_slug", slug) : sb.from("menu_items").insert(values);
    const { data, error } = await query.select("id").single();
    if (error || !data) {
      if (media) await sb.storage.from("cafe-media").remove([media.path]);
      throw new Error("บันทึกเมนูไม่สำเร็จ");
    }
  });
}

export async function deleteMenu(slug: string, id: string) {
  return run(async () => {
    const { sb } = await manager(slug);
    const { data, error } = await sb.from("menu_items").delete().eq("id", id).eq("cafe_slug", slug).select("id").single();
    if (error || !data) throw new Error("ลบเมนูไม่สำเร็จ");
  });
}

export async function assignOwner(form: FormData) {
  return run(async () => {
    const slug = text(form, "slug", 101);
    const { sb, admin } = await manager(slug);
    if (!admin) throw new Error("เฉพาะผู้ดูแลระบบ");
    const id = text(form, "userId", 36);
    if(id){const {data:profile,error:profileError}=await sb.from("profiles").select("id").eq("id",id).maybeSingle();if(profileError||!profile)throw Error("ไม่พบบัญชีสมาชิก");}
    const { error } = id ? await sb.from("cafe_owners").upsert({ cafe_slug: slug, user_id: id })
      : await sb.from("cafe_owners").delete().eq("cafe_slug", slug);
    if (error) throw new Error("กำหนดเจ้าของไม่สำเร็จ ตรวจรหัสสมาชิก");
  });
}

export async function setMenuAvailability(slug:string,id:string,available:boolean) {
 return run(async()=>{const {sb}=await manager(slug);const {data,error}=await sb.from("menu_items").update({is_available:available}).eq("cafe_slug",slug).eq("id",id).select("id").single();if(error||!data)throw Error("บันทึกสถานะเมนูไม่สำเร็จ");});
}
export async function lookupOwner(slug:string,id:string):Promise<{ok:boolean;name?:string;id?:string}> {
 try {const {sb,admin}=await manager(slug);if(!admin||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return {ok:false};
 const {data,error}=await sb.from("profiles").select("id,display_name").eq("id",id).maybeSingle();return data&&!error?{ok:true,id:data.id,name:data.display_name||"Member"}:{ok:false};
 }catch{return {ok:false};}
}
