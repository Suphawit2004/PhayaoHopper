"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";

export type AdminResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveSuggestionDetails(form: FormData) {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, message: "คุณไม่มีสิทธิ์แก้ไขคำแนะนำร้าน" };
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const address = String(form.get("address") ?? "").trim();
  const open_time = String(form.get("openTime") ?? ""), close_time = String(form.get("closeTime") ?? "");
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  if (!name || name.length > 120 || !address || address.length > 300 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(open_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close_time)) return { ok: false, message: "ตรวจชื่อร้าน ที่อยู่ และเวลาเปิดปิด" };
  if (!isSupportedCafeCoordinate(lat, lng)) return { ok: false, message: "พิกัดต้องอยู่ในพื้นที่อำเภอเมืองพะเยาที่ระบบรองรับ" };
  const { data, error } = await sb.from("cafe_suggestions").update({ name, address, open_time, close_time, lat, lng }).eq("id", id).neq("status", "approved").select("id").single();
  if (error || !data) return { ok: false, message: "บันทึกไม่สำเร็จ หรือร้านนี้อนุมัติไปแล้ว" };
  revalidatePath("/admin");
  return { ok: true, message: "บันทึกข้อมูลแล้ว สามารถอนุมัติร้านได้" };
}

async function requireAdmin() {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data, error } = await sb.rpc("is_admin");
  if (error || data !== true) return null;
  return sb;
}

export async function setSuggestionStatus(
  id: string,
  status: "pending" | "approved" | "rejected"
): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  if (status === "approved") {
    const { data: suggestion, error: lookupError } = await sb.from("cafe_suggestions").select("lat,lng").eq("id", id).single();
    if (lookupError || !suggestion) return { ok: false, error: "ตรวจพิกัดร้านไม่สำเร็จ กรุณาลองใหม่" };
    if (!isSupportedCafeCoordinate(suggestion.lat, suggestion.lng)) return { ok: false, error: "พิกัดอยู่นอกพื้นที่ที่ระบบรองรับ กรุณาแก้ไขก่อนอนุมัติ" };
  }

  if (status !== "approved") {
    const { data: published, error: lookupError } = await sb.from("cafes").select("slug").eq("slug", `cafe-${id}`).maybeSingle();
    if (lookupError) return { ok: false, error: "ตรวจสถานะร้านไม่สำเร็จ กรุณาลองใหม่" };
    if (published) return { ok: false, error: "ร้านนี้เผยแพร่แล้ว กรุณาแก้ข้อมูลในหน้าจัดการร้าน" };
  }
  const { error } = status === "approved"
    ? await sb.rpc("publish_cafe_suggestion", { suggestion_id: id })
    : await sb.from("cafe_suggestions").update({ status }).eq("id", id).select("id").single();
  if (error) {
    console.error("setSuggestionStatus failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setReportStatus(
  id: string,
  status: "resolved" | "dismissed"
): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb.from("data_reports").update({ status }).eq("id", id);
  if (error) {
    console.error("setReportStatus failed:", error);
    return { ok: false, error: "Update failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<AdminResult> {
  const sb = await requireAdmin();
  if (!sb) return { ok: false, error: "Not authorized" };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Invalid id" };

  const { error } = await sb.from("reviews").delete().eq("id", id);
  if (error) {
    console.error("deleteReview failed:", error);
    return { ok: false, error: "Delete failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** <form action={...}> wrappers — buttons post id/status via hidden inputs.
 * Return the result so client can use useActionState for feedback. */
export async function suggestionFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  if (formData.get("status") === "approved" && formData.get("inDistrict") !== "on") return { ok: false, error: "กรุณาตรวจสอบว่าร้านอยู่ในอำเภอเมืองพะเยาก่อนอนุมัติ" };
  return setSuggestionStatus(
    String(formData.get("id") ?? ""),
    formData.get("status") === "approved"
      ? "approved"
      : formData.get("status") === "rejected"
        ? "rejected"
        : "pending"
  );
}

export async function reportFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  const status = formData.get("status") === "dismissed" ? "dismissed" : "resolved";
  return setReportStatus(String(formData.get("id") ?? ""), status);
}

export async function deleteReviewFormAction(
  _prev: AdminResult | undefined,
  formData: FormData
): Promise<AdminResult> {
  return deleteReview(String(formData.get("id") ?? ""));
}
